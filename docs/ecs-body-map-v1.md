# ECS Human-Body Map v1 · schematic source-governed tissue explorer

## Source ownership
- Independent, additive evidence feed: `data/ecs-network/tissues-v1.json`.
- Existing canonical ECS claims: `data/ecs-network/evidence-v1.json`.
- Browser view: `app/ecs/body.html`.
- The **Φ Research Bridge v2 transport contract and ECS evidence-v1 contract are unchanged**, because this is a separate tissue-index view rather than a new category of clinical claim.
- The Sacred Medicine consumer remains read-only and retains its current source model. There are no new phytocannabinoid canonical identities, no changes to published papers or Zenodo releases, and no user data collection.

## Data semantics
- `TISSUE-REG-###` is a stable **schematic region** identifier. It is not a patient anatomical feature, a clinical diagnostic code, a receptor-density measurement, or a statement of uniform tissue expression.
- `marker` stores approximate x/y percentages within the drawn body silhouette. Skin and adipose tissue occur in many anatomical places, and immune cells circulate throughout the body; a single pin is only a navigation affordance.
- Each region has one or two `receptors` records with explicit `CB1` / `CB2`, cell context, mechanistic pathway steps, species/study context (`evidence_context`), method boundary, registered source IDs, and `related_claim_ids` that must resolve in the original ECS ledger.
- `human_and_preclinical_review` does **not** claim every cited mechanism was directly measured in living humans. `preclinical_emphasis` and `context_dependent_preclinical` communicate important evidence limitations.
- CB2 brain expression is conditional and varies by experimental model, injury/inflammation and cell population. The map must not render a brain-wide CB2 distribution claim.
- Tissue records show `possible / described pathway` in research settings, not a demonstration of clinical benefit. The display retains the same caution regardless of receptor filter.

## Scientific guardrails
**RECEPTOR LOCALIZATION ≠ BENEFICIAL MODULATION ≠ CLINICAL EFFICACY ≠ SAFETY.**

Do not translate pathway steps into clinical recommendations for inflammatory bowel disease, metabolic conditions, neuropathic pain, skin disorders, brain health, or immune disease. Do not imply cannabis makes every body system run better or creates a universal homeostatic correction. Do not infer receptor **density** or expression **quantity** from pin color or size. Human relevance varies; in particular, pain-pathway experiments contain substantial preclinical evidence.

## Reproducibility and validation
`npm run validate:ecs-tissues` checks:
- Stable region IDs and visible, finite marker coordinates
- Source URLs and unique ID receipts for every receptor claim
- Receptor values limited to CB1/CB2, each with an explicit study context
- Upstream ECS claim references, evidence limits and per-record study models
- Known failure cases: orphan sources, nonexistent claim links, invalid coordinates

`npm run validate:static-js` also parses the browser's inline JavaScript. The frontend loads both evidence feeds, checks version IDs/graph edges, uses DOM text nodes (not untrusted HTML), and fails closed when feeds are missing/incompatible.

## Sources and review
The initial tissue citations are sourced from 2021–2025 peer-reviewed basic science, GI, dermatological, metabolic, receptor pharmacology and preclinical pain reviews, plus the NIH living safety page. Links are discoverable in each evidence card and the JSON. Initial curation: 2026-11-09. Update material claims only with a new scoped source receipt and human scientific review. Green CI proves structural integrity, **not** that every scientific mechanism has been independently replicated.
