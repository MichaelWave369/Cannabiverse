import {parseVeinReference} from "./vein-benchmark.mjs";
import {graphFromReference,demoNetworkReferences,simulationTopologies} from "./network-atlas.mjs";
import {comparePacketStrategies,normalizePacketScenario} from "./packet-simulator.mjs";

const $=id=>document.getElementById(id),NS="http://www.w3.org/2000/svg";
let reference=null,graph=null,topologies=[],report=null,selectedRun=0;
const msg=(id,text)=>{$(id).textContent=String(text);};
const choices=["annotated-network","euclidean-minimum-spanning-tree","best-centered-euclidean-star"];
const fmt=n=>n===null?"n/a":Number(n).toFixed(2);
function resetReport(){
  report=null;$("simExport").disabled=true;
  $("simSelectRun").disabled=true;$("simSelectRun").replaceChildren();
  $("simRows").replaceChildren();
  for(const id of ["simComparisons","simTraffic","simFingerprint","simFailureLabel"])
    msg(id,"–");
  msg("simDetail","No run selected.");
  msg("scenarioStatus","Scenario edited. Run comparison to compute new results.");
  drawTimeline(null);
}
function selectedShape(){
  return topologies.find(t=>t.name===$("simViewTopology").value)||topologies[0];
}
function drawGraph(){
  const svg=$("simGraph");svg.replaceChildren();
  const selected=selectedShape();
  if(!selected){
    svg.setAttribute("viewBox","0 0 100 100");
    msg("simNodes","–");msg("simLinks","–");
    return;
  }
  const nodes=selected.graph.nodes,edges=selected.graph.edges;
  const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y);
  const minX=Math.min(...xs)-9,minY=Math.min(...ys)-9,
    spanX=Math.max(24,Math.max(...xs)-Math.min(...xs)+18),
    spanY=Math.max(24,Math.max(...ys)-Math.min(...ys)+18);
  svg.setAttribute("viewBox",minX+" "+minY+" "+spanX+" "+spanY);
  const failedMode=$("simFailure").value;
  const failedIndex=Number($("simFailureIndex").value);
  const linkFault=failedMode==="link"&&selected.name===$("simTopology").value;
  const nodeFault=failedMode==="node";
  for(let i=0;i<edges.length;i++){
    const e=edges[i],a=nodes[e.a],b=nodes[e.b];
    const highlight=linkFault&&i===failedIndex||
      nodeFault&&(e.a===failedIndex||e.b===failedIndex);
    const line=document.createElementNS(NS,"line");
    for(const [k,v] of Object.entries({
      x1:a.x,y1:a.y,x2:b.x,y2:b.y,
      stroke:highlight?"#f18f87":"#8ddcb1",
      "stroke-width":highlight?3.5:1.7,"stroke-linecap":"round",
      opacity:highlight?.7:1
    }))line.setAttribute(k,String(v));
    svg.append(line);
  }
  for(const p of nodes){
    const affected=nodeFault&&p.id===failedIndex;
    const dot=document.createElementNS(NS,"circle");
    for(const [k,v] of Object.entries({cx:p.x,cy:p.y,r:2.1,
      fill:affected?"#ec7e81":"#f6ecb9",stroke:"#17412a","stroke-width":.5}))
      dot.setAttribute(k,String(v));
    svg.append(dot);
  }
  msg("simNodes",nodes.length);msg("simLinks",edges.length);
  msg("graphHint",selected.name+" · "+edges.length+" abstract bidirectional links. "+
    (selected.name!=="annotated-network"?
      "Some straight-line edges may not be biologically possible.":
      "Only manually marked connections are used."));
}
function refreshFailureIndex(){
  const sel=$("simFailureIndex"),kind=$("simFailure").value;
  const topo=topologies.find(t=>t.name===$("simTopology").value)||topologies[0];
  const count=topo?(kind==="link"?topo.graph.edges.length:topo.graph.nodes.length):0;
  const old=Number(sel.value)||0;
  sel.replaceChildren();
  if(kind==="none"){
    const o=document.createElement("option");o.value="0";o.textContent="Not applicable";sel.append(o);
    sel.disabled=true;
  }else{
    sel.disabled=false;
    for(let i=0;i<count;i++){
      const o=document.createElement("option");o.value=String(i);
      o.textContent=(kind==="node"?"Node ":"Link ")+i;
      sel.append(o);
    }
    sel.value=String(Math.min(old,Math.max(0,count-1)));
  }
  $("simTopology").disabled=kind!=="link";
  $("simStart").disabled=kind==="none";
  $("simDuration").disabled=kind==="none";
  drawGraph();
}
function loadReference(raw){
  const clean=parseVeinReference(raw),g=graphFromReference(clean);
  if(g.nodes.length>80)throw new RangeError(
    "Simulation needs ≤80 marked graph nodes. Simplify reference paths in v0.7.");
  if(!g.edges.length)throw new RangeError("Need at least one drawn graph link");
  const shapes=simulationTopologies(g);
  graph=g;topologies=shapes;reference=clean;
  $("simRun").disabled=false;
  msg("sourceStatus",[
    (clean.origin==="synthetic-demo"?"SYNTHETIC DEMONSTRATION":"UNVERIFIED HUMAN ANNOTATION"),
    "Plant: "+clean.plantId+" · Specimen: "+clean.specimenId,
    "Observer: "+clean.annotatorCode,
    "Marked vertices: "+g.nodes.length+" · links: "+g.edges.length,
    "Image SHA-256 (not independently checked here): "+clean.imageSHA256
  ].join("\n"));
  resetReport();refreshFailureIndex();drawGraph();
}
$("simImport").addEventListener("change",async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
    if(file.size>1024*1024)throw new RangeError("Reference JSON exceeds 1 MB");
    const raw=JSON.parse(await file.text());
    loadReference(raw);
  }catch(error){msg("sourceStatus","Import rejected: "+error.message+
    "\nPreviously loaded topology remains available.");}
  event.target.value="";
});
$("simTree").addEventListener("click",()=>loadReference(demoNetworkReferences()[0]));
$("simLoop").addEventListener("click",()=>loadReference(demoNetworkReferences()[1]));
$("simViewTopology").addEventListener("change",drawGraph);
for(const id of ["simFailure","simTopology"]){
  $(id).addEventListener("change",()=>{resetReport();refreshFailureIndex();});
}
$("simFailureIndex").addEventListener("change",()=>{resetReport();drawGraph();});
for(const id of ["simTicks","simArrival","simCapacity","simQueue","simSeed","simStart","simDuration"]){
  $(id).addEventListener("change",resetReport);
}
function scenarioInput(){
  const kind=$("simFailure").value;
  return {
    ticks:Number($("simTicks").value),
    arrivalsPerTick:Number($("simArrival").value),
    edgeCapacity:Number($("simCapacity").value),
    queueLimit:Number($("simQueue").value),
    seed:Number($("simSeed").value),
    failure:kind==="none"?{kind:"none"}:{
      kind,index:Number($("simFailureIndex").value),
      start:Number($("simStart").value),duration:Number($("simDuration").value)
    }
  };
}
$("simRun").addEventListener("click",()=>{
  try{
    if(!graph)throw new RangeError("Load a source network first");
    const input=scenarioInput();
    const available=input.failure.kind==="link"?
      [topologies.find(t=>t.name===$("simTopology").value)]:
      topologies;
    const selected=available.filter(Boolean);
    if(!selected.length)throw new RangeError("No topology selected");
    const scenario=normalizePacketScenario(input,
      graph.nodes.length,selected[0].graph.edges.length);
    const finished=comparePacketStrategies(selected,scenario);
    report={
      ...finished,
      evidenceLevel:reference.origin==="synthetic-demo"?
        "SYNTHETIC_DEMONSTRATION":"USER_ASSERTED_IMAGE_GRAPH_NOT_BIOLOGICAL_VALIDATION",
      source:{specimenId:reference.specimenId,plantId:reference.plantId,
        maskedObserverCode:reference.annotatorCode,
        imageSHA256:reference.imageSHA256,origin:reference.origin},
      warnings:[...finished.limitations,
        "Human image topology and biological function were never independently verified",
        "Shared-node outage is topology-comparable; edge outages are same-topology only"]
    };
    msg("simComparisons",report.runCount);
    msg("simTraffic",scenario.ticks*scenario.arrivalsPerTick);
    msg("simFingerprint",report.trafficFingerprint);
    msg("simFailureLabel",scenario.failure.kind==="link"?"Single topology":
      scenario.failure.kind==="node"?"Same node":"No outage");
    const runs=$("simSelectRun");runs.replaceChildren();
    $("simRows").replaceChildren();
    report.runs.forEach((r,i)=>{
      const opt=document.createElement("option");
      opt.value=String(i);opt.textContent=r.topology+" / "+r.mode;runs.append(opt);
      const tr=document.createElement("tr"),m=r.metrics;
      const values=[r.topology,r.mode,m.delivered+"/"+m.generated,
        m.dropped,m.unfinished,fmt(m.meanDeliveredLatencyTicks),
        m.p95DeliveredLatencyTicks??"n/a",m.peakNodeQueue];
      for(const value of values){
        const td=document.createElement("td");td.textContent=String(value);tr.append(td);
      }
      const cell=document.createElement("td"),btn=document.createElement("button");
      btn.type="button";btn.textContent="Inspect";
      btn.addEventListener("click",()=>{runs.value=String(i);selectRun(i);});
      cell.append(btn);tr.append(cell);$("simRows").append(tr);
    });
    $("simExport").disabled=false;runs.disabled=false;
    selectedRun=0;runs.value="0";selectRun(0);
    msg("scenarioStatus",[
      "BENCHMARK COMPLETE · "+report.runCount+" simulations",
      "All runs received the SAME "+report.trafficFingerprint+" offered-traffic fingerprint.",
      "Fault: "+JSON.stringify(scenario.failure),
      "Delivery and latency must be interpreted with drops and unfinished packets.",
      "No observed vascular or real-world infrastructure performance is claimed."
    ].join("\n"));
  }catch(error){resetReport();msg("scenarioStatus","Cannot simulate: "+error.message);}
});
$("simSelectRun").addEventListener("change",()=>selectRun(Number($("simSelectRun").value)));
function selectRun(index){
  if(!report||!report.runs[index])return;
  selectedRun=index;
  const r=report.runs[index],m=r.metrics;
  const rows=[
    r.topology+" / "+r.mode,
    "Generated: "+m.generated+" · Delivered: "+m.delivered+" ("+(100*m.deliveryRatio).toFixed(1)+"%)",
    "Dropped: "+m.dropped+" ("+(100*m.dropRatio).toFixed(1)+"%) · unfinished: "+m.unfinished,
    "Queue overflow: "+m.dropReasons.queueOverflow+" · unreachable: "+m.dropReasons.unreachable,
    "Failed nodes: "+m.dropReasons.nodeFailed+" · target down: "+m.dropReasons.targetFailed,
    "TTL expiration: "+m.dropReasons.ttl,
    "Delivered-only mean delay: "+fmt(m.meanDeliveredLatencyTicks)+" ticks",
    "95th percentile delivered delay: "+(m.p95DeliveredLatencyTicks??"n/a")+" ticks",
    "Peak per-node queue: "+m.peakNodeQueue,
    "Mean delivered hops: "+fmt(m.meanDeliveredHops),
    "Link-slot utilization: "+(m.linkSlotUtilization===null?"n/a":(100*m.linkSlotUtilization).toFixed(1)+"%"),
    "Conservation: "+(m.conservationChecked?"PASS":"FAILED"),
    "NO claim of real botanical or TCP/IP transport."
  ];
  msg("simDetail",rows.join("\n"));
  drawTimeline(r.timeline);
}
function drawTimeline(trace){
  const canvas=$("timeline"),ctx=canvas.getContext("2d");
  const w=canvas.width,h=canvas.height;
  ctx.fillStyle="#071b0e";ctx.fillRect(0,0,w,h);
  ctx.strokeStyle="#33543c";ctx.lineWidth=1;
  for(let k=0;k<=4;k++){
    const y=10+k*(h-24)/4;
    ctx.beginPath();ctx.moveTo(24,y);ctx.lineTo(w-8,y);ctx.stroke();
  }
  if(!trace||!trace.length){
    ctx.fillStyle="#c5dbc9";ctx.font="13px sans-serif";
    ctx.fillText("Run a packet scenario to see a per-tick timeline.",35,90);
    return;
  }
  const bound=Math.max(1,...trace.map(x=>Math.max(x.delivered,x.dropped,x.pending)));
  const width=w-38,height=h-28;
  for(const [key,color] of [["delivered","#9ae7b1"],["dropped","#f0b884"],["pending","#b5d8ec"]]){
    ctx.strokeStyle=color;ctx.lineWidth=2;
    ctx.beginPath();
    trace.forEach((v,i)=>{
      const x=26+i*width/Math.max(1,trace.length-1);
      const y=8+height*(1-v[key]/bound);
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    });
    ctx.stroke();
  }
}
$("simExport").addEventListener("click",()=>{
  if(!report)return;
  const url=URL.createObjectURL(new Blob(
    [JSON.stringify(report,null,2)+"\n"],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;
  a.download="leaflab-packet-benchmark-"+report.source.specimenId+".json";
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
});
refreshFailureIndex();drawTimeline(null);drawGraph();
