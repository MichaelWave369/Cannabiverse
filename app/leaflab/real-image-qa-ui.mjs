import {segmentImage,traceVeinCandidates} from "./imaging-core.mjs";
import {identifyPhotoByOriginalHash,paintSparseLabels,sparseSampleAudit,
  makeRealImageQaReport,LABEL_LEAF,LABEL_BACKGROUND,LABEL_UNREVIEWED}
  from "./real-image-qa.mjs";

const $=id=>document.getElementById(id),canvas=$("qaCanvas"),
  ctx=canvas.getContext("2d",{willReadFrequently:true});
const setText=(id,value)=>{$(id).textContent=String(value);};
const fmt=x=>x===null||x===undefined?"n/a":(x*100).toFixed(1)+"%";
const SOURCE_LIMIT=16*1024*1024;
let image=null,source=null,labels=null,fg=null,bg=null,
  mode="leaf-seed",view="samples",locked=false,pointer=null,
  segmentation=null,ridges=null,audit=null,report=null;
function controls(){
  const disabled=locked||!image;
  for(const id of ["pickLeaf","pickBackground","markLeaf","markBackground",
    "eraseLabels","brushSize","qaMargin","qaContrast","qaMinPixels","qaRole"])
    $(id).disabled=disabled;
  const enough=labels?countLabels().leaf>=20&&countLabels().background>=20:false;
  $("qaEvaluate").disabled=locked||!image||!fg||!bg||!enough;
  $("qaReset").disabled=!image;
  $("qaExport").disabled=!report;
  for(const id of ["qaViewPhoto","qaViewSamples","qaViewMask",
    "qaViewErrors","qaViewRidges"])
    $(id).disabled=!image||
      (["qaViewMask","qaViewErrors","qaViewRidges"].includes(id)&&!locked);
  const modeMap={pickLeaf:"leaf-seed",pickBackground:"background-seed",
    markLeaf:"leaf",markBackground:"background",eraseLabels:"erase"};
  for(const [id,value] of Object.entries(modeMap))
    $(id).setAttribute("aria-pressed",String(value===mode));
  const viewMap={qaViewPhoto:"photo",qaViewSamples:"samples",qaViewMask:"mask",
    qaViewErrors:"errors",qaViewRidges:"ridges"};
  for(const [id,value] of Object.entries(viewMap))
    $(id).setAttribute("aria-pressed",String(value===view));
}
function countLabels(){
  let leaf=0,background=0;
  if(labels)for(const v of labels){
    if(v===LABEL_LEAF)leaf++;
    if(v===LABEL_BACKGROUND)background++;
  }
  return {leaf,background};
}
function statsText(){
  if(!image){
    setText("qaSampleInfo","No manually labeled pixels.");
    return;
  }
  const counts=countLabels(),total=labels.length;
  setText("qaSampleInfo",[
    "Manual leaf pixels: "+counts.leaf,
    "Manual non-leaf pixels: "+counts.background,
    "Unmarked: "+(total-counts.leaf-counts.background),
    "Marked coverage: "+(100*(counts.leaf+counts.background)/total).toFixed(2)+"%",
    "Leaf color seed: "+(fg?fg.rgb.join(",")+" at "+fg.x+","+fg.y:"not selected"),
    "Non-leaf color: "+(bg?bg.rgb.join(",")+" at "+bg.x+","+bg.y:"not selected"),
    "Review mode: "+(locked?"LOCKED / MASK REVEALED":"PREDICTION HIDDEN")
  ].join("\n"));
}
function draw(){
  if(!image){
    ctx.clearRect(0,0,canvas.width,canvas.height);return;
  }
  const width=image.width,height=image.height,
    pixels=ctx.createImageData(width,height);
  pixels.data.set(image.pixels.data);
  for(let i=0;i<labels.length;i++){
    const j=4*i;
    if(view==="samples"||view==="errors"){
      const label=labels[i];
      const predicted=segmentation?.mask[i];
      let rgb=null;
      if(view==="samples"||!locked){
        if(label===LABEL_LEAF)rgb=[90,251,156];
        if(label===LABEL_BACKGROUND)rgb=[252,174,94];
      }else if(label===LABEL_LEAF&&!predicted)rgb=[74,226,252];
      else if(label===LABEL_BACKGROUND&&predicted)rgb=[255,75,80];
      else if(label===LABEL_LEAF&&predicted)rgb=[84,235,140];
      else if(label===LABEL_BACKGROUND&&!predicted)rgb=[213,188,102];
      if(rgb)for(let c=0;c<3;c++)
        pixels.data[j+c]=Math.round(.36*pixels.data[j+c]+.64*rgb[c]);
    }else if(view==="mask"&&segmentation?.mask[i]){
      for(let c=0;c<3;c++)
        pixels.data[j+c]=Math.round(.5*pixels.data[j+c]+.5*[250,91,195][c]);
    }else if(view==="ridges"&&ridges?.skeleton[i]){
      pixels.data[j]=255;pixels.data[j+1]=93;pixels.data[j+2]=183;
    }
    pixels.data[j+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  // Color seeds are separate from evaluation labels.
  for(const [sample,color,letter] of [[fg,"#ffe59b","L"],[bg,"#ffafaa","B"]]){
    if(!sample)continue;
    ctx.strokeStyle="#082112";ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(sample.x+.5,sample.y+.5,5,0,2*Math.PI);ctx.stroke();
    ctx.strokeStyle=color;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(sample.x+.5,sample.y+.5,5,0,2*Math.PI);ctx.stroke();
    ctx.font="bold 12px system-ui";ctx.fillStyle=color;
    ctx.fillText(letter,Math.min(width-15,sample.x+7),Math.max(12,sample.y-8));
  }
}
function resetCurrentImage(){
  if(!image)return;
  labels=new Uint8Array(image.width*image.height);
  fg=null;bg=null;mode="leaf-seed";view="samples";
  locked=false;pointer=null;segmentation=null;ridges=null;audit=null;report=null;
  for(const id of ["qaCoverage","qaIoU","qaPrecision","qaRecall"])setText(id,"–");
  setText("qaAudit","No prediction has been shown. Mark sparse leaf/non-leaf pixels before locking.");
  setText("qaCanvasStatus","Photo loaded. No model prediction has been revealed.");
  setText("qaInputStatus","Manual marks and parameter settings are unlocked. Lock after you have both classes and color seeds.");
  statsText();controls();draw();
}
async function imageDecode(file){
  const url=URL.createObjectURL(file),img=new Image();
  try{
    await new Promise((resolve,reject)=>{
      img.onload=resolve;
      img.onerror=()=>reject(new Error("Cannot decode this image"));
      img.src=url;
    });
    if(img.naturalWidth<16||img.naturalHeight<16)
      throw new RangeError("Original image is too small");
    const ratio=Math.min(1,320/Math.max(img.naturalWidth,img.naturalHeight)),
      width=Math.round(img.naturalWidth*ratio),
      height=Math.round(img.naturalHeight*ratio);
    if(width<16||height<16)
      throw new RangeError("Resized image dimension falls below 16px");
    const staging=document.createElement("canvas");
    staging.width=width;staging.height=height;
    const drawCtx=staging.getContext("2d",{willReadFrequently:true});
    drawCtx.drawImage(img,0,0,width,height);
    return {width,height,pixels:drawCtx.getImageData(0,0,width,height),
      naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight};
  }finally{URL.revokeObjectURL(url);}
}
$("qaFile").addEventListener("change",async event=>{
  const file=event.target.files?.[0];
  if(!file)return;
  try{
    if(!file.type.startsWith("image/")||file.size<1||file.size>SOURCE_LIMIT)
      throw new RangeError("Select a valid image no bigger than 16 MB");
    if(!crypto?.subtle)throw new Error("HTTPS or localhost is needed for SHA-256");
    const buffer=await file.arrayBuffer();
    const digest=await crypto.subtle.digest("SHA-256",buffer);
    const hash=Array.from(new Uint8Array(digest),x=>
      x.toString(16).padStart(2,"0")).join("");
    const decoded=await imageDecode(file);
    const identified=identifyPhotoByOriginalHash(hash,file.size,
      decoded.naturalWidth,decoded.naturalHeight);
    source={...identified,originalFilename:file.name.slice(0,180)};
    image=decoded;canvas.width=decoded.width;canvas.height=decoded.height;
    resetCurrentImage();
    setText("qaSource",[
      "SOURCE STATUS: "+source.status,
      "Name: "+file.name,
      "Original SHA-256: "+hash,
      "Original dimensions: "+decoded.naturalWidth+"×"+decoded.naturalHeight,
      "Processing frame: "+decoded.width+"×"+decoded.height,
      source.sourceId?"Catalog image: "+source.sourceId:
        "No frozen catalog original hash matched",
      "Rights/creator: "+(source.sourceLicense||"UNKNOWN")+" / "+
        (source.sourceCreator||"UNKNOWN"),
      source.sourceWarning
    ].join("\n"));
  }catch(error){
    setText("qaSource","Import failed: "+error.message+
      "\nAny prior successfully loaded image remains unchanged.");
  }
  event.target.value="";
});
$("qaReset").addEventListener("click",()=>{
  resetCurrentImage();
  setText("qaInputStatus","Evaluation reset: previous revealed predictions may bias subsequent human marks. Reset does NOT establish untouched holdout independence.");
});
for(const [id,value] of Object.entries({
  pickLeaf:"leaf-seed",pickBackground:"background-seed",
  markLeaf:"leaf",markBackground:"background",eraseLabels:"erase"})){
  $(id).addEventListener("click",()=>{
    if(locked||!image)return;
    mode=value;controls();
  });
}
for(const [id,value] of Object.entries({
  qaViewPhoto:"photo",qaViewSamples:"samples",qaViewMask:"mask",
  qaViewErrors:"errors",qaViewRidges:"ridges"})){
  $(id).addEventListener("click",()=>{
    if(!image||(!locked&&["mask","errors","ridges"].includes(value)))return;
    view=value;draw();controls();
  });
}
for(const [id,output] of [["brushSize","brushValue"],["qaMargin","qaMarginVal"],
  ["qaContrast","qaContrastVal"],["qaMinPixels","qaMinPixelsVal"]]){
  $(id).addEventListener("input",()=>{
    if(!locked)setText(output,$(id).value);
  });
}
function point(event){
  const rect=canvas.getBoundingClientRect();
  return {
    x:Math.max(0,Math.min(canvas.width-1,Math.floor(
      (event.clientX-rect.left)*canvas.width/rect.width))),
    y:Math.max(0,Math.min(canvas.height-1,Math.floor(
      (event.clientY-rect.top)*canvas.height/rect.height)))
  };
}
function stroke(start,end){
  const kinds={leaf:LABEL_LEAF,background:LABEL_BACKGROUND,
    erase:LABEL_UNREVIEWED};
  labels=paintSparseLabels({labels,width:image.width,height:image.height,
    start,end,radius:Number($("brushSize").value),kind:kinds[mode]});
  statsText();controls();draw();
}
canvas.addEventListener("pointerdown",event=>{
  if(!image||locked)return;
  if(event.button!==0&&event.pointerType!=="touch")return;
  const p=point(event);
  if(mode==="leaf-seed"||mode==="background-seed"){
    const j=4*(p.y*image.width+p.x);
    const sample={...p,rgb:Array.from(image.pixels.data.slice(j,j+3))};
    if(mode==="leaf-seed")fg=sample;else bg=sample;
    statsText();controls();draw();
    return;
  }
  pointer=p;
  canvas.setPointerCapture?.(event.pointerId);
  stroke(p,p);
  event.preventDefault();
});
canvas.addEventListener("pointermove",event=>{
  if(pointer===null||locked||!image)return;
  const p=point(event);
  stroke(pointer,p);pointer=p;event.preventDefault();
});
function endPaint(){pointer=null;}
canvas.addEventListener("pointerup",endPaint);
canvas.addEventListener("pointercancel",endPaint);
$("qaEvaluate").addEventListener("click",()=>{
  if(locked||!image||!source||!fg||!bg)return;
  try{
    const params={
      width:image.width,height:image.height,data:image.pixels.data,
      foreground:fg.rgb,background:bg.rgb,
      seed:fg.y*image.width+fg.x,margin:Number($("qaMargin").value)
    };
    // No computed segmentation is shown until all marks and parameters
    // are locked together by this direct user click.
    const computed=segmentImage(params);
    const computedRidges=traceVeinCandidates({
      width:image.width,height:image.height,data:image.pixels.data,
      mask:computed.mask,contrast:Number($("qaContrast").value),
      minPixels:Number($("qaMinPixels").value)
    });
    const computedAudit=sparseSampleAudit({mask:computed.mask,labels,
      width:image.width,height:image.height,minPerClass:20});
    if(computedAudit.metrics===null)
      throw new RangeError("Mark at least 20 pixels of each manual class");
    const result=makeRealImageQaReport({
      source,labels,width:image.width,height:image.height,
      mask:computed.mask,margin:params.margin,
      foreground:fg.rgb,background:bg.rgb,seed:params.seed,
      contrast:Number($("qaContrast").value),
      minRidgePixels:Number($("qaMinPixels").value),
      ridgeSummary:{
        skeletonPixels:computedRidges.skeletonPixels,
        components:computedRidges.graph.components,
        endpointPixels:computedRidges.graph.endpointPixels,
        junctionPixels:computedRidges.graph.junctionPixels
      },reviewRole:$("qaRole").value
    });
    segmentation=computed;ridges=computedRidges;audit=computedAudit;report=result;
    locked=true;pointer=null;view="errors";
    setText("qaCoverage",fmt(audit.labeledCoverage));
    setText("qaIoU",fmt(audit.metrics.intersectionOverUnion));
    setText("qaPrecision",fmt(audit.metrics.precision));
    setText("qaRecall",fmt(audit.metrics.recall));
    setText("qaAudit",[
      "SOURCE: "+source.status,
      "RUN: "+audit.status,
      "Manually marked "+audit.labeledPixels+" / "+audit.totalImagePixels+
        " image pixels ("+fmt(audit.labeledCoverage)+")",
      "Leaf "+audit.labeledLeafPixels+
        " · non-leaf "+audit.labeledBackgroundPixels,
      "True leaf "+audit.confusionLabeledOnly.truePositive+
        " · mistaken non-leaf "+audit.confusionLabeledOnly.falsePositive,
      "Missed leaf "+audit.confusionLabeledOnly.falseNegative+
        " · true non-leaf "+audit.confusionLabeledOnly.trueNegative,
      "IoU on marks only: "+fmt(audit.metrics.intersectionOverUnion),
      "Dice on marks only: "+fmt(audit.metrics.dice),
      "Precision on marks only: "+fmt(audit.metrics.precision),
      "Recall on marks only: "+fmt(audit.metrics.recall),
      "Tentative dark skeleton pixels: "+computedRidges.skeletonPixels,
      "Tentative network components: "+computedRidges.graph.components,
      "NO WHOLE-IMAGE ACCURACY, CONFIRMED VESSELS, OR INDEPENDENT BLINDED GROUND TRUTH"
    ].join("\n"));
    setText("qaCanvasStatus","Prediction revealed. Human marks and model settings are frozen. Colored error overlay shows marked pixels only.");
    setText("qaInputStatus","FIRST REVEAL COMPLETE. The exported score is descriptive only and based solely on the pixels you marked beforehand.");
    statsText();controls();draw();
  }catch(error){
    setText("qaInputStatus","Cannot evaluate: "+error.message+
      "\nNo prediction revealed; adjust seeds or parameters before locking.");
  }
});
$("qaExport").addEventListener("click",()=>{
  if(!report)return;
  const blob=new Blob([JSON.stringify(report,null,2)+"\n"],{type:"application/json"}),
    url=URL.createObjectURL(blob),anchor=document.createElement("a");
  anchor.href=url;anchor.download="leaflab-v15-real-sparse-qa-"+
    (source.sourceId||"unlisted-original")+".json";
  document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
});
controls();statsText();draw();
