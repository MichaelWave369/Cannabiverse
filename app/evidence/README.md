# Evidence Explorer

The v0.3 Evidence Explorer makes two different forms of scientific provenance visible without collapsing them.

## Compound evidence

Every canonical molecule has:

- one identity receipt (`CPA-EVC-####-I`)
- one occurrence receipt (`CPA-EVC-####-O`)

Occurrence receipts surface artifact or occurrence cautions explicitly.

## Relationship claims

Every typed chemistry edge retains its source-aware relationship claim (`CPA-CLM-####`).

## Source view

Each scientific source can be opened as a ledger showing:

- relationship claims supported by that source;
- compound identity/occurrence receipts attributed to that source;
- cautioned occurrence receipts;
- hypothesis claims.

The explorer is a convenience view. Authority remains under `data/`, and CI checks that all generated claim files remain deterministic projections of the canonical graph.
