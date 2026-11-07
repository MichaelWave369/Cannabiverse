import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {makeVeinReference,evaluateVeinBenchmark} from "../app/leaflab/vein-benchmark.mjs";
import {EVIDENCE_GATEWAY_VERSION,syntheticEvidenceDemo,auditObserverAgreement,
  makeExplicitPlantSplit,summarizePlantHoldout} from "../app/leaflab/evidence-gateway.mjs";

assert.equal(EVIDENCE_GATEWAY_VERSION,"1.2");
const refs=syntheticEvidenceDemo();
assert.equal(refs.length,4);
assert.ok(refs.every(x=>x.origin==="synthetic-demo"));
const audit=auditObserverAgreement(refs,{tolerance:1});
assert.equal(audit.kind,"leaflab-observer-agreement-audit");
assert.equal(audit.version,"1.2");
assert.equal(audit.evidenceStatus,"SYNTHETIC_FIXTURE_ONLY");
assert.equal(audit.referenceCount,4);
assert.equal(audit.imageCount,2);
assert.equal(audit.assertedPlantCount,2);
assert.equal(audit.pairedImageCount,2);
assert.equal(audit.unpairedImageCount,0);
assert.ok(audit.images.every(x=>x.pairCount===1&&
  x.meanPairAgreementF1===1&&x.observerCount===2));
assert.deepEqual(audit,auditObserverAgreement([...refs].reverse(),{tolerance:1}),
  "File order must not change the audit");
const auditExact=auditObserverAgreement(refs,{tolerance:0});
assert.ok(auditExact.images.every(x=>x.meanPairAgreementF1===0),
  "One-pixel shifted lines must not match at exact-pixel tolerance");
assert.ok(auditObserverAgreement(refs,{tolerance:2}).images.every(
  x=>x.meanPairAgreementF1===1));
assert.throws(()=>auditObserverAgreement(refs,{tolerance:4}),/0–3/);
assert.throws(()=>auditObserverAgreement([]),/1–36/);
assert.throws(()=>auditObserverAgreement([...refs,...refs]),/Duplicate observer/);
assert.throws(()=>auditObserverAgreement([refs[0],{...refs[1],plantId:"OTHER"}]),
  /conflicting plant/);
assert.throws(()=>auditObserverAgreement([refs[0],{...refs[1],
  imageSHA256:"c".repeat(64)}]),/Specimen ID reused/);
assert.throws(()=>auditObserverAgreement([refs[0],{...refs[1],
  origin:"manual"}]),/Cannot combine synthetic and manual/);
assert.throws(()=>auditObserverAgreement([refs[0],{...refs[1],width:81}]),
  /conflicting plant/);
assert.throws(()=>auditObserverAgreement([
  refs[0],refs[1],
  {...refs[1],annotatorCode:"MOCK_C"},
  {...refs[1],annotatorCode:"MOCK_D"}
]),/At most 3 masked observers/);
const unpaired=auditObserverAgreement([refs[0],refs[2]]);
assert.equal(unpaired.pairedImageCount,0);
assert.equal(unpaired.unpairedImageCount,2);
assert.ok(unpaired.images.every(x=>x.meanPairAgreementF1===null&&
  x.reviewStatus==="INDEPENDENT_REVIEW_MISSING"));
assert.equal(unpaired.plantSummaries[0].meanImageAgreementF1,null);
const split=makeExplicitPlantSplit(audit,["DEMO_PLANT_A"],["DEMO_PLANT_B"]);
assert.equal(split.kind,"leaflab-explicit-plant-partition");
assert.equal(split.status,"SELF_DECLARED_PLANT_SPLIT_NOT_CRYPTOGRAPHICALLY_FROZEN");
assert.equal(split.developmentImages,1);
assert.equal(split.holdoutImages,1);
assert.equal(split.images.length,2);
assert.ok(split.images.every(x=>["development","holdout"].includes(x.assignedRole)));
assert.throws(()=>makeExplicitPlantSplit(audit,["DEMO_PLANT_A"],["DEMO_PLANT_A"]),
  /plant ID leakage/);
assert.throws(()=>makeExplicitPlantSplit(audit,[],["DEMO_PLANT_B"]),/nonempty unique/);
assert.throws(()=>makeExplicitPlantSplit(audit,["DEMO_PLANT_A"],["UNKNOWN"]),/assigned exactly once/);
assert.throws(()=>makeExplicitPlantSplit(audit,["DEMO_PLANT_A","DEMO_PLANT_B"],["DEMO_PLANT_B"]),
  /plant ID leakage/);
const emptySummary=summarizePlantHoldout(audit,split);
assert.equal(emptySummary.conclusionStatus,"ANNOTATIONS_ONLY_NO_DETECTOR_REPORTS");
assert.equal(emptySummary.detectorReportCount,0);
assert.equal(emptySummary.pairedImageCount,2);
assert.ok(emptySummary.groups.every(x=>x.detectors.every(d=>
  d.meanOfPlantMeansF1===null&&d.contributingPlantCount===0)));
assert.throws(()=>summarizePlantHoldout(audit,{
  ...split,holdoutPlantIds:["DEMO_PLANT_A","DEMO_PLANT_B"]
}),/Partition does not match/);
assert.throws(()=>summarizePlantHoldout(audit,{
  ...split,images:[split.images[0],split.images[0]]
}),/Partition image mapping/);
assert.throws(()=>summarizePlantHoldout(audit,{
  ...split,images:split.images.map(x=>({...x,assignedRole:"development"}))
}),/Partition image mapping/);
assert.throws(()=>summarizePlantHoldout(audit,{
  ...split,holdoutImages:9
}),/Partition image mapping/);
assert.throws(()=>summarizePlantHoldout(audit,{
  ...split,status:"PREREGISTERED_PROVEN"
}),/Partition does not match/);

// The following images and references are completely synthetic software fixtures.
// The imported detector reports are recalculated from local synthetic pixels,
// not fabricated empirical data or real cannabis observations.
function pixelData(center){
  const width=80,height=72,d=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const leaf=x>=20&&x<60&&y>=14&&y<56;
    const centerLine=leaf&&x===center&&y>=16&&y<=54;
    const color=centerLine?[25,79,34]:leaf?[55,151,74]:[230,229,209];
    d.set([...color,255],4*(y*width+x));
  }
  return d;
}
const rawReports=refs.map(ref=>{
  const source=makeVeinReference(ref);
  const lineCenter=ref.plantId==="DEMO_PLANT_A"?36:40;
  return evaluateVeinBenchmark({
    width:80,height:72,data:pixelData(lineCenter),
    reference:source,imageSHA256:source.imageSHA256,
    foreground:[55,151,74],background:[230,229,209],
    seed:25+20*80,margin:.07,contrast:14,minPixels:6,tolerance:1
  }).report;
});
const withModels=summarizePlantHoldout(audit,split,rawReports);
assert.equal(withModels.conclusionStatus,"EXPLORATORY_USER_SUPPLIED_NUMERIC_REPORTS_NOT_RECOMPUTED");
assert.equal(withModels.detectorReportCount,4);
assert.equal(withModels.groups.length,2);
assert.deepEqual(withModels.groups.map(x=>x.role),["development","holdout"]);
assert.ok(withModels.groups.every(x=>x.plantCount===1&&x.detectorReports===2&&
  x.detectors.every(d=>d.contributingPlantCount===1&&
    d.meanOfPlantMeansF1!==null)));
assert.deepEqual(withModels,summarizePlantHoldout(audit,split,[...rawReports].reverse()));
assert.deepEqual(withModels.settings,{
  colorMargin:.07,ridgeContrast:14,minRidgeComponentPixels:6,tolerancePixels:1
});
const onlyDev=summarizePlantHoldout(audit,split,rawReports.slice(0,2));
assert.equal(onlyDev.groups[1].detectorReports,0);
assert.ok(onlyDev.groups[1].detectors.every(d=>d.meanOfPlantMeansF1===null&&
  d.contributingPlantCount===0&&d.totalAssignedPlants===1));
assert.throws(()=>summarizePlantHoldout(audit,split,[rawReports[0],rawReports[0]]),
  /Duplicate image\/observer/);
assert.throws(()=>summarizePlantHoldout(audit,split,[{
  ...rawReports[0],imageSHA256:"c".repeat(64)
}]),/not in annotation cohort/);
assert.throws(()=>summarizePlantHoldout(audit,split,[{
  ...rawReports[0],plantId:"OTHER"
}]),/plant\/specimen\/dimensions mismatch/);
assert.throws(()=>summarizePlantHoldout(audit,split,[{
  ...rawReports[0],observerCode:"OTHER"
}]),/observer missing/);
assert.throws(()=>summarizePlantHoldout(audit,split,[{
  ...rawReports[0],evidenceLevel:"USER_ASSERTED_HUMAN_REFERENCE_NOT_BOTANICAL_TRUTH"
}]),/origin mismatch/);
assert.throws(()=>summarizePlantHoldout(audit,split,[rawReports[0],{
  ...rawReports[1],parameters:{...rawReports[1].parameters,contrast:27}
}]),/parameter drift/);
assert.throws(()=>summarizePlantHoldout(audit,split,[{
  ...rawReports[0],parameters:{...rawReports[0].parameters,tolerancePixels:3}
}]),/matching tolerance differs/);
assert.throws(()=>summarizePlantHoldout(audit,split,[{
  ...rawReports[0],detectors:rawReports[0].detectors.map((d,i)=>
    i===0?{...d,f1:1.3}:d)
}]),/agreement metrics/);
assert.throws(()=>summarizePlantHoldout(audit,split,[{
  ...rawReports[0],parameters:null
}]),/lacks declared/);
const html=readFileSync(new URL("../app/leaflab/evidence.html",import.meta.url),"utf8");
const ui=readFileSync(new URL("../app/leaflab/evidence-ui.mjs",import.meta.url),"utf8");
const nav=readFileSync(new URL("../app/leaflab/index.html",import.meta.url),"utf8");
for(const id of ["refFiles","syntheticEvidence","clearEvidence","referenceStatus",
  "agreementTolerance","auditEvidence","exportAgreement","plantRoles",
  "buildSplit","exportSplit","modelReports","reportStatus","buildHoldout",
  "exportHoldout","observerRows","holdoutRows","splitStatus","holdoutNotes"])
  assert.ok(html.includes('id="'+id+'"'),"Missing v1.2 user-facing UI control "+id);
assert.match(html,/src="\.\/evidence-ui\.mjs"/);
assert.match(ui,/makeExplicitPlantSplit/);
assert.match(ui,/summarizePlantHoldout/);
assert.match(ui,/syntheticEvidenceDemo/);
assert.match(nav,/evidence\.html/);
assert.ok(!/fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(ui),
  "No private annotations or source hashes should be uploaded");
console.log("PASS LeafLab v1.2: same-photo two-observer matching, missing reviews, leakage blocking, source consistency, parameter drift, synthetic data segregation, and local-only UI");
