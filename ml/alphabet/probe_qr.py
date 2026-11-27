"""Mede dois complementos para as confusões de Q/N e R/U."""

import argparse
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch

from .probe_a_world import observations
from .probe_as import fit_linear
from .refine_o import shape_features
from .supplement import load_model
from .train import FEATURES, checksum


def q_shape(points):
    fingers_down = points[:, 8:17:4, 1] - points[:, 5:14:4, 1]
    flexion = shape_features(points)[:, 7:10]
    spacing = torch.linalg.vector_norm(points[:, 8] - points[:, 12], dim=1, keepdim=True)
    return torch.cat((flexion, fingers_down, spacing), dim=1)


def r_shape(points):
    tips = points[:, 8] - points[:, 12]
    axis = torch.nn.functional.normalize(points[:, 5] - points[:, 9], dim=1, eps=.05)
    projection = (tips * axis).sum(dim=1, keepdim=True)
    separation = torch.linalg.vector_norm(tips, dim=1, keepdim=True)
    return torch.cat((projection, separation, shape_features(points)[:, 7:9]), dim=1)


def probe(base, references):
    metadata = json.loads((base / "alphabet.json").read_text())
    labels = np.array(metadata["labels"])
    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    models = [ort.InferenceSession(load_model(base, filename, digest), options, providers=["CPUExecutionProvider"])
              for filename, digest in (
                  ("alphabet.onnx", metadata["modelSha256"]),
                  ("alphabet-check.onnx", metadata["agreementSha256"]),
                  ("alphabet-supplement.onnx", metadata["supplement"]["modelSha256"]),
              )]
    clips = {}
    for path in references:
        for clip in json.loads(path.read_text())["samples"]:
            key = (clip["source"], clip["label"], clip["startMs"], clip["endMs"])
            if key not in clips and (pairs := list(observations(clip))):
                image, world = map(np.stack, zip(*pairs, strict=True))
                clips[key] = clip, image, world
    results = {}
    torch.set_num_threads(2)
    for letters, measure, index in (("NPQ", q_shape, 2), ("UR", r_shape, 1)):
        target = letters[-1]
        train = [(entry[0]["label"], entry[index]) for entry in clips.values()
                 if entry[0]["split"] == "train" and entry[0]["label"] in letters]
        points = np.concatenate([values for _, values in train])
        is_target = np.concatenate([np.full(len(values), label == target) for label, values in train])
        model, mean, scale = fit_linear(measure(torch.from_numpy(points)), is_target)
        windows = []
        checked = checked_frames = new_false_frames = 0
        for entry in clips.values():
            clip, image, _ = entry
            if clip["split"] == "train":
                continue
            first, second, extra = [engine.run(None, {"hand": image.reshape(-1, FEATURES)})[0] for engine in models]
            probabilities = [torch.from_numpy(logits).softmax(1).numpy() for logits in (first, second)]
            p, q = (labels[values.argmax(1)] for values in probabilities)
            confidences = [values.max(1) for values in probabilities]
            accepted = (p == q) & (np.minimum(*confidences) >= metadata["threshold"])
            if target == "Q":
                eligible = ((p == "N") & (q == "Q") & (confidences[1] >= metadata["threshold"])
                            & (extra.max(1) < metadata["supplement"]["threshold"]))
            else:
                eligible = accepted & (p == "U")
            with torch.inference_mode():
                shape = measure(torch.from_numpy(entry[index]))
                confirmed = model((shape - mean) / scale).sigmoid().numpy().ravel() >= .95
            selected = int((eligible & confirmed).sum())
            checked += 1
            checked_frames += len(image)
            if clip["label"] != target:
                new_false_frames += selected
            if clip["label"] in letters or selected:
                windows.append({
                    **{key: clip[key] for key in ("source", "split", "label", "startMs", "endMs")},
                    "frames": len(image), "eligible": int(eligible.sum()),
                    "shapeVotes": int(confirmed.sum()), "newVotes": selected,
                })
        results[target] = {"trainingPositive": int(is_target.sum()), "trainingOther": int((~is_target).sum()),
                           "windowsChecked": checked, "framesChecked": checked_frames,
                           "newFalseFrames": new_false_frames, "windowsOfInterest": windows}
    return {"references": [checksum(path) for path in references],
            "alphabetManifestSha256": checksum(base / "alphabet.json"), "threshold": .95, "results": results}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("references", type=Path, nargs="+")
    args = parser.parse_args()
    print(json.dumps(probe(args.base, args.references), ensure_ascii=False, indent=2))
