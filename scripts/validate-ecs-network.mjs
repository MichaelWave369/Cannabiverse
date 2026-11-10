import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => JSON.parse(readFileSync(new URL('../' + path,import.meta.url),'utf8'));
const record = read('data/ecs-network/evidence-v1.json');
const manifest = read('data/bridge/research-index-v2.json');
const compounds = new Set(read('data/evidence/compound_evidence_summary.json').map(x=>x.atlas_id));
const allowedKinds = new Set(['endocannabinoid','receptor','enzyme','phytocannabinoid','context']);
const allowedLanes = new Set(['foundational_physiology','mechanistic_physiology','pharmacology_context','human_clinical_context','clinical_safety_context','evidence_boundary']);

function verify(data) {
  assert.equal(data.contract_version,'1.0.0');
  assert.equal(data.dataset_id,'cannabiverse-ecs-network-evidence');
  assert.match(data.medical_boundary,/does not establish/i);
  assert.ok(Array.isArray(data.sources) && data.sources.length>=4);
  assert.ok(Array.isArray(data.entities) && data.entities.length>=10);
  assert.ok(Array.isArray(data.claims) && data.claims.length>=10);
  assert.ok(Array.isArray(data.relationships) && data.relationships.length>=6);
  const sourceIds = new Set(),entityIds = new Set(),claimIds = new Set(),relationIds = new Set();
  for(const s of data.sources) {
    assert.ok(s.id && !sourceIds.has(s.id),'Duplicate source');
    assert.ok(s.title && s.kind && /^https:\/\//.test(s.url),'Incomplete source');
    sourceIds.add(s.id);
  }
  for(const e of data.entities) {
    assert.match(e.id,/^ECS-ENT-\d{3}$/);
    assert.ok(!entityIds.has(e.id) && allowedKinds.has(e.kind) && e.label && e.summary,'Invalid ECS entity');
    entityIds.add(e.id);
  }
  for(const c of data.claims) {
    assert.match(c.id,/^ECS-CLM-\d{3}$/);
    assert.ok(!claimIds.has(c.id) && allowedLanes.has(c.lane),'Duplicate/unknown claim lane');
    assert.ok(c.evidence_strength && c.summary && c.title && c.model && c.boundary && c.link_scope,'Unbounded claim');
    assert.ok(Array.isArray(c.source_ids) && c.source_ids.length && c.source_ids.every(x=>sourceIds.has(x)),'Missing scientific source');
    assert.ok(Array.isArray(c.related_entities) && c.related_entities.length && c.related_entities.every(x=>entityIds.has(x)),'Orphan ECS context');
    assert.ok(Array.isArray(c.related_compounds) && c.related_compounds.every(x=>compounds.has(x.atlas_id)),'Unexpected plant canonical ID');
    assert.ok(Array.isArray(c.mechanism_steps) && !c.mechanism_steps.length,'Clinical claims cannot inherit decorative mechanism steps');
    if(c.lane==='human_clinical_context')assert.match(c.boundary,/formulation|product|isolated molecule/i,'Clinical outcomes must stay scoped');
    if(c.related_compounds.length)assert.match(c.link_scope,/referenced_phytocannabinoid/,'Plant links must be contextual');
    claimIds.add(c.id);
  }
  for(const edge of data.relationships) {
    assert.match(edge.id,/^ECS-REL-\d{3}$/);
    assert.ok(!relationIds.has(edge.id) && edge.predicate && edge.from!==edge.to,'Duplicate/invalid relation');
    assert.ok(entityIds.has(edge.from) && entityIds.has(edge.to),'Orphan ECS relation');
    const claim=data.claims.find(c=>c.id===edge.claim_id);
    assert.ok(claim && claim.related_entities.includes(edge.from) && claim.related_entities.includes(edge.to),'Unreceipted relationship');
    relationIds.add(edge.id);
  }
  return true;
}

assert.equal(verify(record),true);
assert.throws(()=>verify({...record,relationships:[...record.relationships,{...record.relationships[0],id:'ECS-REL-999',to:'ECS-ENT-999'}]}));
assert.throws(()=>verify({...record,claims:[{...record.claims[0],source_ids:['MISSING']},...record.claims.slice(1)]}));
assert.throws(()=>verify({...record,claims:[{...record.claims[0],related_compounds:[{atlas_id:'CPA-CAN-9999'}]},...record.claims.slice(1)]}));
const spec=manifest.domains.find(x=>x.id==='ecs-network');
assert.ok(spec,'ECS network domain not registered');
assert.equal(spec.evidence_url,'../ecs-network/evidence-v1.json');
assert.equal(spec.expected_contract_version,record.contract_version);
assert.equal(spec.expected_dataset_id,record.dataset_id);
assert.match(spec.human_efficacy_warning,/not established/i);
console.log('PASS ECS network: '+record.entities.length+' entities · '+record.relationships.length+' sourced relationships · '+record.claims.length+' bounded claims');
