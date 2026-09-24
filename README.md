# Cannabiverse

**Cannabiverse** is a governed, source-aware knowledge graph for Cannabis phytochemistry.

The project began as the Cannabinoid Ledger369 / Cannabis Phytochemical Atlas369 research line and is now being developed as a reproducible public dataset plus research explorer.

> **IDENTITY ≠ OCCURRENCE ≠ BIOSYNTHESIS ≠ BIOACTIVITY ≠ HUMAN EFFECT ≠ SAFETY**

## Current bootstrap

The first repository release imports a reconciled cannabinoid graph with:

- 145 confirmed canonical Atlas records
- 125 frozen historical baseline records
- 20 confirmed post-baseline additions
- permanent `CPA-CAN-####` identifiers
- aliases and homolog-series memberships
- typed chemical/biosynthetic relationships
- provisional/search-target records
- source receipts and reconciliation history
- an offline Query Explorer
- deterministic integrity checks

**145 is a release count, not a claim that only 145 phytocannabinoids exist.** Different scientific inventories use different inclusion rules and newer literature reports larger sets.

## Repository map

```text
data/graph/        governed machine-readable release
data/schemas/      entity contracts
scripts/           integrity validation
app/explorer/      standalone scientific explorer
docs/              architecture and governance
.github/workflows/ CI gates
```

## Validate

```bash
python scripts/validate_atlas.py
```

## Governance

See [GOVERNANCE.md](GOVERNANCE.md). Cannabiverse treats uncertainty as data. A compound, relationship, or effect claim is never granted more authority than its evidence supports.

## Scope

Cannabiverse is an educational and research project. It is not medical advice, a dosing system, or a substitute for professional medical, toxicological, regulatory, or legal review.
