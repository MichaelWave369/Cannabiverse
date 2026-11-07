// Φ LeafLab v1.5 · Real-photo, human-marked sparse-pixel QA.
// Annotations are self-asserted and may be biased: no full-image accuracy,
// botanical truth, or independent ground truth is inferred from scribbles.
import {REAL_LEAF_SOURCES} from "./real-photo-catalog.mjs";

export const REAL_IMAGE_QA_VERSION="1.5";
export const LABEL_UNREVIEWED=0,LABEL_LEAF=1,LABEL_BACKGROUND=2;
export const KNOWN_REAL_PHOTO_ORIGINALS=REAL_LEAF_SOURCES
  .filter(x=>x.independentlyFetchedSHA256&& !x.annotationOverlay)
  .map(x=>({
    id:x.id,title:x.title,license:x.license,author:x.author,
    commonsPage:x.commonsPage,originalUrl:x.originalUrl,
    sha256:x.independentlyFetchedSHA256,width:x.width,height:x.height,
    originalBytes:x.originalBytes
  }));
const MAX_DIMENSION=400,MAX_PIXELS=160000;
function checkFrame(width,height){
  if(!Number.isInteger(width)||!Number.isInteger(height)||
     width<16||height<16||width>MAX_DIMENSION||height>MAX_DIMENSION||
     width*height>MAX_PIXELS)
    throw new RangeError("QA frame must be 16–400 pixels and ≤160000 total pixels");
  return width*height;
}
function checkLabels(labels,width,height){
  const total=checkFrame(width,height);
  if(!(labels instanceof Uint8Array)||labels.length!==total||
     labels.some(x=>x!==LABEL_UNREVIEWED&&x!==LABEL_LEAF&&x!==LABEL_BACKGROUND))
    throw new TypeError("QA labels must be 0 unknown, 1 leaf, or 2 background in matching Uint8Array");
  return total;
}
const precision=x=>x===null?null:Number(x.toFixed(6));
const ratio=(a,b)=>b?precision(a/b):null;
function checkMask(mask,width,height){
  const total=checkFrame(width,height);
  if(!(mask instanceof Uint8Array)||mask.length!==total||
     mask.some(x=>x!==0&&x!==1))
    throw new TypeError("Prediction must be a same-frame binary Uint8Array mask");
}
export function identifyPhotoByOriginalHash(sha256,bytes,width,height){
  if(typeof sha256!=="string"||!/^[a-f0-9]{64}$/.test(sha256)||
     !Number.isInteger(bytes)||bytes<1||bytes>16*1024*1024||
     !Number.isInteger(width)||width<16||width>16000||
     !Number.isInteger(height)||height<16||height>16000)
    throw new TypeError("Need valid original image SHA-256, length and decoded dimensions");
  const item=KNOWN_REAL_PHOTO_ORIGINALS.find(x=>x.sha256===sha256);
  if(!item)return {
    status:"LOCAL_BYTES_HASHED_BUT_NOT_IN_APPROVED_CATALOG",
    originalSHA256:sha256,originalBytes:bytes,width,height,
    sourceId:null,title:null,sourceLicense:null,
    sourceWarning:"Unknown source metadata, real botanical identity and photo license not independently established"
  };
  if(item.originalBytes!==bytes||item.width!==width||item.height!==height)
    throw new RangeError("Photo SHA-256 matches known catalog entry, but bytes or decoded dimensions disagree");
  return {
    status:"KNOWN_WIKIMEDIA_ORIGINAL_SHA256_MATCH",
    originalSHA256:sha256,originalBytes:bytes,width,height,
    sourceId:item.id,title:item.title,
    sourceLicense:item.license,sourceCreator:item.author,
    sourceURL:item.commonsPage,
    sourceWarning:"Matching file bytes do not prove authentic species, veins, collection independence or anatomical truth"
  };
}
export function paintSparseLabels({labels,width,height,start,end,radius=6,kind}){
  checkLabels(labels,width,height);
  if(![LABEL_UNREVIEWED,LABEL_LEAF,LABEL_BACKGROUND].includes(kind))
    throw new RangeError("Brush type must be unreviewed, leaf or background");
  if(!Number.isInteger(radius)||radius<1||radius>24)
    throw new RangeError("Brush radius must be 1–24 pixels");
  for(const p of [start,end]){
    if(!p||!Number.isInteger(p.x)||!Number.isInteger(p.y)||
       p.x<0||p.x>=width||p.y<0||p.y>=height)
      throw new RangeError("Brush coordinates outside image frame");
  }
  const result=new Uint8Array(labels),distance=Math.hypot(end.x-start.x,end.y-start.y);
  const steps=Math.max(1,Math.ceil(distance*2));
  for(let step=0;step<=steps;step++){
    const t=step/steps,cx=Math.round(start.x+(end.x-start.x)*t),
      cy=Math.round(start.y+(end.y-start.y)*t);
    for(let dy=-radius;dy<=radius;dy++){
      const y=cy+dy;if(y<0||y>=height)continue;
      const reach=Math.floor(Math.sqrt(radius*radius-dy*dy));
      for(let dx=-reach;dx<=reach;dx++){
        const x=cx+dx;if(x>=0&&x<width)result[y*width+x]=kind;
      }
    }
  }
  return result;
}
export function sparseSampleAudit({mask,labels,width,height,minPerClass=20}){
  checkMask(mask,width,height);checkLabels(labels,width,height);
  if(!Number.isInteger(minPerClass)||minPerClass<1||minPerClass>1000)
    throw new RangeError("Minimum labeled points per class must be 1–1000 pixels");
  let leaf=0,background=0,tp=0,fp=0,fn=0,tn=0,
    predTotal=0;
  for(let i=0;i<mask.length;i++){
    const m=mask[i],l=labels[i];
    if(m)predTotal++;
    if(l===LABEL_LEAF){leaf++;if(m)tp++;else fn++;}
    else if(l===LABEL_BACKGROUND){background++;if(m)fp++;else tn++;}
  }
  const labeled=leaf+background,sufficient=leaf>=minPerClass&&
    background>=minPerClass;
  const metrics=sufficient?{
    precision:ratio(tp,tp+fp),recall:ratio(tp,tp+fn),
    specificity:ratio(tn,tn+fp),
    dice:ratio(2*tp,2*tp+fp+fn),
    intersectionOverUnion:ratio(tp,tp+fp+fn),
    balancedAccuracy:precision((ratio(tp,tp+fn)+ratio(tn,tn+fp))/2),
    sampleAccuracy:ratio(tp+tn,labeled)
  }:null;
  return {
    kind:"leaflab-sparse-annotation-qa",version:REAL_IMAGE_QA_VERSION,
    status:sufficient?
      "LABELED_PIXELS_ONLY_EXPLORATORY_AGREEMENT":
      "INSUFFICIENT_LABELED_PIXELS_NO_SCORES",
    width,height,totalImagePixels:mask.length,
    labeledLeafPixels:leaf,labeledBackgroundPixels:background,
    labeledPixels:labeled,unreviewedPixels:mask.length-labeled,
    labeledCoverage:ratio(labeled,mask.length),
    allPredictedLeafPixels:predTotal,
    confusionLabeledOnly:{truePositive:tp,falsePositive:fp,
      falseNegative:fn,trueNegative:tn},
    minimumPerClass:minPerClass,
    metrics,
    limitations:[
      "Hand-marked pixels are NOT independent biological vascular ground truth",
      "Only labeled pixels are evaluated. Unmarked pixels are excluded; these are NOT whole-image accuracy scores",
      "Brush marks are spatially correlated, non-random and cannot be interpreted as independent observations",
      "Observer can make errors and can intentionally or accidentally bias mask agreement",
      "A complete leaf outline or outside background may not be marked",
      "A leaf-color segmentation is not a detector of xylem/phloem or vein connectivity",
      "Source SHA-256 matching checks bytes, not biological species or sample independence"
    ]
  };
}
export function encodeSparseLabels(labels,width,height){
  checkLabels(labels,width,height);
  const runs=[];
  let value=labels[0],length=1;
  for(let i=1;i<labels.length;i++){
    if(labels[i]===value)length++;
    else{runs.push([value,length]);value=labels[i];length=1;}
  }
  runs.push([value,length]);
  return {format:"sparse-label-rle-v1",width,height,runs};
}
export function decodeSparseLabels(encoded){
  if(!encoded||encoded.format!=="sparse-label-rle-v1"||
     !Array.isArray(encoded.runs)||encoded.runs.length<1||
     encoded.runs.length>MAX_PIXELS)
    throw new TypeError("Expected bounded sparse-label-rle-v1 runs");
  const total=checkFrame(encoded.width,encoded.height),out=new Uint8Array(total);
  let at=0,prior=-1;
  for(const run of encoded.runs){
    if(!Array.isArray(run)||run.length!==2||
       ![LABEL_UNREVIEWED,LABEL_LEAF,LABEL_BACKGROUND].includes(run[0])||
       !Number.isInteger(run[1])||run[1]<1||run[0]===prior||
       at+run[1]>total)
      throw new RangeError("Invalid RLE label run or length");
    out.fill(run[0],at,at+run[1]);
    at+=run[1];prior=run[0];
  }
  if(at!==total)throw new RangeError("Sparse label RLE does not fill the expected image");
  return out;
}
export function makeRealImageQaReport({source,labels,width,height,mask,
  margin,foreground,background,seed,contrast,minRidgePixels,ridgeSummary,
  reviewRole="development"}){
  if(!source||!["KNOWN_WIKIMEDIA_ORIGINAL_SHA256_MATCH",
      "LOCAL_BYTES_HASHED_BUT_NOT_IN_APPROVED_CATALOG"].includes(source.status)||
     !/^[a-f0-9]{64}$/.test(source.originalSHA256))
    throw new TypeError("Requires a current-session local-byte photo identity result");
  checkLabels(labels,width,height);checkMask(mask,width,height);
  if(!["development","user-declared-holdout"].includes(reviewRole))
    throw new RangeError("Review role must be declared development or holdout");
  if(typeof margin!=="number"||!Number.isFinite(margin)||margin<-.3||margin>.65||
     !Number.isInteger(seed)||seed<0||seed>=width*height||
     ![foreground,background].every(rgb=>
       Array.isArray(rgb)&&rgb.length===3&&rgb.every(v=>Number.isInteger(v)&&v>=0&&v<=255))||
     !Number.isInteger(contrast)||contrast<3||contrast>70||
     !Number.isInteger(minRidgePixels)||minRidgePixels<2||minRidgePixels>100)
    throw new TypeError("Invalid frozen segmentation/ridge parameters");
  if(!ridgeSummary||!Number.isInteger(ridgeSummary.skeletonPixels)||
     !Number.isInteger(ridgeSummary.components))
    throw new TypeError("Missing candidate ridge summary");
  const audit=sparseSampleAudit({mask,labels,width,height});
  return {
    kind:"leaflab-real-photo-sparse-qa-report",
    version:REAL_IMAGE_QA_VERSION,
    evidenceStatus:"ORIGINAL_JPEG_BYTE_IDENTITY_CHECKED_BUT_LABELS_SELF_ASSERTED",
    source,
    processingFrame:{width,height},
    reviewRole,
    parameters:{margin,foreground:[...foreground],background:[...background],
      seed,contrast,minRidgePixels},
    sampleLabels:encodeSparseLabels(labels,width,height),
    audit,
    tentativeRidgeSummary:ridgeSummary,
    constraints:{
      shownPredictionsBeforeFirstAnnotationLock:false,
      cannotAttestIndependentBlindingOrUntouchedHoldout:true
    },
    limitations:[
      ...audit.limitations,
      "The original photo is NOT embedded in the JSON; re-open exact original bytes for independent evaluation",
      "RLE mask records user-drawn sparse labels; exported metrics are unsigned and can be edited",
      "Holdout is a user declaration, NOT an immutable registered experiment",
      "Ridge summaries remain unverified image contrast features, never confirmed plant vessels",
      "User may have seen the detector in other sessions; UI sequencing is not proof of blinding"
    ]
  };
}
