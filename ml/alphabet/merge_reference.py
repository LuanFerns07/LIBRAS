"""Une referências estáticas extraídas e registra a partição de cada gravação."""

import argparse
from collections import defaultdict
import json
from pathlib import Path


def merge(base, additions, train_sources):
    if any(base["landmarkerSha256"] != extra["landmarkerSha256"] for extra in additions):
        raise ValueError("Use a mesma versão do extrator para todas as gravações.")
    base_ids = {clip["source"] for clip in base["samples"]}
    extra_clips = [clip for extra in additions for clip in extra["samples"]]
    extra_ids = {clip["source"] for clip in extra_clips}
    if base_ids & extra_ids or not train_sources <= extra_ids:
        raise ValueError("As fontes extras devem ser distintas e incluir as fontes pedidas para treino.")
    by_source = defaultdict(list)
    for clip in extra_clips:
        split = "train" if clip["source"] in train_sources else "test"
        if clip["split"] not in ("test", split):
            raise ValueError(f"Partição incompatível para a gravação {clip['source']}.")
        by_source[clip["source"]].append((clip["startMs"], clip["endMs"]))
    for source, windows in by_source.items():
        ordered = sorted(windows)
        if any(current[0] < previous[1] for previous, current in zip(ordered, ordered[1:])):
            raise ValueError(f"Janelas sobrepostas para a gravação {source}.")
    return {
        **base,
        "samples": [*base["samples"], *(
            {**clip, "split": "train" if clip["source"] in train_sources else "test"}
            for clip in extra_clips
        )],
        "sourceManifests": [base["manifestSha256"], *(extra["manifestSha256"] for extra in additions)],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("extras", type=Path, nargs="+")
    parser.add_argument("--train-source", action="append", default=[], required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    result = merge(json.loads(args.base.read_text()), [json.loads(path.read_text()) for path in args.extras],
                   set(args.train_source))
    args.out.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
