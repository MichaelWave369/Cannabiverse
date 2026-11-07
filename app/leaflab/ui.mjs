import {DEFAULTS, COUNTS, generateLeaf, measureTips} from "./core.mjs";
import {validateAnnotation, orderedRays, fitTipFan} from "./fit.mjs";
import {installMeasurementUI} from "./measurement-ui.mjs";
const $ = id => document.getElementById(id);
const svg = $("figure"), NS = "http://www.w3.org/2000/svg", fields = ["count","fan","falloff","width","taper","teeth","depth","asym"];
let mode = "model", model, photoURL = null, photoInfo = null, marks = [], fitResult = null, measurementUI = null;
function el(name, attrs={}, parent=svg) {
  const n = document.createElementNS(NS,name);
  for (const [k,v] of Object.entries(attrs)) n.setAttribute(k,String(v));
  parent.append(n); return n;
}
function values(){
  const p={};
  for(const k of fields)p[k]=Number($(k).value);
  p.veins=$("veins").checked;return p;
}
function download(filename,contents,type){
  const url=URL.createObjectURL(new Blob([contents],{type}));
  const a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function grid(){
  for(let x=25;x<850;x+=50)el("line",{x1:x,y1:0,x2:x,y2:630,stroke:"#31533a",opacity:.25});
  for(let y=25;y<630;y+=50)el("line",{x1:0,y1:y,x2:850,y2:y,stroke:"#31533a",opacity:.25});
}
function renderModel(){
  model=generateLeaf(values());svg.replaceChildren();svg.classList.remove("photo");grid();
  const g=el("g",{transform:"translate(425 515) scale(1 -1)"});
  el("path",{d:"M 0 -100 Q -8 -44 0 0",fill:"none",stroke:"#b0d6a9","stroke-width":7,"stroke-linecap":"round"},g);
  model.leaves.forEach((l,i)=>{
    const d=l.polygon.map((p,j)=>(j?"L":"M")+p[0].toFixed(2)+" "+p[1].toFixed(2)).join(" ")+" Z";
    el("path",{d,fill:i===(model.leaves.length-1)/2?"#4b9866":"#34794f",stroke:"#a9e2ac","stroke-width":1.15,"stroke-linejoin":"round"},g);
    if(model.params.veins){
      el("line",{x1:0,y1:0,x2:l.midribTip[0],y2:l.midribTip[1],stroke:"#c0eec1","stroke-width":1.8},g);
      for(const b of l.branches)el("line",{x1:b.start[0],y1:b.start[1],x2:b.end[0],y2:b.end[1],stroke:"#bae1bd","stroke-width":.8,opacity:.7},g);
    }
  });
  el("circle",{cx:0,cy:0,r:5,fill:"#d6f2d5"},g);
  el("text",{x:28,y:37,fill:"#c0dfbf","font-size":13}).textContent="SYNTHETIC MORPHOLOGY • N = "+model.params.count;
  const m=model.metrics;
  $("area").textContent=Math.round(m.area).toLocaleString();
  $("perimeter").textContent=Math.round(m.perimeter).toLocaleString();
  $("veinLength").textContent=Math.round(m.veinLength).toLocaleString();
  $("symmetry").textContent=m.symmetry.toFixed(1)+"%";
  $("normalized").textContent="Boundary / √area: "+m.perimeterOverSqrtArea.toFixed(2)+" · Schematic vein length / √area: "+m.schematicVeinOverSqrtArea.toFixed(2);
  $("comparison").replaceChildren();
  COUNTS.forEach(count=>{
    const d=generateLeaf({...values(),count}),tr=document.createElement("tr");
    if(count===model.params.count)tr.className="active";
    [count,d.metrics.perimeterOverSqrtArea.toFixed(2),d.metrics.schematicVeinOverSqrtArea.toFixed(2)].forEach(t=>{const td=document.createElement("td");td.textContent=t;tr.append(td);});
    $("comparison").append(tr);
  });
  $("stageNote").textContent="Parametric leaf in arbitrary units. Vary controls and export reproducible geometry.";
}
function renderPhoto(){
  svg.replaceChildren();svg.classList.add("photo");
  if(photoURL) el("image",{href:photoURL,x:0,y:0,width:850,height:630,preserveAspectRatio:"xMidYMid meet"});
  else {grid();if(!marks.length)el("text",{x:425,y:310,fill:"#bce2c4","font-size":20,"text-anchor":"middle"}).textContent="Choose a photo or import annotations";}
  if(fitResult){
    const maxRadius=Math.max(...marks.slice(1).map(([x,y])=>Math.hypot(x-marks[0][0],y-marks[0][1])));
    fitResult.points.forEach(p=>{
      const angle=p.fittedAngleDegrees*Math.PI/180, radius=p.fittedRelativeLength*maxRadius;
      const x=marks[0][0]+Math.sin(angle)*radius, y=marks[0][1]-Math.cos(angle)*radius;
      el("line",{x1:marks[0][0],y1:marks[0][1],x2:x,y2:y,stroke:"#71efb1","stroke-width":2,"stroke-dasharray":"3 3"});
      const observed=marks[p.tip];
      if(observed)el("line",{x1:x,y1:y,x2:observed[0],y2:observed[1],stroke:"#ff9988","stroke-width":2});
      el("circle",{cx:x,cy:y,r:6,stroke:"#122e1d","stroke-width":2,fill:"#70f0a7"});
    });
  }
  marks.forEach(([x,y],i)=>{
    if(i)el("line",{x1:marks[0][0],y1:marks[0][1],x2:x,y2:y,stroke:"#fce7a5","stroke-width":2,"stroke-dasharray":"6 4"});
    el("circle",{cx:x,cy:y,r:i?5:8,fill:i?"#ffe2a2":"#8df0b0",stroke:"#102a16","stroke-width":2});
    el("text",{x:x+9,y:y-9,fill:"#fff", "font-size":13}).textContent=i?i:"H";
  });
  measurementUI?.renderOverlay();
  $("photoExport").disabled=marks.length<2;
  $("fitButton").disabled=!COUNTS.includes(marks.length-1);
  $("fitExport").disabled=!fitResult;
  let info=null;
  if(marks.length>=2) {
    try{info=measureTips(marks[0],marks.slice(1),photoInfo||{});}catch(_){}
  }
  $("photoSummary").textContent=info
    ?info.tips.length+" tip(s) · angular spread "+info.angularSpreadDegrees.toFixed(1)+"° · relative to longest marked leaflet"
    :"Mark the shared leaflet junction (hub) first, then each visible tip.";
  $("photoPoints").textContent=info ? info.tips.map(t=>"Tip "+t.tip+": "+t.angleDegrees.toFixed(1)+"° / length ratio "+t.relativeLength.toFixed(3)).join("\n") : "";
  $("stageNote").textContent=photoURL
    ? "Local photo · "+marks.length+" marked point(s) · no biological interpretation"
    : marks.length ? "Imported annotation · "+marks.length+" marked point(s) · original image unavailable"
    : "Photo mode · no photo loaded";
  renderFitSummary();
}
function refresh(){
  fields.forEach(k=>$(k+"Val").textContent=$(k).value+(k==="fan"?"°":""));
  if(mode==="model")renderModel();
}
function setMode(next){
  mode=next;
  const isModel=mode==="model";
  $("modelTab").setAttribute("aria-pressed",String(isModel));$("photoTab").setAttribute("aria-pressed",String(!isModel));
  $("photoControls").classList.toggle("hidden",isModel);$("photoExports").classList.toggle("hidden",isModel);
  $("modelExports").classList.toggle("hidden",!isModel);$("syntheticMetrics").classList.toggle("hidden",!isModel);
  $("photoMetrics").classList.toggle("hidden",isModel);$("metricsTitle").textContent=isModel?"Synthetic metrics":"Photo measurements";
  isModel?refresh():renderPhoto();
}
fields.forEach(k=>$(k).addEventListener(k==="count"?"change":"input",refresh));
$("veins").addEventListener("change",refresh);
$("reset").addEventListener("click",()=>{fields.forEach(k=>$(k).value=DEFAULTS[k]);$("veins").checked=true;refresh();});
$("modelTab").addEventListener("click",()=>setMode("model"));
$("photoTab").addEventListener("click",()=>setMode("photo"));
$("photo").addEventListener("change",e=>{
  const f=e.target.files?.[0];if(!f)return;
  if(!f.type.startsWith("image/")){$("stageNote").textContent="Select an image file.";return;}
  if(photoURL)URL.revokeObjectURL(photoURL);
  photoURL=URL.createObjectURL(f);marks=[];fitResult=null;photoInfo=null;
  measurementUI?.resetForPhoto();
  const im=new Image();im.onload=()=>{photoInfo={filename:f.name,width:im.naturalWidth,height:im.naturalHeight};renderPhoto();};
  im.onerror=()=>{$("stageNote").textContent="Could not decode this image.";};
  im.src=photoURL;
});
svg.addEventListener("click",e=>{
  if(mode!=="photo"||!photoURL||!photoInfo)return;
  const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;
  const m=svg.getScreenCTM();if(!m)return;
  const p=pt.matrixTransform(m.inverse());
  const ratio=photoInfo.width/photoInfo.height;
  const frame=850/630;
  const width=ratio>frame?850:630*ratio, height=ratio>frame?850/ratio:630;
  if(p.x<(850-width)/2||p.x>(850+width)/2||p.y<(630-height)/2||p.y>(630+height)/2)return;
  if(measurementUI?.handleClick([p.x,p.y]))return;
  if(marks.length>=21)return;
  marks.push([p.x,p.y]);fitResult=null;renderPhoto();
});
$("undo").addEventListener("click",()=>{marks.pop();fitResult=null;renderPhoto();});
$("clear").addEventListener("click",()=>{marks=[];fitResult=null;renderPhoto();});
$("svgExport").addEventListener("click",()=>{
  const copy=svg.cloneNode(true);copy.setAttribute("xmlns",NS);
  download("cannabiverse-leaflab-synthetic.svg",new XMLSerializer().serializeToString(copy),"image/svg+xml");
});
$("jsonExport").addEventListener("click",()=>{
  const d={kind:model.kind,modelVersion:model.modelVersion,params:model.params,metrics:model.metrics,
    leaflets:model.leaves.map(({angle,length,halfWidth,area,perimeter})=>({angle,length,halfWidth,area,perimeter})),limitations:model.limitations};
  download("cannabiverse-leaflab-model.json",JSON.stringify(d,null,2),"application/json");
});
$("csvExport").addEventListener("click",()=>{
  const rows=["count,fan_degrees,area_model_units2,perimeter_model_units,vein_proxy_model_units,perimeter_over_sqrt_area,vein_proxy_over_sqrt_area"];
  COUNTS.forEach(count=>{const m=generateLeaf({...values(),count}).metrics;rows.push([count,values().fan,m.area,m.perimeter,m.veinLength,m.perimeterOverSqrtArea,m.schematicVeinOverSqrtArea].join(","));});
  download("cannabiverse-leaflab-counts.csv",rows.join("\n")+"\n","text/csv");
});
function currentAnnotation(){
  return measureTips(marks[0],marks.slice(1),
    {...(photoInfo||{}),coordinateSpace:"SVG 850x630 units, fit xMidYMid meet"});
}
function renderFitSummary(){
  $("fitRows").replaceChildren();
  if(!fitResult){
    $("fitSummary").textContent="No fit yet. Mark all tips, then press “Fit measured tip fan”.";
    $("fitWarnings").textContent="";
    return;
  }
  const f=fitResult.fitted, m=fitResult.metrics;
  $("fitSummary").textContent=
    "Measured span: "+fitResult.measuredFanSpreadDegrees.toFixed(1)+"°\n"+
    "Fitted fan: "+f.fanDegrees.toFixed(1)+"° · photo rotation: "+f.rotationDegrees.toFixed(1)+"°\n"+
    "Outer falloff: "+f.falloff.toFixed(2)+" · asymmetry: "+f.asymmetry.toFixed(2)+"\n"+
    "Angle RMSE: "+m.angleRMSEDegrees.toFixed(2)+"° · relative length RMSE: "+m.relativeLengthRMSE.toFixed(3)+"\n"+
    "Equal-length baseline RMSE: "+m.equalLengthBaselineRMSE.toFixed(3);
  fitResult.points.forEach(p=>{
    const row=document.createElement("tr");
    [p.tip,p.angleResidualDegrees.toFixed(2)+"°",p.relativeLengthResidual.toFixed(3)].forEach(value=>{
      const cell=document.createElement("td");cell.textContent=value;row.append(cell);
    });
    $("fitRows").append(row);
  });
  $("fitWarnings").textContent=fitResult.warnings.join(" ");
}
$("fitButton").addEventListener("click",()=>{
  try{
    if(!COUNTS.includes(marks.length-1))throw new RangeError("A complete 3/5/7/9/11-tip annotation is needed");
    fitResult=fitTipFan(currentAnnotation());
    renderPhoto();
  }catch(error){
    fitResult=null;renderPhoto();$("stageNote").textContent="Fit unavailable: "+error.message;
  }
});
$("fitExport").addEventListener("click",()=>{
  if(fitResult)download("cannabiverse-leaflab-descriptive-fit.json",
    JSON.stringify(fitResult,null,2),"application/json");
});
$("measurementImport").addEventListener("change",async event=>{
  const file=event.target.files?.[0];
  if(!file)return;
  try{
    if(file.size>1024*1024)throw new RangeError("Annotation JSON exceeds 1 MB");
    const data=JSON.parse(await file.text());
    validateAnnotation(data);
    if(photoURL)URL.revokeObjectURL(photoURL);
    photoURL=null;$("photo").value="";
    measurementUI?.resetForPhoto();
    marks=[data.hub,...data.tips.map(t=>[t.x,t.y])];
    photoInfo=data.source&&typeof data.source==="object"?data.source:{filename:file.name};
    fitResult=null;setMode("photo");
  }catch(error){
    $("stageNote").textContent="Import error: "+error.message;
  }
});
$("photoExport").addEventListener("click",()=>{
  if(marks.length<2)return;
  let result;
  try{result=currentAnnotation();}catch(e){$("stageNote").textContent=e.message;return;}
  download("cannabiverse-leaflab-photo-measurements.json",JSON.stringify(result,null,2),"application/json");
});
measurementUI=installMeasurementUI({svg,
  getPhotoURL:()=>photoURL,
  getPhotoInfo:()=>photoInfo,
  renderPhoto,download
});
window.addEventListener("pagehide",()=>{if(photoURL)URL.revokeObjectURL(photoURL);});
refresh();
