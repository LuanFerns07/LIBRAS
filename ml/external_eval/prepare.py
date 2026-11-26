"""Prepara trechos auditados de atividades cotidianas do acervo CLAD."""

import argparse
from collections import defaultdict
from hashlib import file_digest
import json
from pathlib import Path
import re
import shutil
import subprocess
from tempfile import TemporaryDirectory
from urllib.request import urlopen
from zipfile import ZipFile

SOURCE = Path(__file__).with_name("clad.json")
STRATA = ("repouso", "movimento-comum")
CLIP_MS = 4000
CROP = "crop=416:352:104:40"


def sha256(path):
    with path.open("rb") as handle:
        return file_digest(handle, "sha256").hexdigest()


def verified_archive(specification, root):
    output = root / specification["name"]
    if not output.exists():
        temporary = output.with_suffix(".part")
        try:
            with urlopen(specification["url"], timeout=60) as response, temporary.open("wb") as handle:
                shutil.copyfileobj(response, handle)
            if sha256(temporary) != specification["sha256"]:
                raise ValueError(f"SHA-256 incorreto em {output.name}.")
            temporary.replace(output)
        finally:
            temporary.unlink(missing_ok=True)
    if sha256(output) != specification["sha256"]:
        raise ValueError(f"SHA-256 incorreto em {output.name}.")
    return output


def validate_clips(clips):
    identifiers = set()
    seen_windows = defaultdict(list)
    people = defaultdict(set)
    for clip in clips:
        clip_id = clip["id"]
        if not re.fullmatch(r"clad-[a-z0-9-]+", clip_id) or clip_id in identifiers:
            raise ValueError(f"ID inválido ou duplicado: {clip_id}")
        video, person, start = clip["video"], clip["subject"], clip["startMs"]
        if any(type(item) is not int for item in (video, person, start)) or not 1 <= video <= 62 or person < 1:
            raise ValueError(f"Origem ou participante inválido: {clip_id}")
        if not 0 <= start <= 600_000 or clip["stratum"] not in STRATA or not clip["observation"].strip():
            raise ValueError(f"Janela ou estrato inválido: {clip_id}")
        if any(abs(start - earlier) < CLIP_MS for earlier in seen_windows[video]):
            raise ValueError(f"Trechos sobrepostos no vídeo {video}.")
        seen_windows[video].append(start)
        people[clip["stratum"]].add(person)
        identifiers.add(clip_id)
    if set(people) != set(STRATA) or any(len(group) < 2 for group in people.values()):
        raise ValueError("São necessárias pelo menos duas pessoas em cada estrato.")


def clipped_file(video, start_ms, output):
    temporary = output.with_suffix(".part")
    try:
        subprocess.run([
            "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-xerror", "-y",
            "-i", str(video), "-ss", f"{start_ms / 1000:.3f}", "-t", f"{CLIP_MS / 1000:.3f}",
            "-map", "0:v:0", "-an", "-map_metadata", "-1", "-vf", CROP, "-c:v", "libx264",
            "-threads", "1", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", "-f", "mp4", str(temporary),
        ], check=True)
        result = subprocess.run([
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=duration", "-of", "default=noprint_wrappers=1:nokey=1",
            str(temporary),
        ], check=True, capture_output=True, text=True)
        if abs(float(result.stdout) * 1000 - CLIP_MS) > 40:
            raise ValueError(f"Duração incompleta para {output.name}.")
        temporary.replace(output)
    finally:
        temporary.unlink(missing_ok=True)


def prepare(protocol, root):
    validate_clips(protocol["clips"])
    test_people = set(protocol["testSubjectIds"])
    reserved_people = set(protocol["developmentReservedSubjectIds"])
    if test_people != {item["subject"] for item in protocol["clips"]} or test_people & reserved_people:
        raise ValueError("As pessoas de avaliação devem estar separadas das de desenvolvimento.")
    raw = root / "raw"
    downloads = root / "source"
    raw.mkdir(parents=True, exist_ok=True)
    downloads.mkdir(parents=True, exist_ok=True)

    source = protocol["source"]
    archives = {name: verified_archive(spec, downloads) for name, spec in source["archives"].items()}
    clips = []
    with ZipFile(archives["videos"]) as videos, ZipFile(archives["annotations"]) as metadata, TemporaryDirectory() as workspace:
        for item in protocol["clips"]:
            video = item["video"]
            subject = metadata.read(f"Annotations/video_{video}/IDs_of_Involved_Subjects.txt").decode().split()
            if subject != [f"Subject{item['subject']}"]:
                raise ValueError(f"O vídeo {video} não tem um único sujeito com o ID fixado.")
            member = f"Videos/video_{video}.mp4"
            original = Path(workspace) / Path(member).name
            if not original.exists():
                with videos.open(member) as source_video, original.open("wb") as handle:
                    shutil.copyfileobj(source_video, handle)
            output = raw / (item["id"] + ".mp4")
            clipped_file(original, item["startMs"], output)
            clips.append({
                **item, "label": None, "partition": "test", "signer": item["subject"],
                "sourceLabel": item["stratum"], "file": output.relative_to(root).as_posix(),
                "durationMs": CLIP_MS, "sha256": sha256(output), "originalMember": member,
            })
    if len({item["sha256"] for item in clips}) != len(clips):
        raise ValueError("Trechos duplicados no recorte.")
    manifest = {
        "protocolSha256": sha256(SOURCE),
        "source": source,
        "ffmpeg": subprocess.check_output(["ffmpeg", "-version"], text=True).splitlines()[0],
        "transform": {"crop": CROP, "durationMs": CLIP_MS, "audio": False},
        "clips": clips,
    }
    path = root / "manifest.json"
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)
    return len(clips)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=Path("data/external-negative"))
    args = parser.parse_args()
    protocol = json.loads(SOURCE.read_text(encoding="utf-8"))
    count = prepare(protocol, args.out)
    print(f"{count} negativos no manifesto {args.out / 'manifest.json'}.")


if __name__ == "__main__":
    main()
