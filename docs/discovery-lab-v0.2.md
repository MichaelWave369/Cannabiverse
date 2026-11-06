# Cannabiverse Discovery Lab v0.2 · Local MGF MS/MS ingestion

**2026-11-06 · experimental-data format support, NOT a chemical-discovery claim.**

v0.2 extends the successful v0.1 CH₂/Kendrick neutral-mass screen by accepting user-selected, locally processed **MGF** tandem mass spectra. It does not automatically download public datasets, contact an instrument or analyze remote data; real scientific MGF files can be supplied by a researcher who has access to the files.

## Evidence and format origin
- Publicly documented example dataset: **MassIVE MSV000093886**, “GNPS - Charting the Cannabis plant chemical space with computational metabolomics”: https://massive.ucsd.edu/ProteoSAFe/dataset.jsp?task=22b747e8cb0b4524be77680d51a8883c . MassIVE marks this deposit **CC0 1.0**, though access is labeled **Partial Public**. We have checked catalog metadata, **not downloaded or interpreted the experimental MGF spectra in this release**.
- GNPS format reference: https://wang-bioinformatics-lab.github.io/GNPS2_Documentation/dataformats/ .
- GNPS2 reanalysis example: https://gnps2.org/status?task=cdd0ffbbe4d241c5b4e8437825b7bce2 .
- Data providers, public dataset records, and file provenance are distinct. Copy the accession or originating file information into the **Source reference** field. The application does not verify origin, licenses, calibrations or annotations.

### Supported MGF
An MGF file is a sequence of `BEGIN IONS` ... `END IONS` blocks containing the precursor m/z in `PEPMASS=`, charge `CHARGE=1+` / `CHARGE=1-`, optional `IONMODE`, optional `TITLE`, `SCANS`, `RTINSECONDS` and fragment `m/z intensity` rows. `PEPMASS=` may have a second abundance value. A charge of **0** is accepted only with explicit `IONMODE=Positive/Negative`, **without precursor/adduct conversion or neutral-loss inference**. Multicharged precursors and incompatible modes are rejected rather than guessed.

Limits: one file **≤2 MB**, at most **120 spectra**, at most **1000 peaks per spectrum**, peak mass 20–2000, precursor mass 50–2000. The parser rejects nested/unterminated scans, duplicate metadata keys, impossible numeric values, all-zero intensity, out-of-range numbers, and unsupported charges. Metadata such as `NAME` is carried as an unverified label, **never a compound identification**.

### How to use
1. Obtain an appropriate MGF MS/MS export from your laboratory or from an openly licensed data source such as MassIVE. Keep the origin, polarity, sample preparation, run settings and controls independently documented. For larger MGF files, prepare a smaller representative batch externally; the browser deliberately enforces size limits.
2. Open the Discovery Lab, choose your local `.mgf` file, and record the dataset accession/sample label. This file is read with the browser's File API, **not sent to a server**.
3. Select **Screen MS/MS spectra**. The page displays scan count, peaks, inferred **only when known** polarity/charge and two common mass coincidences.
4. Download a transparent JSON report containing the manually supplied **unverified** provenance label, scan summaries, interpretations, screening settings, and limitations.
5. For spectra with a supported singly protonated/deprotonated precursor, optionally select **Compare precursor CH₂ spacing** to reuse the v0.1 workbench. All imported precursors have **unknown sample-to-blank and replication QC**; neither may be assumed to pass.

## Scientific calculation boundaries
- For known singly charged precursors, the mass difference between precursor and fragment m/z is tested against the monoisotopic masses of **water (18.010564684 Da)** and **carbon dioxide (43.98982924 Da)**, with a relative error window of **1–50 ppm of precursor m/z**.
- A fragment must have positive intensity at least **1% of its scan's base peak** to be considered. The screening labels a scan with 6 or more such fragments as having passed **fragment-count screening only**.
- The calculation records the closest mass-match per common loss and scan. **These neutral losses occur in many noncannabinoids, so a match is neither a cannabinoid identification nor definitive evidence of a fragmentation mechanism.**
- When a scan has unknown precursor charge, fragment counts are still reported but both neutral-loss calculations and precursor mass conversion are withheld. The polarity field alone is insufficient to establish the adduct.
- Sample-to-blank contamination controls and biological replication are not available from an isolated MGF spectrum. The tool does not calculate statistical significance, false discovery rate or authenticated source lineage.

### Not supported in v0.2
No mzML/vendor binary ingestion, no instrument calibration checks, no consensus-spectrum comparison, no MassQL engine, no retention-time alignment, no spectral-library matching, no reference standard confirmation, no isotope/adduct deconvolution beyond v0.1's two exact adducts, no tentative molecular formula/structure assignment, no biological effect claims, and no chemical canon changes.

## Reproducible synthetic verification
`data/discovery/demo-msms-synthetic.mgf` contains **four fabricated** positive/negative spectra with explicit common-loss masses and a low-information scan. These are simulated fixture values **not measured cannabis MS/MS**. Run:

```sh
npm run validate:msms
npm run validate
```

The automated tests include missing/invalid charge, charge 0 with and without ion polarity, unsupported MS level, malformed peaks, unknown metadata, insufficient fragment counts, false interpretation, and dimensional/data limits. The existing v0.1 synthetic test and original 145 canonical compounds, 7 provisionals, 5 discovery hypotheses, archaeology, pain and oncology feeds remain unchanged.

## Roadmap
1. Make a documented, consent-and-license-compatible test report from a small **real** MGF subset of MSV000093886, including provenance, workflow settings and at least one blank/control context.
2. Add tolerance-aware peak-list comparisons, isotope/adduct handling, and metadata validation. Distinguish matched ions from plausible alternative structures and analytic artifacts.
3. Implement and test the published MassQL engine itself or independently validated equivalence **before** claiming “MassQL integration”; keep all queries with source receipts.
4. Establish independent confirmation and provenance gates for any future provisional or canonical evidence promotions.

**Review rule:** a mass difference, peak pattern or even a library-like spectrum **is not enough to conclude a new cannabinoid was discovered**.
