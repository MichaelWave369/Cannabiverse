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
- **14** registered scientific sources in the current source ledger\n- **11** governed PubChem 3D conformers rendered through native WebGL2

**145 is not a claim that only 145 phytocannabinoids exist.** Different inventories use different inclusion rules; later literature describes broader inventories.

## Live site

**Cannabiverse:** https://michaelwave369.github.io/Cannabiverse/

- Research Explorer: https://michaelwave369.github.io/Cannabiverse/app/explorer/
- Evidence Explorer: https://michaelwave369.github.io/Cannabiverse/app/evidence/\n- 3D Molecule Viewer: https://michaelwave369.github.io/Cannabiverse/app/molecules/

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
  schemas/            JSON contracts\n  structures/         governed 3D structure records + local SDF conformers

app/explorer/          browser-based Cannabiverse Query Explorer
app/evidence/          source / claim Evidence Explorer\napp/molecules/         native WebGL2 molecule viewer
docs/                  ontology and governance documentation
scripts/               deterministic validation
.github/workflows/     scientific-integrity CI
```

## Validate locally

No dependency installation is required.

```bash
npm run validate
```

The validation gate checks permanent IDs, the frozen baseline, source resolution, graph endpoints, evidence vocabulary, provisional separation, hypothesis-edge discipline, deterministic claim projections, and the governed 3D structure layer including SDF atom/bond counts and non-flat 3D coordinates.

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

## Scientific boundaries

Cannabiverse is an educational and research data project. It does not diagnose, prescribe, provide dosing instructions, or convert chemistry/mechanistic evidence into medical claims.

See [GOVERNANCE.md](GOVERNANCE.md) for the authority model and [docs/ontology.md](docs/ontology.md) for the graph vocabulary.

## License and citation

Code is released under the MIT License. Primary scientific sources retain their own licenses and citation requirements.

See [CITATION.cff](CITATION.cff) and `data/research/sources.json`.
