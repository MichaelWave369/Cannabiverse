import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const checkOnly=process.argv.includes("--check");
const readJson=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const stable=x=>JSON.stringify(x,null,2)+"\n";

const graph=readJson("data/graph/cannabiverse_graph_v0.4.json");
const specs=readJson("data/transformations/transformation_specs.json");
const compoundBy=new Map((graph.compounds||[]).map(c=>[c.atlas_id,c]));
const edgeBy=new Map((graph.relationships||[]).map(e=>[e.edge_id,e]));

function parseSdf(text){
  const lines=text.split(/\r?\n/);
  const ci=lines.findIndex(l=>l.includes("V2000"));
  if(ci<0)throw new Error("V2000 SDF required");
  const atomCount=Number(lines[ci].slice(0,3).trim());
  const bondCount=Number(lines[ci].slice(3,6).trim());
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

function heavyGraph(mol,removed=new Set()){
  const nodes=mol.atoms.filter(a=>a.element!=="H"&&!removed.has(a.index));
  const ids=new Set(nodes.map(a=>a.index));
  const adjacency=new Map(nodes.map(a=>[a.index,new Set()]));
  for(const b of mol.bonds){
    if(ids.has(b.a)&&ids.has(b.b)){
      adjacency.get(b.a).add(b.b);
      adjacency.get(b.b).add(b.a);
    }
  }
  return {nodes,adjacency};
}

function carboxylRemoval(mol){
  const atomBy=new Map(mol.atoms.map(a=>[a.index,a]));
  const neighbors=new Map(mol.atoms.map(a=>[a.index,[]]));
  for(const b of mol.bonds){
    neighbors.get(b.a).push({index:b.b,order:b.order});
    neighbors.get(b.b).push({index:b.a,order:b.order});
  }
  const candidates=[];
  for(const atom of mol.atoms){
    if(atom.element!=="C")continue;
    const oxy=neighbors.get(atom.index).filter(n=>atomBy.get(n.index).element==="O");
    if(oxy.length===2&&oxy.some(n=>n.order===2)&&oxy.some(n=>n.order===1)){
      candidates.push({carbon:atom.index,oxygens:oxy.map(n=>n.index)});
    }
  }
  if(candidates.length!==1)throw new Error("Expected exactly one decarboxylation carboxyl group; found "+candidates.length);
  return new Set([candidates[0].carbon,...candidates[0].oxygens]);
}

function signature(id,g,atomBy){
  const neighborElements=[...g.adjacency.get(id)].map(i=>atomBy.get(i).element).sort().join("");
  return atomBy.get(id).element+"|"+g.adjacency.get(id).size+"|"+neighborElements;
}

function mapHeavyAtoms(source,target,removed){
  const sg=heavyGraph(source,removed),tg=heavyGraph(target);
  if(sg.nodes.length!==tg.nodes.length)throw new Error("Heavy-atom count mismatch after declared removal");
  const sa=new Map(source.atoms.map(a=>[a.index,a])),ta=new Map(target.atoms.map(a=>[a.index,a]));
  const candidates=new Map();
  for(const t of tg.nodes){
    const sig=signature(t.index,tg,ta);
    const list=sg.nodes.filter(s=>signature(s.index,sg,sa)===sig).map(s=>s.index).sort((a,b)=>a-b);
    if(!list.length)throw new Error("No mapping candidate for target atom "+t.index);
    candidates.set(t.index,list);
  }
  const order=tg.nodes.map(n=>n.index).sort((a,b)=>{
    const c=candidates.get(a).length-candidates.get(b).length;
    if(c)return c;
    const degree=tg.adjacency.get(b).size-tg.adjacency.get(a).size;
    return degree||a-b;
  });
  const mapping=new Map(),used=new Set();

  function compatible(t,s){
    for(const [t2,s2] of mapping){
      if(tg.adjacency.get(t).has(t2)!==sg.adjacency.get(s).has(s2))return false;
    }
    return true;
  }
  function recurse(k){
    if(k===order.length)return true;
    const t=order[k];
    for(const s of candidates.get(t)){
      if(used.has(s)||!compatible(t,s))continue;
      mapping.set(t,s);used.add(s);
      if(recurse(k+1))return true;
      mapping.delete(t);used.delete(s);
    }
    return false;
  }
  if(!recurse(0))throw new Error("No deterministic heavy-atom graph isomorphism found");
  return [...mapping.entries()]
    .map(([target_atom,source_atom])=>({source_atom,target_atom}))
    .sort((a,b)=>a.source_atom-b.source_atom);
}

const receipts=[];
for(const spec of specs){
  const edge=edgeBy.get(spec.edge_id);
  const sourceCompound=compoundBy.get(spec.source_compound);
  const targetCompound=compoundBy.get(spec.target_compound);
  if(!edge||!sourceCompound||!targetCompound)throw new Error("Spec references missing graph object: "+spec.receipt_id);
  if(edge.relation!=="DECARBOXYLATES_TO")throw new Error("v0.6 decarboxylation receipt points to wrong relation: "+spec.receipt_id);
  if(edge.source_node!==spec.source_compound||edge.target_node!==spec.target_compound)throw new Error("Spec direction disagrees with graph edge: "+spec.receipt_id);

  const sourcePath=path.join(root,"data","structures",spec.source_conformer_path);
  const targetPath=path.join(root,"data","structures",spec.target_conformer_path);
  const source=parseSdf(fs.readFileSync(sourcePath,"utf8"));
  const target=parseSdf(fs.readFileSync(targetPath,"utf8"));
  const removed=carboxylRemoval(source);
  const mapped=mapHeavyAtoms(source,target,removed);

  receipts.push({
    receipt_id:spec.receipt_id,
    kind:"HEAVY_ATOM_TRANSFORMATION_CORRESPONDENCE",
    transformation_class:spec.transformation_class,
    source_compound:spec.source_compound,
    target_compound:spec.target_compound,
    source_name:sourceCompound.canonical_name,
    target_name:targetCompound.canonical_name,
    relation:edge.relation,
    edge_id:edge.edge_id,
    evidence_lane:edge.evidence_lane,
    confidence:edge.confidence,
    source_id:edge.source_id,
    source_url:edge.source_url,
    mapping_scope:"DETERMINISTIC_HEAVY_ATOM_GRAPH_ISOMORPHISM_AFTER_CARBOXYL_REMOVAL",
    source_conformer_path:spec.source_conformer_path,
    target_conformer_path:spec.target_conformer_path,
    mapped_heavy_atoms:mapped,
    removed_source_heavy_atoms:[...removed].sort((a,b)=>a-b),
    added_target_heavy_atoms:[],
    unmapped_hydrogens_policy:"EXPLICIT_HYDROGENS_ARE_NOT_ATOM-MAPPED_IN_V0.6",
    correspondence_note:"Shared heavy-atom graph isomorphism after removal of the source carboxyl carbon and its two oxygen atoms. Bond-order and mechanistic correspondence are not inferred.",
    governance_note:"CORRESPONDENCE != MECHANISM. This receipt supports visualization of governed heavy-atom correspondence for this exact checked-in source/target pair only."
  });
}

const output="data/transformations/correspondence_receipts.json";
const expected=stable(receipts);
const absolute=path.join(root,output);
if(checkOnly){
  const current=fs.existsSync(absolute)?fs.readFileSync(absolute,"utf8"):"";
  if(current!==expected){
    console.error("STALE "+output);
    console.error("Run: node scripts/build-correspondence.mjs");
    process.exit(1);
  }
  console.log("PASS  "+output);
}else{
  fs.mkdirSync(path.dirname(absolute),{recursive:true});
  fs.writeFileSync(absolute,expected);
  console.log("WROTE "+output);
}
