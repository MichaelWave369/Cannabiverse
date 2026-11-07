// Cannabiverse Φ LeafLab v0.3 — strictly local manual measurement UI.
import {calibrateScale,validatedOutline,measureOutline,makeSpecimen,
        parseSpecimen,compareSpecimens,cohortCSV} from "./measure.mjs";

export function installMeasurementUI({svg,getPhotoURL,getPhotoInfo,renderPhoto,download}) {
  const $=id=>document.getElementById(id);
  const NS="http://www.w3.org/2000/svg";
  let tool="tips",scaleMarks=[],draft=[],outlines=[],records=[];
  const status=message=>{$("physicalStatus").textContent=message;};
  const cohortStatus=message=>{$("cohortStatus").textContent=message;};
  function make(name,attrs={},text){
    const e=document.createElementNS(NS,name);
    for(const [key,value] of Object.entries(attrs))e.setAttribute(key,String(value));
    if(text!==undefined)e.textContent=String(text);
    svg.append(e);
    return e;
  }
  function setTool(name) {
    tool=name;
    for(const [id,value] of [["tipTool","tips"],["scaleTool","scale"],["traceTool","trace"]]){
      $(id).setAttribute("aria-pressed",String(name===value));
    }
    renderPhoto();
  }
  function resetForPhoto() {
    scaleMarks=[];draft=[];outlines=[];tool="tips";
    for(const [id,value] of [["tipTool","tips"],["scaleTool","scale"],["traceTool","trace"]]){
      $(id).setAttribute("aria-pressed",String(value==="tips"));
    }
    // Cohort records deliberately persist while browsing multiple specimens.
  }
  function handleClick(point) {
    if(tool==="tips")return false;
    if(!getPhotoURL() || !getPhotoInfo()){
      status("Load an image to mark its ruler or leaflet boundary.");
      return true;
    }
    if(tool==="scale"){
      if(scaleMarks.length>=2)scaleMarks=[];
      scaleMarks.push([point[0],point[1]]);
      if(scaleMarks.length===2)tool="tips";
      for(const [id,name] of [["tipTool","tips"],["scaleTool","scale"],["traceTool","trace"]])
        $(id).setAttribute("aria-pressed",String(name===tool));
    }else if(tool==="trace"){
      if(draft.length>=200){status("Maximum of 200 vertices per outline.");return true;}
      draft.push([point[0],point[1]]);
    }
    renderPhoto();
    return true;
  }
  function paintPath(points,{closed=false,color="#f5d183",fill="none",opacity=1,width=2}={}){
    if(points.length<2)return;
    const d=points.map((p,i)=>(i?"L":"M")+p[0].toFixed(3)+" "+p[1].toFixed(3)).join(" ")+(closed?" Z":"");
    make("path",{d,fill,stroke:color,"stroke-width":width,
      "stroke-linejoin":"round",opacity});
  }
  function drawPoint(p,number,color){
    make("circle",{cx:p[0],cy:p[1],r:4,fill:color,stroke:"#092514","stroke-width":1.5});
    make("text",{x:p[0]+7,y:p[1]-6,"font-size":12,fill:color},number);
  }
  function renderOverlay(){
    for(const o of outlines){
      paintPath(o.vertices,{closed:true,color:"#9eebcb",fill:"#67d59b",opacity:.76,width:1.8});
      drawPoint(o.vertices[0],o.leafletId,"#baffcf");
    }
    if(draft.length){
      paintPath(draft,{color:"#ffc56d",width:2.5});
      draft.forEach((p,i)=>drawPoint(p,i+1,"#ffe09b"));
    }
    if(scaleMarks.length){
      paintPath(scaleMarks,{color:"#ff8b86",width:3.5});
      scaleMarks.forEach((p,i)=>drawPoint(p,i+1,"#ffb5a5"));
    }
    let scaleMessage="No calibration yet";
    if(scaleMarks.length===2){
      try{
        const s=calibrateScale({knownLengthMm:Number($("knownLengthMm").value),points:scaleMarks});
        scaleMessage=s.mmPerDisplayUnit+" mm / display unit (approximate)";
      }catch(error){scaleMessage="Scale needs correction: "+error.message;}
    }else if(scaleMarks.length===1)scaleMessage="Click the ruler's second endpoint";
    const modeMessage=tool==="scale"?"Click two endpoints along the known ruler segment."
      :tool==="trace"?"Trace the selected leaflet edge with multiple clicks, then Close outline."
      :"Clicks mark hub and leaflet tips; choose a different tool to measure outlines.";
    status(scaleMessage+" · "+outlines.length+" saved outline(s) · "+
      draft.length+" draft vertex/vertices.\n"+modeMessage);
  }
  function currentRecord() {
    if(!getPhotoURL() || !getPhotoInfo()) throw new RangeError(
      "Use the original photo for physical scale and outline tracing");
    return makeSpecimen({
      specimenId:$("specimenId").value.trim(),plantId:$("plantId").value.trim(),
      source:getPhotoInfo(),calibration:{
        knownLengthMm:Number($("knownLengthMm").value),points:scaleMarks
      },outlines
    });
  }
  $("tipTool").addEventListener("click",()=>setTool("tips"));
  $("scaleTool").addEventListener("click",()=>{
    scaleMarks=[];setTool("scale");
  });
  $("traceTool").addEventListener("click",()=>{
    draft=[];setTool("trace");
  });
  $("knownLengthMm").addEventListener("input",renderPhoto);
  $("finishOutline").addEventListener("click",()=>{
    try{
      const selected=Number($("outlineLeaflet").value);
      const clean=validatedOutline({leafletId:selected,vertices:draft});
      outlines=outlines.filter(o=>o.leafletId!==selected);
      outlines.push(clean);
      outlines.sort((a,b)=>a.leafletId-b.leafletId);
      draft=[];setTool("tips");
    }catch(error){status("Cannot save outline: "+error.message);}
  });
  $("undoOutline").addEventListener("click",()=>{draft.pop();renderPhoto();});
  $("clearOutline").addEventListener("click",()=>{draft=[];renderPhoto();});
  $("clearScale").addEventListener("click",()=>{scaleMarks=[];setTool("tips");});
  $("specimenExport").addEventListener("click",()=>{
    try{
      const record=currentRecord();
      download("leaflab-specimen-"+record.specimenId+".json",
        JSON.stringify(record,null,2),"application/json");
      status("Exported "+record.specimenId+". Measurements are manual and image-plane approximate.");
    }catch(error){status("Export unavailable: "+error.message);}
  });
  function drawCohort(){
    $("cohortRows").replaceChildren();
    const can=records.length>0;
    $("cohortExportCSV").disabled=!can;
    $("cohortExportJSON").disabled=!can;
    if(!can){cohortStatus("No specimens loaded.");return;}
    const group=compareSpecimens(records);
    for(const sample of group.specimens){
      const tr=document.createElement("tr");
      for(const v of [sample.specimenId,sample.plantId,
        sample.tracedLeaflets,sample.meanAreaMm2.toFixed(2)]){
        const td=document.createElement("td");td.textContent=String(v);tr.append(td);
      }
      $("cohortRows").append(tr);
    }
    const duplicates=group.specimenCount-group.distinctPlantIds;
    cohortStatus(group.specimenCount+" specimen(s) across "+group.distinctPlantIds+
      " distinct user-entered plant ID(s). "+
      (duplicates?"Repeated plant ID(s) are grouped, not independent. ":"")+
      "Only mean traced-leaflet area is compared. No statistical inference.");
  }
  function addRecord(record){
    if(records.some(r=>r.specimenId===record.specimenId))
      throw new RangeError("Duplicate specimen ID: "+record.specimenId);
    if(records.length>=200)throw new RangeError("Maximum 200 specimens per comparison");
    records=[...records,parseSpecimen(record)];
    drawCohort();
  }
  $("specimenAdd").addEventListener("click",()=>{
    try{
      const record=currentRecord();
      addRecord(record);
      status("Added "+record.specimenId+" to the in-memory comparison. Export JSON to preserve it.");
    }catch(error){status("Cannot add specimen: "+error.message);}
  });
  $("cohortImport").addEventListener("change",async event=>{
    const files=[...(event.target.files||[])];
    if(!files.length)return;
    try{
      if(files.length+records.length>200)throw new RangeError("Cohort is limited to 200 specimens");
      const parsed=[];
      for(const file of files){
        if(file.size>1024*1024)throw new RangeError(file.name+" exceeds the 1 MB JSON limit");
        parsed.push(parseSpecimen(JSON.parse(await file.text())));
      }
      const merged=[...records,...parsed];
      compareSpecimens(merged); // atomic duplicate and schema check
      records=merged;drawCohort();
    }catch(error){cohortStatus("Import cancelled: "+error.message);}
    event.target.value="";
  });
  $("cohortExportCSV").addEventListener("click",()=>{
    if(!records.length)return;
    download("leaflab-specimen-comparison.csv",
      cohortCSV(compareSpecimens(records)),"text/csv");
  });
  $("cohortExportJSON").addEventListener("click",()=>{
    if(!records.length)return;
    download("leaflab-cohort-summary.json",
      JSON.stringify(compareSpecimens(records),null,2),"application/json");
  });
  $("cohortClear").addEventListener("click",()=>{records=[];drawCohort();});
  drawCohort();
  return {handleClick,renderOverlay,resetForPhoto};
}
