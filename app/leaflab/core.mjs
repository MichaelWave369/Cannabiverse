// Cannabiverse Leaf Morphology Lab v0.1
// Pure, dependency-free geometry. Synthetic output has NO empirical calibration.
export const COUNTS = Object.freeze([3, 5, 7, 9, 11]);
export const DEFAULTS = Object.freeze({
  count: 7, fan: 150, falloff: .54, width: 1, taper: .95,
  teeth: 16, depth: .21, asym: 0, veins: true
});
const RAD = Math.PI / 180;
const finite = (n, name) => {
  if (typeof n !== "number" || !Number.isFinite(n)) throw new TypeError(name + " must be finite");
  return n;
};
const bound = (n, min, max, name) => {
  finite(n, name);
  if (n < min || n > max) throw new RangeError(name + " out of range");
  return n;
};
export function validateParams(raw = {}) {
  const p = {...DEFAULTS, ...raw};
  if (!COUNTS.includes(p.count)) throw new RangeError("Unsupported leaflet count");
  bound(p.fan, 80, 175, "fan");
  bound(p.falloff, 0, .8, "falloff");
  bound(p.width, .5, 1.8, "width");
  bound(p.taper, .55, 2.5, "taper");
  bound(p.teeth, 4, 28, "teeth");
  if (!Number.isInteger(p.teeth)) throw new RangeError("teeth must be an integer");
  bound(p.depth, 0, .5, "depth");
  bound(p.asym, -.25, .25, "asym");
  p.veins = Boolean(p.veins);
  return p;
}
function widthAt(t, halfWidth, p) {
  const envelope = Math.pow(Math.sin(Math.PI * t), p.taper);
  // Illustrative repeating-tooth modulation, not extracted from a specimen.
  const tooth = Math.abs(2 * ((t * p.teeth) % 1) - 1);
  return halfWidth * envelope *
    (1 - p.depth * Math.pow(Math.sin(Math.PI * t), .55) * (1 - tooth));
}
function point(t, side, length, halfWidth, angle, p) {
  const radial = t * length;
  const lateral = side * widthAt(t, halfWidth, p);
  const a = angle * RAD;
  return [radial * Math.sin(a) + lateral * Math.cos(a),
          radial * Math.cos(a) - lateral * Math.sin(a)];
}
export function polygonArea(poly) {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x, y] = poly[i];
    const [nx, ny] = poly[(i + 1) % poly.length];
    sum += x * ny - nx * y;
  }
  return Math.abs(sum) / 2;
}
export function polygonPerimeter(poly) {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    sum += Math.hypot(a[0] - b[0], a[1] - b[1]);
  }
  return sum;
}
export function generateLeaf(raw = {}) {
  const p = validateParams(raw);
  const m = (p.count - 1) / 2, leaves = [];
  let area = 0, perimeter = 0, veinLength = 0;
  for (let i = 0; i < p.count; i++) {
    const k = (i - m) / m;
    const angle = k * p.fan / 2;
    const length = 230 * (1 - p.falloff * Math.abs(k) ** 1.35) * (1 + p.asym * k);
    const halfWidth = 26 * p.width * (.96 - .22 * Math.abs(k));
    const poly = [], branches = [];
    const steps = 240; // fixed resolution across compared models
    for (let j = 0; j <= steps; j++) poly.push(point(j / steps, 1, length, halfWidth, angle, p));
    for (let j = steps; j >= 0; j--) poly.push(point(j / steps, -1, length, halfWidth, angle, p));
    const a = polygonArea(poly), per = polygonPerimeter(poly);
    area += a;
    perimeter += per;
    let vein = length;
    const n = Math.max(3, Math.floor(p.teeth / 2));
    for (let j = 0; j < n; j++) {
      const t = .14 + (j + .5) * .72 / n;
      for (const side of [-1, 1]) {
        const start = point(t, 0, length, halfWidth, angle, p);
        const end = point(Math.min(.95, t + .06), side * .94, length, halfWidth, angle, p);
        branches.push({start, end});
        vein += Math.hypot(start[0] - end[0], start[1] - end[1]);
      }
    }
    veinLength += vein;
    leaves.push({index:i, angle, length, halfWidth, polygon:poly, area:a,
      perimeter:per, midribTip:point(1, 0, length, halfWidth, angle, p), branches});
  }
  let diff = 0, paired = 0;
  for (let i = 0; i < m; i++) {
    const a = leaves[i].area, b = leaves[leaves.length - 1 - i].area;
    diff += Math.abs(a - b);
    paired += a + b;
  }
  return {kind:"synthetic-morphology", modelVersion:"0.1", params:p, leaves,
    metrics:{area, perimeter, veinLength, symmetry:paired ? 100 * (1 - diff / paired) : 100,
      perimeterOverSqrtArea:perimeter / Math.sqrt(area),
      schematicVeinOverSqrtArea:veinLength / Math.sqrt(area)},
    limitations:["Arbitrary geometric units", "Schematic veins are not a hydraulic model",
      "No botanical calibration or biological optimality implied"]};
}
export function measureTips(hub, tips, source = {}) {
  if (!Array.isArray(hub) || hub.length !== 2 || !hub.every(Number.isFinite))
    throw new TypeError("Mark a finite hub point");
  if (!Array.isArray(tips) || tips.length === 0 || tips.length > 20 ||
      tips.some(t => !Array.isArray(t) || t.length !== 2 || !t.every(Number.isFinite)))
    throw new TypeError("Provide 1–20 finite tip points");
  const distances = tips.map(t => Math.hypot(t[0] - hub[0], t[1] - hub[1]));
  const max = Math.max(...distances);
  if (max <= 0) throw new RangeError("Tips must not all coincide with the hub");
  const measurements = tips.map(([x,y], i) => ({
    tip:i+1, x, y, angleDegrees:Math.atan2(x-hub[0], hub[1]-y)/RAD,
    relativeLength:distances[i]/max
  }));
  return {kind:"manual-photo-tip-annotation", modelVersion:"0.1", source,
    hub, tips:measurements,
    angularSpreadDegrees:Math.max(...measurements.map(t=>t.angleDegrees)) -
      Math.min(...measurements.map(t=>t.angleDegrees)),
    limitations:["Distances are ratios in displayed photo coordinates",
      "Not perspective-corrected", "Not automatically segmented",
      "No measured vein networks or physical scale"]};
}
