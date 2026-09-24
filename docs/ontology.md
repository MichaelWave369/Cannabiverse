# Ontology

## Canonical entity classes

### Compound
A chemically identified cannabinoid record with a permanent Atlas ID.

### Provisional candidate
A putative detection, search target, unresolved identity, or candidate that has not met the canonical acceptance gate.

### Source
A primary or review publication, official source, or other provenance record.

### Relationship
A typed, source-backed edge between graph nodes.

### Process node
An enzyme, precursor metabolite, or other non-cannabinoid node needed to express chemistry without pretending every graph object is a cannabinoid.

## Common relationship types

- `BIOSYNTHETIC_INPUT_TO`
- `BIOSYNTHETIC_PRECURSOR_OF`
- `DECARBOXYLATES_TO`
- `OXIDIZES_TO`
- `ISOMERIZES_TO`
- `PHOTOCYCLIZES_TO`
- `STEREOISOMER_OF`
- `POSITIONAL_ISOMER_OF`
- `GEOMETRIC_ISOMER_OF`
- `EPIMER_OF`
- `PROPOSED_OXIDATIVE_CLEAVAGE_TO`
- `POSSIBLE_ENZYME_INVOLVEMENT_IN`

New relationship types should be explicit rather than hidden in prose.
