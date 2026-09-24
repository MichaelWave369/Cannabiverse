# Cannabiverse Explorer

This directory contains the standalone browser explorer generated from the governed Cannabiverse graph.

## Current UI

`index.html` is the v0.6 Query Explorer. It includes:

- structured compound queries
- independent identity and occurrence filters
- family, side-chain, year and canonical-status filters
- artifact and occurrence-caution exclusion
- query receipts
- CSV/JSON result export
- graph traversal
- compound comparison
- shortest explicit relationship paths

The current explorer embeds the v0.4 graph snapshot for standalone/offline use. The authoritative repository data remains under `data/`.

Future releases should generate the embedded explorer dataset from the authoritative data during CI/release packaging so UI state cannot drift from the ledger.
