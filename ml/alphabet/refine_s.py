"""Exporta a confirmação de S no par A/S como complemento ao leitor estático."""

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

from .probe_as import THUMB_SCORE, fit, training_examples
from .supplement import load_model
from .train import FEATURES, centered, checksum


def graph_for(parts, a_index, s_index, threshold, number_of_labels):
    graphs = []
    for name, path in parts:
        model = onnx.load(path)
        if [(item.domain, item.version) for item in model.opset_import] != [("", 17)]:
            raise ValueError("Use modelos ONNX exportados com opset 17.")
        graphs.append(compose.add_prefix_graph(model.graph, name + "/", rename_inputs=False))
    primary, verifier, previous, thumb = (graph.output[0].name for graph in graphs)
    weights = [item for graph in graphs for item in graph.initializer]
    for name, value, dtype in [("a", a_index, np.int64), ("s", [s_index], np.int64),
                               ("agreement", threshold, np.float32), ("prior_cut", THUMB_SCORE, np.float32),
                               ("zero", 0, np.float32)]:
        weights.append(numpy_helper.from_array(np.asarray(value, dtype=dtype), name))
    nodes = [node for graph in graphs for node in graph.node]
    nodes.extend([
        helper.make_node("ArgMax", [primary], ["letter"], axis=1, keepdims=1),
        helper.make_node("Equal", ["letter", "a"], ["is_a"]),
        helper.make_node("Equal", ["letter", "s"], ["is_s"]),
        helper.make_node("Or", ["is_a", "is_s"], ["in_pair"]),
        helper.make_node("Softmax", [verifier], ["probability"], axis=1),
        helper.make_node("Gather", ["probability", "s"], ["probability_s"], axis=1),
        helper.make_node("GreaterOrEqual", ["probability_s", "agreement"], ["confirms_s"]),
        helper.make_node("And", ["in_pair", "confirms_s"], ["agreement_s"]),
        helper.make_node("ReduceMax", [previous], ["prior_max"], axes=[1], keepdims=1),
        helper.make_node("Less", ["prior_max", "prior_cut"], ["abstains"]),
        helper.make_node("And", ["agreement_s", "abstains"], ["permit_s"]),
        helper.make_node("Where", ["permit_s", thumb, "zero"], ["score_s"]),
        helper.make_node("Concat", [previous, "score_s"], ["scores"], axis=1),
    ])
    graph = helper.make_graph(nodes, "alphabet_supplement_with_s",
                              [helper.make_tensor_value_info("hand", TensorProto.FLOAT, ["frames", FEATURES])],
                              [helper.make_tensor_value_info("scores", TensorProto.FLOAT, ["frames", number_of_labels])],
                              initializer=weights)
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)], ir_version=8)
    onnx.checker.check_model(model, full_check=True)
    return model


def export(base, data, reference, output):
    if base.resolve() == output.resolve():
        raise ValueError("Use um destino diferente da base.")
    metadata = json.loads((base / "alphabet.json").read_text())
    prior = metadata["supplement"]
    if (metadata["features"] != FEATURES or metadata["preprocess"] != "hand-wrist-palm-v1"
            or prior["threshold"] != THUMB_SCORE or "S" in prior["labels"]):
        raise ValueError("O complemento anterior deve usar a mão normalizada e o limiar 0,95, com S disponível no catálogo principal.")
    primary = load_model(base, "alphabet.onnx", metadata["modelSha256"])
    verifier = load_model(base, "alphabet-check.onnx", metadata["agreementSha256"])
    previous = load_model(base, "alphabet-supplement.onnx", prior["modelSha256"])
    a, s = (metadata["labels"].index(letter) for letter in "AS")
    threshold = metadata["threshold"]
    letters = [*prior["labels"], "S"]

    torch.set_num_threads(2)
    hands, labels = training_examples(data, reference)
    model = fit(hands, labels, finger_flexion=False)
    with np.load(data, allow_pickle=False) as packed:
        mask = packed["splits"] == "val"
        fixture = centered(packed["points"][mask]).reshape(-1, FEATURES)
        expected_s = packed["labels"][mask] == "S"

    output.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=output) as temporary:
        folder = Path(temporary)
        thumb = folder / "thumb.onnx"
        torch.onnx.export(model, torch.from_numpy(fixture[:1]), str(thumb), input_names=["hand"],
                          output_names=["shape"], opset_version=17,
                          dynamic_axes={"hand": {0: "frames"}, "shape": {0: "frames"}})
        target = folder / previous.name
        parts = [("primary", primary), ("check", verifier), ("base", previous), ("thumb", thumb)]
        onnx.save(graph_for(parts, a, s, threshold, len(letters)), target)
        options = ort.SessionOptions()
        options.intra_op_num_threads = 1

        def infer(path):
            session = ort.InferenceSession(str(path), options, providers=["CPUExecutionProvider"])
            return session.run(None, {"hand": fixture})[0]

        probabilities = [torch.from_numpy(infer(path)).softmax(dim=1).numpy() for path in (primary, verifier)]
        first, second = probabilities
        initial = first.argmax(axis=1)
        old_scores = infer(previous)
        allowed = np.isin(initial, (a, s)) & (second[:, s] >= threshold) & (old_scores.max(axis=1) < THUMB_SCORE)
        with torch.inference_mode():
            shape = model(torch.from_numpy(fixture)).numpy().ravel()
        scores = infer(target)
        np.testing.assert_allclose(scores[:, :-1], old_scores, atol=1e-6, rtol=2e-5)
        np.testing.assert_allclose(scores[:, -1], np.where(allowed, shape, 0), atol=1e-6, rtol=2e-5)

        accepted = (initial == second.argmax(axis=1)) & (np.minimum(first.max(axis=1), second.max(axis=1)) >= threshold)
        added = ~accepted & (scores[:, -1] >= THUMB_SCORE)
        info = {**prior, "labels": letters, "modelSha256": checksum(target)}
        report = {"dataSha256": checksum(data), "referenceSha256": checksum(reference),
                  "previousSupplementSha256": checksum(previous), "supplement": info,
                  "primarySha256": checksum(primary), "verifierSha256": checksum(verifier),
                  "training": {"A": int((~labels).sum()), "S": int(labels.sum())},
                  "validation": {"frames": len(added), "S": int(expected_s.sum()),
                                 "addedS": int((added & expected_s).sum()), "addedFalseS": int((added & ~expected_s).sum())}}
        for path in (primary, verifier):
            copyfile(path, folder / path.name)
        (folder / "alphabet.json").write_text(json.dumps({**metadata, "supplement": info}, indent=2) + "\n")
        (folder / "s-training.json").write_text(json.dumps(report, indent=2) + "\n")
        for name in (primary.name, verifier.name, target.name, "alphabet.json", "s-training.json"):
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
