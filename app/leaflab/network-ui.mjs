import {parseVeinReference} from "./vein-benchmark.mjs";
import {graphFromReference,networkAtlasReport,failOneLink,
  demoNetworkReferences} from "./network-atlas.mjs";

const $=id=>document.getElementById(id);
const SVG_NS="http://www.w3.org/2000/svg";
let annotation=null,report=null,graph=null,activeFailure=null;
const text=(id,value)=>{$(id).textContent=String(value);};
function loadReference(raw){
  const clean=parseVeinReference(raw);
  const prepared=networkAtlasReport(clean); // calculate before changing visible state
  const nextGraph=graphFromReference(clean);
  annotation=clean;graph=nextGraph;report=prepared;activeFailure=null;
  $("exportNetworkReport").disabled=false;$("resetFailure").disabled=true;
  const s=report.metrics,r=report.singleLinkFailure;
  text("graphStatus",[
    "SOURCE: "+(report.evidenceLevel==="SYNTHETIC_DEMONSTRATION"?"SYNTHETIC DEMONSTRATION":"USER-ASSERTED MANUAL ANNOTATION"),
    "Specimen: "+report.source.specimenId+" · Plant: "+report.source.plantId,
    "Masked observer: "+report.source.annotatorCode,
    "Image bytes SHA-256 (unverified here): "+report.source.imageSHA256,
    "Unique graph vertices: "+s.nodeCount+" · marked paths: "+annotation.paths.length,
    "Crossings without explicit shared vertices are NOT junctions."
  ].join("\n"));
  text("nodeMetric",s.nodeCount);text("edgeMetric",s.edgeCount);
  text("cycleMetric",s.cycleRank);text("bridgeMetric",r.bridges);
  text("robustnessSummary",[
    "Initial reachable pairs: "+pct(r.initialConnectedPairFraction),
    "After one link fails (mean): "+pct(r.averageAfterOneLinkRemoval),
    "After one link fails (worst): "+pct(r.worstAfterOneLinkRemoval),
    "Bridges: "+r.bridges+" / "+s.edgeCount,
    "2D total link length: "+s.totalImagePixelLinkLength.toFixed(2)+" px",
    "Geometric global efficiency: "+s.geometricalGlobalEfficiency.toFixed(4),
    "Connected components: "+s.componentCount,
    "No physical capacity, resistance, or leak-rate model."
  ].join("\n"));
  $("comparisonRows").replaceChildren();
  for(const model of report.baselines){
    const tr=document.createElement("tr");
    const m=model.metrics,r=model.robustness;
    const vals=[model.name,m.totalImagePixelLinkLength.toFixed(2),
      m.lengthOverMST===null?"n/a":m.lengthOverMST.toFixed(3),
      m.cycleRank,m.geometricalGlobalEfficiency.toFixed(4),
      pct(r.averageAfterOneLinkRemoval),pct(r.worstAfterOneLinkRemoval)];
    for(const value of vals){
      const td=document.createElement("td");td.textContent=String(value);tr.append(td);
    }
    $("comparisonRows").append(tr);
  }
  text("selectedFailure","Click a link in the graph to simulate its removal. Amber links split an existing component.");
  renderGraph();
}
const pct=x=>(100*x).toFixed(1)+"%";
function addSVG(name,attributes,parent){
  const e=document.createElementNS(SVG_NS,name);
  for(const [key,value] of Object.entries(attributes))e.setAttribute(key,String(value));
  parent.append(e);return e;
}
function renderGraph(){
  const svg=$("networkFigure");svg.replaceChildren();
  if(!graph){svg.setAttribute("viewBox","0 0 100 100");return;}
  const nodes=graph.nodes;
  const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y);
  const minX=Math.min(...xs)-9,minY=Math.min(...ys)-9;
  const spanX=Math.max(...xs)-Math.min(...xs)+18;
  const spanY=Math.max(...ys)-Math.min(...ys)+18;
  svg.setAttribute("viewBox",minX+" "+minY+" "+Math.max(spanX,26)+" "+Math.max(spanY,26));
  const failed=report.singleLinkFailure.outcomes;
  const initialComponents=report.metrics.componentCount;
  for(let i=0;i<graph.edges.length;i++){
    const e=graph.edges[i],a=nodes[e.a],b=nodes[e.b];
    const bridge=failed[i].componentCount>initialComponents;
    const selected=activeFailure===i;
    const el=addSVG("line",{x1:a.x,y1:a.y,x2:b.x,y2:b.y,
      stroke:selected?"#f27c80":bridge?"#efbe72":"#83e4b1",
      "stroke-width":selected?3.2:2,"stroke-linecap":"round",
      opacity:selected?.6:1,"tabindex":"0",
      "aria-label":"Link "+(i+1)+", "+(bridge?"bridge":"alternate path")},svg);
    const title=document.createElementNS(SVG_NS,"title");
    title.textContent="Link "+(i+1)+": click to remove temporarily";
    el.append(title);
    el.addEventListener("click",()=>selectFailure(i));
    el.addEventListener("keydown",event=>{
      if(event.key==="Enter"||event.key===" "){event.preventDefault();selectFailure(i);}
    });
  }
  for(const n of nodes){
    addSVG("circle",{cx:n.x,cy:n.y,r:Math.max(1.4,Math.min(2.8,spanX/120)),
      fill:"#f6f0c4",stroke:"#153f2a","stroke-width":.5,"pointer-events":"none"},svg);
  }
}
function selectFailure(index){
  if(!report||!graph)return;
  activeFailure=index;
  const f=failOneLink(graph,index);
  const before=report.singleLinkFailure.initialConnectedPairFraction;
  const change=before-f.connectedPairFraction;
  text("selectedFailure",[
    "LINK "+(index+1)+": removed "+f.removedEdge.a+" ↔ "+f.removedEdge.b,
    "Link length: "+f.removedEdge.length.toFixed(3)+" image pixels",
    "Reachable node pairs: "+pct(before)+" → "+pct(f.connectedPairFraction),
    "Decrease: "+pct(change),
    "Components after failure: "+f.componentCount,
    "Largest remaining component: "+f.largestComponentNodes+" vertices",
    "This is graph reachability, NOT leaf hydraulic resilience."
  ].join("\n"));
  $("resetFailure").disabled=false;
  renderGraph();
}
$("resetFailure").addEventListener("click",()=>{
  activeFailure=null;$("resetFailure").disabled=true;
  text("selectedFailure","All links restored. Click an edge to inspect a failure.");
  renderGraph();
});
$("graphImport").addEventListener("change",async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
    if(file.size>1024*1024)throw new RangeError("JSON reference exceeds 1 MB");
    const raw=JSON.parse(await file.text());
    loadReference(raw);
  }catch(error){text("graphStatus","Import rejected: "+error.message+
    "\nPreviously loaded graph, if any, is unchanged.");}
  event.target.value="";
});
$("demoTree").addEventListener("click",()=>loadReference(demoNetworkReferences()[0]));
$("demoLoop").addEventListener("click",()=>loadReference(demoNetworkReferences()[1]));
$("exportNetworkReport").addEventListener("click",()=>{
  if(!report)return;
  const url=URL.createObjectURL(new Blob(
    [JSON.stringify(report,null,2)+"\n"],{type:"application/json"}));
  const a=document.createElement("a");
  a.href=url;a.download="leaflab-network-atlas-"+report.source.specimenId+".json";
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
});
renderGraph();
