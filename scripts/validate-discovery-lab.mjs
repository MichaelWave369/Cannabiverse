import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseCSV,normalizeFeatures,analyzeFeatures,CH2_MASS,PROTON_MASS} from '../app/discovery/lab-core.mjs';
const csv=readFileSync(new URL('../data/discovery/demo-features.csv',import.meta.url),'utf8');
const rows=parseCSV(csv);
assert.equal(rows.length,6);
const report=analyzeFeatures(rows,{ppm_tolerance:10});
assert.equal(report.schema,'cannabiverse-discovery-screen-v0.1');
assert.equal(report.evidence_level,'PATTERN_ONLY_NO_COMPOUND_IDENTITY');
assert.equal(report.features.length,6);
assert.equal(report.pairs.length,7,'Four-point homolog series yields 6 pairs plus E-F');
assert.equal(report.pairs.filter(p=>p.review_status==='PATTERN_PASS').length,3);
const f=id=>report.features.find(x=>x.feature_id===id);
assert.ok(Math.abs(f('SYN-A').neutral_mass-300.123456)<1e-6);
assert.ok(Math.abs(f('SYN-C').neutral_mass-(300.123456+2*CH2_MASS))<1e-6,'Negative adduct neutralization');
assert.equal(f('SYN-D').screening_status,'BLANK_FLAG');
assert.equal(f('SYN-F').screening_status,'INSUFFICIENT_QC');
assert.ok(report.pairs.every(p=>p.error_ppm_larger_mass<=10));
assert.ok(report.pairs.every(p=>p.interpretation.includes('not a chemical identity')));
assert.equal(JSON.stringify(analyzeFeatures(rows,{ppm_tolerance:10})),JSON.stringify(report),'Deterministic output');
assert.equal(normalizeFeatures([{feature_id:'X',mz:301+PROTON_MASS,adduct:'[M+H]+',blank_ratio:'',replicates:''}])[0].screening_status,'INSUFFICIENT_QC');
const contaminated=analyzeFeatures([
 {feature_id:'A',mz:301+PROTON_MASS,adduct:'[M+H]+',blank_ratio:1.2,replicates:3},
 {feature_id:'B',mz:301+CH2_MASS+PROTON_MASS,adduct:'[M+H]+',blank_ratio:8,replicates:3}
]);
assert.equal(contaminated.pairs[0].review_status,'QC_REVIEW');
assert.equal(analyzeFeatures([
 {feature_id:'X',mz:301+PROTON_MASS,adduct:'[M+H]+',blank_ratio:5,replicates:2},
 {feature_id:'Y',mz:315.123+PROTON_MASS,adduct:'[M+H]+',blank_ratio:5,replicates:2}
]).pairs.length,0,'Unrelated mass differences must not match');
assert.throws(()=>parseCSV('feature_id,mz,adduct,blank_ratio,replicates\nA,300,[M+H]+,5\n'),/column count/);
assert.throws(()=>parseCSV('feature_id,mz,adduct,blank_ratio,replicates\n"A,300,[M+H]+,5,2\n'),/Unclosed CSV quote/);
assert.throws(()=>analyzeFeatures([{feature_id:'X',mz:100,adduct:'[M+Na]+',blank_ratio:5,replicates:2}]),/Unsupported adduct/);
assert.throws(()=>analyzeFeatures([{feature_id:'X',mz:100,adduct:'[M+H]+',blank_ratio:5,replicates:2},{feature_id:'X',mz:115,adduct:'[M+H]+',blank_ratio:5,replicates:2}]),/duplicate feature ID/);
assert.throws(()=>analyzeFeatures(rows,{ppm_tolerance:80}),/Invalid ppm tolerance/);
assert.ok(!('compound_id' in report.features[0]));
const ledger=JSON.parse(readFileSync(new URL('../data/discovery/hypotheses-v1.json',import.meta.url),'utf8'));
const provisional=JSON.parse(readFileSync(new URL('../data/evidence/provisional_candidates.json',import.meta.url),'utf8'));
assert.equal(ledger.hypotheses.length,5);
assert.equal(provisional.length,7);
const html=readFileSync(new URL('../app/discovery/index.html',import.meta.url),'utf8');
assert.match(html,/Not a cannabinoid identification system/);
assert.match(html,/lab-ui\.mjs/);
console.log('PASS Discovery Lab v0.1: synthetic-only screening, CH2 spacing, adduct neutralization, QC, deterministic output, no structural promotion');
