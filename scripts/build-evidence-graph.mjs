import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const stable = x => JSON.stringify(x, null, 2) + "\n";

const graph = readJson("data/graph/cannabiverse_graph_v0.4.json");

// Relationship claims: exact 1:1 projection of typed chemistry edges.
const relationshipClaims = (graph.relationships ?? []).map((e, i) => ({
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

const relationshipSupportEdges = relationshipClaims.flatMap(c => c.source_ids.map(sourceId => ({
  edge_id: `CPA-SUP-${c.claim_id.slice(-4)}-${sourceId}`,
  source_node: sourceId,
  relation: "SUPPORTS_CLAIM",
  target_node: c.claim_id,
  evidence_lane: "source_support"
})));

const relationshipSourceSummary = (graph.sources ?? []).map(s => {
  const related = relationshipClaims.filter(c => c.source_ids.includes(s.source_id));
  return {
    source_id: s.source_id,
    year: s.year,
    title: s.title,
    relationship_claim_count: related.length,
    hypothesis_claim_count: related.filter(c => c.status === "HYPOTHESIS").length,
    lanes: [...new Set(related.map(c => c.evidence_lane))].sort()
  };
});

// Compound evidence claims: stable IDs derived from permanent compound ID + lane.
const compoundEvidenceClaims = [];
const compoundSupportEdges = [];
for (const c of graph.compounds ?? []) {
  const n = c.atlas_id.slice(-4);
  const identity = {
    claim_id: `CPA-EVC-${n}-I`,
    claim_type: "COMPOUND_EVIDENCE_STATE",
    subject_id: c.atlas_id,
    predicate: "HAS_IDENTITY_EVIDENCE_LEVEL",
    evidence_lane: "identity",
    level: c.identity_level,
    status: "ASSERTED_WITH_SOURCE",
    source_ids: [c.source_id],
    source_year: c.source_year,
    source_url: c.source_url,
    canonical_status: c.canonical_status,
    note: c.curation_note || ""
  };

  const occurrenceCautioned = Boolean(c.occurrence_caution || c.artifact_flag);
  const occurrence = {
    claim_id: `CPA-EVC-${n}-O`,
    claim_type: "COMPOUND_EVIDENCE_STATE",
    subject_id: c.atlas_id,
    predicate: "HAS_OCCURRENCE_EVIDENCE_LEVEL",
    evidence_lane: "occurrence",
    level: c.occurrence_level,
    status: occurrenceCautioned ? "CAUTIONED" : "ASSERTED_WITH_SOURCE",
    source_ids: [c.source_id],
    source_year: c.source_year,
    source_url: c.source_url,
    canonical_status: c.canonical_status,
    note: [c.occurrence_caution, c.artifact_flag].filter(Boolean).join(" ")
  };

  compoundEvidenceClaims.push(identity, occurrence);

  for (const claim of [identity, occurrence]) {
    compoundSupportEdges.push({
      edge_id: `CPA-CSUP-${claim.claim_id.slice(8)}`,
      source_node: c.source_id,
      relation: "SUPPORTS_COMPOUND_EVIDENCE_CLAIM",
      target_node: claim.claim_id,
      evidence_lane: "source_support"
    });
  }
}

const compoundEvidenceSummary = (graph.compounds ?? []).map(c => ({
  atlas_id: c.atlas_id,
  canonical_name: c.canonical_name,
  short_label: c.short_label,
  family: c.family,
  source_id: c.source_id,
  identity_claim_id: `CPA-EVC-${c.atlas_id.slice(-4)}-I`,
  identity_level: c.identity_level,
  occurrence_claim_id: `CPA-EVC-${c.atlas_id.slice(-4)}-O`,
  occurrence_level: c.occurrence_level,
  occurrence_cautioned: Boolean(c.occurrence_caution || c.artifact_flag),
  caution: [c.occurrence_caution, c.artifact_flag].filter(Boolean).join(" ")
}));

const compoundSourceSummary = (graph.sources ?? []).map(s => {
  const related = compoundEvidenceClaims.filter(c => c.source_ids.includes(s.source_id));
  return {
    source_id: s.source_id,
    year: s.year,
    title: s.title,
    compound_evidence_claim_count: related.length,
    identity_claim_count: related.filter(c => c.evidence_lane === "identity").length,
    occurrence_claim_count: related.filter(c => c.evidence_lane === "occurrence").length,
    cautioned_occurrence_claim_count: related.filter(c => c.evidence_lane === "occurrence" && c.status === "CAUTIONED").length
  };
});

const outputs = new Map([
  ["data/evidence/relationship_claims.json", stable(relationshipClaims)],
  ["data/evidence/source_nodes.json", stable(sourceNodes)],
  ["data/evidence/source_claim_edges.json", stable(relationshipSupportEdges)],
  ["data/evidence/source_claim_summary.json", stable(relationshipSourceSummary)],
  ["data/evidence/compound_evidence_claims.json", stable(compoundEvidenceClaims)],
  ["data/evidence/source_compound_claim_edges.json", stable(compoundSupportEdges)],
  ["data/evidence/compound_evidence_summary.json", stable(compoundEvidenceSummary)],
  ["data/evidence/source_compound_claim_summary.json", stable(compoundSourceSummary)]
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
