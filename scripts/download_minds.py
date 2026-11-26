"""Baixa clipes selecionados da fonte RGB MINDS-Libras por intervalos ZIP."""

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import struct
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import zipfile
import zlib


BASE = "https://zenodo.org/api/records/2667329/files/"
DOI = "10.5281/zenodo.2667329"
ALLOWED = {"03": "amarelo", "10": "cinco", "12": "espelho"}
EXPANDED = {**ALLOWED, "02": "aluno"}
NEGATIVES = {
    "01": "acontecer", "04": "américa", "07": "banco",
    "09": "barulho", "11": "conhecer", "13": "esquina",
    "15": "maçã", "16": "medo", "17": "ruim", "20": "vontade",
}
MEMBER_NAME = re.compile(r"(\d{2}).+?Sinalizador(\d{2})-(\d+)\.mp4", re.IGNORECASE)
RANGE_HEADER = re.compile(r"bytes (\d+)-(\d+)/(\d+)")
PARTITIONS = {signer: "train" for signer in range(1, 8)}
PARTITIONS.update({8: "val", 10: "val", 9: "test", 11: "test", 12: "test"})
TAIL_BYTES = 524_288
LOCAL_HEADER = struct.Struct("<I5H3I2H")
ZIP32_LIMIT = 2**32


def archive_url(signer):
    return f"{BASE}Sinalizador{signer:02d}.zip/content"


def fetch_range(url, start=None, end=None, *, tail=None):
    requested = f"-{tail}" if tail else f"{start}-{end}"
    request = Request(url, headers={"Range": f"bytes={requested}", "Accept-Encoding": "identity"})
    response = urlopen(request, timeout=35)
    header = RANGE_HEADER.fullmatch(response.headers.get("Content-Range", ""))
    if response.status != 206 or not header:
        response.close()
        raise ValueError("A origem não retornou o intervalo HTTP 206 solicitado.")
    first, last, total = map(int, header.groups())
    expected = (max(0, total - tail), total - 1) if tail else (start, end)
    if (first, last) != expected:
        response.close()
        raise ValueError(f"Content-Range recebido {first}-{last}, esperado {expected}.")
    return response, first, total


def retried(action):
    for attempt in range(4):
        try:
            return action()
        except HTTPError as error:
            if error.code not in (408, 429, 500, 502, 503, 504) or attempt == 3:
                raise
            if error.code == 429:
                delay = error.headers.get("Retry-After", "")
                time.sleep(max(6, int(delay)) if delay.isdecimal() else 6 * (attempt + 1))
                continue
        except (URLError, OSError, EOFError, ValueError, zlib.error):
            if attempt == 3:
                raise
        time.sleep(1.5 * 2**attempt)


def entries(signer):
    response, start, total = fetch_range(archive_url(signer), tail=TAIL_BYTES)
    with response, tempfile.TemporaryFile() as sparse:
        tail = response.read(TAIL_BYTES + 1)
        if len(tail) != total - start:
            raise EOFError("A origem retornou um diretório ZIP truncado.")
        sparse.seek(start)
        sparse.write(tail)
        with zipfile.ZipFile(sparse) as archive:
            directory = archive.infolist()
            recover_zip32_offsets(directory, archive.start_dir)
            return total, directory


def recover_zip32_offsets(directory, central_start):
    # Alguns arquivos originais ultrapassam 4 GiB e têm offsets locais de 32 bits.
    # zipfile atribui o ajuste do fim do ZIP a todos os membros, inclusive os primeiros.
    if not directory or directory[0].header_offset != ZIP32_LIMIT:
        return
    previous_end = 0
    for info in directory:
        offset = info.header_offset % ZIP32_LIMIT
        if offset < previous_end:
            offset += ZIP32_LIMIT
        if offset < previous_end or offset + LOCAL_HEADER.size + info.compress_size > central_start:
            raise ValueError("Os offsets corrigidos do ZIP de 32 bits não são consistentes.")
        info.header_offset = offset
        previous_end = offset + LOCAL_HEADER.size + info.compress_size


def candidates(signer, archive_entries, reps, negatives, labels=ALLOWED):
    by_class = {}
    for info in archive_entries:
        member = PurePosixPath(info.filename)
        if len(member.parts) != 3 or member.parts[:2] != (f"Sinalizador{signer:02d}", "Canon"):
            continue
        match = MEMBER_NAME.fullmatch(member.name)
        if match and int(match[2]) == signer:
            by_class.setdefault(match[1], []).append((int(match[3]), info))

    for source in labels:
        for rep, info in sorted(by_class.get(source, []), key=lambda entry: entry[0])[:reps]:
            yield source, rep, info

    # A rotação por pessoa amplia o repertório de rejeição sem usar todos os vídeos.
    keys = list(NEGATIVES)
    offset = (signer - 1) % len(keys)
    selected = keys[offset:] + keys[:offset]
    for source in [key for key in selected if by_class.get(key)][:negatives]:
        values = sorted(by_class[source], key=lambda entry: entry[0])
        rep, info = values[(signer - 1) % len(values)]
        yield source, rep, info


def sha256(path):
    with path.open("rb") as file:
        return hashlib.file_digest(file, "sha256").hexdigest()


def read_exact(response, count):
    data = response.read(count)
    if len(data) != count:
        raise EOFError("Conteúdo ZIP truncado.")
    return data


def extract(signer, total, info, destination):
    if info.flag_bits & 1 or info.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
        raise ValueError("Método ZIP incompatível com o extrator.")
    start = info.header_offset
    end = min(total - 1, start + info.compress_size + LOCAL_HEADER.size + 2 * 65_535 - 1)
    response, _, _ = fetch_range(archive_url(signer), start, end)
    partial = destination.with_suffix(".part")
    digest = hashlib.sha256()
    crc = 0
    size = 0

    try:
        with response, partial.open("wb") as file:
            header = LOCAL_HEADER.unpack(read_exact(response, LOCAL_HEADER.size))
            if header[0] != 0x04034B50 or header[3] != info.compress_type:
                raise ValueError("O cabeçalho local diverge do diretório ZIP.")
            filename = read_exact(response, header[-2]).decode("utf-8" if header[2] & 0x800 else "cp437")
            if filename != info.orig_filename:
                raise ValueError("O nome local diverge do diretório ZIP.")
            read_exact(response, header[-1])
            decompressor = zlib.decompressobj(-zlib.MAX_WBITS) if info.compress_type == zipfile.ZIP_DEFLATED else None
            remaining = info.compress_size

            while remaining:
                packed = read_exact(response, min(remaining, 512 * 1024))
                remaining -= len(packed)
                data = decompressor.decompress(packed) if decompressor else packed
                size += len(data)
                if size > info.file_size:
                    raise ValueError("O clipe excede o tamanho declarado no diretório ZIP.")
                file.write(data)
                crc = zlib.crc32(data, crc)
                digest.update(data)

            if decompressor and not decompressor.eof:
                raise EOFError("A compressão do clipe terminou antes do marcador final.")

        if size != info.file_size or crc != info.CRC:
            raise ValueError("O clipe descompactado diverge do tamanho ou CRC do diretório ZIP.")
        partial.replace(destination)
    except BaseException:
        partial.unlink(missing_ok=True)
        raise
    return digest.hexdigest()


def download(root, signer, total, source, rep, info, labels, cached_only=False):
    name = PurePosixPath(info.filename).name
    output = root / "raw" / name
    if output.is_file() and output.stat().st_size == info.file_size:
        with output.open("rb") as file:
            crc = 0
            for chunk in iter(lambda: file.read(1_048_576), b""):
                crc = zlib.crc32(chunk, crc)
        digest = sha256(output) if crc == info.CRC else None
    else:
        digest = None
    if digest is None:
        if cached_only:
            return None
        digest = retried(lambda: extract(signer, total, info, output))
    return {
        "file": f"raw/{name}",
        "label": labels.get(source),
        "sourceLabel": labels.get(source) or NEGATIVES[source],
        "signer": signer,
        "partition": PARTITIONS[signer],
        "sha256": digest,
        "archive": f"Sinalizador{signer:02d}.zip",
        "member": info.filename,
        "recording": rep,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--catalogo", choices=("inicial", "expandido"), default="inicial")
    parser.add_argument("--reps", type=int, choices=range(1, 6), default=3)
    parser.add_argument("--negatives", type=int, choices=range(1, len(NEGATIVES) + 1), default=6)
    parser.add_argument("--workers", type=int, choices=range(1, 17), default=8)
    parser.add_argument("--signers", type=int, choices=tuple(PARTITIONS), nargs="+", default=sorted(PARTITIONS))
    parser.add_argument("--manifest-parcial", action="store_true", help="Lista somente clipes já verificados em manifest-in-progress.json, sem baixar vídeos.")
    args = parser.parse_args()
    labels = ALLOWED if args.catalogo == "inicial" else EXPANDED
    if args.output is None:
        args.output = Path("data/minds" if args.catalogo == "inicial" else "data/minds-expanded")
    (args.output / "raw").mkdir(parents=True, exist_ok=True)

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        directories = {
            signer: executor.submit(retried, lambda person=signer: entries(person))
            for signer in sorted(set(args.signers))
        }
        selection = []
        for signer, result in directories.items():
            total, directory = result.result()
            for source, rep, info in candidates(signer, directory, args.reps, args.negatives, labels):
                selection.append((signer, total, source, rep, info))
        selection.sort(key=lambda item: (item[2] not in labels, item[3], item[2], item[0]))
        tasks = {
            executor.submit(download, args.output, *item, labels, args.manifest_parcial): item[-1].filename
            for item in selection
        }
        clips = []
        errors = []
        for future in as_completed(tasks):
            try:
                clip = future.result()
                if clip is not None:
                    clips.append(clip)
                    print(f"{len(clips)}/{len(tasks)} {clip['partition']} {clip['file']}", flush=True)
            except Exception as error:
                errors.append(f"{tasks[future]}: {error}")
    if errors:
        raise SystemExit("Falhas de download. Rode novamente para recuperar os clipes faltantes.\n" + "\n".join(errors))
    if not clips or len({clip["sha256"] for clip in clips}) != len(clips):
        raise SystemExit("Nenhum clipe ou arquivos duplicados no subconjunto.")
    clips.sort(key=lambda clip: (clip["signer"], clip["file"]))
    manifest = {"source": DOI, "license": "CC-BY-4.0", "clips": clips}
    name = "manifest-in-progress" if args.manifest_parcial else "manifest"
    if args.manifest_parcial:
        manifest["partial"] = True
    temporary = args.output / f"{name}.part"
    temporary.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    temporary.replace(args.output / f"{name}.json")
    print(f"Manifesto salvo com {len(clips)} clipes.", flush=True)


if __name__ == "__main__":
    main()
