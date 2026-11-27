"""Compara a configuração de Y nas coordenadas da imagem e da mão em 3D."""

import argparse
import json
from itertools import groupby
from pathlib import Path
from shutil import copyfile
from tempfile import TemporaryDirectory

import numpy as np
import torch
from torch.nn.functional import normalize

from .probe_as import fit_linear
from .probe_pq import read_clips
from .probe_qr import ShapeConfirmation, alphabet_model_files, export_confirmation
from .refine_o import shape_features
from .supplement import load_model
from .train import FEATURES, checksum


TRAIN_SESSIONS = {"1527000916", "cecierj-13757", "unesp-222981"}
THRESHOLD = .95


def y_shape(points):
    palm_side = normalize(points[:, 5] - points[:, 17], dim=1, eps=.05)
    palm_forward = normalize(points[:, 9] - points[:, 0], dim=1, eps=.05)
    thumb = points[:, 4] - points[:, 5]
    little = points[:, 20] - points[:, 17]
    shape = shape_features(points)
    placement = torch.stack((
        (thumb * palm_side).sum(dim=1),
        (little * palm_side).sum(dim=1),
        (thumb * palm_forward).sum(dim=1),
        (little * palm_forward).sum(dim=1),
        torch.linalg.vector_norm(little, dim=1),
    ), dim=1)
    return torch.cat((shape, placement), dim=1)


def train(examples, label="Y", measure=y_shape):
    # O mesmo número de quadros por recorte preserva o peso das demonstrações curtas.
    sampled = [points[np.linspace(0, len(points) - 1, 16).round().astype(int)] for _, points in examples]
    points = torch.from_numpy(np.concatenate(sampled))
    target = np.repeat([clip["label"] == label for clip, _ in examples], 16)
    return ShapeConfirmation(measure, *fit_linear(measure(points), target)).eval()


def export(base, output, model, features):
    metadata = json.loads((base / "alphabet.json").read_text())
    if base.resolve() == output.resolve() or "imageY" in metadata:
        raise ValueError("Use uma base sem o complemento de Y e um destino separado.")
    output.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=output) as temporary:
        folder = Path(temporary)
        confirmation = export_confirmation(model, features, folder / "alphabet-y-shape.onnx",
                                           "hand", "hand-wrist-palm-v1", THRESHOLD)
        for filename, digest in alphabet_model_files(metadata):
            copyfile(load_model(base, filename, digest), folder / filename)
        for asset in folder.iterdir():
            asset.replace(output / asset.name)
        (folder / "alphabet.json").write_text(json.dumps({**metadata, "imageY": confirmation}, indent=2) + "\n")
        (folder / "alphabet.json").replace(output / "alphabet.json")
    return confirmation


def probe(references, base=None, output=None):
    torch.set_num_threads(2)
    clips = list(read_clips(references))
    experiments = {"image": 1, "world": 2}
    training = [entry for entry in clips if entry[0]["source"] in TRAIN_SESSIONS]
    models = {name: train([(entry[0], entry[index]) for entry in training]) for name, index in experiments.items()}
    rows = []
    for entry in clips:
        clip = entry[0]
        if clip["source"] in TRAIN_SESSIONS:
            continue
        row = {key: clip[key] for key in ("source", "split", "label", "startMs", "endMs")}
        row["frames"] = len(entry[1])
        for name, index in experiments.items():
            with torch.inference_mode():
                scores = models[name](torch.from_numpy(entry[index])).numpy().ravel()
            hits = scores >= THRESHOLD
            run = max((sum(1 for _ in group) for hit, group in groupby(hits) if hit), default=0)
            row[name] = {"median": round(float(np.median(scores)), 6), "votes": int(hits.sum()), "run": run}
        rows.append(row)
    report = {
        "references": [checksum(path) for path in references],
        "trainingSources": sorted(TRAIN_SESSIONS),
        "trainingY": sum(clip["label"] == "Y" for clip, _, _ in training),
        "trainingOther": sum(clip["label"] != "Y" for clip, _, _ in training),
        "threshold": THRESHOLD, "results": rows,
    }
    if output is not None:
        image = np.concatenate([entry[1] for entry in clips]).reshape(-1, FEATURES)
        report["baseManifestSha256"] = checksum(base / "alphabet.json")
        report["confirmation"] = export(base, output, models["image"], image)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("references", type=Path, nargs="+")
    parser.add_argument("--base", type=Path, help="Pasta de modelos da prévia usada na comparação.")
    parser.add_argument("--out", type=Path, help="Pasta para os modelos com a confirmação de Y.")
    args = parser.parse_args()
    if bool(args.base) != bool(args.out):
        parser.error("Para exportar, informe --base e --out juntos.")
    print(json.dumps(probe(args.references, args.base, args.out), ensure_ascii=False, indent=2))
