import {segmentImage} from "./imaging-core.mjs";
import {identifyPhotoByOriginalHash} from "./real-image-qa.mjs";
import {createCompleteMaskReference,parseCompleteMaskReference,
  rasterizeCompletePolygons,compareCompleteReferences,
  benchmarkCompleteReferencePair,auditCompleteReferenceCohort}
  from "./full-mask-v16.mjs";

const $=id=>document.getElementById(id),
  canvas=$("maskCanvas"),ctx=canvas.getContext("2d",{willReadFrequently:true});
const info=(id,v)=>{$(id).textContent=String(v);};
const ratio=x=>x===null||x===undefined?"n/a":(100*x).toFixed(1)+"%";
let photo=null,source=null,polygons=[],current=[],operation="include",
  view="outlines",pick=null,fg=null,bg=null,finalized=false,
  imported=[],comparison=null,benchmark=null,cohort=null,predicted=null;
const modified=()=>{comparison=null;benchmark=null;cohort=null;predicted=null;
  $("maskExportComparison").disabled=true;$("maskExportBenchmark").disabled=true;
  $("maskExportCohort").disabled=true;
  $("maskViewDisagreement").disabled=true;$("maskViewPrediction").disabled=true;
  $("maskPickForeground").disabled=true;$("maskPickBackground").disabled=true;
  $("maskBenchmark").disabled=true;
  for(const id of ["maskIoU","maskDisagreement","maskModelRange"])info(id,"–");
  info("maskAudit","No current pair comparison or dual-reference benchmark.");
  info("maskCohortInfo","Run the cohort audit after importing reviewers.");
};
const save=(filename,value)=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+"\n"],{
    type:"application/json"}));
  const a=document.createElement("a");
  a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
};
function activeFrame(){
  if(!photo)throw new RangeError("Open and verify an original image first");
  return {width:photo.width,height:photo.height};
}
function displayedRefs(){
  if(!source)return [];
  return imported.filter(x=>x.source.originalSHA256===source.originalSHA256&&
    x.processingFrame.width===photo.width&&x.processingFrame.height===photo.height)
    .sort((a,b)=>a.observerCode.localeCompare(b.observerCode));
}
function status(){
  $("maskUndoPoint").disabled=finalized||!current.length;
  $("maskClosePolygon").disabled=finalized||current.length<3;
  $("maskUndoPolygon").disabled=finalized||!polygons.length;
  $("maskSave").disabled=!photo||finalized||!polygons.length||!$("maskCompleted").checked;
  $("maskReset").disabled=!photo;
  $("maskCompare").disabled=displayedRefs().length<2;
  $("maskCohort").disabled=!imported.length;
  $("maskReferenceCount").textContent=String(displayedRefs().length);
  $("maskInclude").setAttribute("aria-pressed",String(operation==="include"));
  $("maskExclude").setAttribute("aria-pressed",String(operation==="exclude"));
  for(const [id,v] of [["maskViewOutline","outlines"],["maskViewComplete","complete"],
      ["maskViewDisagreement","disagreement"],["maskViewPrediction","prediction"]])
    $(id).setAttribute("aria-pressed",String(view===v));
  for(const id of ["maskPlant","maskSpecimen","maskObserver","maskTarget",
    "maskRole","maskIndependence","maskCompleted"])
    $(id).disabled=finalized;
  info("maskWorkStatus",[
    (finalized?"FINALIZED REVIEWER REFERENCE":"Editable full-frame outline"),
    polygons.length+" closed polygons, "+current.length+" current vertices",
    "Target: "+$("maskTarget").selectedOptions[0].textContent,
    "Current operation: "+operation,
    "Each original photo needs separate masked-observer reference files.",
    "Model results remain blocked until two matching references are imported."
  ].join("\n"));
}
function outlinePath(vertices,stroke,dashed=false){
  if(!vertices.length)return;
  ctx.beginPath();ctx.moveTo(vertices[0][0]+.5,vertices[0][1]+.5);
  for(const v of vertices.slice(1))ctx.lineTo(v[0]+.5,v[1]+.5);
  if(vertices.length>=3&&!dashed)ctx.closePath();
  ctx.strokeStyle=stroke;ctx.lineWidth=1.8;
  ctx.setLineDash(dashed?[3,2]:[]);ctx.stroke();ctx.setLineDash([]);
}
function draw(){
  if(!photo){ctx.clearRect(0,0,canvas.width,canvas.height);return;}
  const w=photo.width,h=photo.height,im=ctx.createImageData(w,h);
  im.data.set(photo.pixels.data);
  let manual=null;
  if(view==="complete"&&polygons.length){
    try{manual=rasterizeCompletePolygons(polygons,w,h);}catch{}
  }
  for(let i=0;i<w*h;i++){
    let color=null,alpha=.42;
    if(view==="complete"&&manual?.[i])color=[70,239,130];
    if(view==="disagreement"&&comparison){
      const d=comparison.disagreement[i];
      if(d===1){color=[59,215,116];alpha=.25;}
      if(d===2){color=[255,91,95];alpha=.75;}
      if(d===3){color=[55,209,250];alpha=.75;}
    }
    if(view==="prediction"&&predicted?.[i]){color=[244,79,190];alpha=.55;}
    if(color){
      const j=4*i;
      for(let c=0;c<3;c++)im.data[j+c]=Math.round(
        (1-alpha)*im.data[j+c]+alpha*color[c]);
    }
  }
  ctx.putImageData(im,0,0);
  if(view==="outlines"||view==="complete"){
    for(const p of polygons)outlinePath(p.vertices,
      p.operation==="include"?"#8dfab2":"#ffbe83");
    outlinePath(current,operation==="include"?"#f8f0a0":"#ff9f7e",true);
    for(const point of current){
      ctx.beginPath();ctx.arc(point[0]+.5,point[1]+.5,2,0,2*Math.PI);
      ctx.fillStyle="#ffeeca";ctx.fill();
    }
  }
  for(const [pt,color] of [[fg,"#ffe79b"],[bg,"#ff9999"]]){
    if(!pt)continue;
    ctx.beginPath();ctx.arc(pt.x+.5,pt.y+.5,4,0,2*Math.PI);
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
  }
}
function clearCurrent(){
  polygons=[];current=[];finalized=false;operation="include";
  fg=null;bg=null;pick=null;view="outlines";
  $("maskCompleted").checked=false;
  modified();status();draw();
}
async function decode(file){
  const url=URL.createObjectURL(file),im=new Image();
  try{
    await new Promise((resolve,reject)=>{
      im.onload=resolve;im.onerror=()=>reject(new Error("Cannot decode image"));
      im.src=url;
    });
    if(im.naturalWidth<16||im.naturalHeight<16)
      throw new RangeError("Image is too small");
    const scale=Math.min(1,320/Math.max(im.naturalWidth,im.naturalHeight)),
      w=Math.round(im.naturalWidth*scale),
      h=Math.round(im.naturalHeight*scale);
    if(w<16||h<16)throw new RangeError("Processed image is too narrow");
    const temp=document.createElement("canvas");temp.width=w;temp.height=h;
    const cx=temp.getContext("2d",{willReadFrequently:true});
    cx.drawImage(im,0,0,w,h);
    return {width:w,height:h,originalWidth:im.naturalWidth,
      originalHeight:im.naturalHeight,pixels:cx.getImageData(0,0,w,h)};
  }finally{URL.revokeObjectURL(url);}
}
$("maskPhoto").addEventListener("change",async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
    if(!file.type.startsWith("image/")||file.size<1||file.size>16*1024*1024)
      throw new RangeError("Open one local image file, 1 byte to 16 MiB");
    if(!crypto?.subtle)throw new TypeError("HTTPS/localhost required for Web Crypto SHA-256");
    const raw=await file.arrayBuffer(),digest=await crypto.subtle.digest("SHA-256",raw);
    const sha=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,"0")).join("");
    const decoded=await decode(file);
    const identity=identifyPhotoByOriginalHash(sha,file.size,
      decoded.originalWidth,decoded.originalHeight);
    photo=decoded;source=identity;
    canvas.width=decoded.width;canvas.height=decoded.height;
    clearCurrent();modified();
    info("maskSource",[
      "Active-session source SHA-256: "+sha,
      "Source: "+identity.status,
      "Processing frame: "+decoded.width+" × "+decoded.height,
      "Original dimensions: "+decoded.originalWidth+" × "+decoded.originalHeight,
      "Source: "+(identity.sourceURL||"UNLISTED / no authenticated license"),
      "Original JPEG bytes never leave this page."
    ].join("\n"));
    status();
  }catch(error){
    info("maskSource","Import rejected: "+error.message+
      "\nThe previous accepted source remains unchanged.");
  }
  event.target.value="";
});
$("maskInclude").addEventListener("click",()=>{
  if(finalized||current.length)return;operation="include";status();draw();
});
$("maskExclude").addEventListener("click",()=>{
  if(finalized||current.length)return;operation="exclude";status();draw();
});
function clickPoint(event){
  const r=canvas.getBoundingClientRect();
  return [Math.max(0,Math.min(canvas.width-1,Math.floor(
    (event.clientX-r.left)*canvas.width/r.width))),
    Math.max(0,Math.min(canvas.height-1,Math.floor(
    (event.clientY-r.top)*canvas.height/r.height)))];
}
canvas.addEventListener("click",event=>{
  if(!photo||finalized)return;
  const [x,y]=clickPoint(event);
  if(pick){
    const rgb=Array.from(photo.pixels.data.slice(4*(y*photo.width+x),
      4*(y*photo.width+x)+3));
    if(pick==="foreground")fg={x,y,rgb};else bg={x,y,rgb};
    pick=null;draw();status();return;
  }
  if(current.length>=240){
    info("maskWorkStatus","240 vertices maximum per polygon. Close it first.");
    return;
  }
  if(current.length&&current.at(-1)[0]===x&&current.at(-1)[1]===y)return;
  current.push([x,y]);status();draw();
});
$("maskUndoPoint").addEventListener("click",()=>{
  if(!finalized){current.pop();status();draw();}
});
$("maskClosePolygon").addEventListener("click",()=>{
  if(finalized||current.length<3)return;
  try{
    const candidate=[...polygons,{operation,vertices:[...current]}];
    rasterizeCompletePolygons(candidate,photo.width,photo.height);
    polygons=candidate;current=[];status();draw();
  }catch(error){
    info("maskWorkStatus","Polygon rejected: "+error.message+
      "\nAdjust points or remove the current shape; previous polygons remain unchanged.");
  }
});
$("maskUndoPolygon").addEventListener("click",()=>{
  if(!finalized){polygons.pop();status();draw();}
});
$("maskCompleted").addEventListener("change",status);
$("maskReset").addEventListener("click",()=>{
  clearCurrent();
  info("maskCanvasInfo","Reset is not proof of independent/blinded annotation. A reviewer may already have viewed prior drawings or algorithm results.");
});
$("maskSave").addEventListener("click",()=>{
  try{
    const ref=createCompleteMaskReference({
      source,processingFrame:activeFrame(),polygons,completed:$("maskCompleted").checked,
      plantId:$("maskPlant").value.trim(),specimenId:$("maskSpecimen").value.trim(),
      observerCode:$("maskObserver").value.trim(),
      targetDefinition:$("maskTarget").value,reviewRole:$("maskRole").value,
      independence:$("maskIndependence").value
    });
    const candidate=[...imported,ref];
    auditCompleteReferenceCohort(candidate);
    imported=candidate;finalized=true;current=[];modified();
    save("leaflab-v16-"+ref.specimenId+"-"+ref.observerCode+".json",ref);
    info("maskCanvasInfo","Complete reference exported as self-asserted JSON and added to this session's review cohort. No claim of independent biological truth.");
    status();draw();
  }catch(error){info("maskWorkStatus","Cannot finalize: "+error.message);}
});
$("maskImport").addEventListener("change",async event=>{
  const files=[...(event.target.files||[])];
  try{
    if(files.length+imported.length>72)
      throw new RangeError("At most 72 complete-mask references per cohort");
    const candidate=[...imported];
    for(const file of files){
      if(file.size>1024*1024)throw new RangeError("Each reviewer JSON must be below 1 MiB");
      candidate.push(parseCompleteMaskReference(JSON.parse(await file.text())));
    }
    if(candidate.length)auditCompleteReferenceCohort(candidate);
    imported=candidate;modified();status();
    info("maskImportStatus",imported.length+" complete-mask reference file(s) accepted. "+
      displayedRefs().length+" match the currently opened source hash/frame. "+
      "Observer independence, mask truth and unviewed holdout status remain self-asserted.");
  }catch(error){
    info("maskImportStatus","Import rejected without changing accepted references: "+error.message);
  }
  event.target.value="";
});
$("maskCompare").addEventListener("click",()=>{
  try{
    const refs=displayedRefs();if(refs.length<2)
      throw new RangeError("Require at least two matching distinct observers");
    const pair=compareCompleteReferences(refs[0],refs[1]);
    comparison=pair;benchmark=null;predicted=null;fg=null;bg=null;pick=null;
    view="disagreement";$("maskViewDisagreement").disabled=false;
    $("maskViewPrediction").disabled=true;
    $("maskPickForeground").disabled=false;$("maskPickBackground").disabled=false;
    $("maskBenchmark").disabled=false;
    $("maskExportComparison").disabled=false;$("maskExportBenchmark").disabled=true;
    info("maskIoU",ratio(pair.metrics.intersectionOverUnion));
    info("maskDisagreement",pair.metrics.disagreementPixels);
    info("maskModelRange","–");
    info("maskAudit",[
      "Original SHA-256: "+pair.originalSHA256,
      "Reviewer A: "+pair.observerA+" · Reviewer B: "+pair.observerB,
      "Target definition: "+pair.targetDefinition,
      "Both observer independence self-attested: "+
        pair.independentObserversSelfAttested,
      "Shared leaf pixels: "+pair.metrics.bothLeaf,
      "A-only leaf: "+pair.metrics.onlyObserverA,
      "B-only leaf: "+pair.metrics.onlyObserverB,
      "Pair IoU: "+ratio(pair.metrics.intersectionOverUnion),
      "Pair Dice: "+ratio(pair.metrics.dice),
      "Agreement is NOT independent botanical ground truth."
    ].join("\n"));
    info("maskCanvasInfo","Disagreement overlay: red = A-only leaf, cyan = B-only leaf, green = both observers marked leaf. Two masks shown: "+pair.observerA+" and "+pair.observerB+".");
    status();draw();
  }catch(error){info("maskAudit","Pair rejected: "+error.message);}
});
for(const [id,v] of [["maskViewOutline","outlines"],["maskViewComplete","complete"],
    ["maskViewDisagreement","disagreement"],["maskViewPrediction","prediction"]]){
  $(id).addEventListener("click",()=>{
    if((v==="disagreement"&&!comparison)||(v==="prediction"&&!predicted))return;
    view=v;status();draw();
  });
}
for(const [id,v] of [["maskPickForeground","foreground"],["maskPickBackground","background"]])
  $(id).addEventListener("click",()=>{
    if(!comparison)return;
    pick=v;
    info("maskCanvasInfo","Click the original photo to mark "+v+
      " color. Both sources must be chosen before the baseline can run.");
  });
$("maskMargin").addEventListener("input",()=>{
  info("maskMarginValue",$("maskMargin").value);
});
$("maskBenchmark").addEventListener("click",()=>{
  try{
    if(!comparison||!fg||!bg)throw new RangeError(
      "Compare observers and pick both model color seeds first");
    const model=segmentImage({
      width:photo.width,height:photo.height,data:photo.pixels.data,
      foreground:fg.rgb,background:bg.rgb,seed:fg.y*photo.width+fg.x,
      margin:Number($("maskMargin").value)
    });
    const refs=displayedRefs();
    const result=benchmarkCompleteReferencePair(model.mask,refs[0],refs[1]);
    benchmark={
      ...result,runParameters:{margin:model.margin,
        foregroundRGB:model.foreground,backgroundRGB:model.background,
        foregroundSeed:model.seed},originalSourceVerifiedThisBrowserSession:true
    };
    predicted=model.mask;view="prediction";
    $("maskViewPrediction").disabled=false;$("maskExportBenchmark").disabled=false;
    const range=benchmark.observedReferenceRange.intersectionOverUnion;
    info("maskModelRange",range?range.map(ratio).join("–"):"n/a");
    info("maskAudit",[
      "Model comparison vs TWO human masks, never botanical ground truth.",
      "Review A "+result.perObserver[0].observerCode+
        ": IoU "+ratio(result.perObserver[0].intersectionOverUnion)+
        ", Dice "+ratio(result.perObserver[0].dice),
      "Review B "+result.perObserver[1].observerCode+
        ": IoU "+ratio(result.perObserver[1].intersectionOverUnion)+
        ", Dice "+ratio(result.perObserver[1].dice),
      "Observer pair IoU "+ratio(result.referencePairAgreement.intersectionOverUnion),
      "Model IoU range "+(range?range.map(ratio).join(" to "):"n/a"),
      "A source-byte matched image and two masks do not prove verified anatomy.",
      "This model score is not preregistered untouched holdout accuracy."
    ].join("\n"));
    status();draw();
  }catch(error){info("maskAudit","Baseline rejected: "+error.message);}
});
$("maskExportComparison").addEventListener("click",()=>{
  if(!comparison)return;
  const {disagreement,...summary}=comparison;
  save("leaflab-v16-observer-disagreement.json",summary);
});
$("maskExportBenchmark").addEventListener("click",()=>{
  if(benchmark)save("leaflab-v16-dual-reference-model-benchmark.json",benchmark);
});
$("maskCohort").addEventListener("click",()=>{
  try{
    cohort=auditCompleteReferenceCohort(imported);
    $("maskCohortRows").replaceChildren();
    for(const im of cohort.images){
      const tr=document.createElement("tr");
      for(const value of [im.specimenId,im.plantId,im.reviewRole,
        im.observers.join(", "),im.pairCount,
        ratio(im.meanObserverIoU),im.reviewState]){
        const td=document.createElement("td");td.textContent=String(value);tr.append(td);
      }
      $("maskCohortRows").append(tr);
    }
    $("maskExportCohort").disabled=false;
    info("maskCohortInfo",[
      "Imported complete references: "+cohort.referenceCount,
      "Unique source hashes: "+cohort.imageCount,
      "Asserted plants: "+cohort.plantCount,
      "Development plants: "+cohort.developmentPlantCount,
      "Self-declared holdout plants: "+cohort.declaredHoldoutPlantCount,
      "Paired images: "+cohort.pairedImageCount,
      "Missing second reviewer: "+cohort.incompleteImageCount,
      "A valid role split is not authenticated biological independence."
    ].join("\n"));
  }catch(error){cohort=null;
    $("maskExportCohort").disabled=true;
    info("maskCohortInfo","Cohort rejected: "+error.message);}
});
$("maskExportCohort").addEventListener("click",()=>{
  if(cohort)save("leaflab-v16-complete-mask-cohort-audit.json",cohort);
});
modified();status();draw();
