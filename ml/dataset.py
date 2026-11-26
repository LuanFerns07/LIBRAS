"""Carrega a extração versionada e verifica integridade das partições."""

from dataclasses import dataclass, replace
from hashlib import file_digest
import json
from pathlib import Path
import re

import numpy as np

LABELS = (None, "cinco", "espelho", "amarelo")
CATALOGS = {"inicial": LABELS, "expandido": (*LABELS, "aluno")}
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


def load_features(index_path, partitions, labels=LABELS, *, training_negatives=False, required_labels=None):
    if training_negatives and set(partitions) != {"train"}:
        raise ValueError("Negativos complementares só podem ser usados para treino.")
    required = set(labels if required_labels is None else required_labels)
    if not required or not required.issubset(labels):
        raise ValueError("As classes exigidas devem pertencer ao catálogo.")
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
        if label not in required or type(signer) is not int or partition not in {"train", "val", "test"}:
            raise ValueError(f"Rótulo ou partição inválido na entrada {number}.")
        if training_negatives and (label is not None or partition != "train"):
            raise ValueError("O conjunto complementar deve conter apenas negativos de treino.")
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
        rows.append(Clip(number, labels.index(label), signer, partition, checksum, item.get("sourceLabel", ""), state,
                         values, computed["extractionMs"]))
    actual = {row.partition for row in rows}
    if actual != set(partitions):
        raise ValueError(f"Partições solicitadas {partitions}, disponíveis {actual}.")
    if training_negatives:
        return index, rows
    for split in partitions:
        signers = {row.signer for row in rows if row.partition == split}
        if len(signers) < 2:
            raise ValueError(f"São necessárias pelo menos duas pessoas em {split}.")
        classes = {row.label for row in rows if row.partition == split}
        if classes != {labels.index(label) for label in required}:
            raise ValueError(f"Há classes ausentes na partição {split}.")
    return index, rows


def add_training_negatives(index_path, base_index, rows, labels=LABELS):
    extra_index, negatives = load_features(index_path, {"train"}, labels, training_negatives=True)
    if any(extra_index[key] != base_index[key] for key in ("recipe", "modelSha256", "preprocess")):
        raise ValueError("A extração complementar deve usar a mesma receita do conjunto principal.")
    base_hashes = {row["sha256"] for row in base_index["clips"]}
    base_signers = {row["signer"] for row in base_index["clips"]}
    if any(row.checksum in base_hashes or row.signer in base_signers for row in negatives):
        raise ValueError("Clipes ou pessoas complementares já aparecem no conjunto principal.")
    provenance = {
        "featuresManifestSha256": digest(index_path),
        "sourceManifestSha256": extra_index["sourceManifestSha256"],
        "clips": len(negatives),
        "eligible": sum(row.values is not None for row in negatives),
        "signers": sorted({row.signer for row in negatives}),
    }
    offset = len(base_index["clips"])
    return [*rows, *(replace(row, index=offset + row.index) for row in negatives)], provenance


def add_training_positives(index_path, base_index, rows, labels=LABELS):
    extra_index, extra = load_features(index_path, {"train"}, labels, required_labels=("espelho", "amarelo"))
    if any(extra_index[key] != base_index[key] for key in ("recipe", "modelSha256", "preprocess")):
        raise ValueError("A extração complementar deve usar a mesma receita do conjunto principal.")
    train_people = {clip["signer"] for clip in base_index["clips"] if clip["partition"] == "train"}
    used_hashes = {clip["sha256"] for clip in base_index["clips"]} | {row.checksum for row in rows}
    used_values = {row.values.tobytes() for row in rows if row.values is not None}
    seen = set()
    for row in extra:
        metadata = extra_index["clips"][row.index]
        key = row.signer, row.label
        if (row.signer not in train_people or row.checksum in used_hashes or key in seen
                or metadata["recording"] != 4 or metadata["sensor"] != "Canon"
                or row.source_label != labels[row.label]
                or (row.values is not None and row.values.tobytes() in used_values)):
            raise ValueError("Gravação complementar duplicada, incompatível ou fora das pessoas de treino.")
        seen.add(key)
    offset = max(len(base_index["clips"]), max((row.index + 1 for row in rows), default=0))
    return [*rows, *(replace(row, index=offset + row.index) for row in extra)], {
        "featuresManifestSha256": digest(index_path), "sourceManifestSha256": extra_index["sourceManifestSha256"],
        "clips": len(extra), "eligible": sum(row.values is not None for row in extra),
        "signers": sorted({row.signer for row in extra}),
    }


def write_json(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.with_suffix(path.suffix + ".tmp").open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, allow_nan=False)
        handle.write("\n")
    path.with_suffix(path.suffix + ".tmp").replace(path)
