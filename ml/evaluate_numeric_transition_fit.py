"""Ajusta vetos lineares de Cinco com validação cruzada por pessoa e gravação."""

import argparse
from collections import Counter, defaultdict
from itertools import product
from pathlib import Path

import numpy as np

from dataset import FRAMES, digest, load_features, write_json
from metrics import decide
from ml.evaluate_paired_numerals import PAIRS
from ml.evaluate_transition_veto import posterior
from ml.external_eval.evaluate import load_json, verified_model
from ml.fresh_eval.prepare import PROTOCOL
from ml.probe_transition_geometry import geometries


PLAN = PROTOCOL.with_name("protocol-numerais-ajuste.json")


def checked_index(data, spec):
    path = data / spec["index"]
    if digest(path) != spec["sha256"]:
        raise ValueError(f"O índice local diverge do protocolo: {spec['index']}.")
    return path, load_json(path)


def shape_features(values):
    points = values.reshape(FRAMES, 48, 4).astype(np.float64)
    visibility = points[:, [6, 27], 3] == 1
    side = int(visibility.sum(axis=0).argmax())
    hand = points[:, 6 + side * 21:27 + side * 21]
    palm = np.linalg.norm(hand[:, 9, :3] - hand[:, 0, :3], axis=1)
    keep = (palm >= 0.04) & (hand[:, (0, 4, 8, 9, 12, 16, 20), 3] == 1).all(axis=1)
    if keep.sum() < 8:
        return {}
    xyz = hand[keep, :, :3]
    pair_distances = np.linalg.norm(xyz[:, PAIRS[:, 0]] - xyz[:, PAIRS[:, 1]], axis=2) / palm[keep, None]
    low, mid, high = np.quantile(pair_distances, [0.1, 0.5, 0.9], axis=0)
    form = np.concatenate((mid, high - low))
    movement = geometries(values)
    wrist = [movement[key] for key in ("wrist_vertical_span", "wrist_delta_y", "wrist_anisotropy",
                                      "wrist_horizontal_share", "fingertip_anisotropy", "fingertip_horizontal_share")]
    delta = np.median(pair_distances[-4:], axis=0) - np.median(pair_distances[:4], axis=0)
    # Os limites de escala e a imputação são ajustados apenas com os grupos de treino.
    motion = np.concatenate((form, delta, np.array([np.nan if value is None else value for value in wrist])))
    return {"shape": form, "shape-and-motion": motion}


def read_didactic(data, specs, model):
    for spec in specs:
        path, index = checked_index(data, spec)
        if index["modelSha256"] != model["extratorSha256"] or index["preprocess"] != model["preprocess"]:
            raise ValueError("A extração didática diverge da extração original.")
        if set(spec["groups"]) != {str(meta["signer"]) for meta in index["clips"]}:
            raise ValueError("As pessoas precisam corresponder aos grupos do protocolo.")
        for meta in index["clips"]:
            expected = meta["sha256"] + ".json"
            if meta["features"] != expected or meta["label"] not in (None, "cinco"):
                raise ValueError("Nome de extração ou rótulo inesperado.")
            extracted = load_json(path.parent / expected)
            if extracted["clipSha256"] != meta["sha256"] or extracted["recipe"] != index["recipe"]:
                raise ValueError("A extração didática não corresponde ao recorte.")
            state = extracted["state"]
            if state not in ("ready", "no-hand", "insufficient"):
                raise ValueError("Estado de extração inesperado.")
            values = None
            if state == "ready":
                values = np.asarray(extracted["values"], dtype=np.float32).reshape(FRAMES, model["features"])
                if not np.isfinite(values).all() or not np.isin(values[:, 3::4], (0, 1)).all():
                    raise ValueError("Valores de extração didática inválidos.")
            elif extracted["values"] is not None:
                raise ValueError("Extração inconclusiva contém valores.")
            movement = "cinco" if meta["label"] else f"{meta.get('sequence', 'cardinais')} | {meta['sourceLabel']}"
            yield (meta["id"], spec["groups"][str(meta["signer"])], movement, meta["label"], state, values)


def make_case(session, model, identifier, group, movement, reference, state, values):
    predicted, confidence = (0, None)
    if values is not None:
        logits, _ = posterior(session, model, values)
        predicted, confidence = decide(logits, model["threshold"])
    return {"id": identifier, "group": group, "movement": movement, "reference": reference, "capture": state,
            "baseline": model["labels"][predicted], "confidence": confidence,
            "attributes": {} if values is None else shape_features(values)}


def weights(examples):
    motions = defaultdict(set)
    counts = Counter((case["group"], case["movement"]) for case in examples)
    for group, movement in counts:
        motions[group].add(movement)
    return np.array([0.5 / (len(motions) * len(motions[case["group"]]) * counts[case["group"], case["movement"]])
                     for case in examples])


def fit(positives, negatives, feature, ridge):
    values = np.stack([row["attributes"][feature] for row in (*positives, *negatives)])
    target = np.array([1.0] * len(positives) + [-1.0] * len(negatives))
    weight = np.concatenate((weights(positives), weights(negatives)))
    # Imputa a mediana dos valores válidos no treino e limita o ganho dado a dimensões quase constantes.
    center = np.array([np.median(column[np.isfinite(column)]) if np.isfinite(column).any() else 0.0
                       for column in values.T])
    imputed = np.where(np.isfinite(values), values, center)
    scale = np.maximum(np.sqrt(np.average((imputed - center) ** 2, axis=0, weights=weight)), 0.05)
    normalized = (imputed - center) / scale
    design = np.column_stack((np.ones(len(values)), np.clip(normalized, -5, 5)))
    penalty = np.diag([0.0] + [ridge] * normalized.shape[1])
    coefficient = np.linalg.solve(design.T @ (design * weight[:, None]) + penalty, design.T @ (weight * target))
    lower_bound = float(min(design[:len(positives)] @ coefficient))
    return center, scale, coefficient, lower_bound


def check(row, feature, estimate):
    score = None
    outcome = row["baseline"]
    if outcome == "cinco" and feature in row["attributes"] and estimate is not None:
        center, scale, coefficient, threshold = estimate
        value = row["attributes"][feature]
        imputed = np.where(np.isfinite(value), value, center)
        score = float(coefficient[0] + np.clip((imputed - center) / scale, -5, 5) @ coefficient[1:])
        if score < threshold:
            outcome = None
    return {key: value for key, value in row.items() if key != "attributes"} | {"score": score, "afterVeto": outcome}


def test_fold(train, validation, held, feature, negatives, ridge):
    usable = [row for row in train if feature in row["attributes"]]
    positive = [row for row in usable if row["reference"] == "cinco"]
    negative = [row for row in usable if row["reference"] is None
                and (negatives == "all-usable-transitions" or row["baseline"] == "cinco")]
    estimate = fit(positive, negative, feature, ridge) if positive and negative else None
    control = [check(row, feature, estimate) for row in validation if row["reference"] == row["baseline"] == "cinco"]
    didactic = [check(row, feature, estimate) for row in held]
    false_cases = [row for row in didactic if row["reference"] is None and row["baseline"] == "cinco"]
    errors_by_motion = defaultdict(list)
    for row in false_cases:
        errors_by_motion[row["movement"]].append(row["afterVeto"] is None)
    return {
        "trained": estimate is not None,
        "fitPositiveCount": len(positive),
        "fitPositiveGroups": sorted({row["group"] for row in positive}),
        "fitNegativeCount": len(negative),
        "fitNegativeGroups": sorted({row["group"] for row in negative}),
        "fitNegativeMovements": len({(row["group"], row["movement"]) for row in negative}),
        "threshold": estimate[-1] if estimate is not None else None,
        "mindsValCorrectCinco": len(control),
        "mindsValCorrectCincoLost": [row["id"] for row in control if row["afterVeto"] is None],
        "mindsValLostScore": {row["id"]: row["score"] for row in control if row["afterVeto"] is None},
        "didacticCorrectCinco": [row["id"] for row in didactic if row["reference"] == row["baseline"] == "cinco"],
        "didacticCorrectCincoLost": [row["id"] for row in didactic if row["reference"] == row["baseline"] == "cinco"
                                    and row["afterVeto"] is None],
        "falseCincoWindows": len(false_cases),
        "falseCincoWindowsVetoed": sum(row["afterVeto"] is None for row in false_cases),
        "falseCincoMotions": len(errors_by_motion),
        "falseCincoMotionsFullyVetoed": sorted(motion for motion, decisions in errors_by_motion.items() if all(decisions)),
        "caseDecisions": didactic,
    }


def read_development(data):
    plan = load_json(PLAN)
    path, index = checked_index(data, plan["minds"])
    session, model, manifest_sha = verified_model(data / "models/isolated-combined", index)
    if (model["modelSha256"], manifest_sha, model["threshold"]) != (
            plan["modelSha256"], plan["modelManifestSha256"], plan["threshold"]):
        raise ValueError("O modelo diverge do protocolo.")
    _, minds = load_features(path, {"train", "val"}, tuple(model["labels"]))
    train, validation = [], []
    for row in minds:
        if model["labels"][row.label] != "cinco":
            continue
        destination = train if row.partition == "train" else validation
        destination.append(make_case(session, model, row.checksum, f"minds-{row.signer}", "cinco",
                                     "cinco", row.state, row.values))
    external = [make_case(session, model, *case) for case in read_didactic(data, plan["sources"], model)]
    return plan, train, validation, external


def evaluate(data):
    plan, train, validation, external = read_development(data)
    groups = sorted({row["group"] for row in external})

    results = {}
    for feature, negatives in product(plan["fit"]["features"], plan["fit"]["negatives"]):
        folds = {}
        for group in groups:
            others = [row for row in external if row["group"] != group]
            held = [row for row in external if row["group"] == group]
            folds[group] = test_fold([*train, *others], validation, held, feature, negatives, plan["fit"]["ridge"])
        hard_folds = [fold for fold in folds.values() if fold["falseCincoMotions"] > 0]
        qualifies = (len(hard_folds) >= 2 and all(fold["falseCincoMotionsFullyVetoed"] for fold in hard_folds)
                     and all(not fold["mindsValCorrectCincoLost"] and not fold["didacticCorrectCincoLost"]
                             for fold in folds.values()))
        results[f"{feature}/{negatives}"] = {"passesCriterion": qualifies, "folds": folds}
    return {"schemaVersion": 1, "scope": plan["scope"], "device": "CPUExecutionProvider",
            "protocolSha256": digest(PLAN), "modelSha256": plan["modelSha256"],
            "modelManifestSha256": plan["modelManifestSha256"],
            "mindsTrainCinco": len(train), "mindsValCinco": len(validation), "profiles": results}


def summarize(report, detail_path):
    profiles = {}
    for name, profile in report["profiles"].items():
        folds = {}
        for group, fold in profile["folds"].items():
            stats = {key: value for key, value in fold.items() if key != "caseDecisions"}
            stats["didacticCaptureStates"] = dict(Counter(row["capture"] for row in fold["caseDecisions"]))
            folds[group] = stats
        profiles[name] = {"passesCriterion": profile["passesCriterion"], "folds": folds}
    root = {key: value for key, value in report.items() if key != "profiles"}
    return {**root, "fullReportSha256": digest(detail_path), "profiles": profiles}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path("data"))
    args = parser.parse_args()
    report = evaluate(args.data)
    detail = args.data / "transition-gate-m5/numeric-transition-fit.json"
    write_json(detail, report)
    write_json(detail.with_name("numeric-transition-fit-summary.json"), summarize(report, detail))


if __name__ == "__main__":
    main()
