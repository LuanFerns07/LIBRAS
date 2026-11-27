"""Mede a ocupação da região dos ombros após o classificador aceitar Aluno."""

import argparse
from pathlib import Path

import numpy as np

from dataset import FRAMES, digest, load_features, write_json
from metrics import decide
from ml.evaluate_transition_veto import posterior
from ml.external_eval.evaluate import load_json, verified_model


PROTOCOL = Path(__file__).with_name("external_eval") / "aluno-ombros.json"
KEY_CASE = "clad-movimento-03-queixo-teclado"


def shoulder_frames(values, region):
    # Os pontos são relativos ao centro dos ombros e à largura entre eles.
    points = values.reshape(FRAMES, 48, 4)
    wrist = points[:, [6, 27]]
    palm_visible = points[:, [15, 36], 3] == 1
    in_region = ((wrist[:, :, 3] == 1) & palm_visible & (abs(wrist[:, :, 0]) >= region["minAbsX"])
                 & (wrist[:, :, 1] >= region["minY"]) & (wrist[:, :, 1] <= region["maxY"]))
    return int(in_region.any(axis=1).sum())


def checked_path(data, spec):
    path = data / spec["path"]
    if digest(path) != spec["sha256"]:
        raise ValueError(f"O índice diverge do protocolo: {path}")
    return path


def score(data, spec, splits, session, model, region, outside=False):
    path = checked_path(data, spec)
    labels = tuple(model["labels"])
    index, rows = load_features(path, splits, labels, training_negatives=outside and splits == {"train"},
                                required_labels=(None,) if outside else None)
    if index["modelSha256"] != model["extratorSha256"] or index["preprocess"] != model["preprocess"]:
        raise ValueError(f"Extração incompatível: {path}")
    decisions = []
    for row in rows:
        logits, _ = posterior(session, model, row.values) if row.values is not None else (None, None)
        prediction, confidence = decide(logits, model["threshold"])
        guess = labels[prediction]
        expected = labels[row.label]
        count = shoulder_frames(row.values, region) if guess == "aluno" else None
        outcome = None if count is not None and count < region["minFrames"] else guess
        meta = index["clips"][row.index]
        decisions.append({
            "id": meta.get("id", meta["file"]), "sha256": row.checksum, "split": row.partition,
            "expected": expected, "baseline": guess, "confidence": confidence,
            "shoulderFrames": count, "afterVeto": outcome,
        })
    return decisions


def summary(rows):
    positives = [row for row in rows if row["expected"] == row["baseline"] == "aluno"]
    negatives = [row for row in rows if row["expected"] is None and row["baseline"] == "aluno"]
    return {
        "clips": len(rows),
        "rightAluno": len(positives),
        "rightAlunoKept": sum(row["afterVeto"] == "aluno" for row in positives),
        "falseAluno": len(negatives),
        "falseAlunoVetoed": sum(row["afterVeto"] is None for row in negatives),
        "allFalseAcceptancesBefore": sum(row["expected"] is None and row["baseline"] is not None for row in rows),
        "allFalseAcceptancesAfter": sum(row["expected"] is None and row["afterVeto"] is not None for row in rows),
    }


def evaluate(data, reserved):
    plan = load_json(PROTOCOL)
    minds = checked_path(data, plan["minds"])
    session, model, manifest = verified_model(data / "models/isolated-combined", load_json(minds))
    if manifest != plan["modelManifestSha256"] or model["modelSha256"] != plan["modelSha256"]:
        raise ValueError("Os pesos ou o manifesto do combinado divergem do protocolo.")
    region = plan["region"]
    groups = {"MINDS": score(data, plan["minds"], {"test"} if reserved else {"train", "val"}, session, model, region)}
    outside = plan["reserved"] if reserved else [plan["development"]]
    for spec in outside:
        groups[spec["path"]] = score(data, spec, {"test"} if reserved else {"train"}, session, model, region, outside=True)
    target = next((row for rows in groups.values() for row in rows if row["id"] == KEY_CASE), None)
    return {
        "protocolSha256": digest(PROTOCOL), "scope": "reserva" if reserved else "desenvolvimento",
        "summary": {name: summary(rows) for name, rows in groups.items()},
        "keyCase": target,
        "decisions": {name: [row for row in rows if "aluno" in (row["expected"], row["baseline"])]
                      for name, rows in groups.items()},
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path("data"))
    parser.add_argument("--reserved", action="store_true")
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    write_json(args.out, evaluate(args.data, args.reserved))
