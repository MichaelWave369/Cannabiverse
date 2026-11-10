# ECS Network Atlas v1 · additive evidence domain

## Authority and scope
The authoritative feed is `data/ecs-network/evidence-v1.json`. The browser explorer at `app/ecs/` and the Sacred Medicine consumer must never invent scientific claims. This is a **new evidence domain**, not an expansion of the 145-record Cannabis phytocannabinoid canon.

**RECEPTOR PRESENCE ≠ BENEFIT · MECHANISM ≠ HUMAN EFFICACY · EXPOSURE ≠ HOMEOSTASIS · NATURAL ≠ SAFE**

## Provenance
- Sources: peer-reviewed foundational and pharmacology reviews, AHRQ 2025 clinical systematic review, and living NIH NCCIH guidance. Each claim cites a source ID resolvable in this feed.
- Entity kinds: `endocannabinoid`, `receptor`, `enzyme`, `phytocannabinoid`, `context`.
- Stable IDs: `ECS-ENT-###` for entities, `ECS-CLM-###` for claims, `ECS-REL-###` for relationships.
- Relations must point to an existing claim which explicitly includes both entities.
- AEA and 2-AG are endogenous lipid messengers, not Cannabis-derived phytocannabinoids. No fictional `CPA-CAN` IDs are assigned.
- Δ9-THC and CBD reference existing canonical plant compounds only as context. Their associated biological or product results cannot be promoted to clinical claims about an isolated molecule.
- The retrograde signaling explanation is an experimentally observed *example*, not a complete model of the ECS.
- CB2 immune signaling is contextual, not a promise of human anti-inflammatory benefit.
- Enzymes shown in a simplified cycle are major players rather than the only synthesis/degradation routes.

## Bridge
The v2 read-only research manifest now registers `ecs-network` as an additive evidence domain. Its **contract remains v2.0.0**, and the content release becomes **5.0.0**. Both consumers must fail closed if a feed is absent or incompatible. No published Zenodo PDFs were altered.

## Validation
Run `npm run validate:ecs-network` and `npm run validate:bridge`. The first catches broken source IDs, orphan graph relationships, fabricated canonical plant IDs, missing scientific boundaries, and unexpected dataset contracts. **Green CI checks integrity, not independent scientific replication.**

## Content review
The source ledger was assembled 2026-11-09 and should be reassessed by qualified human reviewers before making new medical claims. Users should not treat the atlas as individual medical advice or a substitute for care.
