// Φ LeafLab v1.6 · Complete, human-asserted leaf contour masks.
// A filled 0/1 raster is full-frame labeling relative to the observer's chosen
// target definition. It is NOT certified botanical ground truth.
import {identifyPhotoByOriginalHash} from "./real-image-qa.mjs";

export const FULL_MASK_VERSION="1.6";
export const MASK_TARGETS=["single-prominent-leaf","all-visible-leaves"];
export const MASK_ROLES=["development","user-declared-holdout"];
const HASH=/^[a-f0-9]{64}$/,ID=/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const MAX_PIXELS=160000,MAX_POLYGONS=48,MAX_VERTICES=240;
const fixed=x=>Number(x.toFixed(6));
const divided=(n,d)=>d?fixed(n/d):null;
const validId=(x,name)=>{
  if(typeof x!=="string"||!ID.test(x))
    throw new TypeError(name+" must be a 1–64 character alphanumeric ID");
  return x;
};
const frame=(width,height)=>{
  if(!Number.isInteger(width)||!Number.isInteger(height)||
    width<16||height<16||width>400||height>400||
    width*height>MAX_PIXELS)
    throw new RangeError("Mask frame must be 16–400 pixels per dimension");
  return width*height;
};
const axis=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const strictCross=(a,b,c,d)=>{
  // Crossing segments, including intersections at collinear internal points.
  const ab1=axis(a,b,c),ab2=axis(a,b,d),cd1=axis(c,d,a),cd2=axis(c,d,b);
  const between=(p,q,r)=>r.x>=Math.min(p.x,q.x)&&r.x<=Math.max(p.x,q.x)&&
    r.y>=Math.min(p.y,q.y)&&r.y<=Math.max(p.y,q.y);
  return (ab1===0&&between(a,b,c))||(ab2===0&&between(a,b,d))||
    (cd1===0&&between(c,d,a))||(cd2===0&&between(c,d,b))||
    ((ab1>0)!==(ab2>0)&&(cd1>0)!==(cd2>0));
};
function validatePolygon(p,width,height){
  if(!p||!["include","exclude"].includes(p.operation)||
    !Array.isArray(p.vertices)||p.vertices.length<3||
    p.vertices.length>MAX_VERTICES)
    throw new TypeError("Each include/exclude polygon needs 3–240 vertices");
  const vertices=p.vertices.map(pt=>{
    if(!Array.isArray(pt)||pt.length!==2||!pt.every(Number.isInteger)||
      pt[0]<0||pt[1]<0||pt[0]>width||pt[1]>height)
      throw new RangeError("Polygon vertices must be integer in-frame coordinates");
    return {x:pt[0],y:pt[1]};
  });
  const n=vertices.length;
  for(let i=0;i<n;i++)if(vertices[i].x===vertices[(i+1)%n].x&&
    vertices[i].y===vertices[(i+1)%n].y)
    throw new RangeError("Polygon has zero-length edge");
  let area=0;
  for(let i=0;i<n;i++){
    const a=vertices[i],b=vertices[(i+1)%n];
    area+=a.x*b.y-b.x*a.y;
  }
  if(Math.abs(area)<1)throw new RangeError("Polygon has no meaningful area");
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
    if(j===i+1||(i===0&&j===n-1))continue;
    if(strictCross(vertices[i],vertices[(i+1)%n],
      vertices[j],vertices[(j+1)%n]))
      throw new RangeError("Self-intersecting polygon is not a valid reference boundary");
  }
  return {operation:p.operation,vertices:vertices.map(p=>[p.x,p.y])};
}
function inside(x,y,vertices){
  let result=false;
  for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){
    const [xi,yi]=vertices[i],[xj,yj]=vertices[j];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)result=!result;
  }
  return result;
}
function normalizePolygons(polygons,width,height){
  frame(width,height);
  if(!Array.isArray(polygons)||!polygons.length||polygons.length>MAX_POLYGONS)
    throw new RangeError("Provide 1–48 include/exclude complete-outline polygons");
  let included=false,vertices=0;
  const list=polygons.map(x=>{
    const p=validatePolygon(x,width,height);
    if(p.operation==="exclude"&&!included)
      throw new RangeError("Cannot exclude before defining a leaf region");
    if(p.operation==="include")included=true;
    vertices+=p.vertices.length;
    if(vertices>3000)throw new RangeError("Maximum 3000 polygon vertices per reference");
    return p;
  });
  if(!included)throw new RangeError("At least one leaf region required");
  return list;
}
export function rasterizeCompletePolygons(polygons,width,height){
  const n=frame(width,height),ps=normalizePolygons(polygons,width,height);
  const mask=new Uint8Array(n);
  for(const p of ps){
    const xs=p.vertices.map(x=>x[0]),ys=p.vertices.map(x=>x[1]);
    const minX=Math.max(0,Math.floor(Math.min(...xs))),
      maxX=Math.min(width-1,Math.ceil(Math.max(...xs))),
      minY=Math.max(0,Math.floor(Math.min(...ys))),
      maxY=Math.min(height-1,Math.ceil(Math.max(...ys)));
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)
      if(inside(x+.5,y+.5,p.vertices))mask[y*width+x]=
        p.operation==="include"?1:0;
  }
  let foreground=0;for(const x of mask)foreground+=x;
  if(!foreground||foreground>=n)
    throw new RangeError("Complete reference needs both leaf and non-leaf pixels");
  return mask;
}
function countMask(mask){let leaf=0;for(const v of mask)leaf+=v;return leaf;}
function sourceFields(raw){
  const width=raw?.width??raw?.originalWidth,
    height=raw?.height??raw?.originalHeight;
  if(!raw||!HASH.test(raw.originalSHA256)||
     !Number.isInteger(raw.originalBytes)||
     !Number.isInteger(width)||!Number.isInteger(height))
    throw new TypeError("Reference needs a source photo with original file SHA-256 and decoded dimensions");
  const identity=identifyPhotoByOriginalHash(raw.originalSHA256,
    raw.originalBytes,width,height);
  return {
    originalSHA256:identity.originalSHA256,
    originalBytes:identity.originalBytes,
    originalWidth:identity.width,originalHeight:identity.height,
    sourceId:identity.sourceId,
    sourceStatus:identity.status,
    sourceLicense:identity.sourceLicense||null,
    sourceURL:identity.sourceURL||null
  };
}
export function createCompleteMaskReference(raw){
  if(!raw||raw.completed!==true)
    throw new RangeError("Observer must affirm whole-frame leaf/background completion");
  const {width,height}=raw.processingFrame||{};
  const n=frame(width,height),polygons=normalizePolygons(raw.polygons,width,height),
    source=sourceFields(raw.source);
  const plantId=validId(raw.plantId,"Plant ID"),
    specimenId=validId(raw.specimenId,"Specimen ID"),
    observerCode=validId(raw.observerCode,"Observer code");
  if(!MASK_TARGETS.includes(raw.targetDefinition))
    throw new RangeError("Declare whether target is one prominent leaf or all visible leaves");
  if(!MASK_ROLES.includes(raw.reviewRole))
    throw new RangeError("Declare development vs self-declared holdout");
  if(!["not-attested","observer-self-attested-independent"].includes(raw.independence))
    throw new RangeError("Observer independence declaration invalid");
  const mask=rasterizeCompletePolygons(polygons,width,height),leaf=countMask(mask);
  return {
    kind:"leaflab-complete-mask-reference",version:FULL_MASK_VERSION,
    evidenceStatus:"SELF_ASSERTED_FULL_FRAME_HUMAN_CONTOUR_NOT_BOTANICAL_TRUTH",
    plantId,specimenId,observerCode,source,
    processingFrame:{width,height},targetDefinition:raw.targetDefinition,
    reviewRole:raw.reviewRole,independence:raw.independence,
    completed:true,polygons,
    maskSummary:{totalPixels:n,leafPixels:leaf,nonLeafPixels:n-leaf,
      fullFrameLabelsAssigned:true},
    limitations:[
      "Every pixel is classified by inclusion/exclusion contours but the human-defined region may be incomplete or wrong",
      "Completeness, independence, species, photo permissions, target leaf identity and botanical correctness are self-asserted",
      "An original-file hash in exported JSON is not proof it was rechecked by an independent party",
      "Mask boundaries use a 320px maximum raster and pixel-center fill, not physical leaf dimensions",
      "The declared plant-level role does NOT establish preregistration or unseen evaluation"
    ]
  };
}
export function parseCompleteMaskReference(raw){
  if(!raw||raw.kind!=="leaflab-complete-mask-reference"||
     raw.version!==FULL_MASK_VERSION)
    throw new TypeError("Expected LeafLab v1.6 complete-mask reference JSON");
  const corrected=createCompleteMaskReference(raw);
  if(raw.maskSummary&&JSON.stringify(raw.maskSummary)!==
     JSON.stringify(corrected.maskSummary))
    throw new RangeError("Reference mask summary does not match polygon rasterization");
  if(raw.evidenceStatus!==corrected.evidenceStatus)
    throw new RangeError("Reference evidence status cannot be reclassified");
  return corrected;
}
function ready(ref){
  const parsed=parseCompleteMaskReference(ref);
  return {ref:parsed,mask:rasterizeCompletePolygons(parsed.polygons,
    parsed.processingFrame.width,parsed.processingFrame.height)};
}
function matchingPair(a,b){
  if(a.source.originalSHA256!==b.source.originalSHA256||
     a.source.originalBytes!==b.source.originalBytes||
     a.source.originalWidth!==b.source.originalWidth||
     a.source.originalHeight!==b.source.originalHeight||
     a.plantId!==b.plantId||a.specimenId!==b.specimenId||
     a.processingFrame.width!==b.processingFrame.width||
     a.processingFrame.height!==b.processingFrame.height||
     a.targetDefinition!==b.targetDefinition||
     a.reviewRole!==b.reviewRole)
    throw new RangeError("Pair must use same original image, plant, specimen, target, frame and declared role");
  if(a.observerCode===b.observerCode)
    throw new RangeError("Two references need distinct observer codes");
}
function countAgreement(a,b){
  let both=0,aOnly=0,bOnly=0,none=0;
  for(let i=0;i<a.length;i++){
    if(a[i]&&b[i])both++;
    else if(a[i])aOnly++;
    else if(b[i])bOnly++;
    else none++;
  }
  const union=both+aOnly+bOnly;
  return {bothLeaf:both,onlyObserverA:aOnly,onlyObserverB:bOnly,
    bothNonLeaf:none,disagreementPixels:aOnly+bOnly,
    intersectionOverUnion:divided(both,union),
    dice:divided(2*both,2*both+aOnly+bOnly),
    agreementFraction:divided(both+none,a.length)};
}
export function compareCompleteReferences(one,two){
  const a=ready(one),b=ready(two);matchingPair(a.ref,b.ref);
  const metrics=countAgreement(a.mask,b.mask);
  const disagreement=new Uint8Array(a.mask.length);
  for(let i=0;i<disagreement.length;i++)
    disagreement[i]=a.mask[i]?b.mask[i]?1:2:b.mask[i]?3:0;
  return {
    kind:"leaflab-complete-mask-pair-review",version:FULL_MASK_VERSION,
    evidenceStatus:"PAIRWISE_HUMAN_CONTOUR_AGREEMENT_NOT_GROUND_TRUTH",
    originalSHA256:a.ref.source.originalSHA256,
    plantId:a.ref.plantId,specimenId:a.ref.specimenId,
    observerA:a.ref.observerCode,observerB:b.ref.observerCode,
    targetDefinition:a.ref.targetDefinition,reviewRole:a.ref.reviewRole,
    frame:a.ref.processingFrame,
    independentObserversSelfAttested:
      a.ref.independence==="observer-self-attested-independent"&&
      b.ref.independence==="observer-self-attested-independent",
    metrics,
    disagreement,
    limitations:[
      "High agreement between human drawings does not establish correctness of cannabis leaf anatomy",
      "The two annotators might be correlated, unblinded or even the same person",
      "The disagreement overlay is a raster in source processing coordinates; it is not signed",
      "No model accuracy, generalization or independent study preregistration is demonstrated"
    ]
  };
}
function checkPrediction(mask,n){
  if(!(mask instanceof Uint8Array)||mask.length!==n||mask.some(x=>x!==0&&x!==1))
    throw new TypeError("Prediction must be a matching-frame binary Uint8Array");
}
function againstReference(pred,ref){
  let tp=0,fp=0,fn=0,tn=0;
  for(let i=0;i<pred.length;i++){
    if(pred[i]&&ref[i])tp++;else if(pred[i])fp++;
    else if(ref[i])fn++;else tn++;
  }
  return {truePositive:tp,falsePositive:fp,falseNegative:fn,trueNegative:tn,
    intersectionOverUnion:divided(tp,tp+fp+fn),
    dice:divided(2*tp,2*tp+fp+fn),
    precision:divided(tp,tp+fp),recall:divided(tp,tp+fn),
    specificity:divided(tn,tn+fp)};
}
export function benchmarkCompleteReferencePair(mask,one,two){
  const pair=compareCompleteReferences(one,two);
  checkPrediction(mask,pair.frame.width*pair.frame.height);
  const a=ready(one).mask,b=ready(two).mask;
  const against=[
    {observerCode:pair.observerA,...againstReference(mask,a)},
    {observerCode:pair.observerB,...againstReference(mask,b)}
  ];
  const iou=against.map(x=>x.intersectionOverUnion).filter(x=>x!==null);
  const dice=against.map(x=>x.dice).filter(x=>x!==null);
  return {
    kind:"leaflab-dual-human-reference-benchmark",version:FULL_MASK_VERSION,
    evidenceStatus:"MODEL_VS_TWO_SELF_ASSERTED_COMPLETE_HUMAN_MASKS",
    sourceSHA256:pair.originalSHA256,plantId:pair.plantId,
    specimenId:pair.specimenId,targetDefinition:pair.targetDefinition,
    reviewRole:pair.reviewRole,frame:pair.frame,
    referencePairAgreement:pair.metrics,
    perObserver:against,
    observedReferenceRange:{
      intersectionOverUnion:iou.length?[fixed(Math.min(...iou)),fixed(Math.max(...iou))]:null,
      dice:dice.length?[fixed(Math.min(...dice)),fixed(Math.max(...dice))]:null
    },
    limitations:[
      "Two human masks can be wrong in correlated ways; scores are reference-relative, not verified botanical truth",
      "Dual observer score ranges are not confidence intervals or independent test accuracy estimates",
      "One photograph or an unverified plant identity does not establish performance on unseen plants",
      "Model parameter tuning on the evaluated images invalidates a genuine untouched holdout claim"
    ]
  };
}
export function auditCompleteReferenceCohort(raw){
  if(!Array.isArray(raw)||!raw.length||raw.length>72)
    throw new RangeError("Provide 1–72 complete mask reference JSON files");
  const refs=raw.map(parseCompleteMaskReference);
  const byHash=new Map(),bySpecimen=new Map(),roles=new Map(),
    codeKeys=new Set();
  for(const r of refs){
    const hash=r.source.originalSHA256,key=hash+"|"+r.observerCode;
    if(codeKeys.has(key))throw new RangeError("Duplicate observer on same original source");
    codeKeys.add(key);
    if(bySpecimen.has(r.specimenId)&&bySpecimen.get(r.specimenId)!==hash)
      throw new RangeError("Specimen ID reused across original photographs");
    bySpecimen.set(r.specimenId,hash);
    if(roles.has(r.plantId)&&roles.get(r.plantId)!==r.reviewRole)
      throw new RangeError("Plant-level development/holdout leakage");
    roles.set(r.plantId,r.reviewRole);
    let group=byHash.get(hash);
    if(!group){group=[];byHash.set(hash,group);}
    if(group.length)matchingPair(group[0],r);
    group.push(r);
    if(group.length>3)throw new RangeError("Maximum three observers per original image");
  }
  const images=[...byHash].sort(([a],[b])=>a.localeCompare(b)).map(([hash,recs])=>{
    const ordered=[...recs].sort((a,b)=>a.observerCode.localeCompare(b.observerCode));
    const pairs=[];
    for(let i=0;i<ordered.length;i++)for(let j=i+1;j<ordered.length;j++){
      const p=compareCompleteReferences(ordered[i],ordered[j]);
      pairs.push({observerA:p.observerA,observerB:p.observerB,...p.metrics,
        independenceSelfAttested:p.independentObserversSelfAttested});
    }
    return {originalSHA256:hash,plantId:ordered[0].plantId,
      specimenId:ordered[0].specimenId,targetDefinition:ordered[0].targetDefinition,
      reviewRole:ordered[0].reviewRole,observers:ordered.map(x=>x.observerCode),
      pairCount:pairs.length,pairs,
      reviewState:pairs.length?"PAIRED_SELF_ASSERTED_REVIEW":"SECOND_OBSERVER_MISSING",
      meanObserverIoU:pairs.length?fixed(pairs.reduce((s,p)=>
        s+p.intersectionOverUnion,0)/pairs.length):null};
  });
  const counts={development:0,holdout:0};
  for(const role of roles.values())counts[role==="development"?
    "development":"holdout"]++;
  return {
    kind:"leaflab-complete-reference-cohort-audit",version:FULL_MASK_VERSION,
    status:"SELF_ASSERTED_SOURCES_ROLES_AND_OBSERVERS_NOT_EXTERNALLY_VERIFIED",
    referenceCount:refs.length,imageCount:images.length,
    plantCount:roles.size,developmentPlantCount:counts.development,
    declaredHoldoutPlantCount:counts.holdout,
    pairedImageCount:images.filter(x=>x.pairCount>0).length,
    incompleteImageCount:images.filter(x=>!x.pairCount).length,
    images,
    limitations:[
      "A plant split declared inside mutable JSON is not preregistered or verifiably untouched",
      "Distinct plant IDs may still refer to one physical plant; image hashes can describe different views of the same subject",
      "Complete outlines are user-asserted and human agreement is not independently authenticated",
      "Mean pair metrics describe individual images, not independent botanical study samples"
    ]
  };
}
