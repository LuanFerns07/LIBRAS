"""Exporta um modelo de contato dos dedos para distinguir O de E."""

import argparse
import json
from pathlib import Path
from shutil import copyfile
from tempfile import TemporaryDirectory

import numpy as np
import onnx
import onnxruntime as ort
import torch
from torch import nn

from .probe_as import THUMB_SCORE, fit_linear, training_examples
from .supplement import load_model
from .train import FEATURES, centered, checksum, reference_data


PAIR = ("E", "O")


def contact_distances(hand):
    points = hand.reshape(-1, 21, 3)
    return torch.linalg.vector_norm(points[:, 8:13:4] - points[:, 4:5], dim=2)


class ContactModel(nn.Module):
    def __init__(self, linear, mean, scale):
        super().__init__()
        self.linear = linear
        self.register_buffer("mean", mean)
        self.register_buffer("scale", scale)

    def forward(self, hand):
        return self.linear((contact_distances(hand) - self.mean) / self.scale).sigmoid()


def export(base, data, reference, output):
    if base.resolve() == output.resolve():
        raise ValueError("Use um destino diferente da base.")
    metadata = json.loads((base / "alphabet.json").read_text())
    if (metadata["features"] != FEATURES or metadata["preprocess"] != "hand-wrist-palm-v1"
            or any(letter not in metadata["labels"] for letter in PAIR) or "contrast" in metadata):
        raise ValueError("Use um modelo de alfabeto com E e O, sem uma distinção adicional instalada.")
    assets = [load_model(base, name, expected) for name, expected in [
        ("alphabet.onnx", metadata["modelSha256"]),
        ("alphabet-check.onnx", metadata.get("agreementSha256")),
        ("alphabet-supplement.onnx", metadata.get("supplement", {}).get("modelSha256")),
    ] if expected is not None]

    torch.set_num_threads(2)
    hands, labels = training_examples(data, reference, PAIR)
    model = ContactModel(*fit_linear(contact_distances(torch.from_numpy(hands)), labels)).eval()
    with np.load(data, allow_pickle=False) as packed:
        valid = (packed["splits"] == "val") & np.isin(packed["labels"], PAIR)
        datasets = {"LibraSign": (centered(packed["points"][valid]), packed["labels"][valid] == "O")}
    points, expected = reference_data(reference, list(PAIR))["val"]
    datasets["video"] = (points, expected == 1)
    fixture = np.concatenate([points.reshape(-1, FEATURES) for points, _ in datasets.values()])

    output.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=output) as temporary:
        folder = Path(temporary)
        target = folder / "alphabet-contrast.onnx"
        torch.onnx.export(model, torch.from_numpy(fixture[:1]), str(target), input_names=["hand"],
                          output_names=["scores"], opset_version=17,
                          dynamic_axes={"hand": {0: "frames"}, "scores": {0: "frames"}})
        onnx.checker.check_model(target, full_check=True)
        options = ort.SessionOptions()
        options.intra_op_num_threads = 1
        session = ort.InferenceSession(str(target), options, providers=["CPUExecutionProvider"])
        scores, = session.run(None, {"hand": fixture})
        with torch.inference_mode():
            np.testing.assert_allclose(scores, model(torch.from_numpy(fixture)).numpy(), atol=1e-6, rtol=2e-5)

        contrast = {"from": PAIR[0], "to": PAIR[1], "threshold": THUMB_SCORE, "modelSha256": checksum(target)}
        report = {"dataSha256": checksum(data), "referenceSha256": checksum(reference), "contrast": contrast,
                  "training": {"E": int((~labels).sum()), "O": int(labels.sum())}, "validation": {}}
        cursor = 0
        for name, (_, target_o) in datasets.items():
            selected = scores[cursor:cursor + len(target_o), 0] >= THUMB_SCORE
            report["validation"][name] = {"E": int((~target_o).sum()), "falseO": int((~target_o & selected).sum()),
                                          "O": int(target_o.sum()), "confirmedO": int((target_o & selected).sum())}
            cursor += len(target_o)
        for asset in assets:
            copyfile(asset, folder / asset.name)
        (folder / "alphabet.json").write_text(json.dumps({**metadata, "contrast": contrast}, indent=2) + "\n")
        (folder / "e-o-training.json").write_text(json.dumps(report, indent=2) + "\n")
        for name in (*(asset.name for asset in assets), target.name, "alphabet.json", "e-o-training.json"):
            (folder / name).replace(output / name)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("--data", type=Path, default=Path("data/alphabet/static.npz"))
    parser.add_argument("--reference", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    export(args.base, args.data, args.reference, args.out)
