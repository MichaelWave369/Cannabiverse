import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const feed=read('data/archaeology/evidence-v1.json');
const manifest=read('data/bridge/research-index-v2.json');
const canon=read('data/evidence/compound_evidence_summary.json');
assert.equal(feed.contract_version,'1.0.0');
assert.equal(feed.dataset_id,'cannabiverse-archaeology-evidence');
assert.match(feed.medical_boundary,/does not establish medical efficacy/i);
assert.ok(feed.sites.length>=3&&feed.sources.length>=4&&feed.claims.length>=8);
const sites=new Set(),sources=new Set(),claims=new Set(),compoundIds=new Set(canon.map(c=>c.atlas_id));
for(const s of feed.sites){
 assert.ok(s.id&&!sites.has(s.id)&&s.region&&s.period&&s.date_basis,'Invalid site');
 sites.add(s.id);
}
for(const s of feed.sources){
 assert.ok(s.id&&!sources.has(s.id)&&s.kind&&s.title&&/^https:\/\//.test(s.url),'Invalid source');
 sources.add(s.id);
}
const lanes=new Set(['dated_botanical_material','analytical_biomarker_signal','contested_interpretation','contextual_inference','archaeological_context','historical_text','interpretive_boundary']);
const strengths=new Set(['direct_material','reported_molecular_signal_contested','contested_interpretation','direct_residue_chemistry','well_supported_inference','documented_artifact_context','textual_attestation','not_established']);
let linked=0;
for(const c of feed.claims){
 assert.ok(c.id&&!claims.has(c.id)&&sites.has(c.site_id),'Duplicate or orphan claim');
 claims.add(c.id);
 assert.ok(lanes.has(c.lane)&&strengths.has(c.evidence_strength),'Ungoverned lane/strength');
 for(const k of ['title','summary','method','model','boundary','link_scope'])assert.ok(typeof c[k]==='string'&&c[k].length>=8,'Missing claim field: '+k);
 assert.ok(Array.isArray(c.source_ids)&&c.source_ids.length&&c.source_ids.every(s=>sources.has(s)),'Unverifiable source IDs');
 assert.ok(Array.isArray(c.related_compounds),'Missing molecule references');
 if(c.lane==='historical_text'||c.lane==='interpretive_boundary'||c.lane==='dated_botanical_material')
  assert.equal(c.related_compounds.length,0,'Forbidden chemical promotion from a historical/boundary claim');
 for(const ref of c.related_compounds){assert.ok(compoundIds.has(ref.atlas_id)&&ref.name,'Noncanonical molecule');linked++;}
}
assert.equal(feed.claims.find(c=>c.id==='ARCH-CLM-002')?.evidence_strength,'reported_molecular_signal_contested');
assert.ok(feed.claims.find(c=>c.id==='ARCH-CLM-003')?.source_ids.includes('ARCH-SRC-AP-2026'),'Independent critique must remain visible');
assert.ok(feed.claims.find(c=>c.id==='ARCH-CLM-008')?.boundary.includes('Ice Maiden'),'Conflated tomb caution missing');
const d=manifest.domains.find(d=>d.id==='archaeology');
assert.ok(d,'Archaeology not registered in Bridge');
assert.equal(d.expected_dataset_id,feed.dataset_id);
assert.equal(d.expected_contract_version,feed.contract_version);
assert.equal(d.evidence_url,'../archaeology/evidence-v1.json');
assert.equal(manifest.content_release,'4.0.0');
console.log('PASS archaeology: '+sites.size+' contexts, '+sources.size+' sources, '+claims.size+' claims, '+linked+' contextual chemical references');
