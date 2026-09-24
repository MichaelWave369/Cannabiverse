import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const fail=m=>{throw new Error(m)};
const pass=m=>console.log("PASS  "+m);
const key=(a,b)=>a<b?`${a}-${b}`:`${b}-${a}`;

const transformations=read("data/transformations/correspondence_receipts.json");
const bonds=read("data/transformations/bond_delta_receipts.json");

function parseSdf(rel){
  const text=fs.readFileSync(path.join(root,"data","structures",rel),"utf8");
  const lines=text.split(/\r?\n/),ci=lines.findIndex(l=>l.includes("V2000"));
  if(ci<0)fail("V2000 SDF required: "+rel);
  const atomCount=Number(lines[ci].slice(0,3).trim());
  const bondCount=Number(lines[ci].slice(3,6).trim());
  const atoms=[];
  for(let i=0;i<atomCount;i++){
    const p=lines[ci+1+i].trim().split(/\s+/);
    atoms.push({index:i+1,element:p[3]});
  }
  const rows=[];
  for(let j=0;j<bondCount;j++){
    const p=lines[ci+1+atomCount+j].trim().split(/\s+/);
    rows.push({a:Number(p[0]),b:Number(p[1]),order:Number(p[2])});
  }
  return {atoms,bonds:rows};
}

if(bonds.length!==transformations.length)fail("bond-receipt/transformation-receipt cardinality mismatch");
const ids=new Set();

for(const b of bonds){
  if(ids.has(b.bond_receipt_id))fail("duplicate bond receipt "+b.bond_receipt_id);
  ids.add(b.bond_receipt_id);

  const t=transformations.find(x=>x.receipt_id===b.transformation_receipt_id);
  if(!t)fail("bond receipt missing transformation receipt "+b.bond_receipt_id);
  if(b.source_compound!==t.source_compound||b.target_compound!==t.target_compound)fail("bond receipt pair drift "+b.bond_receipt_id);
  if(b.edge_id!==t.edge_id||b.relation!==t.relation||b.source_id!==t.source_id||b.source_url!==t.source_url)fail("bond receipt provenance drift "+b.bond_receipt_id);
  if(b.authority_scope!=="STRUCTURAL_CONNECTIVITY_AND_RAW_SDF_ORDER_ENCODING")fail("invalid bond authority scope "+b.bond_receipt_id);

  const source=parseSdf(t.source_conformer_path);
  const target=parseSdf(t.target_conformer_path);
  const sourceAtoms=new Map(source.atoms.map(a=>[a.index,a]));
  const targetAtoms=new Map(target.atoms.map(a=>[a.index,a]));
  const sourceHeavyBonds=source.bonds.filter(x=>sourceAtoms.get(x.a).element!=="H"&&sourceAtoms.get(x.b).element!=="H");
  const targetHeavyBonds=target.bonds.filter(x=>targetAtoms.get(x.a).element!=="H"&&targetAtoms.get(x.b).element!=="H");
  const sourceBondByKey=new Map(sourceHeavyBonds.map(x=>[key(x.a,x.b),x]));
  const targetBondByKey=new Map(targetHeavyBonds.map(x=>[key(x.a,x.b),x]));

  const removed=b.removed_source_heavy_bonds;
  const boundary=removed.filter(x=>x.classification==="BOUNDARY_TO_RETAINED_SCAFFOLD");
  const internal=removed.filter(x=>x.classification==="WITHIN_REMOVED_FRAGMENT");

  if(removed.length!==3)fail("v0.7 decarboxylation must expose exactly 3 removed source heavy bonds "+b.bond_receipt_id);
  if(boundary.length!==1)fail("v0.7 decarboxylation must expose exactly 1 scaffold-boundary bond "+b.bond_receipt_id);
  if(internal.length!==2)fail("v0.7 decarboxylation must expose exactly 2 internal removed-fragment bonds "+b.bond_receipt_id);
  if(b.added_target_heavy_bonds.length!==0)fail("v0.7 decarboxylation unexpectedly adds target heavy bonds "+b.bond_receipt_id);
  if(b.promoted_chemical_bond_order_changes.length!==0)fail("raw SDF order deltas must not be promoted "+b.bond_receipt_id);

  const mappedSource=new Set(t.mapped_heavy_atoms.map(m=>m.source_atom));
  const mappedTarget=new Set(t.mapped_heavy_atoms.map(m=>m.target_atom));
  const removedAtoms=new Set(t.removed_source_heavy_atoms);
  const s2t=new Map(t.mapped_heavy_atoms.map(m=>[m.source_atom,m.target_atom]));

  const sourceAccounted=new Set();
  const targetAccounted=new Set();

  for(const r of b.removed_source_heavy_bonds){
    const [a,c]=r.source_atoms;
    const k=key(a,c);
    if(sourceAccounted.has(k))fail("duplicate removed source bond "+b.bond_receipt_id+" "+k);
    sourceAccounted.add(k);
    const actual=sourceBondByKey.get(k);
    if(!actual||actual.order!==r.source_order)fail("removed bond does not match source SDF "+b.bond_receipt_id+" "+k);

    const aRemoved=removedAtoms.has(a),cRemoved=removedAtoms.has(c);
    const aMapped=mappedSource.has(a),cMapped=mappedSource.has(c);
    if(!(aRemoved||cRemoved))fail("removed bond does not touch removed atom "+b.bond_receipt_id);
    if(r.classification==="BOUNDARY_TO_RETAINED_SCAFFOLD"&&!((aRemoved&&cMapped)||(cRemoved&&aMapped)))fail("invalid boundary classification "+b.bond_receipt_id);
    if(r.classification==="WITHIN_REMOVED_FRAGMENT"&&!(aRemoved&&cRemoved))fail("invalid internal-fragment classification "+b.bond_receipt_id);
  }

  for(const r of [...b.retained_mapped_heavy_bonds_same_order,...b.raw_mapped_bond_order_encoding_differences]){
    const sk=key(...r.source_atoms),tk=key(...r.target_atoms);
    if(sourceAccounted.has(sk)||targetAccounted.has(tk))fail("duplicate mapped bond accounting "+b.bond_receipt_id);
    sourceAccounted.add(sk);targetAccounted.add(tk);

    if(!r.source_atoms.every(i=>mappedSource.has(i))||!r.target_atoms.every(i=>mappedTarget.has(i)))fail("mapped bond references unmapped atom "+b.bond_receipt_id);
    const expectedTarget=key(s2t.get(r.source_atoms[0]),s2t.get(r.source_atoms[1]));
    if(expectedTarget!==tk)fail("bond target pair disagrees with atom map "+b.bond_receipt_id);

    const sb=sourceBondByKey.get(sk),tb=targetBondByKey.get(tk);
    if(!sb||!tb)fail("mapped bond missing from checked-in SDF "+b.bond_receipt_id);
    if(sb.order!==r.source_order||tb.order!==r.target_order)fail("bond order ledger disagrees with checked-in SDF "+b.bond_receipt_id);

    if("status" in r){
      if(r.source_order===r.target_order)fail("raw order-difference entry has equal orders "+b.bond_receipt_id);
      if(r.status!=="REPRESENTATION_LEVEL_NOT_PROMOTED")fail("raw order-difference authority leak "+b.bond_receipt_id);
    }else if(r.source_order!==r.target_order){
      fail("retained same-order bucket contains unequal order "+b.bond_receipt_id);
    }
  }

  for(const r of b.added_target_heavy_bonds){
    const tk=key(...r.target_atoms);
    if(targetAccounted.has(tk))fail("duplicate added target bond "+b.bond_receipt_id);
    targetAccounted.add(tk);
    const tb=targetBondByKey.get(tk);
    if(!tb||tb.order!==r.target_order)fail("added target bond does not match target SDF "+b.bond_receipt_id);
    if(r.classification!=="ADDED_TARGET_HEAVY_BOND")fail("bad added-target classification "+b.bond_receipt_id);
  }

  if(sourceAccounted.size!==sourceHeavyBonds.length)fail("source heavy-bond ledger does not close "+b.bond_receipt_id+": "+sourceAccounted.size+" vs "+sourceHeavyBonds.length);
  if(targetAccounted.size!==targetHeavyBonds.length)fail("target heavy-bond ledger does not close "+b.bond_receipt_id+": "+targetAccounted.size+" vs "+targetHeavyBonds.length);
  for(const x of sourceHeavyBonds)if(!sourceAccounted.has(key(x.a,x.b)))fail("unaccounted source heavy bond "+b.bond_receipt_id+" "+key(x.a,x.b));
  for(const x of targetHeavyBonds)if(!targetAccounted.has(key(x.a,x.b)))fail("unaccounted target heavy bond "+b.bond_receipt_id+" "+key(x.a,x.b));

  const s=b.summary;
  if(s.retained_mapped_heavy_bonds_same_order!==b.retained_mapped_heavy_bonds_same_order.length)fail("retained summary mismatch "+b.bond_receipt_id);
  if(s.raw_mapped_bond_order_encoding_differences!==b.raw_mapped_bond_order_encoding_differences.length)fail("raw-order summary mismatch "+b.bond_receipt_id);
  if(s.removed_source_heavy_bonds!==removed.length||s.removed_boundary_bonds!==boundary.length||s.removed_internal_fragment_bonds!==internal.length)fail("removed-bond summary mismatch "+b.bond_receipt_id);
  if(s.added_target_heavy_bonds!==b.added_target_heavy_bonds.length)fail("added-bond summary mismatch "+b.bond_receipt_id);
  if(s.promoted_chemical_bond_order_changes!==0)fail("promoted order-change summary must remain zero "+b.bond_receipt_id);
}
pass("all bond-delta receipts resolve to governed transformation receipts");
pass("all v0.7 decarboxylations expose one boundary + two internal removed heavy bonds");
pass("all raw SDF order differences remain representation-level and unpromoted");
pass("every source and target heavy bond is accounted for exactly once");
pass("all bond-delta summary ledgers reconcile");
console.log("");
console.log("VALID  Cannabiverse bond deltas: "+bonds.length+" governed receipts with closed heavy-bond accounting.");
