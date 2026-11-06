// Cannabiverse Discovery Lab v0.1: deterministic, reference-free mass-spacing screen.
// This is NOT compound identification, MassQL execution, or a substitute for MS/MS.
export const CH2_MASS = 14.01565006446; // neutral monoisotopic mass, Da
export const PROTON_MASS = 1.007276466621; // positive ion proton, Da
const ALLOWED_ADDUCTS = new Set(['[M+H]+','[M-H]-']);
const HEADERS = ['feature_id','mz','adduct','blank_ratio','replicates'];

export function parseCSV(source) {
  if (typeof source !== 'string') throw new Error('CSV input must be text');
  if (source.length > 1000000) throw new Error('CSV exceeds the 1 MB safety limit');
  const text = source.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  const rows = []; let cells=[], cell='', quoted=false, closed=false;
  for (let i=0;i<text.length;i++){
    const ch=text[i];
    if (quoted) {
      if (ch==='"' && text[i+1]==='"') {cell+='"';i++;}
      else if (ch==='"') {quoted=false;closed=true;}
      else cell+=ch;
    } else if (ch==='"') {
      if (cell!=='' || closed) throw new Error('Malformed CSV quoting');
      quoted=true;
    } else if (ch===',') {cells.push(cell);cell='';closed=false;}
    else if (ch==='\n') {cells.push(cell);if(cells.some(v=>v.trim()!==''))rows.push(cells);cells=[];cell='';closed=false;}
    else {if (closed && ch!==' ') throw new Error('Malformed CSV after quoted field');cell+=ch;}
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  cells.push(cell);if(cells.some(v=>v.trim()!==''))rows.push(cells);
  if (!rows.length) throw new Error('No CSV records');
  const header=rows.shift().map(s=>s.trim());
  if(header.length!==new Set(header).size)throw new Error('Duplicate CSV header');
  for(const key of HEADERS)if(!header.includes(key))throw new Error('Missing CSV column: '+key);
  if(rows.length<1||rows.length>2000)throw new Error('Expected between 1 and 2000 features');
  return rows.map((row,i)=>{
    if(row.length!==header.length)throw new Error('CSV row '+(i+2)+' has unexpected column count');
    return Object.fromEntries(header.map((k,j)=>[k,row[j].trim()]));
  });
}

function toNumber(raw,label,{allowEmpty=false,min=-Infinity,max=Infinity,integer=false}={}){
  if((raw===undefined||raw===null||String(raw).trim()==='')&&allowEmpty)return null;
  if(raw===undefined||raw===null||String(raw).trim()==='')throw new Error('Missing '+label);
  const n=Number(raw);
  if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw new Error('Invalid '+label);
  return n;
}

export function normalizeFeatures(rows){
  if(!Array.isArray(rows)||rows.length<1||rows.length>2000)throw new Error('Features must be an array of 1–2000 entries');
  const ids=new Set();
  return rows.map((r,i)=>{
    if(!r||typeof r!=='object'||Array.isArray(r))throw new Error('Invalid feature at index '+i);
    const featureId=String(r.feature_id??'').trim();
    if(!/^[A-Za-z0-9._-]{1,64}$/.test(featureId)||ids.has(featureId))throw new Error('Invalid or duplicate feature ID: '+featureId);
    ids.add(featureId);
    const adduct=String(r.adduct??'').trim();
    if(!ALLOWED_ADDUCTS.has(adduct))throw new Error('Unsupported adduct for '+featureId+' (use [M+H]+ or [M-H]-)');
    const mz=toNumber(r.mz,'m/z for '+featureId,{min:50,max:2000});
    const blankRatio=toNumber(r.blank_ratio,'blank_ratio for '+featureId,{min:0,allowEmpty:true});
    const replicates=toNumber(r.replicates,'replicates for '+featureId,{min:1,max:10000,integer:true,allowEmpty:true});
    const neutralMass=mz+(adduct==='[M+H]+'?-PROTON_MASS:PROTON_MASS);
    const kendrickMass=neutralMass*14/CH2_MASS;
    return {feature_id:featureId,mz,adduct,neutral_mass:neutralMass,
      kendrick_mass:kendrickMass,kendrick_mass_defect:Math.round(kendrickMass)-kendrickMass,
      blank_ratio:blankRatio,replicates,
      screening_status:blankRatio===null||replicates===null?'INSUFFICIENT_QC':blankRatio<5?'BLANK_FLAG':replicates<2?'LOW_REPLICATION':'QC_SCREEN_PASS'};
  });
}

export function analyzeFeatures(rows,options={}){
  const ppm=options.ppm_tolerance===undefined?10:toNumber(options.ppm_tolerance,'ppm tolerance',{min:0.1,max:50});
  const features=normalizeFeatures(rows).sort((a,b)=>a.feature_id.localeCompare(b.feature_id));
  const pairs=[];
  for(let i=0;i<features.length;i++)for(let j=i+1;j<features.length;j++){
    const a=features[i],b=features[j];const delta=Math.abs(a.neutral_mass-b.neutral_mass);
    const steps=Math.round(delta/CH2_MASS);
    if(steps<1||steps>6)continue;
    const expected=steps*CH2_MASS;const errorDa=Math.abs(delta-expected);
    const toleranceDa=ppm*1e-6*Math.max(a.neutral_mass,b.neutral_mass);
    if(errorDa>toleranceDa)continue;
    pairs.push({feature_a:a.feature_id,feature_b:b.feature_id,ch2_steps:steps,
      observed_delta_da:delta,expected_delta_da:expected,error_da:errorDa,
      error_ppm_larger_mass:errorDa/Math.max(a.neutral_mass,b.neutral_mass)*1e6,
      review_status:a.screening_status==='QC_SCREEN_PASS'&&b.screening_status==='QC_SCREEN_PASS'?'PATTERN_PASS':'QC_REVIEW',
      interpretation:'CH2 neutral-mass spacing only; not a chemical identity or structural relationship'});
  }
  pairs.sort((a,b)=>a.ch2_steps-b.ch2_steps||a.feature_a.localeCompare(b.feature_a)||a.feature_b.localeCompare(b.feature_b));
  return {schema:'cannabiverse-discovery-screen-v0.1',method:'neutral-mass CH2 Kendrick homologue-spacing',ppm_tolerance:ppm,
    evidence_level:'PATTERN_ONLY_NO_COMPOUND_IDENTITY',notes:[
      'Data originate solely from supplied feature table; no LC-MS instrument data were processed.',
      'No MS/MS fragment inference, MassQL execution, spectral library matching, or molecular-structure assignment.',
      'Blank ratio >=5 and >=2 replicates are illustrative QC screening thresholds, not validated identification criteria.',
      'CH2 spacing does not prove a shared biosynthetic origin; isotope, adduct, coelution and artifact checks remain necessary.'
    ],features,pairs};
}
