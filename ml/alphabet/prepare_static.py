"""Prepara o recorte exploratório de poses estáticas do LibraSign v1."""

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZipFile

import numpy as np


SOURCE = "https://www.kaggle.com/datasets/heitorccf/librasign/versions/1"
SOURCE_SHA256 = "f1ca1f53d47bbba99b64c6f5815f740a200b354a6ddf7f939f6b78655313b8dd"
LABELS = "ABCDEFGILMNOPQRSTUVW"
ROW_COUNT = 1000
BLOCK_SIZE = 25
SPLITS = {"train": (0, 700), "val": (725, 850), "test": (875, 1000)}


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def samples(archive):
    with ZipFile(archive) as source:
        for label in LABELS:
            with source.open(f"landmarks/{label}.csv") as stream:
                raw = np.loadtxt(stream, delimiter=",", dtype=np.float32)
            if raw.shape != (ROW_COUNT, 63) or not np.isfinite(raw).all():
                raise ValueError(f"CSV inválido para a letra {label}.")
            points = raw.reshape(ROW_COUNT, 21, 3)
            # A captura aplica cv2.flip antes do MediaPipe. Reverta x para a imagem sem espelho.
            points[..., 0] = 1 - points[..., 0]
            points[points == 0] = 0
            for split, (start, stop) in SPLITS.items():
                for index in range(start, stop):
                    yield label, index, split, points[index]


def atomic_write(path, write):
    with NamedTemporaryFile(dir=path.parent, delete=False) as stream:
        temporary = Path(stream.name)
        try:
            write(stream)
            stream.flush()
            temporary.replace(path)
        finally:
            temporary.unlink(missing_ok=True)


def prepare(archive, output):
    source_sha256 = digest(archive)
    if source_sha256 != SOURCE_SHA256:
        raise ValueError("O SHA-256 do ZIP diverge do LibraSign v1 registrado.")
    by_points = {}
    conflicts = set()
    duplicate_count = 0
    for label, index, split, points in samples(archive):
        key = points.tobytes()
        if key in by_points:
            duplicate_count += 1
            if by_points[key][0] != label:
                conflicts.add(key)
        else:
            by_points[key] = label, index, split, points
    records = [row for key, row in by_points.items() if key not in conflicts]
    labels, indexes, splits, points = zip(*records, strict=True)
    groups = [f"librasign-v1:linhas-{index // BLOCK_SIZE:02d}" for index in indexes]
    coverage = Counter(zip(splits, labels, strict=True))
    if any(not coverage[split, label] for split in SPLITS for label in LABELS):
        raise ValueError("A deduplicação deixou uma partição sem todas as classes.")

    output.parent.mkdir(parents=True, exist_ok=True)
    atomic_write(output, lambda stream: np.savez_compressed(
        stream,
        points=np.stack(points),
        labels=np.asarray(labels),
        handedness=np.full(len(records), "U"),
        groups=np.asarray(groups),
        splits=np.asarray(splits),
        source_rows=np.asarray(indexes, dtype=np.int32),
    ))
    metadata = {
        "source": SOURCE,
        "license": "GPL-3.0",
        "sourceSha256": source_sha256,
        "dataSha256": digest(output),
        "coordinateOrder": "MediaPipe 21 landmarks, XYZ, imagem sem espelho",
        "sourceHandedness": "unknown",
        "groupKind": "ordinal-row-block",
        "blockRows": BLOCK_SIZE,
        "splitRows": SPLITS,
        "guardRowsPerLetter": ROW_COUNT - sum(stop - start for start, stop in SPLITS.values()),
        "duplicateRows": duplicate_count,
        "conflictingDuplicateGroups": len(conflicts),
        "coverage": {
            split: {label: coverage[split, label] for label in LABELS}
            for split in SPLITS
        },
    }
    atomic_write(output.with_suffix(".json"), lambda stream: stream.write(
        (json.dumps(metadata, ensure_ascii=False, indent=2) + "\n").encode()
    ))
    print(f"{output} · {len(records)} amostras · SHA-256 {metadata['dataSha256']}")
    for split in SPLITS:
        print(f"{split} · {sum(coverage[split, label] for label in LABELS)} amostras")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, default=Path("data/alphabet/.sources/librasign-v1.zip"))
    parser.add_argument("--out", type=Path, default=Path("data/alphabet/static.npz"))
    args = parser.parse_args()
    if args.out.suffix != ".npz":
        parser.error("A saída deve usar a extensão .npz.")
    prepare(args.archive, args.out)


if __name__ == "__main__":
    main()
