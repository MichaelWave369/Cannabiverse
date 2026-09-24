#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT = ROOT / "data" / "graph" / "cannabiverse_graph_v0.4.json"
GRAPH = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT

errors: list[str] = []
warnings: list[str] = []

def fail(msg: str) -> None:
    errors.append(msg)

def warn(msg: str) -> None:
    warnings.append(msg)

def require(cond: bool, msg: str) -> None:
    if not cond:
        fail(msg)

if not GRAPH.exists():
    fail(f"graph file not found: {GRAPH}")
else:
    try:
        data = json.loads(GRAPH.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"cannot parse JSON: {exc}")
        data = {}

if not errors:
    compounds = data.get("compounds", [])
    aliases = data.get("aliases", [])
    edges = data.get("relationships", [])
    sources = data.get("sources", [])
    process_nodes = data.get("process_nodes", [])
    provisional = data.get("provisional_candidates", [])
    meta = data.get("metadata", {})

    compound_ids = [c.get("atlas_id") for c in compounds]
    source_ids = [s.get("source_id") for s in sources]
    process_ids = [p.get("node_id") for p in process_nodes]
    provisional_ids = [p.get("candidate_id") for p in provisional]

    require(len(compound_ids) == len(set(compound_ids)), "duplicate canonical atlas_id detected")
    require(len(source_ids) == len(set(source_ids)), "duplicate source_id detected")
    require(len(process_ids) == len(set(process_ids)), "duplicate process node_id detected")
    require(len(provisional_ids) == len(set(provisional_ids)), "duplicate provisional candidate_id detected")

    for cid in compound_ids:
        require(bool(cid and re.fullmatch(r"CPA-CAN-\d{4}", cid)), f"invalid canonical ID: {cid!r}")

    baseline = [c for c in compounds if c.get("canonical_status") == "BASELINE_2021_LOCKED"]
    require(len(baseline) == 125, f"baseline must remain exactly 125 records, found {len(baseline)}")
    baseline_ids = {c.get("atlas_id") for c in baseline}
    expected_baseline_ids = {f"CPA-CAN-{i:04d}" for i in range(1, 126)}
    require(baseline_ids == expected_baseline_ids, "baseline permanent ID set changed; expected CPA-CAN-0001..0125")

    require(meta.get("canonical_compound_count") == len(compounds), "metadata canonical_compound_count does not match compounds[]")
    require(meta.get("historical_baseline_count") == len(baseline), "metadata historical_baseline_count mismatch")
    require(meta.get("post_baseline_confirmed_count") == len(compounds) - len(baseline), "metadata post_baseline_confirmed_count mismatch")
    require(meta.get("provisional_candidate_count") == len(provisional), "metadata provisional_candidate_count mismatch")
    require(meta.get("relationship_edge_count") == len(edges), "metadata relationship_edge_count mismatch")

    source_set = set(source_ids)
    canonical_set = set(compound_ids)
    process_set = set(process_ids)
    provisional_set = set(provisional_ids)
    all_nodes = canonical_set | process_set | provisional_set

    require(not (canonical_set & provisional_set), "a provisional candidate ID also appears in canonical compounds")

    for c in compounds:
        cid = c.get("atlas_id")
        require(bool(c.get("canonical_name")), f"{cid}: missing canonical_name")
        require(c.get("source_id") in source_set, f"{cid}: unresolved source_id {c.get('source_id')!r}")
        require(bool(c.get("source_url")), f"{cid}: missing source_url")
        require(bool(re.match(r"^I[0-4](?:_|$)", str(c.get("identity_level", "")))), f"{cid}: invalid identity_level {c.get('identity_level')!r}")
        require(bool(re.match(r"^O[0-4](?:_|$)", str(c.get("occurrence_level", "")))), f"{cid}: invalid occurrence_level {c.get('occurrence_level')!r}")
        require(bool(re.match(r"^B[0-3](?:_|$)", str(c.get("biosynthesis_level", "")))), f"{cid}: invalid biosynthesis_level {c.get('biosynthesis_level')!r}")
        require(c.get("canonical_status") in {"BASELINE_2021_LOCKED", "POST_BASELINE_CONFIRMED"}, f"{cid}: invalid canonical_status")

    for a in aliases:
        require(a.get("atlas_id") in canonical_set, f"alias points to missing canonical compound: {a}")
        require(bool(a.get("alias")), f"empty alias: {a}")

    for p in provisional:
        pid = p.get("candidate_id")
        require(bool(pid and re.fullmatch(r"CPA-PROV-\d{4}", pid)), f"invalid provisional ID: {pid!r}")
        require(p.get("source_id") in source_set, f"{pid}: unresolved source_id {p.get('source_id')!r}")
        require(bool(re.match(r"^I[0-4](?:_|$)", str(p.get("identity_level", "")))), f"{pid}: invalid identity_level")
        require(bool(re.match(r"^O[0-4](?:_|$)", str(p.get("occurrence_level", "")))), f"{pid}: invalid occurrence_level")

    edge_ids = [e.get("edge_id") for e in edges]
    require(len(edge_ids) == len(set(edge_ids)), "duplicate edge_id detected")
    for e in edges:
        eid = e.get("edge_id")
        require(bool(eid and re.fullmatch(r"CPA-EDGE-\d{4}", eid)), f"invalid edge ID: {eid!r}")
        require(e.get("source_node") in all_nodes, f"{eid}: unresolved source_node {e.get('source_node')!r}")
        require(e.get("target_node") in all_nodes, f"{eid}: unresolved target_node {e.get('target_node')!r}")
        require(bool(e.get("relation")), f"{eid}: missing relation")
        require(e.get("source_id") in source_set, f"{eid}: unresolved source_id {e.get('source_id')!r}")
        require(bool(e.get("source_url")), f"{eid}: missing source_url")
        lane = str(e.get("evidence_lane", ""))
        conf = str(e.get("confidence", ""))
        if "hypothesis" in lane.lower():
            require(conf.startswith("HYPOTHESIS"), f"{eid}: hypothesis lane must use hypothesis confidence, found {conf!r}")

    for e in edges:
        if e.get("source_node") in provisional_set or e.get("target_node") in provisional_set:
            warn(f"{e.get('edge_id')}: relationship touches provisional candidate; review authority manually")

    for r in data.get("reconciliation_log", []):
        require(r.get("source_id") in source_set, f"reconciliation event {r.get('event_id')}: unresolved source_id")

    gov = str(meta.get("governance_rule", ""))
    require("IDENTITY" in gov and "OCCURRENCE" in gov, "metadata governance_rule missing lane-separation doctrine")

print(f"Cannabiverse validator: {GRAPH}")
for w in warnings:
    print(f"WARN: {w}")
if errors:
    for e in errors:
        print(f"ERROR: {e}")
    print(f"FAIL: {len(errors)} error(s), {len(warnings)} warning(s)")
    raise SystemExit(1)

print(
    f"PASS: {len(data.get('compounds', []))} canonical compounds, "
    f"{len(data.get('relationships', []))} edges, "
    f"{len(data.get('sources', []))} sources, "
    f"{len(warnings)} warning(s)"
)
