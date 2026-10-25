import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const load = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const feed = load('data/oncology/evidence-v1.json');
const lanes = new Set(['preclinical_mechanism', 'risk_context', 'human_pilot_context', 'clinical_supportive_care', 'clinical_efficacy_boundary']);
assert.equal(feed.contract_version, '1.0.0');
assert.equal(feed.dataset_id, 'cannabiverse-oncology-evidence');
assert.match(feed.medical_boundary, /not established anticancer treatments/i);
assert.ok(feed.sources.length >= 2);
assert.ok(feed.claims.length >= 5);
const sources = new Set();
for (const src of feed.sources) {
  assert.ok(src.id && !sources.has(src.id), 'Duplicate / missing source ID');
  assert.ok(src.title && src.kind && /^https:\/\//.test(src.url));
  sources.add(src.id);
}
const canonical = new Set();
for (const file of readdirSync(new URL('../data/canon/', import.meta.url)).filter(n => /^compounds-.*\.json$/.test(n))) {
  for (const molecule of load('data/canon/' + file)) canonical.add(molecule.atlas_id);
}
const ids = new Set();
for (const c of feed.claims) {
  assert.ok(c.id && !ids.has(c.id), 'Duplicate / missing claim ID');
  ids.add(c.id);
  assert.ok(lanes.has(c.lane), 'Unregistered lane: ' + c.lane);
  assert.ok(c.title && c.model && c.summary && c.boundary, 'Missing bounded claim fields: ' + c.id);
  assert.ok(Array.isArray(c.mechanism_steps) && Array.isArray(c.related_compounds) && c.source_ids?.length > 0);
  if (c.lane !== 'preclinical_mechanism') assert.equal(c.mechanism_steps.length, 0, 'Nonmechanistic claim has pathway steps');
  for (const ref of c.source_ids) assert.ok(sources.has(ref), 'Unregistered source: ' + ref);
  for (const compound of c.related_compounds) assert.ok(canonical.has(compound.atlas_id), 'Unknown compound: ' + compound.atlas_id);
}
console.log('Cannabiverse oncology contract: ' + feed.claims.length + ' bounded claims, ' + feed.sources.length + ' registered sources, ' + canonical.size + ' valid canonical compound targets. PASS');
