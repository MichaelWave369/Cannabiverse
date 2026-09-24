# Molecule Compare Lab

Cannabiverse v0.5 adds a synchronized native WebGL2 comparison workspace.

## What it does

- renders two governed 3D conformers side by side;
- synchronizes rotation and zoom while centering each conformer independently;
- detects an explicit Cannabiverse graph edge between the pair when one exists;
- otherwise detects shared governed homolog-series membership;
- shows molecular-weight, atom-count, bond-count, and element-count deltas;
- preserves source provenance for both structures;
- exposes governed comparison presets.

## What it does not do

The Compare Lab does **not** perform atom mapping, molecular superposition, reaction simulation, or mechanistic inference.

Synchronized camera orientation is a viewing aid only.

A formula or element-count difference does not establish which individual atom is lost, gained, or transformed. That would require a separately governed correspondence or reaction-mapping receipt.

## Presets

The initial preset set includes:

- THCA-A → Δ9-THC
- CBDA → CBD
- CBGA → CBG
- CBCA → CBC
- Δ9-THC → CBN
- THCV ↔ Δ9-THC
- Δ9-THC ↔ THCP
