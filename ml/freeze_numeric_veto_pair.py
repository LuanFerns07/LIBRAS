"""Compara a conjunção dos vetos existentes e congela pesos para outra sessão."""

import argparse
from collections import defaultdict
from pathlib import Path

from dataset import digest, write_json
from ml import evaluate_numeric_transition_fit as adjustment
from ml.external_eval.evaluate import load_json


RECORD = adjustment.PLAN.with_name("evidence-numerais-ajuste") / "summary.json"
FEATURES = ("shape", "shape-and-motion")
NEGATIVES = "all-usable-transitions"


def compare(data):
    detail = data / "transition-gate-m5/numeric-transition-fit.json"
    recorded = load_json(RECORD)
    if digest(detail) != recorded["fullReportSha256"] or digest(adjustment.PLAN) != recorded["protocolSha256"]:
        raise ValueError("Os resultados individuais precisam corresponder ao ensaio anterior.")
    report = load_json(detail)
    shape, motion = (report["profiles"][f"{key}/{NEGATIVES}"]["folds"] for key in FEATURES)
    if shape.keys() != motion.keys():
        raise ValueError("As duas alternativas precisam ter as mesmas pessoas excluídas.")
    folds = {}
    for group, left in shape.items():
        right = motion[group]
        if (left["mindsValCorrectCinco"] != right["mindsValCorrectCinco"]
                or left["didacticCorrectCinco"] != right["didacticCorrectCinco"]):
            raise ValueError("Controles positivos divergentes entre os dois vetos.")
        common_losses = set(left["mindsValCorrectCincoLost"]) & set(right["mindsValCorrectCincoLost"])
        didactic_lost = []
        false_cinco = defaultdict(dict)
        for first, second in zip(left["caseDecisions"], right["caseDecisions"], strict=True):
            if any(first[key] != second[key] for key in ("id", "baseline", "reference")):
                raise ValueError("Os dois perfis precisam comparar exatamente os mesmos recortes.")
            if first["baseline"] == "cinco":
                vetoed = first["afterVeto"] is None and second["afterVeto"] is None
                if first["reference"] == "cinco":
                    if vetoed:
                        didactic_lost.append(first["id"])
                elif first["reference"] is None:
                    false_cinco[first["movement"]][first["id"]] = vetoed
        folds[group] = {
            "originalThresholds": {"shape": left["threshold"], "shape-and-motion": right["threshold"]},
            "mindsValCorrectCinco": left["mindsValCorrectCinco"],
            "mindsValCorrectCincoLost": sorted(common_losses),
            "didacticCorrectCinco": left["didacticCorrectCinco"],
            "didacticCorrectCincoLost": didactic_lost,
            "falseCincoByMovement": dict(false_cinco),
        }
    return {
        "schemaVersion": 1, "scope": "post-hoc-development",
        "originalReportSha256": digest(detail), "folds": folds,
    }


def passes(report):
    folds = report["folds"].values()
    hard = [fold for fold in folds if fold["falseCincoByMovement"]]
    return (
        len(folds) == 4 and len(hard) == 2
        and all(fold["mindsValCorrectCinco"] == 6 for fold in folds)
        and sum(len(fold["didacticCorrectCinco"]) for fold in folds) == 3
        and not any(fold["mindsValCorrectCincoLost"] or fold["didacticCorrectCincoLost"] for fold in folds)
        and sum(len(windows) for fold in hard for windows in fold["falseCincoByMovement"].values()) == 10
        and all(all(windows.values()) for fold in hard for windows in fold["falseCincoByMovement"].values())
    )


def freeze(data, experiment):
    plan, minds_train, minds_val, external = adjustment.read_development(data)
    estimates = {}
    parameters = {}
    for feature in FEATURES:
        usable = [row for row in [*minds_train, *external] if feature in row["attributes"]]
        positives = [row for row in usable if row["reference"] == "cinco"]
        negatives = [row for row in usable if row["reference"] is None]
        estimate = adjustment.fit(positives, negatives, feature, plan["fit"]["ridge"])
        center, scale, coefficient, threshold = estimate
        estimates[feature] = estimate
        parameters[feature] = {
            "center": center.tolist(), "scale": scale.tolist(), "weights": coefficient.tolist(),
            "rejectBelow": threshold, "positiveWindowsFit": len(positives), "negativeWindowsFit": len(negatives),
        }
    kept, lost, removed = [], [], []
    for row in [*minds_val, *external]:
        if row["baseline"] == "cinco":
            vetoed = all(adjustment.check(row, feature, estimates[feature])["afterVeto"] is None for feature in FEATURES)
            if row["reference"] == "cinco":
                (lost if vetoed else kept).append(row["id"])
            elif vetoed:
                removed.append(row["id"])
    return {
        "schemaVersion": 1, "status": "frozen-for-first-independent-confirmation" if not lost else "control-regression",
        "device": "CPUExecutionProvider", "scope": "experimental-veto-for-cinco",
        "modelSha256": plan["modelSha256"], "modelManifestSha256": plan["modelManifestSha256"],
        "baselineThreshold": plan["threshold"], "developmentPlanSha256": digest(adjustment.PLAN),
        "historicalReportSha256": experiment["originalReportSha256"],
        "implementationSha256": digest(Path(adjustment.__file__)),
        "fitPartitions": ["MINDS train", "all four didactic development sessions"],
        "negativeSelection": NEGATIVES,
        "rule": {"trigger": "cinco", "vetoWhen": "both-scores-strictly-below-own-threshold",
                 "missingFeatures": "keep-baseline", "transform": "subtract-center-divide-by-scale-clip-to-minus5-plus5",
                 "missingValueImputation": "profile-center", "weightsIncludeInterceptFirst": True,
                 "profiles": parameters},
        "developmentControls": {"kept": kept, "lost": lost, "falseCincoVetoedInFitSessions": removed},
        "independentCheck": {
            "role": "first-confirmation-without-retuning",
            "groupBy": ["person", "recording session"],
            "requirements": [
                "licensed new capture of a different person and session from all development recordings",
                "freeze clips and labels before model inference and keep overlapping windows of a move together",
                "include correctly recognized isolated Cinco and false Cinco on a numeric transition in comparable framing",
                "keep all baseline-correct Cinco and veto all false Cinco windows of at least one movement",
            ],
            "excluded": ["Fiocruz", "MINDS test"],
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path("data"))
    args = parser.parse_args()
    outcome = compare(args.data)
    outcome["passesCriterion"] = passes(outcome)
    output = args.data / "transition-gate-m5"
    write_json(output / "numeric-veto-conjunction.json", outcome)
    if outcome["passesCriterion"]:
        write_json(output / "numeric-veto-conjunction-frozen.json", freeze(args.data, outcome))


if __name__ == "__main__":
    main()
