"""Treina e acrescenta ao complemento do alfabeto um classificador da forma de O."""

import argparse
import json
from pathlib import Path
from shutil import copyfile
from tempfile import TemporaryDirectory

import numpy as np
import onnx
from onnx import TensorProto, compose, helper, numpy_helper
import onnxruntime as ort
import torch
from torch import nn

from .supplement import load_model
from .train import FEATURES, SEED, centered, checksum, reference_data


def shape_features(hand):
    points = hand.reshape(-1, 21, 3)
    tips = points[:, 8:21:4]
    bases = points[:, 5:18:4]
    bones = torch.linalg.vector_norm(points[:, 5:] - points[:, 4:-1], dim=-1).reshape(-1, 4, 4)
    finger_lengths = bones[:, :, 1:].sum(dim=2)
    return torch.cat((
        torch.linalg.vector_norm(tips - points[:, 4:5], dim=-1),
        torch.linalg.vector_norm(tips[:, 1:] - tips[:, :-1], dim=-1),
        torch.linalg.vector_norm(tips - bases, dim=-1) / finger_lengths.clamp(min=.05),
        torch.linalg.vector_norm(points[:, 4] - points[:, 2], dim=-1, keepdim=True),
    ), dim=1)


class OShape(nn.Module):
    def __init__(self, data):
        super().__init__()
        self.register_buffer("mean", data.mean(dim=0))
        self.register_buffer("scale", data.std(dim=0).clamp(min=.03))
        self.linear = nn.Linear(data.shape[1], 1)

    def standardize(self, data):
        return (data - self.mean) / self.scale

    def forward(self, hand):
        return self.linear(self.standardize(shape_features(hand))).sigmoid()


def train(source, reference, classes):
    metadata = json.loads(source.with_suffix(".json").read_text())
    if checksum(source) != metadata["dataSha256"]:
        raise ValueError("Os dados LibraSign divergem dos metadados locais.")
    with np.load(source, allow_pickle=False) as packed:
        data = centered(packed["points"])
        target = packed["labels"] == "O"
        split = packed["splits"]
    extra = reference_data(reference, classes)
    train_hand, train_labels = extra["train"]
    val_hand, val_labels = extra["val"]
    index = classes.index("O")
    if not len(train_hand) or not len(val_hand) or index not in train_labels or index not in val_labels:
        raise ValueError("Use referências rotuladas com O nas partições de treino e validação.")
    train_mask = split == "train"
    hands = np.concatenate((data[train_mask], np.repeat(train_hand, 32, axis=0)))
    labels = np.concatenate((target[train_mask], np.repeat(train_labels == index, 32)))

    torch.set_num_threads(2)
    torch.manual_seed(SEED)
    features = shape_features(torch.from_numpy(hands))
    model = OShape(features)
    values = model.standardize(features)
    labels = torch.from_numpy(labels).float().reshape(-1, 1)
    weights = torch.where(labels == 1, .5 / labels.sum(), .5 / (1 - labels).sum())
    opt = torch.optim.LBFGS(model.parameters(), line_search_fn="strong_wolfe",
                            max_iter=150, tolerance_grad=1e-7)

    def loss():
        opt.zero_grad()
        logits = model.linear(values)
        objective = (nn.functional.binary_cross_entropy_with_logits(logits, labels, reduction="none") * weights).sum()
        objective += .0008 * model.linear.weight.square().sum()
        objective.backward()
        return objective

    opt.step(loss)
    return model.eval(), {
        "LibraSign": (data[split == "val"], target[split == "val"]),
        "video": (val_hand, val_labels == index),
    }


def export(base, source, reference, output):
    if base.resolve() == output.resolve():
        raise ValueError("Escolha um destino diferente da base.")
    metadata = json.loads((base / "alphabet.json").read_text())
    verifier = load_model(base, "alphabet-check.onnx", metadata["agreementSha256"])
    primary = load_model(base, "alphabet.onnx", metadata["modelSha256"])
    supplement = metadata["supplement"]
    if metadata["features"] != FEATURES or metadata["preprocess"] != "hand-wrist-palm-v1" or "O" in supplement["labels"]:
        raise ValueError("O complemento precisa usar a mão normalizada e não conter O.")
    existing = load_model(base, "alphabet-supplement.onnx", supplement["modelSha256"])
    o = metadata["labels"].index("O")
    model, validation = train(source, reference, metadata["labels"])
    output.mkdir(parents=True, exist_ok=True)
    fixture = np.concatenate([hands.reshape(-1, FEATURES) for hands, _ in validation.values()])

    with TemporaryDirectory(dir=output) as temporary:
        folder = Path(temporary)
        torch.onnx.export(model, torch.from_numpy(fixture[:1]), str(folder / "o.onnx"),
                          input_names=["hand"], output_names=["shape"], opset_version=17,
                          dynamic_axes={"hand": {0: "frames"}, "shape": {0: "frames"}})
        graphs = {}
        for name, path in [("base", existing), ("verifier", verifier), ("o", folder / "o.onnx")]:
            part = onnx.load(path)
            if [(item.domain, item.version) for item in part.opset_import] != [("", 17)]:
                raise ValueError("Use modelos ONNX exportados com opset 17.")
            graphs[name] = compose.add_prefix_graph(part.graph, name + "/", rename_inputs=False)
        previous, check, shape = (graphs[name].output[0].name for name in ("base", "verifier", "o"))
        weights = [weight for graph in graphs.values() for weight in graph.initializer]
        weights.extend(numpy_helper.from_array(np.asarray(value, dtype=dtype), name) for name, value, dtype in [
            ("letter_o", [o], np.int64), ("threshold_o", metadata["threshold"], np.float32),
            ("threshold_supplement", supplement["threshold"], np.float32), ("zero_o", 0, np.float32),
        ])
        nodes = [node for graph in graphs.values() for node in graph.node]
        nodes.extend([
            helper.make_node("Softmax", [check], ["probabilities"], axis=1),
            helper.make_node("Gather", ["probabilities", "letter_o"], ["probability_o"], axis=1),
            helper.make_node("GreaterOrEqual", ["probability_o", "threshold_o"], ["verifies_o"]),
            helper.make_node("ReduceMax", [previous], ["previous_max"], axes=[1], keepdims=1),
            helper.make_node("Less", ["previous_max", "threshold_supplement"], ["previous_abstains"]),
            helper.make_node("And", ["verifies_o", "previous_abstains"], ["can_refine_o"]),
            helper.make_node("Where", ["can_refine_o", shape, "zero_o"], ["verified_o"]),
            helper.make_node("Concat", [previous, "verified_o"], ["scores"], axis=1),
        ])
        letters = [*supplement["labels"], "O"]
        graph = helper.make_graph(nodes, "alphabet_supplement_with_o",
                                  [helper.make_tensor_value_info("hand", TensorProto.FLOAT, ["frames", FEATURES])],
                                  [helper.make_tensor_value_info("scores", TensorProto.FLOAT, ["frames", len(letters)])],
                                  initializer=weights)
        serialized = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)], ir_version=8)
        onnx.checker.check_model(serialized, full_check=True)
        target = folder / existing.name
        onnx.save(serialized, target)
        options = ort.SessionOptions()
        options.intra_op_num_threads = 1

        def infer(path):
            session = ort.InferenceSession(str(path), options, providers=["CPUExecutionProvider"])
            return session.run(None, {"hand": fixture})[0]

        scores = infer(target)
        with torch.inference_mode():
            binary = model(torch.from_numpy(fixture)).numpy().ravel()
        verified = torch.from_numpy(infer(verifier)).softmax(dim=1)[:, o].numpy() >= metadata["threshold"]
        prior = infer(existing)
        verified &= prior.max(axis=1) < supplement["threshold"]
        np.testing.assert_allclose(scores[:, :-1], prior, atol=1e-6, rtol=2e-5)
        np.testing.assert_allclose(scores[:, -1], np.where(verified, binary, 0), atol=1e-6, rtol=2e-5)

        supplement = {**supplement, "labels": letters, "modelSha256": checksum(target)}
        report = {"sourceSha256": checksum(source), "referenceSha256": checksum(reference),
                  "verifierSha256": checksum(verifier), "previousSupplementSha256": checksum(existing),
                  "versions": {"torch": torch.__version__, "onnx": onnx.__version__, "onnxruntime": ort.__version__},
                  "supplement": supplement, "validation": {}}
        cursor = 0
        for group, (_, expected) in validation.items():
            predicted = scores[cursor:cursor + len(expected), -1] >= supplement["threshold"]
            report["validation"][group] = {"examples": len(expected), "positives": int(expected.sum()),
                                           "acceptedO": int((predicted & expected).sum()),
                                           "falseO": int((predicted & ~expected).sum())}
            cursor += len(expected)
        for path in (primary, verifier):
            copyfile(path, folder / path.name)
        (folder / "alphabet.json").write_text(json.dumps({**metadata, "supplement": supplement}, indent=2) + "\n")
        (folder / "o-training.json").write_text(json.dumps(report, indent=2) + "\n")
        for name in (primary.name, verifier.name, target.name, "alphabet.json", "o-training.json"):
            (folder / name).replace(output / name)
    print(json.dumps(report, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("--source", type=Path, default=Path("data/alphabet/static.npz"))
    parser.add_argument("--reference", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    export(args.base, args.source, args.reference, args.out)


if __name__ == "__main__":
    main()
