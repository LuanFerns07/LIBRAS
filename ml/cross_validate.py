"""Compara arquiteturas por pessoa dentro da partição de treino do MINDS-Libras."""

import argparse
from dataclasses import replace
from pathlib import Path

import numpy as np
import torch

from dataset import CATALOGS, add_training_negatives, add_training_positives, digest, load_features, write_json
from metrics import choose_threshold, describe, measure
from model import ARCHITECTURES
from train import SEED, collect, train


def signer_folds(signers):
    ordered = sorted(set(signers))
    if len(ordered) < 6:
        raise ValueError("A avaliação precisa de pelo menos seis pessoas no conjunto de treino.")
    groups = [ordered[index::3] for index in range(3)]
    return [(groups[(index + 2) % 3], groups[(index + 1) % 3], groups[index]) for index in range(3)]


def average_probabilities(left, right):
    if left.keys() != right.keys():
        raise ValueError("Os modelos devem decidir sobre as mesmas entradas utilizáveis.")
    combined = {}
    for index in left:
        a, b = (np.asarray(logits, dtype=np.float64) for logits in (left[index], right[index]))
        combined[index] = np.logaddexp(a - np.logaddexp.reduce(a), b - np.logaddexp.reduce(b)) - np.log(2)
    return combined


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--features", type=Path, default=Path("data/minds-expanded/features/index.json"))
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--catalogo", choices=tuple(CATALOGS), default="expandido")
    parser.add_argument("--reference", default="ConvSequence", choices=tuple(ARCHITECTURES))
    parser.add_argument("--candidate", default="ConvSequenceGeometry", choices=tuple(ARCHITECTURES))
    parser.add_argument("--candidate-negatives", type=Path,
                        help="Vetores rotulados apenas como negativos, restritos ao treino do candidato.")
    parser.add_argument("--candidate-positives", type=Path,
                        help="Quartas gravações de Espelho e Amarelo, somente para as pessoas do treino.")
    parser.add_argument("--combine", action="store_true",
                        help="Avalia também a média das probabilidades com limiar próprio de validação.")
    parser.add_argument("--device", choices=("cpu", "cuda"), default="cpu")
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--batch-size", type=int, default=12)
    parser.add_argument("--seed", type=int, default=SEED)
    args = parser.parse_args()
    if (args.candidate == args.reference and not (args.candidate_negatives or args.candidate_positives)
            or min(args.epochs, args.batch_size) <= 0):
        parser.error("Use arquiteturas distintas ou exemplos adicionais e valores positivos para épocas e lote.")
    if args.device == "cuda" and not torch.cuda.is_available():
        parser.error("CUDA não está disponível nesta instalação do PyTorch.")
    torch.set_num_threads(2)
    labels = CATALOGS[args.catalogo]
    index, rows = load_features(args.features, {"train"}, labels)
    candidate_rows = rows
    provenance = None
    positive_provenance = None
    negatives, positives = [], []
    candidate_name = args.candidate
    if args.candidate_negatives is not None:
        candidate_rows, provenance = add_training_negatives(args.candidate_negatives, index, rows, labels)
        negatives = candidate_rows[len(rows):]
        candidate_name += " + negativos complementares"
    if args.candidate_positives is not None:
        supplemented, positive_provenance = add_training_positives(args.candidate_positives, index, candidate_rows, labels)
        positives = supplemented[len(candidate_rows):]
        candidate_name += " + quartas gravações"
    folds = signer_folds(row.signer for row in rows)
    comparisons = {}
    reference_scores = []
    ensemble_folds = []
    for name, arch, outside, related in (
        (args.reference, args.reference, [], []), (candidate_name, args.candidate, negatives, positives)
    ):
        evaluations = []
        for fold_index, (training, validation, measurement) in enumerate(folds):
            development = [
                row if row.signer in training else replace(row, partition="val")
                for row in rows if row.signer in training or row.signer in validation
            ]
            holdout = [row for row in rows if row.signer in measurement]
            additional = [*outside, *(row for row in related if row.signer in training)]
            print(f"{name} · treino {training} · validação {validation} · medição {measurement}", flush=True)
            model, selected, _, _ = train([*development, *additional], args.device, args.epochs,
                                         args.batch_size, args.seed, labels, arch)
            logits = collect(model, holdout, "cpu")
            metrics, _ = measure(holdout, logits, selected["threshold"], labels)
            placement = {
                "trainSigners": training, "validationSigners": validation, "measurementSigners": measurement,
            }
            evaluations.append({
                **placement,
                "selectedEpoch": selected["epoch"], "threshold": selected["threshold"], "results": metrics,
                **({"extraTrainingClips": len(additional)} if related else {}),
            })
            if args.combine:
                calibration = [row for row in development if row.partition == "val"]
                calibration_logits = collect(model, calibration, "cpu")
                if name == args.reference:
                    reference_scores.append((calibration_logits, logits))
                else:
                    reference_calibration, reference_logits = reference_scores[fold_index]
                    calibration_scores = average_probabilities(reference_calibration, calibration_logits)
                    _, threshold, _ = choose_threshold(calibration, calibration_scores, labels)
                    combined, _ = measure(holdout, average_probabilities(reference_logits, logits), threshold, labels)
                    ensemble_folds.append({**placement, "threshold": threshold, "results": combined})
        matrix = np.sum([fold["results"]["matrix"] for fold in evaluations], axis=0)
        comparisons[name] = {"folds": evaluations, "pooled": describe(matrix, labels)}
    if args.combine:
        matrix = np.sum([fold["results"]["matrix"] for fold in ensemble_folds], axis=0)
        comparisons["média das probabilidades"] = {"folds": ensemble_folds, "pooled": describe(matrix, labels)}
    write_json(args.out, {
        "inputPartition": "train", "sourceManifestSha256": index["sourceManifestSha256"],
        "featuresManifestSha256": digest(args.features), "labels": list(labels), "seed": args.seed,
        "epochs": args.epochs, "batchSize": args.batch_size, "device": args.device, "torch": torch.__version__,
        "comparisons": comparisons, "candidateTrainingNegatives": provenance,
        **({"candidateTrainingPositives": positive_provenance} if positive_provenance is not None else {}),
    })


if __name__ == "__main__":
    main()
