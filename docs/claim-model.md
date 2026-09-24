# Claim and Source Model

Cannabiverse v0.2 makes **claims** and **scientific sources** explicit graph objects.

## Why this exists

A chemistry graph can look authoritative simply because it contains neat arrows. That is unacceptable for a governed research atlas.

Every typed chemistry relationship is therefore projected into a deterministic claim:

```text
source ──SUPPORTS_CLAIM──▶ claim
                           │
                           ├── subject
                           ├── predicate
                           └── object
```

Example:

```text
SRC-BIOSYNTHESIS-2021
        │
        ▼
CPA-CLM-0003
subject:  CPA-CAN-0032 (CBGA)
predicate: BIOSYNTHETIC_PRECURSOR_OF
object:   CPA-CAN-0002 (THCA-A)
status:   ASSERTED_WITH_SOURCE
```

A hypothesis uses the same structure but keeps:

```text
status: HYPOTHESIS
evidence_lane: biosynthesis_hypothesis
```

## Deterministic projection

The current claim ledger is a projection of `data/graph/relationships.json`.

That means it does not create a second independent authority store. CI requires a **1:1 mapping** between chemistry edges and relationship claims:

- same subject
- same predicate
- same object
- same evidence lane
- same authority/confidence
- same scientific source
- same source edge ID

If any of those drift, validation fails.

## Source nodes

Each registered scientific source is also represented as a source node. This lets future releases answer questions such as:

- Which relationships depend on only one source?
- Which sources support the most graph claims?
- Which claims are hypotheses?
- Which claims have later conflicting evidence?
- Which compounds have relationships independently supported by multiple studies?

## What this release does not claim

One paper supporting an edge is **not** the same as independent replication.

The current `SUPPORTS_CLAIM` relationship records provenance, not replication count or study quality. Those become separate evidence dimensions in later releases.


## v0.3 compound evidence receipts

Relationship claims answer **what connection is supported**.

Compound evidence claims answer **what evidence state is attached to this molecule itself**.

Each canonical compound receives stable identity and occurrence receipts:

```text
CPA-EVC-####-I
CPA-EVC-####-O
```

These identifiers are derived from the permanent compound ID rather than list order.

A compound evidence claim stores:

- canonical compound ID
- evidence lane
- exact I/O level
- scientific source
- canonical status
- any occurrence/artifact caution

The generator and CI validator require every one of the 145 canonical compounds to have exactly one identity receipt and exactly one occurrence receipt.

Cannabiverse intentionally does not manufacture compound-level biosynthesis claims from `B0` ("unknown / not assessed").
