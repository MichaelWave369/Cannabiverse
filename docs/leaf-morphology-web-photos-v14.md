# Φ LeafLab v1.4 · Real Web Leaf Photo Acquisition

**Goal:** make real, traceable leaf photographs available to the existing local specimen and annotation tools. **Status:** five curated Wikimedia Commons photo-source records; each source's file page, photographer credit, reuse license, original dimensions and file byte count were checked on 2026-11-07. Their *original file bytes and SHA-256* are only verified when the explicit acquisition script successfully downloads them. No actual plant vein ground truth is provided here.

[Open the real-leaf photograph library](../app/leaflab/real-photos.html) and then use [Specimen Provenance v1.3](../app/leaflab/specimens.html) for exact local file verification.

## Why not use a random image search?

For research, a visual leaf resemblance alone is insufficient. Original photographs require defensible reuse rights, a visible provenance trail, exact file identity, and a clear distinction between scientific observation and self-asserted claims. Wikimedia Commons supplies individual file histories and licenses. These photos still **are not independently verified botanical vouchers**, and no associated image is a scientifically certified network of leaf vascular vessels.

## Curated photo-source inventory

| ID | Source and creator | License | Original size | Research role |
| --- | --- | --- | --- | --- |
| commons-leaf-earth-pd | [Cannabis sativa leaf (1).jpg](https://commons.wikimedia.org/wiki/File:Cannabis_sativa_leaf_%281%29.jpg); unknown photographer via Public Domain Images | Public domain | 1024 × 680, 148375 bytes | Detached leaf on textured ground |
| commons-leaf-foliage-cc0 | [Cannabis-leaf-hemp.jpg](https://commons.wikimedia.org/wiki/File:Cannabis-leaf-hemp.jpg); Lode Van de Velde | CC0 1.0 | 1920 × 1275, 456200 bytes | Overlapping green foliage, challenging segmentation |
| commons-leaf-dorsal-jon | [Cannabis sativa leaf Dorsal aspect 2012 01 23 0830.JPG](https://commons.wikimedia.org/wiki/File:Cannabis_sativa_leaf_Dorsal_aspect_2012_01_23_0830.JPG); JonRichfield | CC BY-SA 3.0 | 4405 × 2959, 5112280 bytes | Detached dorsal view on wooden background |
| commons-leaf-flowering-brett | [Cannabis leaves.jpg](https://commons.wikimedia.org/wiki/File:Cannabis_leaves.jpg); Brett Levin | CC BY 2.0 | 4928 × 3264, 7684085 bytes | Flowering in-situ plant, complex background |
| commons-leaf-venation-annotated-jon | [Cannabis sativa leaf diagnostic venation 2012 01 23 0829 c.jpg](https://commons.wikimedia.org/wiki/File:Cannabis_sativa_leaf_diagnostic_venation_2012_01_23_0829_c.jpg); JonRichfield | CC BY-SA 3.0 | 4032 × 3212, 3415012 bytes | **QUALITATIVE TEACHING ONLY: pre-annotated photo with arrows/text** |

The last photo visibly contains drawn diagnostic lines, labels and arrows, so it is **excluded from quantitative blind detector evaluation**. Also, the dorsal and annotated photographs are by the same creator on the same date and may come from the same plant. Do not split them between development and holdout plants without independent provenance proving biological independence. We have not confirmed any other photos represent distinct plants.

These rights were verified on the **Wikimedia Commons image-description pages**, not invented from search results. The detailed catalog is a JavaScript module at app/leaflab/real-photo-catalog.mjs, shared by the gallery, tests and downloader. Catalog SHA-1 digests come from Commons structured data; they are source metadata, not our own downloaded SHA-256 values.

## Original JPEG acquisition

To actually download all source photos (in an environment with network access):

npm run fetch:leaflab-photos

The script fetches each original JPEG sequentially from upload.wikimedia.org, checks that the requested resource remained on the permitted Wikimedia upload host, confirms exact published byte size, checks the source-listed SHA-1 digest, validates the JPEG header, computes a **fresh SHA-256**, and writes untouched JPEGs under an ignored local directory called .leaflab-real-photos.

The directory also receives:

- photos-manifest.json with original author, license, dimensions, role, source URL, public listed SHA-1 and locally calculated original-byte SHA-256.
- ATTRIBUTION.md listing exact reuse license, source link, original bytes and important scientific cautions.

On mismatch or download error, the run fails rather than falsely identifying a partial set as a verified photo corpus. Existing unrelated or unverified images are not implicitly accepted.

For an alternate destination run:

node scripts/fetch-leaflab-real-photos.mjs --out ./my-local-research-photos

For selected catalog entries run with a comma-separated list:

node scripts/fetch-leaflab-real-photos.mjs --ids commons-leaf-earth-pd,commons-leaf-dorsal-jon

The source photos are deliberately **not committed into the code repository**; this keeps original photography, licenses and user research materials separate from source code. The GitHub Actions workflow at .github/workflows/leaflab-photo-pack.yml acquires a **two-photo starter pack** containing the public-domain ground-leaf original and the CC0 foliage original. It uploads the downloaded JPEGs, full credits and SHA-256 manifest as a temporary downloadable **leaflab-v14-public-domain-original-leaves** artifact. The remaining three source pages are in the catalog, and their originals can be saved individually or obtained with the manual five-photo command if Wikimedia permits. A previous all-five attempt was rate limited by Wikimedia with HTTP 429 after successfully hashing the first two, so automated batch acquisition is deliberately smaller and more respectful of the host server. Artifact availability still depends on source server access and workflow success.

## Licensing

Public-domain and CC0 entries can generally be reused without attribution conditions, although source credit is still preserved for provenance. The CC BY and CC BY-SA works **require creator attribution, a source link, and license identification**; indicate modifications when distributing adaptations. CC BY-SA derivative work may have to be distributed under an appropriate ShareAlike license. Consult each photo's official Commons file page and license for actual applicable terms.

Each downloaded image retains its original bytes and an individual credit block. The application does not strip photographer attribution or apply a blanket MIT code license to third-party photographs.

## Using photos scientifically

1. Use downloaded original bytes in the [v1.3 source verifier](../app/leaflab/specimens.html), not a cropped thumbnail, because different file bytes have a different SHA-256.
2. Record unknown taxon IDs, physical scale, observer procedure and camera angle honestly as **unknown**, not inferred from the image title. The image creator's description is a source claim, not an independently reviewed species determination.
3. Use the [v0.7 human reference editor](../app/leaflab/veins.html) to annotate independently. Pair observers on the same exact original hash; do not expose model overlays to blinded observers. Repeated photos of the same real plant are not independent plants.
4. Audit same-image agreement and plant-level development/holdout separation through the [v1.2 evidence gateway](../app/leaflab/evidence.html). Use the pre-annotated teaching image only for reading/education, not for blind evaluation.
5. Report actual false positives, missed veins, difficult photos and dataset omissions before making engineering conclusions.

No genuine botanical ground truth labels or independently identified plant photos are bundled; no claim about Fibonacci, 3-6-9, cannabis-specific network optimality or superior deployed networking follows from these source photographs.

## CI and verification

Run npm run validate:leaflab-real-photos to check source URLs, original sizes, known license categories, image-role leakage restrictions, and the source/GUI/downloader contracts. The full Validate Atlas workflow also runs these checks.

The separate **LeafLab Public-Domain Starter Photo Pack** GitHub Actions job attempts the two-photo original-byte download and verifies exact source byte counts and SHA-1 before uploading the photo pack as an artifact. A green *catalog/unit test* does not mean the *image-fetch job* has passed. Only a successful acquisition job and manifest SHA-256 values demonstrate that those exact original bytes were retrieved. Even then, **scientific specimen identification remains unverified**.
