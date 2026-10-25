# Φ Research Bridge v2
**Single publication authority:** Cannabiverse owns molecular identities, independent chemistry receipts and source-bound study claims. Sacred Medicine is a read-only educational consumer.

## Static manifest
`data/bridge/research-index-v2.json` is a **versioned index of existing governed data feeds**, not a duplicate claims ledger. It advertises:
- Canonical chemical identity/occurrence receipt summaries (145 records)
- Governed 3D conformers (only where present)
- Chemical source registry
- Scoped ontology domain entries, initially oncology evidence v1
- Exact contract versions, explicit limitations and consumer deep links

The manifest is loaded from Github Pages with no accounts, backend, tokens or storage. Relative URLs resolve against the manifest URL; neither app invents missing biological effects.

## Link semantics
`MENTIONED_IN_CITED_CLAIM` is a navigational relationship inferred *only* from explicit `related_compounds` values in versioned evidence claims. No identity/occurrence/biosynthesis promotions or new clinical efficacy conclusions follow from a connection.

A chemical registry source demonstrates only its appropriate chemistry lane. A 2016 narrative review is not a new primary experiment. The NCI PDQ summary is a living resource; refresh the review before future medical publication.

## Client safety and fail-closed behavior
Consumers check `contract_version`, `dataset_id`, per-domain versions, source IDs and linked canonical molecule IDs. Unavailable feeds show a transparent unavailable state; there are no offline replacement medical claims. Strong clinical warnings remain visible. New research domains must have separate bounded evidence feeds and source receipts, then be registered in this manifest. Breaking schema revisions require a new versioned file.

## Validation
Run `npm run validate:bridge` or `npm run validate`. The CI job also runs bridge validation. The original ontology, 145-molecule canon and oncology-v1 feed are not rewritten.
