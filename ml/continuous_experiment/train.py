"""Treina em CPU, seleciona pela validação e mede edição de palavras em teste."""

import argparse
import copy
import csv
import json
from pathlib import Path
import platform

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

from .eqt import SPLITS, prepare
from .metrics import Edits
from .model import SentenceRetriever, TokenGenerator


PAD, BOS, EOS, UNK = 0, 1, 2, 3


def encode_tokens(samples, vocabulary, mode):
    if mode == "retriever":
        return torch.tensor([vocabulary.get(sample.tokens, -1) for sample in samples])
    rows = [[BOS, *(vocabulary.get(word, UNK) for word in sample.tokens), EOS] for sample in samples]
    length = max(map(len, rows))
    return torch.tensor([row + [PAD] * (length - len(row)) for row in rows])


def predictions(model, loader, vocabulary, mode, maximum):
    all_predictions = []
    with torch.inference_mode():
        for features, _ in loader:
            if mode == "retriever":
                indices = model(features).argmax(dim=-1).tolist()
                all_predictions.extend(vocabulary[index] for index in indices)
                continue
            for row in model.generate(features, maximum, bos=BOS, eos=EOS).tolist():
                length = row.index(EOS) if EOS in row else len(row)
                all_predictions.append(tuple(vocabulary[token] for token in row[:length]))
    return all_predictions


def evaluate(references, guesses):
    if len(references) != len(guesses) or not references:
        raise ValueError("As referências e predições devem cobrir o mesmo conjunto não vazio.")
    edits = Edits()
    correct = 0
    for reference, prediction in zip(references, guesses):
        edits.add(reference, prediction)
        correct += reference == prediction
    return {"examples": len(references), "exact_matches": correct,
            "exact_match_rate": correct / len(references), **edits.report()}


def train(args):
    torch.manual_seed(args.seed)
    torch.set_num_threads(args.threads)
    samples, dataset_report = prepare(args.dataset, args.archive or args.dataset / "Landmarks-hands.zip")
    data = {split: [sample for sample in samples if sample.split == split] for split in SPLITS}
    if any(not rows for rows in data.values()):
        raise ValueError("As três partições precisam conter exemplos.")

    if args.mode == "retriever":
        labels = sorted({row.tokens for row in data["train"]})
        model = SentenceRetriever(len(labels))
        maximum = None
    else:
        labels = ["<pad>", "<bos>", "<eos>", "<unk>"] + sorted(
            {token for row in data["train"] for token in row.tokens},
        )
        model = TokenGenerator(len(labels))
        maximum = max(len(row.tokens) for row in data["train"]) + 2
    vocabulary = {label: index for index, label in enumerate(labels)}

    tensor = {split: torch.from_numpy(np.stack([row.values.T for row in rows])) for split, rows in data.items()}
    mean = tensor["train"].mean(dim=(0, 2), keepdim=True)
    std = tensor["train"].std(dim=(0, 2), keepdim=True).clamp_min(0.01)
    loaders = {}
    references = {}
    for split, rows in data.items():
        features = (tensor[split] - mean) / std
        targets = encode_tokens(rows, vocabulary, args.mode)
        loaders[split] = DataLoader(
            TensorDataset(features, targets), batch_size=args.batch_size, shuffle=split == "train",
        )
        references[split] = [row.tokens for row in rows]

    optimizer = torch.optim.AdamW(model.parameters(), lr=0.002)
    classification_loss = nn.CrossEntropyLoss()
    generation_loss = nn.CrossEntropyLoss(ignore_index=PAD)
    best = None
    best_state = None
    history = []
    for epoch in range(1, args.epochs + 1):
        model.train()
        for features, targets in loaders["train"]:
            optimizer.zero_grad(set_to_none=True)
            if args.mode == "retriever":
                loss = classification_loss(model(features), targets)
            else:
                logits = model(features, targets[:, :-1])
                loss = generation_loss(logits.transpose(1, 2), targets[:, 1:])
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 5.0)
            optimizer.step()

        model.eval()
        guesses = predictions(model, loaders["dev"], labels, args.mode, maximum)
        result = evaluate(references["dev"], guesses)
        history.append({"epoch": epoch, **result})
        new_key = result["error_rate"], -result["exact_match_rate"], epoch
        if best is None or new_key < best:
            best = new_key
            best_state = copy.deepcopy(model.state_dict())
        print(f"{args.mode}, época {epoch}: WER validação {result['error_rate']:.3f}; "
              f"frases exatas {result['exact_matches']}/{result['examples']}", flush=True)

    model.load_state_dict(best_state)
    model.eval()
    guesses = predictions(model, loaders["test"], labels, args.mode, maximum)
    test = evaluate(references["test"], guesses)
    training_counts = {}
    for label in references["train"]:
        training_counts[label] = training_counts.get(label, 0) + 1
    common = min(training_counts, key=lambda label: (-training_counts[label], label))
    baseline = evaluate(references["test"], [common] * len(guesses))
    args.output.mkdir(parents=True, exist_ok=True)
    report = {
        "source": "LIBRAS-EQT-UECE v4 / 10.5281/zenodo.21398895",
        "mode": args.mode,
        "task": "Portuguese words from real multiword scripted sequences",
        "unit": "Portuguese lexical token, no temporal sign annotations",
        "normalization": "NFC; case folded; letters/digits and internal hyphens/apostrophes",
        "dataset": dataset_report,
        "parameters": {
            "platform": platform.platform(),
            "torch": str(torch.__version__),
            "device": "cpu",
            "seed": args.seed,
            "epochs": args.epochs,
            "threads": args.threads,
            "batch_size": args.batch_size,
        },
        "selection": "minimum validation WER, then maximum exact-match rate, then earliest epoch",
        "selected_epoch": best[-1],
        "validation": history[best[-1] - 1],
        "validation_history": history,
        "test": test,
        "constant_training_mode_baseline_test": baseline,
    }
    (args.output / "results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n",
                                             encoding="utf-8")
    with (args.output / "partition.csv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["split", "item", "local_signer", "zip_member", "sha256", "frames"])
        writer.writerows((row.split, row.item, row.local_signer, row.source, row.digest, row.frame_count)
                         for row in samples)
    with (args.output / "predictions.jsonl").open("w", encoding="utf-8") as stream:
        for row, guess in zip(data["test"], guesses):
            stream.write(json.dumps({"sha256": row.digest, "reference": row.tokens, "prediction": guess},
                                    ensure_ascii=False) + "\n")
    torch.save({"weights": best_state, "labels": labels, "mean": mean, "std": std,
                "mode": args.mode, "maximum": maximum}, args.output / "checkpoint.pt")
    print(json.dumps(test, ensure_ascii=False), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", type=Path, help="Diretório preparado por acquire_eqt.")
    parser.add_argument("output", type=Path)
    parser.add_argument("--archive", type=Path, help="Caminho alternativo para Landmarks.zip.")
    parser.add_argument("--mode", choices=("retriever", "generator"), default="retriever")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--threads", type=int, default=4)
    parser.add_argument("--seed", type=int, default=422)
    args = parser.parse_args()
    if min(args.epochs, args.batch_size, args.threads) < 1:
        parser.error("Épocas, lotes e threads precisam ser maiores que zero.")
    train(args)


if __name__ == "__main__":
    main()
