"""Carrega a extração versionada e verifica integridade das partições."""

from dataclasses import dataclass
from hashlib import file_digest
import json
from pathlib import Path
import re

import numpy as np

LABELS = (None, "cinco", "espelho", "amarelo")
FRAMES = 24
FEATURES = 192
SHAPE = (FRAMES, FEATURES)
PREPROCESS = "holistic-shoulders-v1"


@dataclass(frozen=True)
class Clip:
    index: int
    label: int
    signer: int
    partition: str
    checksum: str
    source_label: str
    state: str
    values: np.ndarray | None
    extraction_ms: list[float]


def digest(path):
    with path.open("rb") as handle:
        return file_digest(handle, "sha256").hexdigest()


def load_features(index_path, partitions):
    index = json.loads(index_path.read_text(encoding="utf-8"))
    if index.get("preprocess") != PREPROCESS or index.get("mediapipe") != "0.10.32":
        raise ValueError("Versão de pré-processamento ou extrator inesperada.")
    seen = set()
    inputs = set()
    people = {}
    rows = []
    for number, item in enumerate(index["clips"]):
        label = item["label"]
        signer = item["signer"]
        partition = item["partition"]
        checksum = item["sha256"]
        feature_file = item["features"]
        if label not in LABELS or type(signer) is not int or partition not in {"train", "val", "test"}:
            raise ValueError(f"Rótulo ou partição inválido na entrada {number}.")
        if people.setdefault(signer, partition) != partition:
            raise ValueError(f"Sinalizante {signer} aparece em mais de uma partição.")
        if checksum in seen or not re.fullmatch(r"[a-f0-9]{64}", checksum) or feature_file != checksum + ".json":
            raise ValueError(f"SHA-256 inválido ou duplicado para entrada {number}.")
        seen.add(checksum)
        if partition not in partitions:
            continue
        computed = json.loads((index_path.parent / feature_file).read_text(encoding="utf-8"))
        if computed["recipe"] != index["recipe"] or computed["clipSha256"] != checksum:
            raise ValueError(f"Extração incompatível para {checksum}.")
        state = computed["state"]
        if state not in {"ready", "no-hand", "insufficient"}:
            raise ValueError(f"Estado de extração inválido para {checksum}.")
        values = None
        if state == "ready":
            values = np.asarray(computed["values"], dtype=np.float32).reshape(SHAPE)
            if not np.isfinite(values).all() or not np.isin(values[:, 3::4], [0.0, 1.0]).all():
                raise ValueError(f"Valores ou máscaras inválidos para {checksum}.")
            tensor = values.tobytes()
            if tensor in inputs:
                raise ValueError(f"Duplicata de tensor em {checksum}.")
            inputs.add(tensor)
        elif computed["values"] is not None:
            raise ValueError(f"Extração inconclusiva contém vetor em {checksum}.")
        rows.append(Clip(number, LABELS.index(label), signer, partition, checksum, item.get("sourceLabel", ""), state,
                         values, computed["extractionMs"]))
    actual = {row.partition for row in rows}
    if actual != set(partitions):
        raise ValueError(f"Partições solicitadas {partitions}, disponíveis {actual}.")
    for split in partitions:
        signers = {row.signer for row in rows if row.partition == split}
        if len(signers) < 2:
            raise ValueError(f"São necessárias pelo menos duas pessoas em {split}.")
        classes = {row.label for row in rows if row.partition == split}
        if len(classes) != len(LABELS):
            raise ValueError(f"Há classes ausentes na partição {split}.")
    return index, rows


def write_json(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.with_suffix(path.suffix + ".tmp").open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, allow_nan=False)
        handle.write("\n")
    path.with_suffix(path.suffix + ".tmp").replace(path)
