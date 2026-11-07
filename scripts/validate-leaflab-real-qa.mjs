import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {segmentImage,traceVeinCandidates} from "../app/leaflab/imaging-core.mjs";
import {REAL_LEAF_SOURCES} from "../app/leaflab/real-photo-catalog.mjs";
import {REAL_IMAGE_QA_VERSION,KNOWN_REAL_PHOTO_ORIGINALS,
  LABEL_UNREVIEWED,LABEL_LEAF,LABEL_BACKGROUND,
  identifyPhotoByOriginalHash,paintSparseLabels,sparseSampleAudit,
  encodeSparseLabels,decodeSparseLabels,makeRealImageQaReport}
  from "../app/leaflab/real-image-qa.mjs";

assert.equal(REAL_IMAGE_QA_VERSION,"1.5");
assert.equal(KNOWN_REAL_PHOTO_ORIGINALS.length,2);
assert.equal(REAL_LEAF_SOURCES.filter(x=>x.independentlyFetchedSHA256).length,2);
for(const item of KNOWN_REAL_PHOTO_ORIGINALS){
  const source=identifyPhotoByOriginalHash(item.sha256,
    item.originalBytes,item.width,item.height);
  assert.equal(source.status,"KNOWN_WIKIMEDIA_ORIGINAL_SHA256_MATCH");
  assert.equal(source.sourceId,item.id);
  assert.equal(source.sourceLicense,item.license);
  assert.equal(source.originalSHA256,item.sha256);
  assert.throws(()=>identifyPhotoByOriginalHash(item.sha256,
    item.originalBytes+1,item.width,item.height),
    /bytes or decoded dimensions disagree/);
  assert.throws(()=>identifyPhotoByOriginalHash(item.sha256,
    item.originalBytes,item.width+1,item.height),
    /bytes or decoded dimensions disagree/);
}
const unknown=identifyPhotoByOriginalHash("c".repeat(64),20000,640,480);
assert.equal(unknown.status,"LOCAL_BYTES_HASHED_BUT_NOT_IN_APPROVED_CATALOG");
assert.equal(unknown.sourceId,null);
assert.throws(()=>identifyPhotoByOriginalHash("NOT_A_HASH",1,100,100),
  /valid original image SHA-256/);
assert.throws(()=>identifyPhotoByOriginalHash("c".repeat(64),1,0,100),
  /valid original image SHA-256/);

const width=80,height=72,n=width*height;
const image=new Uint8ClampedArray(n*4),
  bg=[229,231,210],leaf=[52,152,70],dark=[24,83,37];
for(let i=0;i<n;i++)image.set([...bg,255],4*i);
for(let y=15;y<55;y++)for(let x=20;x<60;x++)
  image.set([...leaf,255],4*(y*width+x));
for(let y=18;y<51;y++)image.set([...dark,255],4*(y*width+40));
const seg=segmentImage({width,height,data:image,foreground:leaf,
  background:bg,seed:22+20*width,margin:.07});
const ridge=traceVeinCandidates({width,height,data:image,
  mask:seg.mask,contrast:14,minPixels:6});
assert.equal(seg.pixels,40*40);
assert.ok(ridge.skeletonPixels>10);

const none=new Uint8Array(n),first=paintSparseLabels({
  labels:none,width,height,start:{x:30,y:30},end:{x:48,y:48},
  radius:4,kind:LABEL_LEAF
});
assert.ok(first.some(x=>x===LABEL_LEAF));
assert.ok(none.every(x=>x===LABEL_UNREVIEWED),
  "Sparse painting must be immutable");
const second=paintSparseLabels({
  labels:first,width,height,start:{x:5,y:5},end:{x:12,y:13},
  radius:4,kind:LABEL_BACKGROUND
});
const invalid=paintSparseLabels({
  labels:second,width,height,start:{x:5,y:5},end:{x:5,y:5},
  radius:4,kind:LABEL_UNREVIEWED
});
assert.ok(second.some(x=>x===LABEL_BACKGROUND));
assert.ok(invalid.filter(x=>x===LABEL_BACKGROUND).length<
  second.filter(x=>x===LABEL_BACKGROUND).length);
assert.throws(()=>paintSparseLabels({labels:second,width,height,
  start:{x:1,y:1},end:{x:1,y:1},radius:0,kind:LABEL_LEAF}),
  /Brush radius/);
assert.throws(()=>paintSparseLabels({labels:second,width,height,
  start:{x:-1,y:1},end:{x:1,y:1},radius:3,kind:LABEL_LEAF}),
  /outside image frame/);
assert.throws(()=>paintSparseLabels({labels:second,width,height,
  start:{x:1,y:1},end:{x:1,y:1},radius:3,kind:6}),
  /Brush type/);
assert.ok(second.filter(x=>x===LABEL_LEAF).length>0);
const labeled=second;
const encoded=encodeSparseLabels(labeled,width,height);
assert.equal(encoded.format,"sparse-label-rle-v1");
assert.deepEqual(decodeSparseLabels(encoded),labeled);
assert.deepEqual(encodeSparseLabels(decodeSparseLabels(encoded),width,height),
  encoded);
assert.throws(()=>decodeSparseLabels({...encoded,runs:[[1,n+1]]}),
  /Invalid RLE label run/);
assert.throws(()=>decodeSparseLabels({...encoded,runs:[[1,n-1]]}),
  /does not fill/);
assert.throws(()=>decodeSparseLabels({...encoded,runs:[[2,n/2],[2,n/2]]}),
  /Invalid RLE label run/);
assert.throws(()=>decodeSparseLabels({...encoded,runs:[[3,n]]}),
  /Invalid RLE label run/);
assert.throws(()=>encodeSparseLabels(new Uint8Array(2),width,height),
  /QA labels/);
const review=sparseSampleAudit({mask:seg.mask,labels:labeled,width,height});
assert.equal(review.kind,"leaflab-sparse-annotation-qa");
assert.equal(review.version,"1.5");
assert.equal(review.status,"LABELED_PIXELS_ONLY_EXPLORATORY_AGREEMENT");
assert.ok(review.labeledLeafPixels>=20);
assert.ok(review.labeledBackgroundPixels>=20);
assert.equal(review.labeledPixels,review.labeledLeafPixels+review.labeledBackgroundPixels);
assert.equal(review.labeledPixels+review.unreviewedPixels,n);
assert.ok(review.labeledCoverage<.1,
  "Our synthetic brush labels intentionally cover less than 10% of all pixels");
assert.ok(review.metrics.intersectionOverUnion>=0);
assert.ok(review.metrics.intersectionOverUnion<=1);
assert.ok(review.metrics.precision>=0&&review.metrics.precision<=1);
assert.ok(review.metrics.recall>=0&&review.metrics.recall<=1);
assert.ok(review.metrics.dice>=0&&review.metrics.dice<=1);
assert.ok(review.metrics.balancedAccuracy>=0&&review.metrics.balancedAccuracy<=1);
assert.deepEqual(review,sparseSampleAudit({mask:seg.mask,labels:labeled,width,height}));
assert.ok(!JSON.stringify(review).includes('"photoData"'));
const missing=sparseSampleAudit({mask:seg.mask,labels:new Uint8Array(n),width,height});
assert.equal(missing.metrics,null);
assert.equal(missing.status,"INSUFFICIENT_LABELED_PIXELS_NO_SCORES");
assert.throws(()=>sparseSampleAudit({mask:seg.mask,labels:labeled,width,height,
  minPerClass:2000}),/Minimum labeled/);
assert.throws(()=>sparseSampleAudit({mask:new Uint8Array(2),
  labels:labeled,width,height}),/same-frame binary/);
assert.throws(()=>sparseSampleAudit({mask:seg.mask,labels:new Uint8Array(2),
  width,height}),/QA labels/);
const source=identifyPhotoByOriginalHash(KNOWN_REAL_PHOTO_ORIGINALS[0].sha256,
  KNOWN_REAL_PHOTO_ORIGINALS[0].originalBytes,
  KNOWN_REAL_PHOTO_ORIGINALS[0].width,
  KNOWN_REAL_PHOTO_ORIGINALS[0].height);
const report=makeRealImageQaReport({
  source,labels:labeled,mask:seg.mask,width,height,margin:.07,
  foreground:leaf,background:bg,seed:22+20*width,
  contrast:14,minRidgePixels:6,
  ridgeSummary:{skeletonPixels:ridge.skeletonPixels,
    components:ridge.graph.components,
    endpointPixels:ridge.graph.endpointPixels,
    junctionPixels:ridge.graph.junctionPixels},
  reviewRole:"development"
});
assert.equal(report.kind,"leaflab-real-photo-sparse-qa-report");
assert.equal(report.version,"1.5");
assert.equal(report.reviewRole,"development");
assert.equal(report.source.originalSHA256,source.originalSHA256);
assert.deepEqual(decodeSparseLabels(report.sampleLabels),labeled);
assert.equal(report.audit.labeledPixels,review.labeledPixels);
assert.equal(report.constraints.shownPredictionsBeforeFirstAnnotationLock,false);
assert.ok(report.limitations.some(x=>x.includes("NOT whole-image accuracy")));
assert.ok(!JSON.stringify(report).includes('"pixels":{"0"'),
  "Raw original image pixels must not be exported");
assert.throws(()=>makeRealImageQaReport({...report,source:null,
  labels:labeled,mask:seg.mask,width,height,margin:.07,
  foreground:leaf,background:bg,seed:25,contrast:14,minRidgePixels:6,
  ridgeSummary:{skeletonPixels:1,components:1}}),
  /current-session local-byte/);
assert.throws(()=>makeRealImageQaReport({
  source,labels:labeled,mask:seg.mask,width,height,margin:.07,
  foreground:leaf,background:bg,seed:25,
  contrast:14,minRidgePixels:6,
  ridgeSummary:{skeletonPixels:1,components:1},reviewRole:"verified-holdout"
}),/Review role/);
const h=readFileSync(new URL("../app/leaflab/real-image-qa.html",import.meta.url),"utf8");
const ui=readFileSync(new URL("../app/leaflab/real-image-qa-ui.mjs",import.meta.url),"utf8");
const lab=readFileSync(new URL("../app/leaflab/index.html",import.meta.url),"utf8");
for(const id of ["qaFile","qaCanvas","qaSource","pickLeaf","pickBackground",
  "markLeaf","markBackground","eraseLabels","brushSize","qaMargin",
  "qaContrast","qaMinPixels","qaRole","qaEvaluate","qaReset","qaViewPhoto",
  "qaViewSamples","qaViewMask","qaViewErrors","qaViewRidges",
  "qaCoverage","qaIoU","qaPrecision","qaRecall","qaAudit","qaExport"])
  assert.ok(h.includes('id="'+id+'"'),"Missing QA browser control: "+id);
assert.match(h,/src="\.\/real-image-qa-ui\.mjs"/);
assert.match(ui,/crypto\.subtle\.digest/);
assert.match(ui,/segmentImage/);
assert.match(ui,/paintSparseLabels/);
assert.match(ui,/makeRealImageQaReport/);
assert.match(ui,/LOCKED/);
assert.match(lab,/real-image-qa\.html/);
assert.ok(!/fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(ui),
  "No photo bytes or marks can be transmitted by the QA browser app");
console.log("PASS LeafLab v1.5: two known real-JPEG hashes, controlled sparse labeling, scored-only reviewed pixels, RLE source records, read-only first reveal, offline UI");
