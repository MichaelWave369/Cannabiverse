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

const sourceIds = new Set(sources.map(s => s.source_id));
const compoundIds = new Set(compounds.map(c => c.atlas_id));
const processIds = new Set(processNodes.map(n => n.node_id));
const provisionalIds = new Set(provisional.map(p => p.candidate_id));

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

// Verify the diff-friendly split canon reconstructs the embedded full graph.
const canonDir = path.join(root, "data", "canon");
const compoundFiles = fs.readdirSync(canonDir)
  .filter(n => /^compounds-\d{3}-\d{3}\.json$/.test(n))
  .sort();
const aliasFiles = fs.readdirSync(canonDir)
  .filter(n => /^aliases-\d{3}-\d{3}\.json$/.test(n))
  .sort();

const splitCompounds = compoundFiles.flatMap(n => readJson(path.join("data","canon",n)));
const splitAliases = aliasFiles.flatMap(n => readJson(path.join("data","canon",n)));

if (JSON.stringify(splitCompounds) !== JSON.stringify(compounds)) fail("split compound canon does not reproduce graph compounds");
if (JSON.stringify(splitAliases) !== JSON.stringify(aliases)) fail("split aliases do not reproduce graph aliases");
pass("diff-friendly canon chunks reproduce the full graph exactly");

console.log("");
console.log(`VALID  Cannabiverse: ${compounds.length} canonical compounds, ${aliases.length} aliases, ${edges.length} typed edges, ${sources.length} sources, ${provisional.length} provisional/search-target records.`);
