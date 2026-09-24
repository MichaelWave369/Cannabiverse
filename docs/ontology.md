# Cannabiverse Ontology

## Permanent identifiers

Confirmed canonical compounds use opaque IDs:

```text
CPA-CAN-0001
CPA-CAN-0002
...
```

IDs never encode potency, priority, importance, discovery date, or evidence strength and are never recycled.

Provisional candidates use a separate namespace:

```text
CPA-PROV-####
```

## Node classes

- canonical phytocannabinoid
- provisional/search-target compound
- precursor metabolite
- enzyme
- scientific source
- future: observation receipt, claim receipt, biological target, assay, sample, chemotype

## Relationship classes

Current typed edges include:

- `BIOSYNTHETIC_INPUT_TO`
- `BIOSYNTHETIC_PRECURSOR_OF`
- `DECARBOXYLATES_TO`
- `OXIDIZES_TO`
- `ISOMERIZES_TO`
- `PHOTOCYCLIZES_TO`
- `STEREOISOMER_OF`
- `POSITIONAL_ISOMER_OF`
- `GEOMETRIC_ISOMER_OF`
- `ENANTIOMER_OF`
- `EPIMER_OF`
- proposed/hypothesis relations such as `POSSIBLE_ENZYME_INVOLVEMENT_IN`

Relationship names describe topology. Evidence fields describe authority.

## Graph rule

**An edge has provenance and authority just as a node does.**

A line on a visualization must never imply more certainty than the relationship receipt allows.
