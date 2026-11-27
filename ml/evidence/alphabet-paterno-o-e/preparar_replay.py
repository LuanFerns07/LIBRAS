"""Prepara os recortes locais do ensaio de O e E de Uéslei Paterno."""

import argparse
from hashlib import file_digest
import json
from pathlib import Path
import subprocess


def sha256(path):
    with path.open("rb") as stream:
        return file_digest(stream, "sha256").hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    protocol_path = Path(__file__).with_name("protocolo.json")
    protocol = json.loads(protocol_path.read_text())
    reference = Path(protocol["sourceManifest"])
    if sha256(reference) != protocol["sourceManifestSha256"]:
        raise ValueError("Manifesto de origem diferente do protocolo.")
    sources = json.loads(reference.read_text())["sources"]
    source = next(item for item in sources if item["id"] == protocol["sourceId"])
    video = Path(source["file"])
    if source["split"] != "test" or sha256(video) != source["sha256"] or source["sha256"] != protocol["sourceSha256"]:
        raise ValueError("Partição ou vídeo diferente do protocolo.")

    args.out.mkdir(parents=True, exist_ok=True)
    results = []
    for window in protocol["windows"]:
        start = window["startMs"]
        duration = window["endMs"] - start
        for variant, filters in protocol["variants"].items():
            name = f"{window['id']}-{variant}"
            clip = args.out / f"{name}.mkv"
            filters = ",".join([*filters, "scale=640:360"])
            subprocess.run([
                "ffmpeg", "-nostdin", "-y", "-loglevel", "error",
                "-threads", "1", "-ss", f"{start / 1000:.3f}", "-i", str(video),
                "-an", "-t", f"{duration / 1000:.3f}",
                "-filter_threads", "1", "-vf", filters, "-pix_fmt", "yuv420p",
                "-c:v", "ffv1", "-threads", "1", str(clip),
            ], check=True)
            results.append({
                "id": name,
                "source": source["id"],
                "sourceWindow": window,
                "variant": variant,
                "file": str(clip),
                "sha256": sha256(clip),
                "split": source["split"],
                "windows": [{
                    "label": window["label"],
                    "startMs": 0,
                    "endMs": duration,
                    "anchorMs": window["anchorMs"] - start,
                }],
            })
    path = args.out / "replay-manifest.json"
    path.write_text(json.dumps({"sources": results, "protocolSha256": sha256(protocol_path)},
                               ensure_ascii=False, indent=2) + "\n")
    print(path)


if __name__ == "__main__":
    main()
