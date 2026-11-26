"""Verifica o CSV oficial e fixa um recorte sem frases repetidas entre partições."""

import argparse
import csv
from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
import re
from shutil import copyfileobj
from tempfile import TemporaryDirectory
import unicodedata
from urllib.request import Request, urlopen

from ..eqt import words


URL = ("https://data.mendeley.com/public-files/datasets/ryj88ckjww/"
       "files/69d3709a-e238-406b-9aba-04fe15410a01/file_downloaded")
SHA256 = "de0f1ddf8368b7f343b07c00e5f122ac46193d1aea2c36b642e0805c5c73fcbf"
CSV = "pt_br2libras_gloss.csv"
MAX_WORDS = 12
SPLIT_LIMITS = {"train": 14_000, "dev": 1200, "test": 1800}
SPLIT_SEED = "vlibrasbd-v2-gloss-pt-01"
GLOSS_PUNCTUATION = re.compile(r"\[(?:PONTO|INTERROGAÇÃO|EXCLAMAÇÃO)\]", re.IGNORECASE)
KEY_WORDS = re.compile(r"[^\W_]+", re.UNICODE)


@dataclass(frozen=True)
class Pair:
    row: int
    gloss: tuple[str, ...]
    portuguese: tuple[str, ...]


def checksum(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def check_csv(path):
    if checksum(path) != SHA256:
        raise ValueError("O SHA-256 do CSV difere do arquivo oficial VLibrasBD v2.")


def acquire(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        check_csv(path)
        return
    request = Request(URL, headers={"User-Agent": "LibrasIA/1.0 (public dataset reproduction)"})
    with TemporaryDirectory(dir=path.parent) as directory:
        temporary = Path(directory) / path.name
        with urlopen(request, timeout=45) as response, temporary.open("wb") as pending:
            copyfileobj(response, pending)
        check_csv(temporary)
        temporary.replace(path)


def read_pairs(path, selected=None):
    check_csv(path)
    with path.open(encoding="utf-8-sig", newline="") as stream:
        for row_id, row in enumerate(csv.DictReader(stream), 1):
            if selected is None or row_id in selected:
                gloss = tuple(words(GLOSS_PUNCTUATION.sub(" ", row["libras-gloss"])))
                portuguese = tuple(words(row["pt-br"]))
                yield Pair(row_id, gloss, portuguese)


def sentence_key(tokens):
    text = unicodedata.normalize("NFKD", " ".join(tokens))
    text = "".join(char for char in text if not unicodedata.combining(char))
    return tuple(KEY_WORDS.findall(text))


def split_key(purpose, number):
    return hashlib.sha256(f"{SPLIT_SEED}/{purpose}/{number}".encode()).hexdigest()


def partition(pairs):
    # Frases iguais estão no mesmo componente, mesmo em lados distintos ou via uma terceira linha.
    roots = list(range(len(pairs)))
    first_seen = {}
    keys = []

    def find(index):
        while index != roots[index]:
            roots[index] = roots[roots[index]]
            index = roots[index]
        return index

    for index, pair in enumerate(pairs):
        endpoints = sentence_key(pair.gloss), sentence_key(pair.portuguese)
        keys.append(endpoints)
        for key in endpoints:
            if key:
                previous = first_seen.setdefault(key, index)
                left, right = sorted((find(index), find(previous)))
                roots[right] = left

    candidates = {split: [] for split in SPLIT_LIMITS}
    seen = set()
    duplicates = 0
    out_of_length = 0
    for index, (pair, endpoints) in enumerate(zip(pairs, keys)):
        if not (1 <= len(pair.gloss) <= MAX_WORDS and 1 <= len(pair.portuguese) <= MAX_WORDS):
            out_of_length += 1
            continue
        if endpoints in seen:
            duplicates += 1
            continue
        seen.add(endpoints)
        root_row = pairs[find(index)].row
        bucket = int(split_key("component", root_row)[:16], 16) % 100
        split = "train" if bucket < 80 else "dev" if bucket < 90 else "test"
        candidates[split].append((split_key("sample", pair.row), index))

    result = {}
    used = set()
    for split, limit in SPLIT_LIMITS.items():
        indices = [index for _, index in sorted(candidates[split])[:limit]]
        local = {key for index in indices for key in keys[index]}
        if not indices or used & local:
            raise ValueError("Partição vazia ou frase normalizada compartilhada entre partições.")
        used.update(local)
        result[split] = sorted(pairs[index].row for index in indices)
    return {
        "csv_sha256": SHA256,
        "protocol": SPLIT_SEED,
        "maximum_words": MAX_WORDS,
        "source_rows": len(pairs),
        "duplicate_pairs_in_length_range": duplicates,
        "outside_length_range": out_of_length,
        "available": {split: len(values) for split, values in candidates.items()},
        "rows": result,
    }


def write_json(path, payload):
    with TemporaryDirectory(dir=path.parent) as directory:
        temporary = Path(directory) / path.name
        temporary.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        path.hardlink_to(temporary)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    path = args.directory / CSV
    acquire(path)
    manifest = partition(list(read_pairs(path)))
    destination = args.directory / "split.json"
    write_json(destination, manifest)
    print({split: len(rows) for split, rows in manifest["rows"].items()})


if __name__ == "__main__":
    main()
