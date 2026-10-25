import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=(p)=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const record=read('data/pain-ecs/evidence-v1.json');
const manifest=read('data/bridge/research-index-v2.json');
const chemistry=read('data/evidence/compound_evidence_summary.json');
const chemicalIds=new Set(chemistry.map(c=>c.atlas_id));
const validLanes=new Set(['human_clinical_evidence','clinical_safety','evidence_gap','clinical_guidance_context','preclinical_physiology']);
const validStrength=new Set(['moderate','low','low_to_moderate','insufficient','professional_position','mechanistic_review','clinical_safety_context','regulatory_context','not_graded']);
assert.equal(record.dataset_id,'cannabiverse-pain-ecs-evidence');
assert.equal(record.contract_version,'1.0.0');
assert.ok(record.medical_boundary.includes('Do not replace medical care'));
assert.ok(Array.isArray(record.sources)&&record.sources.length>=4);
assert.ok(Array.isArray(record.claims)&&record.claims.length>=10);
const sourceIds=new Set();
for(const source of record.sources){
 assert.ok(source.id&&!sourceIds.has(source.id),'Duplicate or empty source ID');
 sourceIds.add(source.id);
 assert.ok(source.title&&source.kind&&/^https:\/\//.test(source.url),'Bad source');
}
const ids=new Set();let edges=0,unlinked=0;
for(const claim of record.claims){
 assert.ok(claim.id&&!ids.has(claim.id),'Duplicate claim');
 ids.add(claim.id);
 assert.ok(validLanes.has(claim.lane),'Unknown evidence lane');
 assert.ok(validStrength.has(claim.evidence_strength),'Unknown strength class');
 assert.ok(claim.link_scope&&claim.title&&claim.summary&&claim.model&&claim.boundary,'Incomplete scientific claim');
 assert.ok(Array.isArray(claim.source_ids)&&claim.source_ids.length>0,'Unsourced claim');
 assert.ok(claim.source_ids.every(x=>sourceIds.has(x)),'Missing source');
 assert.ok(Array.isArray(claim.related_compounds)&&Array.isArray(claim.mechanism_steps),'Bad claim arrays');
 if(claim.lane!=='preclinical_physiology')assert.equal(claim.mechanism_steps.length,0,'Clinical claim includes mechanism as proof');
 for(const compound of claim.related_compounds) {
   assert.ok(chemicalIds.has(compound.atlas_id),'Unknown canonical compound');
   assert.ok(compound.name,'Missing link label');edges++;
 }
 if(!claim.related_compounds.length)unlinked++;
}
assert.ok(unlinked>=3,'Retain global ECS/clinical limitation records without invented phytocannabinoid mapping');
assert.equal(record.claims.find(x=>x.id==='PAIN-CLM-003')?.evidence_strength,'moderate');
assert.ok(record.claims.find(x=>x.id==='PAIN-CLM-001')?.link_scope.includes('combination'));
const domain=manifest.domains.find(x=>x.id==='pain-ecs');
assert.ok(domain,'Pain domain not registered');
assert.equal(domain.evidence_url,'../pain-ecs/evidence-v1.json');
assert.equal(domain.expected_dataset_id,record.dataset_id);
assert.equal(domain.expected_contract_version,record.contract_version);
console.log('PASS Pain & ECS: '+record.claims.length+' claims, '+sourceIds.size+' sources, '+edges+' contextual molecule links, '+unlinked+' global records');
