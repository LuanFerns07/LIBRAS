"""Treina o gerador textual em CPU e mede o teste em uma etapa separada."""

import argparse
import copy
import json
from pathlib import Path
import platform
import random
from time import perf_counter

import torch
from torch import nn

from ..train import evaluate
from .corpus import CSV, MAX_WORDS, SHA256, SPLIT_SEED, checksum, read_pairs, write_json
from .model import EOS, GlossGenerator, Vocabulary, batches


EPOCHS = 6
SEED = 20261126
BATCH = 128


def load_split(directory, manifest, name):
    selected = set(manifest["rows"][name])
    pairs = list(read_pairs(directory / CSV, selected))
    if len(pairs) != len(selected) or not pairs:
        raise ValueError(f"Recorte inconsistente: {name}.")
    return pairs


@torch.inference_mode()
def predict(model, vocabulary, pairs):
    results = []
    for source, copies, rare in batches(pairs, vocabulary, BATCH, references=False):
        for output, extra in zip(model.generate(source, copies, MAX_WORDS + 1), rare):
            words = vocabulary.target + extra
            length = output.index(EOS) if EOS in output else len(output)
            results.append(tuple(words[index] for index in output[:length]))
    return results


def fit(directory, manifest, manifest_sha):
    start = perf_counter()
    checkpoint = directory / "model.pt"
    summary = directory / "validation.json"
    if checkpoint.exists() or summary.exists():
        raise FileExistsError("Já há treino neste diretório.")
    training = load_split(directory, manifest, "train")
    validation = load_split(directory, manifest, "dev")
    references = [pair.portuguese for pair in validation]
    vocabulary = Vocabulary.fit(training)
    model = GlossGenerator(vocabulary)
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.004)
    randomizer = random.Random(SEED)
    history = []
    best_key = None
    best_weights = None
    best_epoch = None
    for epoch in range(1, EPOCHS + 1):
        model.train()
        randomizer.shuffle(training)
        train_loss = 0
        for source, copies, previous, expected in batches(training, vocabulary, BATCH, references=True):
            optimizer.zero_grad(set_to_none=True)
            loss = model.loss(source, copies, previous, expected)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 5.0)
            optimizer.step()
            train_loss += loss.item() * len(source)
        model.eval()
        result = evaluate(references, predict(model, vocabulary, validation))
        history.append({"epoch": epoch, "train_loss": train_loss / len(training), **result})
        key = result["error_rate"], -result["exact_match_rate"], epoch
        if best_key is None or key < best_key:
            best_key = key
            best_epoch = epoch
            best_weights = copy.deepcopy(model.state_dict())
        print(f"época {epoch} validação WER={result['error_rate']:.4f}", flush=True)

    baseline = evaluate(references, [pair.gloss for pair in validation])
    with checkpoint.open("xb") as stream:
        torch.save({
            "manifest_sha256": manifest_sha,
            "source": list(vocabulary.source),
            "target": list(vocabulary.target),
            "weights": best_weights,
            "epoch": best_epoch,
        }, stream)
    write_json(summary, {
        "manifest_sha256": manifest_sha,
        "checkpoint_sha256": checksum(checkpoint),
        "elapsed_seconds": perf_counter() - start,
        "pytorch": str(torch.__version__),
        "python": platform.python_version(),
        "seed": SEED,
        "torch_threads": torch.get_num_threads(),
        "checkpoint_epoch": best_epoch,
        "source_vocab": len(vocabulary.source),
        "target_vocab": len(vocabulary.target),
        "baseline": baseline,
        "history": history,
    })


def score(directory, manifest, manifest_sha):
    output = directory / "test.json"
    if output.exists():
        raise FileExistsError("O teste deste ensaio já foi medido.")
    checkpoint = directory / "model.pt"
    validation = json.loads((directory / "validation.json").read_text())
    checkpoint_sha = checksum(checkpoint)
    if (validation["manifest_sha256"] != manifest_sha
            or validation["checkpoint_sha256"] != checkpoint_sha):
        raise ValueError("A partição ou os pesos diferem do registro de validação.")
    trained = torch.load(checkpoint, map_location="cpu", weights_only=True)
    if trained["manifest_sha256"] != manifest_sha or trained["epoch"] != validation["checkpoint_epoch"]:
        raise ValueError("Os pesos precisam corresponder ao recorte e à época selecionada.")
    vocabulary = Vocabulary(trained["source"], trained["target"])
    model = GlossGenerator(vocabulary)
    model.load_state_dict(trained["weights"])
    model.eval()
    pairs = load_split(directory, manifest, "test")
    references = [pair.portuguese for pair in pairs]
    result = {
        "manifest_sha256": manifest_sha,
        "checkpoint_sha256": checkpoint_sha,
        "checkpoint_epoch": trained["epoch"],
        "copy_glosses": evaluate(references, [pair.gloss for pair in pairs]),
        "generator": evaluate(references, predict(model, vocabulary, pairs)),
    }
    write_json(output, result)
    print(json.dumps(result, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("fit", "score"))
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    torch.manual_seed(SEED)
    torch.set_num_threads(2)
    torch.set_num_interop_threads(1)
    manifest_file = args.directory / "split.json"
    manifest_sha = checksum(manifest_file)
    manifest = json.loads(manifest_file.read_text())
    if manifest["protocol"] != SPLIT_SEED or manifest["csv_sha256"] != SHA256:
        raise ValueError("O manifesto precisa corresponder ao protocolo e CSV da versão v2.")
    operation = fit if args.command == "fit" else score
    operation(args.directory, manifest, manifest_sha)


if __name__ == "__main__":
    main()
