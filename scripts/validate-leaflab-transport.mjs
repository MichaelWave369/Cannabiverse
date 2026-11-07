import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {demoNetworkReferences,graphFromReference,simulationTopologies}
  from "../app/leaflab/network-atlas.mjs";
import {engineeringTraffic} from "../app/leaflab/network-engineering.mjs";
import {commonWireBudgetRange,allocateWithinWireBudget,
  normalizeTransportExperiment,simulateDelayedTransport,runTransportBenchmark,
  benchmarkReferenceTransport,TRANSPORT_MODES}
  from "../app/leaflab/transport-v11.mjs";

assert.deepEqual(TRANSPORT_MODES,[
  "shortest-distance","queue-aware","bridge-avoiding"
]);
const [treeRef,loopRef]=demoNetworkReferences();
const loop=graphFromReference(loopRef),tree=graphFromReference(treeRef);
const shapes=simulationTopologies(loop);
const budgetBounds=commonWireBudgetRange(shapes);
assert.equal(budgetBounds.minimum,271);
assert.equal(budgetBounds.minimumByShape.length,3);
assert.ok(budgetBounds.minimumByShape[0]>budgetBounds.minimumByShape[1]);
assert.throws(()=>commonWireBudgetRange([]),/1–3/);
const budget=542,allocations=shapes.map(x=>
  allocateWithinWireBudget(x.graph,budget,"even-slots"));
assert.equal(allocations.length,3);
assert.ok(allocations.every(x=>x.weightedCost<=budget&&x.unspent>=0));
assert.ok(allocations.every(x=>x.edgeCapacities.every(c=>c>=1&&c<=12)));
assert.ok(allocations.every(x=>x.installedSlots===
  x.edgeCapacities.reduce((a,b)=>a+b,0)));
assert.ok(allocations[0].installedSlots<allocations[1].installedSlots,
  "Equal geometric-cost caps need not install equal slot counts");
assert.deepEqual(allocations,
  shapes.map(x=>allocateWithinWireBudget(x.graph,budget,"even-slots")));
const short=allocateWithinWireBudget(loop,budget,"short-link-first");
assert.equal(short.policy,"short-link-first");
assert.ok(short.weightedCost<=budget);
assert.notDeepEqual(short.edgeCapacities,allocations[0].edgeCapacities);
assert.throws(()=>allocateWithinWireBudget(loop,200),/cannot install even one/);
assert.throws(()=>allocateWithinWireBudget(loop,budget,"unknown"),/Unknown capacity/);

const config={seeds:2,seedBase:369,ticks:30,arrivalsPerTick:3,
  queueLimit:12,pixelsPerTick:25,highPriorityPercent:45,
  wireBudget:budget,allocationPolicy:"even-slots",
  failure:{kind:"node",index:0,start:12,duration:7}};
const normalized=normalizeTransportExperiment(shapes,config);
assert.equal(normalized.seeds,2);
assert.equal(normalized.wireBudget,budget);
assert.ok(normalized.estimatedWork>0);
const benchmark=benchmarkReferenceTransport(loop,config);
assert.equal(benchmark.kind,"leaflab-delayed-transport-benchmark");
assert.equal(benchmark.version,"1.1");
assert.equal(benchmark.runCount,18);
assert.equal(benchmark.summaries.length,9);
assert.equal(benchmark.trafficFingerprints.length,2);
assert.deepEqual(benchmark,benchmarkReferenceTransport(loop,config),
  "Identical graph, seed and scenario must reproduce complete report");
assert.equal(new Set(benchmark.trafficFingerprints.map(x=>x.fingerprint)).size,2);
for(const row of benchmark.runs){
  const m=row.metrics;
  assert.equal(m.generated,90);
  assert.equal(m.generated,m.delivered+m.dropped+m.unfinished);
  assert.equal(m.generated,m.priority.high.generated+m.priority.standard.generated);
  assert.equal(m.delivered,m.priority.high.delivered+m.priority.standard.delivered);
  assert.equal(m.dropped,m.priority.high.dropped+m.priority.standard.dropped);
  assert.equal(m.unfinished,m.priority.high.unfinished+m.priority.standard.unfinished);
  assert.ok(m.conservationChecked);
  assert.ok(m.wireCost<=budget);
  assert.ok(m.peakNodeQueue<=config.queueLimit);
  assert.ok(row.timeline.length>=config.ticks);
  assert.equal(row.trafficFingerprint,benchmark.trafficFingerprints
    .find(x=>x.seed===row.seed).fingerprint);
}
assert.ok(benchmark.runs.some(r=>r.metrics.dropReasons.inflightNodeFailed>0),
  "The specified fault must be able to remove packets already propagating");
assert.ok(benchmark.summaries.every(s=>s.allocation.weightedCost<=budget));
assert.ok(benchmark.summaries.every(s=>s.delivery.mean>=0&&s.delivery.mean<=1));
assert.ok(benchmark.summaries.every(s=>s.highPriorityPackets>0&&
  s.standardPriorityPackets>0));
assert.ok(benchmark.summaries.every(s=>s.delivery.populationSD>=0));
const hotspot=runTransportBenchmark(shapes,{
  ...config,seeds:1,trafficShape:"hub-hotspot",hotspotNode:2,
  allocationPolicy:"short-link-first",highPriorityPercent:70
});
assert.equal(hotspot.runCount,9);
assert.ok(hotspot.runs.every(r=>r.metrics.conservationChecked));
assert.notEqual(hotspot.trafficFingerprints[0].fingerprint,
  benchmark.trafficFingerprints[0].fingerprint);
assert.throws(()=>normalizeTransportExperiment(shapes,{...config,seeds:4}),
  /Seed count/);
assert.throws(()=>normalizeTransportExperiment(shapes,{...config,wireBudget:200}),
  /Shared wire cost cap/);
assert.throws(()=>normalizeTransportExperiment(shapes,{...config,pixelsPerTick:0}),
  /Propagation pixels/);
assert.throws(()=>normalizeTransportExperiment(shapes,{...config,highPriorityPercent:101}),
  /Priority traffic/);
assert.throws(()=>normalizeTransportExperiment(shapes,{
  ...config,failure:{kind:"link",index:0,start:2,duration:4}
}),/Only shared-node outages/);
assert.throws(()=>normalizeTransportExperiment(shapes,{
  ...config,arrivalsPerTick:7
}),/Packets per tick/);
const wrongGraph=shapes.map((x,i)=>i===1?{
  ...x,graph:{...x.graph,nodes:[{...x.graph.nodes[0],x:x.graph.nodes[0].x+1},
    ...x.graph.nodes.slice(1)],
    edges:x.graph.edges.map(e=>({
      ...e,length:Math.hypot(
        ((e.a===0?x.graph.nodes[0].x+1:x.graph.nodes[e.a].x)-
         (e.b===0?x.graph.nodes[0].x+1:x.graph.nodes[e.b].x)),
        x.graph.nodes[e.a].y-x.graph.nodes[e.b].y)
    }))
  }}:x);
assert.throws(()=>runTransportBenchmark(wrongGraph,config),/identical marked node positions/);

// Exact propagation ticks from known geometric link lengths: no queue pressure.
const two={nodes:[{id:0,x:10,y:20},{id:1,x:30,y:20}],
  edges:[{id:0,a:0,b:1,length:20}]};
const alloc=allocateWithinWireBudget(two,240,"even-slots");
assert.deepEqual(alloc.edgeCapacities,[12]);
const traffic=engineeringTraffic({nodes:2,ticks:10,arrivalsPerTick:1,seed:369});
const basic={ticks:10,arrivalsPerTick:1,queueLimit:12,
  pixelsPerTick:10,highPriorityPercent:0,seed:369,failure:{kind:"none"}};
const slow=simulateDelayedTransport(two,alloc,basic,"shortest-distance",traffic);
const fast=simulateDelayedTransport(two,alloc,{...basic,pixelsPerTick:20},
  "shortest-distance",traffic);
assert.equal(slow.metrics.generated,10);
assert.equal(slow.metrics.delivered,10);
assert.equal(slow.metrics.dropped,0);
assert.equal(slow.metrics.unfinished,0);
assert.equal(slow.metrics.meanDeliveredLatencyTicks,2);
assert.equal(fast.metrics.meanDeliveredLatencyTicks,1);
assert.equal(slow.scenario.edgePropagationTicks[0],2);
assert.equal(fast.scenario.edgePropagationTicks[0],1);
assert.equal(slow.metrics.priority.high.generated,0);
assert.equal(slow.metrics.priority.standard.delivered,10);
const high=simulateDelayedTransport(two,alloc,{
  ...basic,highPriorityPercent:100},"shortest-distance",traffic);
assert.equal(high.metrics.priority.high.delivered,10);
assert.equal(high.metrics.priority.standard.generated,0);
const interrupted=simulateDelayedTransport(two,alloc,{
  ...basic,failure:{kind:"node",index:1,start:1,duration:3}
},"shortest-distance",traffic);
assert.ok(interrupted.metrics.dropReasons.inflightNodeFailed>=1);
assert.equal(interrupted.metrics.generated,interrupted.metrics.delivered+
  interrupted.metrics.dropped+interrupted.metrics.unfinished);
// Under heavy offered traffic the two classes remain separately auditable.
const crowdedTraffic=engineeringTraffic({
  nodes:2,ticks:20,arrivalsPerTick:6,seed:100
});
const crowded=simulateDelayedTransport(two,
  allocateWithinWireBudget(two,20,"even-slots"),{
    ticks:20,arrivalsPerTick:6,queueLimit:8,pixelsPerTick:10,
    highPriorityPercent:50,seed:100,failure:{kind:"none"}
  },"queue-aware",crowdedTraffic);
assert.equal(crowded.metrics.generated,120);
assert.ok(crowded.metrics.dropReasons.queueOverflow>0);
assert.ok(crowded.metrics.priority.high.generated>0&&
  crowded.metrics.priority.standard.generated>0);
assert.equal(crowded.metrics.generated,crowded.metrics.delivered+
  crowded.metrics.dropped+crowded.metrics.unfinished);
assert.ok(crowded.metrics.inFlightPendingAtEnd>=0);
assert.throws(()=>simulateDelayedTransport(two,alloc,{
  ...basic,pixelsPerTick:121},"shortest-distance",traffic),/Propagation pixels/);
assert.throws(()=>simulateDelayedTransport(two,alloc,basic,"wrong",traffic),
  /routing strategy/);
assert.throws(()=>simulateDelayedTransport(two,alloc,basic,"shortest-distance",{
  ...traffic,seed:370}),/Traffic does not match/);
assert.throws(()=>simulateDelayedTransport(two,{edgeCapacities:[13]},basic,
  "shortest-distance",traffic),/per-edge capacities/);

const html=readFileSync(new URL("../app/leaflab/transport.html",import.meta.url),"utf8");
const ui=readFileSync(new URL("../app/leaflab/transport-ui.mjs",import.meta.url),"utf8");
const leafHome=readFileSync(new URL("../app/leaflab/index.html",import.meta.url),"utf8");
for(const id of ["transportFile","transportTree","transportLoop","transportSeeds",
  "transportTicks","transportArrivals","transportQueue","transportSpeed",
  "transportPriority","transportCost","transportAllocation","transportTraffic",
  "transportHotspot","transportFault","transportNode","transportRun",
  "transportExport","transportChart","transportFigure","transportRows",
  "transportSelectRun","transportDetail"])
  assert.ok(html.includes('id="'+id+'"'),"Missing v1.1 browser control "+id);
assert.match(html,/src="\.\/transport-ui\.mjs"/);
assert.match(ui,/runTransportBenchmark/);
assert.match(ui,/allocateWithinWireBudget/);
assert.match(ui,/priority\.high/);
assert.match(leafHome,/transport\.html/);
assert.ok(!/fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(ui),
  "Browser UI must not transmit specimen annotations");
console.log("PASS LeafLab v1.1: propagation ticks, strict priority class accounting, cost cap, faulted in-flight packets, shared traffic and static UI");
