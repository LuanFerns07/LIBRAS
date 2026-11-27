"""Avalia o uso da flexão 3D para recuperar A quando as redes estáticas divergem."""

import argparse
from itertools import groupby
import json
from pathlib import Path
from shutil import copyfile
from tempfile import TemporaryDirectory

import numpy as np
import onnx
import onnxruntime as ort
import torch
from torch import nn

from .probe_as import fit_linear
from .refine_o import shape_features
from .supplement import load_model
from .train import FEATURES, centered, checksum


class FlexionA(nn.Module):
    def __init__(self, model, mean, scale):
        super().__init__()
        self.model = model
        self.register_buffer("mean", mean)
        self.register_buffer("scale", scale)

    def forward(self, world):
        flexion = shape_features(world)[:, 7:11]
        return self.model((flexion - self.mean) / self.scale).sigmoid()


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


def probe(base, reference, output=None):
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
    model = FlexionA(*fit_linear(shape_features(torch.from_numpy(x))[:, 7:11], y)).eval()

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
            score = model(torch.from_numpy(world)).numpy().ravel()
        added = eligible & (score >= .5)
        run = max((len(list(group)) for vote, group in groupby(added) if vote), default=0)
        windows.append({
            **{key: clip[key] for key in ("source", "split", "label", "startMs", "endMs")},
            "selected": len(score), "eligible": int(eligible.sum()), "addedA": int(added.sum()),
            "longestRunBySelectedFrame": run,
        })
    report = {
        "referenceSha256": checksum(reference), "manifests": data["sourceManifests"],
        "landmarkerSha256": data["landmarkerSha256"],
        "models": {key: meta[key] for key in ("modelSha256", "agreementSha256", "supplement")},
        "threshold": .5, "training": {"A": int(y.sum()), "others": int((~y).sum())}, "windows": windows,
    }
    if output is not None:
        report["worldA"] = export(base, output, meta, model, np.concatenate([world for _, _, world in clips]))
    return report


def export(base, output, metadata, model, points):
    if base.resolve() == output.resolve() or "worldA" in metadata:
        raise ValueError("Use uma base sem complemento 3D e uma pasta de destino distinta.")
    output.mkdir(parents=True, exist_ok=True)
    assets = [load_model(base, name, expected) for name, expected in (
        ("alphabet.onnx", metadata["modelSha256"]),
        ("alphabet-check.onnx", metadata["agreementSha256"]),
        ("alphabet-supplement.onnx", metadata["supplement"]["modelSha256"]),
        ("alphabet-contrast.onnx", metadata.get("contrast", {}).get("modelSha256")),
    ) if expected is not None]
    features = points.reshape(-1, FEATURES)
    with TemporaryDirectory(dir=output) as temporary:
        folder = Path(temporary)
        target = folder / "alphabet-a-world.onnx"
        torch.onnx.export(model, torch.from_numpy(features[:1]), str(target), input_names=["world"],
                          output_names=["scores"], opset_version=17, dynamo=False,
                          dynamic_axes={"world": {0: "frames"}, "scores": {0: "frames"}})
        onnx.checker.check_model(target, full_check=True)
        options = ort.SessionOptions()
        options.intra_op_num_threads = 1
        session = ort.InferenceSession(target, options, providers=["CPUExecutionProvider"])
        scores, = session.run(["scores"], {"world": features})
        with torch.inference_mode():
            expected = model(torch.from_numpy(features)).numpy()
        np.testing.assert_allclose(scores, expected, atol=1e-6, rtol=2e-5)
        np.testing.assert_array_equal(scores >= .5, expected >= .5)
        manifest = {"preprocess": "hand-world-wrist-palm-v1", "threshold": .5, "modelSha256": checksum(target)}
        for asset in assets:
            copyfile(asset, folder / asset.name)
        (folder / "alphabet.json").write_text(json.dumps({**metadata, "worldA": manifest}, indent=2) + "\n")
        for name in (*(asset.name for asset in assets), target.name, "alphabet.json"):
            (folder / name).replace(output / name)
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path, help="Pasta dos modelos da prévia.")
    parser.add_argument("reference", type=Path, help="Referência com coordenadas 3D e partições.")
    parser.add_argument("--out", type=Path, help="Pasta para exportar o complemento ONNX e os modelos da base.")
    args = parser.parse_args()
    print(json.dumps(probe(args.base, args.reference, args.out), ensure_ascii=False, indent=2))
