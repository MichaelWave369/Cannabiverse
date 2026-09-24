# Data

The authoritative release graph lives under `data/graph/`.

## Rules

- Canonical compounds use permanent `CPA-CAN-####` IDs.
- Historical IDs are metadata, not replacements for permanent IDs.
- Provisional candidates remain outside the canonical compound array.
- Every canonical compound requires provenance.
- Every graph edge requires resolvable endpoints and provenance.
- Evidence authority is lane-specific.

Validate with:

```bash
python scripts/validate_atlas.py
```
