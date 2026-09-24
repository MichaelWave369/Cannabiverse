# Data contracts

These JSON Schemas document the stable public contracts for canonical compounds, graph relationships, and scientific sources.

The zero-dependency CI validator in `scripts/validate-atlas.mjs` enforces cross-record invariants that JSON Schema alone cannot express, including source resolution, graph endpoint resolution, baseline immutability, namespace separation, and hypothesis-edge discipline.

Schema validity is necessary but not sufficient for scientific authority.
