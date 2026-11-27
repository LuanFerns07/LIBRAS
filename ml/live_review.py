"""Resume fichas locais de avaliação com pessoas, agrupadas por versão."""

import argparse
from collections import Counter, defaultdict
import json
from math import ceil, isfinite
from pathlib import Path
import re
from statistics import median

import numpy as np

from dataset import CATALOGS, digest, write_json
from metrics import describe


FLOWS = ("guided", "independent", "free")
DECISIONS = {"accepted", "hint", "inconclusive", "capture-error", "unavailable"}
CAPTURE_TESTS = {"capture-denied", "capture-interrupted"}
INCONCLUSIVE_LABELS = {"uncertain", "not-observed"}
REFERENCE_LABELS = {"other", "none", *INCONCLUSIVE_LABELS, *CATALOGS["expandido"][1:]}
ENVIRONMENT_FIELDS = ("system", "browser", "cpu", "gpu", "camera", "cameraWidth", "cameraHeight", "sampleIntervalMs")


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def timing(values):
    ordered = sorted(values)
    return {
        "count": len(ordered),
        "medianMs": median(ordered) if ordered else None,
        "p95Ms": ordered[ceil(len(ordered) * .95) - 1] if ordered else None,
    }


def checked_session(session, model, manifest_hash):
    if session["schema"] != "librasia-live-review/v1" or session["source"] != "live-manual-observation":
        raise ValueError("Use uma ficha de observação ao vivo do LibrasIA.")
    version = session["version"]
    if (version["modelSha256"] != model["modelSha256"] or version["manifestSha256"] != manifest_hash):
        raise ValueError("Uma ficha não corresponde aos pesos e ao manifesto informados.")
    for value, pattern in (
        (session["sessionId"], r"S\d{2,6}"), (session["participant"]["id"], r"P\d{2,6}"),
        (session["reviewer"]["id"], r"R\d{2,6}"), (version["commit"], r"[a-f0-9]{7,40}"),
    ):
        if not isinstance(value, str) or not re.fullmatch(pattern, value):
            raise ValueError("Há identificadores ou commit inválidos na ficha.")
    for number, attempt in enumerate(session["attempts"], 1):
        application = attempt["application"]
        prediction = application["prediction"]
        decision = application["decision"]
        calls = application.get("classifierCalls")
        scored = decision == "accepted"
        if (attempt["number"] != number or attempt["flow"] not in FLOWS
                or attempt["reference"]["label"] not in REFERENCE_LABELS or decision not in DECISIONS
                or (scored and prediction not in model["labels"][1:]) or (not scored and prediction is not None)):
            raise ValueError("Há uma tentativa inválida ou uma predição fora do modelo.")
        if calls is not None and (type(calls) is not int or calls < 0):
            raise ValueError("Há um número inválido de chamadas ao classificador.")


def eligible(session):
    return (
        session["participant"]["consent"] is True
        and session["participant"]["outsideTraining"] == "yes"
        and session["reviewer"]["profile"] in {"fluent", "deaf-fluent"}
        and session["reviewer"]["independent"] == "yes"
    )


def analyze(sessions, model, manifest_hash):
    labels = tuple(model["labels"])
    if labels not in CATALOGS.values() or not sessions:
        raise ValueError("Informe um manifesto de catálogo válido e pelo menos uma ficha.")
    groups = defaultdict(list)
    identifiers = set()
    for session in sessions:
        checked_session(session, model, manifest_hash)
        sid = session["sessionId"]
        if sid in identifiers:
            raise ValueError(f"Ficha duplicada: {sid}.")
        identifiers.add(sid)
        version = session["version"]
        key = (version["commit"], version["catalog"], version["avatar"])
        groups[key].append(session)
    return {
        "source": "live-manual-observation",
        "modelSha256": model["modelSha256"],
        "modelManifestSha256": manifest_hash,
        "groups": [
            {"version": dict(zip(("commit", "catalog", "avatar"), key)), **group_report(group, labels)}
            for key, group in sorted(groups.items())
        ],
    }


def group_report(sessions, labels):
    selected = [session for session in sessions if eligible(session)]
    attempts = [attempt for session in selected for attempt in session["attempts"]]
    by_flow = {flow: [item for item in attempts if item["flow"] == flow] for flow in FLOWS}
    matrix = np.zeros((len(labels), len(labels)), dtype=int)
    negative_conditions = defaultdict(lambda: {"count": 0, "total": 0})
    classifier_by_condition = defaultdict(lambda: {"reached": 0, "notReached": 0, "unobserved": 0})
    excluded = Counter()
    for attempt in by_flow["free"]:
        condition = attempt["condition"]
        reference = attempt["reference"]["label"]
        if condition in CAPTURE_TESTS:
            excluded["cameraCheck"] += 1
            continue
        if reference in INCONCLUSIVE_LABELS:
            excluded["referenceUnconfirmed"] += 1
            continue
        expected = labels.index(reference) if reference in labels else 0
        predicted = labels.index(attempt["application"]["prediction"])
        matrix[expected, predicted] += 1
        calls = attempt["application"].get("classifierCalls")
        reached = "unobserved" if calls is None else "reached" if calls > 0 else "notReached"
        classifier_by_condition[condition][reached] += 1
        if expected == 0:
            negative_conditions[condition]["total"] += 1
            negative_conditions[condition]["count"] += int(predicted != 0)

    classification = describe(matrix, labels)
    missing = [label for label, counts in classification["byLabel"].items() if not counts["support"]]
    if missing:
        classification["f1Macro"] = None
    for label in missing:
        classification["byLabel"][label].update(recall=None, f1=None)
    for counts in classification["byLabel"].values():
        if not counts["predicted"]:
            counts["precision"] = None
    for field in ("coverage", "falseAcceptance", "inconclusive"):
        if not classification[field]["total"]:
            classification[field]["rate"] = None
    for stats in negative_conditions.values():
        stats["rate"] = stats["count"] / stats["total"]
    by_environment = defaultdict(list)
    for session in selected:
        key = tuple(session["environment"][field] for field in ENVIRONMENT_FIELDS)
        by_environment[key].extend(session["attempts"])
    return {
        "sessions": len(sessions),
        "eligibleSessions": len(selected),
        "independentParticipants": len({item["participant"]["id"] for item in selected if item["attempts"]}),
        "attemptsByCondition": dict(Counter(item["condition"] for item in attempts)),
        "freeRecognition": {**classification, "excludedAttempts": dict(excluded),
                            "classifierReachByCondition": dict(classifier_by_condition),
                            "falseAcceptanceByCondition": dict(negative_conditions)},
        "guidedFeedback": dict(Counter(item["reference"]["feedbackVerdict"] for item in by_flow["guided"])),
        "timingByEnvironment": [
            {
                "environment": dict(zip(ENVIRONMENT_FIELDS, key)),
                "byFlow": {flow: attempt_timing(item for item in items if item["flow"] == flow) for flow in FLOWS},
            } for key, items in by_environment.items()
        ],
    }


def attempt_timing(attempts):
    values = []
    for attempt in attempts:
        latency = attempt["application"]["latency"]
        if latency is None:
            continue
        value = latency["milliseconds"]
        if type(value) not in (int, float) or not isfinite(value) or not 0 <= value <= 120000:
            raise ValueError("Há uma duração inválida na ficha.")
        if latency["method"] == "instrumented":
            values.append(value)
    return timing(values)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("sessions", type=Path, nargs="+")
    args = parser.parse_args()
    try:
        if args.out.resolve() in {path.resolve() for path in (args.manifest, *args.sessions)}:
            raise ValueError("Escolha um arquivo de saída diferente das fichas e do manifesto.")
        report = analyze([read_json(path) for path in args.sessions], read_json(args.manifest), digest(args.manifest))
    except (OSError, KeyError, TypeError, ValueError) as error:
        parser.error(str(error))
    write_json(args.out, report)
    print(f"Resumo salvo em {args.out}.")


if __name__ == "__main__":
    main()
