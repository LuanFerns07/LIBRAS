"""Confirma os dois vetos congelados em uma sessão didática externa de numerais."""

import argparse
from collections import defaultdict
from pathlib import Path

import numpy as np

from dataset import FRAMES, digest, write_json
from ml import evaluate_numeric_transition_fit as adjustment
from ml.external_eval.evaluate import load_json
from ml.freeze_numeric_veto_pair import FEATURES, RECORD
from ml.fresh_eval.evaluate import evaluate as evaluate_baseline


SELECTION = adjustment.PLAN.with_name("protocol-numerais-confirmacao-externa.json")
FROZEN = RECORD.with_name("conjunction-frozen.json")
DIRECTORY = Path("transition-gate-m5/numeric-conjunction-confirmation")


def estimates_from(frozen):
    rule = frozen["rule"]
    if (frozen["status"] != "frozen-for-first-independent-confirmation" or rule["trigger"] != "cinco"
            or rule["vetoWhen"] != "both-scores-strictly-below-own-threshold"
            or rule["missingFeatures"] != "keep-baseline"
            or rule["missingValueImputation"] != "profile-center"
            or rule["transform"] != "subtract-center-divide-by-scale-clip-to-minus5-plus5"
            or not rule["weightsIncludeInterceptFirst"] or set(rule["profiles"]) != set(FEATURES)
            or frozen["implementationSha256"] != digest(Path(adjustment.__file__))):
        raise ValueError("As regras de decisão e de geometria precisam corresponder aos pesos congelados.")
    return {
        name: (np.array(spec["center"]), np.array(spec["scale"]), np.array(spec["weights"]), spec["rejectBelow"])
        for name, spec in rule["profiles"].items()
    }


def decide(clip, metadata, features, estimates):
    label = clip["predicted"]
    scores = dict.fromkeys(estimates)
    vetoed = False
    if label == "cinco":
        extracted = load_json(features.parent / metadata["features"])
        values = np.asarray(extracted["values"], dtype=np.float32).reshape(FRAMES, 192)
        attributes = adjustment.shape_features(values)
        case = {"baseline": label, "attributes": attributes}
        checks = {name: adjustment.check(case, name, estimate) for name, estimate in estimates.items()}
        scores = {name: result["score"] for name, result in checks.items()}
        vetoed = all(result["afterVeto"] is None for result in checks.values())
    return {**clip, "session": metadata["session"], "sha256": metadata["sha256"], "scores": scores,
            "afterVeto": None if vetoed else label}


def summarize(rows):
    sessions = defaultdict(list)
    for row in rows:
        sessions[row["signer"], row["session"]].append(row)
    results = []
    for (signer, session), cases in sessions.items():
        positives = [case["id"] for case in cases if case["decision"] == "correct"]
        lost = [case["id"] for case in cases if case["id"] in positives and case["afterVeto"] != "cinco"]
        false = defaultdict(dict)
        for case in cases:
            if case["decision"] == "false-accept" and case["predicted"] == "cinco":
                false[case["stratum"]][case["id"]] = case["afterVeto"] is None
        fully_vetoed = [key for key, windows in false.items() if all(windows.values())]
        results.append({"signer": signer, "session": session, "correctCinco": positives, "correctCincoLost": lost,
                        "falseCincoByMovement": dict(false), "falseCincoMovementsVetoed": fully_vetoed,
                        "informative": bool(positives and false)})
    informative = [result for result in results if result["informative"]]
    if not informative:
        status = "insufficient-baseline-pair"
    elif not any(result["correctCincoLost"] for result in results) and any(
            result["falseCincoMovementsVetoed"] for result in informative):
        status = "first-independent-confirmation-passed"
    else:
        status = "first-independent-confirmation-failed"
    return status, results


def evaluate(data):
    protocol = load_json(SELECTION)
    frozen = load_json(FROZEN)
    if (protocol["scope"] != frozen["independentCheck"]["role"] or protocol["confirmationSha256"] != digest(FROZEN)
            or any(clip["label"] not in ("cinco", None) for clip in protocol["clips"])
            or protocol["models"]["combined"] != {"onnxSha256": frozen["modelSha256"],
                                                   "manifestSha256": frozen["modelManifestSha256"],
                                                   "threshold": frozen["baselineThreshold"]}):
        raise ValueError("A seleção externa precisa corresponder aos pesos e limiar congelados.")
    estimates = estimates_from(frozen)
    directory = data / DIRECTORY
    features = directory / "features/index.json"
    baseline = evaluate_baseline(directory / "manifest.json", features, data / "models", SELECTION)
    metadata = load_json(features)["clips"]
    cases = [decide(clip, meta, features, estimates)
             for clip, meta in zip(baseline["models"]["combined"]["decisions"], metadata, strict=True)]
    status, sessions = summarize(cases)
    return {**{key: value for key, value in baseline.items() if key != "models"}, "scope": protocol["scope"],
            "schemaVersion": 1, "frozenRuleSha256": digest(FROZEN), "model": protocol["models"]["combined"],
            "outcome": status, "sessions": sessions, "decisions": cases}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path("data"))
    args = parser.parse_args()
    write_json(args.data / DIRECTORY / "report.json", evaluate(args.data))


if __name__ == "__main__":
    main()
