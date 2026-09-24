import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const fail=m=>{throw new Error(m)};
const pass=m=>console.log("PASS  "+m);
const key=(a,b)=>a<b?`${a}-${b}`:`${b}-${a}`;

const transformations=read("data/transformations/correspondence_receipts.json");
const bonds=read("data/transformations/bond_delta_receipts.json");

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

  for(const r of b.removed_source_heavy_bonds){
    const [a,c]=r.source_atoms;
    const aRemoved=removedAtoms.has(a),cRemoved=removedAtoms.has(c);
    const aMapped=mappedSource.has(a),cMapped=mappedSource.has(c);
    if(!(aRemoved||cRemoved))fail("removed bond does not touch removed atom "+b.bond_receipt_id);
    if(r.classification==="BOUNDARY_TO_RETAINED_SCAFFOLD"&&!((aRemoved&&cMapped)||(cRemoved&&aMapped)))fail("invalid boundary classification "+b.bond_receipt_id);
    if(r.classification==="WITHIN_REMOVED_FRAGMENT"&&!(aRemoved&&cRemoved))fail("invalid internal-fragment classification "+b.bond_receipt_id);
  }

  const seenSource=new Set(),seenTarget=new Set();
  for(const r of [...b.retained_mapped_heavy_bonds_same_order,...b.raw_mapped_bond_order_encoding_differences]){
    const sk=key(...r.source_atoms),tk=key(...r.target_atoms);
    if(seenSource.has(sk)||seenTarget.has(tk))fail("duplicate mapped bond accounting "+b.bond_receipt_id);
    seenSource.add(sk);seenTarget.add(tk);
    if(!r.source_atoms.every(i=>mappedSource.has(i))||!r.target_atoms.every(i=>mappedTarget.has(i)))fail("mapped bond references unmapped atom "+b.bond_receipt_id);
  }

  for(const r of b.raw_mapped_bond_order_encoding_differences){
    if(r.source_order===r.target_order)fail("raw order-difference entry has equal orders "+b.bond_receipt_id);
    if(r.status!=="REPRESENTATION_LEVEL_NOT_PROMOTED")fail("raw order-difference authority leak "+b.bond_receipt_id);
  }

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
pass("all bond-delta summary ledgers reconcile");
console.log("");
console.log("VALID  Cannabiverse bond deltas: "+bonds.length+" governed receipts.");
