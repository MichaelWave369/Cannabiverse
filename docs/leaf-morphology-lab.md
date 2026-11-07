# Φ Leaf Morphology Lab v0.2

**Research status:** synthetic geometry, manual annotation and an in-sample descriptive tip-fan fit. No empirical cross-validation or botanical growth-model claim.

After deployment, open [the lab](../app/leaflab/). It is a zero-dependency static web app. Photos are selected locally, handled through temporary browser object URLs, and are not transmitted.

## Scientific separation

Cannabiverse's existing chemical canon and governed evidence lanes remain unchanged. The LeafLab is an exploratory *plant morphology* domain rather than cannabinoid chemical identification.

- **Synthetic model:** generated leaflet silhouettes, serrations, midribs, schematic lateral veins, estimated polygon areas, outline lengths, and comparisons.
- **Manual observation:** hub/tip points clicked by a person in their own leaf photograph, with relative lengths and angles, exported as JSON.
- **Future empirical observations:** scale-calibrated photos, explicit provenance, inter-annotator measurements, vein network extraction, preregistered comparisons.

**Model ≠ measurement ≠ mechanism ≠ biological optimization.**

## Geometry

For N in {3,5,7,9,11}, index each leaflet from 0 to N−1 and let m=(N−1)/2, k=(i−m)/m. The illustrative angular orientation is θ=kF/2 degrees, for fan width F.

The illustrative length is L=230(1−f|k|^1.35)(1+ak), with outer falloff f and left/right bias a. Half-width is W=26w(0.96−0.22|k|). Width along each leaflet is an envelope W sin(πt)^p multiplied by a repeating piecewise-linear tooth function with variable depth. This is a drawing model, not a derivation of real plant growth.

Each outline samples 240 steps per edge. Polygon area uses the shoelace formula and boundary length sums segments. A schematic vein-length proxy sums one midrib and simple lateral branches. The vein-length proxy is *not* a hydraulic flow, transport performance, or material-cost model.

The comparison table divides boundary and vein proxy lengths by √(synthetic area), for scale independence only. It does not hold area, developmental stage or growth resources fixed. It cannot establish which leaflet count is evolutionarily optimal.

## Photo annotation protocol

1. Photograph an undamaged leaf flat with a ruler/scale bar in frame, preferably from directly above.
2. Record plant/sample ID, developmental stage, leaf position and image conditions outside the application.
3. Select the image, click the leaflet junction first, then each visible leaflet tip.
4. Export JSON. Angles are measured relative to vertical-up in image coordinates. Lengths are normalized by the longest measured tip distance. The displayed fan spread uses the shortest circular arc containing all marked rays (rather than naive max-minus-min angle subtraction).
5. The annotation JSON can be re-imported later, without the original image; in that case it is displayed on a reference grid and clearly marked as imported. This is not a photo reconstruction.
6. For a *complete* leaf with exactly 3, 5, 7, 9 or 11 marked tips, choose **Fit measured tip fan** to obtain descriptive fitted parameters and measured-minus-fitted tip residuals. Export the fit report as JSON.
7. Treat curled leaves, shadows, perspective, resolution, observer error and incomplete leaflet visibility as sources of uncertainty.

The app **does not calibrate against the ruler** or automatically extract leaflet margins/vein networks. It reports no centimeters and makes no biological claims from the photo.

## Falsifiable study questions

- On held-out photographed leaves, what is the prediction error of the fan, length falloff and taper model?
- Against matched palmately compound leaves and constrained random models, are angle and length-ratio distributions distinctive after controlling for leaflet count and development?
- Are specific, preregistered Fibonacci or 3-6-9 relationships more predictive than chance and plausible null models, accounting for multiple comparisons? **No positive claim is made in v0.1.**
- Given independently traced veins and measured vessel properties, what are the graph's cost, path length, robustness and hydraulic implications under comparable constraints?

For serious tests, repeat across plants and growth conditions, blind labels where possible, and report uncertainty and failures alongside successes.

## Validation and exports

Run: npm run validate:leaflab

Synthetic model exports use kind = synthetic-morphology. Photo annotation exports use kind = manual-photo-tip-annotation. Both include modelVersion and limitations. These outputs are **not authoritative scientific evidence receipts** and must not be promoted into the compound canon.

## Background research

- University of Florida IFAS, Cannabis sativa Plant Identification and Its Look-Alikes: https://ask.ifas.ufl.edu/publication/AG476
- Morphological Characterization of Cannabis sativa L. Throughout Its Complete Life Cycle (2023): https://pmc.ncbi.nlm.nih.gov/articles/PMC10610221/
- Patiño-Ramírez and Arson, Transportation networks inspired by leaf venation algorithms (2020): https://pubmed.ncbi.nlm.nih.gov/32050175/


## v0.2 descriptive fit algorithm

**Input:** one manually marked hub and a complete set of 3, 5, 7, 9 or 11 tips. No automatic segmentation, shape outline, vein tracing or cultivar inference.

1. Convert each hub-to-tip image vector to its angle and magnitude.
2. Sort angles circularly, locate the largest gap, and unwrap starting immediately after it. This avoids a false ~360° fan when the photo is rotated across −180°/+180°. The algorithm presumes the largest angular gap lies outside the compound leaf fan.
3. Fit a linear angular fan by least squares: angular position = rotation + k × fan / 2, with k evenly spaced from −1 to +1. Clamp total fan to 80°–175° to respect the synthetic model domain.
4. Normalize observed distances by the longest marked tip. For the existing length-falloff model, search a deterministic bounded grid of f=0..0.80 in 0.01 steps and a=−0.25..+0.25 in 0.01 steps. Compare each model's *normalized* tip radii to the observations via root-mean-square error.
5. Report every tip's angular and relative-length residual, fitted parameters, overall RMSE, and a simplistic equal-length reference RMSE. Export all diagnostics and limitations as JSON.

**Critical limitations:** This is an **in-sample** fit. The same clicked points estimate the parameters and evaluate the residuals; a low residual does not establish prediction accuracy, biological mechanism, or unusual mathematical relationships. The equally spaced angular fan is only one simplified hypothesis and cannot capture arbitrary natural variation. Three-tip samples are especially underconstrained. Width, serrations, veins and area cannot be inferred from tip coordinates. The equal-length baseline is just a descriptive reference, not a statistical null distribution.

No image is uploaded or sent to another service. Imported measurement JSON is used locally; no measurements are appended to Cannabiverse's authoritative chemistry evidence ledger.

### Next empirical gate

For real inference, acquire multiple independent images per specimen, record scale and orientation, mark or extract *full outlines*, preregister a held-out evaluation split by plant (not by photo), report annotation uncertainty, and compare model families including non-cannabis palmate leaves. Only then evaluate whether any proposed number-series relationship beats conventional models and multiple-testing corrections.
