# Oncology BioDesign Lab v1

This is a **static, read-only research comparison** linked from Cannabiverse's existing oncology explorer. It tests the *logic of evidence claims*, not biological treatments.

## Scope and rationale

- Cannabis suspension-cell biomanufacturing has been reported (2025, DOI: 10.1021/acs.jafc.5c10683). This publication concerns cultivated material, candidate derivatives, and anti-inflammatory tests. It is not evidence of cancer therapy.
- Engineered probiotic neoantigen delivery has been reported in preclinical cancer-immunotherapy research (2024, DOI: 10.1038/s41586-024-08033-4). It does not study cannabis.
- Plant-derived extracellular vesicles are being investigated as drug-delivery vehicles (2025 review, DOI: 10.3389/fcell.2025.1589550). This does not validate a cannabis-specific vesicle tumor-delivery system.
- ASCO's cancer guideline (2024, DOI: 10.1200/JCO.23.02596) advises against cannabis/cannabinoids as cancer-directed therapy outside clinical trials and warns of relevant safety/interaction concerns.

**None of these separate components validates a combined cannabis-plus-bacteria therapy.** Living cannabis cells are not proposed for injection into tumors.

## Versioned contract

`data/oncology/biodesign-v1.json` has stable `BIO-TRK-###` track identifiers, explicitly typed `published_component`, `hypothesis_only` and `clinical_guidance` states, and linked scientific sources. Each record includes what is **not** demonstrated, a falsifiable high-level research question, and evidence-gathering readouts. Both combination tracks must retain `direct_combo_evidence:false` and `clinical_efficacy:false`.

The original `data/oncology/evidence-v1.json` ledger and the v2 Research Bridge are unchanged. No compound records, medical recommendations, bacterial engineering instructions, culture conditions, or intervention procedures are added. Browser comparison/export stays local and creates a JSON *research memo*, not a therapeutic ranking or protocol.

## Scientific and patient-safety boundaries

- Mechanistic, cell-culture, animal and source-review claims do not amount to demonstrated human cancer benefit.
- Product manufacture, purity, tumor-selective biodistribution, immunotherapy interference and normal-tissue safety are open research problems.
- No cancer treatment is recommended by this application. Patients should consult their oncology team, not this tool, when evaluating any cannabinoid use.
- Any future ledger revision should cite direct evidence, identify model and endpoint, state negative/contradictory results and preserve source records. Independent clinical oversight would be mandatory for interventional research.

## Validation

Run `npm run validate:oncology-biodesign` or `npm test`. CI validates contract, status vocabulary, unique IDs and references, asserted evidence gaps, no-human-efficacy fields, existing onsite link, and read-only browser entrypoint.

Website: `/app/oncology/biodesign.html`.
