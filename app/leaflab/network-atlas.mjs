// Φ LeafLab v0.8: geometric graph audit from human-supplied vein-like
// polylines. Image paths are NOT verified plant vessels or physical links.
import {parseVeinReference} from "./vein-benchmark.mjs";

export const NETWORK_ATLAS_VERSION="0.8";
const MAX_NODES=140;
const EPS=1e-9;
const finite=n=>typeof n==="number"&&Number.isFinite(n);
const round=n=>Number(n.toFixed(6));
const label=n=>Number(n.toFixed(2)).toFixed(2);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const pairKey=(a,b)=>a<b?a+"|"+b:b+"|"+a;
function validateGraph(graph){
  if(!graph||!Array.isArray(graph.nodes)||!Array.isArray(graph.edges)||
    graph.nodes.length<2||graph.nodes.length>MAX_NODES||graph.edges.length>700)
    throw new TypeError("Network graph needs 2–140 nodes and up to 700 links");
  const nodes=graph.nodes;
  if(nodes.some((n,i)=>!n||n.id!==i||!finite(n.x)||!finite(n.y)||
      n.x<0||n.y<0||n.x>400||n.y>400))
    throw new TypeError("Invalid graph coordinates or node indexes");
  const seen=new Set();
  for(const e of graph.edges){
    if(!e||!Number.isInteger(e.a)||!Number.isInteger(e.b)||
       e.a<0||e.b<0||e.a>=nodes.length||e.b>=nodes.length||e.a===e.b||
       !finite(e.length)||e.length<=0)
      throw new TypeError("Invalid graph link");
    const k=pairKey(e.a,e.b);
    if(seen.has(k))throw new RangeError("Duplicate graph link");
    seen.add(k);
    if(Math.abs(e.length-distance(nodes[e.a],nodes[e.b]))>1e-5)
      throw new RangeError("Graph link must use its true geometric Euclidean length");
  }
  return graph;
}
function makeEdges(nodes,pairs){
  const map=new Map();
  for(const [a,b] of pairs){
    if(a===b)continue;
    const key=pairKey(a,b);
    if(!map.has(key))map.set(key,{a:Math.min(a,b),b:Math.max(a,b),
      length:distance(nodes[a],nodes[b])});
  }
  return [...map.values()].sort((x,y)=>x.a-y.a||x.b-y.b).map((e,i)=>({id:i,...e}));
}
export function graphFromReference(raw){
  const ref=parseVeinReference(raw),nodes=[],lookup=new Map(),pairs=[];
  function nodeIndex([x,y]){
    const k=label(x)+","+label(y);
    if(lookup.has(k))return lookup.get(k);
    if(nodes.length>=MAX_NODES)
      throw new RangeError("Maximum 140 unique marked network vertices. Reduce polyline control points before analyzing");
    const id=nodes.length;
    nodes.push({id,x:Number(label(x)),y:Number(label(y))});
    lookup.set(k,id);
    return id;
  }
  for(const path of ref.paths){
    for(let i=1;i<path.length;i++){
      const a=nodeIndex(path[i-1]),b=nodeIndex(path[i]);
      if(a===b)throw new RangeError("Reference paths collapsed to duplicate coordinates");
      pairs.push([a,b]);
    }
  }
  const graph={nodes,edges:makeEdges(nodes,pairs)};
  validateGraph(graph);
  return {kind:"leaflab-geometric-line-graph",version:NETWORK_ATLAS_VERSION,
    source:{kind:ref.kind,version:ref.version,specimenId:ref.specimenId,
      plantId:ref.plantId,annotatorCode:ref.annotatorCode,
      imageSHA256:ref.imageSHA256,width:ref.width,height:ref.height,
      origin:ref.origin},
    ...graph,
    construction:[
      "Polyline control points form vertices with coordinate quantization to 0.01 image pixels",
      "Repeated identical coordinates across paths form connected junctions",
      "Crossing lines do not connect unless the observer placed a shared explicit vertex",
      "Undirected links weighted only by 2D Euclidean image-pixel length",
      "Path topology is an observer-drawn graph, not verified vessel anatomy"
    ]};
}
function adjacency(graph,skipEdge=-1){
  const adj=graph.nodes.map(()=>[]);
  for(let i=0;i<graph.edges.length;i++){
    if(i===skipEdge)continue;
    const e=graph.edges[i];
    adj[e.a].push([e.b,e.length]);adj[e.b].push([e.a,e.length]);
  }
  return adj;
}
function dijkstra(adj,start){
  const n=adj.length,dist=new Float64Array(n).fill(Infinity),
    visited=new Uint8Array(n);
  dist[start]=0;
  for(let k=0;k<n;k++){
    let u=-1;
    for(let j=0;j<n;j++)if(!visited[j]&&(u<0||dist[j]<dist[u]))u=j;
    if(u<0||dist[u]===Infinity)break;
    visited[u]=1;
    for(const [v,w] of adj[u])if(dist[u]+w<dist[v])dist[v]=dist[u]+w;
  }
  return dist;
}
function components(adj){
  const seen=new Uint8Array(adj.length),counts=[];
  for(let i=0;i<adj.length;i++){
    if(seen[i])continue;
    let size=0;
    const stack=[i];seen[i]=1;
    while(stack.length){
      const u=stack.pop();size++;
      for(const [v] of adj[u])if(!seen[v]){seen[v]=1;stack.push(v);}
    }
    counts.push(size);
  }
  return counts.sort((a,b)=>b-a);
}
function reachablePairs(sizes){
  return sizes.reduce((s,n)=>s+n*(n-1)/2,0);
}
export function summarizeGraph(raw){
  const graph=validateGraph(raw),n=graph.nodes.length,m=graph.edges.length;
  const adj=adjacency(graph),sizes=components(adj),totalPairs=n*(n-1)/2;
  let efficiencySum=0,stretchSum=0,reachable=0,maxStretch=0;
  for(let i=0;i<n;i++){
    const d=dijkstra(adj,i);
    for(let j=i+1;j<n;j++){
      if(!Number.isFinite(d[j]))continue;
      const direct=distance(graph.nodes[i],graph.nodes[j]);
      if(direct<EPS)continue;
      const stretch=d[j]/direct;
      efficiencySum+=direct/d[j];stretchSum+=stretch;reachable++;
      maxStretch=Math.max(maxStretch,stretch);
    }
  }
  const totalLength=graph.edges.reduce((s,e)=>s+e.length,0);
  const degree=new Uint16Array(n);
  for(const e of graph.edges){degree[e.a]++;degree[e.b]++;}
  return {nodeCount:n,edgeCount:m,componentCount:sizes.length,
    largestComponentNodes:sizes[0],connectedPairFraction:round(reachablePairs(sizes)/totalPairs),
    cycleRank:m-n+sizes.length,
    totalImagePixelLinkLength:round(totalLength),
    meanDegree:round(degree.reduce((s,v)=>s+v,0)/n),
    maxDegree:Math.max(...degree),
    geometricalGlobalEfficiency:round(efficiencySum/totalPairs),
    meanStretchOnConnectedPairs:reachable?round(stretchSum/reachable):null,
    maximumStretchOnConnectedPairs:reachable?round(maxStretch):null,
    limitations:[
      "2D image length and geometric shortest paths are not pressure-flow or hydraulic efficiency",
      "Disconnected pairs contribute zero to global efficiency, unlike conditional stretch",
      "Crossing segments only connect at explicitly shared marked vertices",
      "Graph metrics depend strongly on how many control points were placed"
    ]};
}
export function failOneLink(raw,edgeIndex){
  const g=validateGraph(raw);
  if(!Number.isInteger(edgeIndex)||edgeIndex<0||edgeIndex>=g.edges.length)
    throw new RangeError("Edge index out of range");
  const adj=adjacency(g,edgeIndex),sizes=components(adj),
    n=g.nodes.length,total=n*(n-1)/2;
  return {edgeIndex,removedEdge:g.edges[edgeIndex],
    connectedPairFraction:round(reachablePairs(sizes)/total),
    componentCount:sizes.length,largestComponentNodes:sizes[0]};
}
export function singleLinkFailureAudit(raw){
  const g=validateGraph(raw),n=g.nodes.length,m=g.edges.length;
  const original=components(adjacency(g));
  const total=n*(n-1)/2;
  const starting=reachablePairs(original)/total;
  const outcomes=g.edges.map((e,index)=>failOneLink(g,index));
  const fractions=outcomes.map(o=>o.connectedPairFraction);
  const average=fractions.length?
    fractions.reduce((s,x)=>s+x,0)/fractions.length:starting;
  const worst=fractions.length?Math.min(...fractions):starting;
  const cutEdges=outcomes.filter(o=>o.componentCount>original.length).length;
  return {kind:"leaflab-single-link-failure",version:NETWORK_ATLAS_VERSION,
    initialConnectedPairFraction:round(starting),
    averageAfterOneLinkRemoval:round(average),
    worstAfterOneLinkRemoval:round(worst),
    bridges:cutEdges,bridgeFraction:m?round(cutEdges/m):null,
    outcomes,
    limitations:[
      "Deletes one annotated graph segment at a time, uniformly by edge",
      "Link segments, not entire vascular bundles or physical failure regions, are removed",
      "Short path segments create many more removal scenarios than long segments",
      "Existing disconnected components are not automatically repaired",
      "This is logical graph reachability, not real fluid-transport robustness"
    ]};
}
function mstPairs(nodes){
  const n=nodes.length,used=new Uint8Array(n),cost=new Float64Array(n).fill(Infinity),
    parent=new Int32Array(n).fill(-1),pairs=[];
  cost[0]=0;
  for(let k=0;k<n;k++){
    let best=-1;
    for(let i=0;i<n;i++)if(!used[i]&&(best<0||
        cost[i]<cost[best]||cost[i]===cost[best]&&i<best))best=i;
    used[best]=1;
    if(parent[best]>=0)pairs.push([parent[best],best]);
    for(let j=0;j<n;j++)if(!used[j]){
      const d=distance(nodes[best],nodes[j]);
      if(d<cost[j]-EPS||Math.abs(d-cost[j])<EPS&&
         (parent[j]===-1||best<parent[j])){cost[j]=d;parent[j]=best;}
    }
  }
  return pairs;
}
function starPairs(nodes){
  let center=0,best=Infinity;
  for(let i=0;i<nodes.length;i++){
    const length=nodes.reduce((s,n,j)=>s+(i===j?0:distance(nodes[i],n)),0);
    if(length<best){best=length;center=i;}
  }
  return nodes.map((_,i)=>[center,i]).filter(p=>p[0]!==p[1]);
}
export function compareGeometricBaselines(raw){
  const reference=validateGraph(raw),nodes=reference.nodes;
  // These two fully-connected comparison trees use the SAME marked coordinates.
  // They are deliberately not constrained to drawn/physically possible veins.
  const baselines=[
    {name:"annotated-network",graph:reference},
    {name:"euclidean-minimum-spanning-tree",
      graph:{nodes,edges:makeEdges(nodes,mstPairs(nodes))}},
    {name:"best-centered-euclidean-star",
      graph:{nodes,edges:makeEdges(nodes,starPairs(nodes))}}
  ];
  const evaluated=baselines.map(x=>({
    name:x.name,summary:summarizeGraph(x.graph),
    resilience:singleLinkFailureAudit(x.graph),
    graph:x.graph
  }));
  const mstLength=evaluated[1].summary.totalImagePixelLinkLength;
  return {kind:"leaflab-geometry-network-baselines",version:NETWORK_ATLAS_VERSION,
    models:evaluated.map(m=>({
      name:m.name,metrics:{...m.summary,
        lengthOverMST:mstLength>0?round(m.summary.totalImagePixelLinkLength/mstLength):null},
      robustness:{
        averageAfterOneLinkRemoval:m.resilience.averageAfterOneLinkRemoval,
        worstAfterOneLinkRemoval:m.resilience.worstAfterOneLinkRemoval,
        bridges:m.resilience.bridges
      }})),
    limitations:[
      "MST and centered star connect the same marked points by hypothetical straight links",
      "Some baseline links can leave the leaf silhouette and are not biologically feasible",
      "MST is shortest connected geometric tree, not an unconstrained best flow network",
      "Star center is an existing marked point minimizing total star-wire length",
      "Compare graph geometry only; neither model includes capacity, physics, energy or pressure"
    ]};
}
export function networkAtlasReport(raw){
  const graph=graphFromReference(raw);
  const baseline=compareGeometricBaselines(graph);
  const resilience=singleLinkFailureAudit(graph);
  return {kind:"leaflab-network-atlas-report",version:NETWORK_ATLAS_VERSION,
    evidenceLevel:graph.source.origin==="synthetic-demo"?"SYNTHETIC_DEMONSTRATION":
      "USER_ASSERTED_GEOMETRIC_ANNOTATION_NOT_BOTANICAL_TRUTH",
    source:graph.source,
    annotatedGeometry:{nodes:graph.nodes,edges:graph.edges},
    metrics:summarizeGraph(graph),
    singleLinkFailure:resilience,
    baselines:baseline.models,
    limitations:[
      "This graph is built from observer-chosen image lines, not independently verified plant vessels",
      "Exact shared vertices connect, while unmarked line crossings are NOT connected",
      "Unweighted logical link failure and 2D length cannot assess transport efficiency",
      "MST and star controls can use physically impossible off-leaf straight links",
      "No biological optimality, universal topology, or infrastructure benefit follows from this report"
    ]};
}
export function demoNetworkReferences(){
  const common={kind:"leaflab-vein-reference",version:"0.7",
    specimenId:"DEMO_GRAPH",plantId:"DEMO_PLANT",annotatorCode:"DEMO_OBSERVER",
    imageSHA256:"f".repeat(64),width:100,height:100,origin:"synthetic-demo"};
  const tree={...common,paths:[
    [[15,50],[35,50],[55,50],[75,50]],
    [[35,50],[35,30]],[[55,50],[55,70]]
  ]};
  const loop={...common,paths:[
    [[20,20],[70,20],[70,70],[20,70],[20,20]],
    [[20,20],[45,45]],[[45,45],[70,70]]
  ],specimenId:"DEMO_LOOP"};
  return [parseVeinReference(tree),parseVeinReference(loop)];
}
