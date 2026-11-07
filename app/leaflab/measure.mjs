// Cannabiverse Φ LeafLab 0.3 — measured length, manually traced outlines and
// descriptive cross-specimen tables. No image segmentation or biological claims.
import {polygonArea, polygonPerimeter} from "./core.mjs";

const finite = n => typeof n === "number" && Number.isFinite(n);
const validPoint = p => Array.isArray(p) && p.length === 2 &&
  p.every(finite) && p[0] >= 0 && p[0] <= 850 && p[1] >= 0 && p[1] <= 630;
const round = n => Number(n.toFixed(6));
const id = (value,name) => {
  if(typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value)) {
    throw new TypeError(name+" must be 1–64 characters: letters, digits, underscores or hyphens");
  }
  return value;
};
function points(value,min,max,name) {
  if(!Array.isArray(value) || value.length<min || value.length>max ||
     value.some(p=>!validPoint(p))) throw new TypeError(name+" requires "+min+"–"+max+" finite points inside the image view");
  return value.map(p=>[...p]);
}
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function onSegment(a,b,p) {
  const e=1e-8;
  return Math.abs(cross(a,b,p))<e &&
    p[0]>=Math.min(a[0],b[0])-e && p[0]<=Math.max(a[0],b[0])+e &&
    p[1]>=Math.min(a[1],b[1])-e && p[1]<=Math.max(a[1],b[1])+e;
}
function intersects(a,b,c,d) {
  const c1=cross(a,b,c),c2=cross(a,b,d),c3=cross(c,d,a),c4=cross(c,d,b);
  if(((c1>0&&c2<0)||(c1<0&&c2>0)) &&
     ((c3>0&&c4<0)||(c3<0&&c4>0)))return true;
  return onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b);
}
export function validatedOutline(raw) {
  if(!raw || !Number.isInteger(raw.leafletId) ||
     raw.leafletId<1 || raw.leafletId>20) throw new TypeError("Outline needs a leafletId from 1 to 20");
  const vertices=points(raw.vertices,3,200,"Outline");
  if(polygonArea(vertices)<1e-4) throw new RangeError("Outline area must be greater than zero");
  const n=vertices.length;
  for(let i=0;i<n;i++){
    const a=vertices[i],b=vertices[(i+1)%n];
    if(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-6)throw new RangeError("Duplicate consecutive outline vertices");
    for(let j=i+1;j<n;j++){
      if(j===i+1 || (i===0 && j===n-1))continue;
      if(intersects(a,b,vertices[j],vertices[(j+1)%n]))
        throw new RangeError("Outline self-intersects or touches itself; redraw its boundary");
    }
  }
  return {leafletId:raw.leafletId,vertices};
}
export function calibrateScale(raw) {
  if(!raw || !finite(raw.knownLengthMm) || raw.knownLengthMm<=0 ||
     raw.knownLengthMm>10000)throw new RangeError("Known reference length must be greater than 0 and at most 10,000 mm");
  const marks=points(raw.points,2,2,"Scale");
  const distance=Math.hypot(marks[1][0]-marks[0][0],marks[1][1]-marks[0][1]);
  if(distance<1)throw new RangeError("Scale marks must be at least one display unit apart");
  return {kind:"manual-image-scale",knownLengthMm:raw.knownLengthMm,
    points:marks,displayUnitsPerMm:round(distance/raw.knownLengthMm),
    mmPerDisplayUnit:round(raw.knownLengthMm/distance)};
}
export function measureOutline(raw, calibration) {
  const outline=validatedOutline(raw),scale=calibrateScale(calibration);
  const exactScale=scale.knownLengthMm /
    Math.hypot(scale.points[1][0]-scale.points[0][0],scale.points[1][1]-scale.points[0][1]);
  const area=polygonArea(outline.vertices),perimeter=polygonPerimeter(outline.vertices);
  return {leafletId:outline.leafletId,vertexCount:outline.vertices.length,
    areaDisplayUnits2:round(area),perimeterDisplayUnits:round(perimeter),
    areaMm2:round(area*exactScale*exactScale),perimeterMm:round(perimeter*exactScale),
    compactness:round(4*Math.PI*area/(perimeter*perimeter))};
}
function checkedRecord(raw) {
  if(!raw || raw.kind!=="manual-leaf-specimen" || raw.version!=="0.3")
    throw new TypeError("Expected a v0.3 manual-leaf-specimen JSON");
  id(raw.specimenId,"Specimen ID");id(raw.plantId,"Plant ID");
  const scale=calibrateScale(raw.calibration);
  if(!Array.isArray(raw.outlines) || raw.outlines.length<1 || raw.outlines.length>20)
    throw new RangeError("Specimen needs 1–20 complete outlines");
  const outlines=raw.outlines.map(validatedOutline);
  if(new Set(outlines.map(x=>x.leafletId)).size!==outlines.length)
    throw new RangeError("Each leaflet ID must be unique within a specimen");
  return {scale,outlines};
}
export function makeSpecimen(raw) {
  const {scale,outlines}=checkedRecord({
    ...raw,kind:"manual-leaf-specimen",version:"0.3"
  });
  const measured=outlines.map(o=>measureOutline(o,scale));
  const avg=(key)=>round(measured.reduce((s,m)=>s+m[key],0)/measured.length);
  return {
    kind:"manual-leaf-specimen",version:"0.3",
    specimenId:id(raw.specimenId,"Specimen ID"),plantId:id(raw.plantId,"Plant ID"),
    source:raw.source && typeof raw.source==="object"
      ? {filename:String(raw.source.filename||"").slice(0,180)} : {},
    calibration:{knownLengthMm:scale.knownLengthMm,points:scale.points},
    outlines,
    metrics:{tracedLeaflets:measured.length,meanTracedLeafletAreaMm2:avg("areaMm2"),
      meanTracedLeafletPerimeterMm:avg("perimeterMm"),
      summedTracedPolygonAreaMm2:round(measured.reduce((s,m)=>s+m.areaMm2,0)),
      perLeaflet:measured},
    limitations:[
      "Manual image-plane polygons; scale assumes a flat plane and an in-plane ruler.",
      "Perspective, curling and lens distortion are not corrected.",
      "Summed polygon area double-counts overlapping outlines.",
      "Untraced leaflets are excluded. No automated tooth or vein measurement.",
      "Specimen IDs are user-provided; distinct plant IDs are not proof of biological independence.",
      "These observations are not evidence of a Fibonacci or 3-6-9 relationship."
    ]
  };
}
export function parseSpecimen(raw) {
  checkedRecord(raw); // reject wrong format and malformed imported geometry
  return makeSpecimen(raw); // recompute all metrics, never trust imported totals
}
export function compareSpecimens(rawRecords) {
  if(!Array.isArray(rawRecords) || rawRecords.length<1 || rawRecords.length>200)
    throw new RangeError("Compare 1–200 specimen records");
  const records=rawRecords.map(parseSpecimen);
  if(new Set(records.map(r=>r.specimenId)).size!==records.length)
    throw new RangeError("Duplicate specimen ID in comparison");
  const plants=new Map();
  const specimens=records.map(r=>{
    const s={specimenId:r.specimenId,plantId:r.plantId,
      tracedLeaflets:r.metrics.tracedLeaflets,
      meanAreaMm2:r.metrics.meanTracedLeafletAreaMm2,
      meanPerimeterMm:r.metrics.meanTracedLeafletPerimeterMm};
    const group=plants.get(r.plantId)||[];
    group.push(s);plants.set(r.plantId,group);
    return s;
  }).sort((a,b)=>a.plantId.localeCompare(b.plantId)||a.specimenId.localeCompare(b.specimenId));
  const plantMeans=[...plants].map(([plantId,rows])=>({
    plantId,specimens:rows.length,
    meanAreaMm2:round(rows.reduce((s,r)=>s+r.meanAreaMm2,0)/rows.length),
    meanPerimeterMm:round(rows.reduce((s,r)=>s+r.meanPerimeterMm,0)/rows.length)
  })).sort((a,b)=>a.plantId.localeCompare(b.plantId));
  return {kind:"descriptive-leaf-cohort",version:"0.3",
    specimenCount:records.length,distinctPlantIds:plantMeans.length,
    specimens,plantMeans,
    limitations:[
      "Descriptive grouping only; no hypothesis test or significance claim.",
      "Repeated specimens from the same plant are grouped, not counted as independent plants.",
      "Distinct user-entered plant IDs do not prove biological independence.",
      "Mean traced-leaflet metrics are not whole-leaf areas and depend on outline completeness.",
      "Scale is planar; perspective and annotation errors remain unquantified."
    ]};
}
export function cohortCSV(cohort) {
  if(!cohort || cohort.kind!=="descriptive-leaf-cohort")throw new TypeError("Expected cohort summary");
  const rows=["specimen_id,plant_id,traced_leaflets,mean_traced_leaflet_area_mm2,mean_traced_leaflet_perimeter_mm"];
  for(const r of cohort.specimens){
    rows.push([r.specimenId,r.plantId,r.tracedLeaflets,r.meanAreaMm2,r.meanPerimeterMm].join(","));
  }
  return rows.join("\n")+"\n";
}
