import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const readJson=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const fail=msg=>{throw new Error(msg)};
const pass=msg=>console.log("PASS  "+msg);

const graph=readJson("data/graph/cannabiverse_graph_v0.4.json");
const records=readJson("data/structures/structure_index.json");
const canon=new Map((graph.compounds||[]).map(c=>[c.atlas_id,c]));

if(!Array.isArray(records)||records.length===0)fail("structure index is empty");
const ids=new Set(),cids=new Set();

function parseSdf(text){
  const lines=text.split(/\r?\n/);
  const ci=lines.findIndex(l=>l.includes("V2000"));
  if(ci<0)fail("SDF is not V2000");
  const line=lines[ci];
  const atoms=Number(line.slice(0,3).trim()),bonds=Number(line.slice(3,6).trim());
  if(!Number.isInteger(atoms)||!Number.isInteger(bonds)||atoms<1||bonds<1)fail("invalid SDF counts line");
  const atomRows=[];
  for(let i=0;i<atoms;i++){
    const p=lines[ci+1+i].trim().split(/\s+/);
    if(p.length<4)fail("invalid SDF atom row");
    const x=Number(p[0]),y=Number(p[1]),z=Number(p[2]);
    if(![x,y,z].every(Number.isFinite))fail("non-finite SDF coordinate");
    atomRows.push({x,y,z,el:p[3]});
  }
  return {atoms,bonds,atomRows};
}

for(const r of records){
  if(!/^CPA-CAN-\d{4}$/.test(r.atlas_id))fail("invalid structure atlas ID "+r.atlas_id);
  if(ids.has(r.atlas_id))fail("duplicate structure atlas ID "+r.atlas_id);
  ids.add(r.atlas_id);

  const c=canon.get(r.atlas_id);
  if(!c)fail("structure record references non-canonical compound "+r.atlas_id);
  if(r.canonical_name!==c.canonical_name)fail("structure canonical-name drift on "+r.atlas_id);
  if(r.family!==c.family)fail("structure family drift on "+r.atlas_id);

  if(r.render_status!=="PUBCHEM_3D_SDF_VERIFIED_PRESENT")fail("unsupported render status on "+r.atlas_id);
  if(r.structure_source?.provider!=="PubChem")fail("missing PubChem provenance on "+r.atlas_id);
  if(!Number.isInteger(r.structure_source.pubchem_cid)||r.structure_source.pubchem_cid<1)fail("invalid PubChem CID on "+r.atlas_id);
  if(cids.has(r.structure_source.pubchem_cid))fail("duplicate PubChem CID "+r.structure_source.pubchem_cid);
  cids.add(r.structure_source.pubchem_cid);

  if(!String(r.identifiers?.inchi||"").startsWith("InChI="))fail("missing InChI on "+r.atlas_id);
  if(!/^[A-Z]{14}-[A-Z]{10}-[A-Z]$/.test(r.identifiers?.inchikey||""))fail("invalid InChIKey on "+r.atlas_id);
  if(!r.identifiers?.isomeric_smiles||!r.identifiers?.molecular_formula)fail("missing structure identifiers on "+r.atlas_id);

  const rel=path.join("data","structures",r.conformer?.path||"");
  const abs=path.join(root,rel);
  if(!fs.existsSync(abs))fail("missing conformer file "+rel);
  if(r.conformer.format!=="SDF_V2000_3D")fail("unsupported conformer format on "+r.atlas_id);

  const parsed=parseSdf(fs.readFileSync(abs,"utf8"));
  if(parsed.atoms!==r.conformer.atom_count)fail("atom-count drift on "+r.atlas_id);
  if(parsed.bonds!==r.conformer.bond_count)fail("bond-count drift on "+r.atlas_id);

  const zs=parsed.atomRows.map(a=>a.z),zspan=Math.max(...zs)-Math.min(...zs);
  if(zspan<0.05)fail("conformer is not meaningfully 3D on "+r.atlas_id);

  if(r.conformer.includes_explicit_hydrogens&&!parsed.atomRows.some(a=>a.el==="H"))fail("declared explicit hydrogens missing on "+r.atlas_id);
}
pass("all structure records resolve to canonical Atlas compounds");
pass("all PubChem structure sources and identifiers are present");
pass("all local SDF conformers match declared atom/bond counts");
pass("all checked conformers contain non-flat 3D coordinates");
console.log("");
console.log("VALID  Cannabiverse structures: "+records.length+" governed 3D conformers.");
