# Cannabiverse

**A governed, source-aware map of Cannabis phytochemistry, plus a separate exploratory botanical morphology lab.**

Cannabiverse turns cannabinoid lists into a reproducible scientific knowledge graph: canonical compounds, aliases, homolog series, transformation routes, biosynthetic relationships, evidence lanes, source receipts, and explicit uncertainty.

> **IDENTITY ≠ OCCURRENCE ≠ BIOSYNTHESIS ≠ BIOACTIVITY ≠ HUMAN EFFECT ≠ SAFETY**

A compound can be well identified chemically while its natural occurrence, biosynthetic origin, biological activity, human effects, or safety remain uncertain. Cannabiverse keeps those evidence lanes separate.

## Repository baseline

This repository begins from the 2026 Atlas369 reconciliation line.

Current dataset:

- **125** immutable historical records in the Radwan et al. 2021 baseline
- **145** confirmed canonical Atlas records in the current reconciliation
- **20** post-baseline confirmed additions
- **278** alias/synonym mappings
- **38** homolog-series memberships
- **35** typed graph relationships
- **35** deterministic source-aware relationship claim receipts
- **290** compound evidence receipts: 145 identity + 145 occurrence
- **7** provisional/search-target records
- **14** registered scientific sources in the current source ledger
- **11** governed PubChem 3D conformers rendered through native WebGL2
- **7** governed molecule-comparison presets
- **4** deterministic heavy-atom transformation correspondence receipts
- **4** governed bond-delta receipts

**145 is not a claim that only 145 phytocannabinoids exist.** Different inventories use different inclusion rules; later literature describes broader inventories.

## Live site

**Cannabiverse:** https://michaelwave369.github.io/Cannabiverse/

- Research Explorer: https://michaelwave369.github.io/Cannabiverse/app/explorer/
- Φ Leaf Morphology Lab: https://michaelwave369.github.io/Cannabiverse/app/leaflab/
- Evidence Explorer: https://michaelwave369.github.io/Cannabiverse/app/evidence/
- 3D Molecule Viewer: https://michaelwave369.github.io/Cannabiverse/app/molecules/
- Molecule Compare Lab: https://michaelwave369.github.io/Cannabiverse/app/molecules/compare.html
- Transformation Lab: https://michaelwave369.github.io/Cannabiverse/app/molecules/transform.html
- Oncology Evidence Explorer: https://michaelwave369.github.io/Cannabiverse/app/oncology/

GitHub Pages serves the static interfaces; the authoritative scientific data and governance contracts remain versioned in this repository.

## Architecture

```text
scientific sources
       │
       ▼
observations / claims / receipts
       │
       ▼
governed canon + typed relationships
       │
       ▼
data/  ← authoritative layer
       │
       ├── Explorer
       ├── Query engine
       ├── PhiOS
       └── future clients
```

The application is a consumer of the ledger. **Visualization never creates scientific authority.**

## Repository map

```text
data/
  canon/              canonical records, split into stable chunks
  graph/              relationships, homologs, process nodes
  evidence/           evidence vocabulary and provisional records
  research/           source, reconciliation, and known-issue ledgers
  schemas/            JSON contracts
  structures/         governed 3D structure records + local SDF conformers
  transformations/    transformation specs + deterministic correspondence receipts

app/explorer/          browser-based Cannabiverse Query Explorer
app/leaflab/           local-first synthetic leaf geometry + photo annotation
app/evidence/          source / claim Evidence Explorer
app/molecules/         native WebGL2 molecule viewer
docs/                  ontology and governance documentation
scripts/               deterministic validation
.github/workflows/     scientific-integrity CI
```

## Validate locally

No dependency installation is required.

```bash
npm run validate
```

The validation gate checks permanent IDs, the frozen baseline, source resolution, graph endpoints, evidence vocabulary, provisional separation, hypothesis-edge discipline, deterministic claim projections, governed 3D structures, comparison presets, and deterministic heavy-atom transformation correspondence, and governed bond-delta accounting.

## Compound evidence

Every canonical compound now has stable, source-backed evidence receipts:

```text
CPA-CAN-0133
  ├── CPA-EVC-0133-I  identity evidence
  └── CPA-EVC-0133-O  occurrence evidence
```

Occurrence receipts are marked `CAUTIONED` when the canonical record carries an occurrence warning or artifact flag. Unknown biosynthesis (`B0`) is deliberately not converted into a positive claim.

See [docs/compound-evidence.md](docs/compound-evidence.md).

## Molecular structures

Cannabiverse v0.4 adds a governed 3D structure layer and a **native WebGL2 renderer**. Initial coverage includes CBGA, THCA-A, Δ9-THC, CBD, CBDA, CBG, CBC, CBCA, CBN, THCV, and THCP.

The conformers are checked into `data/structures/conformers/` and carry PubChem provenance plus stable molecular identifiers.

**RENDERABLE STRUCTURE ≠ OCCURRENCE ≠ BIOSYNTHESIS ≠ BIOACTIVITY ≠ HUMAN EFFECT ≠ SAFETY**

See [docs/structure-model.md](docs/structure-model.md).

## Molecule Compare Lab

Cannabiverse v0.5 adds a synchronized dual-WebGL2 comparison workspace.

The Compare Lab can show two governed conformers under the same camera motion, detect an explicit source-backed graph relationship when one exists, detect shared homolog-series membership, and report formula/mass/atom/bond/element-count deltas.

It deliberately does **not** claim atom mapping, molecular superposition, or reaction simulation.

See [app/molecules/COMPARE.md](app/molecules/COMPARE.md).

## Transformation Lab

Cannabiverse v0.6 adds deterministic heavy-atom correspondence receipts and a synchronized native WebGL2 Transformation Lab for the first four source-backed decarboxylation edges:

- THCA-A → Δ9-THC
- CBDA → CBD
- CBGA → CBG
- CBCA → CBC

For each pair, the build step identifies the source carboxyl C/O/O heavy-atom group and computes an element- and connectivity-preserving isomorphism between the remaining source heavy-atom graph and the target heavy-atom graph.

**CORRESPONDENCE ≠ MECHANISM**

Hydrogen atoms, transition states, kinetic pathways, and physical morph trajectories are not inferred in v0.6.

See [docs/transformation-model.md](docs/transformation-model.md).

## Bond Delta Layer

Cannabiverse v0.7 extends the governed transformation receipts into deterministic heavy-atom bond accounting.

For each of the four decarboxylation pairs, v0.7 currently finds:

- 3 removed source heavy bonds;
- 1 scaffold-boundary bond;
- 2 bonds internal to the removed carboxyl fragment;
- 0 added target heavy bonds;
- 6 raw SDF single/double bond-order encoding differences;
- 0 promoted chemical bond-order changes.

**RAW SDF BOND-ORDER DELTA ≠ CHEMICAL BOND CHANGE ≠ MECHANISM**

The Transformation Lab exposes separate **Bond delta** and **Raw SDF order encoding** views so representation-level differences remain visible without receiving chemical authority they have not earned.

See [docs/bond-delta-model.md](docs/bond-delta-model.md).

## Scientific boundaries

Cannabiverse is an educational and research data project. It does not diagnose, prescribe, provide dosing instructions, or convert chemistry/mechanistic evidence into medical claims.

See [GOVERNANCE.md](GOVERNANCE.md) for the authority model and [docs/ontology.md](docs/ontology.md) for the graph vocabulary.

## License and citation

Code is released under the MIT License. Primary scientific sources retain their own licenses and citation requirements.

See [CITATION.cff](CITATION.cff) and `data/research/sources.json`.

## Oncology bridge with Cannabis as Sacred Medicine

A separate **v1 read-only oncology evidence feed** lives in [`data/oncology/evidence-v1.json`](data/oncology/evidence-v1.json) and powers the [Oncology Evidence Explorer](https://michaelwave369.github.io/Cannabiverse/app/oncology/) and [Cannabis as Sacred Medicine](https://michaelwave369.github.io/cannabis-as-sacred-medicine/#oncology). Claim IDs are stable and source receipts indicate review-vs-guideline origins; preclinical mechanisms never promote human-efficacy claims. See [the bridge contract](docs/oncology-evidence-bridge.md). Run `npm run validate:oncology` to check schema, source links, and canonical molecule targets.

## Φ Research Bridge v2

[Research Bridge Explorer](https://michaelwave369.github.io/Cannabiverse/app/bridge/) provides permanent-compound-ID navigation into existing, source-bounded evidence claims. The [v2 manifest](data/bridge/research-index-v2.json) references authoritative chemistry receipts, governed 3D conformers and the separate oncology-v1 evidence ledger, without duplicating or promoting claims. Sacred Medicine reads the same manifest to keep educational presentation in sync. See [the contract](docs/research-bridge-v2.md) and run `npm run validate:bridge`.

## Φ Research Bridge content release v3: Pain & ECS

An additional, separate [Pain & Endocannabinoid System evidence domain](https://michaelwave369.github.io/Cannabiverse/app/pain/) is published as [versioned source evidence](data/pain-ecs/evidence-v1.json) and registered with the **existing v2 stable transport manifest**. It distinguishes 2025 AHRQ clinical evidence, IASP's 2021 position, biological CB1/CB2 pathways, and NIH safety limitations. This is not a protocol or a change to the 145 canonical records. See [scientific governance](docs/pain-ecs-v1.md). `npm run validate:pain-ecs` runs in CI.

## Φ Research Bridge content release v4: Ancient Cannabis & Archaeochemistry

[Ancient Cannabis Evidence Explorer](https://michaelwave369.github.io/Cannabiverse/app/archaeology/) presents source-linked Tunnug 1 (2026), Jirzankal (2019), Pazyryk kurgan 2, and Herodotus records from [`data/archaeology/evidence-v1.json`](data/archaeology/evidence-v1.json). The v2 transport manifest is unchanged; content release is `4.0.0`. Ancient hair biomarkers, residue chemistry, excavation context, ancient texts, and interpretive disputes are separate evidence lanes. See [governance and limitations](docs/archaeology-v1.md) and run `npm run validate:archaeology`. **Ancient use does not establish medical efficacy.** The 145-molecule canon is unchanged.

## Cannabinoid Discovery Hypotheses v1 (research-only)

[Read the evidence-bound research plan](docs/discovery-hypotheses-v1.md), backed by [the source-governed hypotheses ledger](data/discovery/hypotheses-v1.json). Connects 2026 Tunnug ancient-seed sequencing, 2019 Jirzankal/Jiayi biomarker data, the 2025 cannabis pangenome and Kendrick filtering, and 2026 MassQL class-level discovery methods with **seven already provisional C7 targets**. Research predictions are falsifiable and retain reference receipts. No measured new compound, confirmed identity, occurrence, clinical effect, or permanent canon ID is asserted. Run `npm run validate:discovery`; the existing research bridge and 145 canonical molecular records remain untouched.

## Discovery Lab v0.1 — local-first mass-feature pattern screening

[Launch Discovery Lab](https://michaelwave369.github.io/Cannabiverse/app/discovery/) or [read its documented limits](docs/discovery-lab-v0.1.md). The browser workbench accepts local CSV feature metadata, computes CH₂ Kendrick mass defects and neutral-mass homolog spacing for singly charged protonated/deprotonated precursors, flags missing or low-quality blank/replicate information, and exports reproducible JSON reports. A **synthetic demonstration** is included. It displays the existing five governed discovery hypotheses and seven provisional records, but **does not claim to identify any compounds, analyze MS/MS spectra, run MassQL, or update chemistry canon**. Run `npm run validate:discovery-lab`. No user feature tables leave the browser.

## Discovery Lab v0.2 · local MGF / MS/MS screening

[Discovery Lab](https://michaelwave369.github.io/Cannabiverse/app/discovery/) can now read **locally selected MGF tandem mass spectra** as well as the existing CSV feature workbench. A read-only, openly licensed research dataset starting point is [MassIVE MSV000093886](https://massive.ucsd.edu/ProteoSAFe/dataset.jsp?task=22b747e8cb0b4524be77680d51a8883c); experimental data are **not automatically downloaded or analyzed**. The browser checks precursor charge/polarity and fragment peak lists, reports illustrative fragment-count screens and non-specific H₂O/CO₂ mass differences, and allows valid singly charged precursor m/z values to enter the v0.1 CH₂ spacing tool with QC marked unknown. Unknown charge is **not** assumed to be a proton adduct. Synthetic MS/MS fixtures, local JSON export, provenance input, automated tests and [scientific limitations](docs/discovery-lab-v0.2.md) are included. No molecular identities, provisional statuses or clinical claims are promoted. Run `npm run validate:msms`.

## Discovery Lab v0.3 · local MGF provenance and audit

A new [public research-data source ledger](data/discovery/public-data-sources-v1.json) registers the MassIVE cannabis dataset [MSV000093886](https://massive.ucsd.edu/ProteoSAFe/dataset.jsp?task=22b747e8cb0b4524be77680d51a8883c), its paper DOI, CC0 label, partial-public access status, and a related GNPS2 MGF workflow. The zero-dependency [offline CLI](scripts/audit-discovery-mgf.mjs) creates repeatable analysis reports for **user-supplied local MGF files**, containing their SHA-256, source accession **user assertion**, sample role **user assertion**, charge/polarity checks and v0.2 fragment / v0.1 neutral-mass screens. The output expressly says `NOT_AUTHENTICATED`; a local hash cannot prove sample origin or chemical identity. See [full use instructions](docs/discovery-lab-v0.3.md). No experimental files have been fetched or canon compounds promoted. Run `npm run validate:discovery-provenance`.

## Discovery Lab v0.4: measured reference spectrum benchmark

Our first **real experimental reference-spectra validation** uses three unchanged, **CC BY** [MassBank-data](https://github.com/MassBank/MassBank-data) records (Δ9-THC standard spectra from Eawag and the University of Athens) pinned to one source commit. We convert their original recorded peaks into MGF **in memory**, screen them with our existing MS/MS analyzer, and compare the positive/negative precursor neutral masses without mistaking a common standard for a new discovery. Upstream attribution and raw record files are preserved in [the source registry](data/discovery/references/massbank/manifest-v1.json); [method notes](docs/discovery-lab-v0.4.md) distinguish authentic published standard spectra from actual cannabis-extract measurements. Run `npm run validate:massbank-reference` and `npm run build:massbank-report`. Atlas CI publishes an auditable JSON **artifact**, but no unverified novel-cannabinoid claims. This benchmark is **not** the previously registered MassIVE cannabis extract dataset.

## Φ Leaf Morphology Lab v0.3

[Open Leaf Morphology Lab](https://michaelwave369.github.io/Cannabiverse/app/leaflab/) or read the [protocol and hypotheses](docs/leaf-morphology-lab.md). This separate, no-dependency browser workspace explores synthetic leaflet geometry, tooth modulation, paired-area symmetry, schematic vein lengths, normalized count comparisons, and locally annotated photograph tip positions. It exports SVG/JSON/CSV without transmitting photos.

**Synthetic geometry is not biological optimization, and manual photo annotation is not automatically verified botanical evidence.** Fibonacci and 3-6-9 remain falsifiable hypotheses. The chemistry canon, evidence lanes, and research bridge are unchanged. Run npm run validate:leaflab.

### LeafLab v0.2 · descriptive photo-to-model fitting

Imported local photo-tip JSON can now be reopened and fit against a bounded, deterministic leaflet-fan length/angle model. The app reports rotation-invariant observed fan spread, fitted fan/rotation/falloff/asymmetry, per-tip residuals and JSON export. **Fit quality is in-sample only and does not establish botanical predictive validity or 3-6-9/Fibonacci effects.** The source chemistry canon and all governed molecular evidence remain unchanged.

### LeafLab v0.3 · physical-scale measurements and specimen cohorts

Manually calibrate a ruler segment, trace numbered leaflet polygons, obtain approximate mm² areas/perimeters, and export versioned local specimen JSON. Import separate specimen records for descriptive comparison grouped by Plant ID, with CSV/JSON export. **These are manually traced image-plane estimates, not corrected 3D measurements or statistical findings.** The governed chemistry canon and evidence ledgers remain unchanged. [Protocol](docs/leaf-morphology-lab.md).


### LeafLab v0.4 · independent-plant held-out research audit

[Launch Research Audit](https://michaelwave369.github.io/Cannabiverse/app/leaflab/research.html) or read the [analysis protocol](docs/leaf-morphology-research-v04.md). This **separate static local-only application** imports manually marked tip-ray annotations into identified specimen/plant groups, trains only on the training plants, and evaluates conventional and golden-ratio *candidate* leaflet-length models on held-out plant IDs. It includes an exploratory 3-or-9-count comparison against non-cannabis controls, conditional exact label-permutation reference, and resampled uncertainty diagnostics. Labeled synthetic fixtures allow a functional demonstration but are **not real botanical observations**. No model evidence is promoted to the governed chemistry canon. Run npm run validate:leaflab-study.


### LeafLab v0.5 · independent marking reliability and truly separate evaluation files

[Open Quality Gate v0.5](https://michaelwave369.github.io/Cannabiverse/app/leaflab/quality.html) · [Read quality protocol](docs/leaf-morphology-quality-v05.md). Compare repeat tip annotations of the *same* image from masked-code observers, explicitly recording count mismatches and observer disagreement. Train a fixed candidate-model snapshot on one v0.4 study collection and score a separately imported collection of new Plant IDs with no refitting. The app rejects repeated training/test IDs and flags all synthetic examples; user-asserted identities and snapshot immutability **cannot be verified by software alone**. No real plant evidence or chemical canon changes. Run npm run validate:leaflab-quality.


### LeafLab v0.6 · offline segmented imaging and vein-like pixel networks

[Open Imaging Lab](https://michaelwave369.github.io/Cannabiverse/app/leaflab/imaging.html) · [Read imaging method notes](docs/leaf-morphology-imaging-v06.md). Upload a private local leaf photo, mark representative foreground/background colors and use a dependency-free connected-color region segmenter. Inspect **experimental dark ridge** candidates, thin them to a pixel skeleton and review proxy graph components, endpoint-like and junction-like pixels. Compare binary masks against same-image v0.3 manually traced leaflet polygons with IoU/Dice, then export mask PNG and experimental JSON. Synthetic image tests validate software behavior, **not real cannabis veins or vascular transport**. No images are uploaded and existing governed chemistry evidence remains unchanged. Run npm run validate:leaflab-imaging.


### LeafLab v0.7 · human-reference line benchmark versus simple detector baseline

[Open Vein Reference Benchmark](https://michaelwave369.github.io/Cannabiverse/app/leaflab/veins.html) · [Read method and limitations](docs/leaf-morphology-vein-benchmark-v07.md). Mark multiple possible vein-like centerlines on a local photo, export a SHA-256 image-byte-matched human annotation, and benchmark a **masked-local-contrast** detector against an untuned **global-mean-darkness** baseline with the same foreground mask and a declared distance tolerance. Both detector results contain human-reference precision, recall and F1, and exported reports can be summarized descriptively by Plant ID. The interface prevents importing a synthetic fixture as manual reference. **This is annotation agreement, not verified xylem, biological optimization, or empirical proof of Fibonacci/3-6-9.** No real specimen photos are bundled or uploaded. Run npm run validate:leaflab-veins. The governed molecular and medical evidence remain unchanged.


### LeafLab v0.8 · image-line geometric topology and fault tolerance

[Open Botanical Network Atlas](https://michaelwave369.github.io/Cannabiverse/app/leaflab/network.html) · [Read methodology and caveats](docs/leaf-morphology-network-atlas-v08.md). Load a v0.7 manual line-reference JSON, convert marked positions into a constrained undirected geometric graph (explicit shared vertices connect, visual crossings without vertices do not), and inspect image-pixel link length, shortest paths, graph cycles, connected components, and deterministic single-link failure impact. Compare against same-node Euclidean minimum spanning tree and best-centered star controls, with interactive clickable failure edges, JSON export and two clearly labeled **synthetic** demonstrations. This is abstract computer graph analysis, **not biological vascular flow or evidence that nature beats existing network engineering**. Governed molecular and clinical evidence are untouched. Run npm run validate:leaflab-networks.


### LeafLab v0.9 · Φ BioNetwork packet-routing simulator

[Open BioNetwork Simulator](https://michaelwave369.github.io/Cannabiverse/app/leaflab/packets.html) · [Read experimental protocol](docs/leaf-morphology-packet-sim-v09.md). Use the same image-derived graph coordinates for an annotated topology, Euclidean MST and centered star. Generate identical deterministic traffic demands for three **digital packet** routing strategies: shortest-distance, queue-aware and bridge-avoiding. Model explicit packet queues, link capacities and node or link outages. Compare delivered/dropped/unfinished packet counts, per-tick congestion and delivered-only latency; export full offline JSON reports. Whole-topology comparisons use identical node failures, while link-index faults are restricted to one topology. **This is simulated data, not validation of real cannabis veins, vascular physiology or deployed networks.** Run npm run validate:leaflab-packets. No governed molecular or clinical evidence is changed.


### LeafLab v1.0 · Network Engineering Lab

[Open Network Engineering Lab](https://michaelwave369.github.io/Cannabiverse/app/leaflab/engineering.html) · [Read v1.0 methodology](docs/leaf-morphology-engineering-v10.md). Compare shortest-distance, queue-aware and bridge-avoiding packet heuristics across annotated, Euclidean MST and centered-star topologies using the same reproducible demand per seed. New **per-link capacity allocations** allow each topology the **same total integer link-slot budget** rather than the previous equal capacity per link. Compare evenly spread versus short-link-biased allocations, uniform and hotspot traffic, up to five seeded stress runs, shared-node outages, aggregate delivery/loss variability and a transparent **capacity-weighted image-length cost proxy**. Descriptive across-seed SD is not a confidence interval, and equal slot counts do not imply equal physical installation costs. No real plant vascular performance or production network telemetry is asserted. Run npm run validate:leaflab-engineering; prior v0.9 simulator remains available and CI-gated.


### LeafLab v1.0 · Network Engineering Lab

[Open Network Engineering Lab](https://michaelwave369.github.io/Cannabiverse/app/leaflab/engineering.html) · [Read v1.0 methodology](docs/leaf-morphology-engineering-v10.md). Compare shortest-distance, queue-aware and bridge-avoiding packet heuristics across annotated, Euclidean MST and centered-star topologies using the same reproducible demand per seed. New **per-link capacity allocations** allow each topology the **same total integer link-slot budget** rather than the previous equal capacity per link. Compare evenly spread versus short-link-biased allocations, uniform and hotspot traffic, up to five seeded stress runs, shared-node outages, aggregate delivery/loss variability and a transparent **capacity-weighted image-length cost proxy**. Descriptive across-seed SD is not a confidence interval, and equal slot counts do not imply equal physical installation costs. No real plant vascular performance or production network telemetry is asserted. Run npm run validate:leaflab-engineering; prior v0.9 simulator remains available and CI-gated.


### LeafLab v1.1 · Propagation, priority and cost-capped transport engineering

[Open Φ Transport Engineering Lab](https://michaelwave369.github.io/Cannabiverse/app/leaflab/transport.html) · [Read simulation methodology](docs/leaf-morphology-transport-v11.md). Run local, seeded synthetic packet experiments on identical node positions: annotated geometry, Euclidean MST and centered star. Unlike the v1.0 equal-capacity-slot budget, v1.1 constrains every topology by the **same maximum capacity-weighted image-length cost**; actual spending and installed slots are shown separately. Set per-link propagation as image-length divided by a chosen pixels-per-tick scale, use **strict high/standard priority scheduling**, and audit packets still in flight when a node fails. Separate high/standard class delivery, loss and delivered-only latency are visible, with full conservation checks and bounded multi-seed comparisons. These are modeled assumptions, **not measured botanical transport or a deployed IP network**. Run npm run validate:leaflab-transport. Prior v0.9/v1.0 simulators remain independent and CI-gated.


### LeafLab v1.2 · Evidence & Validation Gateway

[Open Evidence Gateway](https://michaelwave369.github.io/Cannabiverse/app/leaflab/evidence.html) · [Read validation protocol](docs/leaf-morphology-evidence-v12.md). Import up to 36 v0.7 independent line-reference records and audit same-image observer agreement at declared pixel tolerances. Track **missing second reviews explicitly**, keep multiple image annotations grouped by the same asserted plant, and require researcher-assigned development/holdout roles for whole plants, with hash, specimen and plant leakage guards. Optionally import v0.7 detector reports with matching source IDs and consistent algorithms/thresholds, and summarize descriptive plant-weighted development and holdout reference-relative F1. These are **unsigned user-supplied reports**, not recomputed or independently authenticated observations. No actual botanical specimens ship with this release; the supplied demo is synthetic. This does not certify vein anatomy or true untouched holdout status. Local-only JSON inputs/exports; run npm run validate:leaflab-evidence. Governed chemistry and medicine remain untouched.


### LeafLab v1.3 · Original-photo Specimen Provenance Lab

[Open Φ Specimen Provenance Lab](https://michaelwave369.github.io/Cannabiverse/app/leaflab/specimens.html) · [Read source-image collection protocol](docs/leaf-morphology-provenance-v13.md). Register original source photographs with a browser-local **SHA-256 digest of their actual bytes**, decoded dimensions, v0.7 downsample dimensions and structured metadata for plant/photo IDs, capture dates, imaging conditions, claimed identification basis, permission and blinded annotation procedure. Reopen imported metadata and recheck the *actual original file* locally; link v0.7 independent observer annotation JSON by exact hash, source image/specimen/plant identity and processing geometry. Audit source photos for incomplete protocol fields, missing independent observers and source-file checks performed in the current browser session. No file or image upload, no real plant dataset and no authenticated species or hydraulic-flow evidence are claimed. The governed medical and molecular evidence stays unchanged. Run npm run validate:leaflab-specimens.
