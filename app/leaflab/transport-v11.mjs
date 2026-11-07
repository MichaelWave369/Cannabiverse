// Φ LeafLab v1.1: synthetic, delayed packet transport with class priorities.
// The graph is image-derived geometry, NEVER verified vascular flow or real IP.
import {engineeringTraffic} from "./network-engineering.mjs";
import {simulationTopologies} from "./network-atlas.mjs";

export const TRANSPORT_VERSION="1.1";
export const TRANSPORT_MODES=["shortest-distance","queue-aware","bridge-avoiding"];
export const CAPACITY_ALLOCATIONS=["even-slots","short-link-first"];
const MAX_NODES=36,MAX_EDGES=110,EPS=1e-8;
const nint=(v,lo,hi,name)=>{
  if(!Number.isInteger(v)||v<lo||v>hi)
    throw new RangeError(name+" must be an integer "+lo+".."+hi);
  return v;
};
const round=x=>Number(x.toFixed(6));
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
function validGraph(g){
  if(!g||!Array.isArray(g.nodes)||!Array.isArray(g.edges)||
     g.nodes.length<2||g.nodes.length>MAX_NODES||
     g.edges.length<1||g.edges.length>MAX_EDGES)
    throw new RangeError("Transport graph limited to 2–36 nodes and 1–110 links");
  const names=new Set();
  for(let i=0;i<g.nodes.length;i++){
    const n=g.nodes[i];
    if(!n||n.id!==i||!Number.isFinite(n.x)||!Number.isFinite(n.y))
      throw new TypeError("Invalid transport graph coordinates");
  }
  for(let i=0;i<g.edges.length;i++){
    const e=g.edges[i];
    if(!e||e.id!==i||!Number.isInteger(e.a)||!Number.isInteger(e.b)||
       e.a===e.b||e.a<0||e.b<0||e.a>=g.nodes.length||e.b>=g.nodes.length||
       !Number.isFinite(e.length)||e.length<=0)
      throw new TypeError("Invalid transport graph link");
    const length=Math.hypot(g.nodes[e.a].x-g.nodes[e.b].x,
      g.nodes[e.a].y-g.nodes[e.b].y);
    if(Math.abs(length-e.length)>1e-5)
      throw new RangeError("Geometric link length inconsistent with nodes");
    const k=Math.min(e.a,e.b)+"|"+Math.max(e.a,e.b);
    if(names.has(k))throw new RangeError("Duplicate transport link");
    names.add(k);
  }
  return g;
}
export function commonWireBudgetRange(topologies){
  if(!Array.isArray(topologies)||topologies.length<1||topologies.length>3)
    throw new TypeError("Provide 1–3 named comparison topologies");
  for(const t of topologies)validGraph(t.graph);
  const minimumByShape=topologies.map(t=>t.graph.edges.reduce((s,e)=>s+e.length,0));
  const maxMinimum=Math.max(...minimumByShape);
  return {
    minimum:Math.ceil(maxMinimum-1e-9),
    minimumByShape:minimumByShape.map(round),
    units:"Euclidean image pixels × installed integer link slots",
    maximum:100000
  };
}
export function allocateWithinWireBudget(graph,budget,policy="even-slots"){
  validGraph(graph);
  if(!CAPACITY_ALLOCATIONS.includes(policy))throw new TypeError("Unknown capacity allocation");
  if(typeof budget!=="number"||!Number.isFinite(budget)||budget<=0||budget>100000)
    throw new RangeError("Wire budget must be positive and no more than 100000 proxy units");
  const edges=graph.edges,minimumCost=edges.reduce((s,e)=>s+e.length,0);
  if(budget+EPS<minimumCost)
    throw new RangeError("Wire cost cap cannot install even one slot per link");
  const slots=new Array(edges.length).fill(1);
  const order=edges.map((e,i)=>i);
  if(policy==="short-link-first")
    order.sort((a,b)=>edges[a].length-edges[b].length||a-b);
  let spent=minimumCost;
  if(policy==="even-slots"){
    // Round robin gives longer links a fair chance to grow before saturation.
    for(let pass=0;pass<11;pass++){
      for(const id of order)if(slots[id]<12&&spent+edges[id].length<=budget+EPS){
        spent+=edges[id].length;slots[id]++;
      }
    }
  }else{
    for(const id of order){
      while(slots[id]<12&&spent+edges[id].length<=budget+EPS){
        spent+=edges[id].length;slots[id]++;
      }
    }
  }
  const verified=edges.reduce((s,e,i)=>s+e.length*slots[i],0);
  if(verified>budget+EPS||Math.abs(verified-spent)>1e-6)
    throw new Error("Wire budget accounting invariant failed");
  return {
    policy,edgeCapacities:slots,
    installedSlots:slots.reduce((s,v)=>s+v,0),
    weightedCost:round(verified),wireLength:round(minimumCost),
    cap:budget,unspent:round(Math.max(0,budget-verified)),
    costBasis:"sum(image-pixel link length × packet slots), no currency or physics"
  };
}
export function normalizeTransportExperiment(topologies,raw={}){
  const range=commonWireBudgetRange(topologies),nodes=topologies[0].graph.nodes;
  if(new Set(topologies.map(t=>t.name)).size!==topologies.length||
     topologies.some(t=>typeof t.name!=="string"||!t.name||
       t.graph.nodes.length!==nodes.length||t.graph.nodes.some((n,i)=>
         n.id!==nodes[i].id||n.x!==nodes[i].x||n.y!==nodes[i].y)))
    throw new RangeError("Topologies must share identical marked node positions and unique labels");
  const ticks=nint(raw.ticks??36,10,60,"Traffic ticks"),
    arrivalsPerTick=nint(raw.arrivalsPerTick??3,1,6,"Packets per tick"),
    seeds=nint(raw.seeds??2,1,3,"Seed count"),
    seedBase=nint(raw.seedBase??369,1,2147483647,"First seed"),
    queueLimit=nint(raw.queueLimit??18,4,50,"Node queue limit"),
    pixelsPerTick=nint(raw.pixelsPerTick??30,10,120,"Propagation pixels per tick"),
    highPriorityPercent=nint(raw.highPriorityPercent??40,0,100,"Priority traffic percent");
  const trafficShape=raw.trafficShape??"uniform-pairs";
  if(!["uniform-pairs","hub-hotspot"].includes(trafficShape))
    throw new TypeError("Unknown traffic shape");
  const hotspotNode=nint(raw.hotspotNode??0,0,nodes.length-1,"Hotspot node");
  const allocationPolicy=raw.allocationPolicy??"even-slots";
  if(!CAPACITY_ALLOCATIONS.includes(allocationPolicy))
    throw new TypeError("Unknown capacity allocation policy");
  const budget=raw.wireBudget??Math.ceil(range.minimum*2);
  if(!Number.isInteger(budget)||budget<range.minimum||budget>100000)
    throw new RangeError("Shared wire cost cap must be in feasible range");
  const failure=raw.failure??{kind:"none"};
  if(!["none","node"].includes(failure.kind))
    throw new RangeError("Only shared-node outages can be compared across topologies");
  let outage={kind:"none"};
  if(failure.kind==="node"){
    const index=nint(failure.index,0,nodes.length-1,"Failed node"),
      start=nint(failure.start??12,0,ticks-1,"Failure start"),
      duration=nint(failure.duration??8,1,ticks-start,"Failure duration");
    outage={kind:"node",index,start,duration};
  }
  const work=seeds*topologies.length*TRANSPORT_MODES.length*ticks*
    arrivalsPerTick*nodes.length*nodes.length;
  if(work>12000000)throw new RangeError("Experiment exceeds bounded browser compute budget");
  return {ticks,arrivalsPerTick,seeds,seedBase,queueLimit,pixelsPerTick,
    highPriorityPercent,trafficShape,hotspotNode,allocationPolicy,wireBudget:budget,
    failure:outage,minimumCommonCost:range.minimum,estimatedWork:work};
}
function graphState(g,failedNode){
  const adj=g.nodes.map(()=>[]);
  for(const e of g.edges){
    if(e.a===failedNode||e.b===failedNode)continue;
    adj[e.a].push({to:e.b,id:e.id,length:e.length});
    adj[e.b].push({to:e.a,id:e.id,length:e.length});
  }
  for(const row of adj)row.sort((a,b)=>a.id-b.id);
  const discover=new Int32Array(adj.length).fill(-1),
    low=new Int32Array(adj.length),bridges=new Set();
  let timer=0;
  function dfs(u,parent){
    discover[u]=low[u]=timer++;
    for(const e of adj[u]){
      if(e.id===parent)continue;
      if(discover[e.to]>=0)low[u]=Math.min(low[u],discover[e.to]);
      else{
        dfs(e.to,e.id);
        low[u]=Math.min(low[u],low[e.to]);
        if(low[e.to]>discover[u])bridges.add(e.id);
      }
    }
  }
  for(let i=0;i<adj.length;i++)if(discover[i]<0)dfs(i,-1);
  return {adj,bridges};
}
function chooseNext(adj,source,target,mode,free,capacity,occupancy,queueLimit,bridgeSet){
  const size=adj.length,dist=new Float64Array(size).fill(Infinity),
    used=new Uint8Array(size),prev=new Int32Array(size).fill(-1),
    prevEdge=new Int32Array(size).fill(-1);
  dist[source]=0;
  for(let step=0;step<size;step++){
    let u=-1;
    for(let i=0;i<size;i++)if(!used[i]&&(u<0||dist[i]<dist[u]))u=i;
    if(u<0||!Number.isFinite(dist[u]))break;
    used[u]=1;
    if(u===target)break;
    for(const e of adj[u]){
      const busy=1-free[e.id]/capacity[e.id];
      const pressure=occupancy[e.to]/queueLimit;
      const weight=mode==="shortest-distance"?1:mode==="queue-aware"?
        1+2*busy+pressure:1+.75*busy+.5*pressure+
          (bridgeSet.has(e.id)?2:0);
      const candidate=dist[u]+e.length*weight;
      if(candidate<dist[e.to]-EPS){
        dist[e.to]=candidate;prev[e.to]=u;prevEdge[e.to]=e.id;
      }
    }
  }
  if(prev[target]<0)return null;
  let cursor=target;
  while(prev[cursor]!==source){
    cursor=prev[cursor];
    if(cursor<0)return null;
  }
  return {next:cursor,edge:prevEdge[cursor]};
}
function latencySummary(values){
  if(!values.length)return {mean:null,p95:null};
  const sorted=[...values].sort((a,b)=>a-b);
  return {mean:round(mean(values)),p95:sorted[Math.ceil(.95*sorted.length)-1]};
}
export function simulateDelayedTransport(graph,allocation,config,mode,traffic){
  validGraph(graph);
  if(!TRANSPORT_MODES.includes(mode))throw new TypeError("Unknown transport routing strategy");
  const {ticks,arrivalsPerTick,queueLimit,pixelsPerTick,highPriorityPercent,seed,failure}=config;
  nint(ticks,10,60,"Traffic ticks");
  nint(arrivalsPerTick,1,6,"Packets per tick");
  nint(queueLimit,4,50,"Node queue limit");
  nint(pixelsPerTick,10,120,"Propagation pixels per tick");
  nint(highPriorityPercent,0,100,"Priority traffic percent");
  nint(seed,1,2147483647,"Traffic seed");
  if(!failure||!["none","node"].includes(failure.kind))
    throw new TypeError("Only no failure or one shared-node outage supported");
  if(failure.kind==="node"){
    nint(failure.index,0,graph.nodes.length-1,"Failed node");
    nint(failure.start,0,ticks-1,"Failure start");
    nint(failure.duration,1,ticks-failure.start,"Failure duration");
  }
  if(!allocation||!Array.isArray(allocation.edgeCapacities)||
     allocation.edgeCapacities.length!==graph.edges.length||
     allocation.edgeCapacities.some(x=>!Number.isInteger(x)||x<1||x>12))
    throw new TypeError("Transport requires per-edge capacities of 1–12");
  if(!traffic||traffic.kind!=="leaflab-deterministic-packet-demand"||
     traffic.nodes!==graph.nodes.length||traffic.seed!==seed||
     traffic.ticks!==ticks||traffic.arrivalsPerTick!==arrivalsPerTick||
     !Array.isArray(traffic.schedule)||traffic.schedule.length!==ticks)
    throw new TypeError("Traffic does not match transport scenario");
  const n=graph.nodes.length,cap=allocation.edgeCapacities,
    delays=graph.edges.map(e=>Math.max(1,Math.ceil(e.length/pixelsPerTick))),
    queues=Array.from({length:n},()=>[]);
  let flying=[],generated=0,delivered=0,dropped=0,
    transmissions=0,peakQueue=0;
  const perClass={high:{generated:0,delivered:0,dropped:0,unfinished:0,latencies:[]},
    standard:{generated:0,delivered:0,dropped:0,unfinished:0,latencies:[]}};
  const drops={nodeFailed:0,targetFailed:0,noRoute:0,queueOverflow:0,ttl:0,
    inflightNodeFailed:0};
  const trace=[],ttl=Math.min(200,n*18+queueLimit),
    drainTicks=Math.min(200,Math.max(40,n*15+queueLimit));
  function lost(packet,reason,round){
    dropped++;round.dropped++;perClass[packet.priority].dropped++;drops[reason]++;
  }
  function admit(packet,node,round){
    if(queues[node].length>=queueLimit){lost(packet,"queueOverflow",round);return;}
    queues[node].push(packet);
  }
  for(let tick=0;tick<ticks+drainTicks;tick++){
    const round={tick,delivered:0,dropped:0,sent:0,
      phase:tick<ticks?"offered-traffic":"drain",pending:0,inFlight:0};
    const down=failure.kind==="node"&&tick>=failure.start&&
      tick<failure.start+failure.duration;
    const failedNode=down?failure.index:-1;
    // In-flight packets touching a failed endpoint are not magically preserved.
    const kept=[];
    for(const p of flying){
      const e=graph.edges[p.edge];
      if(e.a===failedNode||e.b===failedNode){
        lost(p,"inflightNodeFailed",round);
      }else if(p.arrival<=tick){
        if(p.node===p.destination){
          delivered++;round.delivered++;
          perClass[p.priority].delivered++;
          perClass[p.priority].latencies.push(tick-p.created);
        }else admit(p,p.node,round);
      }else kept.push(p);
    }
    flying=kept;
    if(tick<ticks){
      const offers=traffic.schedule[tick];
      if(!Array.isArray(offers)||offers.length!==arrivalsPerTick)
        throw new TypeError("Malformed offered-traffic tick");
      for(let i=0;i<offers.length;i++){
        const p=offers[i];
        if(!p||!Number.isInteger(p.from)||!Number.isInteger(p.to)||
           p.from<0||p.to<0||p.from>=n||p.to>=n||p.from===p.to)
          throw new TypeError("Invalid traffic source or target");
        const serial=tick*arrivalsPerTick+i,
          priority=((serial*37+seed*13)%100)<highPriorityPercent?"high":"standard";
        const packet={node:p.from,destination:p.to,created:tick,priority,hops:0};
        generated++;perClass[priority].generated++;
        if(packet.node===failedNode){lost(packet,"nodeFailed",round);continue;}
        if(packet.destination===failedNode){lost(packet,"targetFailed",round);continue;}
        admit(packet,packet.node,round);
      }
    }
    const {adj,bridges}=graphState(graph,failedNode),
      remaining=[...cap],occupancy=queues.map(q=>q.length);
    peakQueue=Math.max(peakQueue,...occupancy);
    for(let node=0;node<n;node++){
      const items=queues[node].splice(0);
      if(node===failedNode){
        for(const p of items)lost(p,"nodeFailed",round);
        continue;
      }
      const high=items.filter(p=>p.priority==="high"),
        normal=items.filter(p=>p.priority==="standard");
      for(const p of [...high,...normal]){
        if(p.destination===failedNode){lost(p,"targetFailed",round);continue;}
        if(tick-p.created>=ttl){lost(p,"ttl",round);continue;}
        const route=chooseNext(adj,node,p.destination,mode,remaining,cap,
          occupancy,queueLimit,bridges);
        if(!route){lost(p,"noRoute",round);continue;}
        if(remaining[route.edge]===0){
          queues[node].push(p);
          continue;
        }
        remaining[route.edge]--;
        transmissions++;round.sent++;
        flying.push({...p,node:route.next,edge:route.edge,
          arrival:tick+delays[route.edge],hops:p.hops+1});
      }
    }
    round.inFlight=flying.length;
    round.pending=flying.length+queues.reduce((s,q)=>s+q.length,0);
    peakQueue=Math.max(peakQueue,...queues.map(q=>q.length));
    trace.push(round);
    if(tick>=ticks&&round.pending===0)break;
  }
  let unfinished=0;
  for(const queue of queues)for(const p of queue){
    unfinished++;perClass[p.priority].unfinished++;
  }
  for(const p of flying){unfinished++;perClass[p.priority].unfinished++;}
  if(generated!==delivered+dropped+unfinished)
    throw new Error("Delayed packet conservation invariant failed");
  const classMetrics={};
  for(const [name,data] of Object.entries(perClass)){
    if(data.generated!==data.delivered+data.dropped+data.unfinished)
      throw new Error("Priority class conservation invariant failed");
    classMetrics[name]={
      generated:data.generated,delivered:data.delivered,
      dropped:data.dropped,unfinished:data.unfinished,
      deliveryRatio:data.generated?round(data.delivered/data.generated):null,
      ...latencySummary(data.latencies)
    };
  }
  const allLatencies=[...perClass.high.latencies,...perClass.standard.latencies];
  const metrics={
    generated,delivered,dropped,unfinished,
    deliveredFraction:round(delivered/generated),droppedFraction:round(dropped/generated),
    meanDeliveredLatencyTicks:latencySummary(allLatencies).mean,
    p95DeliveredLatencyTicks:latencySummary(allLatencies).p95,
    peakNodeQueue:peakQueue,transmissions,dropReasons:drops,
    priority:classMetrics,conservationChecked:true,
    wireCost:allocation.weightedCost,installedSlots:allocation.installedSlots,
    inFlightPendingAtEnd:flying.length
  };
  return {kind:"leaflab-delayed-transport-run",version:TRANSPORT_VERSION,
    mode,trafficFingerprint:traffic.trafficFingerprint,
    scenario:{...config,edgePropagationTicks:delays},
    metrics,timeline:trace,
    limitations:[
      "Synthetic store-and-forward packet transport, not real leaf hydraulics or deployed network routing",
      "Propagation tick is ceil(image edge length / chosen pixels-per-tick), not measured latency",
      "Strict high-before-standard output scheduling, no reservation for packets already in flight",
      "Link capacity limits launches per tick, while packet propagation is pipeline-like",
      "On node failure, touching in-flight packets and queues are dropped; no retransmission",
      "Delivered-only mean latency can conceal packet starvation and losses",
      "FIFO order within classes; node-index ordering and fixed traffic classification can bias results"
    ]};
}
function stat(values){
  const clean=values.filter(x=>x!==null);
  if(!clean.length)return null;
  const m=mean(clean);
  return {mean:round(m),min:round(Math.min(...clean)),max:round(Math.max(...clean)),
    populationSD:round(Math.sqrt(mean(clean.map(x=>(x-m)**2))))};
}
export function runTransportBenchmark(topologies,raw={}){
  const cfg=normalizeTransportExperiment(topologies,raw);
  const installed=topologies.map(t=>({
    name:t.name,graph:t.graph,
    allocation:allocateWithinWireBudget(t.graph,cfg.wireBudget,cfg.allocationPolicy)
  }));
  const runs=[],fingerprints=[];
  for(let j=0;j<cfg.seeds;j++){
    const seed=1+((cfg.seedBase-1+j*7919)%2147483647);
    const traffic=engineeringTraffic({
      nodes:topologies[0].graph.nodes.length,
      ticks:cfg.ticks,arrivalsPerTick:cfg.arrivalsPerTick,seed,
      shape:cfg.trafficShape,hotspotNode:cfg.hotspotNode
    });
    fingerprints.push({seed,fingerprint:traffic.trafficFingerprint});
    for(const t of installed)for(const mode of TRANSPORT_MODES){
      const res=simulateDelayedTransport(t.graph,t.allocation,{
        ticks:cfg.ticks,arrivalsPerTick:cfg.arrivalsPerTick,
        queueLimit:cfg.queueLimit,pixelsPerTick:cfg.pixelsPerTick,
        highPriorityPercent:cfg.highPriorityPercent,seed,failure:cfg.failure
      },mode,traffic);
      if(res.metrics.generated!==res.metrics.delivered+res.metrics.dropped+
          res.metrics.unfinished||res.metrics.wireCost>cfg.wireBudget+EPS)
        throw new Error("Transport accounting or cost-cap violation");
      runs.push({seed,topology:t.name,mode,trafficFingerprint:traffic.trafficFingerprint,
        metrics:res.metrics,timeline:res.timeline});
    }
  }
  const summaries=[];
  for(const t of installed)for(const mode of TRANSPORT_MODES){
    const records=runs.filter(r=>r.topology===t.name&&r.mode===mode);
    summaries.push({topology:t.name,mode,allocation:t.allocation,
      delivery:stat(records.map(r=>r.metrics.deliveredFraction)),
      lost:stat(records.map(r=>r.metrics.droppedFraction)),
      overallLatency:stat(records.map(r=>r.metrics.meanDeliveredLatencyTicks)),
      highDelivery:stat(records.map(r=>r.metrics.priority.high.deliveryRatio)),
      standardDelivery:stat(records.map(r=>r.metrics.priority.standard.deliveryRatio)),
      highLatency:stat(records.map(r=>r.metrics.priority.high.mean)),
      standardLatency:stat(records.map(r=>r.metrics.priority.standard.mean)),
      highPriorityPackets:records.reduce((s,r)=>s+r.metrics.priority.high.generated,0),
      standardPriorityPackets:records.reduce((s,r)=>s+r.metrics.priority.standard.generated,0)
    });
  }
  return {
    kind:"leaflab-delayed-transport-benchmark",version:TRANSPORT_VERSION,
    evidenceStatus:"SYNTHETIC_PACKET_NETWORK_NOT_BOTANICAL_EVIDENCE",
    experiment:cfg,runCount:runs.length,trafficFingerprints:fingerprints,
    allocations:installed.map(t=>({topology:t.name,...t.allocation})),
    summaries,runs,
    limitations:[
      "Same maximum capacity-weighted image-length cost, not equal realized expenditure or real currency",
      "Each topology may leave unusable budget because integer capacities and link lengths differ",
      "Priority and propagation are configurable abstract assumptions, not verified engineering performance",
      "Three seeds at most; displayed variability is descriptive, not statistical inference",
      "Only shared node failures may be compared across different topologies",
      "No TCP/IP retransmission, queue admission priority, link interference, or real vascular transport"
    ]
  };
}
export function benchmarkReferenceTransport(graph,raw={}){
  return runTransportBenchmark(simulationTopologies(graph),raw);
}
