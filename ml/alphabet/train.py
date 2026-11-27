"""Treina e exporta o primeiro reconhecedor local de letras estáticas de Libras."""

import argparse
from hashlib import file_digest
import json
from pathlib import Path

import numpy as np
import onnxruntime
import torch
from torch import nn


FEATURES = 63
THRESHOLD = 0.80
SEED = 413


class AlphabetNet(nn.Module):
    def __init__(self, classes, geometry=False):
        super().__init__()
        self.geometry = geometry
        pairs = torch.triu_indices(21, 21, offset=1)
        self.register_buffer("a", pairs[0], persistent=False)
        self.register_buffer("b", pairs[1], persistent=False)
        self.classifier = nn.Sequential(
            nn.Linear(FEATURES + (pairs.shape[1] if geometry else 0), 128), nn.ReLU(), nn.Dropout(.1),
            nn.Linear(128, 96), nn.ReLU(), nn.Linear(96, classes),
        )

    def forward(self, values):
        if self.geometry:
            joint = values.reshape(-1, 21, 3)
            diff = joint.index_select(1, self.a) - joint.index_select(1, self.b)
            distances = diff.square().sum(dim=2).clamp_min(1e-8).sqrt()
            values = torch.cat((values, distances), dim=1)
        return self.classifier(values)


def checksum(path):
    with path.open("rb") as stream:
        return file_digest(stream, "sha256").hexdigest()


def centered(points, aspect=4 / 3):
    values = (points - points[:, :1]).copy()
    values[:, :, (0, 2)] *= aspect
    scale = np.maximum(np.linalg.norm(values[:, 9], axis=1),
                       np.linalg.norm(values[:, 5] - values[:, 17], axis=1))
    if not np.isfinite(values).all() or np.any(scale < 1e-4):
        raise ValueError("Pontos inválidos ou mão sem escala.")
    return values / scale[:, None, None]


def augment(values, random):
    output = values.clone()
    angle = (torch.rand(len(values), generator=random) * 2 - 1) * .20
    stretch = torch.rand(len(values), generator=random) * .52 + .76
    mirror = torch.where(torch.rand(len(values), generator=random) < .5, -1., 1.)
    x = values[:, :, 0] * (stretch * mirror)[:, None]
    y = values[:, :, 1]
    z = values[:, :, 2] * stretch[:, None]
    pitch = ((torch.rand(len(values), generator=random) * 2 - 1) * .32)[:, None]
    yaw = ((torch.rand(len(values), generator=random) * 2 - 1) * .32)[:, None]
    pitched_y = y * pitch.cos() - z * pitch.sin()
    pitched_z = y * pitch.sin() + z * pitch.cos()
    horizontal = x * yaw.cos() + pitched_z * yaw.sin()
    output[:, :, 0] = horizontal * angle.cos()[:, None] - pitched_y * angle.sin()[:, None]
    output[:, :, 1] = horizontal * angle.sin()[:, None] + pitched_y * angle.cos()[:, None]
    output[:, :, 2] = -x * yaw.sin() + pitched_z * yaw.cos()
    output.add_(torch.randn(values.shape, generator=random) * .012)
    return output.flatten(1)


def report(labels, targets, guesses, accepted):
    matrix = np.zeros((len(labels), len(labels) + 1), dtype=int)
    np.add.at(matrix, (targets, np.where(accepted, guesses, len(labels))), 1)
    true_positives = np.diag(matrix)
    support = matrix.sum(axis=1)
    predicted = matrix[:, :-1].sum(axis=0)
    macro = np.mean(2 * true_positives / np.maximum(support + predicted, 1))
    return {
        "rows": len(targets), "accepted": int(accepted.sum()),
        "correct": int(true_positives.sum()), "macroF1": float(macro),
        "matrix": matrix.tolist(),
    }


def reference_data(path, labels):
    sources = json.loads(path.read_text())["samples"]
    partition = {kind: ([], []) for kind in ("train", "val", "test")}
    for clip in sources:
        if clip["label"] not in labels:
            continue
        points, targets = partition[clip["split"]]
        for frame in clip["frames"]:
            hands = [hand for key in ("leftHand", "rightHand") if len(hand := frame[key]) == 21]
            if not hands or (len(hands) == 2 and abs(hands[0][9]["y"] - hands[1][9]["y"]) < .18):
                continue
            hand = min(hands, key=lambda item: item[9]["y"])
            xyz = np.array([[[joint[axis] for axis in "xyz"] for joint in hand]], np.float32)
            points.append(centered(xyz, frame["aspect"])[0])
            targets.append(labels.index(clip["label"]))
    return {kind: (np.asarray(features, np.float32).reshape(-1, 21, 3), np.asarray(targets, int))
            for kind, (features, targets) in partition.items()}


def train(source, output, epochs, device, reference=None, geometry=False):
    metadata = json.loads(source.with_suffix(".json").read_text())
    if checksum(source) != metadata["dataSha256"]:
        raise ValueError("Dados de treino diferentes do manifesto local.")
    with np.load(source, allow_pickle=False) as packed:
        features = centered(packed["points"])
        labels, targets = np.unique(packed["labels"], return_inverse=True)
        partitions = {name: packed["splits"] == name for name in ("train", "val", "test")}
        groups = {name: set(packed["groups"][mask]) for name, mask in partitions.items()}
    if (any(part.sum() == 0 or len(np.unique(targets[part])) != len(labels) for part in partitions.values())
            or sum(map(len, groups.values())) != len(set.union(*groups.values()))):
        raise ValueError("Partições vazias, incompletas ou com blocos repetidos.")

    torch.manual_seed(SEED)
    torch.set_num_threads(3)
    random = torch.Generator().manual_seed(SEED)
    model = AlphabetNet(len(labels), geometry).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=.002)
    training_part = features[partitions["train"]]
    training_target = targets[partitions["train"]]
    external = reference_data(reference, labels.tolist()) if reference else None
    if external:
        ref_x, ref_y = external["train"]
        if not len(ref_x) or not len(external["val"][0]):
            raise ValueError("A referência requer gravações separadas de treino e validação.")
        training_part = np.concatenate((training_part, np.repeat(ref_x, 32, axis=0)))
        training_target = np.concatenate((training_target, np.repeat(ref_y, 32)))
    training_x = torch.from_numpy(training_part)
    training_y = torch.from_numpy(training_target)
    validation_x = torch.from_numpy(features[partitions["val"]].reshape(-1, FEATURES))
    validation_y = targets[partitions["val"]]
    if external:
        ref_x, validation_y = external["val"]
        validation_x = torch.from_numpy(ref_x.reshape(-1, FEATURES))
    best = None
    for epoch in range(1, epochs + 1):
        model.train()
        for indices in torch.randperm(len(training_x), generator=random).split(128):
            batch = augment(training_x[indices], random).to(device)
            loss = nn.functional.cross_entropy(model(batch), training_y[indices].to(device))
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
        model.eval()
        with torch.inference_mode():
            probability = model(validation_x.to(device)).softmax(1).cpu().numpy()
        predicted = probability.argmax(axis=1)
        metrics = report(labels, validation_y, predicted, probability.max(axis=1) >= THRESHOLD)
        if best is None or metrics["macroF1"] > best[0]:
            best = metrics["macroF1"], epoch, {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}
        if epoch == 1 or epoch % 5 == 0:
            print(f"Época {epoch:02}: F1 validação {metrics['macroF1']:.4f}", flush=True)
    model.cpu().load_state_dict(best[2])
    model.eval()

    output.mkdir(parents=True, exist_ok=True)
    path = output / "alphabet.onnx"
    torch.onnx.export(model, torch.zeros(1, FEATURES), str(path), input_names=["hand"],
                      output_names=["logits"], dynamic_axes={"hand": {0: "frames"}, "logits": {0: "frames"}},
                      opset_version=17, dynamo=False)
    options = onnxruntime.SessionOptions()
    options.intra_op_num_threads = 1
    session = onnxruntime.InferenceSession(str(path), options, providers=["CPUExecutionProvider"])
    x = features.reshape(-1, FEATURES)
    results = {}
    for name in ("val", "test"):
        mask = partitions[name]
        logits, = session.run(["logits"], {"hand": x[mask]})
        with torch.inference_mode():
            reference_logits = model(torch.from_numpy(x[mask])).numpy()
        np.testing.assert_allclose(logits, reference_logits, rtol=2e-5, atol=2e-5)
        probability = torch.from_numpy(logits).softmax(1).numpy()
        results[name] = report(labels, targets[mask], probability.argmax(axis=1), probability.max(axis=1) >= THRESHOLD)
        results[name]["onnxMaxError"] = float(np.abs(logits - reference_logits).max())
    if external:
        for name in ("val", "test"):
            inputs, actual = external[name]
            if not len(inputs):
                continue
            logits, = session.run(["logits"], {"hand": inputs.reshape(-1, FEATURES)})
            probability = torch.from_numpy(logits).softmax(1).numpy()
            results["ufsm-" + name] = report(labels, actual, probability.argmax(axis=1),
                                              probability.max(axis=1) >= THRESHOLD)
            results["ufsm-" + name]["perLetter"] = {
                label: {"total": int((actual == index).sum()),
                        "correct": int((results["ufsm-" + name]["matrix"][index][index]))}
                for index, label in enumerate(labels) if (actual == index).any()
            }

    manifest = {
        "version": 1, "preprocess": "hand-wrist-palm-v1", "features": FEATURES, "labels": labels.tolist(),
        "threshold": THRESHOLD, "modelSha256": checksum(path), "source": metadata["source"],
    }
    evidence = {
        "manifest": manifest, "datasetSha256": metadata["dataSha256"], "seed": SEED, "epochs": epochs,
        "selectedEpoch": best[1], "device": device, "torch": torch.__version__, "geometry": geometry, "results": results,
        **({"referenceSha256": checksum(reference),
            "referenceTrainFrames": len(external["train"][0]), "referenceTrainRepeats": 32} if external else {}),
    }
    for name, value in (("alphabet.json", manifest), ("training.json", evidence)):
        (output / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    print({name: {key: result[key] for key in ("rows", "accepted", "correct", "macroF1")}
           for name, result in results.items()}, flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path("data/alphabet/static.npz"))
    parser.add_argument("--out", type=Path, default=Path("data/models/alphabet"))
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--device", choices=("cpu", "cuda"), default="cpu")
    parser.add_argument("--reference", type=Path, help="Pontos das gravações UFSM com partições separadas.")
    parser.add_argument("--geometry", action="store_true", help="Acrescenta distâncias entre articulações à rede.")
    args = parser.parse_args()
    if args.epochs <= 0:
        parser.error("Informe ao menos uma época.")
    train(args.data, args.out, args.epochs, args.device, args.reference, args.geometry)
