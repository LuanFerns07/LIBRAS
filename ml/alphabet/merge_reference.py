"""Une referências estáticas extraídas e registra a partição de cada gravação."""

import argparse
import json
from pathlib import Path


def merge(base, extra, train_sources):
    if base["landmarkerSha256"] != extra["landmarkerSha256"]:
        raise ValueError("Use a mesma versão do extrator para todas as gravações.")
    base_ids = {clip["source"] for clip in base["samples"]}
    extra_ids = {clip["source"] for clip in extra["samples"]}
    if base_ids & extra_ids or not train_sources <= extra_ids:
        raise ValueError("As fontes extras devem ser distintas e incluir as fontes pedidas para treino.")
    if any(clip["split"] != "test" for clip in extra["samples"]):
        raise ValueError("As gravações extras precisam estar reservadas antes de escolher o treino.")
    return {
        **base,
        "samples": [*base["samples"], *(
            {**clip, "split": "train" if clip["source"] in train_sources else "test"}
            for clip in extra["samples"]
        )],
        "sourceManifests": [base["manifestSha256"], extra["manifestSha256"]],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("extra", type=Path)
    parser.add_argument("--train-source", action="append", default=[], required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    result = merge(json.loads(args.base.read_text()), json.loads(args.extra.read_text()), set(args.train_source))
    args.out.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
