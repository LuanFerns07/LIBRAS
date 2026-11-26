"""Compara a tradução textual em componentes inéditos do VLibrasBD v2."""

import argparse
from dataclasses import asdict
import json
from pathlib import Path

import torch

from ..train import evaluate
from .corpus import CSV, SHA256, checksum, read_pairs, write_json
from .holdout import PREVIOUS_SHA, PROTOCOL, reserve
from .model import GlossGenerator, Vocabulary
from .monotone import SETTINGS, MonotoneTranslator
from .run import load_split, predict

GENERATOR_SHA = "e771d65fafd761f3f9c5dba415eae93dc27ee2d1d31794fd26f24a384f1e83fa"


def verified_previous(directory):
    path = directory / "split.json"
    if checksum(path) != PREVIOUS_SHA:
        raise ValueError("Use a partição anterior exata do VLibrasBD v2.")
    return json.loads(path.read_text(encoding="utf-8"))


def prepare(source, output):
    previous = verified_previous(source)
    pairs = list(read_pairs(source / CSV))
    manifest = reserve(pairs, previous)
    output.mkdir(parents=True, exist_ok=True)
    write_json(output / "split.json", manifest)
    print({split: len(rows) for split, rows in manifest["rows"].items()})


def verified_manifest(source, output):
    previous = verified_previous(source)
    path = output / "split.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    expected = reserve(list(read_pairs(source / CSV)), previous)
    if manifest != expected:
        raise ValueError("O manifesto difere da partição reproduzida a partir do CSV oficial.")
    return manifest, checksum(path)


def frozen(source):
    checkpoint = source / "model.pt"
    record = json.loads((source / "validation.json").read_text(encoding="utf-8"))
    if (checksum(checkpoint) != GENERATOR_SHA or record["checkpoint_sha256"] != GENERATOR_SHA
            or record["manifest_sha256"] != PREVIOUS_SHA):
        raise ValueError("Use os pesos congelados do gerador anterior.")
    saved = torch.load(checkpoint, map_location="cpu", weights_only=True)
    if saved["manifest_sha256"] != PREVIOUS_SHA or saved["epoch"] != record["checkpoint_epoch"]:
        raise ValueError("A época do gerador congelado difere do registro anterior.")
    vocabulary = Vocabulary(saved["source"], saved["target"])
    model = GlossGenerator(vocabulary)
    model.load_state_dict(saved["weights"])
    return model.eval(), vocabulary


def measure_monotone(translator, rows, references, setting):
    return evaluate(references, [translator.translate(row.gloss, setting) for row in rows])


def validate(source, output):
    result_file = output / "validation.json"
    if result_file.exists():
        raise FileExistsError("Este diretório já contém a seleção da validação.")
    manifest, manifest_sha = verified_manifest(source, output)
    translator = MonotoneTranslator(load_split(source, manifest, "train"))
    validation = load_split(source, manifest, "dev")
    references = [row.portuguese for row in validation]
    options = [measure_monotone(translator, validation, references, setting) for setting in SETTINGS]
    best = min(range(len(options)), key=lambda index: (
        options[index]["error_rate"], -options[index]["exact_match_rate"], index,
    ))
    baseline = evaluate(references, [row.gloss for row in validation])
    write_json(result_file, {
        "protocol": PROTOCOL, "manifest_sha256": manifest_sha, "selected": best,
        "copy_glosses": baseline,
        "candidates": [{"parameters": asdict(setting), **metrics} for setting, metrics in zip(SETTINGS, options, strict=True)],
    })
    print("Configuração selecionada na validação", best, options[best])


def score(source, output):
    result_file = output / "test.json"
    if result_file.exists():
        raise FileExistsError("O teste já foi medido neste diretório.")
    manifest, manifest_sha = verified_manifest(source, output)
    record = json.loads((output / "validation.json").read_text(encoding="utf-8"))
    best = record["selected"]
    if (record["protocol"] != PROTOCOL or record["manifest_sha256"] != manifest_sha
            or type(best) is not int or not 0 <= best < len(SETTINGS)
            or record["candidates"][best]["parameters"] != asdict(SETTINGS[best])):
        raise ValueError("A seleção precisa corresponder à validação e ao manifesto.")
    translator = MonotoneTranslator(load_split(source, manifest, "train"))
    model, vocabulary = frozen(source)
    test = load_split(source, manifest, "test")
    references = [row.portuguese for row in test]
    result = {
        "protocol": PROTOCOL,
        "csv_sha256": SHA256,
        "manifest_sha256": manifest_sha,
        "validation_sha256": checksum(output / "validation.json"),
        "frozen_generator_sha256": GENERATOR_SHA,
        "monotone_parameters": asdict(SETTINGS[best]),
        "copy_glosses": evaluate(references, [row.gloss for row in test]),
        "frozen_generator": evaluate(references, predict(model, vocabulary, test)),
        "monotone": measure_monotone(translator, test, references, SETTINGS[best]),
    }
    write_json(result_file, result)
    print(json.dumps(result, indent=2, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    operations = {"prepare": prepare, "validate": validate, "score": score}
    parser.add_argument("command", choices=operations)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    torch.set_num_threads(2)
    torch.set_num_interop_threads(1)
    operations[args.command](args.source, args.output)


if __name__ == "__main__":
    main()
