import {parseCSV,analyzeFeatures} from './lab-core.mjs';

const byId=id=>document.getElementById(id);
const refs={csv:byId('csv'),ppm:byId('ppm'),status:byId('status'),count:byId('count'),featureRows:byId('features'),pairRows:byId('pairs'),export:byId('export'),hypotheses:byId('hypotheses'),targets:byId('targets')};
let latest=null;

function element(tag,text,cls){
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=String(text);
  if(cls)node.className=cls;
  return node;
}
function linked(text,url){
  const a=element('a',text);
  a.href=url;a.target='_blank';a.rel='noopener noreferrer';
  return a;
}
function cell(value){
  const td=element('td',value);
  return td;
}
function addRow(tbody,vals){
  const tr=document.createElement('tr');
  for(const v of vals)tr.append(cell(v));
  tbody.append(tr);
}
function render(report){
  refs.featureRows.replaceChildren();
  refs.pairRows.replaceChildren();
  for(const f of report.features){
    addRow(refs.featureRows,[f.feature_id,f.neutral_mass.toFixed(6),f.kendrick_mass_defect.toFixed(6),f.screening_status]);
  }
  for(const p of report.pairs){
    addRow(refs.pairRows,[p.feature_a+' / '+p.feature_b,p.ch2_steps,p.error_ppm_larger_mass.toFixed(4),p.review_status]);
  }
  const qcPass=report.features.filter(f=>f.screening_status==='QC_SCREEN_PASS').length;
  refs.count.textContent=report.features.length+' mass features · '+report.pairs.length+' CH₂ spacing pairs · '+qcPass+' passed illustrative QC gates. No compound identities assigned.';
  refs.status.textContent='Local screening complete. Results are patterns only; no compounds or medical effects were identified.';
}
byId('demo').addEventListener('click',async()=>{
  refs.status.textContent='Loading explicitly synthetic demonstration data…';
  try{
    const response=await fetch('../../data/discovery/demo-features.csv',{cache:'no-cache'});
    if(!response.ok)throw new Error('Demonstration file unavailable');
    refs.csv.value=await response.text();
    refs.status.textContent='Synthetic demo loaded. These are invented mass values, not observed cannabis chemistry. Select Analyze.';
  }catch(error){refs.status.textContent='Could not load demo: '+error.message;}
});
byId('run').addEventListener('click',()=>{
  latest=null;refs.export.disabled=true;
  refs.featureRows.replaceChildren();refs.pairRows.replaceChildren();
  refs.count.textContent='No valid result.';
  try{
    const rows=parseCSV(refs.csv.value);
    const report=analyzeFeatures(rows,{ppm_tolerance:refs.ppm.value});
    latest=report;
    render(report);
    refs.export.disabled=false;
  }catch(error){refs.status.textContent='Analysis rejected: '+error.message;}
});
refs.export.addEventListener('click',()=>{
  if(!latest)return;
  const blob=new Blob([JSON.stringify(latest,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='cannabiverse-discovery-pattern-report.json';
  document.body.append(a);a.click();a.remove();
  URL.revokeObjectURL(url);
});
async function loadLedger(){
  try{
    const [hypR,candidateR]=await Promise.all([
      fetch('../../data/discovery/hypotheses-v1.json',{cache:'no-cache'}),
      fetch('../../data/evidence/provisional_candidates.json',{cache:'no-cache'})
    ]);
    if(!hypR.ok||!candidateR.ok)throw new Error('Evidence registries unavailable');
    const [hyp,candidates]=await Promise.all([hypR.json(),candidateR.json()]);
    if(hyp.dataset_id!=='cannabiverse-discovery-hypotheses'||hyp.contract_version!=='1.0.0'||!Array.isArray(hyp.hypotheses)||!Array.isArray(hyp.sources)||!Array.isArray(candidates))throw new Error('Unknown evidence contract');
    refs.hypotheses.replaceChildren();
    const sourceById=new Map(hyp.sources.map(s=>[s.id,s]));
    for(const h of hyp.hypotheses){
      const card=element('article',undefined,'card');
      card.append(element('span',h.status+' · Priority '+h.priority,'tag'),element('h3',h.title),element('p',h.prediction),element('p','Potential disconfirmation: '+h.disconfirming_observation));
      const source=h.source_ids.map(id=>sourceById.get(id)).filter(Boolean)[0];
      if(source)card.append(linked('Primary source: '+source.title,source.url));
      refs.hypotheses.append(card);
    }
    refs.targets.replaceChildren();
    for(const t of candidates){
      const card=element('article',undefined,'card');
      card.append(element('h3',t.short_label),element('p',t.name),element('p',t.status.replaceAll('_',' ')+' · '+t.candidate_id));
      refs.targets.append(card);
    }
  }catch(error){
    refs.hypotheses.replaceChildren(element('p','Governed hypothesis feed unavailable or incompatible. No unsourced predictions shown.','muted'));
    refs.targets.replaceChildren();
  }
}
loadLedger();
