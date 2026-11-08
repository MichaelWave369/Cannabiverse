import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {REAL_LEAF_SOURCES} from "../app/leaflab/real-photo-catalog.mjs";
import {identifyPhotoByOriginalHash} from "../app/leaflab/real-image-qa.mjs";
import {
  FULL_MASK_VERSION,MASK_TARGETS,MASK_ROLES,createCompleteMaskReference,
  parseCompleteMaskReference,rasterizeCompletePolygons,compareCompleteReferences,
  benchmarkCompleteReferencePair,auditCompleteReferenceCohort
} from "../app/leaflab/full-mask-v16.mjs";

assert.equal(FULL_MASK_VERSION,"1.6");
assert.deepEqual(MASK_TARGETS,["single-prominent-leaf","all-visible-leaves"]);
assert.deepEqual(MASK_ROLES,["development","user-declared-holdout"]);
const real=REAL_LEAF_SOURCES.find(x=>x.id==="commons-leaf-earth-pd");
assert.ok(real.independentlyFetchedSHA256);
const source=identifyPhotoByOriginalHash(real.independentlyFetchedSHA256,
  real.originalBytes,real.width,real.height);
assert.equal(source.status,"KNOWN_WIKIMEDIA_ORIGINAL_SHA256_MATCH");
const square=(x1,y1,x2,y2,operation="include")=>({
  operation,vertices:[[x1,y1],[x2,y1],[x2,y2],[x1,y2]]
});
const w=80,h=72,n=w*h,maskA=[square(14,12,53,56)],
  maskB=[square(16,12,53,56)],maskUnion=[square(10,12,35,50),
    square(40,12,60,50)],hole=[square(10,10,50,50),
    square(20,20,30,30,"exclude")];
function pack(observerCode,polygons=maskA,extras={}){
  return createCompleteMaskReference({
    source,processingFrame:{width:w,height:h},
    plantId:"Plant_A",specimenId:"Photo_A",
    observerCode,targetDefinition:"single-prominent-leaf",
    reviewRole:"development",independence:"observer-self-attested-independent",
    completed:true,polygons,...extras
  });
}
const a=pack("Observer_A"),b=pack("Observer_B",maskB);
const base=rasterizeCompletePolygons(maskA,w,h);
assert.equal(base.length,n);
assert.equal(base.reduce((s,v)=>s+v,0),39*44);
assert.ok(base.every(v=>v===0||v===1));
assert.equal(a.maskSummary.leafPixels,1716);
assert.equal(a.maskSummary.nonLeafPixels,n-1716);
assert.equal(a.maskSummary.fullFrameLabelsAssigned,true);
assert.deepEqual(parseCompleteMaskReference(a),a);
assert.deepEqual(parseCompleteMaskReference(b),b);
const cut=rasterizeCompletePolygons(hole,w,h);
assert.equal(cut.reduce((s,v)=>s+v,0),1500);
const separate=rasterizeCompletePolygons(maskUnion,w,h);
assert.equal(separate.reduce((s,v)=>s+v,0),25*38+20*38);
assert.throws(()=>rasterizeCompletePolygons([],w,h),/Provide 1–48/);
assert.throws(()=>rasterizeCompletePolygons([square(1,1,8,8,"exclude")],
  w,h),/Cannot exclude before/);
assert.throws(()=>rasterizeCompletePolygons([{operation:"include",
  vertices:[[10,10],[20,20],[10,20],[20,10]]}],w,h),
  /meaningful area|Self-intersecting/);
assert.throws(()=>rasterizeCompletePolygons([{operation:"include",
  vertices:[[10,10],[30,10],[30,25],[10,25],[15,10]]}],w,h),
  /Self-intersecting/);
assert.throws(()=>rasterizeCompletePolygons([square(0,0,w+1,h)],
  w,h),/in-frame/);
assert.throws(()=>rasterizeCompletePolygons([square(0,0,w,h)],
  w,h),/both leaf and non-leaf/);
assert.throws(()=>rasterizeCompletePolygons([square(1,1,5,5)],
  16,401),/frame/);
assert.throws(()=>rasterizeCompletePolygons(
  Array.from({length:49},()=>square(10,10,20,20)),w,h),/1–48/);
assert.throws(()=>pack("Observer_A",[],{}),/1–48/);
assert.throws(()=>createCompleteMaskReference({
  ...a,completed:false
}),/must affirm/);
assert.throws(()=>pack("Observer_A",maskA,{observerCode:"Not okay!"}),
  /Observer code/);
assert.throws(()=>pack("Observer_A",maskA,{targetDefinition:"plant-anatomy-verified"}),
  /Declare whether target/);
assert.throws(()=>pack("Observer_A",maskA,{reviewRole:"preregistered-holdout"}),
  /Declare development/);
assert.throws(()=>pack("Observer_A",maskA,{independence:"verified-blinded"}),
  /independence declaration/);
assert.throws(()=>parseCompleteMaskReference({...a,maskSummary:{
  ...a.maskSummary,leafPixels:1
}}),/does not match polygon rasterization/);
assert.throws(()=>parseCompleteMaskReference({...a,
  evidenceStatus:"CERTIFIED_BOTANICAL_TRUTH"}),/cannot be reclassified/);
assert.throws(()=>parseCompleteMaskReference({...a,version:"2.0"}),/v1.6/);

const pair=compareCompleteReferences(a,b);
assert.equal(pair.kind,"leaflab-complete-mask-pair-review");
assert.equal(pair.metrics.bothLeaf,37*44);
assert.equal(pair.metrics.onlyObserverA,2*44);
assert.equal(pair.metrics.onlyObserverB,0);
assert.equal(pair.metrics.bothNonLeaf,n-39*44);
assert.equal(pair.metrics.disagreementPixels,2*44);
assert.equal(pair.metrics.intersectionOverUnion,Number((37/39).toFixed(6)));
assert.equal(pair.metrics.dice,Number((74/76).toFixed(6)));
assert.equal(pair.disagreement.length,n);
assert.equal(pair.disagreement.filter(x=>x===2).length,88);
assert.equal(pair.disagreement.filter(x=>x===3).length,0);
assert.equal(pair.independentObserversSelfAttested,true);
assert.equal(compareCompleteReferences(a,b).metrics.intersectionOverUnion,
  compareCompleteReferences(b,a).metrics.intersectionOverUnion);
assert.throws(()=>compareCompleteReferences(a,a),/distinct observer codes/);
assert.throws(()=>compareCompleteReferences(a,pack("Observer_B",maskB,{
  specimenId:"Different_Specimen"
})),/same original image/);
assert.throws(()=>compareCompleteReferences(a,pack("Observer_B",maskB,{
  targetDefinition:"all-visible-leaves"
})),/same original image/);
assert.throws(()=>compareCompleteReferences(a,pack("Observer_B",maskB,{
  reviewRole:"user-declared-holdout"
})),/same original image/);
const otherSource={...source,originalSHA256:"c".repeat(64)};
assert.throws(()=>compareCompleteReferences(a,pack("Observer_B",maskB,{
  source:otherSource
})),/same original image/);

const result=benchmarkCompleteReferencePair(base,a,b);
assert.equal(result.kind,"leaflab-dual-human-reference-benchmark");
assert.equal(result.perObserver.length,2);
assert.equal(result.perObserver[0].intersectionOverUnion,1);
assert.equal(result.perObserver[1].intersectionOverUnion,
  pair.metrics.intersectionOverUnion);
assert.equal(result.perObserver[0].falsePositive,0);
assert.equal(result.perObserver[1].falsePositive,88);
assert.equal(result.perObserver[1].falseNegative,0);
assert.deepEqual(result.observedReferenceRange.intersectionOverUnion,[
  pair.metrics.intersectionOverUnion,1]);
assert.throws(()=>benchmarkCompleteReferencePair(new Uint8Array(2),a,b),
  /matching-frame binary/);
assert.throws(()=>benchmarkCompleteReferencePair(
  new Uint8Array(n).fill(2),a,b),/matching-frame binary/);
assert.ok(result.limitations.some(x=>x.includes("not verified botanical truth")));

const solo=auditCompleteReferenceCohort([a]);
assert.equal(solo.incompleteImageCount,1);
assert.equal(solo.pairedImageCount,0);
assert.equal(solo.images[0].meanObserverIoU,null);
const cohort=auditCompleteReferenceCohort([b,a]);
assert.equal(cohort.kind,"leaflab-complete-reference-cohort-audit");
assert.equal(cohort.imageCount,1);
assert.equal(cohort.plantCount,1);
assert.equal(cohort.developmentPlantCount,1);
assert.equal(cohort.declaredHoldoutPlantCount,0);
assert.equal(cohort.pairedImageCount,1);
assert.equal(cohort.incompleteImageCount,0);
assert.equal(cohort.images[0].pairCount,1);
assert.equal(cohort.images[0].meanObserverIoU,pair.metrics.intersectionOverUnion);
assert.deepEqual(cohort,auditCompleteReferenceCohort([a,b]));
const third=pack("Observer_C",maskA);
assert.equal(auditCompleteReferenceCohort([a,b,third]).images[0].pairCount,3);
assert.throws(()=>auditCompleteReferenceCohort([a,a]),/Duplicate observer/);
assert.throws(()=>auditCompleteReferenceCohort([a,b,third,
  pack("Observer_D")]),/Maximum three observers/);
assert.throws(()=>auditCompleteReferenceCohort([a,pack("Observer_B",maskB,{
  reviewRole:"user-declared-holdout"
})]),/Plant-level development\/holdout leakage/);
assert.throws(()=>auditCompleteReferenceCohort([a,pack("Observer_B",maskB,{
  specimenId:"Different_Specimen"
})]),/same original image/);
const otherPlant=pack("Observer_X",maskA,{
  plantId:"Plant_B",specimenId:"Photo_B",source:otherSource,
  reviewRole:"user-declared-holdout"
});
const distinct=auditCompleteReferenceCohort([a,b,otherPlant]);
assert.equal(distinct.plantCount,2);
assert.equal(distinct.developmentPlantCount,1);
assert.equal(distinct.declaredHoldoutPlantCount,1);
assert.equal(distinct.incompleteImageCount,1);
assert.throws(()=>auditCompleteReferenceCohort([a,pack("Observer_X",
  maskA,{source:otherSource})]),/Specimen ID reused/);
assert.throws(()=>auditCompleteReferenceCohort([]),/1–72/);
assert.throws(()=>auditCompleteReferenceCohort(
  Array.from({length:73},()=>a)),/1–72/);

const html=readFileSync(new URL("../app/leaflab/full-masks.html",import.meta.url),"utf8");
const ui=readFileSync(new URL("../app/leaflab/full-mask-ui.mjs",import.meta.url),"utf8");
const homepage=readFileSync(new URL("../app/leaflab/index.html",import.meta.url),"utf8");
for(const id of ["maskPhoto","maskSource","maskPlant","maskSpecimen",
  "maskObserver","maskTarget","maskRole","maskIndependence","maskInclude",
  "maskExclude","maskUndoPoint","maskClosePolygon","maskUndoPolygon",
  "maskCompleted","maskSave","maskReset","maskCanvas",
  "maskViewOutline","maskViewComplete","maskViewDisagreement",
  "maskViewPrediction","maskPickForeground","maskPickBackground",
  "maskMargin","maskBenchmark","maskExportBenchmark","maskImport",
  "maskCompare","maskExportComparison","maskCohort","maskExportCohort",
  "maskCohortRows","maskIoU","maskDisagreement","maskAudit"])
  assert.ok(html.includes('id="'+id+'"'),"Missing full-mask UI id "+id);
assert.match(html,/src="\.\/full-mask-ui\.mjs"/);
assert.match(ui,/crypto\.subtle\.digest/);
assert.match(ui,/rasterizeCompletePolygons/);
assert.match(ui,/compareCompleteReferences/);
assert.match(ui,/benchmarkCompleteReferencePair/);
assert.match(ui,/segmentImage/);
assert.match(ui,/source\.originalSHA256/);
assert.match(homepage,/full-masks\.html/);
assert.ok(!/fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(ui),
  "Real original photo and full reference masks may not be uploaded by the browser");
console.log("PASS LeafLab v1.6: full-frame human include/exclude polygons, pair disagreement, two-reference baseline, plant role leakage, hash guards and offline browser controls");
