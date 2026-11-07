import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {COUNTS, DEFAULTS, generateLeaf, measureTips, polygonArea, polygonPerimeter} from "../app/leaflab/core.mjs";
import {validateAnnotation,orderedRays,fitTipFan} from "../app/leaflab/fit.mjs";
import {calibrateScale,validatedOutline,measureOutline,makeSpecimen,parseSpecimen,compareSpecimens,cohortCSV} from "../app/leaflab/measure.mjs";

for(const count of COUNTS){
  const a=generateLeaf({...DEFAULTS,count});
  const b=generateLeaf({...DEFAULTS,count});
  assert.equal(a.kind,"synthetic-morphology");
  assert.equal(a.leaves.length,count);
  assert.deepEqual(a,b,"models must be deterministic");
  assert.ok(a.metrics.area>0 && a.metrics.perimeter>0 && a.metrics.veinLength>0);
  assert.ok(Number.isFinite(a.metrics.perimeterOverSqrtArea));
  assert.ok(Math.abs(a.metrics.symmetry-100)<1e-8,"default fan has paired areas");
  assert.ok(a.leaves.every(l=>l.polygon.length===482));
  assert.ok(a.leaves.every(l=>Math.abs(l.area-polygonArea(l.polygon))<1e-6));
  assert.ok(a.leaves.every(l=>Math.abs(l.perimeter-polygonPerimeter(l.polygon))<1e-6));
}
const smooth=generateLeaf({...DEFAULTS,depth:0});
const serrated=generateLeaf({...DEFAULTS,depth:.4});
assert.ok(serrated.metrics.perimeter>smooth.metrics.perimeter,"deeper teeth lengthen the boundary");
const biased=generateLeaf({...DEFAULTS,asym:.2});
assert.ok(biased.metrics.symmetry<99,"asymmetry reduces paired-area balance");
const hiddenVeins=generateLeaf({...DEFAULTS,veins:false});
assert.equal(hiddenVeins.metrics.veinLength,generateLeaf({...DEFAULTS,veins:true}).metrics.veinLength,
  "visibility must not alter measurements");
assert.throws(()=>generateLeaf({count:4}),/Unsupported leaflet count/);
assert.throws(()=>generateLeaf({fan:NaN}),/finite/);
assert.throws(()=>generateLeaf({teeth:5.5}),/integer/);
assert.throws(()=>generateLeaf({width:999}),/range/);

const photo=measureTips([100,100],[[100,0],[200,100],[0,100]],{filename:"local-photo.png"});
assert.equal(photo.kind,"manual-photo-tip-annotation");
assert.equal(photo.tips.length,3);
assert.equal(photo.angularSpreadDegrees,180);
assert.equal(photo.tips[0].angleDegrees,0);
assert.equal(photo.tips[1].angleDegrees,90);
assert.equal(photo.tips[2].angleDegrees,-90);
assert.ok(photo.tips.every(t=>t.relativeLength===1));
assert.deepEqual(photo.source,{filename:"local-photo.png"});
assert.throws(()=>measureTips([0,0],[[0,0]]),/coincide/);
assert.throws(()=>measureTips([0,0],[]),/1–20/);

const ui=readFileSync(new URL("../app/leaflab/index.html",import.meta.url),"utf8");
const js=readFileSync(new URL("../app/leaflab/ui.mjs",import.meta.url),"utf8");
assert.match(ui,/Model ≠ measurement ≠ biological mechanism/);
assert.match(ui,/src="\.\/ui\.mjs"/);
assert.match(js,/measureTips/);
assert.match(js,/createObjectURL/);
assert.match(js,/revok[e]?ObjectURL/);
assert.ok(!/fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(js),
  "photo annotations must stay local");
console.log("PASS LeafLab: 5 deterministic geometries, morphology sensitivity, photo angles, privacy and scientific boundaries");


// v0.2: recover known synthetic parameters on rotated tip sets, including
// crossing the photo-coordinate +/-180° discontinuity.
for(const count of COUNTS) {
  const fan=142, rotation=173, falloff=.43, asym=.12, hub=[425,315];
  const m=(count-1)/2;
  const base=Array.from({length:count},(_,i)=>{
    const k=(i-m)/m;
    return (1-falloff*Math.abs(k)**1.35)*(1+asym*k);
  });
  const max=Math.max(...base);
  const tips=base.map((length,i)=>{
    const angle=(rotation+(i-m)/m*fan/2)*Math.PI/180;
    const radius=188*length/max;
    return [hub[0]+Math.sin(angle)*radius,hub[1]-Math.cos(angle)*radius];
  });
  const ann=measureTips(hub,tips,{filename:"SYNTHETIC_TEST_NOT_REAL.png"});
  assert.ok(Math.abs(ann.angularSpreadDegrees-fan)<1e-8,"circular span must be rotation invariant");
  assert.equal(validateAnnotation(ann),ann);
  const ordered=orderedRays(ann);
  assert.equal(ordered.rays.length,count);
  assert.ok(Math.abs(ordered.spreadDegrees-fan)<1e-8);
  const result=fitTipFan(ann);
  assert.equal(result.kind,"descriptive-photo-model-fit");
  assert.equal(result.observedCount,count);
  assert.ok(Math.abs(result.fitted.fanDegrees-fan)<1e-7);
  assert.ok(result.metrics.angleRMSEDegrees<1e-6);
  assert.ok(result.metrics.relativeLengthRMSE<1e-6);
  assert.equal(result.points.length,count);
  assert.deepEqual(result,fitTipFan(ann),"fit is deterministic");
}
const wrap=measureTips([100,100],[
  [100+100*Math.sin(170*Math.PI/180),100-100*Math.cos(170*Math.PI/180)],
  [100+100*Math.sin(179*Math.PI/180),100-100*Math.cos(179*Math.PI/180)],
  [100+100*Math.sin(-170*Math.PI/180),100-100*Math.cos(-170*Math.PI/180)]
]);
assert.ok(Math.abs(wrap.angularSpreadDegrees-20)<1e-8,"rotated photo cannot show a fake 349° span");
assert.ok(Math.abs(orderedRays(wrap).spreadDegrees-20)<1e-8);
assert.throws(()=>fitTipFan(measureTips([0,0],[[0,-1]])),/complete marked/);
assert.throws(()=>fitTipFan(measureTips([0,0],[[0,-1],[1,0],[0,1],[-1,0]])),/complete marked/);
assert.throws(()=>validateAnnotation({kind:"wrong",hub:[0,0],tips:[]}),/manual-photo-tip-annotation/);
assert.throws(()=>validateAnnotation({
  kind:"manual-photo-tip-annotation",hub:[0,0],tips:[{x:0,y:0}]
}),/coincide/);
assert.throws(()=>fitTipFan(measureTips([0,0],[
  [100,0],[31,95],[-81,59],[-81,-59],[31,-95]
])),/spread exceeds 270/);
const htmlV2=readFileSync(new URL("../app/leaflab/index.html",import.meta.url),"utf8");
const uiV2=readFileSync(new URL("../app/leaflab/ui.mjs",import.meta.url),"utf8");
assert.match(htmlV2,/measurementImport/);
assert.match(htmlV2,/fitButton/);
assert.match(htmlV2,/fitExport/);
assert.match(uiV2,/fitTipFan/);
assert.match(uiV2,/renderFitSummary/);
assert.ok(!/fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(uiV2));
console.log("PASS LeafLab v0.2: rotation-invariant angle recovery, bounded fit, residuals, input checks and offline import UI");


// v0.3: scale is manually recorded from a coplanar ruler and all output is
// approximate. Verify dimensional analysis and reject untrustworthy outlines.
const ruler={points:[[100,100],[200,100]],knownLengthMm:10};
const calibrated=calibrateScale(ruler);
assert.equal(calibrated.mmPerDisplayUnit,.1);
assert.equal(calibrated.displayUnitsPerMm,10);
const square={leafletId:1,vertices:[[100,100],[200,100],[200,200],[100,200]]};
const measured=measureOutline(square,ruler);
assert.equal(measured.areaMm2,100);
assert.equal(measured.perimeterMm,40);
assert.ok(Math.abs(measured.compactness-Math.PI/4)<1e-5);
const scaled=measureOutline(square,{points:ruler.points,knownLengthMm:20});
assert.equal(scaled.areaMm2,400,"double length scale must quadruple polygon area");
assert.equal(scaled.perimeterMm,80);
assert.deepEqual(validatedOutline(square),square);
assert.throws(()=>calibrateScale({points:ruler.points,knownLengthMm:0}),/reference length/);
assert.throws(()=>calibrateScale({points:[[100,100],[100,100]],knownLengthMm:10}),/at least one/);
assert.throws(()=>calibrateScale({points:[[-1,100],[200,100]],knownLengthMm:10}),/inside the image view/);
assert.throws(()=>validatedOutline({leafletId:1,vertices:[[0,0],[2,2],[0,2],[2,0]]}),/area|self-intersects/);
assert.throws(()=>validatedOutline({leafletId:1,vertices:[[10,10],[50,10],[50,50],[10,10]]}),/Duplicate|self-intersects/);
assert.throws(()=>validatedOutline({leafletId:0,vertices:square.vertices}),/leafletId/);
const sampleA=makeSpecimen({
  specimenId:"A_01",plantId:"Plant_A",source:{filename:"local-leaf.jpg"},
  calibration:ruler,outlines:[square]
});
assert.equal(sampleA.kind,"manual-leaf-specimen");
assert.equal(sampleA.metrics.meanTracedLeafletAreaMm2,100);
assert.equal(sampleA.metrics.summedTracedPolygonAreaMm2,100);
const tampered={...sampleA,metrics:{meanTracedLeafletAreaMm2:100000000}};
assert.equal(parseSpecimen(tampered).metrics.meanTracedLeafletAreaMm2,100,
  "import must recompute metrics rather than trusting stored results");
const sampleB=makeSpecimen({
  specimenId:"A_02",plantId:"Plant_A",calibration:ruler,outlines:[square]
});
const sampleC=makeSpecimen({
  specimenId:"B_01",plantId:"Plant_B",
  calibration:{points:ruler.points,knownLengthMm:20},outlines:[square]
});
const comparison=compareSpecimens([sampleC,sampleB,sampleA]);
assert.equal(comparison.kind,"descriptive-leaf-cohort");
assert.equal(comparison.specimenCount,3);
assert.equal(comparison.distinctPlantIds,2,"multiple records of Plant_A are not independent plants");
assert.equal(comparison.plantMeans.find(p=>p.plantId==="Plant_A").specimens,2);
assert.equal(comparison.plantMeans.find(p=>p.plantId==="Plant_B").meanAreaMm2,400);
assert.deepEqual(comparison,compareSpecimens([sampleC,sampleB,sampleA]));
const csv=cohortCSV(comparison);
assert.match(csv,/specimen_id,plant_id/);
assert.match(csv,/A_01,Plant_A,1,100,40/);
assert.match(csv,/B_01,Plant_B,1,400,80/);
assert.throws(()=>compareSpecimens([sampleA,sampleA]),/Duplicate specimen ID/);
assert.throws(()=>parseSpecimen({...sampleA,kind:"synthetic-morphology"}),/manual-leaf-specimen/);
assert.throws(()=>makeSpecimen({...sampleA,specimenId:"=HYPERLINK(1)"}),/Specimen ID/);
assert.throws(()=>makeSpecimen({...sampleA,outlines:[square,square]}),/unique/);
const measuredHTML=readFileSync(new URL("../app/leaflab/index.html",import.meta.url),"utf8");
const measurementUI=readFileSync(new URL("../app/leaflab/measurement-ui.mjs",import.meta.url),"utf8");
for(const id of ["scaleTool","knownLengthMm","outlineLeaflet","finishOutline",
  "specimenExport","specimenAdd","cohortImport","cohortRows","cohortExportCSV",
  "removeSavedOutline"])assert.ok(measuredHTML.includes('id="'+id+'"'),"Missing control "+id);
assert.match(measurementUI,/installMeasurementUI/);
assert.match(measurementUI,/makeSpecimen/);
assert.match(measurementUI,/compareSpecimens/);
assert.match(uiV2,/measurementUI/);
assert.ok(!/fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(measurementUI),
  "photo, ruler and specimen inputs remain local");
console.log("PASS LeafLab v0.3: scale^2 area, validated polygons, metric recomputation, grouped cohort and UI privacy");
