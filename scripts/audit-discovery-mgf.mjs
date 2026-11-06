// Offline, no-dependencies, source-auditable MGF report generator.
// Usage: node scripts/audit-discovery-mgf.mjs --input FILE.mgf --role sample|blank|standard|unknown [--dataset MSV000093886] [--polarity positive|negative|mixed] [--output report.json]
// The output never asserts that a user-provided file belongs to the named dataset.
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {parseMGF,screenMSMS,mgfPrecursorRows} from '../app/discovery/msms-core.mjs';
import {analyzeFeatures} from '../app/discovery/lab-core.mjs';

const ROLES=['sample','blank','standard','unknown'];
const POLARITIES=['positive','negative','mixed'];
const MAX_BYTES=2_000_000;
const registry=()=>JSON.parse(readFileSync(new URL('../data/discovery/public-data-sources-v1.json',import.meta.url),'utf8'));

export function createAudit({bytes,role='unknown',dataset_id='UNREGISTERED',declared_polarity='mixed',input_name='local-file.mgf',ppm_msms=20,ppm_precursor=10}={}){
  if(!(bytes instanceof Uint8Array))throw new Error('Input must be a Uint8Array');
  if(!bytes.length||bytes.byteLength>MAX_BYTES)throw new Error('MGF file must contain 1 to 2,000,000 bytes');
  if(!ROLES.includes(role))throw new Error('Unknown sample role');
  if(!POLARITIES.includes(declared_polarity))throw new Error('Unknown declared polarity');
  const ds=String(dataset_id).trim();
  const all=registry().sources, selected=all.find(s=>s.id===ds);
  if(ds!=='UNREGISTERED'&&!selected)throw new Error('Unknown dataset registry ID');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  const spectra=parseMGF(text);
  const polarities=[...new Set(spectra.map(s=>s.polarity))].sort();
  if(declared_polarity!=='mixed'&&polarities.some(p=>p!==declared_polarity))
    throw new Error('Declared polarity conflicts with spectral metadata');
  if(declared_polarity==='mixed'&&polarities.length===1){
    // Do not reject; 'mixed' means user did not restrict the polarity, not a claim of observation.
  }
  const msms=screenMSMS(spectra,{ppm_tolerance:ppm_msms,source_reference:ds});
  const rows=mgfPrecursorRows(spectra);
  const precursor_screen=rows.length?analyzeFeatures(rows,{ppm_tolerance:ppm_precursor}):null;
  const checksum=createHash('sha256').update(bytes).digest('hex');
  const input_name_safe=String(input_name).slice(0,200).replace(/[\r\n\t]/g,' ');
  return {
    schema:'cannabiverse-local-msms-provenance-audit-v0.3',
    evidence_level:'EXPERIMENTAL_FORMAT_OBSERVATIONS_ONLY_NO_COMPOUND_IDENTITY',
    provenance:{
      sha256_bytes:checksum,
      byte_length:bytes.byteLength,
      input_filename_unverified:input_name_safe,
      dataset_id_user_asserted:ds,
      registered_dataset:selected?{id:selected.id,title:selected.title,access_url:selected.access_url,license:selected.license,access_status:selected.access_status,doi:selected.dataset_doi}:null,
      source_attribution_status:'NOT_AUTHENTICATED',
      role_user_asserted:role,
      declared_polarity:declared_polarity,
      observed_polarities:polarities,
      has_verified_blank_or_reference_standard:false,
      instrument_settings_verified:false,
      source_metadata_verified:false
    },
    msms_screen:msms,
    precursor_pattern_screen:precursor_screen,
    caveats:[
      'The SHA-256 verifies the bytes of the local input only; it does not authenticate sample origin or instrument calibration.',
      'Dataset association and sample role were provided by the user, not verified by the lab.',
      'Input spectra may be consensus/processed spectra rather than raw experimental scan acquisitions.',
      'No reference-standard chemistry, scientific novelty, natural occurrence, or human health effects are asserted.'
    ]
  };
}

function parseArgs(argv){
  const opts={};
  for(let i=0;i<argv.length;i++){
    const key=argv[i];
    if(!['--input','--output','--dataset','--role','--polarity','--ppm-msms','--ppm-precursor'].includes(key)||i+1>=argv.length)
      throw Error('Unknown or incomplete option: '+key);
    if(Object.hasOwn(opts,key))throw Error('Duplicate option: '+key);
    opts[key]=argv[++i];
  }
  if(!opts['--input'])throw Error('Required: --input FILE.mgf');
  if(!opts['--role'])throw Error('Required: --role sample|blank|standard|unknown');
  return opts;
}
export function runCLI(argv){
  const opts=parseArgs(argv),input=resolve(opts['--input']);
  if(statSync(input).size>MAX_BYTES)throw Error('MGF file exceeds 2 MB safety limit');
  const bytes=readFileSync(input);
  const result=createAudit({bytes,role:opts['--role'],dataset_id:opts['--dataset']||'UNREGISTERED',
    declared_polarity:opts['--polarity']||'mixed',input_name:opts['--input'],
    ppm_msms:opts['--ppm-msms']===undefined?20:Number(opts['--ppm-msms']),
    ppm_precursor:opts['--ppm-precursor']===undefined?10:Number(opts['--ppm-precursor'])});
  const formatted=JSON.stringify(result,null,2)+'\n';
  if(opts['--output']){
    const target=resolve(opts['--output']);writeFileSync(target,formatted,'utf8');
    return {destination:target,scan_count:result.msms_screen.scans.length,sha256:result.provenance.sha256_bytes};
  }
  process.stdout.write(formatted);
  return {destination:'stdout',scan_count:result.msms_screen.scans.length,sha256:result.provenance.sha256_bytes};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{runCLI(process.argv.slice(2));}
  catch(error){process.stderr.write('MGF audit failed: '+error.message+'\n');process.exitCode=1;}
}
