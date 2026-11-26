"""Extrai os RGBs correspondentes ao recorte de teste do gerador EQT."""

import argparse
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path, PurePosixPath
from tempfile import TemporaryFile
from zipfile import ZipFile

from .acquire_eqt import HAND_DIRECTORY, fetch_range
from .eqt import prepare, spaced_test_samples


ARCHIVE_NAME = "Libras-EQT-UECE (RGB).zip"
ARCHIVE_DIRECTORY = "Libras-EQT-UECE (RGB)/"
ARCHIVE_SIZE = 8_971_968_030
DIRECTORY_START = 8_970_965_795
MAX_MEMBER = 24 * 1024 * 1024


def key(name, directory):
    item, signer, filename = PurePosixPath(name.removeprefix(directory)).parts
    return int(item.split("_", 1)[0]), signer.strip(), PurePosixPath(filename).stem


def recover(samples, output):
    directory = fetch_range(ARCHIVE_NAME, DIRECTORY_START, ARCHIVE_SIZE - 1, ARCHIVE_SIZE)
    with TemporaryFile() as sparse:
        sparse.seek(DIRECTORY_START)
        sparse.write(directory)
        sparse.flush()
        with ZipFile(sparse) as archive:
            locations = defaultdict(list)
            for member in archive.infolist():
                if member.filename.startswith(ARCHIVE_DIRECTORY) and member.filename.lower().endswith(".mp4"):
                    locations[key(member.filename, ARCHIVE_DIRECTORY)].append(member)

            selected = []
            for sample in samples:
                match, = locations[key(sample.source, HAND_DIRECTORY)]
                if (match.file_size > MAX_MEMBER or match.compress_size > MAX_MEMBER
                        or match.header_offset >= DIRECTORY_START):
                    raise ValueError("Membro RGB fora dos limites esperados.")
                selected.append(match)

            def download(member):
                start = member.header_offset
                end = min(DIRECTORY_START - 1, start + member.compress_size + 4096)
                return fetch_range(ARCHIVE_NAME, start, end, ARCHIVE_SIZE)

            report = []
            with ThreadPoolExecutor(max_workers=3) as pool:
                for index, (member, data) in enumerate(zip(selected, pool.map(download, selected))):
                    sparse.seek(member.header_offset)
                    sparse.write(data)
                    sparse.flush()
                    video = archive.read(member)  # Valida o CRC do conteúdo.
                    filename = f"{index:02}.mp4"
                    (output / filename).write_bytes(video)
                    sample = samples[index]
                    report.append({
                        "video": filename,
                        "source": member.filename,
                        "sha256": hashlib.sha256(video).hexdigest(),
                        "landmark_sha256": sample.digest,
                        "item": sample.item,
                        "frames_original": sample.frame_count,
                    })
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    samples, _ = prepare(args.dataset, args.dataset / "Landmarks-hands.zip")
    selected = spaced_test_samples(samples)
    args.output.mkdir(parents=True, exist_ok=True)
    report = recover(selected, args.output)
    (args.output / "samples.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n",
                                              encoding="utf-8")
    print(f"{len(report)} gravações RGB correspondentes verificadas por CRC.")


if __name__ == "__main__":
    main()
