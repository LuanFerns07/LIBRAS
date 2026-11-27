"""Avalia U nos quadros em que a confirmação de forma rejeitaria R."""

import argparse
import json
from pathlib import Path
from shutil import copyfile
from tempfile import TemporaryDirectory

import numpy as np
import onnxruntime as ort
import torch

from .diagnose_static import top_votes
from .probe_pq import read_clips
from .probe_qr import alphabet_model_files, export_confirmation, r_shape
from .probe_y import train, y_shape
from .supplement import load_model
from .train import FEATURES, checksum


U_LIMIT = .95
R_VETO = .20
R_CONFIRMATION = .95
TRAIN_SESSIONS = {"1527000916", "cecierj-13757", "unesp-222981"}


def u_shape(points):
    return torch.cat((y_shape(points), r_shape(points)), dim=1)


def export(base, output, metadata, model, features, recover_disagreement):
    if base.resolve() == output.resolve() or "worldU" in metadata:
        raise ValueError("Escolha uma base sem a confirmação de U e um destino separado.")
    if metadata.get("imageR", {}).get("vetoThreshold") != R_VETO:
        raise ValueError("A base deve usar o limiar do veto de R avaliado neste ensaio.")
    configuration = {**metadata, "imageR": {**metadata["imageR"], "recoverDisagreement": recover_disagreement}}
    output.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=output) as directory:
        folder = Path(directory)
        configuration["worldU"] = export_confirmation(
            model, features, folder / "alphabet-u-world.onnx", "world", "hand-world-wrist-palm-v1", U_LIMIT,
        )
        for filename, digest in alphabet_model_files(metadata):
            copyfile(load_model(base, filename, digest), folder / filename)
        for asset in folder.iterdir():
            asset.replace(output / asset.name)
        (folder / "alphabet.json").write_text(json.dumps(configuration, indent=2) + "\n")
        (folder / "alphabet.json").replace(output / "alphabet.json")
    return {key: configuration[key] for key in ("imageR", "worldU")}


def probe(base, complement, references, output=None, recover_disagreement=False):
    metadata = json.loads((base / "alphabet.json").read_text())
    r_info = json.loads((complement / "alphabet.json").read_text())["imageR"]
    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    primary, verifier, r_model = [
        ort.InferenceSession(load_model(folder, filename, digest), options, providers=["CPUExecutionProvider"])
        for folder, filename, digest in (
            (base, "alphabet.onnx", metadata["modelSha256"]),
            (base, "alphabet-check.onnx", metadata["agreementSha256"]),
            (complement, "alphabet-r-shape.onnx", r_info["modelSha256"]),
        )
    ]
    torch.set_num_threads(2)
    clips = list(read_clips(references))
    training = [(clip, image, world) for clip, image, world in clips if clip["source"] in TRAIN_SESSIONS]
    models = {name: train([(entry[0], entry[index]) for entry in training], "U", u_shape)
              for name, index in (("image", 1), ("world", 2))}
    labels = np.array(metadata["labels"])
    rows = []
    for clip, image, world in clips:
        if clip["source"] in TRAIN_SESSIONS:
            continue
        inputs = {"hand": image.reshape(-1, FEATURES)}
        first, first_ok = top_votes(primary, inputs, labels, metadata["threshold"])
        second, second_ok = top_votes(verifier, inputs, labels, metadata["threshold"])
        r_scores = r_model.run(["scores"], inputs)[0].ravel()
        r_vetoed = first_ok & second_ok & (first == "R") & (second == "R") & (r_scores < R_VETO)
        r_disagreement = first_ok & (first == "R") & (second == "U") & (r_scores >= R_CONFIRMATION)
        if clip["label"] not in ("R", "U") and not (r_vetoed | r_disagreement).any():
            continue
        row = {key: clip[key] for key in ("source", "split", "label", "startMs", "endMs")}
        row.update(frames=len(image), rVetoed=int(r_vetoed.sum()), rInDisagreement=int(r_disagreement.sum()))
        for name, points in (("image", image), ("world", world)):
            with torch.inference_mode():
                scores = models[name](torch.from_numpy(points)).numpy().ravel()
            confirmed = scores >= U_LIMIT
            row[name] = {"shapeVotes": int(confirmed.sum()), "newU": int((confirmed & r_vetoed).sum())}
        rows.append(row)
    report = {
        "references": [checksum(path) for path in references],
        "rShapeSha256": r_info["modelSha256"], "trainingU": sum(clip["label"] == "U" for clip, _, _ in training),
        "trainingOther": sum(clip["label"] != "U" for clip, _, _ in training),
        "trainingSources": sorted(TRAIN_SESSIONS), "uLimit": U_LIMIT, "rVeto": R_VETO,
        "rConfirmation": R_CONFIRMATION, "results": rows,
    }
    if output:
        if metadata.get("imageR", {}).get("modelSha256") != r_info["modelSha256"]:
            raise ValueError("A base deve usar o mesmo complemento de R empregado no ensaio.")
        features = np.concatenate([world for _, _, world in clips]).reshape(-1, FEATURES)
        report["confirmation"] = export(base, output, metadata, models["world"], features, recover_disagreement)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("complement", type=Path)
    parser.add_argument("references", type=Path, nargs="+")
    parser.add_argument("--out", type=Path, help="Pasta para os modelos com a confirmação de U.")
    parser.add_argument("--recover-r-disagreement", action="store_true", help="Ativa a confirmação de R na divergência R/U.")
    args = parser.parse_args()
    if args.recover_r_disagreement and not args.out:
        parser.error("Informe o destino dos modelos em --out.")
    print(json.dumps(probe(args.base, args.complement, args.references, args.out, args.recover_r_disagreement),
                     ensure_ascii=False, indent=2))
