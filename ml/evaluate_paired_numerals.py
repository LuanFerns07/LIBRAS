"""Compara vetos de Cinco em tomadas didáticas de desenvolvimento e no MINDS treino/validação."""

import argparse
from collections import Counter
from itertools import combinations
from pathlib import Path

import numpy as np

from dataset import FRAMES, digest, load_features, write_json
from ml.evaluate_transition_veto import SNAPSHOTS, fingerprints, open_models, posterior, score_clip
from ml.external_eval.evaluate import load_json
from ml.fresh_eval.prepare import PROTOCOL
from ml.probe_transition_geometry import geometries, outside


NUMERIC_PROTOCOL = PROTOCOL.with_name("protocol-numerais-desenvolvimento.json")
NUMERIC_EVIDENCE = PROTOCOL.with_name("evidence-numerais-desenvolvimento")
VETO_EVIDENCE = Path(__file__).with_name("evidence") / "isolated-combined"
NUMERIC_SCOPE = Path("transition-gate-m5/numerais-independentes")
WINDOWS = (0, 6, 12)
PAIRS = np.array(list(combinations((0, 4, 8, 12, 16, 20), 2)))
NEW_RULES = {"partial_confirmation": ("partial_confirmation", "min"), "shape_change": ("shape_change", "max")}


def shape_change(values):
    """Mede mudança de forma em relação à mão do próprio clipe, ignorando posição e rotação."""
    points = values.reshape(FRAMES, 48, 4).astype(np.float64)
    visible = points[:, [6, 27], 3] == 1
    side = int(visible.sum(axis=0).argmax())
    hand = points[:, 6 + side * 21:27 + side * 21]
    palm = np.linalg.norm(hand[:, 9, :3] - hand[:, 0, :3], axis=1)
    needed = (0, 4, 8, 9, 12, 16, 20)
    keep = (palm >= 0.04) & (hand[:, needed, 3] == 1).all(axis=1)
    if keep.sum() < 8:
        return None
    coordinates = hand[keep, :, :3]
    distances = np.linalg.norm(coordinates[:, PAIRS[:, 0]] - coordinates[:, PAIRS[:, 1]], axis=2)
    signatures = distances / palm[keep, None]
    displacement = np.abs(signatures - np.median(signatures, axis=0)).mean(axis=1)
    return float(np.quantile(displacement, 0.9))


def read_paired(data, labels):
    if load_json(NUMERIC_PROTOCOL)["scope"] != "desenvolvimento-numerais":
        raise ValueError("O protocolo numérico precisa pertencer ao desenvolvimento.")
    manifest_path = NUMERIC_EVIDENCE / "manifest.json"
    manifest = load_json(manifest_path)
    path = data / NUMERIC_SCOPE / "features/index.json"
    # O avaliador didático marca suas entradas externas como test. O manifesto abaixo
    # restringe o acesso aos 12 recortes pareados de desenvolvimento, sem outros vídeos.
    index = load_json(path)
    actual = [{key: value for key, value in row.items() if key != "features"} for row in index["clips"]]
    if (manifest["protocolSha256"] != digest(NUMERIC_PROTOCOL)
            or index["sourceManifestSha256"] != digest(manifest_path) or actual != manifest["clips"]):
        raise ValueError("Os recortes presentes divergem do manifesto didático de desenvolvimento.")
    _, rows = load_features(path, {"test"}, labels, required_labels=(None, "cinco"))
    return path, index, rows


def partial_confirmation(values, session, model, windows=WINDOWS):
    five = model["labels"].index("cinco")
    partials = [posterior(session, model, np.repeat(values[step:step + 12], 2, axis=0))[1][five] for step in windows]
    return float(np.median(partials))


def inspect(clip, meta, models, combined):
    labels = combined["labels"]
    baseline, confidence, measures = score_clip(clip, models, combined)
    five = labels.index("cinco")
    if baseline == five:
        session = models["combined"][0]
        values = clip.values
        measures.update({"partial_confirmation": partial_confirmation(values, session, combined),
                         "shape_change": shape_change(values)})
    return {
        "id": meta.get("id", meta["file"]), "sha256": clip.checksum, "signer": clip.signer,
        "partition": clip.partition, "stratum": meta.get("stratum"), "reference": labels[clip.label],
        "capture": clip.state, "baseline": labels[baseline], "confidence": confidence, "measures": measures,
        "geometry": geometries(clip.values) if baseline == five else {},
    }


def evaluate(data):
    path = data / "minds-expanded/features/index.json"
    index = load_json(path)
    models, combined = open_models(data / "models", index)
    labels = tuple(combined["labels"])
    _, minds = load_features(path, {"train", "val"}, labels)
    external_path, external_index, external = read_paired(data, labels)
    if any(external_index[key] != index[key] for key in ("modelSha256", "preprocess")):
        raise ValueError("Extrator didático e extrator do MINDS incompatíveis.")
    frozen_path = VETO_EVIDENCE / "transition-veto-calibration.json"
    geometry_path = VETO_EVIDENCE / "transition-geometry-development.json"
    frozen = load_json(frozen_path)
    geometry = load_json(geometry_path)
    model_sha = fingerprints(models)
    if (model_sha != frozen["model_fingerprints"] or frozen["calibration_features_sha256"] != digest(path)
            or frozen["snapshots"] != list(SNAPSHOTS) or frozen["base_threshold"] != combined["threshold"]
            or geometry["model_sha256"] != combined["modelSha256"] or geometry["minds_features_sha256"] != digest(path)):
        raise ValueError("Os vetos históricos precisam usar os modelos e pontos congelados.")

    train, validation, paired = [], [], []
    for clip in minds:
        record = inspect(clip, index["clips"][clip.index], models, combined)
        (train if clip.partition == "train" else validation).append(record)
    for clip in external:
        paired.append(inspect(clip, external_index["clips"][clip.index], models, combined))
    correct_train = [row for row in train if row["reference"] == row["baseline"] == "cinco"]
    rules = {name: {"measure": value["measure"], "bound": "min", "threshold": value["thresholds"]["cinco"],
                    "fit_to": "+".join(value["splits"])}
             for name, value in frozen["profiles"].items()}
    for name, (measure, bound) in NEW_RULES.items():
        observed = [row["measures"][measure] for row in correct_train if row["measures"][measure] is not None]
        threshold = min(observed) if bound == "min" else max(observed)
        rules[name] = {"measure": measure, "bound": bound, "threshold": threshold,
                       "fit_to": "train", "training_values": len(observed)}
    for name, value in geometry["proposals"].items():
        rules[name] = {"ranges": value["training_ranges"], "fit_to": "train"}

    for row in (*train, *validation, *paired):
        row["alternatives"] = {}
        for name, rule in rules.items():
            verdict = row["baseline"]
            if verdict == "cinco":
                if "ranges" in rule:
                    veto = outside(row, rule["ranges"])
                else:
                    score = row["measures"][rule["measure"]]
                    threshold = rule["threshold"]
                    veto = score is not None and (score < threshold if rule["bound"] == "min" else score > threshold)
                if veto:
                    verdict = None
            row["alternatives"][name] = verdict

    paired_true = [row for row in paired if row["reference"] == row["baseline"] == "cinco"]
    false_numeric = [row for row in paired if row["reference"] is None and row["baseline"] == "cinco"]
    val_cinco = [row for row in validation if row["reference"] == row["baseline"] == "cinco"]
    val_errors = [row for row in validation if row["reference"] != "cinco" and row["baseline"] == "cinco"]
    controls = [row for row in paired if row["stratum"] == "transicao-sete-oito"]
    for name, rule in rules.items():
        rule.update({
            "minds_train_correct_cinco_lost": sum(row["alternatives"][name] is None for row in correct_train),
            "minds_val_correct_cinco_lost": sum(row["alternatives"][name] is None for row in val_cinco),
            "minds_val_wrong_cinco_removed": sum(row["alternatives"][name] is None for row in val_errors),
            "paired_correct_cinco_lost": [row["id"] for row in paired_true if row["alternatives"][name] is None],
            "paired_false_cinco_removed": [row["id"] for row in false_numeric if row["alternatives"][name] is None],
            "seven_to_eight_accepted": sum(row["alternatives"][name] is not None for row in controls),
        })
        rule["meets_development_criterion"] = bool(rule["paired_false_cinco_removed"]) and not any(
            rule[key] for key in ("minds_train_correct_cinco_lost", "minds_val_correct_cinco_lost",
                                  "paired_correct_cinco_lost", "seven_to_eight_accepted"))

    return {
        "schema_version": 1, "scope": "development-only", "device": "CPUExecutionProvider",
        "minds_reserved_and_fiocruz_features_loaded": False, "model_fingerprints": model_sha,
        "minds_index_sha256": digest(path), "paired_index_sha256": digest(external_path),
        "paired_protocol_sha256": digest(NUMERIC_PROTOCOL),
        "historical_confirmation_sha256": digest(frozen_path), "historical_geometry_sha256": digest(geometry_path),
        "baseline": {
            "minds_train_correct_cinco": len(correct_train), "minds_val_correct_cinco": len(val_cinco),
            "minds_val_wrong_cinco": len(val_errors), "paired_cinco": len(paired_true),
            "numeric_false_cinco": [row["id"] for row in false_numeric], "seven_to_eight_windows": len(controls),
            "seven_to_eight_people": len({row["signer"] for row in controls}),
            "paired_capture_states": dict(Counter(row["capture"] for row in paired)),
        },
        "rules": rules, "paired_decisions": paired,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path("data"))
    args = parser.parse_args()
    write_json(args.data / NUMERIC_SCOPE / "veto-development.json", evaluate(args.data))


if __name__ == "__main__":
    main()
