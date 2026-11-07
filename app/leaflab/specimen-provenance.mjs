// Φ LeafLab v1.3 · Local original-image identity + specimen protocol metadata.
// A successful checksum verifies bytes ↔ metadata only, NOT species or anatomy.
import {parseVeinReference} from "./vein-benchmark.mjs";

export const SPECIMEN_VERSION="1.3";
const MAX_IMAGES=36,MAX_REFS=72;
const id=(s,name)=>{
  if(typeof s!=="string"||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(s))
    throw new TypeError(name+" needs a 1–64 char alphanumeric ID");
  return s;
};
const hash=s=>typeof s==="string"&&/^[a-f0-9]{64}$/.test(s);
const choose=(v,allowed,name)=>{
  if(!allowed.includes(v))throw new RangeError(name+" invalid option");
  return v;
};
const short=(v,max,name,{empty=false}={})=>{
  if(typeof v!=="string"||v.length>max||(!empty&&!v.trim())||
     /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v))
    throw new TypeError(name+" must be "+(empty?"0–":"1–")+max+" readable chars");
  return v.trim();
};
const dateString=s=>{
  if(typeof s!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
  const [y,m,d]=s.split("-").map(Number);
  if(y<1900||y>2200||m<1||m>12)return false;
  const test=new Date(Date.UTC(y,m-1,d));
  return test.getUTCFullYear()===y&&test.getUTCMonth()===m-1&&test.getUTCDate()===d;
};
const int=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
export function processingDimensions(width,height){
  if(!int(width,16,16000)||!int(height,16,16000))
    throw new RangeError("Original decoded image dimensions must be 16–16000 pixels");
  const scale=Math.min(1,320/Math.max(width,height));
  const processedWidth=Math.round(width*scale);
  const processedHeight=Math.round(height*scale);
  if(processedWidth<16||processedHeight<16)
    throw new RangeError("Image too narrow after maximum-320px processing resize");
  return {processedWidth,processedHeight};
}
export function makeSpecimenRecord(raw){
  if(!raw||!hash(raw.imageSHA256))
    throw new TypeError("Specimen must include lowercase original-file SHA-256");
  const width=raw.originalWidth,height=raw.originalHeight;
  const dims=processingDimensions(width,height);
  if(!int(raw.photoBytes,1,16*1024*1024))
    throw new RangeError("Photo must be nonempty and at most 16 MB");
  if(raw.processedWidth!==dims.processedWidth||
     raw.processedHeight!==dims.processedHeight)
    throw new RangeError("Recorded processing dimensions do not match v0.7 scaling");
  if(!dateString(raw.captureDate))throw new RangeError("Capture date must be real YYYY-MM-DD");
  return {
    kind:"leaflab-source-specimen-record",version:SPECIMEN_VERSION,
    plantId:id(raw.plantId,"Plant ID"),
    specimenId:id(raw.specimenId,"Specimen ID"),
    imageSHA256:raw.imageSHA256,
    originalFilename:short(raw.originalFilename,180,"Photo filename"),
    photoBytes:raw.photoBytes,
    originalWidth:width,originalHeight:height,
    ...dims,captureDate:raw.captureDate,
    taxonLabel:short(raw.taxonLabel,100,"Taxon label"),
    taxonBasis:choose(raw.taxonBasis,
      ["unverified","photographic-self-assertion","expert-review-self-assertion"],"Taxon basis"),
    taxonEvidenceNote:short(raw.taxonEvidenceNote||"",300,"Taxon evidence note",{empty:true}),
    growthStage:choose(raw.growthStage,
      ["unknown","vegetative","flowering","post-harvest"],"Growth stage"),
    lighting:choose(raw.lighting,
      ["unknown","diffuse","direct","mixed"],"Lighting"),
    cameraAngle:choose(raw.cameraAngle,
      ["unknown","near-perpendicular","oblique"],"Camera angle"),
    backgroundType:choose(raw.backgroundType,
      ["unknown","plain","cluttered"],"Background"),
    scaleMarkerVisible:raw.scaleMarkerVisible===true,
    permissionStatement:choose(raw.permissionStatement,
      ["not-recorded","self-attested-permission"],"Photo permission"),
    observerBlinding:choose(raw.observerBlinding,
      ["not-recorded","self-attested-blinded"],"Observer blinding"),
    collectionNote:short(raw.collectionNote||"",500,"Collection note",{empty:true}),
    limitations:[
      "This is supplied specimen metadata; plant identities, taxon, permission, expert review and blinding are not independently verified",
      "No precise location, subject names or identifying contact details are required",
      "Original-byte SHA-256 authenticates exact file identity only when recalculated against the actual file"
    ]
  };
}
export function parseSpecimenRecord(raw){
  if(!raw||raw.kind!=="leaflab-source-specimen-record"||
     raw.version!==SPECIMEN_VERSION)
    throw new TypeError("Expected v1.3 specimen metadata JSON");
  return makeSpecimenRecord(raw);
}
// Verification requires actual local photo bytes. No browser APIs are hidden
// in the core: callers inject Web Crypto SubtleCrypto in both browser and tests.
export async function verifyOriginalPhoto(record,bytes,decodedWidth,decodedHeight,subtle){
  const r=parseSpecimenRecord(record);
  if(!(bytes instanceof ArrayBuffer)&&!ArrayBuffer.isView(bytes))
    throw new TypeError("Need original local image file bytes");
  const view=bytes instanceof ArrayBuffer?new Uint8Array(bytes):
    new Uint8Array(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(view.byteLength!==r.photoBytes)
    throw new RangeError("Original photo byte length mismatch");
  if(decodedWidth!==r.originalWidth||decodedHeight!==r.originalHeight)
    throw new RangeError("Decoded image width/height differs from registered source");
  if(!subtle||typeof subtle.digest!=="function")
    throw new TypeError("Secure Web Crypto SHA-256 required");
  const digest=await subtle.digest("SHA-256",view);
  const hex=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,"0")).join("");
  if(hex!==r.imageSHA256)throw new RangeError("Original photo SHA-256 mismatch");
  return {verified:true,imageSHA256:hex,
    status:"ORIGINAL_FILE_BYTES_MATCHED_IN_ACTIVE_SESSION",
    originalWidth:decodedWidth,originalHeight:decodedHeight,
    limitations:[
      "This is a current-session byte match, not a signature or persistent third-party attestation",
      "File bytes can correspond to an edited photo and still pass SHA-256 identity checks",
      "Taxon, image content, rights and observer identity are not authenticated"
    ]};
}
export function auditSpecimenRegistry(rawRecords,rawReferences=[],sessionVerifiedHashes=[]){
  if(!Array.isArray(rawRecords)||rawRecords.length<1||rawRecords.length>MAX_IMAGES)
    throw new RangeError("Registry needs 1–36 specimen records");
  if(!Array.isArray(rawReferences)||rawReferences.length>MAX_REFS)
    throw new RangeError("Registry accepts 0–72 v0.7 annotation references");
  const records=rawRecords.map(parseSpecimenRecord),refs=rawReferences.map(parseVeinReference);
  const byHash=new Map(),bySpecimen=new Map(),byPlant=new Map();
  for(const r of records){
    if(byHash.has(r.imageSHA256))throw new RangeError("Duplicate original photo hash");
    if(bySpecimen.has(r.specimenId))throw new RangeError("Specimen ID reused across photos");
    byHash.set(r.imageSHA256,r);bySpecimen.set(r.specimenId,r);
    const group=byPlant.get(r.plantId)||[];group.push(r);byPlant.set(r.plantId,group);
  }
  if(!Array.isArray(sessionVerifiedHashes)||
    sessionVerifiedHashes.some(x=>!hash(x)))
    throw new TypeError("Local verification hash set must contain 64-byte lowercase hex values");
  const verified=new Set(sessionVerifiedHashes);
  if([...verified].some(x=>!byHash.has(x)))throw new RangeError("Verified hash absent from registry");
  const mapped=new Map(),dupes=new Set(),orphanHashes=new Set();
  for(const ref of refs){
    const key=ref.imageSHA256+"|"+ref.annotatorCode;
    if(dupes.has(key))throw new RangeError("Duplicate observer reference on same photo");
    dupes.add(key);
    const source=byHash.get(ref.imageSHA256);
    if(!source){orphanHashes.add(ref.imageSHA256);continue;}
    if(ref.origin!=="manual")
      throw new RangeError("Synthetic annotations cannot be attached to source photograph registry");
    if(ref.plantId!==source.plantId||ref.specimenId!==source.specimenId||
       ref.width!==source.processedWidth||ref.height!==source.processedHeight)
      throw new RangeError("Reference hash matched but plant/specimen/processing dimensions differ");
    const arr=mapped.get(ref.imageSHA256)||[];
    arr.push(ref.annotatorCode);
    if(arr.length>3)throw new RangeError("At most three masked observers on one image");
    mapped.set(ref.imageSHA256,arr);
  }
  const images=records.map(r=>{
    const observers=(mapped.get(r.imageSHA256)||[]).sort(),warnings=[];
    if(!verified.has(r.imageSHA256))warnings.push("ORIGINAL_PHOTO_BYTES_NOT_CHECKED_IN_SESSION");
    if(r.permissionStatement!=="self-attested-permission")warnings.push("PERMISSION_NOT_RECORDED");
    if(r.taxonBasis==="unverified")warnings.push("TAXON_IDENTITY_NOT_ASSERTED");
    if(r.taxonBasis==="expert-review-self-assertion"&&!r.taxonEvidenceNote)
      warnings.push("EXPERT_REVIEW_DETAILS_MISSING");
    if(r.lighting!=="diffuse")warnings.push("LIGHTING_NOT_RECORDED_AS_DIFFUSE");
    if(r.cameraAngle!=="near-perpendicular")warnings.push("VIEW_NOT_RECORDED_AS_PERPENDICULAR");
    if(r.backgroundType!=="plain")warnings.push("BACKGROUND_NOT_RECORDED_AS_PLAIN");
    if(!r.scaleMarkerVisible)warnings.push("NO_RECORDED_SCALE_MARKER");
    if(r.observerBlinding!=="self-attested-blinded")warnings.push("BLINDING_NOT_RECORDED");
    if(observers.length<2)warnings.push("INDEPENDENT_SECOND_ANNOTATION_MISSING");
    return {plantId:r.plantId,specimenId:r.specimenId,imageSHA256:r.imageSHA256,
      localByteCheck:verified.has(r.imageSHA256)?"PASS_IN_ACTIVE_SESSION":"NOT_CHECKED",
      observerCodes:observers,observerCount:observers.length,
      recordedProtocolFieldsPresent:warnings.filter(x=>x!=="ORIGINAL_PHOTO_BYTES_NOT_CHECKED_IN_SESSION").length===0,
      warnings};
  }).sort((a,b)=>a.specimenId.localeCompare(b.specimenId));
  const plants=[...byPlant].sort(([a],[b])=>a.localeCompare(b))
    .map(([plantId,rr])=>({plantId,photoCount:rr.length,
      verifiedPhotoCount:rr.filter(x=>verified.has(x.imageSHA256)).length,
      independentReviewPhotoCount:rr.filter(x=>(mapped.get(x.imageSHA256)||[]).length>=2).length}));
  return {
    kind:"leaflab-source-specimen-audit",version:SPECIMEN_VERSION,
    evidenceStatus:"USER_ASSERTED_METADATA_WITH_ACTIVE_SESSION_BYTE_CHECKS",
    images,plants,
    specimenCount:records.length,plantCount:plants.length,
    referenceCount:refs.length,sessionByteVerifiedCount:images.filter(x=>
      x.localByteCheck==="PASS_IN_ACTIVE_SESSION").length,
    secondObserverImageCount:images.filter(x=>x.observerCount>=2).length,
    flaggedImageCount:images.filter(x=>x.warnings.length>0).length,
    unmatchedReferenceHashes:[...orphanHashes].sort(),
    limitations:[
      "An active-session file byte match proves exact image-file identity, never species or real vessels",
      "All botanical classification, source rights, stage and blinding remain self-attested",
      "Imported audit JSON can be edited; exported byte-check statuses are not a cryptographic certificate",
      "A complete checklist is not equivalent to independent botanical review or study preregistration",
      "No actual plant specimens, expert annotations or verified measurements ship with this software"
    ]
  };
}
