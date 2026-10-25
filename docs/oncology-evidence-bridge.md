# Oncology evidence bridge (v1)
This is a **separate append-only, human-curated evidence domain**. It does not modify the 145 canonical phytocannabinoids, chemical source graph, transformation receipts, or baseline numbering.

## Published read-only contract
- Repo source: `data/oncology/evidence-v1.json`
- Live static endpoint: https://michaelwave369.github.io/Cannabiverse/data/oncology/evidence-v1.json
- Explorer: https://michaelwave369.github.io/Cannabiverse/app/oncology/
- Consumer: https://michaelwave369.github.io/cannabis-as-sacred-medicine/#oncology
- `contract_version: "1.0.0"` indicates the major/minor/patch **shape**, not study freshness. Any breaking shape change needs a new file, such as `evidence-v2.json`.
- GitHub Pages files are not an SLA or an authenticated real-time clinical feed. Client must show an unavailable state, not assert a cached or invented finding.

## Evidence boundaries
- `related_compounds[].atlas_id` points at existing permanent chemical IDs, **not** a new bioactivity/occurrence promotion.
- `sources` in the oncology dataset are scoped oncology citations, not silently added to the chemical identity/source ledger.
- `preclinical_mechanism`: evidence from selected cell or animal models. Steps summarize **reported/model-specific** cascades, not simulations or universal causal laws.
- `human_pilot_context`: a nine-patient feasibility pilot noted by the 2016 review, not a trial proving benefit.
- `clinical_supportive_care`: uses in symptom management, not anti-neoplastic efficacy.
- `clinical_efficacy_boundary`: no established human anticancer efficacy.
- `risk_context`: includes conflicting immune effects, not a promise of universally benign effects.
- Narrative review ≠ primary experiment ≠ independent replication. Source kind must remain visible.
- NCI PDQ is a **living summary**: claim content was curated October 25, 2026; it must be reviewed for future releases.

## Change governance
Add or revise claims only with explicit rationale and citations; retain stable claim IDs. Run `npm run validate:oncology` / `npm test`.
Never treat this curated cross-repo content as medical advice, dosing guidance, cure claims, or permission to abandon anticancer therapy.
