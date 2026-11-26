"""Mede falsos aceites em negativos externos com pesos e limiar congelados."""

import argparse
from collections import Counter, defaultdict
import json
from pathlib import Path
import re

import numpy as np
import onnxruntime as ort

from dataset import FEATURES, FRAMES, PREPROCESS, digest, write_json
from metrics import decide
from ml.external_eval.prepare import SOURCE, STRATA


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def verified_model(run, features):
    model = run / "isolated.onnx"
    manifest_path = run / "isolated.json"
    model_info = load_json(manifest_path)
    labels = model_info["labels"]
    threshold = model_info["threshold"]
    if model_info["modelSha256"] != digest(model):
        raise ValueError("O modelo difere da versão congelada.")
    if (model_info["preprocess"] != PREPROCESS or model_info["frames"] != FRAMES
            or model_info["features"] != FEATURES or model_info["inputName"] != "landmarks"
            or model_info["outputName"] != "logits"
            or model_info["extratorSha256"] != features["modelSha256"]
            or len(labels) < 2 or labels[0] is not None
            or any(not isinstance(label, str) or not label.strip() for label in labels[1:])
            or len(set(labels)) != len(labels) or not 0 < threshold <= 1):
        raise ValueError("Contrato de modelo ou extrator incompatível.")
    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(model), options, providers=["CPUExecutionProvider"])
    inputs, outputs = session.get_inputs(), session.get_outputs()
    if (len(inputs) != 1 or len(outputs) != 1
            or (inputs[0].name, inputs[0].type, inputs[0].shape) != ("landmarks", "tensor(float)", [1, FRAMES, FEATURES])
            or (outputs[0].name, outputs[0].type, outputs[0].shape) != ("logits", "tensor(float)", [1, len(labels)])):
        raise ValueError("O contrato ONNX não confere.")
    return session, model_info, digest(manifest_path)


def classified(session, features, labels, threshold):
    state = features["state"]
    values = features["values"]
    if state in {"no-hand", "insufficient"} and values is None:
        return None, None
    if state != "ready":
        raise ValueError("Estado de extração inválido.")
    features_array = np.asarray(values, dtype=np.float32)
    if features_array.shape != (FRAMES * FEATURES,) or not np.isfinite(features_array).all():
        raise ValueError("Forma ou valores das coordenadas inválidos.")
    (logits,) = session.run(["logits"], {"landmarks": features_array.reshape(1, FRAMES, FEATURES)})
    if not np.isfinite(logits).all():
        raise ValueError("Saída ONNX inválida.")
    prediction, confidence = decide(logits[0], threshold)
    return labels[prediction], confidence


def rate(count, total):
    return {"count": count, "total": total, "rate": count / total if total else None}


def summarize(rows):
    subjects = defaultdict(list)
    for row in rows:
        subjects[row["subject"]].append(row)
    states = Counter(row["captureState"] for row in rows)
    positives = Counter(row["predicted"] for row in rows if row["predicted"] is not None)
    ready = states.get("ready", 0)
    false_accepts = sum(positives.values())
    return {
        "captureStates": dict(states),
        "falseAcceptance": rate(false_accepts, len(rows)),
        "falseAcceptanceGivenUsableTracking": rate(false_accepts, ready),
        "subjectsWithAnyFalseAcceptance": rate(sum(any(row["predicted"] is not None for row in group)
                                                   for group in subjects.values()), len(subjects)),
        "falsePredictions": dict(positives),
    }


def evaluate(manifest_path, features_path, run):
    manifest = load_json(manifest_path)
    features = load_json(features_path)
    if (manifest["protocolSha256"] != digest(SOURCE) or features["sourceManifestSha256"] != digest(manifest_path)
            or features["preprocess"] != PREPROCESS or features["mediapipe"] != "0.10.32"):
        raise ValueError("Manifesto ou versão da extração incompatível.")
    expected = {clip["sha256"]: clip for clip in manifest["clips"]}
    if len(expected) != len(manifest["clips"]) or len(expected) != len(features["clips"]):
        raise ValueError("Clipes duplicados ou ausentes na extração.")
    session, model, model_manifest_hash = verified_model(run, features)
    seen = set()
    decisions = []
    for clip in features["clips"]:
        checksum = clip["sha256"]
        if (checksum in seen or checksum not in expected or not re.fullmatch(r"[a-f0-9]{64}", checksum)
                or clip["features"] != checksum + ".json" or clip["partition"] != "test"
                or clip["label"] is not None or clip["sourceLabel"] not in STRATA
                or any(clip[key] != value for key, value in expected[checksum].items())):
            raise ValueError(f"Trecho externo divergente: {checksum}.")
        seen.add(checksum)
        extraction = load_json(features_path.parent / clip["features"])
        if extraction["recipe"] != features["recipe"] or extraction["clipSha256"] != checksum:
            raise ValueError(f"Extração não corresponde ao trecho: {checksum}.")
        predicted, confidence = classified(session, extraction, model["labels"], model["threshold"])
        decisions.append({
            "id": clip["id"], "subject": clip["signer"], "video": clip["video"],
            "stratum": clip["stratum"], "sha256": checksum, "captureState": extraction["state"],
            "predicted": predicted, "confidence": confidence,
        })
    return {
        "dataset": manifest["source"]["doi"], "manifestSha256": digest(manifest_path),
        "protocolSha256": digest(SOURCE), "featuresManifestSha256": digest(features_path),
        "extractorRecipe": features["recipe"], "modelSha256": model["modelSha256"],
        "modelManifestSha256": model_manifest_hash,
        "threshold": model["threshold"], "runtime": {"device": "CPUExecutionProvider", "onnxruntime": ort.__version__},
        "overall": summarize(decisions),
        "byStratum": {key: summarize([row for row in decisions if row["stratum"] == key]) for key in STRATA},
        "decisions": decisions,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=Path("data/external-negative/manifest.json"))
    parser.add_argument("--features", type=Path, default=Path("data/external-negative/features/index.json"))
    parser.add_argument("--run", type=Path, default=Path("data/models/isolated-v1"))
    parser.add_argument("--out", type=Path, default=Path("data/external-negative/report.json"))
    args = parser.parse_args()
    report = evaluate(args.manifest, args.features, args.run)
    write_json(args.out, report)
    print(json.dumps(report["byStratum"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
