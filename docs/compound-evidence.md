# Compound Evidence Claims

Cannabiverse v0.3 gives each canonical molecule its own **identity** and **occurrence** evidence receipts.

## Why two claims per compound?

A molecule can be structurally identified with strong evidence while evidence for its natural occurrence in Cannabis is weaker, historical, contested, or artifact-cautioned.

Those are different scientific questions.

For every canonical compound `CPA-CAN-####`, v0.3 projects:

```text
CPA-EVC-####-I  identity evidence claim
CPA-EVC-####-O  occurrence evidence claim
```

Example:

```text
CPA-CAN-0133  cis-Δ9-THCA

CPA-EVC-0133-I
  predicate: HAS_IDENTITY_EVIDENCE_LEVEL
  level: I3_VALIDATED_HPLC_HRMS

CPA-EVC-0133-O
  predicate: HAS_OCCURRENCE_EVIDENCE_LEVEL
  level: O3_CONFIRMED_IN_CANNABIS
```

Each claim resolves to the scientific source attached to the canonical record.

## Stable IDs

Compound-evidence claim IDs are derived from the permanent compound ID plus the evidence lane. They do not depend on array order, so adding another molecule cannot renumber existing evidence claims.

## Cautions

Occurrence claims become `CAUTIONED` when the canonical record carries an occurrence caution or artifact flag.

A cautioned claim remains a receipt for what the source/history records. It is not promoted into unquestioned natural occurrence.

## Why no automatic biosynthesis claim?

Most canonical records currently store `B0`, meaning biosynthesis is unknown or not assessed at the record level.

Cannabiverse does not manufacture a positive claim out of missing knowledge. Biosynthetic relationships remain in the relationship-claim graph until a dedicated compound-level biosynthesis receipt is justified.

## Current projection

- 145 canonical compounds
- 145 identity claims
- 145 occurrence claims
- 290 source → compound-evidence support edges

These are generated deterministically from the canonical graph and checked by CI.
