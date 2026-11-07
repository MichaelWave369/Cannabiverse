import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {makeVeinReference,parseVeinReference,rasterizeVeinPaths,
  scoreVeinLines,globalDarknessBaseline,evaluateVeinBenchmark,
  validateBenchmarkReport,compareBenchmarkReports} from "../app/leaflab/vein-benchmark.mjs";

const width=80,height=72,n=width*height;
const data=new Uint8ClampedArray(n*4),back=[230,230,210],
  leaf=[55,150,73],dark=[20,80,32],hash="a".repeat(64);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const inside=x>=20&&x<60&&y>=14&&y<56,
    line=inside&&x===40&&y>=18&&y<52;
  data.set([...(line?dark:inside?leaf:back),255],4*(y*width+x));
}
const untouched=new Uint8ClampedArray(data);
const source={
  specimenId:"Demo_001",plantId:"Plant_A",annotatorCode:"Blind_A",
  imageSHA256:hash,width,height,origin:"synthetic-demo",
  sourceFilename:"SYNTHETIC-DRAWN-RECTANGLE.png",
  paths:[[[40,18],[40,51]]]
};
const ref=makeVeinReference(source);
assert.equal(ref.kind,"leaflab-vein-reference");
assert.equal(ref.version,"0.7");
assert.deepEqual(ref,parseVeinReference(ref));
assert.equal(ref.paths.length,1);
assert.deepEqual(ref.paths[0],[[40,18],[40,51]]);
assert.throws(()=>makeVeinReference({...source,imageSHA256:"BAD"}),/SHA-256/);
assert.throws(()=>makeVeinReference({...source,annotatorCode:"=HYPERLINK()"}),/Masked annotator/);
assert.throws(()=>makeVeinReference({...source,width:10}),/Reference frame/);
assert.throws(()=>makeVeinReference({...source,origin:"unknown"}),/Reference origin/);
assert.throws(()=>makeVeinReference({...source,paths:[]}),/1–60/);
assert.throws(()=>makeVeinReference({...source,paths:[[[30,30],[30,30]]]}),/distinct/);
assert.throws(()=>makeVeinReference({...source,paths:[[[0,0],[80,0]]]}),/in-frame/);
assert.throws(()=>parseVeinReference({...ref,version:"0.9"}),/v0.7/);
const humanMask=rasterizeVeinPaths(ref);
const total=x=>x.reduce((s,n)=>s+n,0);
assert.equal(humanMask.length,n);
assert.equal(total(humanMask),34);
assert.equal(humanMask[18*width+40],1);
assert.equal(humanMask[51*width+40],1);
assert.equal(humanMask[17*width+40],0);
const shiftedMask=rasterizeVeinPaths({width,height,
  paths:[[[41,18],[41,51]]]});
const exact=scoreVeinLines({prediction:humanMask,reference:humanMask,width,height,tolerance:0});
assert.equal(exact.f1,1);assert.equal(exact.precision,1);assert.equal(exact.recall,1);
const shiftedExact=scoreVeinLines({
  prediction:shiftedMask,reference:humanMask,width,height,tolerance:0});
assert.equal(shiftedExact.precision,0);
assert.equal(shiftedExact.recall,0);
assert.equal(shiftedExact.f1,0);
const shiftedTolerance=scoreVeinLines({
  prediction:shiftedMask,reference:humanMask,width,height,tolerance:1});
assert.equal(shiftedTolerance.f1,1,
  "Equal-tolerance matching must recover a known 1px shifted human line");
const empty=new Uint8Array(n);
const missing=scoreVeinLines({
  prediction:empty,reference:humanMask,width,height,tolerance:2});
assert.equal(missing.precision,null);
assert.equal(missing.recall,0);
assert.equal(missing.f1,0);
assert.throws(()=>scoreVeinLines({prediction:humanMask,reference:humanMask,
  width,height,tolerance:7}),/Tolerance/);
assert.throws(()=>scoreVeinLines({prediction:humanMask,reference:new Uint8Array(8),
  width,height,tolerance:2}),/binary Uint8Array/);
const evalArgs={
  width,height,data,reference:ref,imageSHA256:hash,
  foreground:leaf,background:back,seed:25+20*width,
  margin:.07,contrast:14,minPixels:6,tolerance:2
};
const run=evaluateVeinBenchmark(evalArgs);
assert.equal(run.report.kind,"leaflab-vein-reference-benchmark");
assert.equal(run.report.version,"0.7");
assert.equal(run.report.evidenceLevel,"SYNTHETIC_DEMONSTRATION");
assert.equal(run.report.detectors.length,2);
assert.equal(run.report.manuallyMarkedPathCount,1);
assert.equal(run.report.detectors[0].detector,"masked-local-ridge");
assert.equal(run.report.detectors[1].detector,"global-darkness-baseline");
assert.equal(run.report.detectors[0].referencePixels,34);
assert.equal(run.report.detectors[1].referencePixels,34);
assert.ok(run.report.detectors.every(d=>d.f1>0.99),
  "Both detectors must recover the synthetic central dark line");
assert.deepEqual(run,evaluateVeinBenchmark(evalArgs),"Benchmarks must be deterministic");
assert.deepEqual(data,untouched,"Original image pixels must be unchanged");
assert.ok(!JSON.stringify(run.report).includes('"data"'));
assert.ok(!JSON.stringify(run.report).includes('"skeleton"'));
assert.ok(!JSON.stringify(run.report).includes('"humanMask"'));
assert.throws(()=>evaluateVeinBenchmark({...evalArgs,imageSHA256:"b".repeat(64)}),/SHA-256 mismatch/);
assert.throws(()=>evaluateVeinBenchmark({...evalArgs,width:79}),/dimensions differ/);
assert.throws(()=>evaluateVeinBenchmark({...evalArgs,tolerance:8}),/Tolerance/);
const baseline=globalDarknessBaseline({
  width,height,data,mask:run.foregroundMask,contrast:14});
assert.equal(baseline.graph.skeletonPixels,34);
assert.deepEqual(baseline.skeleton,run.baselineSkeleton);
assert.throws(()=>globalDarknessBaseline({
  width,height,data,mask:new Uint8Array(n),contrast:14}),/Empty foreground/);
assert.equal(validateBenchmarkReport(run.report),run.report);
assert.throws(()=>validateBenchmarkReport({...run.report,observerCode:"BAD="}),/Observer code/);
assert.throws(()=>validateBenchmarkReport({...run.report,detectors:run.report.detectors.map(
  (d,i)=>i===0?{...d,f1:1.5}:d)}),/agreement metrics/);
const second={...run.report,observerCode:"Blind_B"};
const aggregate=compareBenchmarkReports([second,run.report]);
assert.equal(aggregate.kind,"leaflab-vein-benchmark-summary");
assert.equal(aggregate.imageReportCount,2);
assert.equal(aggregate.assertedPlantCount,1,
  "Two observers on one plant cannot be counted as two independent plants");
assert.equal(aggregate.plantSummaries[0].imageReports,2);
assert.ok(aggregate.plantSummaries[0].detectors.every(m=>m.meanReferenceF1>0.99));
assert.deepEqual(aggregate,compareBenchmarkReports([run.report,second]),
  "Aggregation must be independent of report input order");
assert.throws(()=>compareBenchmarkReports([run.report,run.report]),/Duplicate source-image/);
assert.throws(()=>compareBenchmarkReports([run.report,
  {...second,evidenceLevel:"USER_ASSERTED_HUMAN_REFERENCE_NOT_BOTANICAL_TRUTH"}]),
/cannot be mixed/);
assert.throws(()=>compareBenchmarkReports([]),/1–200/);

const html=readFileSync(new URL("../app/leaflab/veins.html",import.meta.url),"utf8");
const js=readFileSync(new URL("../app/leaflab/vein-ui.mjs",import.meta.url),"utf8");
const home=readFileSync(new URL("../app/leaflab/index.html",import.meta.url),"utf8");
for(const id of ["veinImage","veinCanvas","veinSpecimen","veinPlant","veinObserver",
  "modeTrace","modeLeaf","modeBack","finishVein","saveVeinReference",
  "importVeinReference","runVeinBenchmark","saveVeinBenchmark",
  "localF1","baselineF1","importVeinReports","summarizeVeinReports",
  "exportVeinSummary","benchRows","veinTolerance"]){
  assert.ok(html.includes('id="'+id+'"'),"Missing UI element "+id);
}
assert.match(html,/src="\.\/vein-ui\.mjs"/);
assert.match(js,/crypto\.subtle\.digest/);
assert.match(js,/evaluateVeinBenchmark/);
assert.match(js,/compareBenchmarkReports/);
assert.match(js,/image\.sha256/);
assert.match(js,/parsed\.origin!=="manual"/);
assert.match(home,/veins\.html/);
assert.ok(!/fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(js),
  "Photos and annotations must stay in the browser");
console.log("PASS LeafLab v0.7: source-byte provenance, human-line metrics, tolerance, two baselines, leak rejection, plant grouping and local-only UI");
