// Cannabiverse LeafLab v0.4 — local, predeclared exploratory model audit.
// Observations are manual 2D tip marks, never a biological ground truth.
// All test plants are excluded from parameter fitting.
import {COUNTS,measureTips} from "./core.mjs";
import {orderedRays} from "./fit.mjs";

export const STUDY_VERSION="0.4";
export const STUDY_SEED="leaflab-v04-fixed-split-2026";
const PHI=(1+Math.sqrt(5))/2;
const round=x=>Number(x.toFixed(6));
const id=(x,label)=>{
  if(typeof x!=="string"||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(x))
    throw new TypeError(label+" must be 1–64 letters, digits, underscores or hyphens");
  return x;
};
const validPoint=p=>Array.isArray(p)&&p.length===2&&p.every(
  n=>typeof n==="number"&&Number.isFinite(n))&&p[0]>=0&&p[0]<=850&&p[1]>=0&&p[1]<=630;
function normalizedAnnotation(raw){
  if(!raw||raw.kind!=="manual-photo-tip-annotation"||!validPoint(raw.hub)||
      !Array.isArray(raw.tips)||!COUNTS.includes(raw.tips.length))
    throw new TypeError("Expected a complete 3/5/7/9/11-tip LeafLab photo annotation");
  const tips=raw.tips.map(t=>[t.x,t.y]);
  if(tips.some(t=>!validPoint(t)))throw new TypeError("Tip outside 850×630 photo coordinates");
  const clean=measureTips(raw.hub,tips,{
    filename:String(raw.source?.filename||"").slice(0,180),
    coordinateSpace:"SVG 850x630, image-plane"
  });
  const rays=orderedRays(clean);
  if(rays.spreadDegrees<10||rays.spreadDegrees>=270)
    throw new RangeError("Tip fan must span at least 10° and less than 270°");
  for(let i=1;i<rays.rays.length;i++){
    if(rays.rays[i].angleDegrees-rays.rays[i-1].angleDegrees<0.5)
      throw new RangeError("Duplicate or overlapping tip directions; review marking");
  }
  return clean;
}
export function makeStudyObservation(annotation,meta={}){
  const clean=normalizedAnnotation(annotation);
  const group=meta.group;
  if(group!=="cannabis"&&group!=="control")
    throw new TypeError("Group must be cannabis or a non-cannabis control");
  const species=String(meta.species||"").trim();
  if(species.length<2||species.length>90||/[<>]/.test(species))
    throw new TypeError("Species or taxon label must contain 2–90 plain characters");
  const origin=meta.origin||"manual";
  if(origin!=="manual"&&origin!=="synthetic-demo")
    throw new TypeError("Unknown observation origin");
  return {
    kind:"leaflab-study-observation",version:STUDY_VERSION,
    specimenId:id(meta.specimenId,"Specimen ID"),plantId:id(meta.plantId,"Plant ID"),
    group,species,origin,annotation:clean,
    limitations:["Manual image-plane tips; not verified biological ground truth",
      "Specimen metadata and plant independence are user-asserted",
      "No scale, vein, serration or developmental-stage inference from tip rays"]
  };
}
export function parseStudyObservation(raw){
  if(!raw||raw.kind!=="leaflab-study-observation"||raw.version!==STUDY_VERSION)
    throw new TypeError("Expected a v0.4 LeafLab study observation");
  return makeStudyObservation(raw.annotation,raw);
}
export function studyRecords(raw){
  if(!Array.isArray(raw)||raw.length<1||raw.length>200)
    throw new RangeError("Study needs between 1 and 200 observations");
  const observations=raw.map(parseStudyObservation);
  const specimens=new Set(),plantGroup=new Map(),plants=new Map();
  let demo=false,manual=false;
  for(const o of observations){
    if(specimens.has(o.specimenId))throw new RangeError("Duplicate specimen ID: "+o.specimenId);
    specimens.add(o.specimenId);
    if(plantGroup.has(o.plantId)&&plantGroup.get(o.plantId)!==o.group)
      throw new RangeError("One Plant ID appears in cannabis and control groups");
    plantGroup.set(o.plantId,o.group);
    if(plants.has(o.plantId)&&plants.get(o.plantId)!==o.species)
      throw new RangeError("One Plant ID has conflicting taxon labels");
    plants.set(o.plantId,o.species);
    demo ||= o.origin==="synthetic-demo";
    manual ||= o.origin==="manual";
  }
  if(demo&&manual)throw new RangeError("Synthetic demonstration and manual data cannot be mixed");
  return observations.sort((a,b)=>a.specimenId.localeCompare(b.specimenId));
}
export function studyJSON(records){
  const o=studyRecords(records);
  return {kind:"leaflab-study-collection",version:STUDY_VERSION,
    evidenceLevel:o.every(r=>r.origin==="synthetic-demo")
      ?"SYNTHETIC_DEMONSTRATION":"USER_ASSERTED_OBSERVATIONS_UNVERIFIED",
    observations:o};
}
export function importStudyCollection(raw){
  if(!raw||raw.kind!=="leaflab-study-collection"||raw.version!==STUDY_VERSION)
    throw new TypeError("Expected v0.4 study collection JSON");
  return studyRecords(raw.observations);
}
function seedHash(s){
  let h=2166136261;
  for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;}
  return h>>>0;
}
function splitPlantIds(ids,seed){
  const sorted=[...ids].sort((a,b)=>seedHash(seed+"|"+a)-seedHash(seed+"|"+b)||a.localeCompare(b));
  const holdoutCount=Math.max(2,Math.floor(sorted.length*.3));
  return {training:sorted.slice(holdoutCount).sort(),
    heldout:sorted.slice(0,holdoutCount).sort()};
}
const positions=count=>Array.from({length:count},(_,i)=>(i-(count-1)/2)/((count-1)/2));
function lengthModel(count,mode,f=0,a=0){
  const k=positions(count);
  let y;
  if(mode==="uniform")y=k.map(()=>1);
  else if(mode==="golden-fixed")y=k.map(x=>PHI**(-Math.abs(x)));
  else if(mode==="linear")y=k.map(x=>1-f*Math.abs(x));
  else if(mode==="curved")y=k.map(x=>(1-f*Math.abs(x)**1.35)*(1+a*x));
  else throw new TypeError("Unknown model "+mode);
  const max=Math.max(...y);
  return y.map(v=>v/max);
}
const mean=x=>x.reduce((s,n)=>s+n,0)/x.length;
const error=(expected,observed)=>mean(expected.map((v,i)=>(v-observed[i])**2));
function profilesForPlant(records){
  const observations=records.map(o=>{
    const rays=orderedRays(o.annotation);
    return {lengths:rays.rays.map(r=>r.relativeLength),
      gaps:rays.rays.slice(1).map((r,i)=>r.angleDegrees-rays.rays[i].angleDegrees)};
  });
  return {lengths:observations[0].lengths.map((_,i)=>mean(observations.map(o=>o.lengths[i]))),
    gaps:observations[0].gaps.map((_,i)=>mean(observations.map(o=>o.gaps[i]))),
    specimenCount:observations.length};
}
function fitParams(training,count,mode){
  let best=null;
  const alphas=mode==="curved"?Array.from({length:51},(_,i)=>(i-25)/100):[0];
  for(let fi=0;fi<=80;fi++){
    const f=fi/100;
    for(const a of alphas){
      const p=lengthModel(count,mode,f,a);
      const mse=mean(training.map(x=>error(p,x.lengths)));
      if(!best||mse<best.mse-1e-12 ||
        (Math.abs(mse-best.mse)<=1e-12 &&
          (Math.abs(a)<Math.abs(best.asymmetry) ||
           (Math.abs(a)===Math.abs(best.asymmetry)&&f<best.falloff))))
        best={falloff:f,asymmetry:a,mse};
    }
  }
  return best;
}
function bootMeanDifference(deltas,seed){
  let state=seedHash(seed)||1;
  function rand(){
    state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;
  }
  const samples=[];
  for(let b=0;b<1000;b++){
    let s=0;
    for(let i=0;i<deltas.length;i++)s+=deltas[Math.floor(rand()*deltas.length)];
    samples.push(s/deltas.length);
  }
  samples.sort((a,b)=>a-b);
  return {low:round(samples[24]),high:round(samples[974]),
    interpretation:"Plant-resampled exploratory interval, conditional on the fitted training model; not a preregistered confirmatory confidence interval"};
}
export function evaluateHeldout(raw,{count=7,group="cannabis",seed=STUDY_SEED}={}){
  if(!COUNTS.includes(count))throw new RangeError("Unsupported study leaflet count");
  if(group!=="cannabis"&&group!=="control")throw new TypeError("Unknown study group");
  if(typeof seed!=="string"||seed.length<1||seed.length>80)throw new TypeError("Seed must have 1–80 characters");
  const all=studyRecords(raw),selected=all.filter(o=>o.group===group&&o.annotation.tips.length===count);
  const ids=[...new Set(selected.map(o=>o.plantId))];
  if(ids.length<8)throw new RangeError("Held-out evaluation needs at least eight distinct plant IDs for this group and leaflet count; found "+ids.length);
  const split=splitPlantIds(ids,seed);
  const grouped=new Map(ids.map(id=>[id,profilesForPlant(selected.filter(o=>o.plantId===id))]));
  const train=split.training.map(id=>grouped.get(id));
  const test=split.heldout.map(id=>grouped.get(id));
  const fanGap=mean(train.flatMap(x=>x.gaps));
  const models=[
    {name:"uniform-null",mode:"uniform"},
    {name:"linear-falloff",mode:"linear"},
    {name:"curved-asymmetric",mode:"curved"},
    {name:"golden-fixed",mode:"golden-fixed"}
  ];
  const fitted=models.map(m=>{
    const f=m.mode==="linear"||m.mode==="curved"?fitParams(train,count,m.mode):{falloff:0,asymmetry:0};
    const predicted=lengthModel(count,m.mode,f.falloff,f.asymmetry);
    const scores=split.heldout.map(id=>{
      const v=grouped.get(id);
      return {plantId:id,rootMeanSquaredLengthError:Math.sqrt(error(predicted,v.lengths)),
        angularGapRMSEDegrees:Math.sqrt(error(v.gaps.map(()=>fanGap),v.gaps)),
        specimenCount:v.specimenCount};
    });
    return {name:m.name,trainedParameters:{falloff:round(f.falloff),asymmetry:round(f.asymmetry)},
      predictedRelativeLengths:predicted.map(round),
      heldoutPlantRMSE:round(mean(scores.map(s=>s.rootMeanSquaredLengthError))),
      angularGapRMSEDegrees:round(mean(scores.map(s=>s.angularGapRMSEDegrees))),
      heldoutPlantScores:scores.map(s=>({...s,rootMeanSquaredLengthError:round(s.rootMeanSquaredLengthError),
        angularGapRMSEDegrees:round(s.angularGapRMSEDegrees)}))};
  });
  const linear=fitted.find(m=>m.name==="linear-falloff");
  const golden=fitted.find(m=>m.name==="golden-fixed");
  const differences=split.heldout.map((_,i)=>
    golden.heldoutPlantScores[i].rootMeanSquaredLengthError-
    linear.heldoutPlantScores[i].rootMeanSquaredLengthError);
  const boot=bootMeanDifference(differences,seed+":"+count+":"+group);
  const origin=all[0].origin;
  return {
    kind:"leaflab-heldout-comparison",version:STUDY_VERSION,
    evidenceLevel:origin==="synthetic-demo"?"SYNTHETIC_DEMONSTRATION":"UNVERIFIED_MANUAL_OBSERVATIONS",
    design:{group,count,splitUnit:"plantId",seed,trainingPlantIds:split.training,
      heldoutPlantIds:split.heldout,trainingPlantCount:train.length,heldoutPlantCount:test.length,
      trainingSpecimenCount:selected.filter(o=>split.training.includes(o.plantId)).length,
      heldoutSpecimenCount:selected.filter(o=>split.heldout.includes(o.plantId)).length},
    trainedAngularGapDegrees:round(fanGap),models,
    goldenMinusLinearRMSE:{meanDifference:round(mean(differences)),
      positiveMeans:"Golden fixed model has larger error than linear falloff",
      exploratoryPlantBootstrap95:boot},
    interpretation:"Out-of-plant-sample predictive comparison of predeclared tip-length formulas only; not biological or statistical proof",
    warnings:[
      "Test plant IDs never fit model parameters; test images set their own orientation and largest tip length as nuisance normalization.",
      "Manual data have no authenticated plant independence, observer-blindness or perspective correction.",
      "Bootstrap interval resamples a small set of held-out plants and ignores training-data uncertainty.",
      "Golden-ratio power law is an arbitrary explicit candidate, not a validated Fibonacci law of cannabis.",
      "No p-value or causal botanical result is asserted; report failures as well as improvements."
    ]
  };
}
function choose(n,k){
  if(k<0||k>n)return 0;
  k=Math.min(k,n-k);let v=1;
  for(let i=1;i<=k;i++)v=v*(n-k+i)/i;
  return v;
}
export function countPatternAudit(raw){
  const rows=studyRecords(raw);
  const plants=new Map();
  for(const r of rows){
    const x=plants.get(r.plantId)||{group:r.group,counts:new Set()};
    x.counts.add(r.annotation.tips.length);plants.set(r.plantId,x);
  }
  const included=[...plants].filter(([,p])=>p.counts.size===1)
    .map(([plantId,p])=>({plantId,group:p.group,count:[...p.counts][0]}));
  const excluded=[...plants].filter(([,p])=>p.counts.size!==1).map(([id])=>id).sort();
  const summarize=g=>{
    const data=included.filter(p=>p.group===g);
    const hits=data.filter(p=>p.count===3||p.count===9).length;
    return {group:g,plantCount:data.length,threeOrNinePlantCount:hits,
      proportion:data.length?round(hits/data.length):null,
      byCount:Object.fromEntries(COUNTS.map(n=>[n,data.filter(p=>p.count===n).length]))};
  };
  const cannabis=summarize("cannabis"),control=summarize("control");
  let reference=null;
  if(cannabis.plantCount>=5&&control.plantCount>=5){
    const nc=cannabis.plantCount,nr=control.plantCount,N=nc+nr,K=cannabis.threeOrNinePlantCount+control.threeOrNinePlantCount;
    const observed=cannabis.threeOrNinePlantCount/nc-control.threeOrNinePlantCount/nr;
    const distribution=[];
    const denom=choose(N,nc);
    for(let a=Math.max(0,nc-(N-K));a<=Math.min(nc,K);a++){
      const weight=choose(K,a)*choose(N-K,nc-a)/denom;
      distribution.push({difference:a/nc-(K-a)/nr,weight});
    }
    const exactTail=distribution.reduce((s,d)=>s+(Math.abs(d.difference)>=Math.abs(observed)-1e-10?d.weight:0),0);
    reference={predeclaredCandidate:"complete tip counts of 3 or 9 among allowed odd counts",
      observedProportionDifference:round(observed),
      conditionalLabelPermutationTwoSidedP:round(Math.min(1,exactTail)),
      denominator:"one plant counted once; plants with multiple observed count classes excluded",
      inference:"Exploratory label-exchangeability reference only, strongly vulnerable to growth-stage and species sampling biases"};
  }
  return {kind:"leaflab-count-pattern-audit",version:STUDY_VERSION,
    evidenceLevel:rows[0].origin==="synthetic-demo"?"SYNTHETIC_DEMONSTRATION":"UNVERIFIED_MANUAL_OBSERVATIONS",
    cannabis,control,excludedAmbiguousPlantIds:excluded,reference,
    warnings:[
      "3-6-9 is operationalized only as observed counts 3 or 9; 6 cannot be tested by the currently supported odd-count measurement workflow.",
      "Odd-count selection, age, stage, cultivar, control-species composition and observer choices can bias rates.",
      "Plant labels are asserted, not authenticated; the exploratory permutation reference is not a mechanistic or causal test.",
      "Counts from individual leaves are not independently replicated plants; any plant with conflicting counts is excluded."
    ]};
}
export function demoObservations(){
  const out=[],hub=[425,315];
  for(const group of ["cannabis","control"]){
    for(let i=0;i<18;i++){
      const count=i<10?7:i<14?9:5,m=(count-1)/2;
      const fan=group==="cannabis"?138:127;
      const falloff=group==="cannabis"?.47:.22;
      const noise=j=>Math.sin((i+2)*(j+3)*1.71)*.018;
      const lengths=Array.from({length:count},(_,j)=>{
        const k=(j-m)/m;
        return (1-falloff*Math.abs(k)**1.35)*(1+.05*k)+noise(j);
      });
      const max=Math.max(...lengths);
      const tips=lengths.map((v,j)=>{
        const a=(157+i*2+(j-m)/m*fan/2+noise(j)*20)*Math.PI/180;
        const radius=180*v/max;
        return [hub[0]+Math.sin(a)*radius,hub[1]-Math.cos(a)*radius];
      });
      const annotation=measureTips(hub,tips,{filename:"SYNTHETIC-DEMO-NOT-REAL.png"});
      out.push(makeStudyObservation(annotation,{
        specimenId:"DEMO_"+group+"_"+i,plantId:"DEMO_PLANT_"+group+"_"+i,
        group,species:group==="cannabis"?"Synthetic Cannabis candidate":"Synthetic palmate control",
        origin:"synthetic-demo"
      }));
    }
  }
  return studyRecords(out);
}
