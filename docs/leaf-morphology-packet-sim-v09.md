# Φ BioNetwork Simulator v0.9

**Research status:** standalone, synthetic packet-routing simulations on abstract 2D graphs. The network source may be a human-drawn image of vein-like lines, but neither the plant identity nor its real vascular topology or transport capacity is authenticated. No real network telemetry, leaf sap flow, Internet routing protocols, or medical measurements are collected.

[Open the BioNetwork Simulator](../app/leaflab/packets.html). The interface is local-only, static HTML and ES modules, with no backend, database, telemetry or remote API.

## What the v0.9 network represents

The graph comes from the v0.7 line-reference workflow and v0.8 geometric topology. Image-line vertices are numbered and weighted by 2D pixel distance. Only explicit shared annotated nodes connect. Simple visible line crossings are not automatically junctions. Each graph edge becomes an *artificial*, undirected, bidirectional packet channel with an integer capacity specified by the experimenter.

The simulator compares three sets of edges on the **same marked node positions**:

1. The image-annotated line graph.
2. An unconstrained Euclidean minimum spanning tree (MST).
3. A best-centered straight-line star network.

The MST and star can have physically impossible links going outside the leaf. Equal per-edge capacity gives topologies with more edges more total nominal capacity. Therefore, no intrinsic botanical or network-architecture advantage is demonstrated by these artificial comparisons.

Graphs must contain between **2 and 80 nodes**, at most 300 links. Too-detailed source polylines are rejected rather than silently truncated. The v0.8 geometry atlas supports more nodes because its task is different.

## A deterministic, shared traffic plan

The user selects traffic duration (10–150 discrete ticks), offered demand per tick (1–12 artificial packets), per-link capacity (1–12 packet slots per tick), maximum per-node queue size (4–100), and a positive integer traffic seed.

A fixed, deterministic xorshift32 generator creates the **same source-destination packet pairs for every routing strategy and topology** on the same set of nodes. A short deterministic traffic fingerprint identifies the offer sequence in each report. It is *not a cryptographic signature*. Traffic is generated independently of graph connectivity and failure schedules: packets may be offered to unreachable nodes, and those failures are counted.

Each packet can traverse **at most one edge per tick**. Edges share their capacity between both directions (a full-duplex real network does not necessarily behave this way). Every vertex has a FIFO queue, serviced in ascending node-ID order. That arbitration policy introduces ordering bias but is identical across runs. Arriving packets can be queued, forwarded, delivered, or counted as explicitly dropped. The simulator does not silently discard demand.

After the offered-traffic period, a bounded draining phase processes remaining queues without adding traffic. Unfinished packets remaining after the cap are counted separately from delivered or dropped. Every run checks:

generated = delivered + dropped + unfinished.

## Predeclared routing strategies

All strategies recompute paths using the currently surviving links and the same per-tick link capacity. Each routes towards the specified destination using positive weighted shortest paths.

- **Shortest distance:** choose the least total Euclidean pixel length. Doesn't proactively avoid congested links.
- **Queue-aware:** increase link weights according to used per-tick capacity and the queue fraction at downstream nodes. This may take longer paths to avoid bottlenecks.
- **Bridge-avoiding:** add penalties for links which, if removed, would disconnect a component (Tarjan bridge classification), plus milder capacity and queue-pressure penalties. A bridge may be unavoidable. This is a named heuristic, **not** formally proved optimal failover or an implementation of the IETF's routing standards.

Weights, thresholds and policies are frozen in source code for version 0.9. The algorithms are not trained on botanical or packet data. Path choice is deterministic for a given snapshot, although other routing schemes or arbitration rules could produce very different results.

## Failure injection and fair comparisons

Select **no failure**, **one node outage**, or **one link outage**, and an integer start/duration window. A node outage removes the same numbered marked vertex and all its links from each topology. This permits a meaningful geometric same-node stress comparison, although star and MST may be far more affected by losing their central hub than an annotated mesh.

A link outage removes one numbered edge for the designated topology. **An edge numbered 4 in the MST is not the same physical link as edge 4 in the observed network.** Consequently, link-outage benchmarks compare only the three routing strategies on that one topology, while no-outage and shared-node-outage scenarios compare all nine topology × routing combinations. The code rejects cross-topology edge-index comparisons.

Packets at a failed node, packets destined for a failed node, packets with no current path, packets rejected due to queue overflow, and packets exceeding a bounded waiting time are counted in separate drop-reason buckets. The model **drops** unreachable packets immediately, rather than attempting higher-layer retransmissions or waiting for a fault to repair. That is one deliberately simplified policy, not how real IP applications always behave.

## Output metrics and interpretation

Each run reports offered/generated, delivered, dropped, unfinished and packet-drop categories, as well as delivery fraction, loss fraction, packets delivered per offered-traffic tick, observed maximum per-node queue, link-slot utilization, total transmissions, and delivered-only mean hop count.

Delivered-only mean latency and 95th percentile latency use integer tick differences from the packet's arrival to its final hop. **This metric can improve when slow or congested packets are dropped**, so latency must always be interpreted beside delivery, loss and unfinished packet fraction. Report timelines include offered-traffic and drain phases, per-tick deliveries, drops, transmissions, pending queues and active fault state.

The UI shows all runs and lets you select one to inspect its performance timeline, together with an SVG of the selected topology. Reports include scenario settings, seed/fingerprint, per-link transmissions, timeline and provenance identifiers. They do not include original image pixel arrays or any remote data.

## Testing and limitations

Deterministic synthetic regression fixtures test:

- Same seed and traffic fingerprint across all nine comparison runs.
- Packet conservation under low congestion, overload, disconnected graphs, link and node failures.
- Explicit queue-overflow loss rather than clipping or inventing deliveries.
- Link failure on a tree causing unreachable traffic, compared with a simple closed loop retaining a route.
- Failure-index guards, invalid geometry, duplicate links, wrong traffic metadata and topology mismatches.
- The same-node comparison contract and same-topology-only rule for numbered edge failures.
- Browser UI wiring and no outbound network requests.

**None** of these software tests validates a real plant vein dataset or predicts telecom equipment throughput. A useful future engineering study would compare verified anatomical graphs against **physically feasible, same-cost topology controls**, calibrate real link speeds, propagation and bandwidth, apply realistic failures, queues and retransmission policies, then test independent networking benchmarks. Our current graph measurements are exploratory ideas only.

Cannabiverse's governed molecular identity, chemistry source receipts, medical evidence lanes and other research datasets remain unchanged. No Fibonacci, 3-6-9, vascular hydraulic performance or natural optimality claim is made.

Run npm run validate:leaflab-packets to check this simulator and npm run validate for the complete atlas.
