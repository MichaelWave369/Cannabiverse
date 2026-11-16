import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const html=readFileSync(new URL("../app/evolution/index.html",import.meta.url),"utf8");
const docs=readFileSync(new URL("../docs/evolution-simulator-v0.1.md",import.meta.url),"utf8");
const home=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const packageJson=JSON.parse(readFileSync(new URL("../package.json",import.meta.url),"utf8"));

assert.match(html,/Ancestral Population Simulator/);
assert.match(html,/MODEL ≠ ANCIENT DNA ≠ MEASURED CHEMISTRY/);
assert.match(html,/T\/B allele frequencies are not THC\/CBD percentages/);
assert.match(html,/No evidence establishes any connection to the Eden narrative/);
assert.match(html,/id="population"/);
assert.match(html,/id="generations"/);
assert.match(html,/id="strength"/);
assert.match(html,/id="seed"/);
assert.match(html,/id="export"/);
assert.match(html,/role="status"/);
assert.match(html,/docs\/evolution-simulator-v0\.1\.md/);
assert.ok(!/fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|<script[^>]+src=/i.test(html),"simulator must be self-contained and local-first");
assert.match(docs,/SIMULATION ≠ ANCIENT DNA/);
assert.match(docs,/0\.0005/);
assert.match(home,/app\/evolution\//);
assert.match(packageJson.scripts.validate,/validate:evolution/);
assert.equal(packageJson.scripts["validate:evolution"],"node scripts/validate-evolution.mjs");

const script=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(script,"expected one inline simulation script");
new vm.Script(script,{filename:"evolution-ui.js"});
const split=script.indexOf("function drawChart");
assert.ok(split>0,"pure simulation must precede view code");
const {simulate,defs}=vm.runInNewContext(script.slice(0,split)+"\n({simulate,defs})",{},{timeout:3000});
assert.equal(defs.length,4);
const a=simulate(100,35,1.5,369);
const same=simulate(100,35,1.5,369);
const other=simulate(100,35,1.5,370);
assert.equal(JSON.stringify(a),JSON.stringify(same),"fixed seeds must reproduce full outputs");
assert.notEqual(JSON.stringify(a),JSON.stringify(other),"different seeds should yield different trajectories");
assert.equal(a.model,"SYNTHETIC_TOY_ONLY");
assert.equal(a.lineages.length,4);
assert.equal(a.population_per_lineage,100);
assert.equal(a.generations,35);
assert.match(a.allele_labels,/illustrative/);
const ancestor=JSON.stringify(a.lineages[0].history[0]);
for(const lineage of a.lineages){
  assert.equal(lineage.history.length,36);
  assert.equal(JSON.stringify(lineage.history[0]),ancestor,"all branches must start from the same population");
  for(const row of lineage.history){
    assert.ok(Number.isFinite(row.t) && row.t>=0 && row.t<=1,"allele frequency must remain bounded");
    assert.ok(Number.isFinite(row.fiber) && row.fiber>=0 && row.fiber<=1,"fiber score must remain bounded");
  }
}
const neutral=simulate(50,25,0,369);
for(const lineage of neutral.lineages)assert.equal(lineage.history.length,26);
assert.notEqual(JSON.stringify(neutral.lineages[0].history),JSON.stringify(neutral.lineages[1].history),
  "isolated unselected lineages must still experience independent drift");
console.log("PASS evolution v0.1: provenance boundaries, shared ancestor, deterministic seeded runs, trajectories, bounded outputs, local-only UI");
