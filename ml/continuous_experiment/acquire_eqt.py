"""Recupera somente os membros necessários do lançamento público EQT-UECE v4."""

import argparse
import hashlib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import struct
import tempfile
from urllib.request import Request, urlopen
import zipfile
import zlib


BASE = "https://zenodo.org/api/records/21398895/files"
ANNOTATION_ARCHIVE = "Libras-EQT-UECE-T.zip"
ANNOTATION_SIZE = 35_604_881_215
ANNOTATIONS = {
    "train": (168, 33161, "03c7546e29b592899619f683cd339256381c6acd7b93ae163676d913bd0d96e3"),
    "dev": (33444, 13879, "d98cb6c1b4eb3da3f6efd25ca1c0956ba30f575b27a11a2af40d040d363d639e"),
    "test": (47436, 13796, "2c49c7069bb6bc8cf46ae34e8515f5acad81613f645d08c924a917bbb3e49d94"),
}
LANDMARK_ARCHIVE = "Landmarks.zip"
LANDMARK_SIZE = 773_596_409
LANDMARK_DIRECTORY_START = 771_553_705
HAND_SECTION_END = 179_677_332
HAND_DIRECTORY = "Landmarks/Libras-EQT-UECE (Hand Landmarks)/"
LOCAL_HEADER = struct.Struct("<4s5H3I2H")
CHUNK_SIZE = 16 * 1024 * 1024


def fetch_range(archive, start, end, total):
    expected = end - start + 1
    request = Request(f"{BASE}/{archive}/content", headers={
        "Range": f"bytes={start}-{end}",
        "Accept-Encoding": "identity",
    })
    for attempt in range(3):
        try:
            with urlopen(request, timeout=35) as response:
                if response.status != 206 or response.headers.get("Content-Range") != f"bytes {start}-{end}/{total}":
                    raise ValueError(f"Resposta fora do intervalo solicitado para {archive}.")
                data = response.read(expected + 1)
                if len(data) != expected:
                    raise ValueError(f"Intervalo incompleto para {archive}.")
                return data
        except OSError:
            if attempt == 2:
                raise


def acquire_annotations(directory):
    prefix = fetch_range(ANNOTATION_ARCHIVE, 0, 61_345, ANNOTATION_SIZE)
    for split, (offset, length, expected_hash) in ANNOTATIONS.items():
        signature, _, _, method, *rest = LOCAL_HEADER.unpack_from(prefix, offset)
        name_length, extra_length = rest[-2:]
        name_start = offset + LOCAL_HEADER.size
        name = prefix[name_start:name_start + name_length].decode("utf-8")
        if signature != b"PK\x03\x04" or method != 8 or name != f"Libras-EQT-UECE/annotations/{split}.npy":
            raise ValueError(f"Cabeçalho ZIP inesperado em {split}.")
        start = name_start + name_length + extra_length
        data = zlib.decompress(prefix[start:start + length], -15)
        if hashlib.sha256(data).hexdigest() != expected_hash:
            raise ValueError(f"Hash da anotação {split} diverge da revisão esperada.")
        (directory / f"{split}.npy").write_bytes(data)


def acquire_hands(directory, prefix_source=None):
    """Grava ZIP esparso com diretório central e conteúdo da modalidade mãos."""
    output = directory / "Landmarks-hands.zip"
    with tempfile.NamedTemporaryFile(dir=directory, prefix="hands-", delete=False) as target:
        temporary = Path(target.name)
        try:
            if prefix_source is None:
                ranges = [(start, min(start + CHUNK_SIZE, HAND_SECTION_END) - 1)
                          for start in range(0, HAND_SECTION_END, CHUNK_SIZE)]

                def fetch_chunk(span):
                    start, end = span
                    return fetch_range(LANDMARK_ARCHIVE, start, end, LANDMARK_SIZE)

                with ThreadPoolExecutor(max_workers=4) as pool:
                    for block in pool.map(fetch_chunk, ranges):
                        target.write(block)
            else:
                with prefix_source.open("rb") as source:
                    remaining = HAND_SECTION_END
                    while remaining:
                        block = source.read(min(CHUNK_SIZE, remaining))
                        if not block:
                            raise ValueError("Arquivo de origem ainda não contém todos os landmarks das mãos.")
                        target.write(block)
                        remaining -= len(block)

            directory_data = fetch_range(
                LANDMARK_ARCHIVE, LANDMARK_DIRECTORY_START, LANDMARK_SIZE - 1, LANDMARK_SIZE,
            )
            target.seek(LANDMARK_DIRECTORY_START)
            target.write(directory_data)
            target.flush()
            with zipfile.ZipFile(temporary) as archive:
                count = sum(name.startswith(HAND_DIRECTORY) and name.endswith(".npy") for name in archive.namelist())
                if count != 5347:
                    raise ValueError(f"Quantidade inesperada de landmarks das mãos: {count}")
            temporary.replace(output)
        finally:
            temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("--annotations-only", action="store_true")
    parser.add_argument("--prefix-from", type=Path, help="Reutiliza começo de um download do Landmarks.zip.")
    args = parser.parse_args()
    args.directory.mkdir(parents=True, exist_ok=True)
    acquire_annotations(args.directory)
    if not args.annotations_only:
        acquire_hands(args.directory, args.prefix_from)


if __name__ == "__main__":
    main()
