import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const data=JSON.parse(read('data/oncology/biodesign-v1.json'));
const validStatuses=new Set(['published_component','hypothesis_only','clinical_guidance']);
const validLanes=new Set(['production','delivery','combination','safety']);
const validKinds=new Set(['primary_preclinical_study','primary_biomanufacturing_study','peer_reviewed_review','clinical_guideline']);
assert.equal(data.contract_version,'1.0.0');
assert.equal(data.dataset_id,'cannabiverse-oncology-biodesign');
assert.match(data.clinical_boundary,/not established/i);
assert.ok(Array.isArray(data.tracks)&&data.tracks.length>=6);
assert.ok(Array.isArray(data.sources)&&data.sources.length>=4);
const srcIds=new Set();
for(const s of data.sources){
 assert.match(s.id,/^BIO-SRC-[A-Z0-9-]+$/);
 assert.ok(!srcIds.has(s.id),'Duplicate source '+s.id);
 assert.ok(s.title&&Number.isInteger(s.year)&&s.year<=2026);
 assert.ok(validKinds.has(s.kind));
 assert.match(s.url,/^https:\/\//);
 assert.ok(s.limitation&&s.limitation.length>40);
 srcIds.add(s.id);
}
const trackIds=new Set();
let combinations=0;
for(const t of data.tracks){
 assert.match(t.id,/^BIO-TRK-\d{3}$/);
 assert.ok(!trackIds.has(t.id),'Duplicate track '+t.id);
 trackIds.add(t.id);
 assert.ok(validStatuses.has(t.status));
 assert.ok(validLanes.has(t.lane));
 for(const key of ['title','system','evidence_summary','not_demonstrated','research_question'])assert.ok(typeof t[key]==='string'&&t[key].length>20,'Missing '+key+' in '+t.id);
 assert.ok(Array.isArray(t.readouts)&&t.readouts.length>=2);
 assert.ok(Array.isArray(t.source_ids)&&t.source_ids.length>0);
 for(const sid of t.source_ids)assert.ok(srcIds.has(sid),'Unknown source '+sid);
 assert.equal(t.direct_combo_evidence,false,'No direct combination proof in this edition');
 assert.equal(t.clinical_efficacy,false,'Human anticancer efficacy not supported');
 assert.equal(typeof t.cannabis_specific,'boolean');
 if(t.lane==='combination'){combinations++;assert.equal(t.status,'hypothesis_only');assert.match(t.not_demonstrated,/no |not |unverified/i);}
 if(t.status==='clinical_guidance')assert.ok(t.source_ids.includes('BIO-SRC-ASCO-2024'));
}
assert.ok(combinations>=2);
const app=read('app/oncology/biodesign.html');
const home=read('index.html');
const oncology=read('app/oncology/index.html');
assert.match(app,/biodesign-v1\.json/);
assert.match(app,/textContent/);
assert.ok(home.includes('./app/oncology/biodesign.html'));
assert.ok(oncology.includes('biodesign.html'));
assert.match(read('docs/oncology-biodesign-v1.md'),/None of these separate components validates/i);
console.log('Cannabiverse BioDesign: '+data.tracks.length+' evidence tracks, '+data.sources.length+' source receipts, '+combinations+' explicitly unvalidated combinations. PASS');
