# Evidence Model

Cannabiverse uses independent evidence lanes.

## Why separate lanes?

A single score creates false authority. For example:
- an isolated compound can have I4 identity but weak human-effect evidence;
- a hypothesized pathway can involve two confirmed compounds while the edge itself remains uncertain;
- a historical review entry may have strong nomenclature continuity but contested natural occurrence.

## Canonical lanes

**Identity:** I0–I4  
**Occurrence:** O0–O4  
**Biosynthesis:** B0–B3

Bioactivity, human-effect and safety lanes are reserved for later releases and must remain independent when added.

## Edge authority

Relationships include a `confidence` field and an `evidence_lane`.

Examples:

```text
CBGA --BIOSYNTHETIC_PRECURSOR_OF--> THCA
confidence: HIGH
lane: biosynthesis
```

```text
CBCA synthase --POSSIBLE_ENZYME_INVOLVEMENT_IN--> cis-Δ9-THCA
confidence: HYPOTHESIS_SUPPORTED
lane: biosynthesis_hypothesis
```

The second edge is not allowed to render as an established pathway.
