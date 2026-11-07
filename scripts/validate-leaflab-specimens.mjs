import assert from "node:assert/strict";
import {createHash,webcrypto} from "node:crypto";
import {readFileSync} from "node:fs";
import {makeVeinReference} from "../app/leaflab/vein-benchmark.mjs";
import {SPECIMEN_VERSION,processingDimensions,makeSpecimenRecord,
  parseSpecimenRecord,verifyOriginalPhoto,auditSpecimenRegistry}
  from "../app/leaflab/specimen-provenance.mjs";

assert.equal(SPECIMEN_VERSION,"1.3");
assert.deepEqual(processingDimensions(640,480),{
  processedWidth:320,processedHeight:240});
assert.deepEqual(processingDimensions(160,120),{
  processedWidth:160,processedHeight:120});
assert.deepEqual(processingDimensions(320,240),{
  processedWidth:320,processedHeight:240});
assert.throws(()=>processingDimensions(16000,16),/too narrow/);
assert.throws(()=>processingDimensions(16,16000),/too narrow/);
assert.throws(()=>processingDimensions(50000,500),/dimensions/);

const bytes=new TextEncoder().encode("FAKE_SYNTHETIC_PHOTO_BYTES_FOR_SHA256_REGRESSION");
const photoHash=createHash("sha256").update(bytes).digest("hex");
const bytes2=new TextEncoder().encode("SECOND_SYNTHETIC_PHOTO_BYTES_FOR_SHA256_REGRESSION");
const hash2=createHash("sha256").update(bytes2).digest("hex");
const base={
  plantId:"Plant_A",specimenId:"Image_1",imageSHA256:photoHash,
  originalFilename:"synthetic-fixture.bin",photoBytes:bytes.byteLength,
  originalWidth:640,originalHeight:480,processedWidth:320,processedHeight:240,
  captureDate:"2026-10-10",taxonLabel:"Unidentified plant",taxonBasis:"unverified",
  taxonEvidenceNote:"",growthStage:"unknown",lighting:"unknown",
  cameraAngle:"unknown",backgroundType:"unknown",scaleMarkerVisible:false,
  permissionStatement:"not-recorded",observerBlinding:"not-recorded",
  collectionNote:"Synthetic bytes, not an actual image"
};
const record=makeSpecimenRecord(base);
assert.equal(record.kind,"leaflab-source-specimen-record");
assert.equal(record.version,"1.3");
assert.deepEqual(record,parseSpecimenRecord(record));
assert.equal(record.originalWidth,640);
assert.equal(record.processedHeight,240);
assert.equal(record.plantId,"Plant_A");
assert.equal(record.imageSHA256,photoHash);
assert.throws(()=>makeSpecimenRecord({...base,imageSHA256:"BAD"}),/SHA-256/);
assert.throws(()=>makeSpecimenRecord({...base,plantId:"="}),/Plant ID/);
assert.throws(()=>makeSpecimenRecord({...base,specimenId:"Not valid!"}),/Specimen ID/);
assert.throws(()=>makeSpecimenRecord({...base,originalWidth:1000}),/processing dimensions/);
assert.throws(()=>makeSpecimenRecord({...base,processedHeight:239}),/processing dimensions/);
assert.throws(()=>makeSpecimenRecord({...base,photoBytes:0}),/Photo must/);
assert.throws(()=>makeSpecimenRecord({...base,photoBytes:16*1024*1024+1}),/Photo must/);
assert.throws(()=>makeSpecimenRecord({...base,captureDate:"2026-02-30"}),/Capture date/);
assert.throws(()=>makeSpecimenRecord({...base,captureDate:"10-10-2026"}),/Capture date/);
assert.throws(()=>makeSpecimenRecord({...base,lighting:"rainbows"}),/Lighting/);
assert.throws(()=>makeSpecimenRecord({...base,permissionStatement:"verified-permission"}),/Photo permission/);
assert.throws(()=>makeSpecimenRecord({...base,taxonBasis:"verified-by-us"}),/Taxon basis/);
assert.throws(()=>makeSpecimenRecord({...base,taxonLabel:""}),/Taxon label/);
assert.throws(()=>parseSpecimenRecord({...record,version:"0.9"}),/v1.3/);
assert.throws(()=>parseSpecimenRecord({...record,kind:"incorrect-kind"}),/v1.3/);

const matched=await verifyOriginalPhoto(record,bytes,640,480,webcrypto.subtle);
assert.equal(matched.verified,true);
assert.equal(matched.imageSHA256,photoHash);
assert.equal(matched.status,"ORIGINAL_FILE_BYTES_MATCHED_IN_ACTIVE_SESSION");
assert.throws(()=>verifyOriginalPhoto(record,bytes,639,480,webcrypto.subtle),
  /Decoded image width\/height/);
await assert.rejects(
  ()=>verifyOriginalPhoto(record,new Uint8Array(bytes.byteLength),640,480,webcrypto.subtle),
  /SHA-256 mismatch/);
await assert.rejects(
  ()=>verifyOriginalPhoto(record,new Uint8Array(bytes.byteLength-1),640,480,webcrypto.subtle),
  /byte length mismatch/);
await assert.rejects(
  ()=>verifyOriginalPhoto(record,bytes,640,480,{}),
  /Secure Web Crypto/);
// This input has a real SHA-256 digest, but absolutely no actual plant photo.
assert.ok(record.originalFilename.endsWith(".bin"));
const good={
  ...base,taxonLabel:"User-labeled plant",taxonBasis:"photographic-self-assertion",
  taxonEvidenceNote:"User visual description only",lighting:"diffuse",
  cameraAngle:"near-perpendicular",backgroundType:"plain",
  scaleMarkerVisible:true,permissionStatement:"self-attested-permission",
  observerBlinding:"self-attested-blinded"
};
const highQuality=makeSpecimenRecord(good);
const obs=id=>makeVeinReference({
  specimenId:"Image_1",plantId:"Plant_A",annotatorCode:id,
  imageSHA256:photoHash,width:320,height:240,origin:"manual",
  paths:[[[150,70],[155,105],[160,140]]]
});
const alpha=obs("Masked_A"),beta=obs("Masked_B");
const empty=auditSpecimenRegistry([record],[]);
assert.equal(empty.specimenCount,1);
assert.equal(empty.sessionByteVerifiedCount,0);
assert.equal(empty.secondObserverImageCount,0);
assert.equal(empty.flaggedImageCount,1);
assert.ok(empty.images[0].warnings.includes("ORIGINAL_PHOTO_BYTES_NOT_CHECKED_IN_SESSION"));
assert.ok(empty.images[0].warnings.includes("PERMISSION_NOT_RECORDED"));
assert.ok(empty.images[0].warnings.includes("INDEPENDENT_SECOND_ANNOTATION_MISSING"));
assert.equal(empty.images[0].localByteCheck,"NOT_CHECKED");
const single=auditSpecimenRegistry([highQuality],[alpha],[photoHash]);
assert.equal(single.sessionByteVerifiedCount,1);
assert.equal(single.images[0].observerCount,1);
assert.ok(single.images[0].warnings.includes("INDEPENDENT_SECOND_ANNOTATION_MISSING"));
const paired=auditSpecimenRegistry([highQuality],[beta,alpha],[photoHash]);
assert.equal(paired.secondObserverImageCount,1);
assert.equal(paired.sessionByteVerifiedCount,1);
assert.equal(paired.flaggedImageCount,0);
assert.equal(paired.images[0].recordedProtocolFieldsPresent,true);
assert.equal(paired.images[0].warnings.length,0);
assert.deepEqual(paired.images[0].observerCodes,["Masked_A","Masked_B"]);
assert.equal(paired.plants.length,1);
assert.equal(paired.plants[0].photoCount,1);
assert.deepEqual(paired,auditSpecimenRegistry([highQuality],[alpha,beta],[photoHash]));
const second=makeSpecimenRecord({...good,
  specimenId:"Image_2",plantId:"Plant_B",imageSHA256:hash2,
  originalFilename:"synthetic-second.bin",photoBytes:bytes2.byteLength});
const multi=auditSpecimenRegistry([second,record],[alpha,beta],[photoHash]);
assert.equal(multi.specimenCount,2);
assert.equal(multi.plantCount,2);
assert.equal(multi.sessionByteVerifiedCount,1);
assert.equal(multi.secondObserverImageCount,1);
assert.equal(multi.flaggedImageCount,2);
assert.deepEqual(multi.plants.map(x=>x.plantId),["Plant_A","Plant_B"]);
assert.throws(()=>auditSpecimenRegistry([]),/1–36/);
assert.throws(()=>auditSpecimenRegistry([record,record]),/Duplicate original photo hash/);
assert.throws(()=>auditSpecimenRegistry([record,{
  ...second,specimenId:"Image_1"
}]),/Specimen ID reused/);
assert.throws(()=>auditSpecimenRegistry([record],[alpha,alpha]),/Duplicate observer/);
assert.throws(()=>auditSpecimenRegistry([record],[{
  ...alpha,plantId:"Different_Plant"
}]),/plant\/specimen\/processing dimensions differ/);
assert.throws(()=>auditSpecimenRegistry([record],[{
  ...alpha,width:319
}]),/plant\/specimen\/processing dimensions differ/);
assert.throws(()=>auditSpecimenRegistry([record],[{
  ...alpha,origin:"synthetic-demo"
}]),/Synthetic annotations/);
assert.throws(()=>auditSpecimenRegistry([record],[alpha,beta,
  makeVeinReference({...alpha,annotatorCode:"Masked_C"}),
  makeVeinReference({...alpha,annotatorCode:"Masked_D"})
]),/At most three/);
assert.throws(()=>auditSpecimenRegistry([record],[alpha],["z".repeat(64)]),
  /Verified hash absent/);
assert.throws(()=>auditSpecimenRegistry([record],[alpha],["BAD"]),
  /64-byte lowercase/);
const orphan=auditSpecimenRegistry([record],[makeVeinReference({
  ...alpha,imageSHA256:"e".repeat(64),specimenId:"Other"
})]);
assert.equal(orphan.unmatchedReferenceHashes.length,1);
assert.equal(orphan.referenceCount,1);
assert.equal(orphan.secondObserverImageCount,0);
const expert=auditSpecimenRegistry([makeSpecimenRecord({
  ...good,taxonBasis:"expert-review-self-assertion",taxonEvidenceNote:""
})],[alpha,beta],[photoHash]);
assert.ok(expert.images[0].warnings.includes("EXPERT_REVIEW_DETAILS_MISSING"));

const html=readFileSync(new URL("../app/leaflab/specimens.html",import.meta.url),"utf8");
const ui=readFileSync(new URL("../app/leaflab/specimen-ui.mjs",import.meta.url),"utf8");
const home=readFileSync(new URL("../app/leaflab/index.html",import.meta.url),"utf8");
for(const field of ["sourcePhoto","sourcePlant","sourceSpecimen","captureDate",
  "taxonLabel","taxonBasis","taxonNote","growthStage","sourceLighting",
  "sourceAngle","sourceBackground","sourceRuler","sourcePermission",
  "sourceBlinding","sourceNote","importRegistry","importSourceRefs",
  "runSourceAudit","exportRegistry","exportSourceAudit","clearRegistry",
  "registryStatus","photoStatus","specimenRows","sourceWarnings"]){
  assert.ok(html.includes('id="'+field+'"'),"Missing v1.3 UI element "+field);
}
assert.match(html,/src="\.\/specimen-ui\.mjs"/);
assert.match(ui,/verifyOriginalPhoto/);
assert.match(ui,/crypto\.subtle\.digest/);
assert.match(ui,/file\.arrayBuffer/);
assert.match(ui,/auditSpecimenRegistry/);
assert.match(home,/specimens\.html/);
assert.ok(!/fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(ui),
  "The browser cannot upload specimen file bytes");
console.log("PASS LeafLab v1.3: local file-byte SHA-256, image dimension contract, metadata gates, two-observer intake, source mismatches and offline UI");
