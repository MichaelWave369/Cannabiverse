import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const tissue=read('data/ecs-network/tissues-v1.json');
const main=read('data/ecs-network/evidence-v1.json');
const allowedReceptors=new Set(['CB1','CB2']);
const allowedModels=new Set(['human_and_preclinical_review','preclinical_emphasis','context_dependent_preclinical']);

function verify(t,parent){
  assert.equal(t.contract_version,'1.0.0');
  assert.equal(t.dataset_id,'cannabiverse-ecs-tissue-map');
  assert.equal(t.authoritative_parent_dataset,parent.dataset_id);
  assert.match(t.representation_warning,/not receptor-density measurements/i);
  assert.match(t.medical_boundary,/does not establish treatment benefits/i);
  assert.ok(Array.isArray(t.sources)&&t.sources.length>=5);
  assert.ok(Array.isArray(t.regions)&&t.regions.length>=6);
  const sourceIDs=new Set(),regionIDs=new Set(),claimIDs=new Set(parent.claims.map(x=>x.id));
  for(const s of t.sources){
    assert.ok(s.id&&!sourceIDs.has(s.id)&&/^https:\/\//.test(s.url)&&s.title&&s.kind,'Invalid/duplicate source');
    sourceIDs.add(s.id);
  }
  let entries=0;
  for(const r of t.regions){
    assert.match(r.id,/^TISSUE-REG-\d{3}$/);
    assert.ok(!regionIDs.has(r.id)&&r.label&&r.system&&r.intro,'Duplicate/empty region');
    assert.ok(Number.isFinite(r.marker?.x)&&Number.isFinite(r.marker?.y)&&r.marker.x>=5&&r.marker.x<=95&&r.marker.y>=3&&r.marker.y<=97,'Invalid schematic marker');
    regionIDs.add(r.id);
    assert.ok(Array.isArray(r.receptors)&&r.receptors.length>0,'Region needs receptor evidence');
    const types=new Set();
    for(const e of r.receptors){
      assert.ok(allowedReceptors.has(e.receptor)&&!types.has(e.receptor),'Missing/duplicate receptor');
      types.add(e.receptor);entries++;
      assert.ok(allowedModels.has(e.evidence_context),'Evidence model must be explicit');
      for(const k of ['summary','cell_context','model','boundary'])assert.ok(typeof e[k]==='string'&&e[k].length>=35,'Incomplete tissue evidence '+k);
      assert.ok(Array.isArray(e.pathway)&&e.pathway.length>=2&&e.pathway.every(step=>typeof step==='string'&&step.length>=18),'Missing mechanism steps');
      assert.ok(Array.isArray(e.source_ids)&&e.source_ids.length&&e.source_ids.every(id=>sourceIDs.has(id)),'Missing source receipt');
      assert.ok(Array.isArray(e.related_claim_ids)&&e.related_claim_ids.length&&e.related_claim_ids.every(id=>claimIDs.has(id)),'Orphan upstream ECS claim');
      assert.match(e.boundary,/not|does not|cannot|no |don't|do not/i,'No evidence limit');
      if(e.receptor==='CB1')assert.ok(e.related_claim_ids.some(id=>['ECS-CLM-002','ECS-CLM-003','ECS-CLM-008'].includes(id)),'CB1 requires corresponding upstream claim');
      if(e.receptor==='CB2')assert.ok(e.related_claim_ids.includes('ECS-CLM-004'),'CB2 requires neuroimmune/immune anchor');
    }
  }
  assert.ok(entries>=9,'Coverage insufficient');
  return {regions:regionIDs.size,records:entries,sources:sourceIDs.size};
}
const result=verify(tissue,main);
assert.throws(()=>verify({...tissue,regions:[...tissue.regions,{...tissue.regions[0],id:'TISSUE-REG-999',marker:{x:110,y:3}}]},main));
assert.throws(()=>verify({...tissue,regions:[{...tissue.regions[0],receptors:[{...tissue.regions[0].receptors[0],source_ids:['TISSUE-SRC-FAKE']}]},...tissue.regions.slice(1)]},main));
assert.throws(()=>verify({...tissue,regions:[{...tissue.regions[0],receptors:[{...tissue.regions[0].receptors[0],related_claim_ids:['ECS-CLM-999']}]},...tissue.regions.slice(1)]},main));
console.log('PASS ECS human-body tissue map: '+result.regions+' regions · '+result.records+' receptor contexts · '+result.sources+' sources; fail-closed receipts');
