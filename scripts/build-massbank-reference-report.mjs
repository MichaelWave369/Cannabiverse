// Reproducible measured-reference benchmark. Source records are CC BY MassBank
// records pinned to a fixed upstream revision. Not new cannabis experiments.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {parseMGF,screenMSMS} from '../app/discovery/msms-core.mjs';
import {PROTON_MASS} from '../app/discovery/lab-core.mjs';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const manifestPath='data/discovery/references/massbank/manifest-v1.json';
const summaryPath='data/discovery/references/massbank/benchmark-report-v1.json';
const manifest=()=>JSON.parse(load(manifestPath));
const take=(text,pattern,key)=>{const match=text.match(pattern);if(!match)throw Error('MassBank record missing '+key);return match[1].trim();};
const finite=(raw,name)=>{const value=Number(raw);if(!Number.isFinite(value)||value<=0)throw Error('Invalid '+name);return value;};

export function parseMassBankReference(raw,expected){
  if(typeof raw!=='string'||raw.length>500_000)throw Error('Invalid MassBank record size');
  const accession=take(raw,/^ACCESSION:\s*(.+)$/m,'ACCESSION');
  if(accession!==expected.accession)throw Error('MassBank accession mismatch');
  const license=take(raw,/^LICENSE:\s*(.+)$/m,'LICENSE');
  if(license!==expected.license||license!=='CC BY')throw Error('Non-compliant license in '+accession);
  if(!/^COMMENT: CONFIDENCE standard compound$/m.test(raw))throw Error('Missing source standard-status claim');
  const compoundName=take(raw,/^CH\$NAME:\s*(.+)$/m,'CH$NAME');
  if(compoundName!==expected.compound_label_from_source)throw Error('Unrecognized compound label');
  const precursorMz=finite(take(raw,/^MS\$FOCUSED_ION: PRECURSOR_M\/Z\s+(.+)$/m,'precursor m/z'),'precursor m/z');
  if(Math.abs(precursorMz-expected.precursor_mz)>1e-8)throw Error('Unexpected upstream precursor mass');
  const precursorType=take(raw,/^MS\$FOCUSED_ION: PRECURSOR_TYPE\s+(.+)$/m,'precursor adduct');
  if(precursorType!==expected.precursor_type)throw Error('Unexpected upstream adduct');
  const ionMode=take(raw,/^AC\$MASS_SPECTROMETRY: ION_MODE\s+(.+)$/m,'ion polarity');
  const polarity=precursorType==='[M+H]+'?'POSITIVE':precursorType==='[M-H]-'?'NEGATIVE':null;
  if(!polarity||polarity!==ionMode)throw Error('Unrecognized precursor charge/polarity');
  const peakNumber=Number(take(raw,/^PK\$NUM_PEAK:\s+(\d+)$/m,'peak count'));
  if(peakNumber!==expected.peaks||peakNumber<1||peakNumber>1000)throw Error('Peak-count mismatch');
  const peakBody=raw.match(/^PK\$PEAK:[^\n]*\n([\s\S]*?)\n\/\//m)?.[1];
  if(!peakBody)throw Error('Malformed MassBank peak section');
  const peaks=peakBody.split(/\n/).filter(l=>l.trim()).map(line=>{
    const cols=line.trim().split(/\s+/);
    if(cols.length!==3)throw Error('Expected peak m/z, intensity and relative intensity');
    const [mz,intensity,relative]=cols.map(Number);
    if(!Number.isFinite(mz)||mz<20||mz>2000||!Number.isFinite(intensity)||intensity<0||!Number.isFinite(relative)||relative<0||relative>1000)
      throw Error('Invalid measured peak');
    return {mz,intensity,relative};
  });
  if(peaks.length!==peakNumber)throw Error('Measured peak count differs from PK$NUM_PEAK');
  const collision=take(raw,/^AC\$MASS_SPECTROMETRY: COLLISION_ENERGY\s+(.+)$/m,'collision energy');
  const instrument=take(raw,/^AC\$INSTRUMENT_TYPE:\s+(.+)$/m,'instrument type');
  const mgf=['BEGIN IONS','TITLE='+accession,'SCANS=1','PEPMASS='+precursorMz,'CHARGE='+(polarity==='POSITIVE'?'1+':'1-'),
    'IONMODE='+(polarity==='POSITIVE'?'Positive':'Negative'),'MSLEVEL=2',
    'NAME='+compoundName,...peaks.map(p=>p.mz+' '+p.intensity),'END IONS',''].join('\n');
  const spectra=parseMGF(mgf),screen=screenMSMS(spectra,{ppm_tolerance:20,source_reference:accession});
  if(spectra.length!==1||screen.scans[0].peak_count!==peakNumber)throw Error('Conversion quality check failed');
  const neutralMass=precursorMz+(polarity==='POSITIVE'?-PROTON_MASS:PROTON_MASS);
  return {
    accession,raw_sha256:createHash('sha256').update(raw,'utf8').digest('hex'),
    source_url:expected.source_url,license,
    attribution:{authors:expected.contributor,copyright:expected.original_copyright},
    compound_label_source_reported:compoundName,canonical_atlas_cross_reference:expected.atlas_id,
    observed_precursor_mz:precursorMz,precursor_type:precursorType,neutral_mass_da:neutralMass,
    ion_mode:ionMode,instrument_type:instrument,collision_energy_source_string:collision,
    measured_peak_count:peakNumber,
    fragment_count_screen:screen.scans[0].fragment_count_screen,
    non_diagnostic_neutral_loss_mass_matches:screen.loss_matches,
    interpretation:'Measured library standard spectrum provided by MassBank; not an independent Cannabiverse sample or novel cannabinoid identity'
  };
}

export function buildBenchmark(){
  const m=manifest();
  if(m.schema!=='cannabiverse-measured-reference-benchmark-v0.4'||m.records.length!==3)throw Error('Benchmark source contract mismatch');
  const records=m.records.map(r=>parseMassBankReference(load('data/discovery/references/massbank/'+r.local_path),r));
  const comparisons=[];
  for(let i=0;i<records.length;i++)for(let j=i+1;j<records.length;j++){
    const a=records[i],b=records[j];
    if(a.canonical_atlas_cross_reference!==b.canonical_atlas_cross_reference||a.ion_mode===b.ion_mode)continue;
    const errorDa=Math.abs(a.neutral_mass_da-b.neutral_mass_da);
    comparisons.push({accession_a:a.accession,accession_b:b.accession,
      neutral_mass_difference_da:errorDa,
      mass_disagreement_ppm:errorDa/Math.max(a.neutral_mass_da,b.neutral_mass_da)*1e6,
      interpretation:'Reported precursor masses across polarity modes are mutually consistent; this does not authenticate standard identities'});
  }
  return {schema:'cannabiverse-measured-reference-benchmark-report-v0.4',source_revision:m.source_revision,
    source_type:'PUBLISHED_STANDARD_REFERENCE_SPECTRA',sample_status:'NOT_PLANT_EXTRACT_OR_UNKNOWN',
    reference_record_count:records.length,records,cross_polarity_mass_comparisons:comparisons,
    claims_not_made:['Novel cannabinoid discovery','Natural occurrence in ancient or modern cannabis samples',
      'Independently verified instrument origin','Analytical detection in MSV000093886','Medical efficacy or potency']};
}

export function run(argv=process.argv.slice(2)){
  if(argv.length!==1||!['--check','--write'].includes(argv[0]))throw Error('Usage: node scripts/build-massbank-reference-report.mjs --check|--write');
  const serialized=JSON.stringify(buildBenchmark(),null,2)+'\n';
  const output=new URL('../'+summaryPath,import.meta.url);
  if(argv[0]==='--write'){writeFileSync(output,serialized,'utf8');process.stdout.write('WROTE measured reference benchmark v0.4\n');return;}
  if(readFileSync(output,'utf8')!==serialized)throw Error('Benchmark report is stale. Run --write to rebuild.');
  process.stdout.write('PASS three CC BY measured reference spectra; same-compound mass consistency checked, no cannabinoid discovery claimed\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{run();}
  catch(e){process.stderr.write('MassBank reference benchmark failed: '+e.message+'\n');process.exitCode=1;}
}
