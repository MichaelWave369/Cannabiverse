import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const feed=load('data/discovery/hypotheses-v1.json');
const canonical=load('data/evidence/compound_evidence_summary.json');
const provisional=load('data/evidence/provisional_candidates.json');
const archaeology=load('data/archaeology/evidence-v1.json');
const canonIds=new Set(canonical.map(x=>x.atlas_id));
const provIds=new Set(provisional.map(x=>x.candidate_id));
const archaeologySources=new Set(archaeology.sources.map(x=>x.id));
assert.equal(feed.dataset_id,'cannabiverse-discovery-hypotheses');
assert.equal(feed.contract_version,'1.0.0');
assert.match(feed.doctrine,/HYPOTHESIS ≠ OBSERVATION/);
assert.ok(Array.isArray(feed.hypotheses)&&feed.hypotheses.length>=4);
assert.ok(Array.isArray(feed.sources)&&feed.sources.length>=5);
const sources=new Set();
for(const s of feed.sources){
 assert.ok(s.id&&!sources.has(s.id),'Duplicate or empty source identifier');
 assert.ok(s.kind&&s.title&&s.role&&s.evidence_boundary&&/^https:\/\//.test(s.url),'Incomplete source receipt');
 sources.add(s.id);
}
const validLanes=new Set(['comparative_genomics','analytical_reannotation','preservation_chemistry','computational_chemistry','evidence_quality']);
const seen=new Set();let refs=0;
for(const h of feed.hypotheses){
 assert.ok(h.id&&!seen.has(h.id),'Duplicate hypothesis');
 seen.add(h.id);
 assert.equal(h.status,'HYPOTHESIS_ONLY','A speculative record cannot be promoted to a finding');
 assert.ok(validLanes.has(h.lane),'Invalid research lane');
 assert.ok(Number.isInteger(h.priority)&&h.priority>=1&&h.priority<=3,'Invalid priority');
 for(const k of ['title','basis','prediction','disconfirming_observation','limits'])assert.ok(typeof h[k]==='string'&&h[k].length>30,'Missing scope: '+k);
 assert.ok(Array.isArray(h.needed_data)&&h.needed_data.length>=1,'No next data');
 assert.ok(Array.isArray(h.source_ids)&&h.source_ids.length>0&&h.source_ids.every(s=>sources.has(s)),'Untraceable sources');
 assert.ok(Array.isArray(h.provisional_ids)&&Array.isArray(h.canonical_ids),'Invalid identifiers');
 for(const id of h.provisional_ids)assert.ok(provIds.has(id),'Speculative ID missing from provisional ledger: '+id);
 for(const id of h.canonical_ids)assert.ok(canonIds.has(id),'Unknown established molecule: '+id);
 refs+=h.provisional_ids.length+h.canonical_ids.length;
}
assert.ok(archaeologySources.has('ARCH-SRC-SCIENCE-2026'),'Archaeology source bridge missing');
const target=feed.hypotheses.find(h=>h.id==='DISC-HYP-002');
assert.ok(target&&target.provisional_ids.length===provisional.length,'Preserve every existing provisional target');
assert.ok(provisional.some(p=>p.status==='PUTATIVE_DETECTION')&&provisional.some(p=>p.status==='SEARCH_TARGET_NOT_DETECTED_IN_2021_STUDY'),'Evidence stages conflated');
assert.ok(feed.hypotheses.some(h=>h.disconfirming_observation),'Missing falsification requirement');
console.log('PASS discovery research: '+feed.hypotheses.length+' falsifiable hypotheses, '+sources.size+' source receipts, '+refs+' existing-molecule links; zero canon promotions');
