# Φ LeafLab v0.7: Independent Vein-Line Reference Benchmark

**Status: a research-data collection and algorithm-assessment workbench. No real cannabis photographs or observer-verified vascular annotations ship with this release.** Synthetic software tests are not empirical plant measurements. The tool does not recognize cannabis species, authenticate botanical veins, or simulate vascular transport.

## Aim

Test whether the simple dark-ridge centerline detector from v0.6 agrees with manually marked, visible line features **more or less than a predeclared, simpler baseline**. Report precision, recall, F1 and failure cases rather than promoting attractive visuals into botanical claims.

Start at [Vein Reference Benchmark](../app/leaflab/veins.html). This is a separate local-only HTML+ES-module page that does not mutate the chemistry, medicine or governed evidence lanes.

## Capturing an independently marked reference

1. Photograph a flat leaf with non-glossy contrasting background, diffuse lighting and an approximately perpendicular camera. Record taxon identification, plant ID, growth stage, environment, leaf position, perspective, and source provenance separately. Preserve original file bytes.
2. Have an observer open the original local image in the Benchmark page. The image is downsampled, preserving aspect ratio, to a maximum of 320 pixels on the longest side. Mark multiple apparent vein-like centerlines by clicking along them, then finish each polyline. Only lines perceived as visible should be marked; do not complete unseen vein segments by guesswork.
3. Enter a unique Specimen ID and stable Plant ID, plus a masked Observer Code. Export the annotation **before** viewing any automatic detector overlay. Save the file separately.
4. A second observer can independently draw the same image without seeing the first observer's annotations or detector outputs. Each observer exports a separate annotation JSON with their masked code. The app does not authenticate that independence or verify the image contains an actual leaf.
5. For audit and comparison, load the **exact same original image bytes** and import one annotation JSON. The app computes SHA-256 over the source file's original bytes in the browser and rejects a reference with a mismatched SHA-256 or processing dimensions. This is an integrity and file-identity check, **not a signature or botanical provenance certificate**. Different crops/rotations/re-encodes have different hashes.
6. Choose an interior foreground color seed and a background color seed from the photo. Use *predeclared* foreground threshold, ridge contrast, minimum component size and matching tolerance. Export the benchmark JSON and retain these configuration values with the source image and annotation.

### File formats and privacy

- **leaflab-vein-reference, v0.7:** Specimen/Plant ID, masked annotator code, image-original-byte SHA-256, user-asserted source filename, downsampled width/height, manual/synthetic origin and up to 60 image-coordinate polylines (2–200 points each). Does **not** embed the original image.
- **leaflab-vein-reference-benchmark, v0.7:** original image SHA-256, group identifiers, algorithm settings, foreground count, per-detector pixel scores and graph proxies. Excludes original RGBA pixels and line masks.
- **leaflab-vein-benchmark-summary, v0.7:** descriptive per-plant mean reference F1 across up to 200 imported benchmark reports. Repeated images and observers under one Plant ID are grouped; no confidence or causal claim follows.
- Importing a synthetic reference into the manual photo workbench is rejected to prevent silently relabeling a test fixture as a real human observation. Source-image provenance, species and observer identities remain *self-asserted*.

All file operations use the local browser File and Canvas APIs and Web Crypto SHA-256. There are no network fetches, remote model calls or user image uploads. Exported annotations contain derived coordinates and a fingerprint; these can still expose private sampling information and should be handled appropriately.

## Predeclared algorithms

**Shared preprocessing:** v0.6 segmented color-similar foreground via user-clicked RGB sample colors and a normalized separation margin, then retained the connected component containing the clicked leaf pixel. Both vein-like detectors operate on this same mask. If the mask misses the veins or includes background, both can fail together.

- **Candidate A: masked local dark ridge.** For each interior masked pixel, compare its luminance to a mask-weighted 11×11 neighborhood mean; retain dark contrast candidates, remove small connected ridge components and thin with bounded Zhang–Suen thinning.
- **Baseline B: global mean darkness.** For the same eroded foreground pixels, mark luminance at least the same contrast threshold below the overall mean foreground luminance, then apply the same thinning. This is deliberately simple, not a published high-performance vein detector.
- A hand-drawn line reference is rasterized to a single-pixel polyline on the same downsampled pixel grid. Manual reference masks can omit weak, obscured or uncertain veins; the app does not infer a line from biological facts.

All algorithm parameters remain adjustable so this is **exploratory**, not preregistered. Viewing and then tuning against reference scores creates test-set overfitting. A confirmatory experiment must lock detector parameters before collecting an untouched plant cohort.

## Exactly what precision and recall mean

Let P be the set of predicted skeleton pixels and R the set of rasterized human reference pixels. Choose an integer Euclidean matching tolerance t in **0–6 processing pixels**. Both matching directions use the same circular disk radius.

- **Reference-relative precision:** fraction of predicted pixels with at least one reference pixel within t.
- **Reference-relative recall:** fraction of reference pixels with at least one predicted pixel within t.
- **F1:** harmonic mean of the two fractions when both exist. If P is empty and R is nonempty, precision is null, recall is 0, and F1 is 0. Unmatched detections are not discarded.
- An exact match on a carefully drawn *synthetic* centerline at t=0 proves only that the code recognizes the fixture geometry. t=2 can forgive displacements of up to two processing pixels in both directions. At 320px downsampling, this can represent a substantial physical distance.

These are **tolerance-matched agreement scores**, not conventional statistical true-positive/false-positive rates against verified anatomical truth. They are sensitive to centerline annotation style, downsampling, shadows, leaf segmentation, tolerance choice, path completeness, and observer expertise.

## Across-plant summaries

Import independently exported per-image report JSON files in the browser, then summarize by user-entered Plant ID. The app rejects the same original SHA-256 and Observer Code twice and rejects mixing synthetic and manual evidence levels. Per-plant summaries show mean F1 for each detector and the number of image reports. It does **not** treat every image or observer as an independent biological plant, authenticate uploaded JSON metrics, or claim a confidence interval.

### Synthetic regression fixtures

The automated CI test creates a completely artificial leaf-colored rectangular region with a dark centerline. It checks:

- Strict annotation format, masked IDs, SHA-256 mismatch rejection and image size limits.
- Deterministic single-pixel line rasterization, exact matching, one-pixel displacement with/without tolerance, and empty-detector failure.
- The local contrast detector **and** global darkness baseline recovering the synthetic centerline under identical foreground processing.
- JSON reports omitting pixel arrays, rejecting invalid summaries, and grouping repeated observations by asserted Plant ID.
- Browser page wiring, no outgoing fetch calls, and registration in the full Cannabiverse validation gate.

These fixtures are not cannabis photographs and do not establish real-image performance. A genuine real-image benchmark requires locally supplied, permissioned specimens and independent blinded annotations.

## Next scientific gate

Obtain real, ethically and legally acquired image datasets with species/control metadata; establish a two-observer consensus protocol while retaining disagreement; freeze parameters on development plants; evaluate untouched **whole plants** with matching species/stage controls, and report both detector performance and observer-to-observer variability. Only after rigorous anatomical verification might graph properties be useful inputs to network-routing research.

There is **no demonstration** here that cannabis vein structures follow Fibonacci, 3-6-9, an optimal transport law, or an efficient computer-network topology. Cannabiverse remains a governed phytochemistry atlas, with the experimental morphology lane explicitly separate.

To validate this workbench, run npm run validate:leaflab-veins. To validate all areas, run npm run validate.
