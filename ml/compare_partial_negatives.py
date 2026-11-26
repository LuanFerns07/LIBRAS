"""Mede a rejeição em recortes fora do catálogo sem misturar pessoas ou gravações."""

import argparse
from collections import Counter
from dataclasses import replace
from pathlib import Path

import numpy as np
import torch

from cross_validate import signer_folds
from dataset import CATALOGS, digest, load_features, write_json
from metrics import decide, describe, measure
from model import ARCHITECTURES
from partial_negatives import WINDOWS, load_partial_negatives
from train import SEED, collect, train


def fragment_results(pairs, logits, threshold):
    accepted = {
        parent: {position: decide(logits.get(clip.index), threshold)[0] != 0 for position, clip in pair.items()}
        for parent, pair in pairs.items()
    }
    return {
        "parentsWithAnyFalseAcceptance": sum(any(result.values()) for result in accepted.values()),
        "parents": len(pairs),
        "byPosition": {
            position: {
                "falseAcceptances": sum(result[position] for result in accepted.values()),
                "captureStates": dict(Counter(pair[position].state for pair in pairs.values())),
            } for position in WINDOWS
        },
    }


def process(rows, variants, device, arch, epochs, batch_size, seed, labels, use_fragments):
    evaluations = []
    for training, validation, measurement in signer_folds(row.signer for row in rows):
        development = [
            replace(row, partition="val") if row.signer in validation else row
            for row in rows if row.signer in training or row.signer in validation
        ]
        substitutions = {row.index: variants[row.index] for row in development if row.partition == "train"
                         and row.index in variants} if use_fragments else None
        holdout = [row for row in rows if row.signer in measurement]
        fragments = {row.index: variants[row.index] for row in holdout if row.index in variants}
        print(f"recortes no treino={use_fragments} · treino {training} · validação {validation} · medição {measurement}",
              flush=True)
        model, selection, _, _ = train(development, device, epochs, batch_size, seed, labels, arch, substitutions)
        threshold = selection["threshold"]
        full, _ = measure(holdout, collect(model, holdout, "cpu"), threshold, labels)
        logits = collect(model, [clip for pair in fragments.values() for clip in pair.values()], "cpu")
        evaluations.append({
            "trainingSigners": training, "validationSigners": validation, "measurementSigners": measurement,
            "selectedEpoch": selection["epoch"], "threshold": threshold,
            "full": full, "partialNegatives": fragment_results(fragments, logits, threshold),
        })
    matrix = np.sum([row["full"]["matrix"] for row in evaluations], axis=0)
    partial = [row["partialNegatives"] for row in evaluations]
    return {"folds": evaluations, "pooled": {
        "full": describe(matrix, labels),
        "partialNegatives": {
            "parentsWithAnyFalseAcceptance": sum(row["parentsWithAnyFalseAcceptance"] for row in partial),
            "parents": sum(row["parents"] for row in partial),
            "falseAcceptancesByPosition": {
                position: sum(row["byPosition"][position]["falseAcceptances"] for row in partial)
                for position in WINDOWS
            },
        },
    }}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--features", type=Path, default=Path("data/minds-expanded/features/index.json"))
    parser.add_argument("--partial-negatives", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--device", choices=("cpu", "cuda"), default="cpu")
    parser.add_argument("--arch", choices=tuple(ARCHITECTURES), default="ConvSequenceGeometry")
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--batch-size", type=int, default=12)
    parser.add_argument("--seed", type=int, default=SEED)
    args = parser.parse_args()
    if args.device == "cuda" and not torch.cuda.is_available():
        parser.error("CUDA não está disponível.")
    if min(args.epochs, args.batch_size) <= 0:
        parser.error("Use épocas e lote positivos.")
    torch.set_num_threads(2)
    labels = CATALOGS["expandido"]
    index, rows = load_features(args.features, {"train"}, labels)
    variants, provenance = load_partial_negatives(args.partial_negatives, index, rows, labels)
    comparisons = {
        name: process(rows, variants, args.device, args.arch, args.epochs, args.batch_size, args.seed, labels, enabled)
        for name, enabled in (("fullOnly", False), ("negativeVariants", True))
    }
    write_json(args.out, {
        "architecture": args.arch, "seed": args.seed, "epochs": args.epochs, "batchSize": args.batch_size,
        "device": args.device, "torch": torch.__version__, "inputPartition": "train",
        "featuresManifestSha256": digest(args.features), "partialNegatives": provenance, "comparisons": comparisons,
    })


if __name__ == "__main__":
    main()
