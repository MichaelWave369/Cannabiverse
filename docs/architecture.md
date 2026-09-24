# Architecture

Cannabiverse separates **authority-bearing scientific data** from the software used to explore it.

```text
sources
   ↓
source receipts
   ↓
canonical compounds ── typed relationships
   ↓                         ↓
aliases / homologs      evidence lanes
   \_______________________/
               ↓
       governed graph JSON
               ↓
    explorers / query tools / PhiOS
```

## Repository layers

- `data/graph/`: canonical machine-readable graph releases.
- `data/schemas/`: validation contracts for major entity types.
- `scripts/`: deterministic integrity checks.
- `app/explorer/`: a consumer of the data, never the authority layer.
- `docs/`: ontology, evidence and reconciliation specifications.
- `.github/workflows/`: integrity gates.

## Design rule

The explorer may render, filter, compare, and traverse scientific records. It must not silently rewrite their evidence authority.

## Graph model

The graph contains:
- compound nodes,
- process/precursor/enzyme nodes,
- typed relationship edges,
- source receipts,
- aliases,
- homolog-series memberships,
- provisional candidates,
- reconciliation events,
- known curation issues.

A graph edge is treated as a first-class claim with provenance.
