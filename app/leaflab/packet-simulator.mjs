// Φ LeafLab v0.9 · bounded packet-routing experiment (synthetic digital packets).
// No claimed botanical transport, internet protocol fidelity, or real link capacity.
import {simulationTopologies} from "./network-atlas.mjs";

export const PACKET_SIM_VERSION="0.9";
export const ROUTING_MODES=["shortest-distance","queue-aware","bridge-avoiding"];
const MAX_NODES=80;
const finite=n=>typeof n==="number"&&Number.isFinite(n);
const number=(n,min,max,label)=>{
  if(!finite(n)||n<min||n>max)throw new RangeError(label+" must be "+min+".."+max);
  return n;
};
const integer=(n,min,max,label)=>{
  if(!Number.isInteger(n))throw new TypeError(label+" must be an integer");
  return number(n,min,max,label);
};
const round=n=>Number(n.toFixed(6));
function checkGraph(g){
  if(!g||!Array.isArray(g.nodes)||!Array.isArray(g.edges)||g.nodes.length<2||
      g.nodes.length>MAX_NODES||g.edges.length>300)
    throw new RangeError("Packet test accepts 2–80 nodes and up to 300 links");
  for(let i=0;i<g.nodes.length;i++){
    const n=g.nodes[i];
    if(!n||n.id!==i||!finite(n.x)||!finite(n.y)||n.x<0||n.y<0||
       n.x>400||n.y>400)throw new TypeError("Invalid graph nodes");
  }
  const pairs=new Set();
  for(let i=0;i<g.edges.length;i++){
    const e=g.edges[i];
    if(!e||e.id!==i||!Number.isInteger(e.a)||!Number.isInteger(e.b)||
       e.a===e.b||e.a<0||e.b<0||e.a>=g.nodes.length||e.b>=g.nodes.length||
       !finite(e.length)||e.length<=0)throw new TypeError("Invalid graph links");
    const actual=Math.hypot(g.nodes[e.a].x-g.nodes[e.b].x,
       g.nodes[e.a].y-g.nodes[e.b].y);
    if(Math.abs(actual-e.length)>1e-5)throw new TypeError("Link length must match geometry");
    const k=Math.min(e.a,e.b)+"|"+Math.max(e.a,e.b);
    if(pairs.has(k))throw new RangeError("Duplicate graph link");pairs.add(k);
  }
  return g;
}
export function normalizePacketScenario(raw={},nodeCount=0,edgeCount=0){
  integer(nodeCount,2,MAX_NODES,"Graph size");
  integer(edgeCount,0,300,"Graph edge count");
  const ticks=integer(raw.ticks??75,10,150,"Traffic ticks");
  const arrivalsPerTick=integer(raw.arrivalsPerTick??5,1,12,"Packets per tick");
  const edgeCapacity=integer(raw.edgeCapacity??2,1,12,"Packets per link per tick");
  const queueLimit=integer(raw.queueLimit??24,4,100,"Node queue size");
  const seed=integer(raw.seed??369,1,2147483647,"Traffic seed");
  const failure=raw.failure||{kind:"none"};
  if(!["none","node","link"].includes(failure.kind))
    throw new TypeError("Failure kind must be none, node or link");
  let normalizedFailure={kind:"none"};
  if(failure.kind!=="none"){
    const index=integer(failure.index,0,
      failure.kind==="node"?nodeCount-1:edgeCount-1,"Failure index");
    const start=integer(failure.start??20,0,ticks-1,"Failure start");
    const duration=integer(failure.duration??20,1,ticks-start,"Failure duration");
    normalizedFailure={kind:failure.kind,index,start,duration};
  }
  return {ticks,arrivalsPerTick,edgeCapacity,queueLimit,seed,
    failure:normalizedFailure,
    semantics:{
      traffic:"Identical seeded source/destination pairs offered at every tested topology",
      hops:"At most one link hop per packet per tick",
      capacity:"Shared bidirectional integer packet slots per undirected link per tick",
      buffering:"Fixed FIFO packet queues per node; ascending-node arbitration",
      failure:"Link or node disabled over an exact inclusive-start, exclusive-end tick interval",
      unavailable:"Packets at failed nodes or with unreachable destinations drop immediately",
      pending:"Unfinished packets after bounded drain are reported separately, not called delivered",
      latency:"Delivered packets only, measured as discrete ticks since source offer"
    }};
}
function xorshift32(initial){
  let x=initial>>>0;
  return ()=>{
    x^=x<<13;x^=x>>>17;x^=x<<5;
    return x>>>0;
  };
}
export function createPacketTraffic({nodes,ticks,arrivalsPerTick,seed}){
  integer(nodes,2,MAX_NODES,"Traffic graph nodes");
  integer(ticks,10,150,"Traffic ticks");
  integer(arrivalsPerTick,1,12,"Packets per tick");
  integer(seed,1,2147483647,"Traffic seed");
  const rand=xorshift32(seed),schedule=[];
  let hash=2166136261;
  for(let tick=0;tick<ticks;tick++){
    const step=[];
    for(let i=0;i<arrivalsPerTick;i++){
      const from=rand()%nodes;
      let to=rand()%(nodes-1);
      if(to>=from)to++;
      step.push({from,to});
      hash=Math.imul(hash^from,16777619)>>>0;
      hash=Math.imul(hash^to,16777619)>>>0;
    }
    schedule.push(step);
  }
  return {kind:"leaflab-deterministic-packet-demand",version:PACKET_SIM_VERSION,
    nodes,ticks,arrivalsPerTick,seed,trafficFingerprint:hash.toString(16).padStart(8,"0"),
    schedule};
}
function adjacency(g,failedNode,failedLink){
  const adj=g.nodes.map(()=>[]);
  for(let i=0;i<g.edges.length;i++){
    if(i===failedLink)continue;
    const e=g.edges[i];
    if(e.a===failedNode||e.b===failedNode)continue;
    adj[e.a].push({to:e.b,id:i,length:e.length});
    adj[e.b].push({to:e.a,id:i,length:e.length});
  }
  for(const row of adj)row.sort((a,b)=>a.to-b.to||a.id-b.id);
  return adj;
}
// Tarjan bridge detection on the currently available network, deterministic.
function bridges(adj){
  const tin=new Int32Array(adj.length).fill(-1),low=new Int32Array(adj.length),
    result=new Set();let time=0;
  function dfs(u,parentEdge){
    tin[u]=low[u]=time++;
    for(const e of adj[u]){
      if(e.id===parentEdge)continue;
      const v=e.to;
      if(tin[v]!==-1)low[u]=Math.min(low[u],tin[v]);
      else{
        dfs(v,e.id);low[u]=Math.min(low[u],low[v]);
        if(low[v]>tin[u])result.add(e.id);
      }
    }
  }
  for(let i=0;i<adj.length;i++)if(tin[i]===-1)dfs(i,-1);
  return result;
}
// Classic min-priority heap to avoid scanning all vertices per packet.
function heapPush(heap,item){
  let i=heap.length;heap.push(item);
  while(i){
    const p=(i-1)>>1;
    if(heap[p].cost<item.cost||heap[p].cost===item.cost&&heap[p].node<=item.node)break;
    heap[i]=heap[p];i=p;
  }
  heap[i]=item;
}
function heapPop(heap){
  const result=heap[0],last=heap.pop();
  if(!heap.length)return result;
  let i=0;
  while(i*2+1<heap.length){
    const l=i*2+1,r=l+1;
    let child=r<heap.length&&
      (heap[r].cost<heap[l].cost||heap[r].cost===heap[l].cost&&heap[r].node<heap[l].node)?r:l;
    if(last.cost<heap[child].cost||
      last.cost===heap[child].cost&&last.node<=heap[child].node)break;
    heap[i]=heap[child];i=child;
  }
  heap[i]=last;
  return result;
}
function nextHop(adj,source,target,mode,remaining,capacity,queueOccupancy,queueLimit,bridgeSet){
  if(source===target)return null;
  const dist=new Float64Array(adj.length).fill(Infinity),
    previousEdge=new Int32Array(adj.length).fill(-1),
    previousNode=new Int32Array(adj.length).fill(-1),pq=[];
  dist[source]=0;heapPush(pq,{node:source,cost:0});
  while(pq.length){
    const {node:u,cost}=heapPop(pq);
    if(cost>dist[u]+1e-9)continue;
    if(u===target)break;
    for(const e of adj[u]){
      let penalty=1;
      if(mode!=="shortest-distance"){
        const used=1-remaining[e.id]/capacity;
        const downstream=queueOccupancy[e.to]/queueLimit;
        penalty+=mode==="queue-aware"?
          3*used+1.4*downstream:
          1.25*used+.65*downstream+(bridgeSet.has(e.id)?2.5:0);
      }
      const nd=cost+e.length*penalty;
      // Strictly improve distance; deterministic sorted adjacency/heap tie handling.
      if(nd<dist[e.to]-1e-9){
        dist[e.to]=nd;previousNode[e.to]=u;previousEdge[e.to]=e.id;
        heapPush(pq,{node:e.to,cost:nd});
      }
    }
  }
  if(previousNode[target]<0)return null;
  let cur=target;
  while(previousNode[cur]!==source){
    cur=previousNode[cur];
    if(cur<0)return null;
  }
  return {edge:previousEdge[cur],next:cur};
}
export function simulatePacketRouting(rawGraph,rawScenario,mode="shortest-distance",givenTraffic=null){
  const graph=checkGraph(rawGraph);
  if(!ROUTING_MODES.includes(mode))throw new TypeError("Unknown routing strategy");
  const cfg=normalizePacketScenario(rawScenario,graph.nodes.length,graph.edges.length);
  const traffic=givenTraffic||createPacketTraffic({
    nodes:graph.nodes.length,ticks:cfg.ticks,
    arrivalsPerTick:cfg.arrivalsPerTick,seed:cfg.seed
  });
  if(traffic?.kind!=="leaflab-deterministic-packet-demand"||
     traffic.nodes!==graph.nodes.length||traffic.ticks!==cfg.ticks||
     traffic.arrivalsPerTick!==cfg.arrivalsPerTick||traffic.seed!==cfg.seed||
     !Array.isArray(traffic.schedule)||traffic.schedule.length!==cfg.ticks)
    throw new TypeError("Traffic schedule does not match scenario");
  let generated=0,delivered=0,dropped=0,peakQueue=0,hops=0,deliveredHops=0,usedSlots=0,
    availableSlots=0;
  const dropReasons={nodeFailed:0,targetFailed:0,unreachable:0,queueOverflow:0,ttl:0};
  const latencies=[],series=[],nodeCount=graph.nodes.length;
  const edges=graph.edges.length, edgeTransmissions=new Array(edges).fill(0);
  let queues=Array.from({length:nodeCount},()=>[]);
  const ttl=Math.min(4*nodeCount,140),drainTicks=Math.min(2*nodeCount+cfg.queueLimit,160);
  for(let tick=0;tick<cfg.ticks+drainTicks;tick++){
    let roundDelivered=0,roundDropped=0,roundTransmissions=0;
    const fail=cfg.failure;
    const down=fail.kind!=="none"&&tick>=fail.start&&tick<fail.start+fail.duration;
    const failedNode=down&&fail.kind==="node"?fail.index:-1;
    const failedLink=down&&fail.kind==="link"?fail.index:-1;
    const adj=adjacency(graph,failedNode,failedLink),bridgeSet=bridges(adj);
    const remaining=new Int16Array(edges).fill(cfg.edgeCapacity);
    let currentlyAvailable=0;
    for(const e of graph.edges)if(e.id!==failedLink&&
       e.a!==failedNode&&e.b!==failedNode)currentlyAvailable++;
    availableSlots+=currentlyAvailable*cfg.edgeCapacity;
    function drop(reason){
      dropped++;roundDropped++;dropReasons[reason]++;
    }
    if(tick<cfg.ticks){
      const arrivals=traffic.schedule[tick];
      if(!Array.isArray(arrivals)||arrivals.length!==cfg.arrivalsPerTick)
        throw new TypeError("Malformed traffic step "+tick);
      for(const p of arrivals){
        if(!Number.isInteger(p.from)||!Number.isInteger(p.to)||
           p.from<0||p.to<0||p.from>=nodeCount||p.to>=nodeCount||p.to===p.from)
          throw new TypeError("Invalid traffic endpoint");
        generated++;
        if(p.from===failedNode){drop("nodeFailed");continue;}
        if(p.to===failedNode){drop("targetFailed");continue;}
        if(queues[p.from].length>=cfg.queueLimit){drop("queueOverflow");continue;}
        queues[p.from].push({destination:p.to,created:tick,hops:0});
      }
    }
    peakQueue=Math.max(peakQueue,...queues.map(q=>q.length));
    const next=Array.from({length:nodeCount},()=>[]);
    const occupancy=queues.map(q=>q.length);
    for(let u=0;u<nodeCount;u++){
      const queue=queues[u];
      if(u===failedNode){
        for(const _ of queue)drop("nodeFailed");
        continue;
      }
      for(const p of queue){
        if(p.destination===failedNode){drop("targetFailed");continue;}
        if(tick-p.created>=ttl){drop("ttl");continue;}
        const route=nextHop(adj,u,p.destination,mode,remaining,cfg.edgeCapacity,
          occupancy,cfg.queueLimit,bridgeSet);
        if(!route){drop("unreachable");continue;}
        if(remaining[route.edge]===0){
          if(next[u].length<cfg.queueLimit)next[u].push(p);
          else drop("queueOverflow");
          continue;
        }
        if(route.next!==p.destination&&next[route.next].length>=cfg.queueLimit){
          if(next[u].length<cfg.queueLimit)next[u].push(p);
          else drop("queueOverflow");
          continue;
        }
        remaining[route.edge]--;
        edgeTransmissions[route.edge]++;roundTransmissions++;hops++;usedSlots++;
        if(route.next===p.destination){
          delivered++;roundDelivered++;deliveredHops+=p.hops+1;
          latencies.push(tick-p.created+1);
        }else{
          next[route.next].push({...p,hops:p.hops+1});
        }
      }
    }
    queues=next;
    const pending=queues.reduce((s,q)=>s+q.length,0);
    peakQueue=Math.max(peakQueue,...queues.map(q=>q.length));
    series.push({tick,phase:tick<cfg.ticks?"offered-traffic":"drain",
      failed:down,delivered:roundDelivered,dropped:roundDropped,
      transmissions:roundTransmissions,pending});
    if(tick>=cfg.ticks&&pending===0)break;
  }
  const unfinished=queues.reduce((s,q)=>s+q.length,0);
  if(generated!==delivered+dropped+unfinished)
    throw new Error("Packet conservation invariant violated");
  latencies.sort((a,b)=>a-b);
  const mean=latencies.length?latencies.reduce((s,x)=>s+x,0)/latencies.length:null;
  const p95=latencies.length?latencies[Math.ceil(latencies.length*.95)-1]:null;
  const metrics={
    generated,delivered,dropped,unfinished,dropReasons,
    deliveryRatio:round(delivered/generated),dropRatio:round(dropped/generated),
    unfinishedRatio:round(unfinished/generated),
    deliveredPerOfferedTick:round(delivered/cfg.ticks),
    meanDeliveredLatencyTicks:mean===null?null:round(mean),
    p95DeliveredLatencyTicks:p95,meanDeliveredHops:delivered?round(deliveredHops/delivered):null,
    transmissions:hops,linkSlotUtilization:availableSlots?round(usedSlots/availableSlots):null,
    peakNodeQueue:peakQueue,
    conservationChecked:true
  };
  return {kind:"leaflab-packet-routing-run",version:PACKET_SIM_VERSION,
    networkLabel:"image-derived abstract packet network",
    mode,scenario:cfg,trafficFingerprint:traffic.trafficFingerprint,
    graph:{nodes:graph.nodes.length,links:edges},
    metrics,perLinkTransmissions:edgeTransmissions,
    timeline:series,
    limitations:[
      "One-hop-per-tick discrete packet model, not TCP, IP, leaf vascular transport, or a live router",
      "Identical seeded demands for all comparisons; fixed FIFO and ascending-node arbitration create bias",
      "Link capacity is a shared bidirectional integer packet budget, not measured Mbps or biological flow",
      "Node queues have hard limits; overflow, lost routes and outage drops are explicitly counted",
      "Routing mode changes weights heuristically; bridge avoiding does not guarantee better performance",
      "Delivered-only latency can improve when slow packets are dropped; inspect delivery and pending ratios together",
      "Packet congestion and failure models are synthetic and user selected"
    ]};
}
export function comparePacketStrategies(graphs,scenario){
  if(!Array.isArray(graphs)||graphs.length<1||graphs.length>3)
    throw new RangeError("Compare 1–3 topologies");
  const inputs=graphs.map(g=>{
    if(!g||typeof g.name!=="string"||g.name.length>80)throw new TypeError("Topology needs a label");
    return {name:g.name,graph:checkGraph(g.graph)};
  });
  if(new Set(inputs.map(g=>g.name)).size!==inputs.length)
    throw new RangeError("Duplicate topology labels");
  if(inputs.some(x=>x.graph.nodes.length!==inputs[0].graph.nodes.length||
      x.graph.nodes.some((n,i)=>n.x!==inputs[0].graph.nodes[i].x||
      n.y!==inputs[0].graph.nodes[i].y)))
    throw new RangeError("Topologies must use identical node IDs and positions");
  const cfg=normalizePacketScenario(scenario,inputs[0].graph.nodes.length,
    inputs[0].graph.edges.length);
  if(cfg.failure.kind==="link"&&inputs.length>1)
    throw new RangeError("A numbered link failure cannot be compared across different topologies. Use a shared node failure.");
  const traffic=createPacketTraffic({nodes:inputs[0].graph.nodes.length,
    ticks:cfg.ticks,arrivalsPerTick:cfg.arrivalsPerTick,seed:cfg.seed});
  const runs=[];
  for(const t of inputs){
    if(cfg.failure.kind==="link"&&cfg.failure.index>=t.graph.edges.length)
      throw new RangeError("Edge failure index outside selected topology");
    for(const mode of ROUTING_MODES){
      const run=simulatePacketRouting(t.graph,cfg,mode,traffic);
      runs.push({topology:t.name,mode,metrics:run.metrics,
        perLinkTransmissions:run.perLinkTransmissions,timeline:run.timeline});
    }
  }
  return {kind:"leaflab-packet-routing-benchmark",version:PACKET_SIM_VERSION,
    status:"SYNTHETIC_DIGITAL_PACKET_EXPERIMENT_ONLY",
    scenario:cfg,trafficFingerprint:traffic.trafficFingerprint,
    topologyLabels:inputs.map(x=>x.name),runCount:runs.length,runs,
    limitations:[
      "All runs share exactly the same offered packet pairs and seed; no hidden model-specific traffic",
      "Cross-topology fault comparison supports shared node failures, never a mismatched edge number",
      "Baseline topologies connect geometric points via hypothetical straight links, potentially outside leaf",
      "Capacity is equal per edge, so a star with more parallel links may gain unmeasured material advantage",
      "These results do not verify an anatomical leaf network or real network throughput",
      "Compare delivered traffic, loss, unfinished queues and delay jointly; no single winner is asserted"
    ]};
}
export function compareReferenceTopologies(referenceGraph,scenario){
  return comparePacketStrategies(simulationTopologies(referenceGraph),scenario);
}
