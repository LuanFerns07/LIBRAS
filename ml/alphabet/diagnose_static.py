"""Conta os votos dos modelos estáticos em cada janela de uma gravação."""

import argparse
from collections import Counter
from itertools import groupby
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort

from .probe_as import normalized_frames
from .supplement import load_model
from .train import checksum


def top_votes(model, inputs, labels, threshold):
    logits, = model.run(["logits"], inputs)
    best = logits.argmax(axis=1)
    relative = logits - logits.max(axis=1, keepdims=True)
    accepted = 1 / np.exp(relative).sum(axis=1) >= threshold
    return labels[best], accepted


def diagnose(base, frames_path):
    metadata = json.loads((base / "alphabet.json").read_text())
    labels = np.array(metadata["labels"])
    options = ort.SessionOptions()
    options.intra_op_num_threads = 1

    def open_model(name, digest):
        path = load_model(base, name, digest)
        return ort.InferenceSession(path, options, providers=["CPUExecutionProvider"])

    primary = open_model("alphabet.onnx", metadata["modelSha256"])
    verifier = open_model("alphabet-check.onnx", metadata["agreementSha256"])
    supplement_info = metadata.get("supplement")
    contrast_info = metadata.get("contrast")
    supplement = open_model("alphabet-supplement.onnx", supplement_info["modelSha256"]) if supplement_info else None
    contrast = open_model("alphabet-contrast.onnx", contrast_info["modelSha256"]) if contrast_info else None

    frames = json.loads(frames_path.read_text())
    results = []
    for sample in frames["samples"]:
        points = list(normalized_frames(sample["frames"]))
        selected = [row is not None for row in points]
        identity = {key: sample[key] for key in ("source", "label", "startMs", "endMs")}
        row = {**identity, "sampled": len(points), "selected": sum(selected)}
        if not any(selected):
            results.append(row)
            continue

        inputs = {"hand": np.stack([point for point in points if point is not None]).reshape(-1, metadata["features"])}
        first, first_passed = top_votes(primary, inputs, labels, metadata["threshold"])
        second, second_passed = top_votes(verifier, inputs, labels, metadata["threshold"])
        accepted = (first == second) & first_passed & second_passed
        votes = np.where(accepted, first, "—")
        if supplement:
            scores, = supplement.run(["scores"], inputs)
            confirmed = ~accepted & (scores.max(axis=1) >= supplement_info["threshold"])
            votes[confirmed] = np.array(supplement_info["labels"])[scores[confirmed].argmax(axis=1)]
        if contrast and (compared := votes == contrast_info["from"]).any():
            scores, = contrast.run(["scores"], {"hand": inputs["hand"][compared]})
            changed = np.flatnonzero(compared)[scores[:, 0] >= contrast_info["threshold"]]
            votes[changed] = contrast_info["to"]
        timeline = np.full(len(points), "—", dtype=votes.dtype)
        timeline[selected] = votes
        longest = max((len(list(run)) for letter, run in groupby(timeline) if letter == sample["label"]), default=0)
        results.append({**row, "primaryTop": dict(Counter(first)), "verifierTop": dict(Counter(second)),
                        "staticVotes": dict(Counter(votes)), "longestExpectedRun": longest})

    report = {"framesSha256": checksum(frames_path), "manifestSha256": frames["manifestSha256"],
              "landmarkerSha256": frames["landmarkerSha256"], "model": metadata, "results": results}
    if frames.get("mirroredInput"):
        report["mirroredInput"] = True
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path, help="Pasta dos modelos instalados na prévia.")
    parser.add_argument("frames", type=Path, help="Pontos produzidos por ml.alphabet.extract_motion.")
    args = parser.parse_args()
    print(json.dumps(diagnose(args.base, args.frames), ensure_ascii=False, indent=2))
