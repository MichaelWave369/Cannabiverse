# Transformation Lab

Cannabiverse v0.6 visualizes governed heavy-atom correspondence receipts.

## Initial transformation set

- THCA-A → Δ9-THC
- CBDA → CBD
- CBGA → CBG
- CBCA → CBC

All four are existing source-backed `DECARBOXYLATES_TO` graph edges.

## Views

- **Element colors + change** — ordinary element colors with removed source heavy atoms emphasized.
- **Retained scaffold** — mapped heavy atoms shown in green.
- **Change region** — source heavy atoms defined as removed by the correspondence receipt pulse in red; other atoms are dimmed.

## Important boundary

**CORRESPONDENCE ≠ MECHANISM**

The two checked-in conformers are shown under synchronized camera motion. Cannabiverse does not morph one physical 3D conformer through a claimed reaction trajectory.

v0.6 maps heavy atoms only. Explicit hydrogens remain outside the atom-correspondence claim.


## v0.7 bond delta

The Transformation Lab now consumes `bond_delta_receipts.json` and adds two views:

- **Bond delta** — highlights receipt-defined removed source heavy bonds, scaffold-boundary bonds, retained mapped connectivity, and any added target heavy bonds.
- **Raw SDF order encoding** — highlights mapped bonds whose source and target SDF files use different numeric bond-order encodings.

Raw SDF order differences remain representation-level and are not promoted to chemical bond-change claims.
