# Contributing to Cannabiverse

Cannabiverse welcomes corrections, new-source receipts, ontology improvements, and software contributions.

## Scientific contributions

For a new compound or changed claim, include:
1. the exact compound or relationship,
2. DOI or stable primary-source URL when available,
3. the evidence lane being changed,
4. the proposed confidence level,
5. whether the record is canonical, provisional, historical, or a transformation/artifact note.

Do not promote:
- a mass-spectral feature directly to a confirmed structure,
- receptor binding directly to human potency,
- a proposed pathway to established biosynthesis,
- a vendor name to a chemical identity,
- or a user report to a general medical claim.

## Data changes

Canonical compound IDs use `CPA-CAN-####`. Existing IDs must not be renamed or recycled.

Relationships must resolve both endpoints and include:
- relation,
- confidence,
- evidence lane,
- source ID,
- source URL or a source-register reference.

## Pull requests

Run:

```bash
python scripts/validate_atlas.py
```

before opening a pull request.

A PR that changes scientific authority should describe the exact before/after claim and source receipt.
