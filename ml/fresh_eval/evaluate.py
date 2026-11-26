"""Executa modelos ONNX congelados e conta acertos e perdas de demonstrações didáticas."""

import argparse
from collections import Counter
from pathlib import Path

from dataset import PREPROCESS, digest, write_json
from ml.external_eval.evaluate import classified, load_json, verified_model
from ml.fresh_eval.prepare import PROTOCOL


def summarize(rows):
    by_label = {}
    for label in sorted({row["expected"] for row in rows}):
        samples = [row for row in rows if row["expected"] == label]
        counts = Counter(row["decision"] for row in samples)
        by_label[label] = {
            "examples": len(samples),
            "signers": len({row["signer"] for row in samples}),
            "correct": counts["correct"],
            "wrongLabel": counts["wrong-label"],
            "inconclusive": counts["inconclusive"] + counts["capture-inconclusive"],
            "withoutModelCoverage": counts["unsupported"],
            "captureInconclusive": counts["capture-inconclusive"],
        }
    return by_label


def case_decision(case, prediction, available):
    if case["expected"] not in available:
        return "unsupported"
    if case["captureState"] != "ready":
        return "capture-inconclusive"
    if prediction is None:
        return "inconclusive"
    return "correct" if prediction == case["expected"] else "wrong-label"


def evaluate(manifest_path, features_path, runs):
    protocol = load_json(PROTOCOL)
    manifest = load_json(manifest_path)
    features = load_json(features_path)
    manifest_sha = digest(manifest_path)
    if (manifest["protocolSha256"] != digest(PROTOCOL) or features["sourceManifestSha256"] != manifest_sha
            or features["preprocess"] != PREPROCESS or features["mediapipe"] != "0.10.32"):
        raise ValueError("Versão inesperada da preparação ou extração.")
    if len(manifest["clips"]) != len(protocol["clips"]) or len(features["clips"]) != len(protocol["clips"]):
        raise ValueError("Clipes ausentes na preparação ou extração.")
    extractions = []
    seen_clips = set()
    for expected, recorded, clip in zip(protocol["clips"], manifest["clips"], features["clips"], strict=True):
        if (any(recorded[key] != value for key, value in expected.items())
                or any(recorded[key] != clip[key] for key in recorded)
                or clip["partition"] != "test" or clip["sha256"] in seen_clips
                or clip["features"] != clip["sha256"] + ".json"):
            raise ValueError(f"Trecho não autorizado na seleção: {clip['id']}.")
        record = load_json(features_path.parent / clip["features"])
        if record["recipe"] != features["recipe"] or record["clipSha256"] != clip["sha256"]:
            raise ValueError(f"Extração divergente para {clip['id']}.")
        seen_clips.add(clip["sha256"])
        extractions.append((clip, record))

    result = {}
    for version, fixed in protocol["models"].items():
        session, model, model_manifest_sha = verified_model(runs / ("isolated-" + version), features)
        if (model["modelSha256"] != fixed["onnxSha256"] or model["threshold"] != fixed["threshold"]
                or model_manifest_sha != fixed["manifestSha256"]):
            raise ValueError(f"Modelo diferente da versão congelada: {version}.")
        decisions = []
        for clip, extraction in extractions:
            prediction, confidence = classified(session, extraction, model["labels"], model["threshold"])
            case = {
                "id": clip["id"], "signer": clip["signer"], "expected": clip["label"],
                "predicted": prediction, "confidence": confidence, "captureState": extraction["state"],
            }
            case["decision"] = case_decision(case, prediction, model["labels"])
            decisions.append(case)
        result[version] = {
            **fixed, "perLabel": summarize(decisions), "decisions": decisions,
        }
    return {
        "scope": "exploratory-external-didactic-clips", "device": "CPUExecutionProvider",
        "protocolSha256": digest(PROTOCOL), "manifestSha256": manifest_sha,
        "extractorRecipe": features["recipe"], "featuresManifestSha256": digest(features_path),
        "models": result,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=Path("data/fresh-sign/manifest.json"))
    parser.add_argument("--features", type=Path, default=Path("data/fresh-sign/features/index.json"))
    parser.add_argument("--runs", type=Path, default=Path("data/models"))
    parser.add_argument("--out", type=Path, default=Path("data/fresh-sign/report.json"))
    args = parser.parse_args()
    report = evaluate(args.manifest, args.features, args.runs)
    write_json(args.out, report)
    for version, results in report["models"].items():
        print(version, results["perLabel"])


if __name__ == "__main__":
    main()
