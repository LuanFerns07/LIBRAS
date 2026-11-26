"""Reproduz as janelas parciais negativas da partição original de treino."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from fractions import Fraction
from hashlib import file_digest
import json
from pathlib import Path
import re
import subprocess
from tempfile import TemporaryDirectory


MANIFEST_SHA256 = "3e3e171602f17138ad2ba251a34f2d13a2f545ddd525ed650b945fb40ecc70be"
SOURCE = "10.5281/zenodo.2667329"
LICENSE = "CC-BY-4.0"
WINDOWS = ("prefix", "suffix")
FRACTION = Decimal("0.6")


def checksum(path):
    with path.open("rb") as stream:
        return file_digest(stream, "sha256").hexdigest()


def load_parents(path):
    if checksum(path) != MANIFEST_SHA256:
        raise ValueError("O manifesto não corresponde ao MINDS expandido fixado.")
    manifest = json.loads(path.read_text(encoding="utf-8"))
    parents = [clip for clip in manifest["clips"] if clip["partition"] == "train" and clip["label"] is None]
    if (manifest["source"] != SOURCE or manifest["license"] != LICENSE
            or len(parents) != 42 or len({clip["sha256"] for clip in parents}) != 42
            or {clip["signer"] for clip in parents} != set(range(1, 8))):
        raise ValueError("A seleção precisa conter os 42 negativos originais de treino de sete pessoas.")
    return parents


def parent_path(directory, clip):
    path = (directory / clip["file"]).resolve()
    if (not path.is_relative_to(directory) or path.suffix.lower() != ".mp4"
            or not re.fullmatch("[a-f0-9]{64}", clip["sha256"])):
        raise ValueError("Caminho ou hash da gravação original inválido.")
    if checksum(path) != clip["sha256"]:
        raise ValueError(f"SHA-256 não confere em {clip['file']}.")
    return path


def video_stream(path):
    result = subprocess.run([
        "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
        "stream=duration,avg_frame_rate,width,height", "-of", "json", str(path),
    ], check=True, capture_output=True, text=True)
    stream, = json.loads(result.stdout)["streams"]
    duration = Decimal(stream["duration"])
    rate = Fraction(stream["avg_frame_rate"])
    if duration <= 0 or rate <= 0:
        raise ValueError(f"Vídeo sem duração ou taxa utilizável em {path}.")
    return duration, rate, (stream["width"], stream["height"])


def interval(duration, window):
    if window == "prefix":
        return Decimal(0), duration * FRACTION
    if window == "suffix":
        return duration * (1 - FRACTION), duration
    raise ValueError("Posição de recorte inválida.")


def encode(path, output, start, duration):
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-xerror",
        "-threads", "1", "-ss", f"{start:.6f}", "-i", str(path), "-t", f"{duration:.6f}",
        "-map", "0:v:0", "-an", "-sn", "-dn", "-map_metadata", "-1", "-c:v", "libx264",
        "-threads", "1", "-preset", "ultrafast", "-crf", "18", "-pix_fmt", "yuv420p",
        "-fps_mode", "passthrough", "-movflags", "+faststart", str(output),
    ], check=True)


def recrop(directory, output, parent):
    path = parent_path(directory, parent)
    duration, rate, resolution = video_stream(path)
    tolerance = Decimal(rate.denominator) / rate.numerator + Decimal("0.001")
    results = []
    with TemporaryDirectory(dir=output) as temporary:
        for window in WINDOWS:
            start, end = interval(duration, window)
            name = f"{parent['sha256']}-{window}.mp4"
            pending = Path(temporary) / name
            encode(path, pending, start, end - start)
            length, _, dimensions = video_stream(pending)
            if abs(length - (end - start)) > tolerance or dimensions != resolution:
                raise ValueError(f"Duração ou resolução inesperada em {parent['file']} ({window}).")
            sha256 = checksum(pending)
            pending.replace(output / name)
            results.append({
                "file": f"raw-negative/{name}",
                "label": parent["label"],
                "sourceLabel": parent["sourceLabel"],
                "partition": parent["partition"],
                "signer": parent["signer"],
                "sha256": sha256,
                "parentSha256": parent["sha256"],
                "parentFile": parent["file"],
                "window": window,
                "startMs": float(start * 1000),
                "endMs": float(end * 1000),
                "parentDurationMs": float(duration * 1000),
                "durationMs": float(length * 1000),
            })
    return results


def prepare(manifest_path, destination, workers):
    parents = load_parents(manifest_path)
    directory = manifest_path.parent.resolve()
    output = destination.parent / "raw-negative"
    output.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        groups = pool.map(lambda clip: recrop(directory, output, clip), parents)
        clips = [clip for pair in groups for clip in pair]
    hashes = {clip["sha256"] for clip in clips}
    if len(hashes) != 84 or hashes & {parent["sha256"] for parent in parents}:
        raise ValueError("As janelas não são distintas entre si e das gravações originais.")
    manifest = {
        "source": SOURCE,
        "license": LICENSE,
        "parentManifestSha256": MANIFEST_SHA256,
        "protocol": "minds-train-negative-boundaries-v1",
        "transform": {
            "fraction": float(FRACTION), "speed": 1, "audio": False,
            "ffmpeg": subprocess.check_output(["ffmpeg", "-version"], text=True).splitlines()[0],
        },
        "clips": clips,
    }
    with TemporaryDirectory(dir=destination.parent) as temporary:
        pending = Path(temporary) / destination.name
        pending.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        pending.replace(destination)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=Path("data/minds-expanded/manifest.json"))
    parser.add_argument("--out", type=Path, default=Path("data/minds-partial/manifest-negatives.json"))
    parser.add_argument("--workers", type=int, choices=(1, 2), default=2)
    args = parser.parse_args()
    manifest = prepare(args.input, args.out, args.workers)
    print(f"{len(manifest['clips'])} janelas em {args.out}. SHA-256 {checksum(args.out)}")


if __name__ == "__main__":
    main()
