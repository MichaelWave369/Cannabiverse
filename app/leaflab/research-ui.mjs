import {makeStudyObservation,parseStudyObservation,studyRecords,studyJSON,
  importStudyCollection,evaluateHeldout,countPatternAudit,demoObservations} from "./study.mjs";
const $=id=>document.getElementById(id);
let records=[],heldout=null,countAudit=null;
const MAX_BYTES=1024*1024;
function setText(id,value){$(id).textContent=value;}
function save(filename,object){
  const b=new Blob([JSON.stringify(object,null,2)+"\n"],{type:"application/json"});
  const url=URL.createObjectURL(b);
  const a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
async function jsonFile(file){
  if(!file || file.size>MAX_BYTES)throw new RangeError("Choose a JSON file of at most 1 MB");
  const text=await file.text();
  return JSON.parse(text);
}
function studyOrigin(){return records.length&&records[0].origin==="synthetic-demo"?"SYNTHETIC DEMO · NO REAL SPECIMENS":"User-asserted manual annotations · unverified";}
function invalidate(){
  heldout=null;countAudit=null;
  $("heldoutSummary").hidden=true;$("countSummary").hidden=true;
  $("exportHeldout").disabled=true;$("exportCountAudit").disabled=true;
  $("modelRows").replaceChildren();
  setText("heldoutStatus",records.length?"Choose a study group and count, then evaluate.":"Add or import observations to begin.");
  setText("countStatus",records.length?"Run the count pattern audit for a descriptive comparison.":"Add both cannabis and control observations for a comparison.");
}
function renderCollection(){
  $("collectionRows").replaceChildren();
  $("exportCollection").disabled=!records.length;
  $("runHeldout").disabled=!records.length;
  $("runCountAudit").disabled=!records.length;
  const plants=new Set(records.map(o=>o.plantId)).size;
  setText("collectionStatus",records.length?
    records.length+" annotation(s) / "+plants+" user-entered plant IDs.\n"+studyOrigin():
    "No observations loaded.");
  for(const o of records){
    const tr=document.createElement("tr");
    for(const value of [o.specimenId,o.plantId,o.group,o.annotation.tips.length,
      o.origin==="synthetic-demo"?"SYNTHETIC":"manual"]){
      const td=document.createElement("td");td.textContent=String(value);tr.append(td);
    }
    $("collectionRows").append(tr);
  }
  invalidate();
}
function addObservation(o){
  const next=studyRecords([...records,o]);
  records=next;
  renderCollection();
}
$("group").addEventListener("change",()=>{
  $("species").value=$("group").value==="cannabis"?"Cannabis sativa":"Non-cannabis palmate control";
});
$("addObservation").addEventListener("click",async()=>{
  try{
    const annotation=await jsonFile($("annotationFile").files?.[0]);
    const meta={
      specimenId:$("specimenId").value.trim(),plantId:$("plantId").value.trim(),
      group:$("group").value,species:$("species").value.trim(),origin:"manual"
    };
    addObservation(makeStudyObservation(annotation,meta));
    $("annotationFile").value="";
    setText("collectionStatus",records.length+" annotation(s) added.\n"+studyOrigin());
  }catch(error){setText("collectionStatus","Could not add: "+error.message);}
});
$("loadDemo").addEventListener("click",()=>{
  records=demoObservations();renderCollection();
  setText("collectionStatus",records.length+" synthetic specimens loaded. NO REAL OBSERVATIONS.\n"+studyOrigin());
});
$("clearCollection").addEventListener("click",()=>{records=[];renderCollection();});
$("exportCollection").addEventListener("click",()=>{
  if(records.length)save("leaflab-v04-local-study.json",studyJSON(records));
});
$("importCollection").addEventListener("change",async(event)=>{
  try{
    const imported=importStudyCollection(await jsonFile(event.target.files?.[0]));
    records=studyRecords([...records,...imported]);
    renderCollection();
  }catch(error){setText("collectionStatus","Import not applied: "+error.message);}
  event.target.value="";
});
$("analysisGroup").addEventListener("change",invalidate);
$("analysisCount").addEventListener("change",invalidate);
$("runHeldout").addEventListener("click",()=>{
  try{
    heldout=evaluateHeldout(records,{count:Number($("analysisCount").value),group:$("analysisGroup").value});
    $("heldoutSummary").hidden=false;
    const x=heldout, delta=x.goldenMinusLinearRMSE;
    const i=delta.exploratoryPlantBootstrap95;
    setText("heldoutSummary",[
      "EVIDENCE LEVEL: "+x.evidenceLevel,
      "Training plants: "+x.design.trainingPlantCount+" · Held-out plants: "+x.design.heldoutPlantCount,
      "Split seed: "+x.design.seed,
      "Training IDs: "+x.design.trainingPlantIds.join(", "),
      "HELD-OUT IDs: "+x.design.heldoutPlantIds.join(", "),
      "Golden minus linear test RMSE: "+delta.meanDifference.toFixed(5),
      "Exploratory held-out plant resampling interval: ["+i.low.toFixed(5)+", "+i.high.toFixed(5)+"]",
      "Positive difference means golden-ratio model was WORSE.",
      "All findings remain exploratory; external validation is still required."
    ].join("\n"));
    $("modelRows").replaceChildren();
    for(const m of x.models){
      const row=document.createElement("tr");
      for(const v of [m.name,m.heldoutPlantRMSE.toFixed(5),
        m.angularGapRMSEDegrees.toFixed(3)+"°",
        m.name==="linear-falloff"||m.name==="curved-asymmetric"?m.trainedParameters.falloff.toFixed(2):"fixed",
        m.name==="curved-asymmetric"?m.trainedParameters.asymmetry.toFixed(2):"fixed"]){
        const td=document.createElement("td");td.textContent=String(v);row.append(td);
      }
      $("modelRows").append(row);
    }
    $("exportHeldout").disabled=false;
    setText("heldoutStatus",x.evidenceLevel+" · Lower held-out plant error is better. No p-value.");
  }catch(error){
    heldout=null;$("exportHeldout").disabled=true;$("heldoutSummary").hidden=true;
    $("modelRows").replaceChildren();setText("heldoutStatus","Cannot evaluate: "+error.message);
  }
});
$("exportHeldout").addEventListener("click",()=>{
  if(heldout)save("leaflab-heldout-model-audit.json",heldout);
});
$("runCountAudit").addEventListener("click",()=>{
  try{
    countAudit=countPatternAudit(records);
    $("countSummary").hidden=false;
    const {cannabis,control,excludedAmbiguousPlantIds,reference}=countAudit;
    setText("countSummary",[
      "EVIDENCE LEVEL: "+countAudit.evidenceLevel,
      "Cannabis: "+cannabis.threeOrNinePlantCount+"/"+cannabis.plantCount+
        " plants (3 or 9) · "+(cannabis.proportion===null?"n/a":(100*cannabis.proportion).toFixed(1)+"%"),
      "Control: "+control.threeOrNinePlantCount+"/"+control.plantCount+
        " plants (3 or 9) · "+(control.proportion===null?"n/a":(100*control.proportion).toFixed(1)+"%"),
      "Excluded plants with inconsistent observed counts: "+excludedAmbiguousPlantIds.length,
      reference?
       "Exploratory conditional label-permutation two-sided p: "+reference.conditionalLabelPermutationTwoSidedP.toFixed(5)+
       " · sample difference: "+reference.observedProportionDifference.toFixed(4):
       "Need at least 5 unique eligible plants per group for conditional permutation reference.",
      "This does NOT test 6 and does not establish a biological 3-6-9 effect."
    ].join("\n"));
    $("exportCountAudit").disabled=false;
    setText("countStatus",countAudit.evidenceLevel+
      " · Counts and reference distribution rely on plant IDs and sample composition.");
  }catch(error){
    countAudit=null;$("exportCountAudit").disabled=true;$("countSummary").hidden=true;
    setText("countStatus","Cannot audit: "+error.message);
  }
});
$("exportCountAudit").addEventListener("click",()=>{
  if(countAudit)save("leaflab-count-pattern-audit.json",countAudit);
});
renderCollection();
