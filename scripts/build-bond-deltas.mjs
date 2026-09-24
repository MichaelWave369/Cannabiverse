import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const checkOnly=process.argv.includes("--check");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const stable=x=>JSON.stringify(x,null,2)+"\n";

const receipts=read("data/transformations/correspondence_receipts.json");

function parseSdf(rel){
  const text=fs.readFileSync(path.join(root,"data","structures",rel),"utf8");
  const lines=text.split(/\r?\n/),ci=lines.findIndex(l=>l.includes("V2000"));
  if(ci<0)throw new Error("V2000 SDF required: "+rel);
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
const key=(a,b)=>a<b?`${a}-${b}`:`${b}-${a}`;
const pair=(a,b)=>a<b?[a,b]:[b,a];

const output=[];
for(let i=0;i<receipts.length;i++){
  const r=receipts[i];
  const source=parseSdf(r.source_conformer_path);
  const target=parseSdf(r.target_conformer_path);
  const sAtom=new Map(source.atoms.map(a=>[a.index,a]));
  const tAtom=new Map(target.atoms.map(a=>[a.index,a]));
  const s2t=new Map(r.mapped_heavy_atoms.map(m=>[m.source_atom,m.target_atom]));
  const mappedS=new Set(s2t.keys());
  const mappedT=new Set(s2t.values());
  const removed=new Set(r.removed_source_heavy_atoms);

  const targetHeavyBonds=new Map(
    target.bonds
      .filter(b=>tAtom.get(b.a).element!=="H"&&tAtom.get(b.b).element!=="H")
      .map(b=>[key(b.a,b.b),b])
  );

  const retainedSame=[];
  const rawOrderDiff=[];
  const removedHeavy=[];

  for(const b of source.bonds){
    const aa=sAtom.get(b.a),bb=sAtom.get(b.b);
    if(aa.element==="H"||bb.element==="H")continue;

    const aMapped=mappedS.has(b.a),bMapped=mappedS.has(b.b);
    const aRemoved=removed.has(b.a),bRemoved=removed.has(b.b);

    if(aMapped&&bMapped){
      const ta=s2t.get(b.a),tb=s2t.get(b.b);
      const counterpart=targetHeavyBonds.get(key(ta,tb));
      if(!counterpart)throw new Error("Mapped source bond missing in target: "+r.receipt_id+" "+b.a+"-"+b.b);
      const rec={
        source_atoms:pair(b.a,b.b),
        target_atoms:pair(ta,tb),
        elements:[aa.element,bb.element].sort(),
        source_order:b.order,
        target_order:counterpart.order
      };
      if(b.order===counterpart.order)retainedSame.push(rec);
      else rawOrderDiff.push({...rec,status:"REPRESENTATION_LEVEL_NOT_PROMOTED"});
      continue;
    }

    if(aRemoved||bRemoved){
      const classification=(aRemoved&&bRemoved)?"WITHIN_REMOVED_FRAGMENT":"BOUNDARY_TO_RETAINED_SCAFFOLD";
      removedHeavy.push({
        source_atoms:pair(b.a,b.b),
        elements:[aa.element,bb.element].sort(),
        source_order:b.order,
        classification
      });
      continue;
    }

    throw new Error("Unclassified source heavy bond: "+r.receipt_id+" "+b.a+"-"+b.b);
  }

  const sourceMappedTargetKeys=new Set(
    source.bonds
      .filter(b=>mappedS.has(b.a)&&mappedS.has(b.b))
      .map(b=>key(s2t.get(b.a),s2t.get(b.b)))
  );

  const addedTarget=target.bonds
    .filter(b=>tAtom.get(b.a).element!=="H"&&tAtom.get(b.b).element!=="H")
    .filter(b=>!sourceMappedTargetKeys.has(key(b.a,b.b)))
    .map(b=>({
      target_atoms:pair(b.a,b.b),
      elements:[tAtom.get(b.a).element,tAtom.get(b.b).element].sort(),
      target_order:b.order,
      classification:"ADDED_TARGET_HEAVY_BOND"
    }));

  const boundary=removedHeavy.filter(b=>b.classification==="BOUNDARY_TO_RETAINED_SCAFFOLD");
  const internal=removedHeavy.filter(b=>b.classification==="WITHIN_REMOVED_FRAGMENT");

  output.push({
    bond_receipt_id:`CPA-BND-${String(i+1).padStart(4,"0")}`,
    transformation_receipt_id:r.receipt_id,
    source_compound:r.source_compound,
    target_compound:r.target_compound,
    relation:r.relation,
    edge_id:r.edge_id,
    source_id:r.source_id,
    source_url:r.source_url,
    authority_scope:"STRUCTURAL_CONNECTIVITY_AND_RAW_SDF_ORDER_ENCODING",
    summary:{
      retained_mapped_heavy_bonds_same_order:retainedSame.length,
      raw_mapped_bond_order_encoding_differences:rawOrderDiff.length,
      removed_source_heavy_bonds:removedHeavy.length,
      removed_boundary_bonds:boundary.length,
      removed_internal_fragment_bonds:internal.length,
      added_target_heavy_bonds:addedTarget.length,
      promoted_chemical_bond_order_changes:0
    },
    retained_mapped_heavy_bonds_same_order:retainedSame,
    removed_source_heavy_bonds:removedHeavy,
    added_target_heavy_bonds:addedTarget,
    raw_mapped_bond_order_encoding_differences:rawOrderDiff,
    promoted_chemical_bond_order_changes:[],
    representation_note:"Raw source/target SDF bond-order encoding differences are recorded but not promoted to chemical bond-change claims. v0.7 does not canonicalize resonance or Kekule-equivalent encodings.",
    governance_note:"RAW_SDF_BOND_ORDER_DELTA != CHEMICAL_BOND_CHANGE != MECHANISM. Connectivity deltas may be visualized only at the authority stated in this receipt."
  });
}

const outPath="data/transformations/bond_delta_receipts.json";
const expected=stable(output);
const absolute=path.join(root,outPath);

if(checkOnly){
  const current=fs.existsSync(absolute)?fs.readFileSync(absolute,"utf8"):"";
  if(current!==expected){
    console.error("STALE "+outPath);
    console.error("Run: node scripts/build-bond-deltas.mjs");
    process.exit(1);
  }
  console.log("PASS  "+outPath);
}else{
  fs.mkdirSync(path.dirname(absolute),{recursive:true});
  fs.writeFileSync(absolute,expected);
  console.log("WROTE "+outPath);
}
