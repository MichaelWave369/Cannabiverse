import {makeReread,rereadRecords,rereadJSON,importRereadJSON,
  auditRereads,demoRereads} from "./reliability.mjs";
import {importStudyCollection,demoObservations,fitExternalSnapshot,
  validateExternalSnapshot,evaluateExternalSnapshot} from "./study.mjs";

const $=id=>document.getElementById(id),MAX=1024*1024;
let reannotations=[],agreement=null,snapshot=null,externalReport=null,externalDemoRows=null;
const show=(id,msg)=>{$(id).textContent=msg;};
async function jsonFile(file){
  if(!file||file.size>MAX)throw new RangeError("Choose a JSON file of at most 1 MB");
  return JSON.parse(await file.text());
}
function save(filename,data){
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+"\n"],{type:"application/json"}));
  const a=document.createElement("a");
  a.download=filename;a.href=url;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function resetAgreement(){
  agreement=null;$("saveReliability").disabled=true;$("reliabilityResult").hidden=true;
}
function renderAnnotations(){
  resetAgreement();
  $("rereadRows").replaceChildren();
  $("saveRereads").disabled=!reannotations.length;
  $("runReliability").disabled=!reannotations.length;
  for(const r of reannotations){
    const tr=document.createElement("tr");
    for(const v of [r.specimenId,r.plantId,r.imageId,r.observerCode,r.annotation.tips.length]){
      const td=document.createElement("td");td.textContent=String(v);tr.append(td);
    }
    $("rereadRows").append(tr);
  }
  show("rereadStatus",reannotations.length?
    reannotations.length+" annotation records · "+
    new Set(reannotations.map(r=>r.specimenId)).size+" specimen(s)\n"+
    (reannotations[0].origin==="synthetic-demo"?"SYNTHETIC DEMONSTRATION: no real measurements":
    "MANUAL DATA: observer and image identities are user assertions"):"No annotations loaded.");
}
$("addReread").addEventListener("click",async()=>{
  try{
    const annotation=await jsonFile($("rereadFile").files?.[0]);
    const row=makeReread(annotation,{
      specimenId:$("rereadSpecimen").value.trim(),plantId:$("rereadPlant").value.trim(),
      imageId:$("rereadImage").value.trim(),observerCode:$("observerCode").value.trim(),
      origin:"manual"
    });
    reannotations=rereadRecords([...reannotations,row]);renderAnnotations();
    $("rereadFile").value="";
  }catch(error){show("rereadStatus","Cannot add annotation: "+error.message);}
});
$("demoReread").addEventListener("click",()=>{
  reannotations=demoRereads();renderAnnotations();
});
$("rereadImport").addEventListener("change",async e=>{
  try{
    const rows=importRereadJSON(await jsonFile(e.target.files?.[0]));
    reannotations=rereadRecords([...reannotations,...rows]);renderAnnotations();
  }catch(error){show("rereadStatus","Import not applied: "+error.message);}
  e.target.value="";
});
$("runReliability").addEventListener("click",()=>{
  try{
    agreement=auditRereads(reannotations);
    $("saveReliability").disabled=false;
    $("reliabilityResult").hidden=false;
    const comparable=agreement.specimens.filter(s=>s.meanRelativeLengthMAE!==null);
    const mean=x=>x.reduce((a,b)=>a+b,0)/x.length;
    const disagreement=comparable.length?mean(comparable.map(s=>s.meanRelativeLengthMAE)).toFixed(5):"n/a";
    const conflicts=agreement.specimens.reduce((a,s)=>a+s.mismatchedTipCountPairs,0);
    const interval=agreement.exploratoryPlantResamplingInterval;
    show("reliabilityResult",[
      "STATUS: "+agreement.evidenceLevel,
      "Reviewed specimens: "+agreement.specimenCount,
      "User-asserted distinct plant IDs: "+agreement.distinctPlantIds,
      "Comparable specimens: "+comparable.length,
      "Tip-count mismatch observer pairs: "+conflicts,
      "Mean relative-length MAE (comparable specimens): "+disagreement,
      interval?"Exploratory plant-bootstrap interval: ["+interval.lower.toFixed(5)+", "+interval.upper.toFixed(5)+"]":
        "Plant-level resampling interval needs at least 3 comparable Plant IDs.",
      "Exact per-specimen pair errors and exclusions are in the JSON report.",
      "Measurements are not biological ground truth or verified observer-blind."
    ].join("\n"));
    show("rereadStatus","Agreement run complete. Export report for per-observer differences.");
  }catch(error){
    resetAgreement();show("rereadStatus","Cannot compare reannotations: "+error.message);
  }
});
$("saveRereads").addEventListener("click",()=>{
  if(reannotations.length)save("leaflab-reannotations-v05.json",rereadJSON(reannotations));
});
$("saveReliability").addEventListener("click",()=>{
  if(agreement)save("leaflab-annotation-agreement-v05.json",agreement);
});
$("clearRereads").addEventListener("click",()=>{reannotations=[];renderAnnotations();});

function invalidateTest(){
  externalReport=null;
  $("saveExternal").disabled=true;$("externalResult").hidden=true;
  $("externalRows").replaceChildren();
  show("externalStatus","No external test run.");
}
function setSnapshot(s){
  snapshot=validateExternalSnapshot(s);
  $("saveSnapshot").disabled=false;
  $("runExternal").disabled=false;
  $("externalGroup").value=snapshot.group;
  $("externalCount").value=String(snapshot.count);
  show("snapshotStatus",[
    "Fixed model snapshot loaded",
    "Group: "+snapshot.group+" · "+snapshot.count+" leaflets",
    "Training: "+snapshot.trainingPlantCount+" plant ID(s), "+snapshot.trainingSpecimenCount+" specimen(s)",
    "Origin: "+(snapshot.trainingOrigin==="synthetic-demo"?"SYNTHETIC DEMO":"user-asserted manual"),
    "Predictions cannot be refit during external evaluation."
  ].join("\n"));
  invalidateTest();
}
$("trainSnapshot").addEventListener("click",async()=>{
  try{
    const raw=await jsonFile($("trainingFile").files?.[0]);
    const rows=importStudyCollection(raw);
    externalDemoRows=null;
    setSnapshot(fitExternalSnapshot(rows,{
      group:$("externalGroup").value,count:Number($("externalCount").value)
    }));
  }catch(error){show("snapshotStatus","Cannot fit snapshot: "+error.message);}
});
$("snapshotFile").addEventListener("change",async e=>{
  try{
    const s=await jsonFile(e.target.files?.[0]);
    externalDemoRows=null;
    setSnapshot(s);
  }catch(error){show("snapshotStatus","Invalid snapshot: "+error.message);}
  e.target.value="";
});
$("saveSnapshot").addEventListener("click",()=>{
  if(snapshot)save("leaflab-fixed-model-snapshot-v05.json",snapshot);
});
for(const field of ["externalGroup","externalCount"]){
  $(field).addEventListener("change",()=>{
    snapshot=null;externalDemoRows=null;
    $("saveSnapshot").disabled=true;$("runExternal").disabled=true;
    show("snapshotStatus","Group/count changed. Fit or import a new fixed snapshot.");
    invalidateTest();
  });
}
$("demoExternal").addEventListener("click",()=>{
  try{
    const all=demoObservations().filter(o=>o.group==="cannabis"&&o.annotation.tips.length===7)
      .sort((a,b)=>a.plantId.localeCompare(b.plantId));
    externalDemoRows=all.slice(6);
    setSnapshot(fitExternalSnapshot(all.slice(0,6),{group:"cannabis",count:7}));
    show("externalStatus","SYNTHETIC DEMO: six training plants, four disjoint test plants prepared locally.");
  }catch(error){show("externalStatus","Cannot load demo: "+error.message);}
});
$("runExternal").addEventListener("click",async()=>{
  try{
    if(!snapshot)throw new RangeError("Train or load a fixed snapshot first");
    const rows=externalDemoRows||importStudyCollection(
      await jsonFile($("externalFile").files?.[0]));
    externalReport=evaluateExternalSnapshot(snapshot,rows);
    $("externalRows").replaceChildren();
    for(const model of externalReport.models){
      const tr=document.createElement("tr");
      for(const value of [
        model.name,model.externalMeanPlantLengthRMSE.toFixed(5),
        model.externalMeanPlantAngularGapRMSE.toFixed(3)+"°",
        model.trainingParameters.falloff.toFixed(2),
        model.trainingParameters.asymmetry.toFixed(2)
      ]){
        const td=document.createElement("td");td.textContent=String(value);tr.append(td);
      }
      $("externalRows").append(tr);
    }
    const diff=externalReport.goldenMinusLinearExternalRMSE;
    const bounds=diff.exploratoryPlantBootstrap95;
    show("externalResult",[
      "EVIDENCE: "+externalReport.evidenceLevel,
      "Training Plant IDs: "+externalReport.design.trainingPlantIds.join(", "),
      "EXTERNAL Plant IDs: "+externalReport.design.externalPlantIds.join(", "),
      "External specimens: "+externalReport.design.externalSpecimenCount,
      "Golden-minus-linear RMSE: "+diff.meanDifference.toFixed(5),
      "Positive = GOLDEN MODEL WORSE. Negative = golden candidate better.",
      "Exploratory plant-resampling interval: ["+bounds.low.toFixed(5)+", "+bounds.high.toFixed(5)+"]",
      "No external plant was used to refit the model.",
      "External identity and prior non-use are not technically authenticated."
    ].join("\n"));
    $("externalResult").hidden=false;
    $("saveExternal").disabled=false;
    show("externalStatus","External evaluation complete. All plant identifiers were checked for disjointness.");
  }catch(error){
    invalidateTest();show("externalStatus","External evaluation rejected: "+error.message);
  }
});
$("saveExternal").addEventListener("click",()=>{
  if(externalReport)save("leaflab-external-evaluation-v05.json",externalReport);
});
renderAnnotations();
