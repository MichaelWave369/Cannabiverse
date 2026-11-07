import {parseVeinReference} from "./vein-benchmark.mjs";
import {graphFromReference,demoNetworkReferences,simulationTopologies} from "./network-atlas.mjs";
import {commonWireBudgetRange,allocateWithinWireBudget,runTransportBenchmark}
  from "./transport-v11.mjs";

const $=id=>document.getElementById(id);
const SVG="http://www.w3.org/2000/svg";
const info=(id,value)=>{$(id).textContent=String(value)};
const num=id=>Number($(id).value);
const pct=x=>x===null?"n/a":(x*100).toFixed(1)+"%";
const dec=x=>x===null?"n/a":Number(x).toFixed(2);
let source=null,topologies=[],results=null;
function clearRun(){
  results=null;
  $("transportExport").disabled=true;
  $("transportSelectRun").disabled=true;
  $("transportSelectRun").replaceChildren();
  $("transportRows").replaceChildren();
  info("transportCount","–");info("transportSamples","–");
  info("transportDetail","No run selected.");
  info("runInfo","Run the simulation to inspect new results.");
  info("matrixInfo","No current benchmark.");
  paintChart(null);
}
function refreshFaults(){
  const fail=$("transportFault").value==="node";
  for(const id of ["transportNode","transportStart","transportDuration"])
    $(id).disabled=!fail;
  $("transportHotspot").disabled=$("transportTraffic").value!=="hub-hotspot";
}
function refreshSourceNodes(){
  const count=topologies[0]?.graph.nodes.length||0;
  for(const id of ["transportNode","transportHotspot"]){
    const elem=$(id),value=Number(elem.value)||0;
    elem.replaceChildren();
    for(let i=0;i<count;i++){
      const opt=document.createElement("option");
      opt.value=String(i);opt.textContent="Node "+i;elem.append(opt);
    }
    if(count)elem.value=String(Math.min(value,count-1));
  }
}
function refreshCap(){
  if(!topologies.length)return;
  const cap=commonWireBudgetRange(topologies);
  const field=$("transportCost");
  field.min=String(cap.minimum);field.max=String(cap.maximum);
  if(num("transportCost")<cap.minimum||num("transportCost")>cap.maximum)
    field.value=String(Math.min(cap.maximum,cap.minimum*2));
  info("costInfo","Minimum common cost ceiling: "+cap.minimum+
    " proxy units. All links require at least one slot; each link can hold at most 12.");
}
function currentTopology(){
  return topologies.find(x=>x.name===$("transportShape").value)||topologies[0];
}
function element(name,attr,parent){
  const node=document.createElementNS(SVG,name);
  for(const [key,value] of Object.entries(attr))node.setAttribute(key,String(value));
  parent.append(node);
  return node;
}
function drawGraph(){
  const svg=$("transportFigure");svg.replaceChildren();
  const t=currentTopology();
  if(!t){
    for(const id of ["transportEdges","transportSlots","transportSpent","transportSlack"])
      info(id,"–");
    return;
  }
  const n=t.graph.nodes,e=t.graph.edges,
    xs=n.map(x=>x.x),ys=n.map(x=>x.y);
  const left=Math.min(...xs)-9,top=Math.min(...ys)-9;
  const width=Math.max(24,Math.max(...xs)-Math.min(...xs)+18);
  const height=Math.max(24,Math.max(...ys)-Math.min(...ys)+18);
  svg.setAttribute("viewBox",left+" "+top+" "+width+" "+height);
  let allocation;
  try{
    allocation=allocateWithinWireBudget(t.graph,num("transportCost"),
      $("transportAllocation").value);
  }catch(error){
    info("runInfo","Capacity preview rejected: "+error.message);
  }
  for(const edge of e){
    const start=n[edge.a],end=n[edge.b];
    element("line",{x1:start.x,y1:start.y,x2:end.x,y2:end.y,
      stroke:"#95e5b9","stroke-linecap":"round",
      "stroke-width":allocation?1+allocation.edgeCapacities[edge.id]*.35:1.5},svg);
  }
  for(const node of n){
    const failed=$("transportFault").value==="node"&&
      node.id===num("transportNode");
    element("circle",{cx:node.x,cy:node.y,r:2.3,
      fill:failed?"#eb918d":"#f7e6b5",stroke:"#0c2b1a",
      "stroke-width":.6},svg);
  }
  info("transportEdges",e.length);
  info("transportSlots",allocation?.installedSlots??"–");
  info("transportSpent",allocation?allocation.weightedCost.toFixed(1):"–");
  info("transportSlack",allocation?allocation.unspent.toFixed(1):"–");
}
function loadReference(raw){
  const parsed=parseVeinReference(raw);
  const graph=graphFromReference(parsed);
  if(graph.nodes.length>36||graph.edges.length>110)
    throw new RangeError("Simplify annotation to 36 nodes and 110 links");
  const layouts=simulationTopologies(graph);
  commonWireBudgetRange(layouts);
  source=parsed;topologies=layouts;
  refreshSourceNodes();refreshCap();refreshFaults();clearRun();
  $("transportRun").disabled=false;
  info("sourceInfo",[
    parsed.origin==="synthetic-demo"?"SYNTHETIC DEMONSTRATION":"USER-ASSERTED MANUAL LINES",
    "Specimen: "+parsed.specimenId+" · Plant: "+parsed.plantId,
    "Observer code: "+parsed.annotatorCode,
    "Marked nodes: "+graph.nodes.length+" · links: "+graph.edges.length,
    "Original image SHA-256 (unverified here): "+parsed.imageSHA256
  ].join("\n"));
  drawGraph();
}
$("transportFile").addEventListener("change",async event=>{
  const file=event.target.files?.[0];
  if(!file)return;
  try{
    if(file.size>1024*1024)throw new RangeError("Reference JSON exceeds 1 MB");
    loadReference(JSON.parse(await file.text()));
  }catch(error){
    info("sourceInfo","Import rejected: "+error.message+
      "\nAny previously loaded source is unchanged.");
  }
  event.target.value="";
});
$("transportTree").addEventListener("click",()=>loadReference(demoNetworkReferences()[0]));
$("transportLoop").addEventListener("click",()=>loadReference(demoNetworkReferences()[1]));
$("transportShape").addEventListener("change",drawGraph);
for(const id of ["transportSeeds","transportSeedBase","transportTicks",
  "transportArrivals","transportQueue","transportSpeed","transportPriority",
  "transportCost","transportAllocation","transportTraffic","transportHotspot",
  "transportFault","transportNode","transportStart","transportDuration"]){
  $(id).addEventListener("change",()=>{
    clearRun();refreshFaults();drawGraph();
  });
}
function readConfig(){
  const fail=$("transportFault").value;
  return {
    seeds:num("transportSeeds"),seedBase:num("transportSeedBase"),
    ticks:num("transportTicks"),arrivalsPerTick:num("transportArrivals"),
    queueLimit:num("transportQueue"),pixelsPerTick:num("transportSpeed"),
    highPriorityPercent:num("transportPriority"),wireBudget:num("transportCost"),
    allocationPolicy:$("transportAllocation").value,
    trafficShape:$("transportTraffic").value,
    hotspotNode:num("transportHotspot"),
    failure:fail==="none"?{kind:"none"}:{
      kind:"node",index:num("transportNode"),
      start:num("transportStart"),duration:num("transportDuration")
    }
  };
}
$("transportRun").addEventListener("click",()=>{
  try{
    if(!source)throw new RangeError("Load a source graph first");
    const done=runTransportBenchmark(topologies,readConfig());
    results={...done,source:{
      origin:source.origin,plantId:source.plantId,specimenId:source.specimenId,
      maskedObserver:source.annotatorCode,imageSHA256:source.imageSHA256
    }};
    info("transportCount",done.runCount);
    info("transportSamples",done.experiment.seeds);
    info("runInfo",[
      "SIMULATION COMPLETE · "+done.runCount+" controlled model runs",
      "Common MAXIMUM wire-cost proxy: "+done.experiment.wireBudget,
      "Shared traffic fingerprints per seed:",
      ...done.trafficFingerprints.map(x=>"  "+x.seed+": "+x.fingerprint),
      "This is simulated digital traffic, not botanical or physical telemetry."
    ].join("\n"));
    $("transportRows").replaceChildren();
    for(const row of done.summaries){
      const tr=document.createElement("tr");
      const fields=[row.topology,row.mode,row.allocation.weightedCost.toFixed(1),
        row.allocation.installedSlots,pct(row.delivery?.mean??null),
        pct(row.highDelivery?.mean??null),pct(row.standardDelivery?.mean??null),
        dec(row.overallLatency?.mean??null)];
      for(const field of fields){
        const td=document.createElement("td");td.textContent=String(field);
        tr.append(td);
      }
      const td=document.createElement("td"),btn=document.createElement("button");
      btn.type="button";btn.textContent="Inspect";
      btn.addEventListener("click",()=>{
        const index=results.runs.findIndex(x=>
          x.topology===row.topology&&x.mode===row.mode);
        $("transportSelectRun").value=String(index);
        inspectRun(index);
      });
      td.append(btn);tr.append(td);
      $("transportRows").append(tr);
    }
    const choose=$("transportSelectRun");choose.replaceChildren();
    done.runs.forEach((run,i)=>{
      const opt=document.createElement("option");
      opt.value=String(i);opt.textContent=run.seed+" · "+run.topology+" / "+run.mode;
      choose.append(opt);
    });
    choose.disabled=false;$("transportExport").disabled=false;
    choose.value="0";inspectRun(0);
    info("matrixInfo",[
      "Equal COST CEILING, not equal hardware spend.",
      "All capacities are integers. Cost slack can remain on short/long edge layouts.",
      "High priority is strict scheduling, not a fairness guarantee.",
      "Across-seed averages are descriptive, not uncertainty bounds for real networks."
    ].join("\n"));
  }catch(error){
    clearRun();info("runInfo","Simulation rejected: "+error.message);
  }
});
$("transportSelectRun").addEventListener("change",()=>
  inspectRun(Number($("transportSelectRun").value)));
function inspectRun(index){
  if(!results||!results.runs[index])return;
  const row=results.runs[index],m=row.metrics;
  info("transportDetail",[
    "Seed "+row.seed+" · "+row.topology+" · "+row.mode,
    "Offered "+m.generated+" / delivered "+m.delivered+
      " / dropped "+m.dropped+" / unfinished "+m.unfinished,
    "Delivery "+pct(m.deliveredFraction)+" · loss "+pct(m.droppedFraction),
    "High priority: "+m.priority.high.delivered+"/"+m.priority.high.generated+
      " delivered · mean delay "+dec(m.priority.high.mean),
    "Standard: "+m.priority.standard.delivered+"/"+m.priority.standard.generated+
      " delivered · mean delay "+dec(m.priority.standard.mean),
    "Delivered-only mean delay "+dec(m.meanDeliveredLatencyTicks)+
      " ticks (p95 "+(m.p95DeliveredLatencyTicks??"n/a")+")",
    "In-flight pending at end "+m.inFlightPendingAtEnd,
    "Queue peak "+m.peakNodeQueue+" · transmissions "+m.transmissions,
    "Node-drop "+m.dropReasons.nodeFailed+
      " · failed-target "+m.dropReasons.targetFailed+
      " · inflight-node-failure "+m.dropReasons.inflightNodeFailed,
    "No-route "+m.dropReasons.noRoute+
      " · queue-overflow "+m.dropReasons.queueOverflow+
      " · TTL "+m.dropReasons.ttl,
    "Packet accounting: "+(m.conservationChecked?"PASS":"FAIL")
  ].join("\n"));
  paintChart(row.timeline);
}
function paintChart(trace){
  const canvas=$("transportChart"),ctx=canvas.getContext("2d");
  const w=canvas.width,h=canvas.height;
  ctx.fillStyle="#071e12";ctx.fillRect(0,0,w,h);
  ctx.strokeStyle="#375c48";ctx.lineWidth=1;
  for(let i=0;i<=4;i++){
    const y=9+(h-20)*i/4;
    ctx.beginPath();ctx.moveTo(25,y);ctx.lineTo(w-8,y);ctx.stroke();
  }
  if(!trace?.length){
    ctx.fillStyle="#d6ebd9";ctx.font="13px sans-serif";
    ctx.fillText("No simulation timeline yet.",30,92);return;
  }
  const max=Math.max(1,...trace.map(x=>
    Math.max(x.delivered,x.dropped,x.pending,x.inFlight)));
  for(const [key,color] of [["delivered","#96e7b6"],["dropped","#f2ab84"],
    ["pending","#afd9ef"],["inFlight","#ccabf5"]]){
    ctx.beginPath();ctx.lineWidth=2;ctx.strokeStyle=color;
    trace.forEach((point,i)=>{
      const x=25+i*(w-38)/Math.max(1,trace.length-1),
        y=9+(h-20)*(1-point[key]/max);
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    });
    ctx.stroke();
  }
}
$("transportExport").addEventListener("click",()=>{
  if(!results)return;
  const blob=new Blob([JSON.stringify(results,null,2)+"\n"],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="leaflab-transport-v11-"+results.source.specimenId+".json";
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
});
refreshFaults();paintChart(null);drawGraph();
