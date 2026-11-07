// Φ LeafLab v0.2: deterministic, in-sample descriptive fitting of manually marked tip rays.
// Not a calibrated botanical growth model, statistical significance test or image classifier.
import {COUNTS} from "./core.mjs";

const RAD = 180 / Math.PI;
const finite = n => typeof n === "number" && Number.isFinite(n);
const rmse = values => Math.sqrt(values.reduce((sum, x) => sum + x*x, 0) / values.length);
const mod360 = d => ((d % 360) + 360) % 360;
const r3 = n => Number(n.toFixed(6));

export function validateAnnotation(annotation) {
  if (!annotation || annotation.kind !== "manual-photo-tip-annotation") {
    throw new TypeError("Expected a LeafLab manual-photo-tip-annotation JSON file");
  }
  if (!Array.isArray(annotation.hub) || annotation.hub.length !== 2 ||
      !annotation.hub.every(finite)) throw new TypeError("Invalid photo hub");
  if (!Array.isArray(annotation.tips) || annotation.tips.length < 1 ||
      annotation.tips.length > 20) throw new RangeError("Expected 1–20 marked tips");
  for (const tip of annotation.tips) {
    if (!tip || !finite(tip.x) || !finite(tip.y)) {
      throw new TypeError("Each marked tip must have finite x and y");
    }
    if (Math.hypot(tip.x-annotation.hub[0],tip.y-annotation.hub[1]) < 1e-7) {
      throw new RangeError("Tips cannot coincide with the hub");
    }
  }
  return annotation;
}

// Circular unwrap avoids fake ~360° spans when the photograph is rotated.
// The largest angular gap is assumed to sit outside the leaf fan.
export function orderedRays(annotation) {
  validateAnnotation(annotation);
  const [hx,hy] = annotation.hub;
  const rays = annotation.tips.map((tip, index) => {
    const dx = tip.x-hx, dy = hy-tip.y;
    return {tip:index+1, x:tip.x, y:tip.y, angle:mod360(Math.atan2(dx,dy)*RAD),
      radius:Math.hypot(dx,dy)};
  }).sort((a,b)=>a.angle-b.angle || a.tip-b.tip);
  let greatest=-1, cut=0;
  for (let i=0; i<rays.length; i++) {
    const next = i===rays.length-1?rays[0].angle+360:rays[i+1].angle;
    const gap=next-rays[i].angle;
    if (gap>greatest) {greatest=gap; cut=i;}
  }
  const ordered=[];
  for (let i=0; i<rays.length; i++) {
    const original=rays[(cut+1+i)%rays.length];
    const previous=ordered.at(-1);
    let unwrapped=original.angle;
    if(previous) while(unwrapped<previous.angleDegrees)unwrapped+=360;
    ordered.push({...original,angleDegrees:unwrapped});
  }
  const maxRadius=Math.max(...ordered.map(t=>t.radius));
  return {
    rays:ordered.map(({tip,x,y,angleDegrees,radius})=>({
      tip,x,y,angleDegrees,relativeLength:radius/maxRadius
    })),
    spreadDegrees:360-greatest,
    maxRadius
  };
}

function relativeLengths(count, falloff, asymmetry) {
  const m=(count-1)/2, raw=[];
  for(let i=0;i<count;i++){
    const k=(i-m)/m;
    raw.push((1-falloff*Math.abs(k)**1.35)*(1+asymmetry*k));
  }
  const max=Math.max(...raw);
  return raw.map(v=>v/max);
}

export function fitTipFan(annotation) {
  const data=orderedRays(annotation);
  const observed=data.rays, count=observed.length;
  if(!COUNTS.includes(count)) {
    throw new RangeError("Fit needs a complete marked 3-, 5-, 7-, 9- or 11-tip leaf; current tips: "+count);
  }
  if(data.spreadDegrees>=270) throw new RangeError("Leaf fan spread exceeds 270°, review annotations");
  const m=(count-1)/2, ks=observed.map((_,i)=>(i-m)/m);
  const meanAngle=observed.reduce((s,t)=>s+t.angleDegrees,0)/count;
  const slope=ks.reduce((s,k,i)=>s+k*(observed[i].angleDegrees-meanAngle),0) /
    ks.reduce((s,k)=>s+k*k,0);
  const fan=Math.max(80,Math.min(175,2*slope));
  const rotation=meanAngle;

  let best=null;
  // Explicit finite search grid; bounded and deterministic, not a global nonlinear fit.
  for(let fi=0;fi<=80;fi++){
    const falloff=fi/100;
    for(let ai=-25;ai<=25;ai++){
      const asym=ai/100;
      const prediction=relativeLengths(count,falloff,asym);
      const err=rmse(prediction.map((v,i)=>v-observed[i].relativeLength));
      // On exact ties prefer the simpler (smaller |a|, then smaller f) model.
      if(!best || err<best.err-1e-12 ||
          (Math.abs(err-best.err)<=1e-12 &&
            (Math.abs(asym)<Math.abs(best.asym) ||
             (Math.abs(asym)===Math.abs(best.asym) && falloff<best.falloff)))) {
        best={falloff,asym,err,prediction};
      }
    }
  }
  const angles=ks.map(k=>rotation+k*fan/2);
  const angleErrors=angles.map((v,i)=>v-observed[i].angleDegrees);
  const lengthBaseline=observed.reduce((s,t)=>s+t.relativeLength,0)/count;
  const baselineRMSE=rmse(observed.map(t=>t.relativeLength-lengthBaseline));
  const warnings=[
    "In-sample descriptive fit only: no held-out prediction or statistical significance.",
    "Only hub-to-tip rays were measured; width, serrations and venation are unidentifiable.",
    "Leaflet count and one-to-one tip correspondence must be verified by the annotator."
  ];
  if(count===3) warnings.push("Three tips strongly underconstrain the morphological model.");
  if(data.spreadDegrees>175) warnings.push("Observed fan exceeds the model's 175° bound.");
  if(fan===80 || fan===175) warnings.push("Fitted fan is at a model bound; inspect residuals.");
  const residuals=observed.map((v,i)=>({
    tip:v.tip,
    measuredAngleDegrees:r3(v.angleDegrees),
    fittedAngleDegrees:r3(angles[i]),
    angleResidualDegrees:r3(v.angleDegrees-angles[i]),
    measuredRelativeLength:r3(v.relativeLength),
    fittedRelativeLength:r3(best.prediction[i]),
    relativeLengthResidual:r3(v.relativeLength-best.prediction[i])
  }));
  return {
    kind:"descriptive-photo-model-fit",version:"0.2",
    sourceKind:annotation.kind,
    source:annotation.source && typeof annotation.source==="object" ?
      {filename:String(annotation.source.filename||""),coordinateSpace:String(annotation.source.coordinateSpace||"")} : {},
    observedCount:count,
    fitted:{fanDegrees:r3(fan),rotationDegrees:r3(mod360(rotation)),
      falloff:r3(best.falloff),asymmetry:r3(best.asym)},
    measuredFanSpreadDegrees:r3(data.spreadDegrees),
    metrics:{angleRMSEDegrees:r3(rmse(angleErrors)),
      relativeLengthRMSE:r3(best.err),equalLengthBaselineRMSE:r3(baselineRMSE)},
    points:residuals,
    warnings,
    limitations:["Coordinates are image-plane units without a physical scale or perspective correction.",
      "Photo orientation is estimated by an in-sample angular fit.",
      "Selected leaflet tips may be occluded, curled, or misannotated.",
      "The fit provides no evidence for Fibonacci, 3-6-9, evolution, or network optimality."]
  };
}
