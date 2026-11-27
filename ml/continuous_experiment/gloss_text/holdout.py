"""Separa componentes ainda inéditos no ensaio textual do VLibrasBD v2."""

import hashlib

from .corpus import MAX_WORDS, SHA256, sentence_components


PROTOCOL = "vlibrasbd-v2-heldout-components-01"
PREVIOUS_SHA = "556131fe63d105c0613a06431bacc9ce51acc1e9be80545361b7fa4c7ef8d3dc"
LIMITS = {"dev": 1200, "test": 1800}


def digest(purpose, value):
    return hashlib.sha256(f"{PROTOCOL}/{purpose}/{value}".encode()).hexdigest()


def eligible_by_split(pairs, previous):
    keys, components = sentence_components(pairs)
    component_by_row = {pair.row: root for pair, root in zip(pairs, components)}
    exposed = {number for rows in previous["rows"].values() for number in rows}
    used = {component_by_row[number] for number in exposed}
    eligible = {split: [] for split in LIMITS}
    seen_pairs = set()

    for pair, endpoints, component in zip(pairs, keys, components):
        if component in used or not (1 <= len(pair.gloss) <= MAX_WORDS and 1 <= len(pair.portuguese) <= MAX_WORDS):
            continue
        if endpoints in seen_pairs:
            continue
        seen_pairs.add(endpoints)
        destination = "dev" if int(digest("component", component)[:16], 16) % 2 == 0 else "test"
        eligible[destination].append((digest("sample", pair.row), pair.row))
    return eligible, component_by_row, used, exposed


def reserve(pairs, previous):
    eligible, component_by_row, used, exposed = eligible_by_split(pairs, previous)
    rows = {"train": previous["rows"]["train"]}
    allocated = set(used)
    for split, count in LIMITS.items():
        selected = sorted(row for _, row in sorted(eligible[split])[:count])
        new_components = {component_by_row[row] for row in selected}
        if len(selected) != count or new_components & allocated:
            raise ValueError("Sobreposição de componentes ou quantidade insuficiente para o recorte.")
        allocated.update(new_components)
        rows[split] = selected

    return {
        "protocol": PROTOCOL,
        "csv_sha256": SHA256,
        "previous_manifest_sha256": PREVIOUS_SHA,
        "previous_exposed_rows": len(exposed),
        "excluded_components": len(used),
        "available": {split: len(entries) for split, entries in eligible.items()},
        "rows": rows,
    }
