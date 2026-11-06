import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildBenchmark,parseMassBankReference} from './build-massbank-reference-report.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const manifest=JSON.parse(read('data/discovery/references/massbank/manifest-v1.json'));
assert.equal(manifest.records.length,3);
assert.equal(manifest.source_license,'CC BY (record-specific, version not stated)');
const report=buildBenchmark();
assert.equal(report.schema,'cannabiverse-measured-reference-benchmark-report-v0.4');
assert.equal(report.source_type,'PUBLISHED_STANDARD_REFERENCE_SPECTRA');
assert.equal(report.sample_status,'NOT_PLANT_EXTRACT_OR_UNKNOWN');
assert.equal(report.reference_record_count,3);
assert.deepEqual(report.records.map(r=>r.measured_peak_count),[15,6,1]);
assert.deepEqual(report.records.map(r=>r.ion_mode),['POSITIVE','POSITIVE','NEGATIVE']);
assert.deepEqual(report.records.map(r=>r.fragment_count_screen),
  ['LOW_FRAGMENT_INFORMATION','LOW_FRAGMENT_INFORMATION','LOW_FRAGMENT_INFORMATION'],
  'Precursor-dominated spectra cannot pass the simple 1% fragment-count gate; not a judgment of reference-standard validity');
assert.ok(report.records.every(r=>r.attribution.authors&&r.source_url.includes(manifest.source_revision)));
assert.ok(report.records.every(r=>r.license==='CC BY'));
assert.ok(report.records.every(r=>r.canonical_atlas_cross_reference==='CPA-CAN-0001'));
assert.equal(report.cross_polarity_mass_comparisons.length,2);
assert.ok(report.cross_polarity_mass_comparisons.every(x=>x.mass_disagreement_ppm<0.2),
  'Known THC standard precursor masses from independent sources should be consistent within 0.2 ppm');
const p=report.records.find(r=>r.ion_mode==='POSITIVE'),n=report.records.find(r=>r.ion_mode==='NEGATIVE');
assert.ok(Math.abs(p.neutral_mass_da-314.224624)<0.000001);
assert.ok(Math.abs(n.neutral_mass_da-314.224576)<0.000001);
assert.ok(report.records.every(r=>r.interpretation.includes('not an independent Cannabiverse sample')));
assert.ok(report.claims_not_made.includes('Novel cannabinoid discovery'));
assert.equal(JSON.stringify(buildBenchmark()),JSON.stringify(report),'Deterministic real-reference benchmark');
const original=read('data/discovery/references/massbank/MSBNK-Eawag-EQ362901.txt');
const record=manifest.records[0];
assert.throws(()=>parseMassBankReference(original.replace('LICENSE: CC BY','LICENSE: CC BY-NC'),record),/Non-compliant license/);
assert.throws(()=>parseMassBankReference(original.replace('315.2319','315.3319'),record),/Unexpected upstream precursor mass/);
assert.throws(()=>parseMassBankReference(original.replace('PK$NUM_PEAK: 15','PK$NUM_PEAK: 14'),record),/Peak-count mismatch/);
assert.throws(()=>parseMassBankReference(original.replace('standard compound','putative'),record),/Missing source standard-status/);
assert.throws(()=>parseMassBankReference(original.replace('ACCESSION: MSBNK-Eawag-EQ362901','ACCESSION: FORGED'),record),/accession mismatch/);
console.log('PASS 3 measured MassBank THC reference spectra, independent polarity checks, CC BY attribution, source provenance, no new compound claims');
