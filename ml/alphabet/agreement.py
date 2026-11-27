"""Empacota e mede a leitura de letras quando os dois modelos concordam."""

import argparse
import json
from pathlib import Path
from shutil import copyfile

import numpy as np
import onnxruntime

from .train import checksum, reference_data, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--primary", type=Path, default=Path("data/models/alphabet-ufsm"))
    parser.add_argument("--check", type=Path, default=Path("data/models/alphabet-geometry"))
    parser.add_argument("--reference", type=Path, default=Path("data/alphabet/static-video-all.json"))
    parser.add_argument("--out", type=Path, default=Path("data/models/alphabet-live"))
    args = parser.parse_args()
    options = onnxruntime.SessionOptions()
    options.intra_op_num_threads = 1
    entries = []
    for source in (args.primary, args.check):
        info = json.loads((source / "alphabet.json").read_text())
        path = source / "alphabet.onnx"
        if checksum(path) != info["modelSha256"]:
            raise ValueError(f"Modelo divergente em {path}.")
        entries.append((info, onnxruntime.InferenceSession(str(path), options, providers=["CPUExecutionProvider"])))
    primary, check = (info for info, _ in entries)
    for key in ("version", "preprocess", "features", "labels", "threshold"):
        if primary[key] != check[key]:
            raise ValueError(f"Manifestos divergem em {key}.")
    labels = primary["labels"]
    sources = reference_data(args.reference, labels)
    metrics = {}
    for split in ("val", "test"):
        features, targets = sources[split]
        outputs = []
        for _, session in entries:
            logits, = session.run(["logits"], {"hand": features.reshape(-1, primary["features"])})
            probs = np.exp(logits - logits.max(axis=1, keepdims=True))
            probs /= probs.sum(axis=1, keepdims=True)
            outputs.append((probs.argmax(axis=1), probs.max(axis=1) >= primary["threshold"]))
        (first, first_valid), (second, second_valid) = outputs
        metrics[split] = report(labels, targets, first, first_valid & second_valid & (first == second))
        metrics[split]["perLetter"] = {
            label: [metrics[split]["matrix"][index][index], int((targets == index).sum())]
            for index, label in enumerate(labels)
        }
    args.out.mkdir(parents=True, exist_ok=True)
    copyfile(args.primary / "alphabet.onnx", args.out / "alphabet.onnx")
    copyfile(args.check / "alphabet.onnx", args.out / "alphabet-check.onnx")
    manifest = {**primary, "agreementSha256": check["modelSha256"]}
    evidence = {"manifest": manifest, "referenceSha256": checksum(args.reference), "results": metrics}
    for name, value in (("alphabet.json", manifest), ("agreement.json", evidence)):
        (args.out / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    print({split: {key: result[key] for key in ("rows", "accepted", "correct", "macroF1")}
           for split, result in metrics.items()}, flush=True)


if __name__ == "__main__":
    main()
