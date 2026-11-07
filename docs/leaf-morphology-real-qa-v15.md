# Φ LeafLab v1.5 · Real-Image Sparse QA

**Real photographs can now be tested against hand-marked pixels in the browser. No independently verified whole-image ground truth or botanical vein labels have been supplied.**

[Open Real-Image QA Lab](../app/leaflab/real-image-qa.html) · [Real original-photo library](../app/leaflab/real-photos.html)

## Real photograph sources

The v1.4 acquisition pack contains two actually downloaded and independently SHA-256-hashed Wikimedia JPEG originals.

- **commons-leaf-earth-pd**, detached leaf on textured ground: SHA-256 4dec1eade2d3aa0b3690f5c392c832c1602692dd35306e032af543c6dead02ff.
- **commons-leaf-foliage-cc0**, bright foreground leaf with overlapping green foliage: SHA-256 3bedc723200f9f98502218e6a754b6c2c7f12907020eae5bc892758a2c6fcdf6.

The v1.5 UI recomputes the original-file SHA-256 using Web Crypto, checks against the known catalog bytes and image dimensions, and then downsamples to at most 320 processing pixels along the longest side. Other photos can be explored, but the source identity is flagged as unlisted.

Exact file matching proves file-byte identity only. It does not establish plant species, real vascular anatomy, originality of the photograph, human observer independence, or unrelated physical plant samples.

The public-domain source and CC0 source remain credited to their individual Commons file pages; no original image bytes are stored in the source-code repository.

## Pre-reveal annotation protocol

1. Download and open the exact original JPEG through the local browser file picker.
2. Choose one representative internal leaf-color seed and a non-leaf color sample. These two samples are separate from manual review marks.
3. Before revealing the algorithm, paint sparse **leaf** samples and **non-leaf** samples. Erase uncertain areas back to **unknown** rather than guessing.
4. Set color margin, dark ridge contrast, minimum ridge component and exploratory/declared-holdout review role before evaluation.
5. Mark at least 20 processing pixels of each class. Clicking **Lock labels & reveal results** evaluates the unchanged v0.6 color-seeded connected-component mask and then freezes labels and settings. The UI will not reveal segmentation or candidate ridges beforehand.
6. Inspect the photographic overlay: green marks are human leaf examples, orange marks are human non-leaf; after reveal cyan marks missed labeled leaf, red marks labeled background that the model predicted as leaf. Unmarked pixels never count as correct or incorrect.
7. Export report JSON. It includes the original-file SHA-256 and catalog provenance, exact parameter values, processing dimensions, sparse label run-length encoding, and model counts. Original image pixels are not included.

After **Reset evaluation**, previously revealed predictions may bias the observer, even if the UI hides them again. The software cannot prove truly independent, blinded or preregistered human review.

## Metric contract and missing truth

Human mark labels are exactly 0 = unreviewed, 1 = leaf, 2 = non-leaf. Only marked pixels enter the confusion matrix. The tool never treats the remaining image as automatically background.

**Within marked pixels only:**

- TP = human leaf, predicted leaf.
- FP = human non-leaf, predicted leaf.
- FN = human leaf, predicted non-leaf.
- TN = human non-leaf, predicted non-leaf.
- Precision = TP / (TP + FP).
- Recall = TP / (TP + FN).
- Specificity = TN / (TN + FP).
- IoU = TP / (TP + FP + FN).
- Dice = 2TP / (2TP + FP + FN).
- Balanced accuracy = (recall + specificity) / 2.

Undefined denominators are reported as null; fewer than 20 manual pixels in either class produces **no scores**. All outputs include the number of marked leaf and non-leaf pixels, unreviewed pixels, the marked image fraction and model-predicted pixels.

The marked subset is a deliberately biased nonrandom sample. Neighboring brush pixels are correlated. **Sparse mark metrics are not whole-image accuracy or generalization estimates** and cannot support confidence intervals without an appropriate research design. User annotations may also be mistaken.

The separate dark-ridge skeleton remains exploratory image contrast: shadows, texture, hairs, leaf serration and lighting may create false positives. No confirmed veins, vascular junctions or xylem/phloem measurements follow from these counts.

## Rights and research continuation

Source pages:
- [Public-domain detached leaf](https://commons.wikimedia.org/wiki/File:Cannabis_sativa_leaf_%281%29.jpg).
- [Lode Van de Velde CC0 overlapping foliage](https://commons.wikimedia.org/wiki/File:Cannabis-leaf-hemp.jpg).

The remaining three v1.4 image leads have individual copyright terms; one pre-annotated teaching image is explicitly excluded from blinded quantitative benchmarking.

Run npm run validate:leaflab-real-qa for JavaScript regression cases: known original-file identity and size/dimension conflicts, brush-painted sample immutability, ignored unknown pixels, sparse labeled agreement, bounded RLE, report input checks, and browser-local workflow wiring. Run npm run validate for the full Cannabiverse suite.

**Next needed empirical evidence:** multiple complete, independently marked and botanical expert-reviewed leaf masks on permissioned real photos from documented distinct plants, algorithm settings frozen in advance, and actual untouched evaluation plants.

This workflow makes no Fibonacci, 3-6-9, cannabis optimization, biological-fluid transport, verified networking or medical efficacy claims.
