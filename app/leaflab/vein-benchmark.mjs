// Φ LeafLab v0.7. Human-reference line matching against TWO frozen pixel
// detectors. These are image-analysis scores, not verified vascular anatomy.
import {segmentImage,traceVeinCandidates,thinBinary,skeletonGraph}
  from "./imaging-core.mjs";

export const VEIN_BENCH_VERSION="0.7";
const validId=(x,label)=>{
  if(typeof x!=="string"||!(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/).test(x))
    throw new TypeError(label+" must be a 1–64 character alphanumeric ID (plus _ or -)");
  return x;
};
const hexHash=x=>typeof x==="string"&&/^[0-9a-f]{64}$/.test(x);
const isInt=(x,min,max)=>Number.isInteger(x)&&x>=min&&x<=max;
function checkFrame(width,height){
  if(!isInt(width,16,400)||!isInt(height,16,400)||width*height>160000)
    throw new RangeError("Reference frame must be 16–400 pixels on each side (≤160,000 total)");
}
function pointOk(p,width,height){
  return Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&
    p[0]>=0&&p[0]<width&&p[1]>=0&&p[1]<height;
}
function normalPaths(paths,width,height){
  if(!Array.isArray(paths)||paths.length<1||paths.length>60)
    throw new RangeError("Reference needs 1–60 separate vein-candidate paths");
  return paths.map((path,i)=>{
    if(!Array.isArray(path)||path.length<2||path.length>200||
       path.some(p=>!pointOk(p,width,height)))
      throw new TypeError("Path "+(i+1)+" needs 2–200 in-frame x,y coordinates");
    for(let j=1;j<path.length;j++){
      if(Math.hypot(path[j][0]-path[j-1][0],path[j][1]-path[j-1][1])<.25)
        throw new RangeError("Consecutive path points must be distinct");
    }
    return path.map(p=>[p[0],p[1]]);
  });
}
export function makeVeinReference(input){
  if(!input || !hexHash(input.imageSHA256))
    throw new TypeError("Reference needs a lowercase SHA-256 of original image bytes");
  checkFrame(input.width,input.height);
  if(input.origin!=="manual"&&input.origin!=="synthetic-demo")
    throw new TypeError("Reference origin must be manual or synthetic-demo");
  return {
    kind:"leaflab-vein-reference",version:VEIN_BENCH_VERSION,
    specimenId:validId(input.specimenId,"Specimen ID"),
    plantId:validId(input.plantId,"Plant ID"),
    annotatorCode:validId(input.annotatorCode,"Masked annotator code"),
    imageSHA256:input.imageSHA256,
    sourceFilename:String(input.sourceFilename||"").slice(0,180),
    width:input.width,height:input.height,origin:input.origin,
    paths:normalPaths(input.paths,input.width,input.height),
    limitations:[
      "Independently traced candidate veins; observer identity and blinding are self-asserted",
      "Same-image SHA-256 checks file-byte equality, not plant identity or origin authenticity",
      "Line selection is subjective and does not establish xylem, phloem or hydraulic transport",
      "Only the selected visible image features at the downsampled resolution are represented"
    ]
  };
}
export function parseVeinReference(raw){
  if(!raw||raw.kind!=="leaflab-vein-reference"||
     raw.version!==VEIN_BENCH_VERSION)
    throw new TypeError("Expected v0.7 vein-reference JSON");
  return makeVeinReference(raw); // never trust derived fields
}
function ensureMask(mask,width,height){
  checkFrame(width,height);
  if(!(mask instanceof Uint8Array)||mask.length!==width*height||
     mask.some(v=>v!==0&&v!==1))
    throw new TypeError("Expected a binary Uint8Array mask matching frame dimensions");
}
function pixelCount(mask){
  let n=0;for(const x of mask)n+=x;return n;
}
// Render connected human strokes at one raster pixel, without drawing artificial
// thick veins. Coordinates are already on the v0.6 downsampled source frame.
export function rasterizeVeinPaths({width,height,paths}){
  checkFrame(width,height);
  const clean=normalPaths(paths,width,height);
  const mask=new Uint8Array(width*height);
  for(const line of clean){
    for(let j=1;j<line.length;j++){
      const [ax,ay]=line[j-1],[bx,by]=line[j];
      const steps=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)*2));
      for(let k=0;k<=steps;k++){
        const t=k/steps;
        const x=Math.min(width-1,Math.round(ax+(bx-ax)*t));
        const y=Math.min(height-1,Math.round(ay+(by-ay)*t));
        mask[y*width+x]=1;
      }
    }
  }
  return mask;
}
function diskOffsets(radius){
  const positions=[];
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)
    if(dx*dx+dy*dy<=radius*radius)positions.push([dx,dy]);
  return positions;
}
function hasNearby(mask,width,height,x,y,offsets){
  for(const [dx,dy] of offsets){
    const xx=x+dx,yy=y+dy;
    if(xx>=0&&yy>=0&&xx<width&&yy<height&&mask[yy*width+xx])return true;
  }
  return false;
}
// Precision and recall are defined *against imperfect human lines*.
// Each side is matched to the other within the SAME Euclidean tolerance.
export function scoreVeinLines({prediction,reference,width,height,tolerance=2}){
  ensureMask(prediction,width,height);ensureMask(reference,width,height);
  if(!isInt(tolerance,0,6))throw new RangeError("Tolerance must be an integer from 0 to 6 pixels");
  const candidatePixels=pixelCount(prediction),referencePixels=pixelCount(reference);
  let matchedPrediction=0,matchedReference=0;
  const offsets=diskOffsets(tolerance);
  for(let i=0;i<width*height;i++){
    if(!prediction[i]&&!reference[i])continue;
    const x=i%width,y=Math.floor(i/width);
    if(prediction[i]&&hasNearby(reference,width,height,x,y,offsets))matchedPrediction++;
    if(reference[i]&&hasNearby(prediction,width,height,x,y,offsets))matchedReference++;
  }
  // A completely missing prediction is a recall failure, not a fabricated F1.
  const precision=candidatePixels?matchedPrediction/candidatePixels:null;
  const recall=referencePixels?matchedReference/referencePixels:null;
  const f1=precision!==null&&recall!==null&&precision+recall>0?
    2*precision*recall/(precision+recall):referencePixels?0:null;
  return {
    tolerancePixels:tolerance,candidatePixels,referencePixels,
    matchedCandidatePixels:matchedPrediction,matchedReferencePixels:matchedReference,
    precision,recall,f1,
    interpretation:"Symmetric within-distance human-line agreement; not pixelwise proof of true botanical veins"
  };
}
// Frozen baseline: pixels darker than the mean luminance of the foreground mask
// by the same contrast threshold as the local detector. Border eroded equally.
export function globalDarknessBaseline({width,height,data,mask,contrast=14}){
  ensureMask(mask,width,height);
  if(!(data instanceof Uint8ClampedArray)||data.length!==width*height*4)
    throw new TypeError("Baseline needs local RGBA image pixels");
  if(!Number.isFinite(contrast)||contrast<3||contrast>70)
    throw new RangeError("Contrast threshold must be 3–70");
  const lum=new Float32Array(width*height);let sum=0,n=0;
  for(let i=0;i<mask.length;i++){
    const k=i*4;
    lum[i]=.2126*data[k]+.7152*data[k+1]+.0722*data[k+2];
    if(mask[i]){sum+=lum[i];n++;}
  }
  if(!n)throw new RangeError("Empty foreground for global darkness baseline");
  const limit=sum/n-contrast;
  const raw=new Uint8Array(mask.length);
  for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
    const i=y*width+x;
    if(mask[i]&&mask[i-1]&&mask[i+1]&&mask[i-width]&&mask[i+width]&&
       lum[i]<=limit)raw[i]=1;
  }
  const skeleton=thinBinary(raw,width,height);
  return {kind:"leaflab-global-darkness-baseline",version:VEIN_BENCH_VERSION,
    skeleton,graph:skeletonGraph(skeleton,width,height),
    threshold:contrast,meanForegroundLuminance:sum/n,
    limitations:["Global mean darkness is a deliberately simple frozen baseline",
      "Uses the same user-seeded color mask and contrast cutoff as local ridge detector",
      "No tuning or validation against images of actual botanical veins"]};
}
export function evaluateVeinBenchmark({width,height,data,reference,imageSHA256,
  foreground,background,seed,margin=.07,contrast=14,minPixels=6,tolerance=2}){
  const ref=parseVeinReference(reference);
  if(ref.width!==width||ref.height!==height)
    throw new RangeError("Reference image dimensions differ from current processing frame");
  if(!hexHash(imageSHA256)||imageSHA256!==ref.imageSHA256)
    throw new RangeError("Source SHA-256 mismatch: use exactly the same original image file");
  if(!isInt(tolerance,0,6))throw new RangeError("Tolerance must be 0–6 pixels");
  const seg=segmentImage({width,height,data,foreground,background,seed,margin});
  const local=traceVeinCandidates({width,height,data,mask:seg.mask,contrast,minPixels});
  const baseline=globalDarknessBaseline({width,height,data,mask:seg.mask,contrast});
  const humanMask=rasterizeVeinPaths(ref);
  const localScore=scoreVeinLines({prediction:local.skeleton,reference:humanMask,
    width,height,tolerance});
  const globalScore=scoreVeinLines({prediction:baseline.skeleton,reference:humanMask,
    width,height,tolerance});
  const metrics=[
    {detector:"masked-local-ridge",...localScore,graph:local.graph},
    {detector:"global-darkness-baseline",...globalScore,graph:baseline.graph}
  ];
  const report={
    kind:"leaflab-vein-reference-benchmark",version:VEIN_BENCH_VERSION,
    evidenceLevel:ref.origin==="synthetic-demo"?"SYNTHETIC_DEMONSTRATION":
      "USER_ASSERTED_HUMAN_REFERENCE_NOT_BOTANICAL_TRUTH",
    specimenId:ref.specimenId,plantId:ref.plantId,
    observerCode:ref.annotatorCode,sourceFilename:ref.sourceFilename,
    imageSHA256,width,height,
    parameters:{foregroundRGB:[...foreground],backgroundRGB:[...background],
      seed,margin,contrast,minPixels,tolerancePixels:tolerance},
    segmentation:{foregroundPixels:seg.pixels,coverage:seg.coverage},
    manuallyMarkedPathCount:ref.paths.length,
    detectors:metrics,
    limitations:[
      "Comparisons are against a self-asserted human reference, not verified botanical ground truth",
      "Reference and test image must match exactly by original-byte SHA-256",
      "Parameters can be changed after reviewing scores; no preregistered generalization claim",
      "Both detectors depend on the same manually seeded color mask",
      "Line tolerance and 320px downsampling materially affect agreement",
      "Scores do not establish real vein anatomy, xylem/phloem flow, or engineering benefit"
    ]
  };
  return {report,foregroundMask:seg.mask,humanMask,
    localSkeleton:local.skeleton,baselineSkeleton:baseline.skeleton};
}
export function validateBenchmarkReport(raw){
  if(!raw||raw.kind!=="leaflab-vein-reference-benchmark"||
     raw.version!==VEIN_BENCH_VERSION||!hexHash(raw.imageSHA256)||
     !["SYNTHETIC_DEMONSTRATION","USER_ASSERTED_HUMAN_REFERENCE_NOT_BOTANICAL_TRUTH"].includes(raw.evidenceLevel))
    throw new TypeError("Expected v0.7 vein benchmark report");
  validId(raw.specimenId,"Specimen ID");validId(raw.plantId,"Plant ID");
  if(!Array.isArray(raw.detectors)||raw.detectors.length!==2||
     raw.detectors[0]?.detector!=="masked-local-ridge"||
     raw.detectors[1]?.detector!=="global-darkness-baseline")
    throw new TypeError("Benchmark needs the two predeclared detectors");
  for(const d of raw.detectors){
    if(!Number.isInteger(d.referencePixels)||d.referencePixels<1||
       !Number.isInteger(d.candidatePixels)||d.candidatePixels<0||
       [d.precision,d.recall,d.f1].some(x=>x!==null&&
         (typeof x!=="number"||!Number.isFinite(x)||x<0||x>1)))
      throw new TypeError("Invalid reported agreement metrics");
  }
  return raw; // imported metrics remain unverified, not recomputed without image
}
export function compareBenchmarkReports(rawReports){
  if(!Array.isArray(rawReports)||rawReports.length<1||rawReports.length>200)
    throw new RangeError("Aggregate 1–200 image-level benchmark reports");
  const reports=rawReports.map(validateBenchmarkReport),origins=new Set(
    reports.map(r=>r.evidenceLevel));
  if(origins.size>1)throw new RangeError("Synthetic and manual benchmark reports cannot be mixed");
  const seen=new Set();
  for(const r of reports){
    const k=r.imageSHA256+"|"+r.observerCode;
    if(seen.has(k))throw new RangeError("Duplicate source-image / observer report");
    seen.add(k);
  }
  const plants=new Map();
  for(const r of reports){
    const rows=plants.get(r.plantId)||[];rows.push(r);plants.set(r.plantId,rows);
  }
  const plantSummaries=[...plants].map(([plantId,rows])=>{
    const detectorMeans=reports[0].detectors.map((d,i)=>{
      const values=rows.map(r=>r.detectors[i].f1).filter(x=>x!==null);
      return {detector:d.detector,meanReferenceF1:values.length?
        values.reduce((a,b)=>a+b,0)/values.length:null,
        comparableImages:values.length};
    });
    return {plantId,imageReports:rows.length,detectors:detectorMeans};
  }).sort((a,b)=>a.plantId.localeCompare(b.plantId));
  return {kind:"leaflab-vein-benchmark-summary",version:VEIN_BENCH_VERSION,
    evidenceLevel:reports[0].evidenceLevel,imageReportCount:reports.length,
    assertedPlantCount:plantSummaries.length,plantSummaries,
    limitations:[
      "Purely descriptive aggregation; report identities, metrics and image metadata are not authenticated",
      "Multiple images and observers from one plant are grouped, not independent plants",
      "No confidence intervals or confirmation; small samples and selection bias are uncontrolled",
      "Same-plant repeated photos and annotations can inflate apparent generalization",
      "Mean F1 scores against human lines do not establish anatomical ground truth"
    ]};
}
