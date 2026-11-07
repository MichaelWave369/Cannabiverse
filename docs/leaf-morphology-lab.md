# Φ Leaf Morphology Lab v0.1

**Research status:** synthetic geometry and manual annotation, not an empirically calibrated botanical model.

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
4. Export JSON. Angles are measured relative to vertical-up in image coordinates. Lengths are normalized by the longest measured tip distance.
5. Treat curled leaves, shadows, perspective, resolution, observer error and incomplete leaflet visibility as sources of uncertainty.

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
