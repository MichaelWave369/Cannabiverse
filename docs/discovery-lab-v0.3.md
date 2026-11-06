# Discovery Lab v0.3 · Experimental MGF provenance ledger and CLI

**Scope:** reproducible **local-file** auditing of user-supplied MGF mass spectrometry peak lists. This is a deliberately limited extension of v0.2, not a publication of new experimental results or a MassQL engine.

## Public cannabis data evidence
- MassIVE dataset [MSV000093886](https://massive.ucsd.edu/ProteoSAFe/dataset.jsp?task=22b747e8cb0b4524be77680d51a8883c) is titled “GNPS - Charting the Cannabis plant chemical space with computational metabolomics,” records the DOI **10.25345/C50P0X24D**, labels the license **CC0 1.0**, and indicates **Partial Public** access.
- The associated peer-reviewed paper is Myoli et al. (2024), [*Charting the Cannabis plant chemical space with computational metabolomics*](https://doi.org/10.1007/s11306-024-02125-y).
- A publicly visible [GNPS2 classical networking task](https://gnps2.org/status?task=cdd0ffbbe4d241c5b4e8437825b7bce2) lists separate positive/negative user-uploaded input MGF files named `MSV000093886_POS.mgf` and `MSV000093886_NEG.mgf`. Its result status is DONE. Those are workflow parameters, **not independent assurance of authentic source-file identities or quality**.
- The human-reviewed registry [`data/discovery/public-data-sources-v1.json`](../data/discovery/public-data-sources-v1.json) includes these verified public bibliographic pointers and caveats. No MS/MS peak file has been downloaded or added to this repository for v0.3.

## Reproducible local auditing
Use Node.js 22 or later:

```bash
node scripts/audit-discovery-mgf.mjs --input path/to/sample.mgf --role sample --dataset MSV000093886 --polarity positive --output sample-audit.json
```

Use `--role sample`, `--role blank`, `--role standard` or `--role unknown`. The role is **user-asserted** and never treated as independently verified. `--dataset MSV000093886` attaches the public bibliographic record without asserting that the user's file came from that dataset. Without the dataset option, the report says `UNREGISTERED`.

`--polarity` can be `positive`, `negative`, or `mixed` (default). If an explicit positive/negative choice conflicts with a parsed scan, the audit refuses to proceed. `--ppm-msms` (1–50, default 20) and `--ppm-precursor` (0.1–50, default 10) are optional. If `--output` is omitted, the JSON report goes to stdout.

The tool reads the local MGF file and calculates a SHA-256 fingerprint of the **exact local bytes**. It runs the existing v0.2 MGF parser, non-diagnostic MS/MS water/CO2 neutral-loss screens, and v0.1 CH₂ spacing on only the precursor records with sufficiently known charge. It never assumes blank ratios or replicate counts from a spectrum, and these QC statuses remain **insufficient**.

The result contains the source accession and sample role *as explicitly user-supplied*, accession-associated public details, SHA-256 and byte count, observed instrument polarity metadata, scan summaries, mass-pattern results, QC caveats and `source_attribution_status: NOT_AUTHENTICATED`.

### Validation and accuracy boundaries
```bash
npm run validate:discovery-provenance
npm run validate
```

The automated test uses `data/discovery/demo-msms-synthetic.mgf`, which is a **fabricated** spectral fixture. A deterministic hash and analysis output mean the same bytes generate the same report; it does **not** establish that the file was produced by a particular instrument, that its sample was authentic, or that its peak identifications were accurate.

- **No online file ingestion, network requests, raw instrument calibration or external authentication.**
- **No MassQL execution, diagnostic cannabinoid fragment determination, natural-occurrence validation, novel molecule claims or medical conclusions.**
- **No edits to the 145 canonical molecule records or seven provisional candidates.**
- The dataset license is linked, but derivative-use requirements and any restrictions from particular processing platforms should still be checked before redistributing processed outputs.
- For reproducible research, attach the audit JSON to laboratory notes that separately record organism, experimental run, acquisition settings, sample/blank pairing, dilution, retention times, polarity and standard reference material.

## Next validation milestone
Obtain and independently verify a **small** public, license-compatible positive/negative MGF sample with its associated sample metadata (not just a workflow title). Run v0.3 on the real file, record the original URL and exact checksum, and publish only the bounded *feature-screening* report after expert review. An authentic experimental spectrum is not equivalent to a confirmed cannabinoid identity.
