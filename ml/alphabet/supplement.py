"""Exporta a concordância de um par de redes para letras selecionadas."""

import argparse
import json
from pathlib import Path
from shutil import copyfile
from tempfile import TemporaryDirectory

import numpy as np
import onnx
from onnx import TensorProto, compose, helper, numpy_helper
import onnxruntime as ort

from .train import FEATURES, checksum


def load_model(directory, file, expected):
    path = directory / file
    if checksum(path) != expected:
        raise ValueError(f"Modelo divergente dos metadados em {path}.")
    return path


def export(base, candidate, output, selected, threshold):
    if output.resolve() in {base.resolve(), candidate.resolve()}:
        raise ValueError("Use um destino diferente dos dois modelos.")
    original = json.loads((base / "alphabet.json").read_text())
    proposal = json.loads((candidate / "alphabet.json").read_text())
    for key in ("version", "preprocess", "features", "labels"):
        if original[key] != proposal[key]:
            raise ValueError(f"Os manifestos divergem em {key}.")
    labels = original["labels"]
    if original["features"] != FEATURES or not selected or len(set(selected)) != len(selected) or any(
        label not in labels for label in selected
    ) or not .5 < threshold <= 1:
        raise ValueError("Letras ou limiar do complemento inválidos.")

    files = (("alphabet.onnx", "modelSha256"), ("alphabet-check.onnx", "agreementSha256"))
    originals = [load_model(base, file, original[key]) for file, key in files]
    branches = [load_model(candidate, file, proposal[key]) for file, key in files]
    nodes, weights, probabilities = [], [], []
    for index, path in enumerate(branches):
        model = onnx.load(path)
        if [(opset.domain, opset.version) for opset in model.opset_import] != [("", 17)]:
            raise ValueError("O complemento requer redes exportadas com ONNX opset 17.")
        graph = compose.add_prefix_graph(model.graph, f"rede{index}/", rename_inputs=False)
        if [item.name for item in graph.input] != ["hand"] or len(graph.output) != 1:
            raise ValueError("Entrada ou saída ONNX incompatível com o complemento.")
        nodes.extend(graph.node)
        weights.extend(graph.initializer)
        probability = f"probabilities{index}"
        nodes.append(helper.make_node("Softmax", [graph.output[0].name], [probability], axis=1))
        probabilities.append(probability)

    indices = np.asarray([labels.index(label) for label in selected], dtype=np.int64)
    weights.append(numpy_helper.from_array(indices, name="selected"))
    nodes.extend([
        helper.make_node("Min", probabilities, ["agreement"]),
        helper.make_node("Gather", ["agreement", "selected"], ["scores"], axis=1),
    ])
    graph = helper.make_graph(
        nodes, "alphabet_supplement",
        [helper.make_tensor_value_info("hand", TensorProto.FLOAT, ["frames", FEATURES])],
        [helper.make_tensor_value_info("scores", TensorProto.FLOAT, ["frames", len(selected)])],
        initializer=weights,
    )
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)], ir_version=8)
    onnx.checker.check_model(model, full_check=True)
    output.mkdir(parents=True, exist_ok=True)
    target_name = "alphabet-supplement.onnx"
    with TemporaryDirectory(dir=output) as temporary:
        folder = Path(temporary)
        target = folder / target_name
        onnx.save(model, target)
        options = ort.SessionOptions()
        options.intra_op_num_threads = 1

        def infer(path, feature_values):
            engine = ort.InferenceSession(str(path), options, providers=["CPUExecutionProvider"])
            result, = engine.run(None, {"hand": feature_values})
            return result

        fixture = np.random.default_rng(413).normal(0, .4, (16, FEATURES)).astype(np.float32)
        compared = []
        for path in branches:
            logits = infer(path, fixture)
            values = np.exp(logits - logits.max(axis=1, keepdims=True))
            compared.append(values / values.sum(axis=1, keepdims=True))
        expected = np.minimum(*compared)[:, indices]
        actual = infer(target, fixture)
        np.testing.assert_allclose(actual, expected, atol=1e-6, rtol=2e-5)
        info = {"labels": list(selected), "threshold": threshold, "modelSha256": checksum(target)}
        for path in originals:
            copyfile(path, folder / path.name)
        manifest = folder / "alphabet.json"
        manifest.write_text(json.dumps({**original, "supplement": info}, ensure_ascii=False, indent=2) + "\n")
        for name in (target_name, *(path.name for path in originals), manifest.name):
            (folder / name).replace(output / name)
    print(json.dumps(info, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("candidate", type=Path)
    parser.add_argument("--letters", required=True)
    parser.add_argument("--threshold", type=float, default=.95)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    export(args.base, args.candidate, args.out, args.letters, args.threshold)


if __name__ == "__main__":
    main()
