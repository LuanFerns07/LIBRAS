"""Compara confirmações de Cinco e Aluno com os pesos originais congelados."""

import argparse
from collections import Counter
from pathlib import Path

import numpy as np

from dataset import FRAMES, digest, load_features, write_json
from metrics import decide, describe
from ml.external_eval.evaluate import load_json, verified_model


TARGETS = ("cinco", "aluno")
MODEL_NAMES = ("combined", "geometry", "flexion")
SNAPSHOTS = (6, 12, 18)
PROFILES = (
    ("combined-validation", "combined", {"val"}),
    ("combined-train-validation", "combined", {"train", "val"}),
    ("members-validation", "members", {"val"}),
    ("members-train-validation", "members", {"train", "val"}),
    ("snapshots-validation", "snapshots", {"val"}),
    ("snapshots-train-validation", "snapshots", {"train", "val"}),
)


def posterior(session, model, values):
    data = values.reshape(1, FRAMES, model["features"])
    (logits,) = session.run([model["outputName"]], {model["inputName"]: data})
    if logits.shape != (1, len(model["labels"])) or not np.isfinite(logits).all():
        raise ValueError("Saída inesperada do classificador de sinais.")
    values = logits[0].astype(np.float64)
    weights = np.exp(values - values.max())
    return values, weights / weights.sum()


def open_models(directory, index):
    sessions = {name: verified_model(directory / f"isolated-{name}", index) for name in MODEL_NAMES}
    combined = sessions["combined"][1]
    if any(model["labels"] != combined["labels"] for _, model, _ in sessions.values()) or any(
        label not in combined["labels"] for label in TARGETS
    ):
        raise ValueError("Os modelos divergiram no catálogo de sinais.")
    return sessions, combined


def fingerprints(sessions):
    return {name: {"onnx": model["modelSha256"], "manifest": checksum}
            for name, (_, model, checksum) in sessions.items()}


def score_clip(clip, sessions, combined):
    if clip.values is None:
        return 0, None, {}
    model, _, _ = sessions["combined"]
    logits, average = posterior(model, combined, clip.values)
    prediction, confidence = decide(logits, combined["threshold"])
    if combined["labels"][prediction] not in TARGETS:
        return prediction, confidence, {}

    member = [posterior(session, spec, clip.values)[1][prediction]
              for name, (session, spec, _) in sessions.items() if name != "combined"]
    snapshots = [posterior(model, combined, np.repeat(clip.values[step:step + 1], FRAMES, axis=0))[1][prediction]
                 for step in SNAPSHOTS]
    return prediction, confidence, {"combined": float(average[prediction]), "members": float(min(member)),
                                    "snapshots": float(np.median(snapshots))}


def calibrate(features, model_directory):
    index = load_json(features)
    models, combined = open_models(model_directory, index)
    labels = tuple(combined["labels"])
    _, rows = load_features(features, {"train", "val"}, labels)
    scored = [(clip, *score_clip(clip, models, combined)) for clip in rows if labels[clip.label] in TARGETS]
    results = {}
    for name, measure, splits in PROFILES:
        thresholds = {}
        counts = {}
        for label in TARGETS:
            label_index = labels.index(label)
            expected = [votes[measure] for clip, predicted, _, votes in scored
                        if clip.partition in splits and clip.label == predicted == label_index]
            if not expected:
                raise ValueError(f"Sem acertos de desenvolvimento para {label}.")
            thresholds[label] = np.floor(min(expected) * 1000) / 1000
            counts[label] = len(expected)
        results[name] = {"measure": measure, "splits": sorted(splits), "thresholds": thresholds,
                         "calibration_correct_clips": counts}
    return {
        "schema_version": 1, "calibration_features_sha256": digest(features),
        "calibration_dataset_sha256": index["sourceManifestSha256"],
        "calibration_signers": sorted({row.signer for row in rows}), "snapshots": list(SNAPSHOTS),
        "model_fingerprints": fingerprints(models), "base_threshold": combined["threshold"],
        "target_labels": list(TARGETS), "profiles": results,
    }


def group_definitions(directory):
    return (
        ("MINDS reservado", directory / "minds-expanded/features/index.json", "test", None),
        ("CLAD desenvolvimento", directory / "clad-development/features/index.json", "train", (None,)),
        ("CLAD original", directory / "external-negative/features/index.json", "test", (None,)),
        ("CLAD novas tomadas", directory / "isolated-negative-audit/clad/features/index.json", "test", (None,)),
        ("Didático negativo", directory / "isolated-negative-audit/didactic/features/index.json", "test", (None,)),
        ("Didático positivo", directory / "fresh-sign/features/index.json", "test", ("cinco", "amarelo")),
    )


def summarize(decisions, labels, choice):
    matrix = np.zeros((len(labels), len(labels)), dtype=int)
    for row in decisions:
        picked = row["baseline"] if choice is None else row["alternatives"][choice]
        matrix[labels.index(row["expected"]), labels.index(picked)] += 1
    return describe(matrix, labels)


def evaluate(data, calibration):
    path = data / "minds-expanded/features/index.json"
    frozen = load_json(calibration)
    if (frozen["schema_version"] != 1 or frozen["calibration_features_sha256"] != digest(path)
            or frozen["snapshots"] != list(SNAPSHOTS) or frozen["target_labels"] != list(TARGETS)):
        raise ValueError("A calibração não corresponde à extração ou aos descritores congelados.")
    index = load_json(path)
    models, combined = open_models(data / "models", index)
    if fingerprints(models) != frozen["model_fingerprints"] or combined["threshold"] != frozen["base_threshold"]:
        raise ValueError("Mudança nos pesos ou no limiar do classificador.")
    labels = tuple(combined["labels"])
    groups = {}
    with_no_losses = set(frozen["profiles"])
    target_cases = {}
    for title, path, split, required in group_definitions(data):
        local, clips = load_features(path, {split}, labels, required_labels=required,
                                     training_negatives=split == "train")
        if any(local[key] != index[key] for key in ("modelSha256", "preprocess")):
            raise ValueError(f"Extrator incompatível para {title}.")
        if set(frozen["calibration_signers"]) & {row.signer for row in clips} and title == "MINDS reservado":
            raise ValueError("Uma pessoa do MINDS reservado entrou na calibração.")
        decisions = []
        for clip in clips:
            predicted, confidence, measures = score_clip(clip, models, combined)
            baseline = labels[predicted]
            results = {}
            for name, rule in frozen["profiles"].items():
                threshold = rule["thresholds"].get(baseline)
                results[name] = (baseline if threshold is None or measures[rule["measure"]] >= threshold else None)
            metadata = local["clips"][clip.index]
            item = {"id": metadata.get("id", metadata["file"]), "sha256": clip.checksum,
                    "signer": clip.signer, "state": clip.state, "expected": labels[clip.label],
                    "source_label": clip.source_label, "baseline": baseline, "confidence": confidence,
                    "measures": measures, "alternatives": results}
            decisions.append(item)
            if item["id"] in ("fiocruz-sete-oito", "clad-movimento-03-queixo-teclado"):
                target_cases[item["id"]] = item
            if title in {"MINDS reservado", "Didático positivo"} and baseline is not None and baseline == item["expected"]:
                with_no_losses.difference_update(name for name, label in results.items() if label != baseline)
        groups[title] = {
            "features_sha256": digest(path), "source_manifest_sha256": local["sourceManifestSha256"],
            "capture_states": dict(Counter(row["state"] for row in decisions)),
            "baseline": summarize(decisions, labels, None),
            "alternatives": {name: summarize(decisions, labels, name) for name in frozen["profiles"]},
            "decisions": decisions,
        }
    if len(target_cases) != 2 or any(row["baseline"] is None for row in target_cases.values()):
        raise ValueError("As duas regressões anteriores precisam reaparecer na referência.")
    eligible = [name for name in sorted(with_no_losses)
                if all(row["alternatives"][name] is None for row in target_cases.values())]
    return {"schema_version": 1, "calibration_sha256": digest(calibration),
            "model_fingerprints": fingerprints(models), "groups": groups, "focused_regressions": target_cases,
            "profiles_rejecting_both_without_losing_baseline_correct": eligible}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stage", choices=("calibrate", "evaluate"))
    parser.add_argument("--data", type=Path, default=Path("data"))
    parser.add_argument("--calibration", type=Path, required=True)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    if args.stage == "calibrate":
        report = calibrate(args.data / "minds-expanded/features/index.json", args.data / "models")
        write_json(args.calibration, report)
    else:
        if args.out is None:
            parser.error("Informe o caminho do relatório com --out.")
        report = evaluate(args.data, args.calibration)
        write_json(args.out, report)


if __name__ == "__main__":
    main()
