import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const data=read('data/ecs-network/journeys-v1.json');
const upstream=read('data/ecs-network/evidence-v1.json');
const phases=new Set(['trigger','synthesis','context','signaling','response','termination','boundary']);
const lanes=new Set(['preclinical_physiology','mechanistic_physiology']);

function verify(feed,parent){
  assert.equal(feed.contract_version,'1.0.0');
  assert.equal(feed.dataset_id,'cannabiverse-ecs-signal-journeys');
  assert.equal(feed.parent_dataset_id,parent.dataset_id);
  assert.match(feed.medical_boundary,/do not establish human therapeutic benefit/i);
  assert.match(feed.representation,/no pharmacokinetic or physiologic simulation/i);
  assert.ok(Array.isArray(feed.journeys)&&feed.journeys.length>=3);
  assert.ok(Array.isArray(feed.sources)&&feed.sources.length>=3);
  const sources=new Set(),entityIds=new Set(parent.entities.map(x=>x.id)),claims=new Map(parent.claims.map(x=>[x.id,x])),journeys=new Set(),steps=new Set();
  for(const s of feed.sources){
    assert.ok(s.id&&!sources.has(s.id)&&s.title&&s.kind&&/^https:\/\/[^/]+/.test(s.url),'Missing/duplicate source');
    sources.add(s.id);
  }
  let stepCount=0;
  for(const j of feed.journeys){
    assert.match(j.id,/^ECS-JOUR-\d{3}$/);
    assert.ok(!journeys.has(j.id)&&j.name&&j.summary&&j.subtitle&&j.model&&j.boundary&&lanes.has(j.lane),'Invalid journey header');
    assert.ok(Array.isArray(j.steps)&&j.steps.length>=3&&j.steps.length<=8,'Invalid journey length');
    assert.match(j.boundary,/not|does not|cannot|no /i,'Journey clinical boundary absent');
    journeys.add(j.id);
    for(const s of j.steps){
      assert.match(s.id,/^ECS-STEP-\d{3}$/);
      assert.ok(!steps.has(s.id)&&phases.has(s.phase)&&s.title&&s.description&&s.context_note,'Invalid step');
      steps.add(s.id);stepCount++;
      assert.ok(Array.isArray(s.entity_ids)&&s.entity_ids.length&&s.entity_ids.every(x=>entityIds.has(x)),'Orphan entity ID');
      assert.ok(Array.isArray(s.related_claim_ids)&&s.related_claim_ids.length&&s.related_claim_ids.every(x=>claims.has(x)),'Unreceipted claim');
      assert.ok(s.entity_ids.every(id=>s.related_claim_ids.some(cid=>claims.get(cid).related_entities.includes(id))),'Step entity has no upstream receipt');
      assert.ok(Array.isArray(s.source_ids)&&s.source_ids.length&&s.source_ids.every(x=>sources.has(x)),'Unreferenced source');
      assert.ok(s.context_note.length>=30,'Evidence context missing');
    }
    assert.equal(j.steps.at(-1).phase==='termination'||j.steps.at(-1).phase==='boundary',true,'Last step requires an explicit endpoint or boundary');
  }
  assert.ok(stepCount>=12);
  return {journeys:journeys.size,steps:stepCount,sources:sources.size};
}
const result=verify(data,upstream);
assert.throws(()=>verify({...data,sources:[...data.sources,data.sources[0]]},upstream));
assert.throws(()=>verify({...data,journeys:[{...data.journeys[0],steps:[{...data.journeys[0].steps[0],source_ids:['MISSING']},...data.journeys[0].steps.slice(1)]},...data.journeys.slice(1)]},upstream));
assert.throws(()=>verify({...data,journeys:[{...data.journeys[0],steps:[{...data.journeys[0].steps[0],entity_ids:['ECS-ENT-999']},...data.journeys[0].steps.slice(1)]},...data.journeys.slice(1)]},upstream));
assert.throws(()=>verify({...data,journeys:[{...data.journeys[0],steps:[{...data.journeys[0].steps[0],related_claim_ids:['ECS-CLM-999']},...data.journeys[0].steps.slice(1)]},...data.journeys.slice(1)]},upstream));
console.log('PASS ECS Signal Journey Lab: '+result.journeys+' journeys · '+result.steps+' source-receipted steps · '+result.sources+' research sources');
