import {syntheticEvidenceDemo,auditObserverAgreement,
  makeExplicitPlantSplit,summarizePlantHoldout} from "./evidence-gateway.mjs";

const $=id=>document.getElementById(id);
const info=(id,value)=>{$(id).textContent=String(value);};
const f1=x=>x===null?"n/a":(100*x).toFixed(1)+"%";
let annotations=[],modelReports=[],audit=null,partition=null,summary=null;
const save=(filename,obj)=>{
  const blob=new Blob([JSON.stringify(obj,null,2)+"\n"],{type:"application/json"}),
    url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
};
async function loadJSONFiles(files,limit){
  const found=[...files];
  if(found.length>limit)throw new RangeError("Too many files");
  const result=[];
  for(const file of found){
    if(file.size>1024*1024)throw new RangeError("Individual JSON file exceeds 1 MB");
    result.push(JSON.parse(await file.text()));
  }
  return result;
}
function clearDerived(){
  audit=null;partition=null;summary=null;
  $("exportAgreement").disabled=true;
  $("buildSplit").disabled=true;
  $("exportSplit").disabled=true;
  $("buildHoldout").disabled=true;
  $("exportHoldout").disabled=true;
  $("observerRows").replaceChildren();
  $("holdoutRows").replaceChildren();
  $("plantRoles").replaceChildren();
  for(const id of ["refCount","imageCount","plantCount","pairedCount"])info(id,"–");
  info("observerNotes","Run an observer audit on imported references.");
  info("splitStatus","No valid study partition. Each plant must be assigned to one group.");
  info("holdoutNotes","No held-out summary. Imported model scores are unverified.");
}
function clearSplit(){
  partition=null;summary=null;
  $("exportSplit").disabled=true;
  $("buildHoldout").disabled=true;
  $("exportHoldout").disabled=true;
  $("holdoutRows").replaceChildren();
  info("splitStatus","Plant roles changed. Create a new split to evaluate.");
  info("holdoutNotes","No current held-out summary.");
}
function roleSelections(){
  const options=[...$("plantRoles").querySelectorAll("select")];
  const development=[],holdout=[];
  for(const s of options){
    if(s.value==="development")development.push(s.dataset.plantId);
    else if(s.value==="holdout")holdout.push(s.dataset.plantId);
  }
  return {development,holdout,unassigned:options.length-development.length-holdout.length};
}
function renderPlantRoles(){
  const container=$("plantRoles");
  container.replaceChildren();
  for(const id of audit.plantIds){
    const label=document.createElement("label");
    label.textContent=id;
    const select=document.createElement("select");
    select.dataset.plantId=id;
    select.setAttribute("aria-label","Partition role for plant "+id);
    for(const [value,name] of [["unassigned","Not yet assigned"],
      ["development","Development plant"],["holdout","Holdout plant"]]){
      const opt=document.createElement("option");
      opt.value=value;opt.textContent=name;select.append(opt);
    }
    select.value="unassigned";
    select.addEventListener("change",clearSplit);
    container.append(label,select);
  }
}
$("refFiles").addEventListener("change",async event=>{
  try{
    const incoming=await loadJSONFiles(event.target.files,36);
    const candidate=[...annotations,...incoming];
    if(candidate.length>36)throw new RangeError("Maximum 36 total annotations");
    auditObserverAgreement(candidate,{
      tolerance:Number($("agreementTolerance").value)
    });
    annotations=candidate;
    clearDerived();
    info("referenceStatus",annotations.length+
      " annotations loaded. Review their source and observer codes before auditing.");
    $("auditEvidence").disabled=false;
  }catch(error){info("referenceStatus","Import rejected without changing files: "+error.message);}
  event.target.value="";
});
$("syntheticEvidence").addEventListener("click",()=>{
  annotations=syntheticEvidenceDemo();modelReports=[];
  $("modelReports").value="";
  clearDerived();
  info("referenceStatus","SYNTHETIC DEMONSTRATION ONLY: 4 machine-drawn references for 2 imaginary plants. No real photos.");
  info("reportStatus","No model reports loaded.");
  $("auditEvidence").disabled=false;
});
$("clearEvidence").addEventListener("click",()=>{
  annotations=[];modelReports=[];clearDerived();
  $("auditEvidence").disabled=true;
  $("refFiles").value="";$("modelReports").value="";
  info("referenceStatus","No annotation files loaded.");
  info("reportStatus","No model reports loaded.");
});
$("agreementTolerance").addEventListener("input",event=>{
  info("toleranceValue",event.target.value+" pixels");
  clearDerived();
});
$("auditEvidence").addEventListener("click",()=>{
  try{
    const next=auditObserverAgreement(annotations,{
      tolerance:Number($("agreementTolerance").value)
    });
    clearDerived();audit=next;
    info("refCount",audit.referenceCount);
    info("imageCount",audit.imageCount);
    info("plantCount",audit.assertedPlantCount);
    info("pairedCount",audit.pairedImageCount);
    for(const x of audit.images){
      const tr=document.createElement("tr");
      for(const value of [
        x.specimenId,x.plantId,x.observerCodes.join(" & "),
        x.pairCount,f1(x.meanPairAgreementF1),
        x.reviewStatus==="PAIRED_REVIEW_AVAILABLE"?
          "Two+ self-asserted observers":"Independent review missing"
      ]){
        const td=document.createElement("td");td.textContent=String(value);tr.append(td);
      }
      $("observerRows").append(tr);
    }
    info("observerNotes",[
      "EVIDENCE STATUS: "+audit.evidenceStatus,
      "Image count: "+audit.imageCount,
      "Paired images: "+audit.pairedImageCount,
      "Unpaired images: "+audit.unpairedImageCount,
      "Pixel tolerance: "+audit.tolerancePixels,
      "Blinding and genuine observer independence CANNOT be verified from JSON.",
      "Missing independent reviews stay missing, not scored as perfect agreement."
    ].join("\n"));
    renderPlantRoles();
    $("exportAgreement").disabled=false;
    $("buildSplit").disabled=audit.plantIds.length<2;
    if(audit.plantIds.length<2)
      info("splitStatus","At least 2 different asserted plants required for a development/holdout partition.");
  }catch(error){
    clearDerived();info("observerNotes","Audit rejected: "+error.message);
  }
});
$("exportAgreement").addEventListener("click",()=>{
  if(audit)save("leaflab-v12-observer-agreement.json",audit);
});
$("buildSplit").addEventListener("click",()=>{
  try{
    if(!audit)throw new RangeError("Run annotation audit first");
    const selected=roleSelections();
    if(selected.unassigned)throw new RangeError(
      selected.unassigned+" plant(s) have no assigned split role");
    const result=makeExplicitPlantSplit(audit,
      selected.development,selected.holdout);
    partition=result;summary=null;
    $("exportSplit").disabled=false;
    $("buildHoldout").disabled=false;
    $("exportHoldout").disabled=true;
    $("holdoutRows").replaceChildren();
    info("splitStatus",[
      "SELF-DECLARED, NOT CRYPTOGRAPHICALLY FROZEN",
      "Development: "+partition.developmentPlantIds.join(", "),
      "Holdout: "+partition.holdoutPlantIds.join(", "),
      "Images assigned: "+partition.images.length,
      "Export and register a real protocol externally before untouched evaluation."
    ].join("\n"));
  }catch(error){
    partition=null;$("exportSplit").disabled=true;
    $("buildHoldout").disabled=true;
    info("splitStatus","Partition rejected: "+error.message);
  }
});
$("exportSplit").addEventListener("click",()=>{
  if(partition)save("leaflab-v12-self-declared-plant-split.json",partition);
});
$("modelReports").addEventListener("change",async event=>{
  try{
    const incoming=await loadJSONFiles(event.target.files,72);
    const candidate=[...modelReports,...incoming];
    if(candidate.length>72)throw new RangeError("Maximum 72 detector reports");
    if(audit&&partition)summarizePlantHoldout(audit,partition,candidate);
    modelReports=candidate;
    summary=null;$("exportHoldout").disabled=true;
    info("holdoutNotes","Model reports modified. Rebuild summary to review metrics.");
    info("reportStatus",modelReports.length+" detector report JSON file(s) loaded. Unsigned metrics are not recomputed.");
  }catch(error){info("reportStatus","Report import rejected, previously loaded reports unchanged: "+error.message);}
  event.target.value="";
});
$("buildHoldout").addEventListener("click",()=>{
  try{
    if(!audit||!partition)throw new RangeError("Audit and declare a plant-level split first");
    summary=summarizePlantHoldout(audit,partition,modelReports);
    $("holdoutRows").replaceChildren();
    for(const group of summary.groups){
      for(const model of group.detectors){
        const tr=document.createElement("tr");
        for(const value of [
          group.role,model.detector,f1(model.meanOfPlantMeansF1),
          model.contributingPlantCount,model.totalAssignedPlants,
          group.detectorReports
        ]){
          const td=document.createElement("td");td.textContent=String(value);tr.append(td);
        }
        $("holdoutRows").append(tr);
      }
    }
    info("holdoutNotes",[
      "STATUS: "+summary.conclusionStatus,
      "Imported reports: "+summary.detectorReportCount,
      "Development and holdout are explicitly partitioned by asserted whole plant.",
      "Detector parameters: "+(summary.settings?
        JSON.stringify(summary.settings):"not supplied"),
      "Numerical model scores come from UNSIGNED imported JSON. NOT re-run.",
      "No independent real specimen data, confirmation or biological discovery is implied."
    ].join("\n"));
    $("exportHoldout").disabled=false;
  }catch(error){
    summary=null;$("exportHoldout").disabled=true;
    info("holdoutNotes","Held-out audit rejected: "+error.message);
  }
});
$("exportHoldout").addEventListener("click",()=>{
  if(summary)save("leaflab-v12-evidence-gateway-summary.json",summary);
});
clearDerived();
$("auditEvidence").disabled=true;
