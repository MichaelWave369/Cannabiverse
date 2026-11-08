# Φ LeafLab v1.6 · Complete Human Reference Masks

**Status:** standalone local-photo **full-frame human contour reference protocol**, not certified botanical truth. No original photograph bytes, independently collected expert annotations or biological vessel masks are committed to the repository.

[Open the Full-Reference Mask Lab](../app/leaflab/full-masks.html) · [Original source photo library](../app/leaflab/real-photos.html) · [Sparse QA v1.5](../app/leaflab/real-image-qa.html)

## What “complete” actually means

In v1.5, the only scored image pixels were individual sparse hand-marked areas. In v1.6, a human reviewer can draw a **complete segmentation reference** using polygons. Inside the selected target's included boundaries, pixels are labeled leaf. Outside those areas, or inside explicitly subtracted holes, pixels are labeled non-leaf. The tool uses pixel-center rasterization on the same aspect-preserving, max-320-pixel downsample as the image-processing workbench.

This is **complete labeling by an observer's declared outline**, **not proof that every true leaf was identified**. A person can overlook leaves, include non-leaf areas, or choose a different target. The user explicitly affirms that they examined the entire frame and marked all regions of the chosen target definition. The checkbox is a self-attestation.

The target definition must be **single-prominent-leaf** or **all-visible-leaves**. These should not be mixed across reviewers, since the second photo may contain multiple overlapping leaves. Human drawings cannot authenticate the species, plant identities, connected veins, photos' original provenance or biological leaf geometry.

## Exact file identity

Reviewers open an original image file with the browser file picker. Its **original bytes are hashed locally with Web Crypto SHA-256** before a mask can be exported. The original decoded image dimensions and byte count are checked against the two v1.4 previously downloaded original Wikimedia Commons files when hashes match those catalog items. Other local images remain explicitly flagged as unlisted sources; they can be analyzed, but source licensing and taxon identity are not authenticated.

The independently checked Wikimedia original files in the starter pack are:

- Public domain detached leaf, SHA-256: 4dec1eade2d3aa0b3690f5c392c832c1602692dd35306e032af543c6dead02ff.
- Lode Van de Velde CC0 foliage photo, SHA-256: 3bedc723200f9f98502218e6a754b6c2c7f12907020eae5bc892758a2c6fcdf6.

User-exported mask references include their original hash, original dimensions, source ID if known, processing frame and metadata. **Importing a mask JSON does not independently recheck the photograph's original bytes.** An imported hash is a claim until the original image file is opened and rehashed.

## Human annotation workflow

1. Open the original photograph locally.
2. Declare one stable **Plant ID** for the actual plant, a distinct **Photo/Specimen ID** for each photograph, and a **masked observer code**. Do not embed personally identifying information. Declare one of the two target definitions and a user-declared development/holdout role.
3. Click **Add leaf area** and choose three or more image vertices on the target leaf. Click **Close polygon**. Repeat for disconnected leaf areas. The app rejects malformed, self-intersecting, zero-area and out-of-frame shapes and limits polygons/vertices to protect browser responsiveness.
4. Click **Subtract non-leaf** to cut holes/background from previously included areas where needed. Sequential include/exclude order is respected.
5. Inspect the **Filled full mask** overlay against the original. If necessary, undo the last polygon and redraw. The binary mask is generated only from manual polygons, not from model suggestions.
6. Confirm the explicit whole-frame completion checkbox and **Finalize & export reviewer JSON**. The resulting mask includes a human assertion of completion and compact polygon geometry, **not original photo bytes or an automatically detected contour**. This reviewer record is automatically added to the current browser session's imported cohort.
7. Have a second reviewer repeat the procedure on **the exact same original file**, ideally separately and without seeing the first person's annotation or any detector predictions. The software cannot verify that independence, although both observers can self-attest their procedure.
8. Import the two completed reviewer JSONs into the lab, open the original photo again, and select **Audit two reviewers**. Any difference in original file hash, photo/plant identity, image dimensions, target definition, review role, or masked code uniqueness is rejected.
9. Inspect red **reviewer A-only** and cyan **reviewer B-only** regions. Green marks both reviewers' shared leaf areas. Report pairwise image-level IoU and Dice, disagreement pixels, and count of shared/nonshared leaf and background pixels.
10. If desired, after two references are imported, choose one leaf-color pixel, one background-color pixel and a color separation margin to run the unchanged v0.6 seeded segmentation. Score the model **separately against reviewer A and reviewer B**; show the two IoU/Dice scores and a descriptive min/max range.

### No hidden model-assisted tracing

Version 1.6 explicitly restricts baseline model scoring to **after** two human references have been supplied. Reviewers can see their own filled manual contours during tracing but do not see algorithm predictions through the app's editor. This sequencing alone does **not prove** they have never seen an algorithm overlay before, in another tab, or in another session.

## Mathematical definitions

On each complete binary human mask, every processing pixel is assigned to leaf or background. Agreement between two human masks reports:

- both-leaf pixels, A-only leaf pixels, B-only leaf pixels, and both-background pixels;
- pairwise IoU = intersection of leaf pixels / union of leaf pixels;
- Dice = twice intersection / (A leaf pixels + B leaf pixels);
- total disagreement pixels and overall pixel agreement.

Model scoring uses the first two distinct alphabetically ordered masked observer references matching the open original image's SHA-256 and processing frame. With more than two reviewers, the **cohort audit** compares all pairs (at most three observers per image); the interactive model comparison uses the first two. Its confusion matrix uses model positives and the selected human reference (not a verified biological image mask), reporting TP, FP, FN, TN, IoU, Dice, precision, recall and specificity **per observer**.

Reference disagreement is **not ground truth error**, and model-vs-observer overlap is not automatically real-world accuracy. The observed two-reference min/max range is **not a confidence interval**, because the observer masks may be correlated or both scientifically wrong.

## Whole-plant development/holdout structural audit

An optional cohort import supports 1–72 complete-reference JSON files, at most three distinct observer codes per photo. It checks:

- one original-image hash and photo ID per photograph;
- unique hash-plus-observer combinations;
- compatible source dimensions, target definition, processing frame and declared role for each image;
- one unchanging development/holdout role for **every asserted Plant ID** across all images;
- explicit unpaired-photo counts, so one human record is never treated as adequate independent review.

Separate photographs of one plant may belong to the same biological source. **Self-declared Plant IDs can be wrong.** Structural leakage checks do not establish that supposedly different plant IDs are different physical plants, that the cohort was preregistered, or that holdout data were never seen by a model developer.

## Exports and research limits

- **Reviewer JSON**: full-frame contour polygons, masked code, original photo hash, target, plant/photo IDs, role and completion declaration.
- **Pair review JSON**: image identity, observer codes, disagreement and overlap counts. The full raster disagreement image is intentionally not embedded in exported JSON.
- **Baseline-vs-two-references JSON**: exact model color seeds/margin, per-reviewer confusion and IoU/Dice plus observed range.
- **Cohort audit JSON**: per-photo reviewer coverage and plant-level role consistency.

No photograph, model inference request, mask upload or tracking telemetry is sent to a server. The source file bytes are processed locally. User-exported JSON is **unsigned and editable** and should not be described as validated laboratory ground truth. The application does not collect verified botanical taxon documents, scale-bar calibrations, xylem, phloem, or physiological flow.

## Reproducibility and next evidence

Run npm run validate:leaflab-full-masks for deterministic synthetic-shape unit tests, exact polygon/holes rasterization, mask import roundtrips, same-photo pairwise IoU, model scoring versus two references, invalid geometry, duplicate observer and plant-level role leakage rejection, and local-only UI contract. Run npm run validate for the entire Cannabiverse validation suite.

These software tests contain only synthetic rectangles and **do not fabricate a human expert reference for either real image**.

**Next empirical research step:** collect permissioned independent complete masks from multiple humans and multiple verified distinct plants; document the disagreements and perform blinded expert adjudication. Freeze model settings before evaluating actually unseen holdout plants. Only then discuss generalization or whether an observed structural pattern could inspire an engineered network.

Nothing in this workflow verifies optimality, Fibonacci, 3/6/9 patterns, real vascular transport or medical benefit.
