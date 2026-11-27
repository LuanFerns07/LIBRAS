"""Avalia U nos quadros em que a confirmação de forma rejeitaria R."""

import argparse
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch

from .diagnose_static import top_votes
from .probe_pq import read_clips
from .probe_qr import r_shape
from .probe_y import train, y_shape
from .supplement import load_model
from .train import FEATURES, checksum


U_LIMIT = .95
R_VETO = .20
R_CONFIRMATION = .95
TRAIN_SESSIONS = {"1527000916", "cecierj-13757", "unesp-222981"}


def u_shape(points):
    return torch.cat((y_shape(points), r_shape(points)), dim=1)


def probe(base, complement, references):
    metadata = json.loads((base / "alphabet.json").read_text())
    r_info = json.loads((complement / "alphabet.json").read_text())["imageR"]
    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    primary, verifier, r_model = [
        ort.InferenceSession(load_model(folder, filename, digest), options, providers=["CPUExecutionProvider"])
        for folder, filename, digest in (
            (base, "alphabet.onnx", metadata["modelSha256"]),
            (base, "alphabet-check.onnx", metadata["agreementSha256"]),
            (complement, "alphabet-r-shape.onnx", r_info["modelSha256"]),
        )
    ]
    torch.set_num_threads(2)
    clips = list(read_clips(references))
    training = [(clip, image, world) for clip, image, world in clips if clip["source"] in TRAIN_SESSIONS]
    models = {name: train([(entry[0], entry[index]) for entry in training], "U", u_shape)
              for name, index in (("image", 1), ("world", 2))}
    labels = np.array(metadata["labels"])
    rows = []
    for clip, image, world in clips:
        if clip["source"] in TRAIN_SESSIONS:
            continue
        inputs = {"hand": image.reshape(-1, FEATURES)}
        first, first_ok = top_votes(primary, inputs, labels, metadata["threshold"])
        second, second_ok = top_votes(verifier, inputs, labels, metadata["threshold"])
        r_scores = r_model.run(["scores"], inputs)[0].ravel()
        r_vetoed = first_ok & second_ok & (first == "R") & (second == "R") & (r_scores < R_VETO)
        r_disagreement = first_ok & (first == "R") & (second == "U") & (r_scores >= R_CONFIRMATION)
        if clip["label"] not in ("R", "U") and not (r_vetoed | r_disagreement).any():
            continue
        row = {key: clip[key] for key in ("source", "split", "label", "startMs", "endMs")}
        row.update(frames=len(image), rVetoed=int(r_vetoed.sum()), rInDisagreement=int(r_disagreement.sum()))
        for name, points in (("image", image), ("world", world)):
            with torch.inference_mode():
                scores = models[name](torch.from_numpy(points)).numpy().ravel()
            confirmed = scores >= U_LIMIT
            row[name] = {"shapeVotes": int(confirmed.sum()), "newU": int((confirmed & r_vetoed).sum())}
        rows.append(row)
    return {
        "references": [checksum(path) for path in references],
        "rShapeSha256": r_info["modelSha256"], "trainingU": sum(clip["label"] == "U" for clip, _, _ in training),
        "trainingOther": sum(clip["label"] != "U" for clip, _, _ in training),
        "trainingSources": sorted(TRAIN_SESSIONS), "uLimit": U_LIMIT, "rVeto": R_VETO,
        "rConfirmation": R_CONFIRMATION, "results": rows,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("complement", type=Path)
    parser.add_argument("references", type=Path, nargs="+")
    args = parser.parse_args()
    print(json.dumps(probe(args.base, args.complement, args.references), ensure_ascii=False, indent=2))
