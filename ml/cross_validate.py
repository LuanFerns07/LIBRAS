"""Compara arquiteturas por pessoa dentro da partição de treino do MINDS-Libras."""

import argparse
from dataclasses import replace
from pathlib import Path

import numpy as np
import torch

from dataset import CATALOGS, digest, load_features, write_json
from metrics import describe, measure
from model import ARCHITECTURES
from train import SEED, collect, train


def signer_folds(signers):
    ordered = sorted(set(signers))
    if len(ordered) < 6:
        raise ValueError("A avaliação precisa de pelo menos seis pessoas no conjunto de treino.")
    groups = [ordered[index::3] for index in range(3)]
    return [(groups[(index + 2) % 3], groups[(index + 1) % 3], groups[index]) for index in range(3)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--features", type=Path, default=Path("data/minds-expanded/features/index.json"))
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--catalogo", choices=tuple(CATALOGS), default="expandido")
    parser.add_argument("--reference", default="ConvSequence", choices=tuple(ARCHITECTURES))
    parser.add_argument("--candidate", default="ConvSequenceGeometry", choices=tuple(ARCHITECTURES))
    parser.add_argument("--device", choices=("cpu", "cuda"), default="cpu")
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--batch-size", type=int, default=12)
    parser.add_argument("--seed", type=int, default=SEED)
    args = parser.parse_args()
    if args.candidate == args.reference or min(args.epochs, args.batch_size) <= 0:
        parser.error("Escolha arquiteturas distintas e valores positivos para épocas e lote.")
    if args.device == "cuda" and not torch.cuda.is_available():
        parser.error("CUDA não está disponível nesta instalação do PyTorch.")
    torch.set_num_threads(2)
    labels = CATALOGS[args.catalogo]
    index, rows = load_features(args.features, {"train"}, labels)
    folds = signer_folds(row.signer for row in rows)
    comparisons = {}
    for arch in (args.reference, args.candidate):
        evaluations = []
        for training, validation, measurement in folds:
            development = [
                row if row.signer in training else replace(row, partition="val")
                for row in rows if row.signer in training or row.signer in validation
            ]
            holdout = [row for row in rows if row.signer in measurement]
            print(f"{arch} · treino {training} · validação {validation} · medição {measurement}", flush=True)
            model, selected, _, _ = train(development, args.device, args.epochs, args.batch_size, args.seed, labels, arch)
            metrics, _ = measure(holdout, collect(model, holdout, "cpu"), selected["threshold"], labels)
            evaluations.append({
                "trainSigners": training, "validationSigners": validation, "measurementSigners": measurement,
                "selectedEpoch": selected["epoch"], "threshold": selected["threshold"], "results": metrics,
            })
        matrix = np.sum([fold["results"]["matrix"] for fold in evaluations], axis=0)
        comparisons[arch] = {"folds": evaluations, "pooled": describe(matrix, labels)}
    write_json(args.out, {
        "inputPartition": "train", "sourceManifestSha256": index["sourceManifestSha256"],
        "featuresManifestSha256": digest(args.features), "labels": list(labels), "seed": args.seed,
        "epochs": args.epochs, "batchSize": args.batch_size, "device": args.device, "torch": torch.__version__,
        "comparisons": comparisons,
    })


if __name__ == "__main__":
    main()
