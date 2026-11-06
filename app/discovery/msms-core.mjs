// Discovery Lab v0.2: offline MGF peak-list parser and non-identifying MS/MS screens.
// A fragment/neutral-loss match is not structural confirmation or a MassQL result.
export const H2O_LOSS = 18.010564684;
export const CO2_LOSS = 43.98982924;
const LOSSES=[{id:'H2O',label:'H₂O mass difference',mass:H2O_LOSS},
              {id:'CO2',label:'CO₂ mass difference',mass:CO2_LOSS}];
const MAX_SIZE=2_000_000,MAX_SPECTRA=120,MAX_PEAKS=1000;
const assertNumber=(v,label,min,max)=>{
  if(v==null||String(v).trim()==='')throw Error('Missing '+label);
  const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error('Invalid '+label);
  return n;
};

export function parseMGF(source){
  if(typeof source!=='string')throw Error('MGF must be text');
  if(source.length>MAX_SIZE)throw Error('MGF exceeds 2 MB browser limit');
  const lines=source.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').split('\n');
  const out=[];let current=null;
  for(let i=0;i<lines.length;i++){
    const raw=lines[i].trim();if(!raw||raw.startsWith('#')||raw.startsWith(';'))continue;
    if(raw==='BEGIN IONS'){
      if(current)throw Error('Nested BEGIN IONS at line '+(i+1));
      if(out.length>=MAX_SPECTRA)throw Error('Maximum '+MAX_SPECTRA+' spectra per file');
      current={metadata:{},peaks:[],start:i+1};continue;
    }
    if(raw==='END IONS'){
      if(!current)throw Error('END IONS without BEGIN IONS at line '+(i+1));
      const m=current.metadata, id=String(m.TITLE||m.SCANS||'scan-'+(out.length+1)).trim().slice(0,120);
      if(!m.PEPMASS)throw Error('PEPMASS missing from scan '+id);
      const mz=assertNumber(m.PEPMASS.split(/\s+/)[0],'PEPMASS for '+id,50,2000);
      const charge=String(m.CHARGE||'').trim();
      if(!['1+','+1','1-','-1'].includes(charge))throw Error('Unsupported or missing singly charged CHARGE for '+id);
      const polarity=charge.includes('+')?'positive':'negative';
      if(m.IONMODE){
        const claimed=String(m.IONMODE).toLowerCase().trim();
        if(!['positive','negative'].includes(claimed)||claimed!==polarity)throw Error('IONMODE and CHARGE conflict for '+id);
      }
      if(m.MSLEVEL && String(m.MSLEVEL).trim()!=='2')throw Error('Only MSLEVEL=2 accepted for '+id);
      if(!current.peaks.length)throw Error('No MS/MS peaks for '+id);
      if(current.peaks.every(p=>p.intensity===0))throw Error('All-zero intensities for '+id);
      const peaks=current.peaks.sort((a,b)=>a.mz-b.mz);
      out.push({spectrum_id:id,spectrum_index:out.length+1,precursor_mz:mz,polarity,
        adduct:polarity==='positive'?'[M+H]+':'[M-H]-',
        retention_seconds:m.RTINSECONDS?assertNumber(m.RTINSECONDS,'retention time',0,1e8):null,
        source_metadata:{title:m.TITLE||null,scans:m.SCANS||null,spectrum_id:m.SPECTRUMID||null,
          ion_mode:m.IONMODE||null,name_unverified:m.NAME||null},
        peaks});current=null;continue;
    }
    if(!current)throw Error('Unexpected text outside MGF scan at line '+(i+1));
    const match=raw.match(/^([A-Za-z][A-Za-z0-9_]*)=(.*)$/);
    if(match){
      const k=match[1].toUpperCase();if(Object.hasOwn(current.metadata,k))throw Error('Duplicate MGF property '+k+' at line '+(i+1));
      if(match[2].length>500)throw Error('Excessive MGF metadata length at line '+(i+1));
      current.metadata[k]=match[2].trim();continue;
    }
    const columns=raw.split(/\s+/);
    if(columns.length!==2||!columns.every(v=>/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(v)))
      throw Error('Invalid MS/MS peak at line '+(i+1));
    if(current.peaks.length>=MAX_PEAKS)throw Error('More than '+MAX_PEAKS+' peaks in one spectrum');
    const mz=assertNumber(columns[0],'fragment m/z',20,2000),intensity=assertNumber(columns[1],'intensity',0,1e15);
    current.peaks.push({mz,intensity});
  }
  if(current)throw Error('Unclosed BEGIN IONS spectrum');
  if(!out.length)throw Error('No spectra found (BEGIN IONS / END IONS required)');
  return out;
}

export function screenMSMS(spectra,opts={}){
  if(!Array.isArray(spectra)||!spectra.length||spectra.length>MAX_SPECTRA)throw Error('Invalid MS/MS spectra');
  const ppm=opts.ppm_tolerance===undefined?20:assertNumber(opts.ppm_tolerance,'MS/MS ppm tolerance',1,50);
  const source=String(opts.source_reference||'').trim().slice(0,300);
  const scans=[],lossMatches=[];
  for(const s of spectra){
    if(!s||!Array.isArray(s.peaks)||!s.peaks.length)throw Error('Incomplete spectrum');
    const total=s.peaks.reduce((n,p)=>n+p.intensity,0);
    const base=s.peaks.reduce((n,p)=>Math.max(n,p.intensity),0);
    const positive=s.peaks.filter(p=>p.intensity>0);
    const rel=positive.map(p=>({...p,rel:p.intensity/base}));
    const informative=rel.filter(p=>p.rel>=0.01);
    const qc=informative.length>=6?'FRAGMENT_COUNT_SCREEN_PASS':'LOW_FRAGMENT_INFORMATION';
    scans.push({spectrum_id:s.spectrum_id,spectrum_index:s.spectrum_index,precursor_mz:s.precursor_mz,polarity:s.polarity,
      peak_count:s.peaks.length,peaks_above_1pct:informative.length,total_ion_count:total,base_peak_intensity:base,
      retention_seconds:s.retention_seconds,fragment_count_screen:qc});
    for(const target of LOSSES){
      let best=null;
      for(const peak of informative){
        if(peak.mz>=s.precursor_mz)continue;
        const observed=s.precursor_mz-peak.mz;
        const errorDa=Math.abs(observed-target.mass);
        const errorPpm=errorDa/s.precursor_mz*1e6;
        if(errorPpm<=ppm&&(!best||errorDa<best.error_da))best={
          spectrum_id:s.spectrum_id,spectrum_index:s.spectrum_index,
          loss_label:target.label,loss_mass_da:target.mass,observed_loss_da:observed,
          fragment_mz:peak.mz,relative_intensity:peak.rel,error_da:errorDa,
          error_ppm_precursor:errorPpm,interpretation:'Common neutral-loss mass coincidence; NOT cannabinoid-specific or a proven chemical pathway'
        };
      }
      if(best)lossMatches.push(best);
    }
  }
  return {schema:'cannabiverse-msms-screen-v0.2',evidence_level:'FRAGMENT_PATTERN_ONLY_NO_IDENTITY',
    source_reference_unverified:source||'NOT_PROVIDED',ppm_tolerance:ppm,scans,loss_matches:lossMatches,
    limitations:['MGF peak lists are processed locally. Instrument validity, sample origin, peak calibration and dataset labels are unverified.',
      'Matches use precursor-minus-fragment mass differences; H2O/CO2 losses are ubiquitous and not cannabinoid diagnostic.',
      'This is not MassQL, library search, chemical structure annotation, natural occurrence or clinical validation.',
      'Blank controls, biological replication and independently acquired authentic standards are not inferred from a spectrum.']};
}

// Existing v0.1 feature screen can analyze an MGF precursor table but cannot infer sample/blank QC.
export function mgfPrecursorRows(spectra){
  return spectra.map(s=>({feature_id:'MGF-'+String(s.spectrum_index).padStart(4,'0'),
    mz:s.precursor_mz,adduct:s.adduct,blank_ratio:'',replicates:''}));
}
