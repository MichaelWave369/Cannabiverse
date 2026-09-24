# Cannabiverse

**A governed, source-aware map of Cannabis phytochemistry.**

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

**145 is not a claim that only 145 phytocannabinoids exist.** Different inventories use different inclusion rules; later literature describes broader inventories.

## Live site

**Cannabiverse:** https://michaelwave369.github.io/Cannabiverse/

- Research Explorer: https://michaelwave369.github.io/Cannabiverse/app/explorer/
- Evidence Explorer: https://michaelwave369.github.io/Cannabiverse/app/evidence/
- 3D Molecule Viewer: https://michaelwave369.github.io/Cannabiverse/app/molecules/
- Molecule Compare Lab: https://michaelwave369.github.io/Cannabiverse/app/molecules/compare.html
- Transformation Lab: https://michaelwave369.github.io/Cannabiverse/app/molecules/transform.html

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

The validation gate checks permanent IDs, the frozen baseline, source resolution, graph endpoints, evidence vocabulary, provisional separation, hypothesis-edge discipline, deterministic claim projections, governed 3D structures, comparison presets, and deterministic heavy-atom transformation correspondence.

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

## Scientific boundaries

Cannabiverse is an educational and research data project. It does not diagnose, prescribe, provide dosing instructions, or convert chemistry/mechanistic evidence into medical claims.

See [GOVERNANCE.md](GOVERNANCE.md) for the authority model and [docs/ontology.md](docs/ontology.md) for the graph vocabulary.

## License and citation

Code is released under the MIT License. Primary scientific sources retain their own licenses and citation requirements.

See [CITATION.cff](CITATION.cff) and `data/research/sources.json`.
