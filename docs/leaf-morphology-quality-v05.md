# Φ LeafLab Quality Gate v0.5

**Research status: local-first measurement quality and external-dataset evaluation tooling.** No biological data are collected by the project and no mathematical law is claimed.

This is a separate static application at [LeafLab Quality Gate](../app/leaflab/quality.html). It does not modify the canonical Cannabiverse chemistry records, source receipts, medicine evidence, or research bridge.

## Part A: repeatable annotation and observer disagreement

The original [Leaf Morphology Lab](../app/leaflab/) exports manual-photo-tip-annotation JSON with a hub and 3–20 marked tips. To test repeatability:

1. Photograph one leaf once, flat and in focus. Retain the original unaltered image and keep image orientation unchanged. Each observer opens this **same** image independently, without seeing anyone else's marks.
2. Have each observer export a separate manual tip-annotation JSON. Use a **Specimen ID** to identify the actual leaf, a **Plant ID** for the parent plant, and an **Image ID** for the exact shared source photograph. Assign masked **Observer codes** to avoid including personal names.
3. Import each annotation into Quality Gate with the shared specimen/plant/image IDs and observer-specific code. At least two distinct observer records are needed for one specimen.
4. Run the disagreement audit. For each pair of observers on a specimen, compare hub displacement (image display units), the mean absolute deviation of *relative* tip lengths, and the mean absolute deviation of adjacent tip-angle gaps. Sorting rays by angle makes the angle-gap comparison robust to wraparound.
5. If observers mark **different tip counts**, the disagreement is recorded explicitly and the relative-length and angle-gap comparison for that pair is withheld. This is a result, not an error to hide. A specimen with one observer is excluded from the pairwise audit with a stated reason.
6. The report shows specimen-level and plant-level descriptive summaries. Where at least 3 plant IDs yield comparable specimen measurements, the app reports a deterministic 1,000-replicate whole-plant resampling percentile interval for mean length disagreement. **It is exploratory and not an independently validated uncertainty bound.**

The tool cannot authenticate observer independence or whether all inputs came from the same photo. Different rotations, cropping and scale can make hub offsets meaningless; relative angles may still be comparable, but the protocol requires a single image. User-supplied IDs are not proof of identity. Multiple observer pairs and multiple leaves on one plant are **not independent biological replicates**.

All files are selected and processed locally. Collections and reports contain marked coordinates and opaque IDs, **not original photographs**. There is no network upload, database, or automatic persistence. Export your work before closing.

## Part B: fixed snapshot and external test collection

The [Research Audit v0.4](../app/leaflab/research.html) established a deterministic split *within* a study collection. The new quality gate separates training and test data into **two independently provided collections**.

1. In the v0.4 study builder, create a **training** study collection from 5 or more distinct plants. All observations in the training file must have the **same group and complete leaflet count**. The app never quietly drops rows that don't fit these choices.
2. Select that group and leaflet count and fit a **fixed snapshot**. The export contains the training plant IDs, training specimen IDs, angular-gap model and the predeclared geometric formulas with their frozen trained parameters and relative predictions.
3. Save the snapshot JSON **before viewing external results**. Store the file and its hash or an immutable dated copy outside the web app if you need evidence of preregistration. The app itself does **not** digitally sign snapshots or guarantee immutability.
4. Create a **new external test collection** of 3 or more different plant IDs, using the same group, leaflet count and observation origin. Import it separately and evaluate.
5. The code rejects any repeated Plant ID or Specimen ID between training and external collections. It refuses mismatched groups, counts, demo/manual origins, malformed coordinates and forged predicted model values. **No external data are allowed to refit the four models.**
6. Export the external evaluation report. It includes test plant IDs, plant-level errors, group/count/score definitions and exploratory plant-resampling diagnostics.

The competing formulas remain those explicitly defined in v0.4:

- Uniform tip lengths, all equal.
- Fitted linear falloff with bounded training-only falloff.
- Fitted curved and asymmetric falloff with bounded training-only coefficients.
- Fixed symmetric golden candidate with exponent φ raised to the negative absolute leaflet-rank position.

Model comparisons use **relative tip lengths**, not whole-leaf morphology, actual physical length, venation or photosynthetic efficiency. All models use a common learned mean angular gap. Lower external plant-level error can be informative but does not establish a universal biological pattern.

**Critical limitations:** Distinct user-entered IDs cannot prevent someone from reusing the same plant under another ID. An exported snapshot is ordinary mutable JSON, so a later file is not authenticated as having been created before data inspection. A test set is no longer untouched if users repeatedly inspect results while adjusting models or selection. Only an independent collection protocol, timestamped provenance, appropriate controls and external replication can address those problems. With as few as three test plants, resampling intervals can be highly unstable and are not confirmatory significance tests.

## Synthetic demonstration, not empirical evidence

The re-annotation demo creates five entirely synthetic examples with two artificial observer marks each, and the external-evaluation demo partitions ten existing synthetic v0.4 seven-leaflet examples into six labeled training plant IDs and four disjoint test plant IDs. Every associated output is explicitly marked SYNTHETIC_DEMONSTRATION. The demos do not contain observed cannabis leaves.

Synthetic/manual mixing is rejected. Never relabel synthetic output as a real botanical finding.

## Next experimental readiness milestones

- Record documented source-image checksums, camera perspective, flatness, ruler calibration, growth stage, leaf position and taxon identification.
- Obtain two independent annotations per image with an explicit masking protocol, then quantify disagreements prior to choosing model family.
- Capture a genuinely new test cohort *after* the model snapshot has been archived and timestamped; keep full collections and analysis versions together.
- Include matched palmate-leaf controls, negative results, outliers and incomplete images, and avoid treating several leaves from one plant as several independent plants.
- Pre-register sample sizes, exclusions and error metrics to guard against repeated-selection bias.

Run `npm run validate:leaflab-quality` for the v0.5 deterministic regression gate. Existing v0.1–v0.4 regression checks remain separate. All tools are static ES modules and work offline when served from a local static HTTP server.
