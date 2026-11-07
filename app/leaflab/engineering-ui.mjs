import {parseVeinReference} from "./vein-benchmark.mjs";
import {graphFromReference,demoNetworkReferences,simulationTopologies} from "./network-atlas.mjs";
import {feasibleSlotBudget,allocateSlotBudget,runEngineeringExperiment}
  from "./network-engineering.mjs";

const $=id=>document.getElementById(id),NS="http://www.w3.org/2000/svg";
let source=null,topologies=[],report=null;
const info=(id,text)=>{$(id).textContent=String(text);};
const number=id=>Number($(id).value);
const fmt=x=>x===null?"n/a":Number(x).toFixed(3);
const percent=x=>x===null?"n/a":(100*x).toFixed(1)+"%";
function save(filename,data){
  const url=URL.createObjectURL(new Blob(
    [JSON.stringify(data,null,2)+"\n"],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download=filename;
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function shape(){
  return topologies.find(t=>t.name===$("engViewTopology").value)||topologies[0];
}
function invalidated(){
  report=null;$("engExport").disabled=true;
  $("engSelectRun").disabled=true;$("engSelectRun").replaceChildren();
  $("engRows").replaceChildren();
  info("engRunCount","–");info("engSeedsUsed","–");
  info("engRunDetail","No selected run.");
  info("engMatrixStatus","Settings modified. Run again to compare all seeds.");
  info("engStatus","No current benchmark.");
  drawChart(null);
}
function nodeOptions(){
  const nodes=topologies[0]?.graph.nodes.length||0;
  for(const id of ["engFailedNode","engHotspot"]){
    const select=$(id),previous=Number(select.value)||0;
    select.replaceChildren();
    for(let i=0;i<nodes;i++){
      const option=document.createElement("option");
      option.value=String(i);option.textContent="Node "+i;select.append(option);
    }
    if(nodes)select.value=String(Math.min(Math.max(0,previous),nodes-1));
  }
}
function refreshFaults(){
  const enabled=$("engFault").value==="node";
  for(const id of ["engFailedNode","engFaultStart","engFaultDuration"])
    $(id).disabled=!enabled;
  $("engHotspot").disabled=$("engTraffic").value!=="hub-hotspot";
}
function adjustBudget(){
  if(!topologies.length)return;
  const bounds=feasibleSlotBudget(topologies);
  const input=$("engSlots");
  input.min=String(bounds.minimum);input.max=String(bounds.maximum);
  if(!Number.isInteger(Number(input.value))||number("engSlots")<bounds.minimum||
      number("engSlots")>bounds.maximum){
    input.value=String(Math.min(bounds.maximum,bounds.minimum*2));
  }
  info("engBudgetRange",bounds.minimum+"–"+bounds.maximum+
    " shared slots are feasible across all three shapes. All links get at least 1 and at most 12 slots.");
}
function renderGraph(){
  const svg=$("engGraph");svg.replaceChildren();
  const selected=shape();
  if(!selected){
    info("engNodes","–");info("engLinks","–");
    info("engInstalled","–");info("engCost","–");
    return;
  }
  const g=selected.graph,nodes=g.nodes;
  const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y);
  const left=Math.min(...xs)-8,top=Math.min(...ys)-8;
  const width=Math.max(25,Math.max(...xs)-Math.min(...xs)+16);
  const height=Math.max(25,Math.max(...ys)-Math.min(...ys)+16);
  svg.setAttribute("viewBox",left+" "+top+" "+width+" "+height);
  let allocation=null;
  try{
    allocation=allocateSlotBudget(g,number("engSlots"),$("engAllocation").value);
  }catch(error){info("engStatus","Capacity preview cannot render: "+error.message);}
  for(let i=0;i<g.edges.length;i++){
    const e=g.edges[i],a=nodes[e.a],b=nodes[e.b];
    const el=document.createElementNS(NS,"line");
    for(const [name,value] of Object.entries({
      x1:a.x,x2:b.x,y1:a.y,y2:b.y,
      stroke:"#92dfb1","stroke-linecap":"round",
      "stroke-width":allocation?.edgeCapacities[i]?1+
        .38*allocation.edgeCapacities[i]:1.5
    }))el.setAttribute(name,String(value));
    svg.append(el);
  }
  for(const n of nodes){
    const affected=$("engFault").value==="node"&&
      n.id===number("engFailedNode");
    const dot=document.createElementNS(NS,"circle");
    for(const [key,value] of Object.entries({
      cx:n.x,cy:n.y,r:2.3,
      fill:affected?"#ec8580":"#f3e9b4",
      stroke:"#173a2b","stroke-width":.5
    }))dot.setAttribute(key,String(value));
    svg.append(dot);
  }
  info("engNodes",nodes.length);info("engLinks",g.edges.length);
  info("engInstalled",allocation?.installedSlots??"–");
  info("engCost",allocation?.capacityWeightedWireCost.toFixed(1)??"–");
}
function loadSource(raw){
  const reference=parseVeinReference(raw);
  const g=graphFromReference(reference);
  if(g.nodes.length>80)throw new RangeError("Simplify source to at most 80 vertices.");
  const shapes=simulationTopologies(g);
  feasibleSlotBudget(shapes);
  source=reference;topologies=shapes;
  nodeOptions();adjustBudget();refreshFaults();invalidated();
  $("engRun").disabled=false;
  info("engSource",[
    reference.origin==="synthetic-demo"?
      "SYNTHETIC DEMONSTRATION: no real specimen" :
      "USER-ASSERTED MANUAL REFERENCE: anatomy not verified",
    "Plant: "+reference.plantId+" · specimen: "+reference.specimenId,
    "Nodes: "+g.nodes.length+" · annotated links: "+g.edges.length,
    "Image SHA-256 (not verified without original image): "+reference.imageSHA256
  ].join("\n"));
  renderGraph();
}
$("engFile").addEventListener("change",async event=>{
  const file=event.target.files?.[0];
  if(!file)return;
  try{
    if(file.size>1024*1024)throw new RangeError("Reference JSON exceeds 1 MB.");
    loadSource(JSON.parse(await file.text()));
  }catch(error){info("engSource","Source rejected: "+error.message+
    "\nPreviously loaded graph remains available.");}
  event.target.value="";
});
$("engDemoTree").addEventListener("click",()=>loadSource(demoNetworkReferences()[0]));
$("engDemoLoop").addEventListener("click",()=>loadSource(demoNetworkReferences()[1]));
$("engViewTopology").addEventListener("change",renderGraph);
for(const id of ["engSeeds","engSeedBase","engTicks","engArrivals","engQueue",
  "engSlots","engAllocation","engTraffic","engHotspot","engFault","engFailedNode",
  "engFaultStart","engFaultDuration"]){
  $(id).addEventListener("change",()=>{
    invalidated();refreshFaults();renderGraph();
  });
}
function input(){
  const fault=$("engFault").value;
  const settings={
    seeds:number("engSeeds"),seedBase:number("engSeedBase"),
    ticks:number("engTicks"),arrivalsPerTick:number("engArrivals"),
    queueLimit:number("engQueue"),slotBudget:number("engSlots"),
    capacityPolicy:$("engAllocation").value,trafficShape:$("engTraffic").value,
    hotspotNode:number("engHotspot"),
    failure:fault==="none"?{kind:"none"}:{
      kind:"node",index:number("engFailedNode"),start:number("engFaultStart"),
      duration:number("engFaultDuration")
    }
  };
  return settings;
}
$("engRun").addEventListener("click",()=>{
  try{
    if(!source)throw new RangeError("Load topology source first");
    const completed=runEngineeringExperiment(topologies,input());
    report={
      ...completed,evidenceLevel:source.origin==="synthetic-demo"?
        "SYNTHETIC_DEMONSTRATION":"USER_ASSERTED_UNVERIFIED_IMAGE_GEOMETRY",
      reference:{plantId:source.plantId,specimenId:source.specimenId,
        maskedObserver:source.annotatorCode,imageSHA256:source.imageSHA256,
        origin:source.origin}
    };
    info("engRunCount",report.runCount);
    info("engSeedsUsed",report.experiment.seeds);
    info("engStatus","Multi-seed benchmark complete.\n"+
      report.runCount+" deterministic runs · "+report.experiment.seeds+
      " shared demand samples.\n"+
      report.trafficFingerprints.map(x=>x.seed+": "+x.fingerprint).join("\n")+
      "\nStandard deviations describe simulated seed variation only.");
    $("engRows").replaceChildren();
    for(const item of report.summaries){
      const tr=document.createElement("tr");
      const m=item.metrics,fields=[
        item.topology,item.mode,item.allocation.installedSlots,
        item.allocation.capacityWeightedWireCost.toFixed(1),
        percent(m.deliveryRatio.mean)+" ± "+percent(m.deliveryRatio.populationSD),
        percent(m.dropRatio.mean),
        m.meanDeliveredLatencyTicks===null?"n/a":fmt(m.meanDeliveredLatencyTicks.mean),
        item.deliveredPerTickPerCapacityWireCost.toFixed(6)
      ];
      for(const field of fields){
        const cell=document.createElement("td");cell.textContent=String(field);tr.append(cell);
      }
      const td=document.createElement("td"),button=document.createElement("button");
      button.textContent="Inspect";button.type="button";
      button.addEventListener("click",()=>{
        const index=report.runs.findIndex(run=>
          run.topology===item.topology&&run.mode===item.mode);
        $("engSelectRun").value=String(index);selectRun(index);
      });
      td.append(button);tr.append(td);
      $("engRows").append(tr);
    }
    const select=$("engSelectRun");select.replaceChildren();
    report.runs.forEach((run,i)=>{
      const option=document.createElement("option");
      option.value=String(i);option.textContent=run.seed+" · "+
        run.topology+" · "+run.mode;select.append(option);
    });
    select.disabled=false;$("engExport").disabled=false;
    select.value="0";selectRun(0);
    info("engMatrixStatus",[
      "EQUAL-SLOT ALLOCATIONS: "+report.experiment.slotBudget+" link slots per topology.",
      "Demand patterns shared per seed: "+report.experiment.trafficShape,
      "Wire costs differ across shapes despite equal slot totals.",
      "Comparisons are exploratory and should not be used as evidence of biological superiority."
    ].join("\n"));
    renderGraph();
  }catch(error){invalidated();info("engStatus","Cannot run: "+error.message);}
});
$("engSelectRun").addEventListener("change",()=>selectRun(Number($("engSelectRun").value)));
function selectRun(index){
  if(!report||!report.runs[index])return;
  const run=report.runs[index],m=run.metrics;
  info("engRunDetail",[
    "Seed "+run.seed+" · "+run.topology+" · "+run.mode,
    "Generated "+m.generated+" / delivered "+m.delivered+
      " / dropped "+m.dropped+" / unfinished "+m.unfinished,
    "Delivery "+percent(m.deliveryRatio)+" · drop "+percent(m.dropRatio),
    "Queue overflow "+m.dropReasons.queueOverflow+
      " · no route "+m.dropReasons.unreachable+
      " · node/target failures "+(m.dropReasons.nodeFailed+m.dropReasons.targetFailed),
    "Delivered-only latency "+fmt(m.meanDeliveredLatencyTicks)+
      " ticks (p95 "+(m.p95DeliveredLatencyTicks??"n/a")+")",
    "Mean delivered hops "+fmt(m.meanDeliveredHops)+
      " · peak node queue "+m.peakNodeQueue,
    "Installed capacity-weighted wire cost "+m.installedCapacityWireCost,
    "Packet conservation "+(m.conservationChecked?"PASS":"FAIL"),
    "Original image and biological flow never evaluated."
  ].join("\n"));
  drawChart(run.timeline);
}
function drawChart(timeline){
  const canvas=$("engChart"),ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height;
  ctx.fillStyle="#081e12";ctx.fillRect(0,0,w,h);
  ctx.strokeStyle="#315743";ctx.lineWidth=1;
  for(let i=0;i<=4;i++){
    const y=12+i*(h-28)/4;
    ctx.beginPath();ctx.moveTo(26,y);ctx.lineTo(w-12,y);ctx.stroke();
  }
  if(!timeline||!timeline.length){
    ctx.fillStyle="#c2d9c8";ctx.font="14px sans-serif";
    ctx.fillText("Run the experiment to inspect packet counts over time.",37,105);
    return;
  }
  const peak=Math.max(1,...timeline.map(x=>Math.max(x.delivered,x.dropped,x.pending)));
  for(const [key,color] of [["delivered","#93e6ae"],["dropped","#eda880"],
    ["pending","#b5d7ef"]]){
    ctx.strokeStyle=color;ctx.lineWidth=2;
    ctx.beginPath();
    timeline.forEach((point,i)=>{
      const x=26+i*(w-39)/Math.max(1,timeline.length-1);
      const y=12+(h-28)*(1-point[key]/peak);
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    });
    ctx.stroke();
  }
}
$("engExport").addEventListener("click",()=>{
  if(report)save("leaflab-network-engineering-v10-"+report.reference.specimenId+".json",report);
});
refreshFaults();drawChart(null);renderGraph();
