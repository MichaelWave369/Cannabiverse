# Φ LeafLab v1.1 · Transport Engineering Lab

**Evidence status:** synthetic packet-routing simulator. This does **not** validate cannabis veins, xylem/phloem conductance, telecommunications hardware, real networks, or any evolutionary transport optimality.

The standalone [Transport Engineering Lab](../app/leaflab/transport.html) builds on v1.0's controlled packet-routing work. It uses identical marked node positions for an annotated geometric graph, a straight-line minimum-spanning tree and a best-centered star. Each is an **abstract** topology. The MST/star may contain links which do not fit within a leaf or any physical constraint.

The workflow accepts v0.7 human line-reference JSON or explicitly labeled synthetic branching/looped demonstrations. Input SHA-256 is carried as a self-asserted image-byte identifier. The original photograph is neither required nor rechecked by this screen; no image data or plant chemical information is uploaded.

## Improvements over v1.0

### A shared maximum *cost* ceiling, not just a shared link-slot count

Version 1.0 installed the same total integer packet capacity slots across compared graphs. But a capacity slot on a long straight link was not treated as more expensive than a slot on a short link. In v1.1, the user chooses one shared **maximum capacity-weighted wire-cost proxy**:

C = sum over links (Euclidean image-pixel length × installed integer packet slots).

Every graph must install at least one slot on every original link. If any graph cannot fit even this baseline under the cap, the comparison is rejected. Extra slots (up to 12 per link) are assigned by either:

- **Even slots:** round-robin extra slots when their full length cost remains affordable, or
- **Short link first:** fill the shortest links to 12 before moving to longer links, while under the cap.

The spent cost, remaining allowance, installed slot count and per-link allocation are exported. Each graph may **leave different unused allowance**, due to integer capacity and its own link lengths. The lab does not claim equal realized spend. This is an image-length proxy, with no real geographic units, pricing, switching costs, propagation velocity, power draw, interference, maintenance, conduit, redundancy hardware or biological flow resistance.

### Propagation delays on individual links

Each synthetic packet hop now takes:

**link propagation ticks = max(1, ceil(edge image-pixel length / chosen pixels propagated per tick)).**

This is a user-selected scale, **not** measured physics or a calibrated packet delay. Capacity limits launches per link per tick, but packets already in transit remain in flight. This is pipelined propagation rather than a link being reserved for every entire delay tick.

A packet first advances to its next node **after** its link propagation delay. A packet can traverse at most one link launch in a tick, and intermediate hops require a later tick to be dispatched. Queue delay and link delay combine in end-to-end delivered-only latency.

### Two classes with strict output scheduling

Each offered packet gets a reproducible **high** or **standard** class using a deterministic schedule derived from the offer serial number and traffic seed. The configured high-priority percentage determines the fraction of offers flagged for preferential service. Scheduling sends all queued high-class packets before queued standard-class packets at each vertex, preserving FIFO order *within* a class.

This is intentionally simple **strict priority**: it can starve normal traffic, especially on constrained links. Both classes share the same fixed-size queue for admission. Arrivals are not given priority admission or reserved buffers. The simulator reports generated, delivered, dropped, unfinished, reference-relative delivery fraction, mean and p95 delivered-only latency **separately for both classes**, and also combined.

A low latency calculated only for delivered high-class packets can be misleading when low-class traffic was dropped or starved. The full report retains both groups.

### Outage handling for packets already in flight

To compare network shapes fairly, v1.1 supports **no fault** or the **same numbered node outage**, with the same onset and duration across compared topologies. A link-number failure is prohibited in cross-topology tests because edge IDs do not identify the same physical connection on different graphs.

When a node is disabled, its queued packets are dropped. In-flight packets crossing a link whose endpoint has failed are also dropped and counted separately as **inFlightNodeFailed**. Source offers and destinations at the disabled node fail with their own distinct reason counts. There are no retransmissions, persistent reservations, error correction or fault repair buffers.

Packet accounting includes **queued and in-flight unfinished packets**. The exact invariant is checked on every run:

**generated = delivered + dropped + unfinished**.

Each priority class must satisfy the same invariant. All runs use finite offered-traffic windows and bounded drain periods; packets remaining after the drain are recorded as unfinished, not quietly declared delivered.

## Comparing algorithms and topology shapes

The same three routing heuristics run with identical traffic offers per seed:

1. Shortest 2D geometric distance.
2. Queue-aware weighting of current link usage and downstream queue occupancy.
3. Bridge-avoiding weighting that penalizes graph links lacking alternate paths.

They are illustrative **routing heuristics**, not formally optimized or IETF-standard IP protocols. Routing is computed over the surviving node graph, while source and destination pairs remain the same across all runs. Topologies must contain identical marked node IDs and coordinates. Each run retains its own deterministic traffic fingerprint, cost allocation, outcome timeline and error categories.

One experiment supports 1–3 seeds, 10–60 traffic ticks, 1–6 offered packets per tick, at most 36 nodes/110 links, and a shared compute-work cap. The bounds protect the browser; they are not a statistical sample-size recommendation. Across-seed mean, population standard deviation and range are **descriptive only**, not confidence intervals.

## What results cannot establish

- A human-marked dark line on a photo is not a confirmed plant vessel; image-line crossings do not guarantee a vascular junction.
- Network cable-length cost, real throughput and link propagation cannot be derived directly from image pixels.
- Real transmission links have changing latency, packet size, bandwidth, error rates, traffic shaping, buffering, scheduling and infrastructure constraints. The model ignores most of them.
- The theoretical tree and star comparators may draw physically impossible edges.
- Repeated tuning on the tested seeds creates evaluation bias; no performance result on an untouched realistic dataset is supplied.
- The simulation provides no evidence for 3-6-9, Fibonacci optimization or cannabis superiority to ordinary network designs.

## Reproducibility and tests

The pure ES-module implementation is app/leaflab/transport-v11.mjs, with a local-only browser frontend at app/leaflab/transport-ui.mjs. Reports export the full scenario, image-source reference ID, seed fingerprints, graph spending, per-class outcomes, fault drop reasons and per-tick pending/in-flight traffic. They do not embed original specimen photographs.

Run **npm run validate:leaflab-transport** for deterministic synthetic checks of:

- a known-length link with two ticks of propagation versus one tick under a faster configured propagation scale;
- high-only and standard-only traffic classifications and separate class conservation;
- cost ceilings across three different topologies, and differences in installed slot totals;
- in-flight packet removal when its endpoint is disabled;
- source/destination consistency across all seeds, routing modes and graphs;
- overload losses, queue limits, invalid graph geometry, and bad scenario arguments;
- UI wiring and absence of network fetch calls.

The earlier v0.9 and v1.0 regression suites continue running independently in the full **Validate Atlas** workflow. The governed Cannabiverse chemistry and medical evidence remain unchanged.

**Next scientific step:** use permissioned real images and independent botanical experts to authenticate actual vein connections and dimensions. Only then consider engineering analogies, with feasible real-world topology baselines and physical network experiments under comparable cost constraints.
