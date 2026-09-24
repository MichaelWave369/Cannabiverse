# Governed Transformation Correspondence

Cannabiverse v0.6 introduces atom-level **heavy-atom correspondence receipts** for a deliberately narrow transformation set.

## Prime rule

**CORRESPONDENCE ≠ MECHANISM**

A correspondence receipt can establish that a heavy-atom subgraph in one checked-in structure corresponds to a heavy-atom subgraph in another checked-in structure.

It does not, by itself, establish:

- a reaction mechanism;
- a transition state;
- reaction kinetics;
- an atom-by-atom hydrogen-transfer path;
- a physical conformational trajectory between the two 3D conformers.

## v0.6 scope

The first release covers four source-backed decarboxylation edges already present in the Cannabiverse graph:

- THCA-A → Δ9-THC
- CBDA → CBD
- CBGA → CBG
- CBCA → CBC

## Deterministic correspondence

`scripts/build-correspondence.mjs` reads the checked-in SDF molecular graphs.

For each v0.6 decarboxylation spec it:

1. identifies the unique source carbon bonded to two oxygens with one single and one double C–O bond;
2. marks that carbon and both oxygens as the source carboxyl heavy-atom group;
3. removes those three heavy atoms from the source graph;
4. computes a deterministic element- and connectivity-preserving graph isomorphism between the remaining source heavy atoms and every target heavy atom;
5. writes the resulting source-atom → target-atom correspondence receipt.

Bond order is not used to assert mechanistic correspondence in v0.6.

Explicit hydrogens are intentionally excluded from atom mapping.

## Authority

The transformation receipt inherits its direction, relation, evidence lane, confidence, and scientific source from the existing governed Cannabiverse graph edge.

Visualization consumes the receipt. It does not generate the receipt.
