import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {COUNTS, DEFAULTS, generateLeaf, measureTips, polygonArea, polygonPerimeter} from "../app/leaflab/core.mjs";

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
