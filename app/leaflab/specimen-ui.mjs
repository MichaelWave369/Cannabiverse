import {makeSpecimenRecord,parseSpecimenRecord,
  processingDimensions,verifyOriginalPhoto,auditSpecimenRegistry} from "./specimen-provenance.mjs";
import {parseVeinReference} from "./vein-benchmark.mjs";

const $=id=>document.getElementById(id),info=(id,s)=>{$(id).textContent=String(s);};
let records=[],references=[],verified=new Set(),audit=null;
function download(filename,obj){
  const url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)+"\n"],{
    type:"application/json"})),a=document.createElement("a");
  a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
async function readJson(files,max){
  if(files.length>max)throw new RangeError("Too many files");
  const parsed=[];
  for(const file of files){
    if(file.size>1024*1024)throw new RangeError("JSON exceeds 1 MB");
    parsed.push(JSON.parse(await file.text()));
  }
  return parsed;
}
function clearResults(){
  audit=null;$("exportSourceAudit").disabled=true;
  $("specimenRows").replaceChildren();
  for(const id of ["specimenTotal","sourceVerified","sourceReviewed","sourceFlagged"])
    info(id,"–");
  info("sourceWarnings","Run the audit to see missing requirements and session byte checks.");
}
function refresh(){
  $("runSourceAudit").disabled=records.length===0;
  $("exportRegistry").disabled=records.length===0;
  info("registryStatus",records.length+" registered image record(s); "+
    references.length+" annotation reference(s); "+
    verified.size+" original image hash(es) verified in this active session.");
}
function metadata(file,sha,width,height){
  const dims=processingDimensions(width,height);
  return makeSpecimenRecord({
    plantId:$("sourcePlant").value.trim(),
    specimenId:$("sourceSpecimen").value.trim(),
    imageSHA256:sha,originalFilename:file.name,
    photoBytes:file.size,originalWidth:width,originalHeight:height,
    ...dims,captureDate:$("captureDate").value,
    taxonLabel:$("taxonLabel").value.trim(),
    taxonBasis:$("taxonBasis").value,
    taxonEvidenceNote:$("taxonNote").value.trim(),
    growthStage:$("growthStage").value,lighting:$("sourceLighting").value,
    cameraAngle:$("sourceAngle").value,backgroundType:$("sourceBackground").value,
    scaleMarkerVisible:$("sourceRuler").checked,
    permissionStatement:$("sourcePermission").value,
    observerBlinding:$("sourceBlinding").value,
    collectionNote:$("sourceNote").value.trim()
  });
}
async function imageDimensions(file){
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();
    await new Promise((resolve,reject)=>{
      img.onload=resolve;
      img.onerror=()=>reject(new Error("The selected file cannot be decoded as an image"));
      img.src=url;
    });
    return {width:img.naturalWidth,height:img.naturalHeight};
  }finally{URL.revokeObjectURL(url);}
}
$("sourcePhoto").addEventListener("change",async event=>{
  const file=event.target.files?.[0];
  if(!file)return;
  try{
    if(!file.type.startsWith("image/")||file.size<1||file.size>16*1024*1024)
      throw new RangeError("Use one local image file of 1 byte–16 MB");
    if(!crypto?.subtle)throw new Error("SHA-256 needs HTTPS or localhost");
    const raw=await file.arrayBuffer();
    const digest=await crypto.subtle.digest("SHA-256",raw);
    const sha=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,"0")).join("");
    const {width,height}=await imageDimensions(file);
    const registered=records.find(r=>r.imageSHA256===sha);
    const record=registered||metadata(file,sha,width,height);
    const receipt=await verifyOriginalPhoto(record,raw,width,height,crypto.subtle);
    const nextRecords=registered?records:[...records,record];
    const nextVerified=[...verified,sha];
    auditSpecimenRegistry(nextRecords,references,nextVerified);
    records=nextRecords;verified=new Set(nextVerified);
    clearResults();refresh();
    info("photoStatus",[
      receipt.status,
      "Photo: "+file.name+" ("+file.size+" original bytes)",
      "SHA-256: "+sha,
      "Decoded dimensions: "+width+" × "+height,
      "v0.7 processing dimensions: "+record.processedWidth+" × "+record.processedHeight,
      registered?"Existing manifest verified (no metadata replaced).":
        "New metadata record created and verified.",
      "No species, expert identity, image edits, or rights were authenticated."
    ].join("\n"));
  }catch(error){
    info("photoStatus","Photo registration/verification rejected: "+error.message+
      "\nPreviously accepted records remain unchanged.");
  }
  event.target.value="";
});
$("importRegistry").addEventListener("change",async event=>{
  try{
    const incoming=await readJson([...(event.target.files||[])],36);
    const flattened=incoming.flatMap(v=>{
      if(v?.kind==="leaflab-specimen-registry-bundle"&&v.version==="1.3"&&
         Array.isArray(v.records))return v.records;
      return [v];
    }).map(parseSpecimenRecord);
    if(records.length+flattened.length>36)throw new RangeError("Maximum 36 records");
    const candidate=[...records,...flattened];
    // Existing in-session receipt statuses retained only for exact existing rows.
    auditSpecimenRegistry(candidate,references,[...verified]);
    records=candidate;clearResults();refresh();
    info("registryStatus","Imported "+flattened.length+
      " manifest record(s). Imported hashes are NOT marked byte-verified.");
  }catch(error){
    info("registryStatus","Registry import rejected without applying changes: "+error.message);
  }
  event.target.value="";
});
$("importSourceRefs").addEventListener("change",async event=>{
  try{
    const incoming=(await readJson([...(event.target.files||[])],72))
      .map(parseVeinReference);
    const candidate=[...references,...incoming];
    if(candidate.length>72)throw new RangeError("Maximum 72 references");
    if(records.length)auditSpecimenRegistry(records,candidate,[...verified]);
    references=candidate;clearResults();refresh();
    info("registryStatus","Loaded "+references.length+
      " annotation references. Audit the registry to inspect matches and missing reviews.");
  }catch(error){
    info("registryStatus","Reference import rejected without applying changes: "+error.message);
  }
  event.target.value="";
});
$("runSourceAudit").addEventListener("click",()=>{
  try{
    audit=auditSpecimenRegistry(records,references,[...verified]);
    const m=[["specimenTotal",audit.specimenCount],
      ["sourceVerified",audit.sessionByteVerifiedCount],
      ["sourceReviewed",audit.secondObserverImageCount],
      ["sourceFlagged",audit.flaggedImageCount]];
    for(const [id,value] of m)info(id,value);
    $("specimenRows").replaceChildren();
    for(const image of audit.images){
      const row=document.createElement("tr");
      for(const value of [image.specimenId,image.plantId,
        image.localByteCheck==="PASS_IN_ACTIVE_SESSION"?
          "Matched this session":"Not checked",
        image.observerCodes.length?image.observerCodes.join(", "):"None",
        image.warnings.length?image.warnings.join(", "):"No checklist gaps recorded"]){
        const td=document.createElement("td");td.textContent=value;row.append(td);
      }
      $("specimenRows").append(row);
    }
    info("sourceWarnings",[
      "EVIDENCE STATUS: "+audit.evidenceStatus,
      "Unique asserted plants: "+audit.plantCount,
      "Local byte checks: "+audit.sessionByteVerifiedCount+" / "+audit.specimenCount,
      "Independently paired images (self-asserted): "+audit.secondObserverImageCount,
      "Flagged records: "+audit.flaggedImageCount,
      "Unmatched imported reference hashes: "+audit.unmatchedReferenceHashes.length,
      "Missing items are warnings, not silently passed certification.",
      "Byte check ≠ botanical authentication or third-party attestation."
    ].join("\n"));
    $("exportSourceAudit").disabled=false;
  }catch(error){
    clearResults();info("sourceWarnings","Audit rejected: "+error.message);
  }
});
$("exportRegistry").addEventListener("click",()=>{
  if(records.length)download("leaflab-v13-specimen-registry.json",{
    kind:"leaflab-specimen-registry-bundle",version:"1.3",records,
    note:"Self-asserted metadata. Original file bytes not embedded; session verification not exported as proof."
  });
});
$("exportSourceAudit").addEventListener("click",()=>{
  if(audit)download("leaflab-v13-source-audit.json",audit);
});
$("clearRegistry").addEventListener("click",()=>{
  records=[];references=[];verified=new Set();
  $("sourcePhoto").value="";$("importRegistry").value="";$("importSourceRefs").value="";
  info("photoStatus","Source session cleared. Choose a photo to register/verify.");
  clearResults();refresh();
});
clearResults();refresh();
