// Φ LeafLab 0.5: blinded-code re-annotation reliability on the SAME source image.
// No automated blinding, botanical identities, photographic scale, or ground truth.
import {measureTips} from "./core.mjs";
import {orderedRays} from "./fit.mjs";

const VERSION="0.5";
const finite=n=>typeof n==="number"&&Number.isFinite(n);
const round=n=>Number(n.toFixed(6));
function key(x,label){
  if(typeof x!=="string"||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(x))
    throw new TypeError(label+" needs 1–64 letters/digits/underscores/hyphens");
  return x;
}
function getRays(annotation){
  if(!annotation||annotation.kind!=="manual-photo-tip-annotation"||
     !Array.isArray(annotation.hub)||annotation.hub.length!==2||
     !annotation.hub.every(finite)||annotation.hub[0]<0||annotation.hub[0]>850||
     annotation.hub[1]<0||annotation.hub[1]>630||
     !Array.isArray(annotation.tips)||annotation.tips.length<3||
     annotation.tips.length>20)throw new TypeError("Expected 3–20 valid marked tip rays");
  const tips=annotation.tips.map(t=>{
    if(!t||!finite(t.x)||!finite(t.y)||t.x<0||t.x>850||
       t.y<0||t.y>630)throw new RangeError("Marked tips must be within photo view");
    return [t.x,t.y];
  });
  const clean=measureTips(annotation.hub,tips,{
    filename:String(annotation.source?.filename||"").slice(0,180),
    coordinateSpace:"SVG 850x630, same-image re-annotation"
  });
  const o=orderedRays(clean);
  if(o.spreadDegrees<10||o.spreadDegrees>=270)
    throw new RangeError("Measured tip rays need a 10°–270° span");
  for(let i=1;i<o.rays.length;i++){
    if(o.rays[i].angleDegrees-o.rays[i-1].angleDegrees<.5)
      throw new RangeError("Duplicate tip directions");
  }
  return clean;
}
export function makeReread(annotation,meta={}){
  const origin=meta.origin||"manual";
  if(origin!=="manual"&&origin!=="synthetic-demo")
    throw new TypeError("Unknown re-annotation origin");
  return {kind:"leaflab-reannotation",version:VERSION,
    specimenId:key(meta.specimenId,"Specimen ID"),
    plantId:key(meta.plantId,"Plant ID"),
    imageId:key(meta.imageId,"Image ID"),
    observerCode:key(meta.observerCode,"Observer code"),
    origin,annotation:getRays(annotation),
    warnings:["Observer codes, source image identity and independence are user-asserted",
      "Observers should mark the SAME unrotated photo without seeing previous markings",
      "Blind protocol is not authenticated by software"]};
}
export function parseReread(x){
  if(!x||x.kind!=="leaflab-reannotation"||x.version!==VERSION)
    throw new TypeError("Expected v0.5 leaflab-reannotation JSON");
  return makeReread(x.annotation,x);
}
export function rereadRecords(raw){
  if(!Array.isArray(raw)||raw.length<1||raw.length>200)
    throw new RangeError("Use 1–200 re-annotation records");
  const records=raw.map(parseReread);
  const composites=new Set(),specimens=new Map(),origins=new Set();
  for(const r of records){
    const id=r.specimenId+"|"+r.observerCode;
    if(composites.has(id))
      throw new RangeError("Duplicate observer for specimen "+r.specimenId);
    composites.add(id);origins.add(r.origin);
    const earlier=specimens.get(r.specimenId);
    if(earlier&&(earlier.plantId!==r.plantId||earlier.imageId!==r.imageId))
      throw new RangeError("Specimen has mismatched plant or source image IDs");
    specimens.set(r.specimenId,r);
  }
  if(origins.size>1)throw new RangeError("Synthetic and manual re-annotations cannot mix");
  return records.sort((a,b)=>a.specimenId.localeCompare(b.specimenId)||
    a.observerCode.localeCompare(b.observerCode));
}
export function rereadJSON(records){
  const clean=rereadRecords(records);
  return {kind:"leaflab-reannotation-collection",version:VERSION,
    evidenceLevel:clean[0].origin==="synthetic-demo"?"SYNTHETIC_DEMONSTRATION":
      "USER_ASSERTED_UNVERIFIED",
    records:clean};
}
export function importRereadJSON(data){
  if(!data||data.kind!=="leaflab-reannotation-collection"||data.version!==VERSION)
    throw new TypeError("Expected LeafLab v0.5 re-annotation collection");
  return rereadRecords(data.records);
}
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
function scorePair(a,b){
  const countA=a.annotation.tips.length,countB=b.annotation.tips.length;
  const hubDisplacement=Math.hypot(a.annotation.hub[0]-b.annotation.hub[0],
    a.annotation.hub[1]-b.annotation.hub[1]);
  const result={observers:[a.observerCode,b.observerCode],
    sameTipCount:countA===countB,counts:[countA,countB],
    hubDistanceDisplayUnits:round(hubDisplacement),
    relativeLengthMAE:null,angleGapMAEDegrees:null};
  if(countA===countB){
    const x=orderedRays(a.annotation).rays,y=orderedRays(b.annotation).rays;
    result.relativeLengthMAE=round(mean(x.map((r,i)=>Math.abs(r.relativeLength-y[i].relativeLength))));
    const gaps=z=>z.slice(1).map((r,i)=>r.angleDegrees-z[i].angleDegrees);
    const gx=gaps(x),gy=gaps(y);
    result.angleGapMAEDegrees=round(mean(gx.map((g,i)=>Math.abs(g-gy[i]))));
  }
  return result;
}
function bootPlantMean(values,seed){
  let state=2166136261;
  for(const ch of seed)state=Math.imul(state^ch.charCodeAt(0),16777619)>>>0;
  state ||= 1;
  function random(){state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;}
  const samples=[];
  for(let i=0;i<1000;i++){
    let sum=0;
    for(let j=0;j<values.length;j++)sum+=values[Math.floor(random()*values.length)];
    samples.push(sum/values.length);
  }
  samples.sort((a,b)=>a-b);
  return {lower:round(samples[24]),upper:round(samples[974]),
    method:"1000 deterministic resamples of user-entered plant IDs; exploratory, not a confirmatory confidence interval"};
}
export function auditRereads(raw){
  const records=rereadRecords(raw),groups=new Map();
  for(const r of records)groups.set(r.specimenId,[...(groups.get(r.specimenId)||[]),r]);
  const specimens=[],excluded=[];
  for(const [specimenId,rows] of groups){
    if(rows.length<2){
      excluded.push({specimenId,reason:"Only one observer record"});
      continue;
    }
    const pairs=[];
    for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++)
      pairs.push(scorePair(rows[i],rows[j]));
    const usable=pairs.filter(p=>p.sameTipCount);
    specimens.push({specimenId,plantId:rows[0].plantId,imageId:rows[0].imageId,
      observerCount:rows.length,pairCount:pairs.length,
      mismatchedTipCountPairs:pairs.length-usable.length,pairs,
      meanHubDifferenceDisplayUnits:round(mean(pairs.map(p=>p.hubDistanceDisplayUnits))),
      meanRelativeLengthMAE:usable.length?round(mean(usable.map(p=>p.relativeLengthMAE))):null,
      meanAngleGapMAEDegrees:usable.length?round(mean(usable.map(p=>p.angleGapMAEDegrees))):null
    });
  }
  if(!specimens.length)throw new RangeError("Reliability audit requires at least one specimen marked by two different observers");
  const byPlant=new Map();
  for(const s of specimens){
    const arr=byPlant.get(s.plantId)||[];arr.push(s);byPlant.set(s.plantId,arr);
  }
  const plants=[...byPlant].map(([plantId,ss])=>{
    const valid=ss.filter(s=>s.meanRelativeLengthMAE!==null);
    return {plantId,comparedSpecimens:ss.length,comparableSpecimens:valid.length,
      meanRelativeLengthMAE:valid.length?round(mean(valid.map(s=>s.meanRelativeLengthMAE))):null,
      meanAngleGapMAEDegrees:valid.length?round(mean(valid.map(s=>s.meanAngleGapMAEDegrees))):null
    };
  }).sort((a,b)=>a.plantId.localeCompare(b.plantId));
  const x=plants.filter(p=>p.meanRelativeLengthMAE!==null);
  const uncertainty=x.length>=3?bootPlantMean(x.map(p=>p.meanRelativeLengthMAE),"leaflab-reannotation-v05"):null;
  return {kind:"leaflab-reannotation-reliability",version:VERSION,
    evidenceLevel:records[0].origin==="synthetic-demo"?"SYNTHETIC_DEMONSTRATION":"USER_ASSERTED_UNVERIFIED",
    observerCount:new Set(records.map(r=>r.observerCode)).size,
    specimenCount:specimens.length,distinctPlantIds:plants.length,
    excluded, specimens:specimens.sort((a,b)=>a.specimenId.localeCompare(b.specimenId)),
    plants,exploratoryPlantResamplingInterval:uncertainty,
    limitations:[
      "Identical image IDs and masked observers are user assertions, not authenticated",
      "Hub difference is in image display units, not millimeters",
      "Length differences are normalized by the maximum tip in each annotation",
      "Tip gaps are rotation-invariant; count-mismatch pairs have no aligned angular/length comparison",
      "Multiple observer pairs within one plant are not independent biological replicates",
      "Reannotation reproducibility does not prove botanical validity or 3-6-9/Fibonacci effects"
    ]};
}
export function demoRereads(){
  const hub=[430,340],records=[];
  for(let p=0;p<5;p++){
    for(let observer=0;observer<2;observer++){
      const tips=Array.from({length:7},(_,j)=>{
        const k=(j-3)/3,angle=(152+k*140/2+observer*.8+j*.12)*Math.PI/180;
        const dist=190*(1-.44*Math.abs(k)**1.35)*(1+.01*observer*Math.sin(p+j));
        return [hub[0]+Math.sin(angle)*dist+observer*.9,hub[1]-Math.cos(angle)*dist+observer*.5];
      });
      const ann=measureTips([hub[0]+observer,hub[1]+observer],tips,
        {filename:"SYNTHETIC-SAME-IMAGE-DEMO.png"});
      records.push(makeReread(ann,{specimenId:"SYN_S"+p,plantId:"SYN_P"+p,
        imageId:"SYN_IMG"+p,observerCode:"DEMO_OBSERVER_"+observer,
        origin:"synthetic-demo"}));
    }
  }
  return rereadRecords(records);
}
