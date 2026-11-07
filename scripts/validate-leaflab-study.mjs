import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {measureTips} from "../app/leaflab/core.mjs";
import {makeStudyObservation,parseStudyObservation,studyRecords,studyJSON,
  importStudyCollection,evaluateHeldout,countPatternAudit,demoObservations,
  STUDY_VERSION,STUDY_SEED} from "../app/leaflab/study.mjs";

const synthetic=demoObservations();
assert.equal(STUDY_VERSION,"0.4");
assert.ok(STUDY_SEED.includes("fixed-split"));
assert.equal(synthetic.length,36);
assert.equal(synthetic.filter(x=>x.group==="cannabis").length,18);
assert.ok(synthetic.every(x=>x.origin==="synthetic-demo"));
assert.deepEqual(synthetic,demoObservations(),"Synthetic fixture must be deterministic");
const bundle=studyJSON(synthetic);
assert.equal(bundle.kind,"leaflab-study-collection");
assert.equal(bundle.evidenceLevel,"SYNTHETIC_DEMONSTRATION");
assert.deepEqual(importStudyCollection(bundle),synthetic);
const original=synthetic[0],tampered={
  ...original,annotation:{...original.annotation,
    tips:original.annotation.tips.map(t=>({...t,relativeLength:123456,angleDegrees:9999}))}
};
const reparsed=parseStudyObservation(tampered);
assert.ok(reparsed.annotation.tips.every(t=>t.relativeLength<=1));
assert.ok(reparsed.annotation.tips.some(t=>t.angleDegrees!==9999));
assert.throws(()=>parseStudyObservation({...original,version:"1.0"}),/v0.4/);
assert.throws(()=>makeStudyObservation(original.annotation,{specimenId:"bad=FORMULA",
  plantId:"ABC",group:"cannabis",species:"Cannabis sativa"}),/Specimen ID/);
assert.throws(()=>makeStudyObservation(original.annotation,{specimenId:"A",
  plantId:"ABC",group:"control",species:"<script>"}),/taxon label/);
assert.throws(()=>makeStudyObservation(original.annotation,{specimenId:"A",
  plantId:"ABC",group:"something",species:"Cannabis sativa"}),/Group/);
assert.throws(()=>makeStudyObservation({...original.annotation,
  hub:[-10,50]},original),/photo annotation/);
assert.throws(()=>makeStudyObservation({...original.annotation,
  tips:original.annotation.tips.slice(0,6)},original),/complete 3\/5\/7\/9\/11/);
assert.throws(()=>studyRecords([original,original]),/Duplicate specimen/);
assert.throws(()=>studyRecords([...synthetic,{
  ...synthetic.find(x=>x.group==="control"),
  specimenId:"NEW",plantId:synthetic.find(x=>x.group==="cannabis").plantId
}]),/cannabis and control/);
const fakeManual={...original,origin:"manual",specimenId:"manual-0",plantId:"other-0"};
assert.throws(()=>studyRecords([original,fakeManual]),/cannot be mixed/);
assert.throws(()=>importStudyCollection({kind:"other",version:"0.4",observations:[]}),/study collection/);
assert.throws(()=>studyRecords([]),/between 1 and 200/);

// Whole plants are the split unit, not leaves or photos. No holdout leaf may leak.
const report=evaluateHeldout(synthetic,{count:7,group:"cannabis"});
const repeat=evaluateHeldout([...synthetic].reverse(),{count:7,group:"cannabis"});
assert.deepEqual(report,repeat,"Evaluation must be repeatable and input-order independent");
assert.equal(report.kind,"leaflab-heldout-comparison");
assert.equal(report.evidenceLevel,"SYNTHETIC_DEMONSTRATION");
assert.equal(report.design.count,7);
assert.equal(report.design.trainingPlantCount+report.design.heldoutPlantCount,10);
assert.ok(report.design.trainingPlantCount>=5&&report.design.heldoutPlantCount>=2);
assert.equal(new Set([...report.design.trainingPlantIds,...report.design.heldoutPlantIds]).size,10);
assert.ok(report.models.length===4);
for(const m of report.models){
  assert.equal(m.predictedRelativeLengths.length,7);
  assert.equal(m.heldoutPlantScores.length,report.design.heldoutPlantCount);
  assert.ok(Number.isFinite(m.heldoutPlantRMSE));
}
assert.ok(report.goldenMinusLinearRMSE.exploratoryPlantBootstrap95.low<=
          report.goldenMinusLinearRMSE.exploratoryPlantBootstrap95.high);
assert.throws(()=>evaluateHeldout(synthetic,{count:3}),/at least eight distinct plant IDs/);
assert.throws(()=>evaluateHeldout(synthetic,{count:6}),/Unsupported study leaflet count/);
assert.throws(()=>evaluateHeldout(synthetic,{count:7,group:"unknown"}),/Unknown study group/);

function purePlants(shape){
  const n=7,m=(n-1)/2,origin="synthetic-demo";
  const phi=(1+Math.sqrt(5))/2;
  const out=[];
  for(let p=0;p<12;p++){
    const hub=[425,300];
    const curve=Array.from({length:n},(_,j)=>{
      const k=Math.abs((j-m)/m);
      return shape==="golden"?phi**(-k):1-.6*k;
    });
    const tips=curve.map((v,j)=>{
      const k=(j-m)/m;
      const a=(170+p*3+k*140/2)*Math.PI/180,r=175*v;
      return [hub[0]+Math.sin(a)*r,hub[1]-Math.cos(a)*r];
    });
    out.push(makeStudyObservation(measureTips(hub,tips),{
      specimenId:shape+"_S_"+p,plantId:shape+"_P_"+p,
      group:"cannabis",species:"Synthetic test leaf",origin
    }));
  }
  return out;
}
const gold=evaluateHeldout(purePlants("golden"),{count:7});
const linear=evaluateHeldout(purePlants("linear"),{count:7});
assert.ok(gold.goldenMinusLinearRMSE.meanDifference<0,
  "A fixed golden-ratio synthetic sample should favor the golden candidate");
assert.ok(linear.goldenMinusLinearRMSE.meanDifference>0,
  "A linear-falloff synthetic sample should contradict the golden candidate");
const nearZero=m=>m.models.find(x=>x.name===m).heldoutPlantRMSE;
assert.ok(nearZero.bind(null,"golden-fixed"),"Model exists");
assert.ok(gold.models.find(x=>x.name==="golden-fixed").heldoutPlantRMSE<1e-6);
assert.ok(linear.models.find(x=>x.name==="linear-falloff").heldoutPlantRMSE<1e-6);

// The '3-6-9' question is deliberately restricted to 3/9 among supported odd tip counts.
// Control comparison is plant-level, and samples with mixed counts are excluded.
const summary=countPatternAudit(synthetic);
assert.equal(summary.kind,"leaflab-count-pattern-audit");
assert.equal(summary.cannabis.plantCount,18);
assert.equal(summary.control.plantCount,18);
assert.equal(summary.cannabis.threeOrNinePlantCount,4);
assert.equal(summary.control.threeOrNinePlantCount,4);
assert.ok(summary.reference.conditionalLabelPermutationTwoSidedP>=0);
assert.ok(summary.reference.conditionalLabelPermutationTwoSidedP<=1);
const mixedPlant={...synthetic.find(x=>x.annotation.tips.length===9),
  specimenId:"mixed_repeat",plantId:synthetic.find(x=>x.annotation.tips.length===7).plantId,
  group:"cannabis",species:"Synthetic Cannabis candidate"};
const mixed=countPatternAudit([...synthetic,mixedPlant]);
assert.equal(mixed.excludedAmbiguousPlantIds.length,1);
assert.equal(mixed.cannabis.plantCount,17);
const absentControls=countPatternAudit(synthetic.filter(x=>x.group==="cannabis"));
assert.equal(absentControls.reference,null);

const html=readFileSync(new URL("../app/leaflab/research.html",import.meta.url),"utf8");
const script=readFileSync(new URL("../app/leaflab/research-ui.mjs",import.meta.url),"utf8");
const landing=readFileSync(new URL("../app/leaflab/index.html",import.meta.url),"utf8");
for(const name of ["annotationFile","addObservation","importCollection","loadDemo",
  "runHeldout","runCountAudit","exportHeldout","exportCountAudit","modelRows",
  "analysisCount","analysisGroup"])assert.ok(html.includes('id="'+name+'"'),"UI missing "+name);
assert.match(landing,/research\.html/);
assert.match(html,/SYNTHETIC|synthetic/);
assert.match(script,/evaluateHeldout/);
assert.match(script,/countPatternAudit/);
assert.ok(!/fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(script),
  "No study data must leave the browser");
console.log("PASS LeafLab v0.4: leakage-free plant splits, deterministic candidate wins/losses, control audit, uncertainty, strict JSON and local-only UI");
