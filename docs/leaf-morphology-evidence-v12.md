# Φ LeafLab v1.2 · Evidence & Validation Gateway

**Evidence status:** no real plant photographs, blinded human annotations, or independently verified botanical datasets are bundled. This gateway audits the consistency of **user-supplied** line drawings and numeric detector reports. It does not certify species, real vascular anatomy, image origin or observer independence.

[Open the local Evidence & Validation Gateway](../app/leaflab/evidence.html). The browser-only workbench extends [v0.7 human reference files](../app/leaflab/veins.html) without modifying Cannabiverse's chemistry or clinical evidence.

## Workflow and required provenance

Export one v0.7 vein-reference JSON file **per observer per original image**. The original image SHA-256 is computed in the v0.7 photo workbench, but in v1.2 it is merely **read from unsigned JSON**. There is no independent verification against original bytes, human identity or botanical species in this workbench.

Use one stable Plant ID for every photo of one physical plant. Each original image must have a distinct Specimen ID, even if two photos show the same plant.

The intake validates 1–36 records, at most three observers on each image, one distinct masked code per observer per image, and consistent specimen/plant/processing-frame information per hash. It rejects mixed synthetic/manual origins, duplicated observer-and-hash records, a specimen reused for two different photo hashes, and conflicting image metadata.

### Independent review agreement

For each photo with two or three observers, the gateway rasterizes every human-drawn polyline and compares each unique observer pair with the existing v0.7 symmetric line-agreement scorer. Matching tolerance is selectable from zero to three **processing pixels**. Reports include pairwise precision, recall, F1 and the mean pair F1 for that photo. Plant-level means average the photo-level means, explicitly separating paired and unpaired photos.

A photo with only one observer has status **INDEPENDENT_REVIEW_MISSING**, not perfect agreement, and it is excluded from interobserver mean scores. Agreement only establishes visual correspondence between two user-supplied masks, not genuine vein identity or independent/blinded annotation.

Synthetic fixtures use two imaginary plants, four mock annotations, and one-pixel-shifted lines. Their paired F1 is zero at zero-pixel tolerance and one at one-pixel tolerance. These are **software unit tests, not cannabis measurements**.

### Explicit whole-plant split

Researchers must assign **every** imported plant to exactly one role: development or holdout. At least one plant of each role is required. All image hashes and observer references for a given plant retain the same role. Missing, unknown or overlapping plant IDs, and tampered source-hash assignments, are rejected.

The exported partition has status **SELF_DECLARED_PLANT_SPLIT_NOT_CRYPTOGRAPHICALLY_FROZEN**. An exported file is not preregistration. The app cannot demonstrate that an observer was independent, that the plant identities are real, or that someone has not already tuned parameters using the holdout records. A confirmatory study needs independently verified source records and an externally preregistered protocol.

### Optional v0.7 detector-score evidence

Up to 72 saved v0.7 detector benchmark JSON files may be added after annotation intake. Each report must match a known image SHA-256, specimen, plant, masked observer and processing dimensions, with correct synthetic/manual status.

The gateway requires identical declared **foreground margin**, **ridge contrast**, **minimum ridge component size**, and **line-match tolerance** across reports. It rejects duplicate observer/image reports, missing source references and parameter drift.

Reports include precomputed reference-relative F1 values for the frozen masked-local-ridge detector and the global-darkness baseline. The summary computes a descriptive **mean score per plant**, then **mean of plant means** separately for development and holdout. It always reports the number of contributing plants versus assigned plants. Unmeasured plants are excluded and counted, not given invented scores.

**Major limitation:** the numeric detector reports are user-editable, **unsigned JSON**. The gateway does **not** rerun the detector on the original photo, independently validate a vessel, or authenticate the reported score. Synthetic/manual origins are handled separately. No score establishes a biological or engineering advantage.

### Privacy and exports

The browser loads local JSON only and downloads three possible outputs:

1. Observer agreement report, including image hashes, masked observer pairs and incomplete review flags.
2. Explicit user-declared development/holdout plant partition.
3. Descriptive detector comparison report with nulls for missing evidence and an explicit unverified-score warning.

The original photographs are not opened, embedded or uploaded by v1.2. No remote fetch calls or telemetry exist. Source hashes and observation metadata can still identify private work and should be shared with care.

### Research next steps

Collect legally and ethically sourced real images with recorded botanical identification, location/stage metadata, controlled capture conditions and explicit permission to analyze. Obtain blinded independent annotations; verify actual junction anatomy with appropriate expert review or imaging; preregister a plant-level split and algorithm choices **before** evaluating untouched plants; and report disagreement, negative results, uncertainty, and external controls.

Only then can image-derived graphs be meaningfully compared with actual, physically constrained engineering networks.

No Fibonacci, 3-6-9, cannabis optimum, verified vascular flow, medical efficacy or telecommunication superiority claim follows from this gateway.

Run npm run validate:leaflab-evidence for its synthetic annotation/partition checks, and npm run validate for the complete Cannabiverse gate.
