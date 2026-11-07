import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {demoNetworkReferences,graphFromReference,simulationTopologies}
  from "../app/leaflab/network-atlas.mjs";
import {normalizePacketScenario,createPacketTraffic,simulatePacketRouting,
  comparePacketStrategies,compareReferenceTopologies,ROUTING_MODES}
  from "../app/leaflab/packet-simulator.mjs";

assert.deepEqual(ROUTING_MODES,["shortest-distance","queue-aware","bridge-avoiding"]);
const references=demoNetworkReferences();
const tree=graphFromReference(references[0]),loop=graphFromReference(references[1]);
const controls=simulationTopologies(loop);
assert.deepEqual(controls.map(x=>x.name),[
  "annotated-network","euclidean-minimum-spanning-tree","best-centered-euclidean-star"
]);
assert.ok(controls.every(x=>x.graph.nodes.length===loop.nodes.length));
const scenario={
  ticks:35,arrivalsPerTick:3,edgeCapacity:3,queueLimit:25,seed:369,
  failure:{kind:"node",index:0,start:12,duration:10}
};
const packetTraffic=createPacketTraffic({nodes:loop.nodes.length,
  ticks:scenario.ticks,arrivalsPerTick:scenario.arrivalsPerTick,seed:scenario.seed});
assert.equal(packetTraffic.schedule.length,scenario.ticks);
assert.ok(packetTraffic.schedule.every(step=>step.length===scenario.arrivalsPerTick));
assert.ok(packetTraffic.schedule.flat().every(p=>p.from!==p.to&&
  p.from>=0&&p.to>=0&&p.from<loop.nodes.length&&p.to<loop.nodes.length));
assert.deepEqual(packetTraffic,createPacketTraffic({nodes:loop.nodes.length,
  ticks:scenario.ticks,arrivalsPerTick:scenario.arrivalsPerTick,seed:scenario.seed}));
assert.notEqual(packetTraffic.trafficFingerprint,createPacketTraffic({
  nodes:loop.nodes.length,ticks:scenario.ticks,arrivalsPerTick:scenario.arrivalsPerTick,
  seed:370}).trafficFingerprint);
const bench=compareReferenceTopologies(loop,scenario);
assert.equal(bench.kind,"leaflab-packet-routing-benchmark");
assert.equal(bench.status,"SYNTHETIC_DIGITAL_PACKET_EXPERIMENT_ONLY");
assert.equal(bench.runCount,9);
assert.deepEqual(bench,compareReferenceTopologies(loop,scenario),
  "Full 3×3 comparison must be reproducible");
assert.ok(bench.runs.every(r=>r.metrics.generated===scenario.ticks*scenario.arrivalsPerTick));
assert.ok(bench.runs.every(r=>r.metrics.conservationChecked&&
  r.metrics.generated===r.metrics.delivered+r.metrics.dropped+r.metrics.unfinished));
assert.ok(bench.runs.every(r=>r.metrics.deliveryRatio>=0&&r.metrics.deliveryRatio<=1));
assert.ok(bench.runs.every(r=>r.metrics.dropRatio>=0&&r.metrics.dropRatio<=1));
assert.ok(bench.runs.every(r=>r.metrics.peakNodeQueue<=scenario.queueLimit));
assert.ok(bench.runs.every(r=>r.metrics.meanDeliveredHops===null||
  r.metrics.meanDeliveredHops>=1));
assert.equal(new Set(bench.runs.map(r=>r.topology)).size,3);
assert.equal(new Set(bench.runs.map(r=>r.mode)).size,3);
assert.ok(bench.runs.every(r=>r.timeline.length>=scenario.ticks));
assert.equal(bench.trafficFingerprint,packetTraffic.trafficFingerprint);
assert.equal(bench.scenario.failure.kind,"node");

const simple={
  nodes:[{id:0,x:10,y:10},{id:1,x:20,y:10},{id:2,x:30,y:10}],
  edges:[{id:0,a:0,b:1,length:10},{id:1,a:1,b:2,length:10}]
};
const unlimited={ticks:20,arrivalsPerTick:2,edgeCapacity:12,
  queueLimit:100,seed:111,failure:{kind:"none"}};
const clean=simulatePacketRouting(simple,unlimited);
assert.equal(clean.metrics.generated,40);
assert.equal(clean.metrics.delivered,40);
assert.equal(clean.metrics.dropped,0);
assert.equal(clean.metrics.unfinished,0);
assert.equal(clean.metrics.deliveryRatio,1);
assert.ok(clean.metrics.meanDeliveredLatencyTicks>=1);
assert.equal(clean.metrics.meanDeliveredHops,clean.metrics.meanDeliveredLatencyTicks,
  "With no queues and one hop per tick, delivered hop and tick counts match");
const closed=simulatePacketRouting(simple,{
  ...unlimited,failure:{kind:"link",index:1,start:0,duration:20}
});
assert.ok(closed.metrics.dropped>0,"A bridge failure must cause unreachable packets");
assert.ok(closed.metrics.dropReasons.unreachable>0);
assert.ok(closed.metrics.delivered<clean.metrics.delivered);
const capacityLow={ticks:20,arrivalsPerTick:12,edgeCapacity:1,queueLimit:4,seed:11};
const narrow={
  nodes:[{id:0,x:10,y:10},{id:1,x:20,y:10}],
  edges:[{id:0,a:0,b:1,length:10}]
};
const overloaded=simulatePacketRouting(narrow,capacityLow);
assert.equal(overloaded.metrics.generated,240);
assert.ok(overloaded.metrics.dropReasons.queueOverflow>0,
  "Overload must be counted as packet loss, not silently clipped");
assert.ok(overloaded.metrics.peakNodeQueue<=4);
assert.equal(overloaded.metrics.generated,
  overloaded.metrics.delivered+overloaded.metrics.dropped+overloaded.metrics.unfinished);
assert.equal(overloaded.metrics.meanDeliveredHops,1,
  "Mean hops must exclude forwarded packets that never arrive");
assert.ok(overloaded.metrics.p95DeliveredLatencyTicks>=overloaded.metrics.meanDeliveredLatencyTicks);
// On a square all node pairs remain connected under any one edge failure;
// a tree bridge cannot preserve that connectivity.
const square={
  nodes:[{id:0,x:10,y:10},{id:1,x:30,y:10},
    {id:2,x:30,y:30},{id:3,x:10,y:30}],
  edges:[{id:0,a:0,b:1,length:20},{id:1,a:1,b:2,length:20},
    {id:2,a:2,b:3,length:20},{id:3,a:0,b:3,length:20}]
};
const squareOutage=simulatePacketRouting(square,{
  ticks:30,arrivalsPerTick:1,edgeCapacity:10,queueLimit:30,seed:77,
  failure:{kind:"link",index:0,start:0,duration:30}
});
assert.equal(squareOutage.metrics.generated,30);
assert.equal(squareOutage.metrics.dropped,0,
  "Loop provides a physical path within the abstract link graph during a single edge outage");
assert.equal(squareOutage.metrics.delivered,30);
assert.throws(()=>comparePacketStrategies(controls,{
  ...scenario,failure:{kind:"link",index:0,start:5,duration:5}
}),/cannot be compared across different topologies/);
const linkRuns=comparePacketStrategies([controls[0]],{
  ...scenario,failure:{kind:"link",index:0,start:5,duration:5}
});
assert.equal(linkRuns.runCount,3);
assert.ok(linkRuns.runs.every(r=>r.mode&&r.topology==="annotated-network"));
assert.throws(()=>simulatePacketRouting(simple,unlimited,"unknown"),/routing strategy/);
assert.throws(()=>normalizePacketScenario({...unlimited,seed:-1},3,2),/Traffic seed/);
assert.throws(()=>normalizePacketScenario({...unlimited,ticks:151},3,2),/Traffic ticks/);
assert.throws(()=>normalizePacketScenario({...unlimited,edgeCapacity:0},3,2),/Packets per link/);
assert.throws(()=>normalizePacketScenario({...unlimited,failure:{
  kind:"node",index:3,start:0,duration:5}},3,2),/Failure index/);
assert.throws(()=>normalizePacketScenario({...unlimited,failure:{
  kind:"link",index:0,start:19,duration:2}},3,2),/Failure duration/);
assert.throws(()=>simulatePacketRouting({...simple,edges:[
  {...simple.edges[0],length:123},simple.edges[1]]},unlimited),/match geometry/);
assert.throws(()=>simulatePacketRouting({...simple,edges:[
  simple.edges[0],{...simple.edges[0],id:1}]},unlimited),/Duplicate graph link/);
assert.throws(()=>comparePacketStrategies([
  {name:"same",graph:simple},{name:"same",graph:simple}
],unlimited),/Duplicate topology/);
assert.throws(()=>comparePacketStrategies([
  {name:"line",graph:simple},
  {name:"wrong-coordinates",graph:{...simple,nodes:[
    simple.nodes[0],{id:1,x:22,y:10},simple.nodes[2]
  ],edges:[]}}
],unlimited),/identical node IDs and positions/);
// Imported graph scale guard prevents creating an enormous stress simulator.
const oversize={
  nodes:Array.from({length:81},(_,i)=>({id:i,x:i,y:0})),
  edges:[]
};
assert.throws(()=>simulatePacketRouting(oversize,unlimited),/2–80 nodes/);
const wrongTraffic={...packetTraffic,nodes:99};
assert.throws(()=>simulatePacketRouting(loop,scenario,"shortest-distance",wrongTraffic),
  /Traffic schedule does not match/);

const html=readFileSync(new URL("../app/leaflab/packets.html",import.meta.url),"utf8");
const ui=readFileSync(new URL("../app/leaflab/packet-ui.mjs",import.meta.url),"utf8");
const leafHome=readFileSync(new URL("../app/leaflab/index.html",import.meta.url),"utf8");
for(const id of ["simImport","simTree","simLoop","simTicks","simArrival",
  "simCapacity","simQueue","simSeed","simFailure","simTopology",
  "simFailureIndex","simStart","simDuration","simRun","simExport",
  "simRows","simSelectRun","timeline","simGraph","simDetail"]){
  assert.ok(html.includes('id="'+id+'"'),"Missing packet UI control "+id);
}
assert.match(html,/src="\.\/packet-ui\.mjs"/);
assert.match(ui,/comparePacketStrategies/);
assert.match(ui,/trafficFingerprint/);
assert.match(ui,/drawTimeline/);
assert.match(leafHome,/packets\.html/);
assert.ok(!/fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(ui),
  "Private source files and simulated traffic remain offline");
console.log("PASS LeafLab v0.9: same-seed packet routing, queue limits, drop accounting, node/link failures, cyclic resilience, topology fairness and browser UI");
