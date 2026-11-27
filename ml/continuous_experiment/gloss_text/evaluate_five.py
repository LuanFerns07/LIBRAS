"""Mede a preservação de Cinco no decodificador usado pelo navegador."""

import argparse
import json
from pathlib import Path
import subprocess

from ..train import evaluate
from .benchmark import verified_previous
from .corpus import CSV, checksum, read_pairs, write_json
from .holdout import eligible_by_split, reserve


DECODE = """
import { readFileSync } from 'node:fs'
import { createGlossTranslator } from './src/recognition/gloss-text.js'
import { recognitionCatalog } from './src/catalog.js'

const artifact = JSON.parse(readFileSync(process.argv[1]))
const baseline = createGlossTranslator(artifact)
const candidate = createGlossTranslator(artifact, { preserveFive: true })
const inputs = JSON.parse(readFileSync(0, 'utf8'))
const results = glosses => [baseline(glosses), candidate(glosses)]
const vocabulary = recognitionCatalog.map(({ text }) => text)
const catalog = vocabulary.flatMap(a => [
  [a],
  ...vocabulary.flatMap(b => [[a, b], ...vocabulary.map(c => [a, b, c])]),
])
console.log(JSON.stringify({
  rows: inputs.map(results),
  catalog: catalog.map(glosses => [glosses, ...results(glosses)]),
}))
"""


def five_count(tokens):
    return sum(token in {"5", "cinco"} for token in tokens)


def count_differences(sources, outputs):
    differences = [five_count(output) - five_count(source) for source, output in zip(sources, outputs, strict=True)]
    return {
        "missing_five": sum(-value for value in differences if value < 0),
        "added_five": sum(value for value in differences if value > 0),
        "changed_count": sum(value != 0 for value in differences),
    }


def measure(rows, predictions):
    actual = [row.gloss for row in rows]
    references = [row.portuguese for row in rows]
    return {
        **evaluate(references, predictions),
        "compared_to_glosses": count_differences(actual, predictions),
        "compared_to_reference": count_differences(references, predictions),
    }


def compare(source, heldout):
    previous = verified_previous(source)
    pairs = list(read_pairs(source / CSV))
    manifest_path = heldout / "split.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest != reserve(pairs, previous):
        raise ValueError("A partição difere do recorte reservado.")
    artifact = heldout / "monotone-web.json"
    exported = json.loads((heldout / "monotone-web.manifest.json").read_text(encoding="utf-8"))
    model_sha = checksum(artifact)
    if model_sha != exported["sha256"] or checksum(manifest_path) != exported["source"]["splitSha256"]:
        raise ValueError("Use o tradutor monotônico exportado para a partição reservada.")
    eligible, _, _, _ = eligible_by_split(pairs, previous)
    by_id = {pair.row: pair for pair in pairs}
    groups = {}
    for split, candidates in eligible.items():
        groups[f"{split}_sampled"] = manifest["rows"][split]
        numeric = sorted(row for _, row in candidates
                         if five_count(by_id[row].gloss) or five_count(by_id[row].portuguese))
        groups[f"{split}_five"] = numeric
        groups[f"{split}_five_count_agrees"] = [
            row for row in numeric if 0 < five_count(by_id[row].gloss) == five_count(by_id[row].portuguese)
        ]
    selected = sorted({row for rows in groups.values() for row in rows})
    result = subprocess.run(
        ["node", "--input-type=module", "-e", DECODE, str(artifact)],
        input=json.dumps([by_id[row].gloss for row in selected]),
        capture_output=True, text=True, check=True,
    )
    predictions = json.loads(result.stdout)
    by_prediction = dict(zip(selected, predictions["rows"], strict=True))
    measures = {
        key: {
            variant: measure([by_id[row] for row in rows], [tuple(by_prediction[row][index]) for row in rows])
            for index, variant in enumerate(("monotone", "preserve_five"))
        }
        for key, rows in groups.items() if rows
    }
    catalog, baseline, guarded = zip(*predictions["catalog"], strict=True)
    return {
        "protocol": manifest["protocol"],
        "split_sha256": checksum(manifest_path),
        "monotone_sha256": model_sha,
        "groups": measures,
        "catalog_controls": {
            "sequences": len(catalog),
            "monotone": count_differences(catalog, baseline),
            "preserve_five": count_differences(catalog, guarded),
            "cinco_espelho": next([old, new] for signs, old, new in predictions["catalog"]
                                  if signs == ["cinco", "espelho"]),
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("heldout", type=Path)
    parser.add_argument("report", type=Path)
    args = parser.parse_args()
    report = compare(args.source, args.heldout)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    write_json(args.report, report)
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
