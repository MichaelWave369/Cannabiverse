import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {demoNetworkReferences,graphFromReference,simulationTopologies}
  from "../app/leaflab/network-atlas.mjs";
import {simulatePacketRouting} from "../app/leaflab/packet-simulator.mjs";
import {allocateSlotBudget,feasibleSlotBudget,engineeringTraffic,
  normalizeEngineeringExperiment,runEngineeringExperiment,compareEngineeringReference,
  TRAFFIC_SHAPES,CAPACITY_POLICIES}
  from "../app/leaflab/network-engineering.mjs";

assert.deepEqual(TRAFFIC_SHAPES,["uniform-pairs","hub-hotspot"]);
assert.deepEqual(CAPACITY_POLICIES,["even-slots","short-link-first"]);
const tree=graphFromReference(demoNetworkReferences()[0]);
const loop=graphFromReference(demoNetworkReferences()[1]);
const layouts=simulationTopologies(loop),feasible=feasibleSlotBudget(layouts);
assert.deepEqual(feasible,{minimum:6,maximum:48,linkCounts:[6,4,4]});
const even=allocateSlotBudget(loop,12,"even-slots");
const compact=allocateSlotBudget(loop,12,"short-link-first");
assert.equal(even.installedSlots,12);
assert.equal(compact.installedSlots,12);
assert.equal(even.edgeCapacities.reduce((a,b)=>a+b,0),12);
assert.equal(compact.edgeCapacities.reduce((a,b)=>a+b,0),12);
assert.ok(even.edgeCapacities.every(c=>c>=1&&c<=12));
assert.ok(compact.edgeCapacities.every(c=>c>=1&&c<=12));
assert.notDeepEqual(even.edgeCapacities,compact.edgeCapacities);
assert.ok(compact.capacityWeightedWireCost<even.capacityWeightedWireCost,
  "Short link concentration must reduce length-weighted material proxy");
assert.deepEqual(even,allocateSlotBudget(loop,12,"even-slots"));
assert.throws(()=>allocateSlotBudget(loop,5),/Link-slot budget/);
assert.throws(()=>allocateSlotBudget(loop,73),/Link-slot budget/);
assert.throws(()=>allocateSlotBudget(loop,12,"not-a-policy"),/Unknown capacity/);
assert.throws(()=>feasibleSlotBudget([]),/1–3 graph/);

const a=engineeringTraffic({nodes:5,ticks:30,arrivalsPerTick:4,seed:369,
  shape:"uniform-pairs"});
const b=engineeringTraffic({nodes:5,ticks:30,arrivalsPerTick:4,seed:369,
  shape:"hub-hotspot",hotspotNode:0});
assert.deepEqual(a,engineeringTraffic({nodes:5,ticks:30,
  arrivalsPerTick:4,seed:369,shape:"uniform-pairs"}));
assert.deepEqual(b,engineeringTraffic({nodes:5,ticks:30,
  arrivalsPerTick:4,seed:369,shape:"hub-hotspot",hotspotNode:0}));
assert.notEqual(a.trafficFingerprint,b.trafficFingerprint);
assert.equal(a.schedule.length,30);
assert.equal(b.schedule.length,30);
assert.ok(b.schedule.flat().every(x=>x.from!==x.to));
assert.ok(b.schedule.flat().filter(x=>x.from===0||x.to===0).length>=60);
assert.throws(()=>engineeringTraffic({nodes:5,ticks:30,arrivalsPerTick:4,seed:369,
  shape:"wrong"}),/Unknown traffic shape/);
assert.throws(()=>engineeringTraffic({nodes:5,ticks:30,arrivalsPerTick:4,seed:369,
  shape:"hub-hotspot",hotspotNode:5}),/Hotspot node/);

const experiment={
  seeds:3,seedBase:369,slotBudget:12,capacityPolicy:"even-slots",
  trafficShape:"uniform-pairs",ticks:35,arrivalsPerTick:3,queueLimit:25,
  failure:{kind:"node",index:0,start:12,duration:10}
};
const norm=normalizeEngineeringExperiment(layouts,experiment);
assert.equal(norm.seeds,3);
assert.equal(norm.slotBudget,12);
const report=compareEngineeringReference(loop,experiment);
assert.equal(report.kind,"leaflab-network-engineering-experiment");
assert.equal(report.version,"1.0");
assert.equal(report.status,"SYNTHETIC_DIGITAL_PACKETS_NO_BIOLOGICAL_VALIDATION");
assert.equal(report.runCount,27);
assert.equal(report.trafficFingerprints.length,3);
assert.equal(new Set(report.trafficFingerprints.map(x=>x.fingerprint)).size,3);
assert.equal(report.summaries.length,9);
assert.equal(report.topologyCosts.length,3);
assert.deepEqual(report,compareEngineeringReference(loop,experiment),
  "Full run must reproduce across repeated identical seeds");
for(const run of report.runs){
  assert.equal(run.metrics.generated,105);
  assert.equal(run.metrics.generated,run.metrics.delivered+
    run.metrics.dropped+run.metrics.unfinished);
  assert.equal(run.metrics.installedLinkSlots,12);
  assert.ok(run.metrics.conservationChecked);
  assert.ok(run.metrics.deliveryRatio>=0&&run.metrics.deliveryRatio<=1);
  assert.ok(run.metrics.dropRatio>=0&&run.metrics.dropRatio<=1);
  assert.ok(run.timeline.length>=35);
  assert.equal(run.trafficFingerprint,
    report.trafficFingerprints.find(x=>x.seed===run.seed).fingerprint);
  assert.equal(run.metrics.peakNodeQueue<=25,true);
}
assert.deepEqual(new Set(report.runs.map(x=>x.seed)).size,3);
assert.ok(report.summaries.every(s=>s.seeds===3&&
  s.allocation.installedSlots===12));
assert.ok(report.summaries.every(s=>s.metrics.deliveryRatio.mean>=0&&
  s.metrics.deliveryRatio.mean<=1));
assert.ok(report.summaries.every(s=>s.metrics.deliveryRatio.populationSD>=0));
assert.ok(report.summaries.every(s=>
  s.deliveredPerTickPerCapacityWireCost>=0));
assert.ok(new Set(report.topologyCosts.map(x=>x.capacityWeightedWireCost)).size>=2,
  "Equal link slots do not imply equal physical-length costs");
const hot=compareEngineeringReference(loop,{...experiment,seeds:2,
  trafficShape:"hub-hotspot",hotspotNode:2,capacityPolicy:"short-link-first"});
assert.equal(hot.runCount,18);
assert.notEqual(hot.trafficFingerprints[0].fingerprint,
  report.trafficFingerprints[0].fingerprint);
assert.ok(hot.topologyCosts.every(x=>x.installedSlots===12));
assert.ok(hot.runs.every(r=>r.metrics.conservationChecked));
assert.ok(hot.runs.every(r=>r.metrics.installedLinkSlots===12));
assert.equal(hot.experiment.capacityPolicy,"short-link-first");
assert.throws(()=>normalizeEngineeringExperiment(layouts,
  {...experiment,seeds:6}),/Independent seeds/);
assert.throws(()=>normalizeEngineeringExperiment(layouts,
  {...experiment,slotBudget:2}),/Equal per-topology/);
assert.throws(()=>normalizeEngineeringExperiment(layouts,
  {...experiment,failure:{kind:"link",index:0,start:2,duration:5}}),
  /not comparable across topologies/);
assert.throws(()=>normalizeEngineeringExperiment(layouts,
  {...experiment,arrivalsPerTick:12}),/bounded at 90 ticks/);
assert.throws(()=>normalizeEngineeringExperiment(layouts,
  {...experiment,capacityPolicy:"invalid"}),/Unknown link capacity/);
assert.throws(()=>normalizeEngineeringExperiment(layouts,
  {...experiment,trafficShape:"invalid"}),/Unknown traffic shape/);
// Identical node IDs and coordinates are a hard prerequisite.
const changed=layouts.map((x,i)=>{
  if(i!==1)return x;
  const nodes=[{...x.graph.nodes[0],x:x.graph.nodes[0].x+1},
    ...x.graph.nodes.slice(1)];
  const edges=x.graph.edges.map(e=>({...e,
    length:Math.hypot(nodes[e.a].x-nodes[e.b].x,
      nodes[e.a].y-nodes[e.b].y)
  }));
  return {...x,graph:{nodes,edges}};
});
assert.throws(()=>runEngineeringExperiment(changed,experiment),
  /identical node positions/);
// Demonstrate heterogeneous installed capacities materially affect delivered
// traffic and preserve the packet-conservation invariant.
const two={
  nodes:[{id:0,x:0,y:0},{id:1,x:10,y:0}],
  edges:[{id:0,a:0,b:1,length:10}]
};
const demand={ticks:20,arrivalsPerTick:12,queueLimit:6,edgeCapacity:1,seed:50};
const slow=simulatePacketRouting(two,{...demand,edgeCapacities:[1]});
const fast=simulatePacketRouting(two,{...demand,edgeCapacities:[12]});
assert.ok(fast.metrics.delivered>slow.metrics.delivered,
  "High-capacity link must deliver more offered load");
assert.equal(slow.metrics.installedLinkSlots,1);
assert.equal(fast.metrics.installedLinkSlots,12);
assert.equal(slow.metrics.installedCapacityWireCost,10);
assert.equal(fast.metrics.installedCapacityWireCost,120);
assert.deepEqual(slow.perLinkCapacities,[1]);
assert.deepEqual(fast.perLinkCapacities,[12]);
assert.ok(slow.metrics.dropReasons.queueOverflow>0);
assert.equal(slow.metrics.generated,
  slow.metrics.delivered+slow.metrics.dropped+slow.metrics.unfinished);
assert.equal(fast.metrics.generated,
  fast.metrics.delivered+fast.metrics.dropped+fast.metrics.unfinished);
assert.throws(()=>simulatePacketRouting(two,{...demand,edgeCapacities:[0]}),
  /Explicit link capacities/);
assert.throws(()=>simulatePacketRouting(two,{...demand,edgeCapacities:[]}),
  /Explicit link capacities/);
assert.throws(()=>simulatePacketRouting(two,{...demand,edgeCapacities:[13]}),
  /Explicit link capacities/);
// Guard against unbounded repeated runs on oversized graphs.
const large={
  nodes:Array.from({length:80},(_,i)=>({id:i,x:i,y:0})),
  edges:Array.from({length:79},(_,i)=>({id:i,a:i,b:i+1,length:1}))
};
assert.throws(()=>normalizeEngineeringExperiment([
  {name:"large",graph:large}],{
  seeds:5,ticks:90,arrivalsPerTick:8,slotBudget:160,
  failure:{kind:"none"}
}),/browser-compute safety budget/);
const html=readFileSync(new URL("../app/leaflab/engineering.html",import.meta.url),"utf8");
const js=readFileSync(new URL("../app/leaflab/engineering-ui.mjs",import.meta.url),"utf8");
const home=readFileSync(new URL("../app/leaflab/index.html",import.meta.url),"utf8");
for(const id of ["engFile","engDemoTree","engDemoLoop","engSeeds",
  "engSeedBase","engTicks","engArrivals","engQueue","engSlots",
  "engAllocation","engTraffic","engHotspot","engFault","engFailedNode",
  "engFaultStart","engFaultDuration","engRun","engExport",
  "engRows","engChart","engGraph","engSelectRun","engRunDetail"])
  assert.ok(html.includes('id="'+id+'"'),"Missing browser UI "+id);
assert.match(html,/src="\.\/engineering-ui\.mjs"/);
assert.match(js,/runEngineeringExperiment/);
assert.match(js,/drawChart/);
assert.match(js,/installedSlots/);
assert.match(home,/engineering\.html/);
assert.ok(!/fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(js),
  "No user image or local annotation is transmitted");
console.log("PASS LeafLab v1.0: equal-slot capacity budgets, hotspots, multi-seed comparability, cost proxies, packet conservation, stress guards and offline UI");
