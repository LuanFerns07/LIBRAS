"""Separa o recorte MINDS expandido para a extração emparelhada com nariz."""

import argparse
from hashlib import file_digest, sha256
import json
from pathlib import Path, PurePosixPath
import re
from tempfile import NamedTemporaryFile


PARTITIONS = {
    "train": {1: 18, 2: 18, 3: 12, 4: 18, 5: 18, 6: 18, 7: 18},
    "val": {8: 18, 10: 18},
    "test": {9: 15, 11: 18, 12: 18},
}
OUTPUTS = {
    "face-train.json": ("train",),
    "face-validation.json": ("val",),
    "face-development.json": ("train", "val"),
}


def prepare(manifest_path):
    content = manifest_path.read_bytes()
    manifest = json.loads(content)
    if manifest["source"] != "10.5281/zenodo.2667329" or manifest["license"] != "CC-BY-4.0":
        raise ValueError("Fonte ou licença diferente do MINDS-Libras expandido.")

    groups = {partition: [] for partition in PARTITIONS}
    counts = {partition: dict.fromkeys(signers, 0) for partition, signers in PARTITIONS.items()}
    files, hashes, identities = set(), set(), set()
    for clip in manifest["clips"]:
        partition, signer = clip["partition"], clip["signer"]
        if type(signer) is not int or signer not in counts.get(partition, {}):
            raise ValueError(f"Pessoa {signer} na partição inválida {partition}.")

        filename = PurePosixPath(clip["file"]).name
        archive = f"Sinalizador{signer:02d}"
        recording = clip["recording"]
        if (clip["file"] != f"raw/{filename}" or type(recording) is not int
                or not filename.endswith(f"{archive}-{recording}.mp4")
                or clip["archive"] != f"{archive}.zip"
                or clip["member"] != f"{archive}/Canon/{filename}"):
            raise ValueError(f"Caminho ou origem inválidos para {clip['file']}.")

        digest = clip["sha256"]
        identity = (signer, clip["sourceLabel"], recording)
        if (not re.fullmatch(r"[0-9a-f]{64}", digest) or filename in files
                or digest in hashes or identity in identities):
            raise ValueError(f"Identidade ou SHA-256 inválido ou repetido para {filename}.")

        files.add(filename)
        hashes.add(digest)
        identities.add(identity)
        counts[partition][signer] += 1
        groups[partition].append(clip)

    if counts != PARTITIONS:
        raise ValueError(f"Contagens por pessoa diferentes do manifesto expandido: {counts}")

    raw_directory = manifest_path.parent / "raw"
    if raw_directory.is_symlink():
        raise ValueError(f"A pasta de clipes deve ser um diretório local: {raw_directory}")
    for partition in ("train", "val"):
        for clip in groups[partition]:
            path = manifest_path.parent / clip["file"]
            if path.is_symlink() or not path.is_file():
                raise ValueError(f"Clipe local ausente ou inválido: {path}")
            with path.open("rb") as video:
                if file_digest(video, "sha256").hexdigest() != clip["sha256"]:
                    raise ValueError(f"SHA-256 divergente para {path}.")

    source_digest = sha256(content).hexdigest()
    for filename, partitions in OUTPUTS.items():
        path = manifest_path.with_name(filename)
        clips = [clip for partition in partitions for clip in groups[partition]]
        subset = {**manifest, "parentManifestSha256": source_digest, "clips": clips}
        with NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as output:
            temporary_path = Path(output.name)
            try:
                json.dump(subset, output, ensure_ascii=False, indent=2)
                output.write("\n")
                output.close()
                temporary_path.replace(path)
            finally:
                temporary_path.unlink(missing_ok=True)
        print(f"{path} ({len(clips)} clipes)")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=Path("data/minds-expanded/manifest.json"))
    options = parser.parse_args()
    try:
        prepare(options.manifest)
    except (KeyError, OSError, TypeError, ValueError) as error:
        parser.exit(1, f"Erro ao preparar o recorte: {error}\n")


if __name__ == "__main__":
    main()
