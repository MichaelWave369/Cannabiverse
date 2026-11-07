import {segmentImage,traceVeinCandidates,compareWithManualOutlines,
  imagingReport} from "./imaging-core.mjs";
import {parseSpecimen} from "./measure.mjs";

const $=id=>document.getElementById(id);
const canvas=$("preview"),ctx=canvas.getContext("2d",{willReadFrequently:true});
let pixels=null,sourceName="",fg=null,bg=null,seed=null,markMode="foreground";
let segmentation=null,ridges=null,comparison=null,manual=null,view="mask";
const maxPixels=320,MB=1024*1024;
const message=(id,txt)=>{$(id).textContent=txt;};
function invalidate(){
  segmentation=null;ridges=null;comparison=null;
  $("exportMask").disabled=true;$("exportReport").disabled=true;
  $("maskCoverage").textContent="–";$("skeletonPixels").textContent="–";
  $("junctionPixels").textContent="–";$("graphComponents").textContent="–";
  message("analysisStatus","No current analysis. Mark both sample colors and Analyze locally.");
  message("comparisonStatus","No manual mask comparison yet.");
  $("compareManual").disabled=true;
}
function refreshButtons(){
  $("analyze").disabled=!(pixels&&fg&&bg&&seed!==null);
  $("compareManual").disabled=!(segmentation&&manual);
  for(const [id,value] of [["foregroundMode","foreground"],["backgroundMode","background"]])
    $(id).setAttribute("aria-pressed",String(markMode===value));
  for(const [id,value] of [["showPhoto","photo"],["showMask","mask"],["showNetwork","network"]])
    $(id).setAttribute("aria-pressed",String(view===value));
}
function draw(){
  if(!pixels){ctx.clearRect(0,0,canvas.width,canvas.height);return;}
  const w=canvas.width,h=canvas.height,paint=ctx.createImageData(w,h);
  paint.data.set(pixels.data);
  const maskVisible=view!=="photo"&&segmentation;
  const ridgeVisible=view==="network"&&ridges;
  for(let i=0;i<w*h;i++){
    const p=i*4;
    if(maskVisible&&segmentation.mask[i]){
      for(let c=0;c<3;c++)paint.data[p+c]=Math.round(
        pixels.data[p+c]*.6+[112,231,155][c]*.4);
    }
    if(ridgeVisible&&ridges.skeleton[i]){
      paint.data[p]=255;paint.data[p+1]=75;paint.data[p+2]=157;
    }
    paint.data[p+3]=255;
  }
  ctx.putImageData(paint,0,0);
  for(const [sample,col,label] of [[fg,"#fff3a0","L"],[bg,"#ff99aa","B"]]){
    if(!sample)continue;
    ctx.strokeStyle="#132716";ctx.lineWidth=3;ctx.beginPath();
    ctx.arc(sample.x+.5,sample.y+.5,5,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();
    ctx.arc(sample.x+.5,sample.y+.5,5,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=col;ctx.font="bold 12px sans-serif";
    ctx.fillText(label,sample.x+8,sample.y-7);
  }
}
function setMode(mode){markMode=mode;refreshButtons();}
function setView(mode){view=mode;draw();refreshButtons();}
$("foregroundMode").addEventListener("click",()=>setMode("foreground"));
$("backgroundMode").addEventListener("click",()=>setMode("background"));
$("showPhoto").addEventListener("click",()=>setView("photo"));
$("showMask").addEventListener("click",()=>setView("mask"));
$("showNetwork").addEventListener("click",()=>setView("network"));
for(const id of ["margin","contrast","minRidge"]){
  $(id).addEventListener("input",()=>{
    $(id+"Val").textContent=$(id).value;
    if(segmentation)message("analysisStatus","Parameters changed. Analyze locally to update the results.");
  });
}
$("imageFile").addEventListener("change",async event=>{
  const file=event.target.files?.[0];
  if(!file)return;
  if(!file.type.startsWith("image/")||file.size>16*MB){
    message("seedStatus","Choose a local image file no larger than 16 MB.");return;
  }
  const url=URL.createObjectURL(file),im=new Image();
  try{
    await new Promise((resolve,reject)=>{
      im.onload=resolve;im.onerror=()=>reject(new Error("Could not decode this image"));
      im.src=url;
    });
    if(!im.naturalWidth||!im.naturalHeight)throw new Error("Empty image");
    const ratio=Math.min(1,maxPixels/Math.max(im.naturalWidth,im.naturalHeight));
    const width=Math.round(im.naturalWidth*ratio),height=Math.round(im.naturalHeight*ratio);
    if(width<16||height<16)throw new Error("Image is too narrow after downsampling (minimum 16 pixels each dimension)");
    canvas.width=width;canvas.height=height;
    ctx.drawImage(im,0,0,width,height);
    pixels=ctx.getImageData(0,0,width,height);
    sourceName=file.name.slice(0,180);fg=null;bg=null;seed=null;manual=null;
    $("manualFile").value="";invalidate();view="mask";markMode="foreground";
    message("seedStatus","Loaded "+sourceName+" at "+width+"×"+height+
      " processing pixels. Click a representative interior leaf pixel and a plain background pixel.");
    draw();refreshButtons();
  }catch(error){
    pixels=null;sourceName="";fg=null;bg=null;seed=null;manual=null;
    invalidate();message("seedStatus","Image unavailable: "+error.message);
    refreshButtons();draw();
  }finally{URL.revokeObjectURL(url);}
});
canvas.addEventListener("click",event=>{
  if(!pixels)return;
  const r=canvas.getBoundingClientRect();
  const x=Math.max(0,Math.min(canvas.width-1,Math.floor((event.clientX-r.left)*canvas.width/r.width)));
  const y=Math.max(0,Math.min(canvas.height-1,Math.floor((event.clientY-r.top)*canvas.height/r.height)));
  const at=4*(y*canvas.width+x);
  const item={x,y,rgb:Array.from(pixels.data.slice(at,at+3))};
  if(markMode==="foreground"){fg=item;seed=y*canvas.width+x;}
  else bg=item;
  invalidate();
  message("seedStatus","Leaf RGB: "+(fg?fg.rgb.join(","):"not marked")+
    " · background RGB: "+(bg?bg.rgb.join(","):"not marked")+
    ". Sample positions are user selected, not classified botanical truth.");
  draw();refreshButtons();
});
function run(){
  if(!pixels||!fg||!bg||seed===null)throw new RangeError("Mark both sample colors first");
  segmentation=segmentImage({width:canvas.width,height:canvas.height,data:pixels.data,
    foreground:fg.rgb,background:bg.rgb,seed,margin:Number($("margin").value)});
  ridges=traceVeinCandidates({width:canvas.width,height:canvas.height,data:pixels.data,
    mask:segmentation.mask,contrast:Number($("contrast").value),
    minPixels:Number($("minRidge").value)});
  comparison=null;
  $("maskCoverage").textContent=(100*segmentation.coverage).toFixed(1)+"%";
  $("skeletonPixels").textContent=ridges.graph.skeletonPixels.toLocaleString();
  $("junctionPixels").textContent=ridges.graph.junctionPixels.toLocaleString();
  $("graphComponents").textContent=ridges.graph.components.toLocaleString();
  message("analysisStatus","LOCAL EXPERIMENTAL ANALYSIS\n"+
    segmentation.pixels.toLocaleString()+" connected leaf-colored pixels · "+
    segmentation.binaryCandidatePixels.toLocaleString()+" candidate pixels\n"+
    ridges.ridgePixels.toLocaleString()+" dark ridge candidate pixels · "+
    ridges.graph.endpointPixels+" endpoint-like pixels · "+
    ridges.graph.neighborLinkLength.toFixed(1)+" pixel-link units.\n"+
    "These dark structures may be non-vein artifacts.");
  message("comparisonStatus","No manual mask comparison yet.");
  $("exportMask").disabled=false;$("exportReport").disabled=false;
  draw();refreshButtons();
}
$("analyze").addEventListener("click",()=>{
  try{run();}
  catch(error){
    segmentation=null;ridges=null;comparison=null;
    message("analysisStatus","Analysis unavailable: "+error.message);
    $("exportMask").disabled=true;$("exportReport").disabled=true;refreshButtons();draw();
  }
});
$("clearMasks").addEventListener("click",()=>{invalidate();draw();refreshButtons();});
function downloadBlob(filename,blob){
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
$("exportMask").addEventListener("click",()=>{
  if(!segmentation)return;
  const work=document.createElement("canvas");
  work.width=canvas.width;work.height=canvas.height;
  const k=work.getContext("2d");
  const im=k.createImageData(work.width,work.height);
  for(let i=0;i<segmentation.mask.length;i++){
    const v=segmentation.mask[i]?255:0,p=4*i;
    im.data[p]=v;im.data[p+1]=v;im.data[p+2]=v;im.data[p+3]=255;
  }
  k.putImageData(im,0,0);
  work.toBlob(blob=>{
    if(blob)downloadBlob("leaflab-v06-connected-mask.png",blob);
    else message("analysisStatus","Could not export mask PNG.");
  },"image/png");
});
$("exportReport").addEventListener("click",()=>{
  if(!segmentation||!ridges)return;
  const report={...imagingReport(segmentation,ridges,comparison),
    source:{filename:sourceName,imageIdentity:"USER_ASSERTED_FILENAME_ONLY"}};
  downloadBlob("leaflab-v06-image-analysis.json",
    new Blob([JSON.stringify(report,null,2)+"\n"],{type:"application/json"}));
});
$("manualFile").addEventListener("change",async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
    if(file.size>MB)throw new RangeError("Specimen record exceeds 1 MB");
    const parsed=parseSpecimen(JSON.parse(await file.text()));
    if(!pixels)throw new Error("Load the exact source photo first");
    if(!parsed.source.filename||parsed.source.filename!==sourceName)
      throw new RangeError("Source filenames differ. Load the photo used to trace this record.");
    manual=parsed;comparison=null;
    message("comparisonStatus","Loaded "+manual.specimenId+" with "+
      manual.outlines.length+" traced leaflet(s). Filename match is not proof of image identity.");
  }catch(error){
    manual=null;comparison=null;
    message("comparisonStatus","Cannot compare: "+error.message);
  }
  refreshButtons();
});
$("compareManual").addEventListener("click",()=>{
  try{
    if(!segmentation||!manual)throw new RangeError("Analyze the photo and import matching manual polygons first");
    comparison=compareWithManualOutlines({mask:segmentation.mask,
      width:canvas.width,height:canvas.height,outlines:manual.outlines});
    const fmt=x=>x===null?"n/a":(100*x).toFixed(2)+"%";
    message("comparisonStatus","EXPERIMENTAL MANUAL AGREEMENT\n"+
      "Specimen: "+manual.specimenId+"\n"+
      "Traced leaflets: "+comparison.tracedLeafletCount+"\n"+
      "Intersection-over-union: "+fmt(comparison.intersectionOverUnion)+"\n"+
      "Dice overlap: "+fmt(comparison.dice)+"\n"+
      "Mask precision: "+fmt(comparison.precision)+"\n"+
      "Mask recall: "+fmt(comparison.recall)+"\n"+
      "Not a verified ground truth; missing or overlapping polygons affect scores.");
  }catch(error){comparison=null;message("comparisonStatus","Comparison unavailable: "+error.message);}
});
refreshButtons();draw();
