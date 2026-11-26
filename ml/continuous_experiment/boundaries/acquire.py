"""Prepara os recortes iniciais de câmeras e anotações públicas da UFSC."""

import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import ssl
import subprocess
from urllib.parse import quote
from urllib.request import urlopen
from xml.etree import ElementTree


SOURCES = Path(__file__).with_name("sources.json")
CORPUS = "https://corpuslibras.ufsc.br/dados/dado/download"
MEDIA = (
    "https://videos.nals.cce.ufsc.br/Corpus Libras/Projeto Inventario de Libras - "
    "Região Metropolitana de Florianopolis-sc/Produção/Grupo 1/"
)
BEFORE = {321, 322, 323, 324, 325}
PARTITIONS = {"train", "dev", "test"}


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def load_sources(path=SOURCES):
    source = json.loads(path.read_text(encoding="utf-8"))
    dyads = {}
    participants = {}
    seen = set()
    for case in source["cases"]:
        split = case["split"]
        if split not in PARTITIONS or case["id"] in seen:
            raise ValueError("Partição ou id de entrada inválido.")
        seen.add(case["id"])
        if split == "test" and (case["id"] in BEFORE or case["dyad"] == 1):
            raise ValueError("Dados do experimento anterior aparecem no teste.")
        if dyads.setdefault(case["dyad"], split) != split:
            raise ValueError("Uma dupla aparece em partições diferentes.")
        for person in case["catalog_participants"]:
            if participants.setdefault(person, split) != split:
                raise ValueError("Um participante do acervo cruza as partições.")
    if set(dyads.values()) != PARTITIONS:
        raise ValueError("As três partições precisam ter ao menos uma dupla.")
    return source


def video_name(case, camera):
    return f"FLN_G1_D{case['dyad']}_{case['interview']}entrevista_VIDEO{camera}.mp4"


def valid_clip(path, seconds):
    if not path.is_file():
        return False
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=False,
    )
    try:
        return probe.returncode == 0 and float(probe.stdout.strip()) >= seconds
    except ValueError:
        return False


def media_url(case, filename):
    path = f"Dupla {case['dyad']}/1. Entrevista/{filename}"
    return quote(MEDIA + path, safe=":/-.%")


def acquire(case, source, output, ca_bundle):
    filename = video_name(case, source["camera"])
    eaf_url = f"{CORPUS}/{case['id']}/{quote(case['eaf'])}?custom=1"
    videos_url = media_url(case, filename)
    eaf = output / f"{case['id']}.eaf"
    video = output / filename
    if not eaf.exists():
        with urlopen(eaf_url, timeout=25, context=ssl.create_default_context()) as response:
            payload = response.read(6_000_001)
        if len(payload) > 6_000_000:
            raise ValueError("Anotação ELAN maior que o esperado.")
        document = ElementTree.fromstring(payload)
        if document.tag != "ANNOTATION_DOCUMENT":
            raise ValueError("A resposta não é uma anotação ELAN.")
        eaf.write_bytes(payload)
    root = ElementTree.parse(eaf).getroot()
    if not any(entry.attrib.get("MEDIA_URL", "").endswith("/" + filename)
               for entry in root.findall("./HEADER/MEDIA_DESCRIPTOR")):
        raise ValueError(f"Câmera ausente da anotação original {case['id']}.")

    if not valid_clip(video, source["seconds"]):
        temporary = video.with_suffix(".partial.mp4")
        options = ["-ca_file", str(ca_bundle)] if ca_bundle else []
        try:
            subprocess.run(
                ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error",
                 "-rw_timeout", "25000000", "-tls_verify", "1", *options, "-i", videos_url,
                 "-map", "0:v:0", "-t", str(source["seconds"] + 0.2), "-c", "copy",
                 "-y", str(temporary)], check=True, timeout=240,
            )
            if not valid_clip(temporary, source["seconds"]):
                raise ValueError(f"Recorte de vídeo incompleto: {filename}.")
            temporary.replace(video)
        finally:
            temporary.unlink(missing_ok=True)
    result = {
        **case,
        "annotation": eaf.name,
        "video": filename,
        "tier": source["tier"],
        "seconds": source["seconds"],
        "annotation_url": eaf_url,
        "video_url": videos_url,
        "annotation_sha256": digest(eaf),
        "video_prefix_sha256": digest(video),
        "bytes_video": video.stat().st_size,
    }
    print(f"{case['id']} {case['split']}: {filename}, {result['bytes_video']} bytes", flush=True)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--ca-bundle", type=Path, help="Cadeia TLS local, se o servidor não enviar os intermediários.")
    args = parser.parse_args()
    source = load_sources()
    args.output.mkdir(parents=True, exist_ok=True)

    def fetch(case):
        return acquire(case, source, args.output, args.ca_bundle)

    with ThreadPoolExecutor(max_workers=2) as pool:
        cases = list(pool.map(fetch, source["cases"]))
    target = args.output / "media.json"
    target.write_text(json.dumps(cases, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
