import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {COUNTS, DEFAULTS, generateLeaf, measureTips, polygonArea, polygonPerimeter} from "../app/leaflab/core.mjs";
import {validateAnnotation,orderedRays,fitTipFan} from "../app/leaflab/fit.mjs";

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
