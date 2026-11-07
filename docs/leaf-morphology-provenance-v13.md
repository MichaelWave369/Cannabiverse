# Φ LeafLab v1.3 · Specimen Provenance Lab

**Research status:** a protocol and software workflow for future real botanical photo studies. No real plant photographs, authenticated botanical veins, qualified expert reviews or validated vascular measurements are bundled.

Open the [Specimen Provenance Lab](../app/leaflab/specimens.html). It operates locally in your browser and extends [v0.7 human vein-line annotation](../app/leaflab/veins.html) and [v1.2 evidence agreement checks](../app/leaflab/evidence.html).

## Why original image bytes matter

LeafLab v1.2 can check that image hashes in user-editable annotation JSON match each other, but cannot independently prove those values correspond to an actual photograph. This rung adds a **current-session original-byte SHA-256 check**. When a local photo is selected, its exact bytes are hashed with Web Crypto, its decoded original width and height are read, and the resulting values are compared to its source manifest. The app also checks the same aspect-preserving, maximum-320-pixel processing dimensions used by the v0.7 annotation workbench.

This establishes **identity of the file being compared**, not the truthfulness of the image, species, observer independence, collection consent or biological vein anatomy. An edited picture can have a valid hash. Neither the source manifest nor the exported audit is digitally signed.

## Recommended collection protocol

1. Obtain lawful, permissioned images and preserve the **original file bytes** without cropping, re-encoding or editing. Keep private image originals under appropriate access controls. Photo permission recorded by the tool is self-attested, not externally checked.
2. Use a consistent near-perpendicular camera perspective, diffuse lighting, a plain background and a visible calibrated scale marker when practical. Record equipment and capture details separately.
3. Assign a stable **Plant ID** across all photos of the same real plant, and a distinct **Specimen ID** for each original photo. A plant can have multiple photos, but these are not independent biological replicates.
4. Record a real ISO YYYY-MM-DD capture date, species/taxon label and **identification basis**. Allowed bases are unverified, photographic self-assertion, and expert-review self-assertion. Even an expert-review checkbox does not authenticate the reviewer; provide a non-identifying evidence note where possible.
5. Record growth stage, lighting, camera angle, background and whether a scale marker is visible. Record self-asserted permission to analyze the photo and whether the observers followed a blinded protocol.
6. Have two or more genuinely independent observers annotate the same **exact original photo** in v0.7 with different masked observer codes, without viewing model predictions or each other's annotations.
7. Link their v0.7 JSON references to the source file manifest. Each must match original-byte SHA-256, Plant ID, Specimen ID and processing dimensions.
8. Run the source-integrity audit here and independently review its warnings. For numeric observer agreement and whole-plant holdout groups, proceed to the v1.2 evidence gateway.

The app requires no detailed geographic location, reviewer name or personal contact details in its metadata.

## Source manifest format

Each **leaflab-source-specimen-record**, version **1.3**, includes:

- SHA-256 of original file bytes as 64 lowercase hex characters; source filename; image byte count 1 to 16 MiB.
- Decoded original width and height; processing width and height computed by the same maximum-320px aspect-preserving downsample formula used in v0.7.
- Plant ID, specimen ID, capture date, self-reported taxon label and basis, and optional identification note.
- Growth stage, lighting, camera angle, background and visible scale marker field.
- Self-attested analysis permission and observer blinding plus optional collection notes.

Source registry export creates a **leaflab-specimen-registry-bundle**, version 1.3. A user can later import the manifest bundle (or individual records) and reselect each exact original image file. The browser verifies file size, original decoded dimensions and SHA-256. A valid current-session check is marked **ORIGINAL_FILE_BYTES_MATCHED_IN_ACTIVE_SESSION**.

**Important:** such status is not third-party attestation, authentic biological data, or a cryptographic certificate. Exported JSON can be edited. Verification must be repeated independently from actual photo bytes for strong evidence.

## Image and annotation audit

The source audit accepts **1–36 source manifests** and **0–72 v0.7 annotation files**. It rejects duplicate image hashes or specimen IDs, duplicate observer-per-image records, and any matching annotation that differs in Plant ID, Specimen ID or v0.7 processing dimensions. It rejects synthetic references paired with apparent source photos; references without a source manifest are listed as **unmatched** rather than silently ignored.

The audit tracks image-level protocol warnings:

- Original photo not rechecked in this browser session.
- Photo permission missing or not self-attested.
- Taxon basis unverified, or claimed expert review missing a note.
- Lighting other than recorded diffuse, camera other than near-perpendicular, background other than plain, missing scale marker.
- Blinded observer procedure not recorded.
- Fewer than two different masked observers attached.

A complete checklist means only that user-entered conditions are recorded. It is **not independent verification that those conditions were met**. A photo with only one observer remains an incomplete independent-review case even if every other field is present. Photos from one plant are grouped under that asserted plant.

## Privacy and limits

This is a local-only browser tool. Original photos are selected through browser File APIs and SHA-256 Web Crypto, not uploaded or embedded in exported JSON. Exported reports contain source hashes and metadata which can nonetheless be sensitive. Avoid public sharing without consent.

The CI fixture intentionally uses **synthetic non-image bytes**, hashes them with SHA-256, and checks source metadata, hash mismatch rejection, dimensions and annotation consistency. These tests validate software behavior, **not real camera decoding, authenticated source photographs or biological facts**. A future real photo and browser field test is still required.

The governed Cannabiverse chemistry and clinical evidence are unaffected. No Fibonacci, 3-6-9, biological network optimum, actual leaf hydraulics or superior communication-network performance is demonstrated.

Run npm run validate:leaflab-specimens for v1.3 validation, or npm run validate for the full repository checks.
