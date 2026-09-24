import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const stable = x => JSON.stringify(x, null, 2) + "\n";

const graph = readJson("data/graph/cannabiverse_graph_v0.4.json");

const claims = (graph.relationships ?? []).map((e, i) => ({
  claim_id: `CPA-CLM-${String(i + 1).padStart(4, "0")}`,
  claim_type: "RELATIONSHIP_ASSERTION",
  subject_id: e.source_node,
  predicate: e.relation,
  object_id: e.target_node,
  evidence_lane: e.evidence_lane,
  authority: e.confidence,
  status: e.evidence_lane === "biosynthesis_hypothesis" ? "HYPOTHESIS" : "ASSERTED_WITH_SOURCE",
  source_ids: [e.source_id],
  derived_from_edge_id: e.edge_id,
  note: e.note || ""
}));

const sourceNodes = (graph.sources ?? []).map(s => ({
  node_id: s.source_id,
  node_type: "SCIENTIFIC_SOURCE",
  year: s.year,
  authors: s.authors,
  title: s.title,
  doi: s.doi,
  url: s.url,
  atlas_use: s.use
}));

const supportEdges = claims.flatMap(c => c.source_ids.map(sourceId => ({
  edge_id: `CPA-SUP-${c.claim_id.slice(-4)}-${sourceId}`,
  source_node: sourceId,
  relation: "SUPPORTS_CLAIM",
  target_node: c.claim_id,
  evidence_lane: "source_support"
})));

const sourceSummary = (graph.sources ?? []).map(s => {
  const related = claims.filter(c => c.source_ids.includes(s.source_id));
  return {
    source_id: s.source_id,
    year: s.year,
    title: s.title,
    relationship_claim_count: related.length,
    hypothesis_claim_count: related.filter(c => c.status === "HYPOTHESIS").length,
    lanes: [...new Set(related.map(c => c.evidence_lane))].sort()
  };
});

const outputs = new Map([
  ["data/evidence/relationship_claims.json", stable(claims)],
  ["data/evidence/source_nodes.json", stable(sourceNodes)],
  ["data/evidence/source_claim_edges.json", stable(supportEdges)],
  ["data/evidence/source_claim_summary.json", stable(sourceSummary)]
]);

let stale = false;
for (const [relative, expected] of outputs) {
  const absolute = path.join(root, relative);
  if (checkOnly) {
    const current = fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : "";
    if (current !== expected) {
      console.error(`STALE ${relative}`);
      stale = true;
    } else {
      console.log(`PASS  ${relative}`);
    }
  } else {
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, expected);
    console.log(`WROTE ${relative}`);
  }
}

if (stale) {
  console.error("\nEvidence projection is stale. Run: node scripts/build-evidence-graph.mjs");
  process.exit(1);
}
