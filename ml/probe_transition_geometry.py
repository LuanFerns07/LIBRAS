"""Sonda posição e anisotropia de Cinco em treino/validação e vídeos de desenvolvimento."""

import argparse
from collections import Counter
from itertools import product
from pathlib import Path

import numpy as np

from dataset import FRAMES, digest, load_features, write_json
from metrics import decide
from ml.external_eval.evaluate import load_json, verified_model
from ml.evaluate_transition_veto import posterior
from ml.fresh_eval.prepare import PROTOCOL, make_clip


PLAN = PROTOCOL.with_name("transition-geometry-development.json")
FEATURES = ("wrist_center_y", "wrist_center_abs_x", "wrist_vertical_span", "wrist_delta_y",
            "wrist_anisotropy", "wrist_horizontal_share", "fingertip_anisotropy", "fingertip_horizontal_share")
PROFILES = {
    "wrist_position": FEATURES[:4],
    "wrist_motion": FEATURES[4:6],
    "fingertip_motion": FEATURES[6:],
}


def windows(plan):
    low, high = plan["allowedWindowMs"]
    for anchor, offset, duration in product(plan["anchors"], plan["startBeforeAnchorMs"], plan["durationsMs"]):
        start = anchor["motionAtMs"] - offset
        end = start + duration
        if start < low or end > high or not start < anchor["motionAtMs"] < end:
            raise ValueError("Uma janela sai da faixa revisada ou não atravessa a transição.")
        yield {"id": f"ufsm-{anchor['id']}-{offset}-{duration}", "sourceLabel": anchor["sourceLabel"],
               "transitionAtMs": anchor["motionAtMs"], "startMs": start, "durationMs": duration}


def prepare(data, output):
    plan = load_json(PLAN)
    source = load_json(PROTOCOL)["sources"][plan["source"]]
    original = data / "fresh-sign/source" / source["filename"]
    if digest(original) != source["sha256"]:
        raise ValueError("O vídeo de desenvolvimento diverge do registro de origem.")
    output.mkdir(parents=True, exist_ok=True)
    clips = []
    for spec in windows(plan):
        file = output / f"{spec['id']}.mp4"
        make_clip(original, spec, file)
        clips.append({**spec, "file": file.name, "sha256": digest(file), "signer": plan["signer"],
                      "partition": "train", "label": None})
    write_json(output / "manifest.json", {"source": source, "planSha256": digest(PLAN), "clips": clips})


def directional_energy(points, valid):
    adjacent = valid[1:] & valid[:-1]
    changes = np.diff(points, axis=0)[adjacent]
    if len(changes) < 4:
        return None, None
    energy = changes.T @ changes / len(changes)
    total = float(energy.trace())
    if total < 0.01 ** 2:
        return None, None
    low = float(np.linalg.eigvalsh(energy)[0])
    return float(np.clip(1 - 2 * low / total, 0, 1)), float(energy[0, 0] / total)


def geometries(values):
    if values.shape != (FRAMES, 192):
        raise ValueError("A sonda usa 192 atributos, com seis pontos corporais e duas mãos.")
    points = values.reshape(FRAMES, 48, 4).astype(np.float64)
    seen = points[:, [6, 27], 3] == 1
    side = int(seen.sum(axis=0).argmax())
    hand = points[:, 6 + 21 * side:27 + 21 * side]
    tracked = seen[:, side]
    wrist = hand[:, 0, :2]
    center = wrist[6:18][tracked[6:18]]
    first = wrist[:6, 1][tracked[:6]]
    last = wrist[-6:, 1][tracked[-6:]]

    wrist_anisotropy, wrist_horizontal = directional_energy(wrist, tracked)
    palm = np.linalg.norm(hand[:, 9, :2] - wrist, axis=1)
    finger_valid = tracked & (palm >= 0.04) & (hand[:, 9, 3] == 1) & (hand[:, 8, 3] == 1) & (hand[:, 12, 3] == 1)
    fingertips = (hand[:, [8, 12], :2].mean(axis=1) - wrist) / palm.clip(0.04)[:, None]
    finger_anisotropy, finger_horizontal = directional_energy(fingertips, finger_valid)
    return {
        "wrist_center_y": float(np.median(center[:, 1])) if len(center) >= 3 else None,
        "wrist_center_abs_x": abs(float(np.median(center[:, 0]))) if len(center) >= 3 else None,
        "wrist_vertical_span": float(np.diff(np.quantile(wrist[tracked, 1], [0.1, 0.9]))[0]) if tracked.any() else None,
        "wrist_delta_y": float(np.median(last) - np.median(first)) if min(len(first), len(last)) >= 2 else None,
        "wrist_anisotropy": wrist_anisotropy,
        "wrist_horizontal_share": wrist_horizontal,
        "fingertip_anisotropy": finger_anisotropy,
        "fingertip_horizontal_share": finger_horizontal,
    }


def score(path, partition, session, model, *, negatives=False):
    labels = tuple(model["labels"])
    index, rows = load_features(path, {partition}, labels, training_negatives=negatives)
    if index["preprocess"] != model["preprocess"] or index["modelSha256"] != model["extratorSha256"]:
        raise ValueError("Os pontos não correspondem ao modelo de sinais.")
    results = []
    for row in rows:
        meta = index["clips"][row.index]
        logits, probabilities = posterior(session, model, row.values) if row.values is not None else (None, None)
        label, confidence = decide(logits, model["threshold"])
        results.append({"id": meta.get("id", meta["file"]), "sha256": row.checksum, "signer": row.signer,
                        "reference": labels[row.label], "capture": row.state, "decision": labels[label],
                        "confidence": confidence,
                        "score_cinco": None if probabilities is None else float(probabilities[labels.index("cinco")]),
                        "geometry": {} if row.values is None else geometries(row.values)})
    return results


def observed_ranges(rows, features=FEATURES):
    intervals = {}
    for metric in features:
        values = [row["geometry"].get(metric) for row in rows]
        available = [value for value in values if value is not None]
        if available:
            intervals[metric] = {"min": min(available), "max": max(available), "measured": len(available)}
    return intervals


def outside(row, intervals):
    for metric, bounds in intervals.items():
        value = row["geometry"].get(metric)
        if value is not None and not bounds["min"] <= value <= bounds["max"]:
            return True
    return False


def compare(data, development):
    minds = data / "minds-expanded/features/index.json"
    numeric = development / "features/index.json"
    source_manifest = development / "manifest.json"
    plan = load_json(PLAN)
    manifest = load_json(source_manifest)
    index = load_json(numeric)
    cases = list(windows(plan))
    extracted = [{key: row[key] for key in cases[0]} for row in index["clips"]]
    if (manifest["planSha256"] != digest(PLAN) or index["sourceManifestSha256"] != digest(source_manifest)
            or extracted != cases or any(row["signer"] != plan["signer"] or row["label"] is not None
                                         for row in index["clips"])):
        raise ValueError("A extração numérica diverge do recorte de desenvolvimento.")
    session, model, model_digest = verified_model(data / "models/isolated-combined", load_json(minds))
    groups = {
        "minds_train": score(minds, "train", session, model),
        "minds_validation": score(minds, "val", session, model),
        "ufsm_numeric_transitions": score(numeric, "train", session, model, negatives=True),
        "clad_development": score(data / "clad-development/features/index.json", "train", session, model, negatives=True),
    }
    positives = {key: [row for row in rows if row["reference"] == row["decision"] == "cinco"]
                 for key, rows in groups.items() if key.startswith("minds_")}
    numeric_errors = [row for row in groups["ufsm_numeric_transitions"] if row["decision"] == "cinco"]
    group_reports = {}
    for key, rows in groups.items():
        subset = positives.get(key, rows)
        scores = [row["score_cinco"] for row in subset if row["score_cinco"] is not None]
        group_reports[key] = {"clips": len(subset), "signers": sorted({row["signer"] for row in subset}),
                              "capture_states": dict(Counter(row["capture"] for row in subset)),
                              "baseline_accepted_cinco": sum(row["decision"] == "cinco" for row in subset),
                              "score_cinco_max": max(scores, default=None), "intervals": observed_ranges(subset)}
    proposals = {}
    for label, features in PROFILES.items():
        limits = observed_ranges(positives["minds_train"], features)
        lost = [row["sha256"] for row in positives["minds_validation"] if outside(row, limits)]
        fixed = [row["id"] for row in numeric_errors if outside(row, limits)]
        proposals[label] = {"training_ranges": limits, "lost_validation_cinco": lost,
                            "rejected_development_cinco_errors": fixed, "eligible": not lost and bool(fixed)}
    return {"schema_version": 1, "scope": "development-only", "reserved_features_loaded": False,
            "model_sha256": model["modelSha256"], "model_manifest_sha256": model_digest,
            "threshold": model["threshold"], "numeric_plan_sha256": digest(PLAN),
            "numeric_features_sha256": digest(numeric), "minds_features_sha256": digest(minds),
            "clad_features_sha256": digest(data / "clad-development/features/index.json"),
            "groups": group_reports, "proposals": proposals, "numeric_decisions": groups["ufsm_numeric_transitions"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stage", choices=("prepare", "compare"))
    parser.add_argument("--data", type=Path, default=Path("data"))
    args = parser.parse_args()
    output = args.data / "transition-gate-m5" / "geometry-development"
    if args.stage == "prepare":
        prepare(args.data, output)
    else:
        write_json(output / "probe.json", compare(args.data, output))


if __name__ == "__main__":
    main()
