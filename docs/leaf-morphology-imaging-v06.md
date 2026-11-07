# Φ LeafLab Imaging Lab v0.6

**Status:** experimental local image processing, not validated leaf identification, botanical vein extraction, or a biological network study.

This standalone static workbench at [Imaging Lab](../app/leaflab/imaging.html) runs in the user's browser without remote model calls. The underlying pure JavaScript algorithms are in app/leaflab/imaging-core.mjs and can be tested using synthetic images.

## Workflow

1. Photograph a leaf flat, with a plain contrasting background and low glare. Keep the original orientation and pixels unchanged for future manual comparisons.
2. Open the Imaging Lab and choose a local photo. The browser downsamples it to at most 320 pixels on the longest side, with a minimum 16 pixels on either side. This limits time and memory. Fine branches and serrations can be lost.
3. Select "Mark leaf color" and click a representative interior leaf pixel. Select "Mark background" and click the surrounding background. These selected RGB values are human choices, not verified species labels.
4. Adjust the color-distance margin and click Analyze locally. The algorithm selects pixels closer to the leaf sample than the background sample by a normalized RGB-distance margin. It retains only the 8-connected component containing the clicked leaf seed. Unconnected leaf fragments may be discarded.
5. The experimental second pass computes luminance and a local mean (radius 5), flags interior pixels darker than the local average by a selected threshold, removes small connected ridge components, and applies bounded Zhang–Suen binary thinning. The output is a **vein-like dark-ridge skeleton**, not an authenticated vein network.
6. Inspect photo, segmentation and magenta skeleton overlays. Export binary mask PNG and a JSON report with settings, coverage, pixel-boundary proxy and skeleton-graph metrics. Original image pixels are not exported in JSON.
7. Optionally import a v0.3 manual-leaf-specimen JSON traced against the **same original photo**, without rotation, mirroring, recropping or different orientation. The stored source filename must match the selected photo filename, but that cannot authenticate photo identity. Compare the automatic mask against the **union** of manually outlined leaflets with IoU, Dice, precision and recall.

## Graph interpretation

Each occupied skeleton pixel is treated as a vertex and each pair of eight-neighbor occupied pixels as an undirected edge. A pixel with one occupied neighbor is endpoint-like and one with three or more neighbors is junction-like. An 8-connected flood fill gives component count and largest-component size. Horizontal and vertical links count as one image pixel; diagonal links count as sqrt(2). These are **image-grid proxies**, not validated botanical branch locations.

No vein radius, vascular fluid conductance, hydraulic flow, construction costs, robustness or plant development can be inferred. Thinning creates false junctions on images with shadows, pigmentation, noise and thick ridges.

## Why manual overlap can mislead

The automatic mask may contain petioles, connected background objects, or only part of a leaf. The manual v0.3 record can have incomplete or overlapping outlines; it is not automatically a whole-leaf reference. The original v0.3 image is shown in an 850×630 SVG using an aspect-preserving xMidYMid meet projection. The v0.6 comparison reverses that projection before rasterizing the manual polygons.

An image with different aspect/crop/rotation cannot be compared reliably even if the filename is the same. A near-perfect IoU only means the two masks agree on visible pixels; it is **not** proof of species identification, physiological function, or high-quality botanical ground truth.

## Privacy and provenance

The photo is opened locally into a browser canvas, with its temporary object URL revoked after decoding. No browser fetch or transmission is used. Reports include selected RGB samples, thresholds, derived geometry, a user-asserted filename, and optional manual-overlap statistics. The mask PNG contains only a monochrome derived segmentation, not the original pixels. Both exports should still be treated as potentially sensitive image-derived information.

Synthetic CI fixtures include a colored rectangular object, a disconnected artifact, artificial dark centerline and known polygon contours. Passing these tests demonstrates *software correctness on fixtures only*. No authentic cannabis leaf/vein benchmark is bundled with v0.6.

## Next empirical rung

Capture legal specimen photographs under controlled scale, perspective and light; have independent blinded observers trace leaf borders and vein lines without seeing the algorithm; evaluate accuracy across plants not present in model development; compare failure modes with baseline detectors; and report uncertainty. To translate botanical networks into communication routing, first verify physical vein graph connectivity and transport measurements.

This workbench establishes **no** Fibonacci, 3-6-9, medical, or biological optimality claim. Cannabiverse chemical canon, source receipts and evidence bridges stay unchanged.

Run npm run validate:leaflab-imaging for imaging fixture tests, or npm run validate for the complete atlas gate.
