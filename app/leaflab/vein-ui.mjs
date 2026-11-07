import {makeVeinReference,parseVeinReference,evaluateVeinBenchmark,
  compareBenchmarkReports} from "./vein-benchmark.mjs";

const $=id=>document.getElementById(id);
const canvas=$("veinCanvas"),ctx=canvas.getContext("2d",{willReadFrequently:true});
const MAX_FILE=16*1024*1024,MAX_JSON=1024*1024;
let image=null,paths=[],draft=[],reference=null,leaf=null,background=null,seed=null;
let mode="trace",view="reference",result=null,reports=[],aggregate=null;
const status=(id,text)=>{$(id).textContent=text;};
const pct=v=>v===null?"n/a":(100*v).toFixed(1)+"%";
function save(filename,object){
  const blob=new Blob([JSON.stringify(object,null,2)+"\n"],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
async function readJSON(file){
  if(!file||file.size>MAX_JSON)throw new RangeError("Choose a JSON file up to 1 MB");
  return JSON.parse(await file.text());
}
const validReference=()=>{
  if(!image)throw new RangeError("Choose an image first");
  return makeVeinReference({
    specimenId:$("veinSpecimen").value.trim(),
    plantId:$("veinPlant").value.trim(),
    annotatorCode:$("veinObserver").value.trim(),
    imageSHA256:image.sha256,sourceFilename:image.name,
    width:image.width,height:image.height,origin:"manual",paths
  });
};
function clearResult(){
  result=null;
  $("saveVeinBenchmark").disabled=true;
  $("benchRows").replaceChildren();
  $("localF1").textContent="–";$("baselineF1").textContent="–";
  status("benchmarkDetail","No evaluated reference yet.");
  status("benchStatus","Need image, completed reference lines and both color samples. No detector has run.");
  if(view!=="reference")view="reference";
}
function toggleControls(){
  $("runVeinBenchmark").disabled=!(image&&paths.length&&leaf&&background&&seed!==null&&!draft.length);
  $("saveVeinReference").disabled=!(image&&paths.length&&!draft.length);
  for(const [id,v] of [["modeTrace","trace"],["modeLeaf","leaf"],["modeBack","back"]])
    $(id).setAttribute("aria-pressed",String(mode===v));
  for(const [id,v] of [["viewReference","reference"],["viewLocal","local"],["viewBaseline","baseline"]])
    $(id).setAttribute("aria-pressed",String(view===v));
  $("viewLocal").disabled=!result;$("viewBaseline").disabled=!result;
  $("summarizeVeinReports").disabled=!reports.length;
  $("exportVeinSummary").disabled=!aggregate;
}
function render(){
  if(!image){ctx.clearRect(0,0,canvas.width,canvas.height);return;}
  const displayed=ctx.createImageData(image.width,image.height);
  displayed.data.set(image.pixels.data);
  const overlay=result&&(view==="local"?result.localSkeleton:
    view==="baseline"?result.baselineSkeleton:null);
  if(overlay){
    for(let i=0;i<overlay.length;i++){
      if(overlay[i]){
        displayed.data[i*4]=255;displayed.data[i*4+1]=70;
        displayed.data[i*4+2]=174;displayed.data[i*4+3]=255;
      }
    }
  }
  ctx.putImageData(displayed,0,0);
  ctx.lineWidth=1.3;ctx.strokeStyle="#ffdc72";ctx.lineJoin="round";
  const drawPath=p=>{
    if(!p.length)return;
    ctx.beginPath();ctx.moveTo(p[0][0]+.5,p[0][1]+.5);
    for(let i=1;i<p.length;i++)ctx.lineTo(p[i][0]+.5,p[i][1]+.5);
    ctx.stroke();
  };
  paths.forEach(drawPath);
  ctx.strokeStyle="#fff2bc";ctx.setLineDash([3,2]);drawPath(draft);ctx.setLineDash([]);
  for(const [p,label,color] of [[leaf,"L","#b9ffae"],[background,"B","#ffa5a5"]]){
    if(!p)continue;
    ctx.beginPath();ctx.arc(p.x+.5,p.y+.5,3,0,Math.PI*2);
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle=color;ctx.font="bold 11px sans-serif";
    ctx.fillText(label,p.x+5,p.y-5);
  }
}
function redraw(){render();toggleControls();}
function describe(){
  status("veinStatus",image?
    paths.length+" finished human-reference path(s), "+draft.length+
    " points in unfinished line.\nPhoto SHA-256: "+image.sha256+
    "\nLeaf color "+(leaf?leaf.rgb.join(","):"not set")+
    " · background "+(background?background.rgb.join(","):"not set"):
    "Choose a photo, trace visible lines without viewing predictions, and mark two color seeds.");
}
for(const [id,value] of [["modeTrace","trace"],["modeLeaf","leaf"],["modeBack","back"]]){
  $(id).addEventListener("click",()=>{mode=value;redraw();});
}
for(const [id,value] of [["viewReference","reference"],["viewLocal","local"],["viewBaseline","baseline"]]){
  $(id).addEventListener("click",()=>{if(value==="reference"||result){view=value;redraw();}});
}
for(const id of ["veinMargin","veinContrast","veinMin","veinTolerance"]){
  $(id).addEventListener("input",()=>{
    $(id+"Val").textContent=$(id).value;
    if(result){clearResult();redraw();}
  });
}
for(const id of ["veinSpecimen","veinPlant","veinObserver"]){
  $(id).addEventListener("input",()=>{if(result){clearResult();redraw();}});
}
$("veinImage").addEventListener("change",async event=>{
  const file=event.target.files?.[0];if(!file)return;
  if(!file.type.startsWith("image/")||file.size>MAX_FILE){
    status("veinStatus","Choose an image file of at most 16 MB.");return;
  }
  const url=URL.createObjectURL(file);
  try{
    if(!crypto?.subtle)throw new Error("SHA-256 requires a secure HTTPS/localhost browser context");
    const hash=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());
    const sha256=Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,"0")).join("");
    const bitmap=new Image();
    await new Promise((resolve,reject)=>{
      bitmap.onload=resolve;bitmap.onerror=()=>reject(new Error("Cannot decode photo"));
      bitmap.src=url;
    });
    const scale=Math.min(1,320/Math.max(bitmap.naturalWidth,bitmap.naturalHeight));
    const width=Math.round(bitmap.naturalWidth*scale),
      height=Math.round(bitmap.naturalHeight*scale);
    if(width<16||height<16)throw new RangeError("Source aspect ratio is too narrow for 16px minimum");
    canvas.width=width;canvas.height=height;
    ctx.clearRect(0,0,width,height);ctx.drawImage(bitmap,0,0,width,height);
    const pixels=ctx.getImageData(0,0,width,height);
    image={name:file.name.slice(0,180),sha256,width,height,pixels};
    paths=[];draft=[];reference=null;leaf=null;background=null;seed=null;
    mode="trace";clearResult();describe();redraw();
  }catch(error){
    image=null;paths=[];draft=[];leaf=null;background=null;seed=null;
    clearResult();status("veinStatus","Image unavailable: "+error.message);
    redraw();
  }finally{URL.revokeObjectURL(url);}
});
canvas.addEventListener("click",event=>{
  if(!image)return;
  const b=canvas.getBoundingClientRect();
  const x=Math.max(0,Math.min(image.width-1,
    Math.round((event.clientX-b.left)*image.width/b.width-.5)));
  const y=Math.max(0,Math.min(image.height-1,
    Math.round((event.clientY-b.top)*image.height/b.height-.5)));
  if(mode==="trace"){
    if(draft.length>=200){status("veinStatus","Max 200 points per line.");return;}
    if(draft.length&&Math.hypot(x-draft.at(-1)[0],y-draft.at(-1)[1])<.25)return;
    draft.push([x,y]);
  }else{
    const i=4*(y*image.width+x);
    const p={x,y,rgb:Array.from(image.pixels.data.slice(i,i+3))};
    if(mode==="leaf"){leaf=p;seed=y*image.width+x;}
    else background=p;
  }
  clearResult();describe();redraw();
});
$("finishVein").addEventListener("click",()=>{
  if(draft.length<2){status("veinStatus","Click at least two distinct points to complete one line.");return;}
  if(paths.length>=60){status("veinStatus","Max 60 reference paths.");return;}
  paths.push(draft);draft=[];clearResult();describe();redraw();
});
$("undoVein").addEventListener("click",()=>{
  draft.pop();clearResult();describe();redraw();
});
$("removeVein").addEventListener("click",()=>{
  if(draft.length)draft=[];
  else paths.pop();
  clearResult();describe();redraw();
});
$("saveVeinReference").addEventListener("click",()=>{
  try{
    const ref=validReference();
    save("leaflab-vein-reference-"+ref.specimenId+".json",ref);
    status("veinStatus","Exported reference with original-photo SHA-256. Keep it before exposing detector overlays.");
  }catch(error){status("veinStatus","Reference not exportable: "+error.message);}
});
$("importVeinReference").addEventListener("change",async event=>{
  try{
    const parsed=parseVeinReference(await readJSON(event.target.files?.[0]));
    if(!image||parsed.imageSHA256!==image.sha256||
       parsed.width!==image.width||parsed.height!==image.height)
      throw new RangeError("Wrong source image: SHA-256 or processing dimensions differ");
    paths=parsed.paths;draft=[];reference=parsed;
    $("veinSpecimen").value=parsed.specimenId;
    $("veinPlant").value=parsed.plantId;
    $("veinObserver").value=parsed.annotatorCode;
    clearResult();describe();redraw();
  }catch(error){status("veinStatus","Reference import rejected: "+error.message);}
  event.target.value="";
});
$("runVeinBenchmark").addEventListener("click",()=>{
  try{
    if(draft.length)throw new RangeError("Finish your current line first");
    const ref=validReference();
    result=evaluateVeinBenchmark({
      width:image.width,height:image.height,data:image.pixels.data,
      reference:ref,imageSHA256:image.sha256,
      foreground:leaf.rgb,background:background.rgb,seed,
      margin:Number($("veinMargin").value),
      contrast:Number($("veinContrast").value),
      minPixels:Number($("veinMin").value),
      tolerance:Number($("veinTolerance").value)
    });
    $("benchRows").replaceChildren();
    for(const d of result.report.detectors){
      const tr=document.createElement("tr");
      for(const value of [d.detector,pct(d.precision),pct(d.recall),
        pct(d.f1),d.candidatePixels]){
        const td=document.createElement("td");td.textContent=String(value);tr.append(td);
      }
      $("benchRows").append(tr);
    }
    const [local,base]=result.report.detectors;
    $("localF1").textContent=pct(local.f1);
    $("baselineF1").textContent=pct(base.f1);
    status("benchmarkDetail",[
      "EVIDENCE: "+result.report.evidenceLevel,
      "Human reference pixels: "+local.referencePixels,
      "Matching tolerance: "+local.tolerancePixels+" px",
      "Local matched reference: "+local.matchedReferencePixels,
      "Baseline matched reference: "+base.matchedReferencePixels,
      "Difference (local F1 − baseline F1): "+
        (local.f1!==null&&base.f1!==null?(local.f1-base.f1).toFixed(4):"n/a"),
      "Lower performance and null detections must be reported without filtering.",
      "Both use the same sampled foreground mask. Results are not anatomy."
    ].join("\n"));
    status("benchStatus","Two detectors evaluated on the same local file and image-byte hash.");
    $("saveVeinBenchmark").disabled=false;
    view="reference";redraw();
  }catch(error){
    clearResult();status("benchStatus","Benchmark rejected: "+error.message);
    redraw();
  }
});
$("saveVeinBenchmark").addEventListener("click",()=>{
  if(result)save("leaflab-vein-benchmark-"+result.report.specimenId+".json",result.report);
});
function refreshReports(){
  aggregate=null;$("exportVeinSummary").disabled=true;
  status("aggregateDetail","No aggregate result.");
  status("reportStatus",reports.length?
    reports.length+" report(s) loaded. Human-reference scores remain unverified.":"No benchmark reports loaded.");
  toggleControls();
}
$("importVeinReports").addEventListener("change",async event=>{
  try{
    const files=[...(event.target.files||[])];
    if(reports.length+files.length>200)throw new RangeError("Maximum 200 reports");
    const incoming=[];
    for(const file of files)incoming.push(await readJSON(file));
    const combined=[...reports,...incoming];
    compareBenchmarkReports(combined); // reject duplicates, mixed origins, wrong shape atomically
    reports=combined;refreshReports();
  }catch(error){status("reportStatus","Report import not applied: "+error.message);}
  event.target.value="";
});
$("summarizeVeinReports").addEventListener("click",()=>{
  try{
    aggregate=compareBenchmarkReports(reports);
    $("exportVeinSummary").disabled=false;
    const parts=[
      "EVIDENCE: "+aggregate.evidenceLevel,
      "Reports: "+aggregate.imageReportCount,
      "Distinct user-entered plant IDs: "+aggregate.assertedPlantCount
    ];
    for(const p of aggregate.plantSummaries){
      const f=p.detectors.map(d=>d.detector+": "+pct(d.meanReferenceF1)).join(" / ");
      parts.push(p.plantId+" ("+p.imageReports+" report(s)): "+f);
    }
    status("aggregateDetail",parts.join("\n"));
  }catch(error){aggregate=null;status("aggregateDetail","Cannot summarize: "+error.message);}
  toggleControls();
});
$("exportVeinSummary").addEventListener("click",()=>{
  if(aggregate)save("leaflab-vein-benchmark-cohort-v07.json",aggregate);
});
$("clearVeinReports").addEventListener("click",()=>{reports=[];refreshReports();});
redraw();describe();refreshReports();
