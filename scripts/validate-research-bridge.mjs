import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root = new URL('../', import.meta.url);
const manifestUrl = new URL('data/bridge/research-index-v2.json',root);
const manifest = JSON.parse(readFileSync(manifestUrl,'utf8'));
const load = (relative) => JSON.parse(readFileSync(new URL(relative,manifestUrl),'utf8'));
assert.equal(manifest.contract_version,'2.0.0');
assert.equal(manifest.dataset_id,'cannabiverse-research-bridge');
assert.match(manifest.relationship_semantics,/does not prove/i);
assert.ok(Array.isArray(manifest.domains)&&manifest.domains.length>0);
const molecules=load(manifest.sources.compounds);
const structures=load(manifest.sources.structures);
const chemistrySources=load(manifest.sources.chemistry_sources);
assert.equal(molecules.length,145);
const moleculeIDs=new Set(molecules.map(x=>x.atlas_id));
assert.equal(moleculeIDs.size,molecules.length);
const chemIDs=new Set(chemistrySources.map(x=>x.source_id));
assert.equal(chemIDs.size,chemistrySources.length);
for(const m of molecules){
 assert.ok(chemIDs.has(m.source_id),m.atlas_id+': missing chemistry source');
 assert.match(m.identity_claim_id,/^CPA-EVC-\d{4}-I$/);
 assert.match(m.occurrence_claim_id,/^CPA-EVC-\d{4}-O$/);
}
for(const s of structures)assert.ok(moleculeIDs.has(s.atlas_id),'Orphaned 3D structure');
const domainIDs=new Set();
let linked=0,claimCount=0;
for(const d of manifest.domains){
 assert.ok(!domainIDs.has(d.id),'Duplicate research domain');
 domainIDs.add(d.id);
 assert.match(d.human_efficacy_warning,/not established/i);
 const evidence=load(d.evidence_url);
 assert.equal(evidence.contract_version,d.expected_contract_version);
 assert.equal(evidence.dataset_id,d.expected_dataset_id);
 const sources=new Set(evidence.sources.map(s=>s.id));
 assert.equal(sources.size,evidence.sources.length,'Duplicate domain source');
 const ids=new Set();
 for(const c of evidence.claims){
  assert.ok(!ids.has(c.id),'Duplicate claim');ids.add(c.id);
  assert.ok(c.title&&c.summary&&c.model&&c.boundary,'Unbounded claim');
  assert.ok(c.source_ids.length&&c.source_ids.every(s=>sources.has(s)),'Missing claim source');
  assert.ok(Array.isArray(c.related_compounds));
  for(const ref of c.related_compounds){assert.ok(moleculeIDs.has(ref.atlas_id),'Unknown molecular reference');linked++;}
  claimCount++;
 }
}
console.log('PASS Φ Research Bridge v2: '+molecules.length+' molecular identities · '+claimCount+' sourced claims · '+linked+' explicit edges · '+structures.length+' 3D structures');
