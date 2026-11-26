"""Exporta as contagens do tradutor monotônico congelado para o navegador."""

import argparse
from dataclasses import asdict
import json
from pathlib import Path
from tempfile import TemporaryDirectory

from .corpus import CSV, SHA256, SPLIT_LIMITS, checksum, read_pairs
from .holdout import PREVIOUS_SHA, PROTOCOL
from .monotone import BEAM, END, MAX_PHRASE, SETTINGS, START, MonotoneTranslator


SCHEMA = "vlibrasbd-monotone-v1"
VALIDATION_SHA = "1d642aa20a6427cc93b16ce154f674e994cfe4efd76be9d86aa82077a40a40ee"
CORPUS = {
    "title": "pt-br2libras-gloss",
    "authors": ["Manuella Lima", "Daniel França", "Diego Silva", "Dilainne Albuquerque",
                "Daniel Lacerda", "Rostand Costa", "Guido Souza Filho", "Tiago Araújo"],
    "doi": "10.17632/ryj88ckjww.2",
    "url": "https://data.mendeley.com/datasets/ryj88ckjww/2",
    "license": "CC-BY-SA-4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "changes": "Contagens de alinhamentos e n-gramas sobre os pares do treino com palavras normalizadas.",
}


def key(tokens):
    return tokens if isinstance(tokens, str) else " ".join(tokens)


def count_table(table):
    # Counter.most_common mantém a ordem da primeira ocorrência nos empates.
    return {
        key(context): [counts.total(), [[key(output), count] for output, count in counts.most_common()]]
        for context, counts in table.items()
    }


def artifact(translator, settings, provenance):
    return {
        "schema": SCHEMA,
        "source": provenance,
        "parameters": asdict(settings),
        "beam": BEAM,
        "maxPhrase": MAX_PHRASE,
        "start": START,
        "end": END,
        "caseFolding": {char: char.casefold() for char in map(chr, range(0x110000))
                        if char.casefold() != char.lower()},
        "tables": {
            "phrases": count_table(translator.phrases),
            "left": count_table(translator.left_context),
            "right": count_table(translator.right_context),
            "words": dict(translator.words),
            "totalWords": translator.total_words,
            "bigrams": count_table(translator.bigrams),
            "trigrams": count_table(translator.trigrams),
        },
    }


def frozen_selection(directory):
    validation_path = directory / "validation.json"
    if checksum(validation_path) != VALIDATION_SHA:
        raise ValueError("A validação difere da seleção congelada do VLibrasBD.")
    validation = json.loads(validation_path.read_bytes())
    split_path = directory / "split.json"
    split_sha = checksum(split_path)
    if split_sha != validation["manifest_sha256"]:
        raise ValueError("A partição difere do manifesto usado na seleção.")
    split = json.loads(split_path.read_bytes())
    selected = validation["selected"]
    if (validation["protocol"] != PROTOCOL or split["protocol"] != PROTOCOL
            or split["csv_sha256"] != SHA256 or split["previous_manifest_sha256"] != PREVIOUS_SHA
            or type(selected) is not int or not 0 <= selected < len(SETTINGS)
            or validation["candidates"][selected]["parameters"] != asdict(SETTINGS[selected])):
        raise ValueError("A configuração difere do tradutor monotônico congelado.")
    train_rows = set(split["rows"]["train"])
    if len(split["rows"]["train"]) != len(train_rows) or len(train_rows) != SPLIT_LIMITS["train"]:
        raise ValueError("A partição de treino não contém os 14.000 pares esperados.")
    return train_rows, split_sha, selected


def export(source, directory):
    train_rows, split_sha, selected = frozen_selection(directory)
    training_pairs = list(read_pairs(source / CSV, train_rows))
    if len(training_pairs) != len(train_rows):
        raise ValueError("Pares de treino ausentes no CSV oficial.")
    provenance = {
        "corpus": CORPUS,
        "protocol": PROTOCOL,
        "csvSha256": SHA256,
        "splitSha256": split_sha,
        "validationSha256": VALIDATION_SHA,
        "pythonSha256": checksum(Path(__file__).with_name("monotone.py")),
        "trainPairs": len(training_pairs),
        "selected": selected,
    }
    model_path = directory / "monotone-web.json"
    manifest_path = directory / "monotone-web.manifest.json"
    model = artifact(MonotoneTranslator(training_pairs), SETTINGS[selected], provenance)
    with TemporaryDirectory(dir=directory) as temporary:
        pending_model = Path(temporary) / model_path.name
        pending_manifest = Path(temporary) / manifest_path.name
        with pending_model.open("w", encoding="utf-8") as stream:
            json.dump(model, stream, ensure_ascii=False, separators=(",", ":"))
            stream.write("\n")
        manifest = {
            "schema": SCHEMA,
            "artifact": model_path.name,
            "sha256": checksum(pending_model),
            "bytes": pending_model.stat().st_size,
            "parameters": model["parameters"],
            "source": provenance,
        }
        pending_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        pending_model.replace(model_path)
        pending_manifest.replace(manifest_path)
    print(f"{model_path} ({manifest['bytes']} bytes, SHA-256 {manifest['sha256']})")
    print(manifest_path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    export(args.source, args.directory)


if __name__ == "__main__":
    main()
