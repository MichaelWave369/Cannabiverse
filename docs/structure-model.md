# Molecular Structure Layer

Cannabiverse v0.4 introduces a governed molecular structure layer for visualization.

## Rule

**RENDERABLE STRUCTURE ≠ OCCURRENCE ≠ BIOSYNTHESIS ≠ BIOACTIVITY ≠ HUMAN EFFECT ≠ SAFETY**

The presence of coordinates means Cannabiverse can render a sourced structural representation. It does not strengthen any other evidence lane.

## Structure records

`data/structures/structure_index.json` maps permanent Atlas IDs to:

- molecular formula and molecular weight;
- isomeric and connectivity SMILES;
- InChI and InChIKey;
- source database record;
- local 3D conformer path;
- declared atom/bond counts;
- retrieval date.

## Conformer provenance

The initial v0.4 conformers are PubChem 3D SDF records stored locally under:

`data/structures/conformers/`

Checking the coordinates into the repository has three advantages:

1. the public viewer does not require a live third-party structure API;
2. releases remain reproducible;
3. CI can validate that the rendered file actually matches the declared Atlas structure record.

## WebGL2 renderer

`app/molecules/index.html` implements a dependency-free WebGL2 renderer.

It parses SDF V2000 atom and bond records in the browser and constructs GPU sphere/cylinder geometry. It does not infer molecular structure from the compound name.

## Expansion rule

A new 3D structure is added only with:

- a canonical `CPA-CAN-####` target;
- explicit structure provenance;
- stable identifiers;
- a checked-in conformer;
- validator acceptance.

Missing render coverage is represented as missing render coverage, not missing chemistry.
