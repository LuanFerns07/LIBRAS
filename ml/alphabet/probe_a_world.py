"""Avalia o uso da flexão 3D para recuperar A quando as redes estáticas divergem."""

import argparse
from itertools import groupby
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch

from .probe_as import fit_linear
from .refine_o import shape_features
from .supplement import load_model
from .train import FEATURES, centered, checksum


def observations(sample):
    for frame in sample["frames"]:
        sides = [side for side in ("left", "right") if len(frame[side + "Hand"]) == 21]
        if (not sides or len(sides) == 2
                and abs(frame["leftHand"][9]["y"] - frame["rightHand"][9]["y"]) < .18):
            continue
        side = min(sides, key=lambda name: frame[name + "Hand"][9]["y"])
        image, world = (frame[side + kind] for kind in ("Hand", "World"))
        if len(world) != 21:
            continue
        xyz = [np.asarray([[[point[axis] for axis in "xyz"] for point in hand]], dtype=np.float32)
               for hand in (image, world)]
        yield centered(xyz[0], frame["aspect"])[0], centered(xyz[1], 1.)[0]


def probe(base, reference):
    meta = json.loads((base / "alphabet.json").read_text())
    data = json.loads(reference.read_text())
    allowed = [meta["labels"].index(label) for label in "AQR"]
    clips = []
    for clip in data["samples"]:
        pairs = list(observations(clip))
        if pairs:
            image, world = map(np.stack, zip(*pairs, strict=True))
            clips.append((clip, image.reshape(-1, FEATURES), world))
    training = [(world, clip["label"] == "A") for clip, _, world in clips if clip["split"] == "train"]
    x = np.concatenate([world for world, _ in training])
    y = np.concatenate([np.full(len(world), is_a) for world, is_a in training])
    torch.set_num_threads(2)
    model, mean, scale = fit_linear(shape_features(torch.from_numpy(x))[:, 7:11], y)

    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    models = [ort.InferenceSession(load_model(base, name, expected), options, providers=["CPUExecutionProvider"])
              for name, expected in (
                  ("alphabet.onnx", meta["modelSha256"]),
                  ("alphabet-check.onnx", meta["agreementSha256"]),
                  ("alphabet-supplement.onnx", meta["supplement"]["modelSha256"]),
              )]
    windows = []
    for clip, image, world in clips:
        if clip["split"] == "train":
            continue
        baseline, check, other = [engine.run(None, {"hand": image})[0] for engine in models]
        votes = [torch.from_numpy(logits).softmax(1).numpy() for logits in (baseline, check)]
        first, second = (probability.argmax(1) for probability in votes)
        agreement = (first == second) & (np.minimum(votes[0].max(1), votes[1].max(1)) >= meta["threshold"])
        eligible = (~agreement & (other.max(1) < meta["supplement"]["threshold"])
                    & np.isin(first, allowed) & np.isin(second, allowed))
        with torch.inference_mode():
            flexion = shape_features(torch.from_numpy(world))[:, 7:11]
            score = model((flexion - mean) / scale).sigmoid().numpy().ravel()
        added = eligible & (score >= .5)
        run = max((len(list(group)) for vote, group in groupby(added) if vote), default=0)
        windows.append({
            **{key: clip[key] for key in ("source", "split", "label", "startMs", "endMs")},
            "selected": len(score), "eligible": int(eligible.sum()), "addedA": int(added.sum()),
            "longestRunBySelectedFrame": run,
        })
    return {
        "referenceSha256": checksum(reference), "manifests": data["sourceManifests"],
        "landmarkerSha256": data["landmarkerSha256"],
        "models": {key: meta[key] for key in ("modelSha256", "agreementSha256", "supplement")},
        "threshold": .5, "training": {"A": int(y.sum()), "others": int((~y).sum())}, "windows": windows,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path, help="Pasta dos modelos da prévia.")
    parser.add_argument("reference", type=Path, help="Referência com coordenadas 3D e partições.")
    args = parser.parse_args()
    print(json.dumps(probe(args.base, args.reference), ensure_ascii=False, indent=2))
