# Cannabiverse Discovery Lab v0.1
**Status:** mass-feature screening prototype; **not** compound identification or cannabinoid discovery. The workbench is served from `app/discovery/` and processes pasted CSV in the browser. No pasted feature data are transmitted to the server or stored by the application.

## Inputs and algorithms
Required columns: `feature_id,mz,adduct,blank_ratio,replicates`. Header names are exact. Supports **only** singly charged `[M+H]+` and `[M-H]-` precursor ions (both positive/negative polarity). It deliberately rejects other adducts and unknown charge states. `mz` in 50–2000; 1–2,000 features; tabular feature metadata **only**. It does not parse mzML, vendor files, extracted ion chromatograms or raw MS/MS peak lists.

Neutral monoisotopic mass uses proton mass `1.007276466621 Da`: `M = m/z − proton_mass` for `[M+H]+`, `M = m/z + proton_mass` for `[M-H]-`. The CH₂ repeat mass is `14.01565006446 Da`. Kendrick mass uses `KM = neutral_mass × 14 / CH2_mass`; displayed Kendrick mass defect is `round(KM) − KM`. Pairs whose neutral-mass differences are within the configured `0.1–50 ppm` tolerance of 1–6 CH₂ exact mass repeats are **reported as mass-spacing pairs only**. Error ppm uses the larger neutral mass as its denominator. This is an engineering screening decision, not a chemical identification method.

The illustrative QC screening rule marks individual rows `QC_SCREEN_PASS` only if a provided sample-to-blank signal ratio is ≥5 and a provided replicate count ≥2. Missing QC inputs yield `INSUFFICIENT_QC`; low blank ratio yields `BLANK_FLAG`; limited replication yields `LOW_REPLICATION`. Pair `PATTERN_PASS` requires both rows to pass that *illustrative* check, **not** proof of cannabinoid origin. This is not a controlled FDR or validated forensic method. No reference mass matching, molecular formula assignment, MS/MS chemistry, ion annotation beyond the two supported adducts, isotope deconvolution, in-source fragment filtering, retention-time alignment, or authentic-standard confirmation is performed.

## Reproducible demo
- Synthetic fixture: `data/discovery/demo-features.csv` contains six fabricated monoisotopic mass features, intentionally including a blank-flagged row and a row without adequate QC. **Not laboratory observations.**
- Run automated checks: `npm run validate:discovery-lab` or full `npm run validate`.
- Click **Load synthetic demonstration**, **Analyze features locally**, and **Export transparent JSON report**. The exported report repeats inputs, calculations, QC flags, pairs, and interpretation caveats. It does not fabricate source citations or chemical IDs.

## Research links
The application **reads** `data/discovery/hypotheses-v1.json` and `data/evidence/provisional_candidates.json` to show testable questions and the seven existing candidate records, but *never matches a mass-only feature to one of those candidates*. The historical archaeology and modern literature ledgers remain independent. No updates to the 145 canonical molecular records, seven existing provisional records, research bridge transport, clinical feeds, or published Zenodo material.

## Roadmap beyond v0.1
1. Access rights and metadata audit for publicly released LC-MS/MS peak tables and data-use permissions, including MassIVE MSV000093886. No automatic third-party data ingestion by this version.
2. Add normalized MS1/MS2 feature import with isotope grouping, adduct-aware formula candidates, false discovery controls, authentic standards and spectra quality metrics.
3. Run original MassQL queries or a compatible, properly tested implementation rather than calling the current CH₂ screen "MassQL." Record query provenance and instrument settings.
4. Cross-check all candidate claims with existing 145 canonical and seven provisional identifiers, compare independent studies and experimental artifacts, then submit **human reviewed** promotions only when evidence warrants.
5. If published and ethically usable ancient DNA genotypes emerge, connect them through a **separate** authenticated comparative-genomics lane rather than pretending ancient residue measurements already encode genomes.

## Primary methodological references
- Cerrato et al. (2025), *ACS Measurement Science Au*: https://doi.org/10.1021/acsmeasuresciau.5c00106
- de Queiroz et al. (2026), *Rapid Communications in Mass Spectrometry*: https://doi.org/10.1002/rcm.70112

This prototype borrows **general neutral-mass and Kendrick calculation concepts**, not the original studies' full validated analysis pipelines, reference dictionaries, or source spectra. Do not infer chemical identity, natural plant occurrence, intoxication, safety or medical efficacy from its output.
