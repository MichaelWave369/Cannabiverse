# Cannabiverse Discovery Hypotheses v1 · Archaeochemistry → Chemistry → Genomics

**Curated November 6, 2026.** This is an *exploratory research dossier*, not a claim to have identified or synthesized a new cannabinoid. Source-owned dataset: `data/discovery/hypotheses-v1.json`. No new canonical identities, structures, natural occurrence, human effects, or medical claims are created.

## What makes the archaeology useful
1. **Historical reference contexts:** Tunnug 1 dated cannabis seeds + disputed hair markers; Jirzankal burnt brazier CBN; Jiayi Cemetery desiccated botanical cannabis with CBN, CBD, and CBL reported by Ren et al. 2019. These are **different specimen matrices**; compare observations without pretending they preserve their original chemical proportions.
2. **Authenticated ancient DNA:** The University of Bern (Nov 5, 2026) says that Tunnug botanical material preserves DNA well and sequencing has started. **No independently reviewed ancient cannabinoid-pathway genotypes or alleles are reported here.** When public data arrive, comparative genomic questions can be posed against the modern 2025 pangenome, especially fatty-acid precursor loci associated with rare varin cannabinoids.
3. **Modern mass-spectrometry discovery:** Cerrato et al. (2025, ACS Measurement Science Au DOI 10.1021/acsmeasuresciau.5c00106) used Kendrick mass-defect filtering, annotating 61 cannabinoids among 50 inflorescence samples; Queiroz et al. (2026, Rapid Communications in Mass Spectrometry DOI 10.1002/rcm.70112) used reproducible MassQL MS/MS class rules to find candidate analog-like features. **Feature annotation is not structural confirmation**.
4. **Our existing provisional ledger:** seven `CPA-PROV-####` C7 search targets. `CPA-PROV-0001` (CBGPA) and `0002` (CBCPA) are putative in a 2021 analytical study; `0003–0007` were *not detected in that study*. More modern studies may change their evidence status; the database should only do so on verified, source-registered reappraisal. None are promoted here.

## Proposed reproducible analysis sequence

```text
published source records + open data (when licensed/available)
       |
       +--> specimen context (burial / preserved plant / fresh inflorescence)
       +--> controls and blanks (environmental + processing + lab)
       +--> analytical modality (GC-MS / LC-HRMS / MS/MS / DNA sequencing)
       |
       v
normalization and reference matching
       |
       +--> current canonical/alias lookup (145 stable IDs)
       +--> candidate ledger lookup (7 CPA-PROV records)
       +--> Kendrick homolog-series grouping (CH2 family signal)
       +--> MassQL class-level fragmentation patterns
       +--> isotope, adduct, in-source and handling artifact rejection
       |
       v
reproducible feature candidate, clearly NOT yet a molecule identity
       |
       +--> reproducibility across independent samples
       +--> orthogonal MS/MS, authentic standard and/or NMR confirmation
       +--> appropriately independent verification of natural occurrence
       |
       v
human expert review and governed evidence promotion (if warranted)
```

### Core testable questions
- **Genetic ancestry:** Does a genuinely authenticated ancient sample carry identifiable variants in precursor-lipid and cannabinoid pathway genes? If not covered, report *unanswerable* rather than *absent*.
- **C7 candidates:** Are the 2021 tentative CBGPA/CBCPA features independently reproducible? Do undetected 2021 search targets have independent later evidence? Audit modern literature *before* proposing a new identity.
- **Matrix preservation:** What portion of the differences between aged material, charred residues, and hair biomarkers can be explained by processing, heating, oxygen, light, contamination and time?
- **Analytical gaps:** Can combined KMD and class-level fragment logic find reproducible candidate features outside existing libraries without confusing known adducts/isomers with new chemical identities?

## Discovery acceptance ladder
1. **HYPOTHESIS_ONLY:** formulated research prediction, no measured candidate result.
2. **FEATURE_REPRODUCED:** independently observed MS signal with metadata and blank controls; **no unique structure inferred**.
3. **STRUCTURE_PUTATIVE:** candidate structural annotation; compare isomers and source methods.
4. **STRUCTURE_CONFIRMED:** peer-reviewed isolation or standards/NMR/orthogonal structural evidence with sufficient stereochemical discrimination.
5. **PLANT_OCCURRENCE_ESTABLISHED:** independent source-backed evidence of presence in cannabis, excluding lab artifacts; **not automatically evidence of biosynthesis**.
6. **BIOLOGICAL / CLINICAL EVIDENCE:** assessed separately and only with appropriate experiments; do not inherit from chemistry.

These stages are a *proposal* for future data governance, not a replacement for existing production contracts or a claim that any new evidence is present.

## Versioning and constraints
- `npm run validate:discovery` confirms hypothesis status, links to source receipts, valid known molecular IDs, preservation of all current 7 provisional candidates, and falsification notes.
- The source list is deliberately selective, **not a systematic review**. Reconcile primary papers, spectrum archives, references and data licenses before a computational re-analysis.
- The `data/bridge/research-index-v2.json` transport is intentionally **unchanged**. This exploratory registry is not a published clinical or archeological evidence domain.
- Ancient remains should be analyzed only with qualified custodians, permits and ethical stewardship. Do not instruct unlicensed artifact sampling, cannabis production or unverified medical use.
