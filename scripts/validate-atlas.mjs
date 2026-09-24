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

const relationshipClaims = readJson("data/evidence/relationship_claims.json");
const sourceNodes = readJson("data/evidence/source_nodes.json");
const relationshipSupportEdges = readJson("data/evidence/source_claim_edges.json");
const relationshipSourceSummary = readJson("data/evidence/source_claim_summary.json");

const compoundClaims = readJson("data/evidence/compound_evidence_claims.json");
const compoundSupportEdges = readJson("data/evidence/source_compound_claim_edges.json");
const compoundEvidenceSummary = readJson("data/evidence/compound_evidence_summary.json");
const compoundSourceSummary = readJson("data/evidence/source_compound_claim_summary.json");

const sourceIds = new Set(sources.map(s => s.source_id));
const compoundIds = new Set(compounds.map(c => c.atlas_id));
const processIds = new Set(processNodes.map(n => n.node_id));
const relationshipClaimIds = new Set(relationshipClaims.map(c => c.claim_id));
const compoundClaimIds = new Set(compoundClaims.map(c => c.claim_id));

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

// Relationship claim projection.
if (relationshipClaims.length !== edges.length) fail("relationship claim/edge cardinality mismatch");
if (relationshipClaimIds.size !== relationshipClaims.length) fail("duplicate relationship claim IDs");
const edgeById = new Map(edges.map(e => [e.edge_id, e]));

for (const c of relationshipClaims) {
  const e = edgeById.get(c.derived_from_edge_id);
  if (!e) fail(`relationship claim ${c.claim_id} references missing edge`);
  if (c.subject_id !== e.source_node || c.predicate !== e.relation || c.object_id !== e.target_node) fail(`relationship claim ${c.claim_id} topology drift`);
  if (c.evidence_lane !== e.evidence_lane || c.authority !== e.confidence) fail(`relationship claim ${c.claim_id} authority drift`);
  if (c.source_ids.length !== 1 || c.source_ids[0] !== e.source_id) fail(`relationship claim ${c.claim_id} source drift`);
  const expectedStatus = e.evidence_lane === "biosynthesis_hypothesis" ? "HYPOTHESIS" : "ASSERTED_WITH_SOURCE";
  if (c.status !== expectedStatus) fail(`relationship claim ${c.claim_id} status drift`);
}
pass("every chemistry edge has an exact deterministic claim receipt");

if (sourceNodes.length !== sources.length) fail("source-node/source-register cardinality mismatch");
for (const n of sourceNodes) if (!sourceIds.has(n.node_id)) fail(`source node ${n.node_id} does not resolve`);
pass("all registered scientific sources are first-class source nodes");

if (relationshipSupportEdges.length !== relationshipClaims.length) fail("relationship source-support edge count mismatch");
for (const e of relationshipSupportEdges) {
  if (!sourceIds.has(e.source_node) || !relationshipClaimIds.has(e.target_node)) fail(`bad relationship support edge ${e.edge_id}`);
  if (e.relation !== "SUPPORTS_CLAIM" || e.evidence_lane !== "source_support") fail(`invalid relationship support semantics ${e.edge_id}`);
}
pass("source → relationship-claim provenance graph is complete");

if (relationshipSourceSummary.reduce((n,s)=>n + Number(s.relationship_claim_count||0),0) !== relationshipClaims.length) fail("relationship source summary mismatch");
pass("relationship source summary reconciles");

// Compound evidence projection.
if (compoundClaims.length !== compounds.length * 2) fail(`expected ${compounds.length*2} compound evidence claims, found ${compoundClaims.length}`);
if (compoundClaimIds.size !== compoundClaims.length) fail("duplicate compound evidence claim IDs");

const compoundById = new Map(compounds.map(c => [c.atlas_id, c]));
const claimsByCompound = new Map();
for (const claim of compoundClaims) {
  if (!/^CPA-EVC-\d{4}-(I|O)$/.test(claim.claim_id)) fail(`invalid compound evidence claim ID ${claim.claim_id}`);
  const c = compoundById.get(claim.subject_id);
  if (!c) fail(`compound evidence claim ${claim.claim_id} references missing compound`);
  if (claim.source_ids.length !== 1 || claim.source_ids[0] !== c.source_id) fail(`compound claim ${claim.claim_id} source drift`);
  if (claim.source_year !== c.source_year || claim.source_url !== c.source_url) fail(`compound claim ${claim.claim_id} source metadata drift`);
  if (claim.canonical_status !== c.canonical_status) fail(`compound claim ${claim.claim_id} canonical-status drift`);

  const expectedId = `CPA-EVC-${c.atlas_id.slice(-4)}-${claim.evidence_lane === "identity" ? "I" : "O"}`;
  if (claim.claim_id !== expectedId) fail(`compound claim ${claim.claim_id} unstable ID mapping`);

  if (claim.evidence_lane === "identity") {
    if (claim.predicate !== "HAS_IDENTITY_EVIDENCE_LEVEL" || claim.level !== c.identity_level) fail(`identity claim drift on ${c.atlas_id}`);
    if (claim.status !== "ASSERTED_WITH_SOURCE") fail(`identity claim ${claim.claim_id} has invalid status`);
  } else if (claim.evidence_lane === "occurrence") {
    if (claim.predicate !== "HAS_OCCURRENCE_EVIDENCE_LEVEL" || claim.level !== c.occurrence_level) fail(`occurrence claim drift on ${c.atlas_id}`);
    const expectedStatus = (c.occurrence_caution || c.artifact_flag) ? "CAUTIONED" : "ASSERTED_WITH_SOURCE";
    if (claim.status !== expectedStatus) fail(`occurrence claim ${claim.claim_id} caution status drift`);
  } else {
    fail(`unexpected compound evidence lane ${claim.evidence_lane}`);
  }

  const list = claimsByCompound.get(c.atlas_id) ?? [];
  list.push(claim);
  claimsByCompound.set(c.atlas_id, list);
}

for (const c of compounds) {
  const list = claimsByCompound.get(c.atlas_id) ?? [];
  if (list.length !== 2) fail(`${c.atlas_id} must have exactly identity + occurrence claims`);
  const lanes = new Set(list.map(x => x.evidence_lane));
  if (!lanes.has("identity") || !lanes.has("occurrence")) fail(`${c.atlas_id} missing evidence lane`);
}
pass("every canonical compound has exactly one identity and one occurrence receipt");

if (compoundSupportEdges.length !== compoundClaims.length) fail("compound source-support edge count mismatch");
for (const e of compoundSupportEdges) {
  if (!sourceIds.has(e.source_node) || !compoundClaimIds.has(e.target_node)) fail(`bad compound support edge ${e.edge_id}`);
  if (e.relation !== "SUPPORTS_COMPOUND_EVIDENCE_CLAIM" || e.evidence_lane !== "source_support") fail(`invalid compound support semantics ${e.edge_id}`);
}
pass("source → compound-evidence provenance graph is complete");

if (compoundEvidenceSummary.length !== compounds.length) fail("compound evidence summary count mismatch");
for (const s of compoundEvidenceSummary) {
  const c = compoundById.get(s.atlas_id);
  if (!c) fail(`summary references missing compound ${s.atlas_id}`);
  if (s.identity_level !== c.identity_level || s.occurrence_level !== c.occurrence_level) fail(`summary evidence drift on ${s.atlas_id}`);
}
pass("compound evidence summary reconciles");

if (compoundSourceSummary.length !== sources.length) fail("compound source summary does not cover all sources");
const totalCompoundClaims = compoundSourceSummary.reduce((n,s)=>n + Number(s.compound_evidence_claim_count||0),0);
if (totalCompoundClaims !== compoundClaims.length) fail("compound source summary claim total mismatch");
pass("compound source summary reconciles");

// Verify diff-friendly canon chunks reconstruct full graph.
const canonDir = path.join(root, "data", "canon");
const compoundFiles = fs.readdirSync(canonDir).filter(n => /^compounds-\d{3}-\d{3}\.json$/.test(n)).sort();
const aliasFiles = fs.readdirSync(canonDir).filter(n => /^aliases-\d{3}-\d{3}\.json$/.test(n)).sort();
const splitCompounds = compoundFiles.flatMap(n => readJson(path.join("data","canon",n)));
const splitAliases = aliasFiles.flatMap(n => readJson(path.join("data","canon",n)));

if (JSON.stringify(splitCompounds) !== JSON.stringify(compounds)) fail("split compound canon does not reproduce graph compounds");
if (JSON.stringify(splitAliases) !== JSON.stringify(aliases)) fail("split aliases do not reproduce graph aliases");
pass("diff-friendly canon chunks reproduce the full graph exactly");

console.log("");
console.log(`VALID  Cannabiverse: ${compounds.length} compounds, ${aliases.length} aliases, ${edges.length} chemistry edges, ${relationshipClaims.length} relationship claims, ${compoundClaims.length} compound evidence claims, ${sources.length} source nodes, ${provisional.length} provisional/search-target records.`);
