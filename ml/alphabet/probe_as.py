"""Mede a distinção de A e S por articulação do polegar, fora do aplicativo."""

import argparse
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch
from torch import nn

from .refine_o import shape_features
from .supplement import load_model
from .train import FEATURES, SEED, centered, checksum, reference_data


THUMB_SCORE = .95


def thumb_features(points, finger_flexion):
    across = points[:, 17] - points[:, 5]
    palm = points[:, 9] - points[:, 0]
    thumb = points[:, 4]
    side = ((thumb - points[:, 5]) * across).sum(dim=1) / across.square().sum(dim=1).clamp_min(1e-6)
    forward = ((thumb - points[:, 0]) * palm).sum(dim=1) / palm.square().sum(dim=1).clamp_min(1e-6)
    middle = torch.linalg.vector_norm(thumb - points[:, 9], dim=1)
    span = torch.linalg.vector_norm(thumb - points[:, 2], dim=1)
    measures = torch.stack((side, forward, middle, span), dim=1)
    if finger_flexion:
        return torch.cat((measures, shape_features(points)[:, 7:11]), dim=1)
    return measures


class ThumbShape(nn.Module):
    def __init__(self, linear, mean, scale, finger_flexion):
        super().__init__()
        self.linear = linear
        self.register_buffer("mean", mean)
        self.register_buffer("scale", scale)
        self.finger_flexion = finger_flexion

    def forward(self, hand):
        values = thumb_features(hand.reshape(-1, 21, 3), self.finger_flexion)
        return self.linear((values - self.mean) / self.scale).sigmoid()


def fit(hands, labels, finger_flexion):
    torch.manual_seed(SEED)
    values = thumb_features(torch.from_numpy(hands), finger_flexion)
    mean = values.mean(dim=0)
    scale = values.std(dim=0).clamp_min(.03)
    values = (values - mean) / scale
    targets = torch.from_numpy(labels).float().reshape(-1, 1)
    weights = torch.where(targets == 1, .5 / targets.sum(), .5 / (1 - targets).sum())
    model = nn.Linear(values.shape[1], 1)
    optimizer = torch.optim.LBFGS(model.parameters(), max_iter=100, line_search_fn="strong_wolfe")

    def loss():
        optimizer.zero_grad()
        errors = nn.functional.binary_cross_entropy_with_logits(model(values), targets, reduction="none")
        objective = (errors * weights).sum() + .0008 * model.weight.square().sum()
        objective.backward()
        return objective

    optimizer.step(loss)
    return ThumbShape(model, mean, scale, finger_flexion).eval()


def training_examples(data, reference):
    if checksum(data) != json.loads(data.with_suffix(".json").read_text())["dataSha256"]:
        raise ValueError("Os dados LibraSign divergem do manifesto.")
    with np.load(data, allow_pickle=False) as packed:
        rows = (packed["splits"] == "train") & np.isin(packed["labels"], ("A", "S"))
        hands = centered(packed["points"][rows])
        labels = packed["labels"][rows] == "S"
    extra, actual = reference_data(reference, ["A", "S"])["train"]
    return (np.concatenate((hands, np.repeat(extra, 32, axis=0))),
            np.concatenate((labels, np.repeat(actual == 1, 32))))


def normalized_frames(frames):
    for frame in frames:
        hands = [hand for side in ("leftHand", "rightHand") if len(hand := frame[side]) == 21]
        if not hands or (len(hands) == 2 and abs(hands[0][9]["y"] - hands[1][9]["y"]) < .18):
            yield None
            continue
        hand = min(hands, key=lambda value: value[9]["y"])
        points = np.asarray([[[point[axis] for axis in "xyz"] for point in hand]], dtype=np.float32)
        yield centered(points, frame["aspect"])[0]


def summary(new_s, kept_s, old_a, valid):
    timeline = np.zeros(len(valid), dtype=bool)
    timeline[valid] = new_s | kept_s
    triples = int((np.convolve(timeline.astype(int), [1, 1, 1], mode="valid") == 3).sum()) if len(timeline) >= 3 else 0
    return {"addedS": int(new_s.sum()), "changedA": int((old_a & new_s).sum()), "triplesS": triples}


def report(base, data, reference, evaluations):
    torch.set_num_threads(2)
    metadata = json.loads((base / "alphabet.json").read_text())
    primary = load_model(base, "alphabet.onnx", metadata["modelSha256"])
    verifier = load_model(base, "alphabet-check.onnx", metadata["agreementSha256"])
    a, s = (metadata["labels"].index(letter) for letter in ("A", "S"))
    threshold = metadata["threshold"]
    hands, labels = training_examples(data, reference)
    four_measures = fit(hands, labels, finger_flexion=False)
    eight_measures = fit(hands, labels, finger_flexion=True)
    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    models = [ort.InferenceSession(str(path), options, providers=["CPUExecutionProvider"]) for path in (primary, verifier)]

    results = []
    for file in evaluations:
        for clip in json.loads(file.read_text())["samples"]:
            frames = list(normalized_frames(clip["frames"]))
            valid = np.asarray([frame is not None for frame in frames], dtype=bool)
            if not valid.any():
                continue
            points = np.stack([frame for frame in frames if frame is not None])
            feed = {"hand": points.reshape(-1, FEATURES)}
            first, second = (torch.from_numpy(model.run(None, feed)[0]).softmax(dim=1).numpy() for model in models)
            principal, verification = first.argmax(axis=1), second.argmax(axis=1)
            agreed = (principal == verification) & (np.minimum(first.max(axis=1), second.max(axis=1)) >= threshold)
            old_s, old_a = agreed & (principal == s), agreed & (principal == a)
            pair = np.isin(principal, (a, s)) & np.isin(verification, (a, s))
            permissive = pair & (np.maximum(first.max(axis=1), second.max(axis=1)) >= threshold) & ~old_s
            confirms_s = pair & (second[:, s] >= threshold) & ~old_s
            with torch.inference_mode():
                small_shape, large_shape = (shape(torch.from_numpy(points)).numpy().ravel() >= THUMB_SCORE
                                            for shape in (four_measures, eight_measures))
            variants = {
                "fourMeasures": summary(small_shape & permissive, old_s, old_a, valid),
                "fourMeasuresWithVerifierS": summary(small_shape & confirms_s, old_s, old_a, valid),
                "eightMeasures": summary(large_shape & permissive, old_s, old_a, valid),
            }
            results.append({"source": clip["source"], "label": clip["label"], "startMs": clip["startMs"],
                            "split": clip["split"], "observed": len(points), "oldA": int(old_a.sum()),
                            "oldS": int(old_s.sum()), "variants": variants})
    return {"weights": {"primary": checksum(primary), "verifier": checksum(verifier)}, "dataSha256": checksum(data),
            "referenceSha256": checksum(reference), "inputSha256": [checksum(file) for file in evaluations],
            "threshold": THUMB_SCORE, "results": results}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", type=Path, default=Path("data/models/alphabet-live"))
    parser.add_argument("--data", type=Path, default=Path("data/alphabet/static.npz"))
    parser.add_argument("--reference", type=Path, required=True)
    parser.add_argument("frames", type=Path, nargs="+")
    args = parser.parse_args()
    print(json.dumps(report(args.base, args.data, args.reference, args.frames), indent=2))
