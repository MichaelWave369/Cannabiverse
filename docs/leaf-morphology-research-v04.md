# Φ LeafLab Research Audit v0.4

**Status:** exploratory, local-only computational botany research tooling. Not a validated species model, causal explanation, discovery of numeric laws, or medical evidence.

## What is measured

The audit accepts manual-photo-tip-annotation JSON produced by the [main LeafLab](../app/leaflab/). Each file contains one marked common hub and a complete set of 3, 5, 7, 9, or 11 leaflet-tip coordinates in the standard 850 × 630 image canvas. The app **recomputes** angles and relative hub-to-tip lengths from coordinate marks; it never trusts imported measurements.

Each study observation needs a unique Specimen ID for one leaf, a stable Plant ID reused across leaves from the same plant, a *cannabis* or *non-cannabis palmate control* label, and a user-supplied taxon label. These are **not authenticated**. The app rejects duplicate specimens, conflicting group/taxon labels for the same Plant ID, malformed or out-of-range geometry, ambiguous near-duplicate tip directions, and mixed synthetic/demo and manual data. Original photographs are not embedded in exports or uploaded.

## Predeclared predictive models

For odd count N, rank i from 0 to N−1, let k=(i−(N−1)/2)/((N−1)/2). Normalize each predicted tip-length vector by its maximum.

1. Uniform null: length = 1 for every tip.
2. Linear falloff: length = 1 − f|k| with f tuned on training plants only across 0..0.8 in steps of 0.01.
3. Curved asymmetric: length = (1−f|k|^1.35)(1+ak), with f grid 0..0.8 and a grid −0.25..+0.25 (0.01 steps) fit only on training plants.
4. Fixed golden-ratio candidate: length = φ^(−|k|), φ=(1+sqrt(5))/2, with no tuned golden parameter.

The golden formula is an explicit **hypothesis candidate**, not a documented botanical Fibonacci rule. It cannot be called a discovery just because it fits a picture.

The angular model is separate: all formulas share the mean adjacent-tip angle gap learned from training plants. The audit reports angular-gap error, but the length-model ranking uses held-out relative-length RMSE. Photo rotation and physical leaf size are normalized away; **neither absolute scale nor orientation is predicted**.

## Entire plants held out

For each chosen group and leaflet count, at least **eight distinct Plant IDs** are required. A fixed deterministic FNV-style hash of Plant ID and seed "leaflab-v04-fixed-split-2026" selects 30% (floor, minimum two) as held-out plants. Every leaf from one plant stays on the same side of the split. Repeated leaf observations are averaged into one profile **per plant** before training or evaluation. No held-out plant data are used to fit model parameters.

The audit reports test plant counts and IDs, per-model held-out mean plant RMSE, mean angular gap RMSE, parameter values and the golden-minus-linear error difference. **Positive golden-minus-linear error means the golden candidate performed worse.**

This is not independently preregistered. Repeatedly inspecting a deterministic holdout and editing model choices can destroy its validity; an external set of untouched plants is essential for confirmatory claims. User-provided Plant IDs do not prove botanical independence.

## Exploratory uncertainty

Resample whole held-out plants (not multiple leaflets or photos from the same plant) with replacement 1,000 times under a deterministic generator; show percentile endpoints for golden-minus-linear RMSE. These are **exploratory plant-bootstrap intervals conditional on the training model**, not confirmatory confidence intervals or p-values. They omit uncertainty in training, observer marking and photographic calibration. With only two or three held-out plants, they are particularly fragile.

## Separately specified 3/9 count audit

“3-6-9” alone is not a statistical hypothesis. This audit narrowly operationalizes it as the *fraction of plants with consistently observed complete leaflet counts 3 or 9*, compared between cannabis and non-cannabis palmate controls.

- Six is **not** tested. Current complete-tip support includes odd counts 3,5,7,9,11 only.
- A Plant ID contributes one count only if all its leaves have the same count. Plants showing mixed counts are excluded and reported.
- With at least five eligible plants per group, an exact **two-sided conditional label-permutation reference** is calculated given observed group sizes and 3/9 totals. This assumes group labels would be exchangeable under the null and is **exploratory**, not proof of a botanical numeric effect.
- Selection of leaves and controls, growth stage, species, multiple comparisons and incomplete observations can heavily bias these proportions. Even a small reference p-value could not establish Fibonacci organization, evolution, or causation.

## Synthetic demonstration

The "Load labeled synthetic demo" action supplies 36 completely synthetic and deterministic observations. Every associated report is flagged SYNTHETIC_DEMONSTRATION. Mixing demo and manually entered data is rejected. Functional software tests include cases where the golden formula beats linear falloff and cases where a linear formula contradicts the golden prediction. **No real botanical specimen measurements ship with v0.4.**

## Next real-science gate

Before drawing botanical conclusions, use independently verified plant identities, standardized stage/position and imaging conditions, multiple blind annotators, measured scale and perspective error, prespecified model comparisons and corrections, controls matched by developmental stage, and a genuinely untouched future dataset split **by plant**, not by photo.

Outlines and vein networks require separate measurements; this tip-only study cannot infer serrations, hydraulics, photosynthesis, development, or evolutionary optimality. Failed hypotheses and non-results are first-class findings.

**Local commands:** npm run validate:leaflab-study; npm run validate:leaflab. [Research Audit](../app/leaflab/research.html).

No molecular canon, compound evidence receipt, or research-bridge record is modified.
