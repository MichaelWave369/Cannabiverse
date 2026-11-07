import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {measureTips} from "../app/leaflab/core.mjs";
import {makeReread,parseReread,rereadRecords,rereadJSON,importRereadJSON,
  auditRereads,demoRereads} from "../app/leaflab/reliability.mjs";
import {demoObservations,fitExternalSnapshot,validateExternalSnapshot,
  evaluateExternalSnapshot} from "../app/leaflab/study.mjs";

const source=demoRereads();
assert.equal(source.length,10);
assert.equal(new Set(source.map(r=>r.observerCode)).size,2);
assert.ok(source.every(r=>r.origin==="synthetic-demo"));
assert.deepEqual(source,demoRereads(),"synthetic reannotation dataset is deterministic");
assert.equal(rereadJSON(source).evidenceLevel,"SYNTHETIC_DEMONSTRATION");
assert.deepEqual(importRereadJSON(rereadJSON(source)),source);
const report=auditRereads(source);
assert.equal(report.kind,"leaflab-reannotation-reliability");
assert.equal(report.evidenceLevel,"SYNTHETIC_DEMONSTRATION");
assert.equal(report.specimenCount,5);
assert.equal(report.distinctPlantIds,5);
assert.ok(report.exploratoryPlantResamplingInterval);
assert.ok(report.specimens.every(r=>r.pairCount===1&&r.mismatchedTipCountPairs===0));
assert.ok(report.specimens.some(r=>r.meanRelativeLengthMAE>0));
assert.ok(report.specimens.some(r=>r.meanAngleGapMAEDegrees>0));
assert.deepEqual(report,auditRereads([...source].reverse()),"report does not depend on input order");
const fake={...source[0],annotation:{...source[0].annotation,tips:source[0].annotation.tips.map(t=>({...t,angleDegrees:900,relativeLength:999}))}};
const scrubbed=parseReread(fake);
assert.ok(scrubbed.annotation.tips.every(t=>t.relativeLength<=1&&t.angleDegrees!==900));
assert.throws(()=>rereadRecords([source[0],source[0]]),/Duplicate observer/);
assert.throws(()=>rereadRecords([source[0],{...source[1],imageId:"DIFFERENT"}]),/mismatched plant or source image/);
assert.throws(()=>rereadRecords([source[0],{...source[1],plantId:"DIFFERENT"}]),/mismatched plant or source image/);
assert.throws(()=>rereadRecords([source[0],{...source[1],origin:"manual"}]),/cannot mix/);
assert.throws(()=>parseReread({...source[0],version:"0.6"}),/v0.5/);
assert.throws(()=>makeReread(source[0].annotation,{...source[0],observerCode:"=1+1"}),/Observer code/);
assert.throws(()=>auditRereads([source[0]]),/two different observers/);
const conflictingCount=makeReread(measureTips(source[1].annotation.hub,
  source[1].annotation.tips.slice(0,6).map(t=>[t.x,t.y])),source[1]);
const mismatched=auditRereads([source[0],conflictingCount]);
assert.equal(mismatched.specimens[0].mismatchedTipCountPairs,1);
assert.equal(mismatched.specimens[0].meanRelativeLengthMAE,null);
assert.equal(mismatched.specimens[0].meanAngleGapMAEDegrees,null);
assert.equal(mismatched.exploratoryPlantResamplingInterval,null);
assert.throws(()=>makeReread(measureTips([0,0],[[0,1],[0,2],[0,3]]),source[0]),/Duplicate tip directions|span/);
assert.throws(()=>importRereadJSON({kind:"not-a-collection",version:"0.5",records:[]}),/re-annotation collection/);

const candidates=demoObservations().filter(x=>x.group==="cannabis"&&x.annotation.tips.length===7)
  .sort((a,b)=>a.plantId.localeCompare(b.plantId));
assert.equal(candidates.length,10);
const training=candidates.slice(0,6),external=candidates.slice(6);
const snapshot=fitExternalSnapshot(training,{count:7,group:"cannabis"});
assert.equal(snapshot.kind,"leaflab-fixed-model-snapshot");
assert.equal(snapshot.trainingPlantCount,6);
assert.equal(snapshot.trainingSpecimenCount,6);
assert.equal(snapshot.models.length,4);
assert.equal(validateExternalSnapshot(snapshot),snapshot);
const externalReport=evaluateExternalSnapshot(snapshot,external);
assert.equal(externalReport.kind,"leaflab-external-model-audit");
assert.equal(externalReport.evidenceLevel,"SYNTHETIC_DEMONSTRATION");
assert.equal(externalReport.design.externalPlantCount,4);
assert.equal(externalReport.design.externalSpecimenCount,4);
assert.ok(externalReport.models.every(r=>Number.isFinite(r.externalMeanPlantLengthRMSE)));
assert.deepEqual(externalReport,evaluateExternalSnapshot(snapshot,[...external].reverse()),
  "external report must be input-order independent");
const trainedSet=new Set(snapshot.trainingPlantIds);
assert.ok(externalReport.design.externalPlantIds.every(id=>!trainedSet.has(id)));
assert.deepEqual(snapshot,fitExternalSnapshot([...training].reverse(),{count:7,group:"cannabis"}),
  "training order cannot change frozen predictions");
assert.throws(()=>fitExternalSnapshot(training.slice(0,4),{count:7,group:"cannabis"}),/at least 5/);
assert.throws(()=>fitExternalSnapshot([...training,...demoObservations().filter(x=>x.group==="control").slice(0,1)],
  {count:7,group:"cannabis"}),/same complete leaflet count/);
assert.throws(()=>evaluateExternalSnapshot(snapshot,[...external,training[0]]),/overlapping Plant ID/);
assert.throws(()=>evaluateExternalSnapshot(snapshot,external.slice(0,2)),/at least 3/);
assert.throws(()=>evaluateExternalSnapshot(snapshot,external.map(x=>({...x,origin:"manual"}))),/origin differs/);
assert.throws(()=>evaluateExternalSnapshot(snapshot,external.map(x=>({...x,group:"control"}))),/only selected group/);
assert.throws(()=>evaluateExternalSnapshot(snapshot,external.map(x=>({...x,
  specimenId:training[0].specimenId}))),/Specimen ID/);
const corrupt={...snapshot,models:snapshot.models.map((m,i)=>i===3?
  {...m,expectedRelativeLengths:m.expectedRelativeLengths.map((v,j)=>j===0?v+.2:v)}:m)};
assert.throws(()=>validateExternalSnapshot(corrupt),/predicted values/);
assert.throws(()=>validateExternalSnapshot({...snapshot,trainingPlantIds:[snapshot.trainingPlantIds[0],
  ...snapshot.trainingPlantIds.slice(1).map(()=>snapshot.trainingPlantIds[0])]}),/training Plant IDs/);
assert.throws(()=>validateExternalSnapshot({...snapshot,models:[...snapshot.models.slice(0,1),
  {...snapshot.models[1],falloff:.9},...snapshot.models.slice(2)]}),/invalid candidate parameters/);

// Perturb external observations while preserving count and plant IDs.
// The fixed snapshot must remain unchanged; resulting errors may change.
const changed=external.map((row,i)=>{
  const ann=row.annotation,hub=ann.hub;
  const tips=ann.tips.map((tip,j)=>{
    const ratio=j%2===0?.88:1.06;
    return [hub[0]+(tip.x-hub[0])*ratio,hub[1]+(tip.y-hub[1])*ratio];
  });
  return {...row,annotation:measureTips(hub,tips,{filename:"PERTURBED_SYNTHETIC.png"})};
});
const altered=evaluateExternalSnapshot(snapshot,changed);
assert.notDeepEqual(altered.models[0].externalMeanPlantLengthRMSE,
  externalReport.models[0].externalMeanPlantLengthRMSE,
  "External observation changes must alter scores");
assert.deepEqual(snapshot,fitExternalSnapshot(training,{count:7,group:"cannabis"}),
  "No external evaluation may refit training snapshot");

const html=readFileSync(new URL("../app/leaflab/quality.html",import.meta.url),"utf8");
const js=readFileSync(new URL("../app/leaflab/quality-ui.mjs",import.meta.url),"utf8");
for(const i of ["rereadFile","rereadSpecimen","rereadImage","observerCode",
  "addReread","runReliability","saveReliability","trainingFile",
  "snapshotFile","externalFile","trainSnapshot","runExternal","demoExternal"])
  assert.match(html,new RegExp('id="'+i+'"'),"Missing UI "+i);
assert.match(js,/auditRereads/);
assert.match(js,/evaluateExternalSnapshot/);
assert.ok(!/fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(js),
  "Neither photo annotations nor study data may be transmitted by quality UI");
console.log("PASS LeafLab v0.5: independent observer reliability, count disagreement, fixed snapshot, external leakage rejection, tamper checks and local UI");
