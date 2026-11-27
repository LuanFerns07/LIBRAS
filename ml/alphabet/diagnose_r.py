"""Mede a confirmação de forma em quadros que as duas redes aceitam como R."""

import argparse
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort

from .diagnose_static import top_votes
from .probe_pq import read_clips
from .supplement import load_model
from .train import FEATURES, checksum


THRESHOLDS = [.01, .05, .20, .50, .95]


def diagnose(base, complement, references):
    metadata = json.loads((base / "alphabet.json").read_text())
    shape_info = json.loads((complement / "alphabet.json").read_text())["imageR"]
    if shape_info["preprocess"] != metadata["preprocess"]:
        raise ValueError("O complemento de R deve usar as mesmas coordenadas das redes estáticas.")
    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    primary, verifier, shape = [
        ort.InferenceSession(load_model(directory, name, digest), options, providers=["CPUExecutionProvider"])
        for directory, name, digest in (
            (base, "alphabet.onnx", metadata["modelSha256"]),
            (base, "alphabet-check.onnx", metadata["agreementSha256"]),
            (complement, "alphabet-r-shape.onnx", shape_info["modelSha256"]),
        )
    ]
    labels = np.array(metadata["labels"])
    results = []
    for clip, points, _ in read_clips(references):
        inputs = {"hand": points.reshape(-1, FEATURES)}
        first, first_ok = top_votes(primary, inputs, labels, metadata["threshold"])
        second, second_ok = top_votes(verifier, inputs, labels, metadata["threshold"])
        accepted = first_ok & second_ok & (first == "R") & (second == "R")
        if not accepted.any():
            continue
        scores, = shape.run(["scores"], {"hand": inputs["hand"][accepted]})
        results.append({
            **{key: clip[key] for key in ("source", "label", "split", "startMs", "endMs")},
            "acceptedR": len(scores),
            "scoreRange": [round(float(value), 6) for value in (scores.min(), scores.max())],
            "preserved": [int((scores >= threshold).sum()) for threshold in THRESHOLDS],
        })
    return {
        "staticModelSha256": metadata["modelSha256"],
        "verifierSha256": metadata["agreementSha256"],
        "shapeModelSha256": shape_info["modelSha256"],
        "references": [checksum(path) for path in references],
        "thresholds": THRESHOLDS,
        "results": results,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("complement", type=Path)
    parser.add_argument("references", type=Path, nargs="+")
    args = parser.parse_args()
    print(json.dumps(diagnose(args.base, args.complement, args.references), ensure_ascii=False, indent=2))
