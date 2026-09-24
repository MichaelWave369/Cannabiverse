import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const fail=m=>{throw new Error(m)};
const pass=m=>console.log("PASS  "+m);

const structures=read("data/structures/structure_index.json");
const presets=read("data/structures/compare_presets.json");
const edges=read("data/graph/relationships.json");
const homologs=read("data/graph/homolog_series.json");

const structureIds=new Set(structures.map(x=>x.atlas_id));
const presetIds=new Set();

if(!Array.isArray(presets)||presets.length===0)fail("compare preset set is empty");

for(const p of presets){
  if(!/^CMP-[A-Z0-9-]+$/.test(p.preset_id))fail("invalid preset ID "+p.preset_id);
  if(presetIds.has(p.preset_id))fail("duplicate preset ID "+p.preset_id);
  presetIds.add(p.preset_id);

  if(!structureIds.has(p.a)||!structureIds.has(p.b))fail("preset references molecule without governed 3D conformer: "+p.preset_id);
  if(p.a===p.b)fail("preset compares molecule to itself: "+p.preset_id);

  if(p.basis==="EXPLICIT_GRAPH_EDGE"){
    const edge=edges.find(e=>(e.source_node===p.a&&e.target_node===p.b)||(e.source_node===p.b&&e.target_node===p.a));
    if(!edge)fail("preset lacks explicit graph edge: "+p.preset_id);
    if(edge.relation!==p.expected_relation)fail("preset expected relation drift on "+p.preset_id);
    if(!edge.source_id||!edge.source_url)fail("preset graph edge lacks provenance: "+p.preset_id);
  }else if(p.basis==="HOMOLOG_SERIES"){
    if(!p.expected_series)fail("homolog preset missing expected_series: "+p.preset_id);
    const a=homologs.find(h=>h.atlas_id===p.a&&h.series===p.expected_series);
    const b=homologs.find(h=>h.atlas_id===p.b&&h.series===p.expected_series);
    if(!a||!b)fail("homolog preset membership drift on "+p.preset_id);
    if(!Number.isInteger(a.side_chain_carbons)||!Number.isInteger(b.side_chain_carbons))fail("homolog preset lacks side-chain carbon count: "+p.preset_id);
  }else{
    fail("unsupported compare basis "+p.basis+" on "+p.preset_id);
  }
}
pass("all compare presets reference governed 3D structures");
pass("all explicit-edge presets resolve to source-backed graph edges");
pass("all homolog presets resolve to the declared homolog series");
console.log("");
console.log("VALID  Cannabiverse compare presets: "+presets.length+" governed pairs.");
