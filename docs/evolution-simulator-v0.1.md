# Φ Ancestral Cannabis Simulator v0.1

## Purpose

A local-first, **synthetic** population-genetics demonstration built into Cannabiverse. Four populations begin as **identical copies of one artificial ancestral gene pool** and then diverge under drift and different selection scenarios. It illustrates how common ancestry can produce different population-level traits; it **does not** reconstruct an ancient cannabis genome.

Open [the simulator](../app/evolution/) from the Cannabiverse home page.

## Model specification

- **Populations:** four isolated lineages, each starting with identical synthetic diploid individuals.
- **Allele labels:** abstract `T` and `B` at a single toy locus. They are **not** THC/CBD concentration, genetic sequence variants, cannabinoid synthase alleles, indica/sativa categories, or predictions of chemotype.
- **Independent synthetic fiber score:** a normalized continuous trait in [0,1], initialized around 0.5 and inherited as the parental midpoint plus random perturbation. It is **not measured fiber percentage**.
- **Reproduction:** random mating within each lineage; each descendant chooses one of each parent's abstract alleles.
- **Selection:** parent sampling is weighted by `exp(selection_intensity × score)`; score is zero for the unselected lineage, fiber score for fiber selection, T count fraction for T selection, and B count fraction for B selection.
- **Chance:** pseudo-random parent choices, allele draws, fiber perturbations, and a fictional per-allele mutation probability of 0.0005. None of these settings has been calibrated to cannabis ecology.
- **Generations:** discrete, nonoverlapping; fixed number of individuals per lineage and no migration.
- **Determinism:** the same seed and inputs yield identical outputs. The four populations are sampled from a **single shared initial population** but experience independent later random events.

Outputs include allele frequency, normalized fiber-trait mean, plotted trajectories, and a JSON download of simulation parameters and all generation summaries. Data stay within the browser; the model requires no network, external dependencies, accounts, or user data.

## Evidence separation

**SIMULATION ≠ ANCIENT DNA ≠ MEASURED CHEMISTRY ≠ HISTORICAL INFERENCE.**

The simulation's T and B labels, artificial population, allele frequencies, synthetic fiber metric, fitness weights, and mutation frequency are illustrative only. There is no recovered ancestral genotype in this tool. The output is *not* evidence that historical cannabis was once a single individual tree, that ancient plants produced psilocybin, or that cannabis represented either biblical tree in Eden.

Cannabis cultivars commonly called hemp, CBD-rich, and THC-rich can share ancestry and overlap in classifications; commercial indica/sativa labels do not denote four mutually exclusive species or branches. A real ancestral reconstruction would need representative modern/paleogenomic datasets, authenticated ancient sequences where available, orthology-aware alignments, plausible uncertainty ranges, and documented model calibration. Even with genomic data, environmental regulation and measured chemistry would need separate validation.

## Sources for context (not simulation parameter estimates)

1. Ren et al. (2021), *Large-scale whole-genome resequencing unravels the domestication history of Cannabis sativa*. https://doi.org/10.1126/sciadv.abg2286
2. *Domesticated cannabinoid synthases amid a wild mosaic cannabis pangenome* (2025). https://doi.org/10.1038/s41586-025-09065-0

These publications motivate questions about cannabis ancestry and genomic diversity; they did **not** establish the toy model's numeric settings.

## Testing and governance

Run `npm run validate:evolution` for deterministic results, initial population equality, output bounds, seed sensitivity, local-only behavior, and scientific label checks. This test also runs through `npm run validate` and CI.

This module is isolated from the canonical phytochemistry and source-ledger data. No simulation can create, alter, or promote a confirmed compound, biological occurrence, mechanism, clinical effect, or archaeological claim. See [GOVERNANCE.md](../GOVERNANCE.md).
