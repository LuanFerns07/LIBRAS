"""Testa a confirmação de Q em quadros aceitos como P pelas duas redes."""

import argparse
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch
from torch.nn.functional import normalize

from .diagnose_static import top_votes
from .probe_a_world import observations
from .probe_as import fit_linear
from .probe_qr import ShapeConfirmation
from .refine_o import shape_features
from .supplement import load_model
from .train import FEATURES, checksum


THRESHOLD = .95


def local_features(points):
    palm = normalize(points[:, 9] - points[:, 0], dim=1, eps=.05)
    across = points[:, 5] - points[:, 17]
    depth = normalize(torch.linalg.cross(across, palm), dim=1, eps=.05)
    index = normalize(points[:, 8] - points[:, 5], dim=1, eps=.05)
    middle = normalize(points[:, 12] - points[:, 9], dim=1, eps=.05)
    # O sinal da normal muda no espelho, mas a abertura para fora do plano é a mesma.
    projections = torch.stack((
        (index * palm).sum(dim=1),
        (middle * palm).sum(dim=1),
        (index * depth).sum(dim=1).abs(),
        (middle * depth).sum(dim=1).abs(),
        (index * middle).sum(dim=1),
    ), dim=1)
    shape = shape_features(points)
    return torch.cat((shape[:, :2], shape[:, 4:5], shape[:, 7:11], projections), dim=1)


def directed_features(points):
    return torch.cat((local_features(points), points[:, 8:13:4, 1] - points[:, 5:10:4, 1]), dim=1)


def read_clips(references):
    seen = set()
    for path in references:
        for clip in json.loads(path.read_text())["samples"]:
            key = tuple(clip[field] for field in ("source", "label", "startMs", "endMs"))
            if key in seen:
                continue
            seen.add(key)
            pairs = list(observations(clip))
            if pairs:
                image, world = map(np.stack, zip(*pairs, strict=True))
                yield clip, image, world


def probe(base, references):
    metadata_path = base / "alphabet.json"
    metadata = json.loads(metadata_path.read_text())
    labels = np.array(metadata["labels"])
    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    primary, check, existing_q = [
        ort.InferenceSession(load_model(base, name, digest), options, providers=["CPUExecutionProvider"])
        for name, digest in (
            ("alphabet.onnx", metadata["modelSha256"]),
            ("alphabet-check.onnx", metadata["agreementSha256"]),
            ("alphabet-q-shape.onnx", metadata["worldQ"]["modelSha256"]),
        )
    ]
    torch.set_num_threads(2)
    clips = list(read_clips(references))
    train = [(clip, points[np.linspace(0, len(points) - 1, 16).round().astype(int)])
             for clip, _, points in clips if clip["split"] == "train" and clip["label"] in ("P", "Q")]
    points = torch.from_numpy(np.concatenate([world for _, world in train]))
    target = np.repeat([clip["label"] == "Q" for clip, _ in train], 16)
    measures = {"local": local_features, "orientacao": directed_features}
    models = {name: ShapeConfirmation(measure, *fit_linear(measure(points), target)).eval()
              for name, measure in measures.items()}
    rows = []
    for clip, image, world in clips:
        if clip["split"] == "train":
            continue
        inputs = {"hand": image.reshape(-1, FEATURES)}
        first, first_ok = top_votes(primary, inputs, labels, metadata["threshold"])
        second, second_ok = top_votes(check, inputs, labels, metadata["threshold"])
        p_accepted = first_ok & second_ok & (first == "P") & (second == "P")
        if clip["label"] not in ("P", "Q") and not p_accepted.any():
            continue
        with torch.inference_mode():
            variants = {name: model(torch.from_numpy(world)).numpy().ravel() for name, model in models.items()}
        variants["q_atual"] = existing_q.run(["scores"], {"world": world.reshape(-1, FEATURES)})[0].ravel()
        rows.append({
            **{key: clip[key] for key in ("source", "split", "label", "startMs", "endMs")},
            "selected": len(world),
            "pAccepted": int(p_accepted.sum()),
            "models": {
                name: {
                    "median": round(float(np.median(scores)), 6),
                    "shapeVotes": int((scores >= THRESHOLD).sum()),
                    "changesFromP": int(((scores >= THRESHOLD) & p_accepted).sum()),
                }
                for name, scores in variants.items()
            },
        })
    return {
        "manifestSha256": checksum(metadata_path),
        "references": [checksum(path) for path in references],
        "threshold": THRESHOLD,
        "training": [{"source": clip["source"], "label": clip["label"], "frames": len(world)}
                     for clip, world in train],
        "evaluatedWindows": sum(clip["split"] != "train" for clip, _, _ in clips),
        "results": rows,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("references", type=Path, nargs="+")
    args = parser.parse_args()
    print(json.dumps(probe(args.base, args.references), ensure_ascii=False, indent=2))
