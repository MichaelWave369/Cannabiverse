# Cannabiverse Governance

Cannabiverse is a scientific knowledge ledger, not a marketing database and not a medical recommendation engine.

## Core doctrine

> **IDENTITY ≠ OCCURRENCE ≠ BIOSYNTHESIS ≠ BIOACTIVITY ≠ HUMAN EFFECT ≠ SAFETY**

Evidence in one lane must never silently upgrade another lane.

A compound may be structurally well identified while its natural occurrence is uncertain. A compound may occur naturally while its biosynthetic route is unknown. Receptor activity does not establish a human effect. A human signal does not establish safety.

## Authority rules

1. **Nodes require provenance.** Every canonical compound must resolve to a source receipt.
2. **Edges require provenance.** A relationship is itself a scientific claim and carries source, confidence, and evidence-lane metadata.
3. **Hypotheses stay hypotheses.** Proposed pathways and mechanistic suggestions must remain visibly distinct from established relationships.
4. **Historical baselines are immutable.** The Radwan-125 layer is preserved as a historical snapshot. Corrections append as reconciliation receipts instead of rewriting the historical record.
5. **Permanent IDs are never recycled.** `CPA-CAN-####` identifiers are opaque identifiers, not ranks or measures of importance.
6. **Provisional is not canonical.** Putative detections, search targets, and unresolved identities remain outside the confirmed canon until their acceptance gate is met.
7. **Artifacts remain visible.** Isolation artifacts, likely transformation products, and contested occurrence records are retained with explicit flags rather than deleted for convenience.
8. **Sources outrank summaries.** Review articles are valuable maps, but primary evidence is preferred when resolving exact identity, occurrence, or mechanistic claims.
9. **No effect laundering.** Marketing language, folklore, community reports, preclinical observations, and clinical evidence are separate claim classes.
10. **Uncertainty is data.** Unknown, contested, and unresolved are valid states.

## Evidence lanes

### Identity
- I0: unknown / no reliable identification
- I1: analytical signal or unresolved feature
- I2: putative identity or historical review-level catalogue
- I3: matched standard and/or validated targeted identity
- I4: isolated and structurally characterized, or unequivocal standard confirmation

### Occurrence
- O0: not detected / no occurrence evidence in cited source
- O1: historical review-catalogued occurrence
- O2: putative Cannabis detection
- O3: confirmed analytical Cannabis occurrence
- O4: isolated from Cannabis/hemp material and structurally confirmed

### Biosynthesis
- B0: unknown / not assessed
- B1: plausible or source-proposed route
- B2: correlative or targeted metabolomic support
- B3: established pathway/enzyme evidence

## Change policy

A pull request changing canonical data should explain:
- what claim changed,
- which evidence lane changed,
- which source supports the change,
- whether a permanent ID, alias, or relationship is affected,
- and whether the change modifies canon, provenance, or only presentation.

CI is an integrity gate, not scientific peer review. Passing CI proves that the ledger is internally coherent; it does not prove that a scientific claim is true.
