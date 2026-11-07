import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {makeVeinReference} from "../app/leaflab/vein-benchmark.mjs";
import {graphFromReference,summarizeGraph,failOneLink,
  singleLinkFailureAudit,compareGeometricBaselines,
  networkAtlasReport,demoNetworkReferences} from "../app/leaflab/network-atlas.mjs";

const demo=demoNetworkReferences();
assert.equal(demo.length,2);
assert.ok(demo.every(x=>x.origin==="synthetic-demo"));
assert.deepEqual(demo,demoNetworkReferences(),"Demos must be deterministic");
const tree=graphFromReference(demo[0]);
const loop=graphFromReference(demo[1]);
assert.equal(tree.kind,"leaflab-geometric-line-graph");
assert.equal(tree.version,"0.8");
assert.equal(tree.nodes.length,6);
assert.equal(tree.edges.length,5);
assert.equal(loop.nodes.length,5);
assert.equal(loop.edges.length,6);
const treeMetrics=summarizeGraph(tree),loopMetrics=summarizeGraph(loop);
assert.equal(treeMetrics.cycleRank,0);
assert.equal(loopMetrics.cycleRank,2);
assert.equal(treeMetrics.componentCount,1);
assert.equal(loopMetrics.componentCount,1);
assert.equal(treeMetrics.connectedPairFraction,1);
assert.equal(loopMetrics.connectedPairFraction,1);
assert.equal(treeMetrics.totalImagePixelLinkLength,100);
assert.ok(treeMetrics.geometricalGlobalEfficiency>=0&&treeMetrics.geometricalGlobalEfficiency<=1);
assert.ok(loopMetrics.geometricalGlobalEfficiency>=0&&loopMetrics.geometricalGlobalEfficiency<=1);
const failuresTree=singleLinkFailureAudit(tree);
const failuresLoop=singleLinkFailureAudit(loop);
assert.equal(failuresTree.bridges,5);
assert.equal(failuresLoop.bridges,0);
assert.equal(failuresLoop.worstAfterOneLinkRemoval,1);
assert.ok(failuresTree.worstAfterOneLinkRemoval<1);
assert.equal(failuresTree.outcomes.length,5);
assert.equal(failuresLoop.outcomes.length,6);
assert.ok(failuresTree.averageAfterOneLinkRemoval<failuresLoop.averageAfterOneLinkRemoval);
assert.equal(failOneLink(tree,0).componentCount,2);
assert.throws(()=>failOneLink(tree,99),/Edge index/);
const models=compareGeometricBaselines(loop).models;
assert.deepEqual(models.map(x=>x.name),[
  "annotated-network","euclidean-minimum-spanning-tree","best-centered-euclidean-star"
]);
assert.equal(models[0].metrics.cycleRank,2);
assert.equal(models[1].metrics.cycleRank,0);
assert.equal(models[2].metrics.cycleRank,0);
assert.ok(models[0].metrics.lengthOverMST>=1);
assert.equal(models[1].metrics.lengthOverMST,1);
assert.ok(models[2].metrics.lengthOverMST>=1);
assert.equal(models[1].robustness.bridges,loop.nodes.length-1);
assert.equal(models[2].robustness.bridges,loop.nodes.length-1);
assert.ok(models[0].robustness.averageAfterOneLinkRemoval>
          models[1].robustness.averageAfterOneLinkRemoval,
          "Closed loops can protect logical reachability against one edge failure");
const report=networkAtlasReport(demo[1]);
assert.equal(report.kind,"leaflab-network-atlas-report");
assert.equal(report.version,"0.8");
assert.equal(report.evidenceLevel,"SYNTHETIC_DEMONSTRATION");
assert.equal(report.baselines.length,3);
assert.equal(report.source.imageSHA256,"f".repeat(64));
assert.equal(report.singleLinkFailure.bridges,0);
assert.deepEqual(report,networkAtlasReport(demo[1]));
assert.ok(!JSON.stringify(report).includes('"RGBA"'));
assert.ok(!JSON.stringify(report).includes('"photoData"'));
assert.ok(!JSON.stringify(report).includes('"pixels"'));

// A geometric crossing is not a connection unless explicitly annotated as
// the same node. This prevents false transport connections from visual art.
const ref=paths=>makeVeinReference({
  specimenId:"fixture",plantId:"plantA",annotatorCode:"ObserverOne",
  imageSHA256:"a".repeat(64),width:100,height:100,origin:"synthetic-demo",paths
});
const crossing=graphFromReference(ref([
  [[10,10],[90,90]],[[10,90],[90,10]]
]));
assert.equal(crossing.nodes.length,4);
assert.equal(summarizeGraph(crossing).componentCount,2);
assert.equal(summarizeGraph(crossing).connectedPairFraction,0.333333);
assert.equal(summarizeGraph(crossing).cycleRank,0);
const joined=graphFromReference(ref([
  [[10,10],[50,50],[90,90]],[[10,90],[50,50],[90,10]]
]));
assert.equal(joined.nodes.length,5);
assert.equal(joined.edges.length,4);
assert.equal(summarizeGraph(joined).componentCount,1);
assert.equal(summarizeGraph(joined).cycleRank,0);
assert.equal(singleLinkFailureAudit(joined).bridges,4);
// Explicit cycle network keeps all pairs connected when any one edge breaks.
const square=graphFromReference(ref([
  [[20,20],[80,20],[80,80],[20,80],[20,20]]
]));
assert.equal(square.edges.length,4);
assert.equal(summarizeGraph(square).cycleRank,1);
assert.equal(singleLinkFailureAudit(square).bridges,0);
assert.equal(singleLinkFailureAudit(square).worstAfterOneLinkRemoval,1);
// Disconnected graph is not silently made into a connected real plant graph.
const disconnected=networkAtlasReport(ref([
  [[10,10],[20,20]],[[80,80],[90,90]]
]));
assert.equal(disconnected.metrics.componentCount,2);
assert.equal(disconnected.metrics.cycleRank,0);
assert.ok(disconnected.metrics.connectedPairFraction<1);
assert.equal(disconnected.baselines[1].metrics.componentCount,1,
  "MST is a hypothetical connected baseline, not biological repair");
// Overlong references must be rejected rather than hanging the browser.
const bigPath=Array.from({length:141},(_,i)=>[5+i*.3,20+Math.sin(i/6)]);
assert.throws(()=>graphFromReference(ref([bigPath])),/Maximum 140/);
assert.throws(()=>graphFromReference({...demo[0],kind:"not-leaflab"}),/Expected v0.7/);
assert.throws(()=>graphFromReference({...demo[0],imageSHA256:"malformed"}),/SHA-256/);
// Explicit re-use of identical vertices must not duplicate undirected links.
const repeated=graphFromReference(ref([
  [[10,10],[20,10],[30,10]],
  [[30,10],[20,10],[10,10]]
]));
assert.equal(repeated.nodes.length,3);
assert.equal(repeated.edges.length,2);
assert.equal(summarizeGraph(repeated).cycleRank,0);
assert.equal(singleLinkFailureAudit(repeated).bridges,2);
assert.deepEqual(repeated,graphFromReference(ref([
  [[10,10],[20,10],[30,10]],
  [[30,10],[20,10],[10,10]]
])));
const html=readFileSync(new URL("../app/leaflab/network.html",import.meta.url),"utf8");
const ui=readFileSync(new URL("../app/leaflab/network-ui.mjs",import.meta.url),"utf8");
const home=readFileSync(new URL("../app/leaflab/index.html",import.meta.url),"utf8");
for(const id of ["graphImport","demoTree","demoLoop","networkFigure",
  "exportNetworkReport","resetFailure","selectedFailure",
  "comparisonRows","robustnessSummary","cycleMetric","bridgeMetric"])
  assert.ok(html.includes('id="'+id+'"'),"Missing control "+id);
assert.match(html,/src="\.\/network-ui\.mjs"/);
assert.match(ui,/failOneLink/);
assert.match(ui,/compareGeometricBaselines|networkAtlasReport/);
assert.match(ui,/createElementNS/);
assert.match(home,/network\.html/);
assert.ok(!/fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(ui),
  "Source annotations and graph reports must stay in the browser");
console.log("PASS LeafLab v0.8: explicit junctions, nonconnected crossings, cycle resilience, fixed geometric baselines, source checks and offline atlas UI");
