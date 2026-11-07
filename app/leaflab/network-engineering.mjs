// Φ BioNetwork v1.0: bounded repeated-seed, equal-slot-budget routing experiments.
// Independent of botanical anatomy, physical wires, and real TCP/IP telemetry.
import {createPacketTraffic,simulatePacketRouting,ROUTING_MODES,
  normalizePacketScenario} from "./packet-simulator.mjs";
import {simulationTopologies} from "./network-atlas.mjs";

export const ENGINEERING_VERSION="1.0";
export const TRAFFIC_SHAPES=["uniform-pairs","hub-hotspot"];
export const CAPACITY_POLICIES=["even-slots","short-link-first"];
const clampInt=(n,a,b,label)=>{
  if(!Number.isInteger(n)||n<a||n>b)
    throw new RangeError(label+" must be an integer "+a+".."+b);
  return n;
};
const round=x=>Number(x.toFixed(6));
const mean=x=>x.reduce((s,v)=>s+v,0)/x.length;
function assertGraph(g){
  if(!g||!Array.isArray(g.nodes)||g.nodes.length<2||g.nodes.length>80||
    !Array.isArray(g.edges)||g.edges.length<1||g.edges.length>300)
    throw new RangeError("Engineering lab supports 2–80 nodes and 1–300 edges");
  for(let i=0;i<g.nodes.length;i++){
    const n=g.nodes[i];
    if(!n||n.id!==i||!Number.isFinite(n.x)||!Number.isFinite(n.y))
      throw new TypeError("Malformed node coordinates");
  }
  for(let i=0;i<g.edges.length;i++){
    const e=g.edges[i];
    if(!e||e.id!==i||!Number.isInteger(e.a)||!Number.isInteger(e.b)||
      e.a<0||e.b<0||e.a>=g.nodes.length||e.b>=g.nodes.length||
      e.a===e.b||!Number.isFinite(e.length)||e.length<=0||
      Math.abs(e.length-Math.hypot(g.nodes[e.a].x-g.nodes[e.b].x,
        g.nodes[e.a].y-g.nodes[e.b].y))>1e-5)
      throw new TypeError("Invalid Euclidean graph link");
  }
  return g;
}
export function feasibleSlotBudget(topologies){
  if(!Array.isArray(topologies)||!topologies.length||topologies.length>3)
    throw new RangeError("Provide 1–3 graph shapes");
  const m=topologies.map(t=>assertGraph(t.graph).edges.length);
  return {minimum:Math.max(...m),maximum:Math.min(3000,12*Math.min(...m)),
    linkCounts:m};
}
export function allocateSlotBudget(graph,slotBudget,policy="even-slots"){
  assertGraph(graph);
  if(!CAPACITY_POLICIES.includes(policy))throw new TypeError("Unknown capacity allocation policy");
  const edges=graph.edges,minimum=edges.length,maximum=12*edges.length;
  clampInt(slotBudget,minimum,Math.min(3000,maximum),"Link-slot budget");
  const capacity=new Array(minimum).fill(1);
  const order=edges.map((e,i)=>i);
  if(policy==="short-link-first")
    order.sort((i,j)=>edges[i].length-edges[j].length||i-j);
  let extra=slotBudget-minimum;
  if(policy==="even-slots"){
    while(extra>0){
      for(const i of order){
        if(extra===0)break;
        if(capacity[i]<12){capacity[i]++;extra--;}
      }
    }
  }else{
    for(const i of order){
      const share=Math.min(extra,12-capacity[i]);
      capacity[i]+=share;extra-=share;
      if(extra===0)break;
    }
  }
  if(extra!==0)throw new Error("Unable to allocate complete requested slot budget");
  const wireLength=edges.reduce((s,e)=>s+e.length,0);
  const capacityWeightedWireCost=edges.reduce((s,e,i)=>s+e.length*capacity[i],0);
  return {edgeCapacities:capacity,installedSlots:slotBudget,
    wireLength:round(wireLength),capacityWeightedWireCost:round(capacityWeightedWireCost),
    policy,costDefinition:"sum(edge Euclidean length in image pixels × edge integer packet slots)"};
}
export function engineeringTraffic({nodes,ticks,arrivalsPerTick,seed,shape="uniform-pairs",hotspotNode=0}){
  if(!TRAFFIC_SHAPES.includes(shape))throw new TypeError("Unknown traffic shape");
  clampInt(nodes,2,80,"Traffic nodes");
  clampInt(hotspotNode,0,nodes-1,"Hotspot node");
  const base=createPacketTraffic({nodes,ticks,arrivalsPerTick,seed});
  if(shape==="uniform-pairs")return {...base,trafficShape:shape,hotspotNode};
  let hash=2166136261;
  const schedule=base.schedule.map((step,tick)=>step.map((p,i)=>{
    // At least half the offers have the hotspot as an endpoint.
    const k=tick*arrivalsPerTick+i;
    let from=p.from,to=p.to;
    if(k%2===0){
      from=hotspotNode;
      to=p.to===hotspotNode?(hotspotNode+1+p.from) % nodes:p.to;
      if(to===from)to=(from+1)%nodes;
    }
    hash=Math.imul(hash^from,16777619)>>>0;
    hash=Math.imul(hash^to,16777619)>>>0;
    return {from,to};
  }));
  return {...base,trafficShape:shape,hotspotNode,schedule,
    trafficFingerprint:hash.toString(16).padStart(8,"0")};
}
export function normalizeEngineeringExperiment(topologies,input={}){
  const {minimum,maximum}=feasibleSlotBudget(topologies);
  if(minimum>maximum)
    throw new RangeError("These topologies cannot share an identical integer link-slot budget");
  const seeds=clampInt(input.seeds??3,1,5,"Independent seeds");
  const seedBase=clampInt(input.seedBase??369,1,2147483647,"Seed base");
  const slotBudget=clampInt(input.slotBudget??Math.min(maximum,Math.max(minimum,minimum*2)),
    minimum,maximum,"Equal per-topology link slots");
  const capacityPolicy=input.capacityPolicy??"even-slots";
  if(!CAPACITY_POLICIES.includes(capacityPolicy))
    throw new TypeError("Unknown link capacity policy");
  const trafficShape=input.trafficShape??"uniform-pairs";
  if(!TRAFFIC_SHAPES.includes(trafficShape))
    throw new TypeError("Unknown traffic shape");
  const nodeCount=topologies[0].graph.nodes.length;
  const hotspotNode=clampInt(input.hotspotNode??0,0,nodeCount-1,"Hotspot node");
  // Only shared-node outages are cross-topology comparable.
  const rawScenario={ticks:input.ticks??50,arrivalsPerTick:input.arrivalsPerTick??4,
    edgeCapacity:1,queueLimit:input.queueLimit??24,seed:seedBase,
    failure:input.failure||{kind:"none"}};
  const config=normalizePacketScenario(rawScenario,nodeCount,
    topologies[0].graph.edges.length);
  if(config.failure.kind==="link")
    throw new RangeError("Link-index failures are not comparable across topologies; use a shared node failure");
  if(config.ticks>90||config.arrivalsPerTick>8)
    throw new RangeError("Multi-seed benchmark is bounded at 90 ticks and 8 offers per tick");
  const estimatedWork=seeds*ROUTING_MODES.length*topologies.length*
    config.ticks*config.arrivalsPerTick*nodeCount*nodeCount;
  if(estimatedWork>20000000)
    throw new RangeError("Scenario exceeds browser-compute safety budget. Reduce seeds, ticks, offered traffic or graph size");
  return {seeds,seedBase,slotBudget,capacityPolicy,trafficShape,hotspotNode,
    scenario:{ticks:config.ticks,arrivalsPerTick:config.arrivalsPerTick,
      queueLimit:config.queueLimit,failure:config.failure},
    estimatedWork,
    feasibleSlotBudget:{minimum,maximum}};
}
function summarizeNumbers(values){
  if(!values.length)return null;
  const average=mean(values);
  return {mean:round(average),min:round(Math.min(...values)),
    max:round(Math.max(...values)),
    populationSD:round(Math.sqrt(mean(values.map(x=>(x-average)**2))))};
}
export function runEngineeringExperiment(topologies,input={}){
  const cfg=normalizeEngineeringExperiment(topologies,input),nodeCount=topologies[0].graph.nodes.length;
  const baseNodes=topologies[0].graph.nodes;
  if(new Set(topologies.map(t=>t.name)).size!==topologies.length||
    topologies.some(t=>typeof t.name!=="string"||!t.name||
      t.graph.nodes.length!==nodeCount||t.graph.nodes.some((n,i)=>
        n.id!==baseNodes[i].id||n.x!==baseNodes[i].x||n.y!==baseNodes[i].y)))
    throw new RangeError("Comparison topologies must have distinct names and identical node positions");
  const allocated=topologies.map(t=>({
    name:t.name,graph:t.graph,allocation:allocateSlotBudget(
      t.graph,cfg.slotBudget,cfg.capacityPolicy)
  }));
  const summaries=[],runs=[];
  const trafficFingerprints=[];
  for(let i=0;i<cfg.seeds;i++){
    const seed=1+((cfg.seedBase-1+i*7919)%2147483647);
    const traffic=engineeringTraffic({nodes:nodeCount,ticks:cfg.scenario.ticks,
      arrivalsPerTick:cfg.scenario.arrivalsPerTick,seed,shape:cfg.trafficShape,
      hotspotNode:cfg.hotspotNode});
    trafficFingerprints.push({seed,fingerprint:traffic.trafficFingerprint});
    for(const t of allocated){
      for(const mode of ROUTING_MODES){
        const scenario={...cfg.scenario,edgeCapacity:1,
          edgeCapacities:t.allocation.edgeCapacities,seed};
        const run=simulatePacketRouting(t.graph,scenario,mode,traffic);
        if(run.metrics.generated!==cfg.scenario.ticks*cfg.scenario.arrivalsPerTick||
          !run.metrics.conservationChecked||
          run.metrics.installedLinkSlots!==cfg.slotBudget)
          throw new Error("Traffic, budget or packet accounting invariant failed");
        runs.push({seed,topology:t.name,mode,trafficFingerprint:traffic.trafficFingerprint,
          metrics:run.metrics,timeline:run.timeline});
      }
    }
  }
  for(const t of allocated){
    for(const mode of ROUTING_MODES){
      const rows=runs.filter(r=>r.topology===t.name&&r.mode===mode);
      const metrics={
        deliveryRatio:summarizeNumbers(rows.map(r=>r.metrics.deliveryRatio)),
        dropRatio:summarizeNumbers(rows.map(r=>r.metrics.dropRatio)),
        unfinishedRatio:summarizeNumbers(rows.map(r=>r.metrics.unfinishedRatio)),
        meanDeliveredLatencyTicks:summarizeNumbers(rows.map(r=>
          r.metrics.meanDeliveredLatencyTicks).filter(x=>x!==null)),
        deliveredPerOfferedTick:summarizeNumbers(rows.map(r=>
          r.metrics.deliveredPerOfferedTick)),
        peakNodeQueue:summarizeNumbers(rows.map(r=>r.metrics.peakNodeQueue))
      };
      summaries.push({topology:t.name,mode,seeds:rows.length,
        allocation:t.allocation,metrics,
        deliveredPerTickPerCapacityWireCost:round(
          metrics.deliveredPerOfferedTick.mean/t.allocation.capacityWeightedWireCost)
      });
    }
  }
  return {kind:"leaflab-network-engineering-experiment",version:ENGINEERING_VERSION,
    status:"SYNTHETIC_DIGITAL_PACKETS_NO_BIOLOGICAL_VALIDATION",
    experiment:cfg,trafficFingerprints,runCount:runs.length,
    topologyCosts:allocated.map(x=>({name:x.name,...x.allocation})),
    summaries,runs,
    limitations:[
      "Real botanical vascular function and physical telecom performance are unverified",
      "Every topology receives the SAME number of nominal integer link slots, but total physical wire/capacity-weighted cost differs",
      "Image-pixel link lengths and slot cost are conceptual proxies, not measured network-installation costs",
      "All strategies see exactly the same offered endpoint pairs for each seed; no link-ID equivalence across shapes",
      "Population standard deviations and observed min/max across 1–5 seeds are descriptive, NOT confidence intervals",
      "Hotspot traffic is an artificial fixed-endpoint stress scenario, not measured workload",
      "Mean delivered-only latency is conditional on surviving deliveries; high loss can conceal slow traffic",
      "Capacity allocation and routing penalties are heuristic; repeating or tuning on these seeds invalidates untouched evaluation",
      "No per-link propagation delay, packet priorities, TCP congestion control or retransmissions are simulated"
    ]};
}
export function compareEngineeringReference(graph,input){
  return runEngineeringExperiment(simulationTopologies(graph),input);
}
