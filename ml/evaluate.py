"""Avalia somente o modelo já escolhido, no teste por pessoa reservado."""

import argparse
from collections import Counter
import json
from pathlib import Path
from time import perf_counter_ns

import numpy as np
import onnxruntime as ort
import torch

from dataset import CATALOGS, FEATURE_COUNTS, FEATURES, FRAMES, LABELS, digest, load_features, write_json
from metrics import checks, decide, measure
from model import ARCHITECTURES


def timing(measurements):
    if not measurements:
        return {"count": 0, "medianMs": None, "p95Ms": None}
    median, p95 = np.percentile(measurements, [50, 95]).tolist()
    return {"count": len(measurements), "medianMs": median, "p95Ms": p95}


def verified_inputs(features, run):
    paths = {
        "featuresManifestSha256": features,
        "checkpointSha256": run / "isolated.pt",
        "modelManifestSha256": run / "isolated.json",
        "modelSha256": run / "isolated.onnx",
    }
    training = json.loads((run / "training.json").read_text(encoding="utf-8"))
    for key, path in paths.items():
        if digest(path) != training[key]:
            raise ValueError(f"Arquivo difere da versão treinada: {path}")
    manifest = json.loads(paths["modelManifestSha256"].read_text(encoding="utf-8"))
    if tuple(manifest["labels"]) not in CATALOGS.values() or manifest["modelSha256"] != training["modelSha256"]:
        raise ValueError("Manifesto do artefato incompatível.")
    if manifest["labels"] != training.get("labels", list(LABELS)):
        raise ValueError("O catálogo do treino difere do manifesto.")
    if (manifest.get("features") != FEATURE_COUNTS.get(manifest.get("preprocess"))
            or manifest["features"] != ARCHITECTURES[training["arch"]].raw_features):
        raise ValueError("O pré-processamento difere do contrato da arquitetura.")
    return training, manifest, paths


def create_session(path, labels=LABELS, feature_count=FEATURES):
    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    options.inter_op_num_threads = 1
    start = perf_counter_ns()
    session = ort.InferenceSession(str(path), options, providers=["CPUExecutionProvider"])
    elapsed = (perf_counter_ns() - start) / 1_000_000
    inputs, outputs = session.get_inputs(), session.get_outputs()
    if len(inputs) != 1 or len(outputs) != 1 or inputs[0].name != "landmarks" or outputs[0].name != "logits":
        raise ValueError("Contrato dos nomes do ONNX incompatível.")
    if inputs[0].shape != [1, FRAMES, feature_count] or outputs[0].shape != [1, len(labels)]:
        raise ValueError("Contrato das dimensões do ONNX incompatível.")
    return session, elapsed


def run_inference(rows, model, session, threshold):
    logits_by_index = {}
    max_error = 0.0
    disagreements = 0
    durations = []
    shape = (1, FRAMES, model.raw_features)
    warmup = {"landmarks": np.zeros(shape, dtype=np.float32)}
    for _ in range(5):
        session.run(["logits"], warmup)

    for row in rows:
        if row.values is None:
            continue
        input_value = row.values.reshape(shape)
        start = perf_counter_ns()
        (output,) = session.run(["logits"], {"landmarks": input_value})
        durations.append((perf_counter_ns() - start) / 1_000_000)
        with torch.inference_mode():
            reference = model(torch.from_numpy(input_value)).numpy()
        np.testing.assert_allclose(output, reference, atol=1e-5, rtol=1e-5)
        max_error = max(max_error, float(np.max(np.abs(output - reference))))
        logits_by_index[row.index] = output[0]
        disagreements += decide(output[0], threshold)[0] != decide(reference[0], threshold)[0]
    if disagreements:
        raise AssertionError(f"{disagreements} decisões diferentes entre ONNX e PyTorch.")
    return logits_by_index, max_error, durations


def write_parity_fixture(path, rows, logits_by_index, threshold, labels=LABELS):
    selected = {}
    for row in rows:
        if row.index in logits_by_index and row.label not in selected:
            logits = logits_by_index[row.index]
            actual, confidence = decide(logits, threshold)
            selected[row.label] = {
                "clipSha256": row.checksum,
                "values": row.values.flatten().tolist(), "logits": logits.tolist(),
                "expectedLabel": labels[actual], "confidence": confidence,
            }
    write_json(path, {"tolerance": 1e-4, "samples": list(selected.values())})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--features", type=Path, default=Path("data/minds/features/index.json"))
    parser.add_argument("--run", type=Path, default=Path("data/models/isolated-v1"))
    parser.add_argument("--split", choices=("test", "val"), default="test",
                        help="Use val para avaliar um experimento sem ler vetores do teste.")
    args = parser.parse_args()
    torch.set_num_threads(1)

    training, manifest, paths = verified_inputs(args.features, args.run)
    labels = tuple(manifest["labels"])
    partitions = {"val"} if args.split == "val" else {"train", "val", "test"}
    index, rows = load_features(args.features, partitions, labels)
    selected = [row for row in rows if row.partition == args.split]
    threshold = manifest["threshold"]
    model = ARCHITECTURES[training["arch"]](len(labels)).eval()
    model.load_state_dict(torch.load(paths["checkpointSha256"], map_location="cpu", weights_only=True))
    session, model_load_ms = create_session(paths["modelSha256"], labels, manifest["features"])
    logits_by_index, max_error, durations = run_inference(selected, model, session, threshold)
    results, details = measure(selected, logits_by_index, threshold, labels)
    capture = dict(Counter(row.state for row in selected))
    negatives = dict(Counter(row.source_label for row in selected if row.label == 0))
    by_split = {
        split: {
            "clips": sum(row.partition == split for row in rows),
            "signers": sorted({row.signer for row in rows if row.partition == split}),
        }
        for split in ("train", "val", "test") if split in partitions
    }
    val = [row for row in rows if row.partition == "val"]
    validation_logits = logits_by_index
    if args.split == "test":
        validation_logits, _, _ = run_inference(val, model, session, threshold)
    write_parity_fixture(args.run / "parity-web.json", val, validation_logits, threshold, labels)
    report = "evaluation.json" if args.split == "test" else "validation-evaluation.json"
    write_json(args.run / report, {
        "evaluationSplit": args.split,
        "datasetManifestSha256": index["sourceManifestSha256"], "featuresManifestSha256": digest(args.features),
        "modelSha256": manifest["modelSha256"], "checkpointSha256": training["checkpointSha256"],
        "threshold": threshold, "onnxruntime": ort.__version__, "partitions": by_split,
        "capture": capture, "negatives": negatives, "results": results,
        "checks": checks(results), "onnxParity": {"samples": len(logits_by_index), "maxAbsLogitError": max_error,
                                                 "differencesInDecision": 0, "target": "onnxruntime-cpu"},
        "modelCpuOnly": timing(durations), "modelCpuLoadMs": model_load_ms,
        "extractionSample": timing([duration for row in selected for duration in row.extraction_ms]),
        "clips": details,
    })
    print(f"Avaliação salva em {args.run / report}")
    print(f"F1 macro={results['f1Macro']:.3f}; cobertura={results['coverage']['rate']:.3f}; "
          f"falsas aceitações={results['falseAcceptance']['rate']:.3f}")
    print(f"Paridade em {len(logits_by_index)} clipes, erro máximo {max_error:.3g}.")


if __name__ == "__main__":
    main()
