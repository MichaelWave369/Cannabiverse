import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const fail=m=>{throw new Error(m)};
const pass=m=>console.log("PASS  "+m);

const graph=read("data/graph/cannabiverse_graph_v0.4.json");
const structures=read("data/structures/structure_index.json");
const specs=read("data/transformations/transformation_specs.json");
const receipts=read("data/transformations/correspondence_receipts.json");

const compounds=new Map((graph.compounds||[]).map(c=>[c.atlas_id,c]));
const edges=new Map((graph.relationships||[]).map(e=>[e.edge_id,e]));
const structureBy=new Map(structures.map(s=>[s.atlas_id,s]));
const ids=new Set();

function parseSdf(rel){
  const text=fs.readFileSync(path.join(root,"data","structures",rel),"utf8");
  const lines=text.split(/\r?\n/),ci=lines.findIndex(l=>l.includes("V2000"));
  if(ci<0)fail("V2000 required: "+rel);
  const atomCount=Number(lines[ci].slice(0,3).trim()),bondCount=Number(lines[ci].slice(3,6).trim());
  const atoms=[];
  for(let i=0;i<atomCount;i++){
    const p=lines[ci+1+i].trim().split(/\s+/);
    atoms.push({index:i+1,element:p[3]});
  }
  const bonds=[];
  for(let j=0;j<bondCount;j++){
    const p=lines[ci+1+atomCount+j].trim().split(/\s+/);
    bonds.push({a:Number(p[0]),b:Number(p[1]),order:Number(p[2])});
  }
  return {atoms,bonds};
}

if(receipts.length!==specs.length)fail("receipt/spec cardinality mismatch");

for(const r of receipts){
  if(ids.has(r.receipt_id))fail("duplicate transformation receipt "+r.receipt_id);
  ids.add(r.receipt_id);
  const spec=specs.find(s=>s.receipt_id===r.receipt_id);
  if(!spec)fail("receipt has no governing spec "+r.receipt_id);

  const sc=compounds.get(r.source_compound),tc=compounds.get(r.target_compound);
  const edge=edges.get(r.edge_id);
  if(!sc||!tc||!edge)fail("receipt references missing Atlas graph object "+r.receipt_id);
  if(!structureBy.has(r.source_compound)||!structureBy.has(r.target_compound))fail("receipt pair lacks governed 3D structure "+r.receipt_id);
  if(edge.source_node!==r.source_compound||edge.target_node!==r.target_compound||edge.relation!==r.relation)fail("receipt topology drift "+r.receipt_id);
  if(edge.source_id!==r.source_id||edge.source_url!==r.source_url||edge.evidence_lane!==r.evidence_lane||edge.confidence!==r.confidence)fail("receipt evidence drift "+r.receipt_id);
  if(r.relation!=="DECARBOXYLATES_TO"||r.transformation_class!=="DECARBOXYLATION")fail("unsupported v0.6 transformation type "+r.receipt_id);

  const sm=parseSdf(r.source_conformer_path),tm=parseSdf(r.target_conformer_path);
  const sourceAtom=new Map(sm.atoms.map(a=>[a.index,a])),targetAtom=new Map(tm.atoms.map(a=>[a.index,a]));

  const sourceMapped=new Set(),targetMapped=new Set();
  for(const m of r.mapped_heavy_atoms){
    if(sourceMapped.has(m.source_atom)||targetMapped.has(m.target_atom))fail("non-bijective atom map "+r.receipt_id);
    sourceMapped.add(m.source_atom);targetMapped.add(m.target_atom);
    const sa=sourceAtom.get(m.source_atom),ta=targetAtom.get(m.target_atom);
    if(!sa||!ta)fail("mapped atom index out of range "+r.receipt_id);
    if(sa.element==="H"||ta.element==="H")fail("v0.6 map must contain heavy atoms only "+r.receipt_id);
    if(sa.element!==ta.element)fail("mapped element mismatch "+r.receipt_id);
  }

  const removed=new Set(r.removed_source_heavy_atoms);
  if([...removed].some(i=>sourceMapped.has(i)))fail("removed source atom also mapped "+r.receipt_id);
  if([...removed].some(i=>!sourceAtom.has(i)||sourceAtom.get(i).element==="H"))fail("removed atom invalid or hydrogen "+r.receipt_id);
  const removedElements=[...removed].map(i=>sourceAtom.get(i).element).sort().join("");
  if(removedElements!=="COO")fail("decarboxylation receipt must remove one C and two O heavy atoms "+r.receipt_id);

  const sourceHeavy=sm.atoms.filter(a=>a.element!=="H").length;
  const targetHeavy=tm.atoms.filter(a=>a.element!=="H").length;
  if(sourceHeavy-r.removed_source_heavy_atoms.length!==targetHeavy)fail("heavy atom conservation mismatch "+r.receipt_id);
  if(r.mapped_heavy_atoms.length!==targetHeavy)fail("target heavy atoms not fully mapped "+r.receipt_id);
  if(r.added_target_heavy_atoms.length!==0)fail("v0.6 decarboxylation receipts must not add target heavy atoms "+r.receipt_id);

  const sourceMappedAdj=new Map([...sourceMapped].map(i=>[i,new Set()]));
  const targetMappedAdj=new Map([...targetMapped].map(i=>[i,new Set()]));
  for(const b of sm.bonds)if(sourceMapped.has(b.a)&&sourceMapped.has(b.b)){sourceMappedAdj.get(b.a).add(b.b);sourceMappedAdj.get(b.b).add(b.a)}
  for(const b of tm.bonds)if(targetMapped.has(b.a)&&targetMapped.has(b.b)){targetMappedAdj.get(b.a).add(b.b);targetMappedAdj.get(b.b).add(b.a)}
  const targetToSource=new Map(r.mapped_heavy_atoms.map(m=>[m.target_atom,m.source_atom]));
  for(const m of r.mapped_heavy_atoms){
    const sNeighbors=[...sourceMappedAdj.get(m.source_atom)].sort((a,b)=>a-b);
    const translated=[...targetMappedAdj.get(m.target_atom)].map(t=>targetToSource.get(t)).sort((a,b)=>a-b);
    if(JSON.stringify(sNeighbors)!==JSON.stringify(translated))fail("mapped heavy-atom connectivity mismatch "+r.receipt_id);
  }
}
pass("all transformation receipts resolve to source-backed Cannabiverse graph edges");
pass("all heavy-atom mappings are bijective and element-preserving");
pass("all v0.6 decarboxylation receipts remove exactly one C + two O heavy atoms");
pass("all mapped heavy-atom connectivity is conserved");
console.log("");
console.log("VALID  Cannabiverse transformations: "+receipts.length+" governed correspondence receipts.");
