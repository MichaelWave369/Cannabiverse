import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const fail = msg => { throw new Error(msg); };
const pass = msg => console.log(`PASS  ${msg}`);

const graph = readJson("data/graph/cannabiverse_graph_v0.4.json");
const compounds = graph.compounds ?? [];
const aliases = graph.aliases ?? [];
const edges = graph.relationships ?? [];
const sources = graph.sources ?? [];
const provisional = graph.provisional_candidates ?? [];
const processNodes = graph.process_nodes ?? [];

const claims = readJson("data/evidence/relationship_claims.json");
const sourceNodes = readJson("data/evidence/source_nodes.json");
const supportEdges = readJson("data/evidence/source_claim_edges.json");
const sourceSummary = readJson("data/evidence/source_claim_summary.json");

const sourceIds = new Set(sources.map(s => s.source_id));
const compoundIds = new Set(compounds.map(c => c.atlas_id));
const processIds = new Set(processNodes.map(n => n.node_id));
const claimIds = new Set(claims.map(c => c.claim_id));

if (compoundIds.size !== compounds.length) fail("duplicate canonical atlas_id");
pass("all canonical Atlas IDs are unique");

if (!compounds.every(c => /^CPA-CAN-\d{4}$/.test(c.atlas_id))) fail("invalid canonical ID format");
pass("canonical IDs use CPA-CAN-#### format");

const baseline = compounds.filter(c => c.canonical_status === "BASELINE_2021_LOCKED");
if (baseline.length !== 125) fail(`baseline count changed: ${baseline.length}`);
const baselineIds = baseline.map(c => Number(c.baseline_id)).sort((a,b)=>a-b);
if (baselineIds.some((v,i)=>v !== i+1)) fail("baseline IDs are not exactly 1..125");
pass("Radwan-125 historical baseline is complete and immutable in count/numbering");

if (compounds.length !== graph.metadata.canonical_compound_count) fail("metadata canonical count mismatch");
if (edges.length !== graph.metadata.relationship_edge_count) fail("metadata edge count mismatch");
if (provisional.length !== graph.metadata.provisional_candidate_count) fail("metadata provisional count mismatch");
pass("metadata counts agree with graph arrays");

for (const c of compounds) {
  if (!sourceIds.has(c.source_id)) fail(`compound ${c.atlas_id} references missing source ${c.source_id}`);
  if (!/^I[0-4](?:_|$)/.test(c.identity_level)) fail(`bad identity level on ${c.atlas_id}: ${c.identity_level}`);
  if (!/^O[0-4](?:_|$)/.test(c.occurrence_level)) fail(`bad occurrence level on ${c.atlas_id}: ${c.occurrence_level}`);
  if (!/^B[0-3](?:_|$)/.test(c.biosynthesis_level)) fail(`bad biosynthesis level on ${c.atlas_id}: ${c.biosynthesis_level}`);
}
pass("canonical provenance and evidence vocabularies resolve");

for (const a of aliases) {
  if (!compoundIds.has(a.atlas_id)) fail(`alias points to missing compound ${a.atlas_id}`);
}
pass("all aliases resolve to canonical compounds");

for (const p of provisional) {
  if (!/^CPA-PROV-\d{4}$/.test(p.candidate_id)) fail(`bad provisional ID ${p.candidate_id}`);
  if (compoundIds.has(p.candidate_id)) fail(`provisional ID overlaps canon ${p.candidate_id}`);
  if (!sourceIds.has(p.source_id)) fail(`provisional ${p.candidate_id} references missing source`);
}
pass("provisional namespace is separate and source-resolved");

const allowedLanes = new Set(["biosynthesis","transformation","structure","biosynthesis_hypothesis"]);
for (const e of edges) {
  if (!allowedLanes.has(e.evidence_lane)) fail(`unknown edge lane ${e.edge_id}: ${e.evidence_lane}`);
  const sourceNodeOkay = compoundIds.has(e.source_node) || processIds.has(e.source_node);
  const targetNodeOkay = compoundIds.has(e.target_node) || processIds.has(e.target_node);
  if (!sourceNodeOkay) fail(`edge ${e.edge_id} missing source node ${e.source_node}`);
  if (!targetNodeOkay) fail(`edge ${e.edge_id} missing target node ${e.target_node}`);
  if (!sourceIds.has(e.source_id)) fail(`edge ${e.edge_id} references missing scientific source ${e.source_id}`);

  const hypothesisSignal =
    e.evidence_lane.includes("hypothesis") ||
    String(e.confidence).includes("HYPOTHESIS") ||
    String(e.relation).startsWith("POSSIBLE_") ||
    String(e.relation).startsWith("PROPOSED_");

  if (hypothesisSignal && e.evidence_lane !== "biosynthesis_hypothesis") {
    fail(`hypothesis edge ${e.edge_id} is not kept in biosynthesis_hypothesis lane`);
  }
}
pass("all graph endpoints and edge sources resolve");
pass("hypothesis relationships remain explicitly typed as hypotheses");

// v0.2 claim/source projection checks.
if (claims.length !== edges.length) fail(`claim/edge cardinality mismatch: ${claims.length} claims vs ${edges.length} edges`);
if (claimIds.size !== claims.length) fail("duplicate claim IDs");

const edgeById = new Map(edges.map(e => [e.edge_id, e]));
for (const c of claims) {
  if (!/^CPA-CLM-\d{4}$/.test(c.claim_id)) fail(`invalid claim ID ${c.claim_id}`);
  const e = edgeById.get(c.derived_from_edge_id);
  if (!e) fail(`claim ${c.claim_id} references missing edge ${c.derived_from_edge_id}`);
  if (c.subject_id !== e.source_node) fail(`claim ${c.claim_id} subject drift`);
  if (c.predicate !== e.relation) fail(`claim ${c.claim_id} predicate drift`);
  if (c.object_id !== e.target_node) fail(`claim ${c.claim_id} object drift`);
  if (c.evidence_lane !== e.evidence_lane) fail(`claim ${c.claim_id} lane drift`);
  if (c.authority !== e.confidence) fail(`claim ${c.claim_id} authority drift`);
  if (c.source_ids.length !== 1 || c.source_ids[0] !== e.source_id) fail(`claim ${c.claim_id} source drift`);
  const expectedStatus = e.evidence_lane === "biosynthesis_hypothesis" ? "HYPOTHESIS" : "ASSERTED_WITH_SOURCE";
  if (c.status !== expectedStatus) fail(`claim ${c.claim_id} status drift`);
}
pass("every chemistry edge has an exact deterministic claim receipt");

if (sourceNodes.length !== sources.length) fail("source-node/source-register cardinality mismatch");
for (const n of sourceNodes) {
  if (!sourceIds.has(n.node_id)) fail(`source node ${n.node_id} does not resolve`);
}
pass("all registered scientific sources are first-class source nodes");

if (supportEdges.length !== claims.length) fail("source-support edge count must equal relationship-claim count");
for (const e of supportEdges) {
  if (!sourceIds.has(e.source_node)) fail(`support edge has missing source ${e.source_node}`);
  if (!claimIds.has(e.target_node)) fail(`support edge has missing claim ${e.target_node}`);
  if (e.relation !== "SUPPORTS_CLAIM" || e.evidence_lane !== "source_support") fail(`invalid support-edge semantics ${e.edge_id}`);
}
pass("source → claim provenance graph is complete");

if (sourceSummary.length !== sources.length) fail("source summary does not cover all sources");
const summarizedClaims = sourceSummary.reduce((n,s)=>n + Number(s.relationship_claim_count||0),0);
if (summarizedClaims !== claims.length) fail("source summary claim total mismatch");
pass("source claim summary reconciles to the claim ledger");

// Verify the diff-friendly split canon reconstructs the embedded full graph.
const canonDir = path.join(root, "data", "canon");
const compoundFiles = fs.readdirSync(canonDir).filter(n => /^compounds-\d{3}-\d{3}\.json$/.test(n)).sort();
const aliasFiles = fs.readdirSync(canonDir).filter(n => /^aliases-\d{3}-\d{3}\.json$/.test(n)).sort();
const splitCompounds = compoundFiles.flatMap(n => readJson(path.join("data","canon",n)));
const splitAliases = aliasFiles.flatMap(n => readJson(path.join("data","canon",n)));

if (JSON.stringify(splitCompounds) !== JSON.stringify(compounds)) fail("split compound canon does not reproduce graph compounds");
if (JSON.stringify(splitAliases) !== JSON.stringify(aliases)) fail("split aliases do not reproduce graph aliases");
pass("diff-friendly canon chunks reproduce the full graph exactly");

console.log("");
console.log(`VALID  Cannabiverse: ${compounds.length} compounds, ${aliases.length} aliases, ${edges.length} chemistry edges, ${claims.length} claim receipts, ${sources.length} source nodes, ${provisional.length} provisional/search-target records.`);
