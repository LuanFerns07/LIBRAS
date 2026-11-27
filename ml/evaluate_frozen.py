"""Mede um ONNX congelado na partição escolhida, incluindo modelos combinados."""

import argparse
from collections import Counter
from pathlib import Path
from time import perf_counter_ns

import numpy as np
import onnxruntime as ort

from dataset import FRAMES, digest, load_features, write_json
from evaluate import timing
from metrics import checks, measure
from ml.external_eval.evaluate import load_json, verified_model


def evaluate(features_path, run, split):
    index = load_json(features_path)
    start = perf_counter_ns()
    session, model, model_manifest_hash = verified_model(run, index)
    load_ms = (perf_counter_ns() - start) / 1_000_000
    labels = tuple(model["labels"])
    _, rows = load_features(features_path, {split}, labels)

    shape = (1, FRAMES, model["features"])
    input_name = model["inputName"]
    output_name = model["outputName"]
    warmup = {input_name: np.zeros(shape, dtype=np.float32)}
    for _ in range(5):
        session.run([output_name], warmup)
    durations = []
    logits = {}
    for row in rows:
        if row.values is None:
            continue
        values = row.values.reshape(shape)
        start = perf_counter_ns()
        (prediction,) = session.run([output_name], {input_name: values})
        durations.append((perf_counter_ns() - start) / 1_000_000)
        if not np.isfinite(prediction).all():
            raise ValueError(f"Saída não finita no clipe {row.checksum}.")
        logits[row.index] = prediction[0]

    results, clips = measure(rows, logits, model["threshold"], labels)
    return {
        "evaluationSplit": split,
        "device": "CPUExecutionProvider",
        "onnxruntime": ort.__version__,
        "datasetManifestSha256": index["sourceManifestSha256"],
        "featuresManifestSha256": digest(features_path),
        "modelManifestSha256": model_manifest_hash,
        "modelSha256": model["modelSha256"],
        "threshold": model["threshold"],
        "signers": sorted({row.signer for row in rows}),
        "captureStates": dict(Counter(row.state for row in rows)),
        "results": results,
        "checks": checks(results),
        "modelCpuOnly": timing(durations),
        "modelVerifyAndLoadMs": load_ms,
        "clips": clips,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--features", type=Path, required=True)
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--split", choices=("test", "val"), default="test")
    args = parser.parse_args()
    report = evaluate(args.features, args.run, args.split)
    write_json(args.out, report)
    metrics = report["results"]
    print(f"F1 macro={metrics['f1Macro']:.3f}. Cobertura={metrics['coverage']['rate']:.3f}. "
          f"Falsas aceitações={metrics['falseAcceptance']['rate']:.3f}.")


if __name__ == "__main__":
    main()
