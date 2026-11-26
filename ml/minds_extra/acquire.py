"""Inventaria o RGB de sete pessoas e baixa a quarta tomada de duas glosas."""

import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
import json
from pathlib import Path, PurePosixPath
from tempfile import TemporaryDirectory, TemporaryFile
from urllib.request import urlopen
from zipfile import ZipFile

from scripts.download_minds import (
    DOI, MEMBER_NAME, TAIL_BYTES, archive_url, download, fetch_range, recover_zip32_offsets,
    retried, sha256 as checksum,
)


RECORD = "https://zenodo.org/api/records/2667329"
SIGNERS = tuple(range(1, 8))
SIGNS = {"03": "amarelo", "12": "espelho"}
TAKE = 4
BASE_MANIFEST_SHA = "3e3e171602f17138ad2ba251a34f2d13a2f545ddd525ed650b945fb40ecc70be"
FROZEN = Path(__file__).with_name("inventory.json")


def symbols(name, signer):
    path = PurePosixPath(name)
    match = MEMBER_NAME.fullmatch(path.name)
    if not match or len(path.parts) != 3 or path.parts[:2] != (f"Sinalizador{signer:02}", "Canon"):
        return None
    if match[1] not in SIGNS or int(match[2]) != signer:
        return None
    return match[1], int(match[3])


def member_fields(info, signer):
    key = symbols(info.filename, signer)
    if key is None:
        return None
    code, take = key
    return {
        "code": code, "label": SIGNS[code], "take": take, "member": info.filename,
        "crc32": f"{info.CRC:08x}", "bytes": info.file_size,
        "compressedBytes": info.compress_size, "offset": info.header_offset,
    }


def inspect_archive(signer, official):
    response, start, total = fetch_range(archive_url(signer), tail=TAIL_BYTES)
    with response, TemporaryFile() as sparse:
        suffix = response.read(TAIL_BYTES + 1)
        if len(suffix) != total - start or total != official["size"]:
            raise ValueError("A faixa ZIP não corresponde ao tamanho oficial.")
        sparse.seek(start)
        sparse.write(suffix)
        with ZipFile(sparse) as archive:
            infos = archive.infolist()
            recover_zip32_offsets(infos, archive.start_dir)
    videos = Counter()
    selected = []
    for info in infos:
        path = PurePosixPath(info.filename)
        if len(path.parts) < 3 or path.parts[0] != f"Sinalizador{signer:02}" or path.suffix.lower() != ".mp4":
            continue
        videos[path.parts[1]] += 1
        if (item := member_fields(info, signer)) is not None:
            selected.append((item, info))
    fields = {
        "signer": signer, "archive": official["key"], "bytes": total,
        "publishedChecksum": official["checksum"], "zipTailBytes": len(suffix),
        "zipTailSha256": sha256(suffix).hexdigest(), "videoFolders": dict(sorted(videos.items())),
        "members": sorted((item for item, _ in selected), key=lambda item: (item["code"], item["take"])),
    }
    return fields, {item["member"]: info for item, info in selected}


def get_archives():
    with urlopen(RECORD, timeout=35) as response:
        record = json.load(response)
    if record["doi"] != DOI or record["metadata"]["license"]["id"] != "cc-by-4.0":
        raise ValueError("A revisão ou licença do depósito mudou.")
    files = {file["key"]: file for file in record["files"]}
    with ThreadPoolExecutor(max_workers=2) as pool:
        jobs = [
            pool.submit(retried, lambda person=signer: inspect_archive(person, files[f"Sinalizador{person:02}.zip"]))
            for signer in SIGNERS
        ]
        return [job.result() for job in jobs]


def make_inventory(records, base):
    if checksum(base) != BASE_MANIFEST_SHA:
        raise ValueError("O inventário exige o manifesto expandido fixado.")
    known = {
        (row["signer"], row["label"], row["recording"]): row["member"]
        for row in json.loads(base.read_text(encoding="utf-8"))["clips"]
        if row["partition"] == "train" and row["label"] in SIGNS.values()
    }
    selection = []
    for archive in records:
        signer = archive["signer"]
        for label in SIGNS.values():
            group = [row for row in archive["members"] if row["label"] == label]
            order = [row["take"] for row in group]
            content = {(row["crc32"], row["bytes"]) for row in group}
            if order != [1, 2, 3, 4, 5] or len(content) != 5:
                raise ValueError(f"Tomadas incompletas ou duplicadas de {label} em {signer:02}.")
            for row in group:
                take = row["take"]
                if take <= 3 and known.get((signer, label, take)) != row["member"]:
                    raise ValueError("O inventário diverge das tomadas do manifesto expandido.")
                if take == TAKE:
                    selection.append({"signer": signer, **row})
    return {
        "source": DOI, "license": "CC-BY-4.0", "baseManifestSha256": BASE_MANIFEST_SHA,
        "archives": records, "selection": selection,
    }


def write_json(dest, payload):
    dest.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=dest.parent) as directory:
        temporary = Path(directory) / dest.name
        temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(dest)


def acquire(dest, base, inventory, catalog):
    if inventory != json.loads(FROZEN.read_text(encoding="utf-8")):
        raise ValueError("O inventário atual diverge do protocolo versionado.")
    if len(inventory["selection"]) != 14:
        raise ValueError("O protocolo deve selecionar catorze tomadas.")
    (dest / "raw").mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=2) as pool:
        jobs = []
        for row in inventory["selection"]:
            signer = row["signer"]
            archive, members = catalog[signer - 1]
            info = members[row["member"]]
            jobs.append(pool.submit(download, dest, signer, archive["bytes"], row["code"], TAKE, info, SIGNS))
        clips = [
            {**job.result(), "sensor": "Canon", "zipCrc32": row["crc32"], "bytes": row["bytes"]}
            for job, row in zip(jobs, inventory["selection"], strict=True)
        ]
    seen = {row["sha256"] for row in json.loads(base.read_text(encoding="utf-8"))["clips"] if row["partition"] == "train"}
    hashes = {row["sha256"] for row in clips}
    if len(hashes) != len(clips) or hashes & seen:
        raise ValueError("Foram encontradas tomadas repetidas por SHA-256.")
    manifest = {
        "source": DOI, "license": "CC-BY-4.0", "baseManifestSha256": BASE_MANIFEST_SHA,
        "inventorySha256": checksum(FROZEN), "clips": clips,
    }
    file = dest / "manifest.json"
    write_json(file, manifest)
    print(f"{len(clips)} clipes verificados. Manifesto {file}, SHA-256 {checksum(file)}.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=("inventory", "download"))
    parser.add_argument("--base", type=Path, default=Path("ml/manifests/minds-expanded-v1.json"))
    parser.add_argument("--out", type=Path, default=Path("data/minds-extra"))
    args = parser.parse_args()
    catalog = retried(get_archives)
    inventory = make_inventory([item for item, _ in catalog], args.base)
    if args.phase == "inventory":
        file = args.out / "inventory.json"
        write_json(file, inventory)
        print(f"{len(inventory['selection'])} tomadas selecionadas. Inventário {file}, SHA-256 {checksum(file)}.")
    else:
        acquire(args.out, args.base, inventory, catalog)


if __name__ == "__main__":
    main()
