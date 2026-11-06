# Discovery Lab v0.4 · First measured reference-spectra benchmark

**Real experimental data, clearly distinguished from archaeological residues, unknown cannabis extracts, and synthetic fixtures.**

## Source and reuse
Three measurements of **known Δ9-tetrahydrocannabinol reference standard** were copied unchanged from the open [MassBank-data](https://github.com/MassBank/MassBank-data) public repository at pinned commit `c1c272f44837881d2f310a8171739a6c2223408f`. All three individual source records state **LICENSE: CC BY** (no explicit version), their authors and copyright statements. The original records and an attribution manifest reside in `data/discovery/references/massbank/` and remain **CC BY**, even though the surrounding code may have another license. These are original authors' measurements, not experiments carried out by PHI369 Labs.

| MassBank record | Attribution / source institution | Technique | Precursor ion | Reported m/z | Recorded peaks |
|---|---|---|---|---:|---:|
| [EQ362901](https://github.com/MassBank/MassBank-data/blob/c1c272f44837881d2f310a8171739a6c2223408f/Eawag/MSBNK-Eawag-EQ362901.txt) | Stravs, Schymanski, Singer (Eawag); Thomaidis (Athens), © Eawag 2015 | LC-ESI-QFT, HCD | [M+H]+ | 315.2319 | 15 |
| [AU158301](https://github.com/MassBank/MassBank-data/blob/c1c272f44837881d2f310a8171739a6c2223408f/Athens_Univ/MSBNK-Athens_Univ-AU158301.txt) | Alygizakis, Aalizadeh, Thomaidis, © University of Athens 2016 | LC-ESI-QTOF, CID | [M+H]+ | 315.2319 | 6 |
| [AU158354](https://github.com/MassBank/MassBank-data/blob/c1c272f44837881d2f310a8171739a6c2223408f/Athens_Univ/MSBNK-Athens_Univ-AU158354.txt) | Alygizakis, Aalizadeh, Thomaidis, © University of Athens 2016 | LC-ESI-QTOF, CID | [M-H]- | 313.2173 | 1 |

**Source credit:** Original data copyright remains with the authors/institutions named above. Licence string in each upstream source: `CC BY`. The reproduced raw records are attributed at the individual record level. For this project only, the derived MGF peak-list conversion and machine-generated JSON analytic commentary represent modifications; the original peak mass/intensity values and source attribution remain unchanged. Verify license terms independently for downstream redistribution.

## What our code actually does
1. Reads the three pinned MassBank `.txt` records and validates accession, individual license, reported standard status, parent compound name, reported precursor m/z, charge/ion polarity, peak count, instrument type and original relative/absolute peak values.
2. Deterministically reformats each **actual measured peak list** to in-memory MGF, then passes the data through our v0.2 `parseMGF` and `screenMSMS` analyzers.
3. Corrects the precursor masses to approximate neutral mass under the stated singly charged `[M+H]+` and `[M-H]-` assumptions, using our v0.1 proton mass constant. As an internal consistency check, computes the cross-polarity neutral mass agreement between two positive-mode and one negative-mode reference record.
4. Computes a SHA-256 checksum of each **unchanged original MassBank record text** and includes source URL, pinned commit, authors, copyright, ion polarity, instrument, collision-energy description, peak count and non-diagnostic neutral-loss coincidences in the versioned JSON report.
5. Rejects a changed source accession, license, precursor, peak count, standard-status claim or malformed spectrum rather than silently creating substitute measurements.

The reported neutral masses are approximately **314.224624 Da** ([M+H]+) and **314.224576 Da** ([M-H]-), an agreement of about **0.15 ppm**. They come from reference-standard records for **the same already known molecule**, not an unknown cannabinoid identification. The 1-peak negative record has a low-information fragmentation screen even though the source labels it as a standard.

**No new cannabinoid identities, occurrence claims, clinical claims, ancient residue observations or MassIVE MSV000093886 files are introduced.** Different collision energies and ion modes preclude direct interpretation of peak-count differences as biological chemistry.

## Reproducible generated report
```sh
npm run build:massbank-report
npm run check:massbank-report
npm run validate:massbank-reference
```

These commands generate `data/discovery/references/massbank/benchmark-report-v1.json` from the checked-in upstream CC BY records and validate its deterministic content. GitHub Actions also uploads the same generated report for inspection; no developer must hand-type or guess peak intensities. The working tree stores primary source records, attribution manifest, converter and tests; the generated report is intentionally an ephemeral CI output, not a new primary dataset.

## Research next steps
- Obtain an independently verifiable experimental **cannabis extract** sample with its blank, reference standard and acquisition metadata before using this benchmark to annotate real unknown spectra.
- Extend library comparisons to isotope/adduct deconvolution and instrument/collision-energy-aware spectral similarity, with measured false-match controls. A simple spectral similarity threshold is not a chemical identity certificate.
- Add known reference standards from multiple cannabinoid families with accession-level source receipts. Do not upgrade any of the seven provisional Cannabiverse candidates from library resemblance alone.

The benchmark is intended to **validate our software with authentic measured reference spectra**, not to validate historical cannabis intoxication, discover new compounds, or suggest therapeutic efficacy.
