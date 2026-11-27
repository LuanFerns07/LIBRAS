"""Testa a confirmação de Cinco já congelada em uma segunda gravação didática."""

import argparse
from pathlib import Path

import numpy as np

from dataset import FRAMES, digest, write_json
from ml.evaluate_paired_numerals import NUMERIC_EVIDENCE, WINDOWS, partial_confirmation
from ml.external_eval.evaluate import load_json, verified_model
from ml.fresh_eval.evaluate import evaluate as evaluate_baseline
from ml.fresh_eval.prepare import PROTOCOL


SELECTION = PROTOCOL.with_name("protocol-numerais-segundo-par.json")
RULE = NUMERIC_EVIDENCE / "partial-confirmation-protocol.json"


def evaluate(data):
    output = data / "transition-gate-m5/numerais-segundo-par"
    protocol = load_json(SELECTION)
    frozen = load_json(RULE)
    rule = frozen["rule"]
    if (protocol["scope"] != frozen["independent_check"]["dataset_role"]
            or protocol["confirmationSha256"] != digest(RULE)
            or rule["frames"] != FRAMES or rule["window_start_frames"] != list(WINDOWS)
            or rule["window_length_frames"] != 12
            or rule["resample"] != "repeat_each_frame_twice_with_original_tracking_mask"
            or rule["measure"] != "median_of_three_cinco_softmax_probabilities" or rule["trigger_decision"] != "cinco"):
        raise ValueError("O protocolo precisa corresponder à regra congelada de Cinco.")
    feature_path = output / "features/index.json"
    runs = data / "models"
    baseline = evaluate_baseline(output / "manifest.json", feature_path, runs, SELECTION)
    features = load_json(feature_path)
    session, model, manifest_sha = verified_model(runs / "isolated-combined", features)
    if model["modelSha256"] != frozen["model_sha256"] or manifest_sha != frozen["model_manifest_sha256"]:
        raise ValueError("A regra exige o combinado congelado.")

    cases = []
    for metadata, old in zip(features["clips"], baseline["models"]["combined"]["decisions"], strict=True):
        accepted = old["predicted"]
        confirmation = None
        if accepted == "cinco":
            extracted = load_json(feature_path.parent / metadata["features"])
            values = np.asarray(extracted["values"], dtype=np.float32).reshape(FRAMES, model["features"])
            confirmation = partial_confirmation(values, session, model)
            if confirmation < rule["reject_below"]:
                accepted = None
        cases.append({**old, "session": metadata["session"], "sha256": metadata["sha256"],
                      "confirmation": confirmation, "afterVeto": accepted})

    groups = {}
    for case in cases:
        key = (case["signer"], case["session"])
        groups.setdefault(key, []).append(case)
    pairs = []
    lost_positive = [case["id"] for case in cases if case["decision"] == "correct" and case["afterVeto"] != "cinco"]
    for (signer, recording), rows in groups.items():
        positive = [row["id"] for row in rows if row["decision"] == "correct"]
        false = [row["id"] for row in rows if row["decision"] == "false-accept" and row["predicted"] == "cinco"]
        corrected = [row["id"] for row in rows if row["id"] in false and row["afterVeto"] is None]
        pairs.append({"signer": signer, "session": recording, "baselineCorrectCinco": positive, "baselineFalseCinco": false,
                      "afterVetoFalseCincoRemoved": corrected, "informative": bool(positive and false)})
    informative = [pair for pair in pairs if pair["informative"]]
    outcome = "no-independent-pair"
    if informative:
        reduced = any(pair["afterVetoFalseCincoRemoved"] for pair in informative)
        outcome = "development-check-passed" if reduced and not lost_positive else "development-check-failed"
    report = {
        "schemaVersion": 1, "scope": protocol["scope"], "device": "CPUExecutionProvider",
        "frozenRuleSha256": digest(RULE), "threshold": rule["reject_below"],
        "protocolSha256": baseline["protocolSha256"], "featuresManifestSha256": baseline["featuresManifestSha256"],
        "manifestSha256": baseline["manifestSha256"], "extractorRecipe": baseline["extractorRecipe"],
        "modelSha256": model["modelSha256"], "modelManifestSha256": manifest_sha,
        "outcome": outcome, "correctCincoLost": lost_positive, "sessions": pairs, "decisions": cases,
    }
    return output, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path("data"))
    args = parser.parse_args()
    output, report = evaluate(args.data)
    write_json(output / "frozen-veto-report.json", report)


if __name__ == "__main__":
    main()
