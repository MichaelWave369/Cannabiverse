# Φ LeafLab Network Atlas v0.8

**Status:** exploratory computational graph analysis. No plant vascular network has been independently anatomically verified by this software. No real specimen photos ship with the atlas.

The [Botanical Network Atlas](../app/leaflab/network.html) converts **v0.7 human-drawn vein-like line reference JSON** into a geometric network. It compares that abstract graph with two conventional network designs and runs deterministic one-link failure scenarios. Original images are never needed or uploaded by this page.

## Source and graph construction

1. Use the [v0.7 Vein Reference Benchmark](../app/leaflab/veins.html) to trace visible line-like features from a flat leaf photo. Export the reference JSON containing marked line points, user-entered specimen and plant IDs, a masked observer code and a SHA-256 of the original photo bytes.
2. Import that JSON into Network Atlas. It recomputes and validates source geometry; the image checksum is **carried as provenance but cannot be verified here without the original photo**. It does not authenticate plant taxonomy, observer blinding or the anatomical identity of marked lines.
3. Each separate polyline point becomes a graph node, with coordinates quantized to 0.01 source-image pixels. Consecutive point pairs become undirected links weighted by Euclidean 2D pixel distance. Repeated identical node locations are joined and repeated undirected links are counted only once. Maximum 140 unique nodes; users with more detailed traces should re-mark a simpler structural overview rather than silently losing points.
4. **Line crossings are NOT automatically graph junctions.** The observer must place the same explicit coordinate on both paths to indicate a connection. A photo cannot establish whether visual crossings indicate a real anatomical connection.
5. If the source line drawing has separate components, the observed graph remains disconnected. The software does not silently repair gaps.

## What the metrics actually mean

- **Total line length:** sum of annotated undirected straight-line edge lengths in 2D image pixels. Not vein material mass, width or physiological conductance.
- **Components:** groups of graph nodes reachable through the explicitly annotated links.
- **Cycle rank:** edges − nodes + components. A graph-theoretic count of independent cycles, not proof of real vascular loops.
- **Geometrical global efficiency:** for all unordered node pairs, Euclidean straight-line distance divided by shortest weighted graph path length; disconnected pairs contribute 0. Defined here only for the same annotated node set. Value lies between 0 and 1 under Euclidean link weights.
- **Path stretch:** shortest link-weighted graph distance divided by direct Euclidean distance, averaged only over reachable node pairs. Disconnected pairs excluded from this conditional metric.
- **One-link failure:** remove each annotated segment in turn and recompute the fraction of all node pairs that remain connected. Report mean and worst remaining connected-pair fractions and count edges whose removal increases the number of components (bridges). These tests have no probability model, no capacity constraints, no distributed rerouting protocol and no environmental damage physics.

The interactive SVG highlights **bridge links** in amber and other links in green. Clicking or keyboard-selecting a link marks it red and shows the loss of connectivity when that one link is removed. All links can be restored.

## Conventional comparator controls

The three displayed graphs use the **same exact marked node positions**:

1. **Annotated line graph:** exactly the manually marked links, including disconnected components if present.
2. **Euclidean minimum spanning tree:** a connected graph of minimum total 2D Euclidean length among all trees spanning those positions. Constructed using Prim's algorithm, not sourced from the leaf.
3. **Best-centered Euclidean star:** links from every other marked position to the existing vertex minimizing total radial link length.

The two controls may connect points using hypothetical straight edges that **leave the leaf silhouette**, cross open space or violate physical growth and flow constraints. They are geometric references only. They cannot be treated as biologically feasible alternatives or evidence that a plant is more efficient than conventional infrastructure.

Comparisons include relative total line length versus MST, cycle rank, global geometric efficiency and mean/worst connected-pair fraction after one edge fails. A network with loops may use more wire but remain connected after one edge disappears. **Neither high resilience nor low length identifies a uniquely optimal design.**

An observed disconnected graph is compared with connected MST and star only as a *what-if*; connectivity differences should not be interpreted as experimental improvement.

## Demonstration versus empirical observation

Two clearly labeled synthetic datasets are supplied: a branching tree with cut edges, and a looped network whose links retain an alternative route under single-edge removal. They are structural software tests, not actual cannabis vein measurements.

Imported human references are marked USER_ASSERTED_GEOMETRIC_ANNOTATION_NOT_BOTANICAL_TRUTH. Reports retain source IDs, source image SHA-256, annotated coordinates, derived metrics, individual failure outcomes and all three comparator summaries. They do not contain original photographs, plant chemical information or medical claims.

The full automated tests verify that a tree contains bridges, a closed loop retains connectivity after any one link breaks, line crossings without shared vertices stay disconnected, identical shared coordinates produce junctions, redundant drawn edges are not double-counted, comparator MST length is the comparison minimum, and malformed or overly complex input is rejected.

## Next research gate

Before seeking networking applications, collect real, permissioned plant images under controlled imaging conditions. Independently verify venation topology at actual junctions rather than assuming crossings are connected. Use blinded annotators and record between-observer disagreements. Lock graph-extraction and image-analysis procedures before evaluating untouched plants. Use matched botanical controls, and add measured channel geometry, conductance, simulated or experimentally estimated flow, and graph perturbations linked to physical failure modes. Then benchmark against plausible engineered graph designs subject to comparable physical constraints.

**This atlas makes no claims about Fibonacci, 3-6-9, biological optimality, vascular hydraulics, or superiority to engineered networks.** Its results are optional exploratory morphology records, separate from Cannabiverse’s governed chemistry and medical evidence.

Run npm run validate:leaflab-networks for its synthetic topology tests, or npm run validate for all Cannabiverse regression gates.
