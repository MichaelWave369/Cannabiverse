# Pain & Endocannabinoid System · evidence v1

## Provenance
- Scientific data: `data/pain-ecs/evidence-v1.json`
- Client: https://michaelwave369.github.io/Cannabiverse/app/pain/
- Manifest: `data/bridge/research-index-v2.json`, content release `3.0.0`. The **v2 transport contract stays at 2.0.0** because the schema has not changed. This is an additive evidence-domain release.
- Curated October 25, 2026; no claim of a systematic literature search beyond the cited AHRQ report's own methods.

## Sources and evidence boundaries
- **AHRQ 2025 final living-review update**: primarily adult chronic neuropathic pain studies. Certain comparable THC/CBD oral sprays and THC-rich preparations had **small short-term benefits**, accompanied by increased dizziness, sedation or nausea. In pooled trials, oral CBD alone was not associated with improvements in chronic pain or function. Whole-plant, long-term and other pain-phenotype evidence remained limited or insufficient.
- **IASP 2021 position**: nonendorsement of general cannabinoid use for pain, dated and separately labeled.
- **2021 and 2015 scientific reviews**: CB1 neural signaling, CB2 immune biology, AEA and 2-AG. Mechanistic physiological findings do **not** equal human pain efficacy.
- **NIH NCCIH summary**: risks, drug interactions and the difference between FDA-approved indications and chronic pain claims. Living source: recheck before future updates.

## Relationship governance
Each record declares `lane`, `evidence_strength`, `link_scope`, `model`, `boundary`, `source_ids`, `related_compounds` and optional model-specific `mechanism_steps`.
- For comparable-ratio THC/CBD trials, linked chemical records are **formulation components**, not experimentally isolated causes of the reported benefit.
- For ECS physiology, AEA and 2-AG are **endogenous ligands**, not 145-canon phytocannabinoids. CB2 physiology is not assigned to a specific plant compound without source-justified identity.
- Absence of a molecule link means the domain has not assigned it a curated claim. It is **not** evidence of absent effect.
- Research is about **noncancer** chronic pain; do not combine with the separate oncology domain to imply treatment of cancer.
- No dosing, drug substitution recommendations, or individualized clinical instructions.

## Integrity gates
`npm run validate:pain-ecs` verifies source receipts, lane vocabulary, clinical-vs-mechanism boundaries, canonical IDs and additive manifest registration. `npm run validate:bridge` checks both domains and the original 145 compounds. No changes to oncology v1, existing PDFs, Zenodo releases or chemistry canon.
