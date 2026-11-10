# ECS Signal Journey Lab · content v1

## Authority and purpose
- Authoritative step records: `data/ecs-network/journeys-v1.json`
- Canonical ECS entity and claim ledger: `data/ecs-network/evidence-v1.json`
- Browser explorer: `app/ecs/journeys.html`
- Existing body map: `app/ecs/body.html`

This is an **additive, separate read-only educational domain**. It does not change the core ECS evidence contract, Phi Research Bridge v2 manifest, 145-compound phytocannabinoid canon, original Sacred Medicine paper, or published Zenodo PDFs.

**MECHANISM ≠ HUMAN EFFICACY · RECEPTOR ACTION ≠ HEALTH IMPROVEMENT · SCHEMATIC ≠ LIVE SIMULATION**

## Journeys
1. **2-AG synaptic retrograde signaling:** postsynaptic triggers; DAGL contribution; 2-AG presynaptic CB1 engagement; modulation of transmitter release; MAGL degradation. These observations are drawn from neuronal/cellular preclinical physiology, not a claim that cannabis improves memory, mental health, or human pain.
2. **Anandamide (AEA) metabolic routes:** NAPE-PLD contributes to AEA synthesis; AEA is an endogenous messenger; FAAH is a major termination route; competing synthesis/degradation routes make single-enzyme simplifications incomplete. No universal deficiency is diagnosed or treated.
3. **CB2 immune-cell context:** CB2 expression varies by immune cell and conditions; model-dependent receptor signaling may alter mediators; clinical outcomes and cannabis product efficacy cannot be inferred from model results.

## Scientific receipts
Each journey has an explicit study model and boundary. Every step includes:
- permanent `ECS-STEP-###` ID, stage, description, research note
- `entity_ids` referencing existing `ECS-ENT-###` entities
- `related_claim_ids` referencing existing `ECS-CLM-###` claims
- `source_ids` resolving to full original research links in this versioned feed

The validator rejects any step with an orphan canonical entity, unsupported claim, missing source, an uncited biological entity, duplicate ID, missing clinical boundary, or incompatible contract.

## Interface
The UI is dependency-free browser HTML/JS, fully keyboard-operable with native buttons, explicit selected state, previous/next/restart controls, visible study-model disclaimers, and original source hyperlinks. Stage progression is manually driven and **does not depict speed, concentration, causal treatment success or real-time physiological measurement**. If either source feed is absent or incompatible, it fails closed.

## Validation
`npm run validate:ecs-journeys` and `npm run validate:static-js`, included in the main `npm run validate` path and GitHub PR workflow.

Sources curated: 2026-11-10; fundamental sources include synaptic transport physiology (PMC8481389), enzymatic signaling (PMC3150828), AEA metabolism (PMC10441647), receptor pharmacology (PMC12098862), and preclinical pain research (PMC8819673). Scientific content requires human review prior to significant updates. Green CI tests consistency and contracts, **not independent medical truth**.
