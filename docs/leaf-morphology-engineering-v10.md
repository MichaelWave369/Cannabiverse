# Φ LeafLab Network Engineering Lab v1.0

**Status:** entirely synthetic packet-routing experiments over user-annotated two-dimensional line geometries. No botanical transport, router hardware, real network workload or clinical result is measured here.

[Launch the Network Engineering Lab](../app/leaflab/engineering.html). It complements rather than changes the existing [v0.9 packet simulator](../app/leaflab/packets.html), [v0.8 geometric atlas](../app/leaflab/network.html) and [v0.7 human line reference](../app/leaflab/veins.html).

## Research motivation

The v0.9 comparator used equal capacity **per edge**. More heavily connected graphs then received more total nominal traffic capacity, which can confuse topology effects with hardware budget. Version 1.0 introduces **equal total integer link-slot budgets** for three same-node-position graphs, and repeats every comparison across deterministic traffic seeds.

The three network layouts remain:

- Human-annotated line geometry. The crossings and junctions are based strictly on explicit marked coordinates; visual crossings do not connect automatically.
- Euclidean minimum spanning tree, over the same marked coordinates.
- Best-centered Euclidean star, over the same marked coordinates.

The latter two are *hypothetical* straight-edge baseline graphs. Their links can leave a leaf outline or pass through implausible locations.

## Equal total link-capacity slots

Let c(e) be the integer number of artificial packet transmissions allocated to each undirected link e per discrete tick, where **1 ≤ c(e) ≤ 12**. Let B be the common installed slot budget:

B = sum over links of c(e).

For **every** topology, the simulator insists on B being identical. This requires B to be at least the greatest number of edges in any compared topology, and at most 12 times the smallest number of edges (also capped at 3,000 slots). If no equal integer budget is possible, the comparison is rejected rather than faking equality.

Two declared allocation policies:

1. **Even slots:** assign one to each link, then distribute remaining slots round-robin until B is exhausted.
2. **Short link first:** assign one to each link, then fill the shortest links up to 12 slots each before longer links.

The second is intentionally a crude cost-efficient alternative, not a proven best traffic design. It can overload long connector edges.

For context, the app also reports:

- **Wire-length proxy** = sum of all Euclidean image-edge lengths.
- **Capacity-weighted wire cost proxy** = sum of (image edge length × installed integer packet slots).

Although all topologies receive B total slot units, their capacity-weighted wire-cost proxies can differ substantially. This *does not* impose an equal material budget. Pixel length lacks physical channel area, installation complexity, propagation velocity, power consumption, device cost, or biological growth constraints. We therefore report this proxy openly instead of calling B a physically fair total-cost comparison.

The v0.9 simulation engine now accepts an optional validated per-link capacity array and recomputes per-edge remaining slots and total available capacity each tick, while preserving all existing uniform-capacity behavior and tests.

## Multi-seed methodology

Each experiment accepts 1–5 deterministic traffic seeds with a first seed and an explicit increment of 7,919 modulo the positive 31-bit range. Each seed produces the **same exact offered packet source-destination pairs** for every routing strategy and every topology.

The traffic generator supports:

- **Uniform-pairs:** pseudorandom distinct source-destination nodes.
- **Hub-hotspot:** an engineered concentration of at least half of offered demands involving a chosen node, used to stress common choke points.

Both use seeded synthetic traffic, *not* an observed network workload. Each seed has a reproducible short fingerprint. The fingerprint is a reproducibility token, **not a signed record**.

The same three routing strategies from v0.9 are evaluated separately for each topology: shortest distance, queue-aware congestion avoidance, and bridge-avoiding heuristic. With three topologies, three strategies and five seeds the maximum is **45 experimental runs**.

Defaults use 3 seeds and a bounded traffic duration; the tool rejects multi-seed workloads over 90 ticks, 8 offered packets per tick, or a capped computational-cost estimate. The existing v0.9 engine accepts up to 80 graph nodes. These gates are browser responsiveness controls, not statistical design decisions.

### Shared node failures only

The v1.0 cross-topology experiment can apply no outage or one **identically numbered node failure** on every compared graph, for the same ticks. A numbered edge in a star is not necessarily the same connection as the same-numbered edge in an MST. The v1.0 comparison therefore **rejects numbered link-outage scenarios entirely**, leaving the v0.9 one-topology link-outage experiment as the appropriate separate feature.

## Performance and uncertainty

Each run retains the complete deterministic simulation metrics: packets generated, delivered, dropped, unfinished, drop reasons, delivered-only mean/p95 delay, peak node queues, link-slot utilization, per-link transmission totals and per-tick timelines. The engine asserts:

**generated = delivered + dropped + unfinished**

The v1.0 table groups outcomes by topology and routing mode across all tested seeds. It reports mean delivered fraction ± **population SD** (descriptive, across the actual seeds chosen), mean drop fraction, mean delivered latency and a cost-normalized **delivered packets per offered-traffic tick divided by capacity-weighted wire-cost proxy**. Individual runs can be inspected with their exact drop reasons and timeline chart.

The standard deviation, observed minimum and maximum from 1–5 seeds are **not confidence intervals, significance tests, real-world performance guarantees or external validation**. Tuning parameters against these selected seeds eliminates any claim of untouched test performance.

**Latency is conditional on delivered packets.** A strategy that drops many slow packets may report a deceptively low average. Never rank strategies by latency without the delivery, loss and unfinished fractions, and consider that a shorter geometric path can still produce queue congestion.

## Explicit limits

This remains a discrete one-hop-per-tick packet model with FIFO queues, ascending node-ID arbitration and shared bidirectional edge packet slots. It is not a production IP stack, TCP congestion control, actual fiber/ethernet routing policy, measured propagation delay, priority-queue scheduler or retransmission model. It does not include variable propagation delay or traffic class prioritization. Those are candidates for a later controlled engineering revision, not silently implied features of v1.0.

No actual cannabis vein structure, xylem/phloem conductance, source-species identity or photographic authenticity is established by the model. User-imported image-line coordinates are only user-asserted observations. Synthetic demo graphs are explicitly labeled as such.

The governed Cannabiverse molecular chemistry, evidence provenance and clinical/medical research repositories remain unchanged.

## Reproducibility and tests

Run npm run validate:leaflab-engineering to exercise equal slot budgets, allocation policy differences, hotspot traffic, all seed × routing × topology combinations, link-capacity-sensitive losses, workload consistency, invalid-input rejection, compute bounds and local browser interface references.

Run npm run validate for all existing Cannabiverse validation checks.

A meaningful future engineering comparison would require equal **physical equipment cost**, realistic per-link propagation and bandwidth constraints, verified biological network topology from independent specimens, packet priorities and measured external network workloads before making claims about useful architecture transfers.
