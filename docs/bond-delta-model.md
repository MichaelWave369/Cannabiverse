# Governed Bond Delta Layer

Cannabiverse v0.7 extends v0.6 heavy-atom correspondence into deterministic **bond accounting**.

## Prime boundary

**RAW SDF BOND-ORDER DELTA ≠ CHEMICAL BOND CHANGE ≠ MECHANISM**

The checked-in SDF files contain concrete connectivity and bond-order encodings. Cannabiverse may compare those encodings, but it does not automatically promote every single/double-order difference into a chemical transformation claim.

## What v0.7 earns

For each governed decarboxylation receipt, `scripts/build-bond-deltas.mjs` classifies heavy-atom bonds into:

- retained mapped bonds with the same raw SDF order;
- source heavy bonds removed with the source fragment;
- scaffold-boundary bonds connecting the removed fragment to retained mapped atoms;
- target heavy bonds not present in the mapped source graph;
- raw mapped SDF bond-order encoding differences.

## Current decarboxylation result

Each of the four v0.7 pairs yields:

- 3 removed source heavy bonds;
- 1 of those is the boundary bond to the retained scaffold;
- 2 are internal to the removed carboxyl fragment;
- 0 added target heavy bonds;
- raw mapped single/double-order differences that remain **representation-level only**.

The raw order differences are retained in the ledger because hiding them would be dishonest. They are not promoted because v0.7 does not yet canonicalize resonance/Kekule-equivalent bond-order representations.

## Why this matters

A molecule file is a representation. A difference between two representation files is not automatically a difference in chemical authority.

Cannabiverse therefore records:

```text
file-level difference
        ↓
representation receipt
        ↓
possible future normalization / evidence
        ↓
only then: promoted chemical bond-change claim
```

Visualization consumes the receipt. It does not decide the scientific meaning.
