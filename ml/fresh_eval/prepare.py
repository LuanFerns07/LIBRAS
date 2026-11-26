"""Cria tentativas a partir do protocolo de demonstrações didáticas licenciadas."""

import argparse
from hashlib import file_digest
import json
from pathlib import Path
import shutil
import ssl
import subprocess
from urllib.request import urlopen

PROTOCOL = Path(__file__).with_name("protocol.json")


def sha256(path):
    with path.open("rb") as handle:
        return file_digest(handle, "sha256").hexdigest()


def download(source, name, root, context):
    local = root / source["filename"]
    if not local.exists():
        partial = local.with_suffix(".part")
        try:
            with urlopen(source["url"], timeout=60, context=context) as response, partial.open("wb") as handle:
                shutil.copyfileobj(response, handle)
            if sha256(partial) != source["sha256"]:
                raise ValueError(f"SHA-256 divergente em {name}.")
            partial.replace(local)
        finally:
            partial.unlink(missing_ok=True)
    if sha256(local) != source["sha256"]:
        raise ValueError(f"SHA-256 divergente em {name}.")
    return local


def make_clip(source, sample, output):
    temporary = output.with_suffix(".part")
    try:
        subprocess.run([
            "ffmpeg", "-nostdin", "-v", "error", "-xerror", "-y", "-threads", "1",
            "-ss", f"{sample['startMs'] / 1000:.3f}", "-i", str(source),
            "-t", f"{sample['durationMs'] / 1000:.3f}", "-map", "0:v:0", "-an", "-map_metadata", "-1",
            "-c:v", "libx264", "-threads", "1", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", "-f", "mp4", str(temporary),
        ], check=True)
        duration = subprocess.check_output([
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=duration", "-of", "default=noprint_wrappers=1:nokey=1",
            str(temporary),
        ], text=True)
        if abs(float(duration) * 1000 - sample["durationMs"]) > 60:
            raise ValueError(f"Duração divergente da seleção em {output.name}.")
        temporary.replace(output)
    finally:
        temporary.unlink(missing_ok=True)


def prepare(root, context):
    protocol = json.loads(PROTOCOL.read_text(encoding="utf-8"))
    raw = root / "raw"
    sources = root / "source"
    raw.mkdir(parents=True, exist_ok=True)
    sources.mkdir(parents=True, exist_ok=True)
    acquired = {key: download(item, key, sources, context) for key, item in protocol["sources"].items()}
    clips = []
    for case in protocol["clips"]:
        clip = raw / (case["id"] + ".mp4")
        make_clip(acquired[case["source"]], case, clip)
        clips.append({
            **case, "file": clip.relative_to(root).as_posix(), "sha256": sha256(clip), "partition": "test",
        })
    if len({clip["sha256"] for clip in clips}) != len(clips):
        raise ValueError("A seleção contém recortes duplicados.")
    manifest = {
        "protocolSha256": sha256(PROTOCOL),
        "ffmpeg": subprocess.check_output(["ffmpeg", "-version"], text=True).splitlines()[0],
        "clips": clips,
    }
    target = root / "manifest.json"
    temporary = target.with_suffix(".tmp")
    temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(target)
    print(f"{len(clips)} clipes conferidos em {target}.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=Path("data/fresh-sign"))
    parser.add_argument("--ca-file", type=Path, help="Bundle de CAs para verificação TLS dos downloads.")
    args = parser.parse_args()
    context = ssl.create_default_context(cafile=str(args.ca_file)) if args.ca_file else ssl.create_default_context()
    prepare(args.out, context)


if __name__ == "__main__":
    main()
