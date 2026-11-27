"""Compara o veto congelado de Cinco com o combinado nas reservas já separadas."""

import argparse
from pathlib import Path

import numpy as np

from dataset import FRAMES, digest, load_features, write_json
from metrics import decide, describe
from ml.evaluate_numeric_veto_confirmation import FROZEN, apply_veto, estimates_from
from ml.evaluate_transition_veto import posterior
from ml.external_eval.evaluate import load_json, verified_model


EXTERNAL = {
    "fiocruz-cinco": "fresh-sign/features/index.json",
    "fiocruz-sete-oito": "isolated-negative-audit/didactic/features/index.json",
    "clad": "external-negative/features/index.json",
    "clad-variantes": "isolated-negative-audit/clad/features/index.json",
}
MINDS = "minds-expanded/features/index.json"


def compare(rows, session, model, estimates):
    labels = model["labels"]
    before = np.zeros((len(labels), len(labels)), dtype=int)
    after = np.zeros_like(before)
    decisions = []
    for clip, values in rows:
        logits = None if values is None else posterior(session, model, values)[0]
        prediction, confidence = decide(logits, model["threshold"])
        baseline = labels[prediction]
        accepted, scores = apply_veto(baseline, values, estimates)
        expected = labels.index(clip["expected"])
        before[expected, labels.index(baseline)] += 1
        after[expected, labels.index(accepted)] += 1
        decisions.append({**clip, "predicted": baseline, "confidence": confidence,
                          "scores": scores, "afterVeto": accepted})
    return {"baseline": describe(before, labels), "withVeto": describe(after, labels), "decisions": decisions}


def external_rows(path, index, group, model):
    clips = index["clips"] if group.startswith("clad") else [clip for clip in index["clips"] if clip["id"] == group]
    if not clips or (not group.startswith("clad") and len(clips) != 1):
        raise ValueError(f"Seleção ausente ou duplicada: {group}.")
    for clip in clips:
        feature_name = clip["sha256"] + ".json"
        if feature_name != clip["features"] or clip["partition"] != "test":
            raise ValueError("A extração externa precisa corresponder à partição reservada.")
        extracted = load_json(path.parent / feature_name)
        state = extracted["state"]
        if (extracted["clipSha256"] != clip["sha256"] or extracted["recipe"] != index["recipe"]
                or state not in {"ready", "no-hand", "insufficient"}):
            raise ValueError("Extração externa incompatível com o recorte.")
        values = None
        if state == "ready":
            values = np.asarray(extracted["values"], dtype=np.float32).reshape(FRAMES, model["features"])
            if not np.isfinite(values).all() or not np.isin(values[:, 3::4], (0, 1)).all():
                raise ValueError("Extração externa contém valores inválidos.")
        elif extracted["values"] is not None:
            raise ValueError("Extração externa inconclusiva contém pontos.")
        yield ({"id": clip.get("id", clip["sha256"]), "sha256": clip["sha256"], "signer": clip["signer"],
                "expected": clip["label"], "captureState": state}, values)


def evaluate(data):
    frozen = load_json(FROZEN)
    estimates = estimates_from(frozen)
    paths = {"minds-test": MINDS, **EXTERNAL}
    results = {}
    for group, relative in paths.items():
        path = data / relative
        index = load_json(path)
        session, model, manifest_sha = verified_model(data / "models/isolated-combined", index)
        if (model["modelSha256"], manifest_sha, model["threshold"]) != (
            frozen["modelSha256"], frozen["modelManifestSha256"], frozen["baselineThreshold"]
        ):
            raise ValueError("O modelo precisa corresponder à versão congelada.")
        if group == "minds-test":
            labels = tuple(model["labels"])
            _, clips = load_features(path, {"test"}, labels)
            rows = (({"sha256": clip.checksum, "signer": clip.signer, "expected": labels[clip.label],
                      "captureState": clip.state}, clip.values) for clip in clips)
        else:
            rows = external_rows(path, index, group, model)
        results[group] = {"index": relative, "indexSha256": digest(path),
                          **compare(rows, session, model, estimates)}
    return {"schemaVersion": 1, "device": "CPUExecutionProvider", "frozenRuleSha256": digest(FROZEN),
            "modelSha256": frozen["modelSha256"], "modelManifestSha256": frozen["modelManifestSha256"],
            "threshold": frozen["baselineThreshold"], "groups": results}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path("data"))
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    write_json(args.out, evaluate(args.data))


if __name__ == "__main__":
    main()
