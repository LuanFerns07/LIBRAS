"""Prepara as sequências EQT-UECE com os rótulos textuais das partições oficiais."""

from collections import Counter, defaultdict
from dataclasses import dataclass
import hashlib
from io import BytesIO
import pickle
from pathlib import Path, PurePosixPath
import re
import unicodedata
from zipfile import ZipFile

import numpy as np

from .acquire_eqt import ANNOTATIONS, HAND_DIRECTORY


SPLITS = ("train", "dev", "test")
FILE_ID = re.compile(r"(?P<title>.+)_(?P<signer>INFORMANTE \d)\s*_(?P<stem>[^/]+)\Z", re.DOTALL)
WORD = re.compile(r"[^\W_]+(?:[-’'][^\W_]+)*", re.UNICODE)
FRAMES = 64
MIN_WORDS = 3


def words(text):
    return WORD.findall(unicodedata.normalize("NFC", text).casefold())


def match_title(text):
    folded = "".join(c for c in unicodedata.normalize("NFKD", text.casefold()) if not unicodedata.combining(c))
    return " ".join(re.findall(r"[a-z0-9]+", folded))


class AnnotationUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        if (module, name) == ("numpy._core.multiarray", "_reconstruct"):
            return np._core.multiarray._reconstruct
        if module == "numpy" and name in {"ndarray", "dtype"}:
            return getattr(np, name)
        raise pickle.UnpicklingError(f"Classe inesperada em anotação oficial: {module}.{name}")


def load_annotations(directory, split):
    data = (directory / f"{split}.npy").read_bytes()
    if hashlib.sha256(data).hexdigest() != ANNOTATIONS[split][2]:
        raise ValueError(f"SHA-256 da anotação {split} difere da versão v4.")
    with BytesIO(data) as source:
        version = np.lib.format.read_magic(source)
        if version != (1, 0):
            raise ValueError("Versão inesperada da anotação NumPy.")
        shape, fortran, dtype = np.lib.format.read_array_header_1_0(source)
        if shape != () or fortran or dtype != np.dtype(object):
            raise ValueError("Cabeçalho inesperado na anotação EQT.")
        records = AnnotationUnpickler(source).load().item()
    if records.get("prefix") != "Libras-EQT-UECE":
        raise ValueError("Fonte de anotação inesperada.")
    return [record for key, record in records.items() if key != "prefix"]


def index_hands(archive):
    result = defaultdict(list)
    for name in archive.namelist():
        if not name.startswith(HAND_DIRECTORY) or not name.endswith(".npy"):
            continue
        item, signer, filename = PurePosixPath(name.removeprefix(HAND_DIRECTORY)).parts
        number, title = item.split("_", 1)
        result[signer.strip(), PurePosixPath(filename).stem].append((int(number), match_title(title), name))
    return result


@dataclass(frozen=True)
class Sample:
    split: str
    item: int
    local_signer: str
    source: str
    sentence: str
    tokens: tuple[str, ...]
    digest: str
    frame_count: int
    values: np.ndarray


def prepare(directory: Path, archive_path: Path):
    samples = []
    stats = {split: Counter() for split in SPLITS}
    per_hash = defaultdict(list)
    splits_per_item_signer = defaultdict(set)
    with ZipFile(archive_path) as archive:
        hands = index_hands(archive)
        for split in SPLITS:
            for record in load_annotations(directory, split):
                counts = stats[split]
                counts["records"] += 1
                info, = record["original_info"]
                counts["nonempty_gloss_targets"] += bool(info["label_gloss"])
                sentence = "".join(info["label_char"])
                tokens = tuple(words(sentence))
                if len(tokens) < MIN_WORDS:
                    counts["fewer_than_three_words"] += 1
                    continue

                identity = FILE_ID.fullmatch(record["fileid"])
                if not identity or identity["signer"] != record["signer"].strip():
                    raise ValueError(f"Identificação inconsistente: {record['fileid']}")
                accepted_titles = {match_title(identity["title"]), match_title(sentence)}
                matches = [member for member in hands[identity["signer"], identity["stem"]]
                           if member[1] in accepted_titles]
                if len(matches) != 1:
                    counts["ambiguous_join" if matches else "missing_join"] += 1
                    continue

                item, _, source = matches[0]
                payload = archive.read(source)  # ZipFile valida o CRC do membro.
                points = np.load(BytesIO(payload), allow_pickle=False)
                if points.ndim != 2 or points.shape[1] != 126 or len(points) < 2:
                    counts["invalid_shape"] += 1
                    continue
                if not np.isfinite(points).all() or not points.any():
                    counts["invalid_values"] += 1
                    continue
                digest = hashlib.sha256(payload).hexdigest()
                captured_frames = len(points)
                indices = np.rint(np.linspace(0, captured_frames - 1, FRAMES)).astype(np.intp)
                values = points[indices].astype(np.float32)
                sample = Sample(split, item, identity["signer"], source,
                                sentence, tokens, digest, captured_frames, values)
                samples.append(sample)
                per_hash[digest].append(sample)
                splits_per_item_signer[item, sample.local_signer].add(split)

    kept = []
    seen = set()
    for sample in samples:
        counts = stats[sample.split]
        group = sample.item, sample.local_signer
        copies = per_hash[sample.digest]
        if len(splits_per_item_signer[group]) != 1:
            counts["local_signer_overlap"] += 1
        elif any(copy.split != sample.split or copy.tokens != sample.tokens for copy in copies):
            counts["duplicate_conflict"] += 1
        elif sample.digest in seen:
            counts["duplicate_same_split"] += 1
        else:
            counts["used"] += 1
            kept.append(sample)
            seen.add(sample.digest)

    items_by_split = {split: {sample.item for sample in kept if sample.split == split} for split in SPLITS}
    evidence = {
        "counts": {split: dict(counter) for split, counter in stats.items()},
        "items_by_split": {split: len(items) for split, items in items_by_split.items()},
        "test_items_present_in_train": len(items_by_split["test"] & items_by_split["train"]),
        "test_items_absent_in_train": len(items_by_split["test"] - items_by_split["train"]),
        "globally_signer_independent": False,
    }
    return kept, evidence


def spaced_test_samples(samples, count=12):
    test = [sample for sample in samples if sample.split == "test"]
    if count <= 0 or count > len(test):
        raise ValueError("Quantidade de clipes de teste inválida para o recorte.")
    indices = np.rint(np.linspace(0, len(test) - 1, count)).astype(np.intp)
    return [test[index] for index in indices]
