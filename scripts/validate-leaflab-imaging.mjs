import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {segmentImage,traceVeinCandidates,thinBinary,skeletonGraph,
  compareWithManualOutlines,imagingReport} from "../app/leaflab/imaging-core.mjs";

const width=80,height=72,n=width*height,bg=[230,230,210],
  leaf=[55,150,73],dark=[20,80,32];
const data=new Uint8ClampedArray(n*4);
function pixel(x,y,rgb){
  const k=4*(y*width+x);
  data.set([...rgb,255],k);
}
for(let y=0;y<height;y++)for(let x=0;x<width;x++)pixel(x,y,bg);
for(let y=14;y<56;y++)for(let x=20;x<60;x++)pixel(x,y,leaf);
for(let y=18;y<52;y++)pixel(40,y,dark);
// Separate same-color speck must not join the foreground component.
pixel(3,3,leaf);
const original=new Uint8ClampedArray(data);
const seg=segmentImage({width,height,data,foreground:leaf,background:bg,seed:25+20*width});
assert.equal(seg.kind,"leaflab-foreground-segmentation");
assert.equal(seg.pixels,40*42);
assert.equal(seg.binaryCandidatePixels,40*42+1);
assert.equal(seg.edge4PixelUnits,2*(40+42));
assert.equal(seg.mask[3+3*width],0,"Disconnected noise must not be selected");
assert.equal(seg.coverage,1680/n);
assert.deepEqual(data,original,"Input pixels must not be mutated");
assert.deepEqual(seg,segmentImage({width,height,data,foreground:leaf,background:bg,seed:25+20*width}),
  "Segmentation must be deterministic");
assert.throws(()=>segmentImage({width,height,data,foreground:leaf,background:leaf,seed:25+20*width}),/too similar/);
assert.throws(()=>segmentImage({width,height,data,foreground:leaf,background:bg,seed:0}),/Foreground seed/);
assert.throws(()=>segmentImage({width,height,data,foreground:leaf,background:bg,seed:25+20*width,margin:2}),/margin/);
assert.throws(()=>segmentImage({width:500,height,data,foreground:leaf,background:bg,seed:1}),/downsampled/);
assert.throws(()=>segmentImage({width,height,data:new Uint8ClampedArray(3),foreground:leaf,background:bg,seed:1}),/RGBA image data/);
assert.throws(()=>segmentImage({width,height,data,foreground:[-1,20,40],background:bg,seed:2}),/RGB triplet/);

const candidate=traceVeinCandidates({width,height,data,mask:seg.mask,contrast:14,minPixels:6});
assert.equal(candidate.kind,"leaflab-veinlike-ridge-graph");
assert.ok(candidate.ridgePixels>=25,"Dark synthetic centerline should be detected");
assert.ok(candidate.skeletonPixels>=20,"Centerline should survive thinning");
assert.ok(candidate.graph.components>=1);
assert.ok(candidate.graph.endpointPixels>=2);
assert.ok(candidate.graph.neighborLinkLength>0);
assert.deepEqual(candidate,traceVeinCandidates({width,height,data,mask:seg.mask,contrast:14,minPixels:6}));
assert.throws(()=>traceVeinCandidates({width,height,data,mask:new Uint8Array(2)}),/binary foreground/);
assert.throws(()=>traceVeinCandidates({width,height,data,mask:seg.mask,contrast:90}),/Contrast/);
assert.throws(()=>traceVeinCandidates({width,height,data,mask:seg.mask,minPixels:0}),/Minimum/);

const skeleton=new Uint8Array(n);
for(let y=15;y<47;y++)skeleton[y*width+40]=1;
for(let x=29;x<52;x++)skeleton[31*width+x]=1;
const g=skeletonGraph(skeleton,width,height);
assert.equal(g.components,1);
assert.ok(g.endpointPixels>=4);
assert.ok(g.junctionPixels>=1);
assert.ok(g.neighborLinkLength>0);
const thinned=thinBinary(skeleton,width,height);
assert.deepEqual(skeletonGraph(thinned,width,height).skeletonPixels,g.skeletonPixels,
  "One-pixel-wide cross should remain skeletonized");
assert.deepEqual(skeleton[31*width+40],1,"Input skeleton must be unchanged");
assert.deepEqual(skeletonGraph(new Uint8Array(n),width,height),
  {skeletonPixels:0,components:0,largestComponentPixels:0,
    largestComponentFraction:0,endpointPixels:0,junctionPixels:0,
    isolatedPixels:0,neighborLinks:0,neighborLinkLength:0});

const exactPolygon={leafletId:1,vertices:[[20,14],[60,14],[60,56],[20,56]]};
const comparison=compareWithManualOutlines({mask:seg.mask,width,height,
  outlines:[exactPolygon],frameWidth:80,frameHeight:72});
assert.equal(comparison.kind,"leaflab-manual-mask-comparison");
assert.equal(comparison.manualUnionPixels,1680);
assert.equal(comparison.intersectionOverUnion,1);
assert.equal(comparison.dice,1);
assert.equal(comparison.precision,1);
assert.equal(comparison.recall,1);
const shifted=compareWithManualOutlines({mask:seg.mask,width,height,
  outlines:[{leafletId:1,vertices:[[30,20],[70,20],[70,62],[30,62]]}],
  frameWidth:80,frameHeight:72});
assert.ok(shifted.intersectionOverUnion<1);
assert.ok(shifted.intersectionOverUnion>0);
const meetAspect=compareWithManualOutlines({mask:seg.mask,width,height,frameWidth:850,
  frameHeight:630,outlines:[{leafletId:1,vertices:[
    [20*8.75+75,14*8.75],[60*8.75+75,14*8.75],
    [60*8.75+75,56*8.75],[20*8.75+75,56*8.75]
  ]}]});
assert.ok(meetAspect.intersectionOverUnion>.99,"xMidYMid meet unprojection must preserve the mask");
assert.throws(()=>compareWithManualOutlines({mask:seg.mask,width,height,outlines:[]}),/manually traced/);
assert.throws(()=>compareWithManualOutlines({mask:new Uint8Array(4),width,height,outlines:[exactPolygon]}),/binary segmentation/);
const report=imagingReport(seg,candidate,comparison);
assert.equal(report.kind,"leaflab-local-imaging-audit");
assert.equal(report.status,"EXPERIMENTAL_IMAGE_PROCESSING_ONLY");
assert.equal(report.mask.pixels,1680);
assert.equal(report.veinLikeGraph.skeletonPixels,candidate.graph.skeletonPixels);
assert.equal(report.comparison.intersectionOverUnion,1);
assert.ok(!JSON.stringify(report).includes('"data"'));
assert.ok(!JSON.stringify(report).includes('"skeleton"'));
assert.ok(!JSON.stringify(report).includes('"mask":{"0"'),
  "Reports must not accidentally include full pixel data");
assert.throws(()=>imagingReport(seg,{...candidate,width:999}),/matching segmentation/);

// Verify local photo UI and clear scientific boundary markers.
const html=readFileSync(new URL("../app/leaflab/imaging.html",import.meta.url),"utf8");
const js=readFileSync(new URL("../app/leaflab/imaging-ui.mjs",import.meta.url),"utf8");
const home=readFileSync(new URL("../app/leaflab/index.html",import.meta.url),"utf8");
for(const id of ["imageFile","foregroundMode","backgroundMode","margin","contrast",
  "minRidge","analyze","showNetwork","exportMask","manualFile",
  "compareManual","comparisonStatus","exportReport"])
  assert.ok(html.includes('id="'+id+'"'),"Missing image UI control "+id);
assert.match(html,/src="\.\/imaging-ui\.mjs"/);
assert.match(js,/compareWithManualOutlines/);
assert.match(js,/traceVeinCandidates/);
assert.match(js,/getImageData/);
assert.match(js,/toBlob/);
assert.match(home,/imaging\.html/);
assert.ok(!/fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(js),
  "Private user images must not be sent to a server");
console.log("PASS LeafLab v0.6: exact synthetic segmentation, disjoint noise, ridge skeleton, graph endpoints, manual IoU, image privacy and bounds");
