# Cannabiverse Molecules

Native **WebGL2** molecular structure viewer.

## v0.4 initial structure set

The viewer currently ships governed 3D conformers for:

- CBGA
- THCA-A
- Δ9-THC
- CBD
- CBDA
- CBG
- CBC
- CBCA
- CBN
- THCV
- THCP

The coordinate files are checked into `data/structures/conformers/` and indexed by `data/structures/structure_index.json`.

## Rendering

No 3D rendering framework is required. The browser:

1. loads a checked-in PubChem SDF V2000 3D conformer;
2. parses atom coordinates and bond topology;
3. centers the structure;
4. renders sphere and cylinder meshes through a native WebGL2 shader pipeline.

Modes:

- ball & stick
- space filling
- sticks
- explicit hydrogen toggle
- auto rotation
- mouse/touch rotation
- wheel zoom
- PNG capture

## Authority boundary

The viewer is a consumer of sourced structure coordinates.

**RENDERABLE STRUCTURE ≠ OCCURRENCE ≠ BIOSYNTHESIS ≠ BIOACTIVITY ≠ HUMAN EFFECT ≠ SAFETY**

A rendered structure does not upgrade any scientific evidence lane.


## Compare Lab

`compare.html` adds synchronized two-molecule viewing.

It shares camera rotation and zoom between two independently centered conformers and joins the visual comparison to the governed graph/homolog data.

The Compare Lab reports measured structure deltas but does not perform atom correspondence or reaction mapping.


## Transformation Lab

`transform.html` consumes deterministic heavy-atom correspondence receipts.

The first v0.6 release covers four decarboxylation pairs and can highlight:

- retained mapped heavy atoms;
- receipt-defined removed source C/O/O atoms;
- source/target formula and mass change;
- the exact source-backed transformation graph edge;
- the full source-atom → target-atom mapping table.

**CORRESPONDENCE ≠ MECHANISM.**
