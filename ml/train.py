"""Treina no MINDS-Libras, calibra em validação e exporta ONNX estático."""

import argparse
import copy
import os
from pathlib import Path
import platform
import sys

os.environ.setdefault("CUBLAS_WORKSPACE_CONFIG", ":4096:8")

import numpy as np
import onnx
import torch

from dataset import CATALOGS, FEATURE_COUNTS, FEATURES, FRAMES, LABELS, add_training_positives, digest, load_features, write_json
from metrics import checks, choose_threshold
from model import ARCHITECTURES
from partial_negatives import load_partial_negatives

SEED = 7391


def augment(inputs, random):
    width = inputs.shape[-1]
    shaped = inputs.reshape(-1, FRAMES, width // 4, 4).clone()
    # Espelha o sinal inteiro e troca os lados anatômicos.
    mirror = torch.rand(len(shaped), generator=random) < 0.5
    permutation = [1, 0, 3, 2, 5, 4, *range(27, 48), *range(6, 27)]
    if width > FEATURES:
        permutation.append(48)
    shaped[mirror] = shaped[mirror][:, :, permutation]
    shaped[mirror, :, :, 0] *= -1

    # Pequenas variações de escala em torno do referencial dos ombros.
    scale = .9 + .2 * torch.rand((len(shaped), 1, 1, 1), generator=random)
    noise = 0.012 * torch.randn(shaped[:, :, :, :3].shape, generator=random)
    shaped[:, :, :, :3] = (shaped[:, :, :, :3] * scale + noise) * shaped[:, :, :, 3:]
    return shaped.reshape(-1, FRAMES, width)


def collect(model, rows, device):
    eligible = [row for row in rows if row.values is not None]
    if not eligible:
        return {}
    values = np.stack([row.values for row in eligible])
    model.eval()
    with torch.inference_mode():
        predictions = model(torch.from_numpy(values).to(device)).cpu().numpy()
    return {row.index: output for row, output in zip(eligible, predictions, strict=True)}


def train(rows, device, epochs, batch_size, seed, catalog=LABELS, arch="ConvSequence", partial_negatives=None):
    torch.manual_seed(seed)
    torch.use_deterministic_algorithms(True)
    random = torch.Generator().manual_seed(seed)
    validation = [row for row in rows if row.partition == "val"]
    examples = [row for row in rows if row.partition == "train" and row.values is not None]
    features = torch.from_numpy(np.stack([row.values for row in examples]))
    if features.shape[-1] != ARCHITECTURES[arch].raw_features:
        raise ValueError(f"A arquitetura {arch} exige {ARCHITECTURES[arch].raw_features} canais por quadro.")
    variants = []
    for position, example in enumerate(examples):
        pair = (partial_negatives or {}).get(example.index, {})
        if not pair:
            continue
        if example.label != 0:
            raise ValueError("Somente exemplos negativos podem receber recortes de treino.")
        choices = [clip.values for clip in pair.values() if clip.values is not None]
        if choices:
            variants.append((position, torch.from_numpy(np.stack([example.values, *choices]))))
    variant_random = torch.Generator().manual_seed(seed + 1)
    labels = torch.tensor([row.label for row in examples], dtype=torch.long)
    counts = torch.bincount(labels, minlength=len(catalog))
    if not bool(counts.all()):
        raise ValueError(f"Classes sem amostras elegíveis no treino: {counts.tolist()}")
    weights = counts.float().rsqrt()
    weights /= weights.mean()
    criterion = torch.nn.CrossEntropyLoss(weight=weights.to(device))
    model = ARCHITECTURES[arch](len(catalog)).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.002, weight_decay=0.01)
    best = None
    history = []

    for epoch in range(1, epochs + 1):
        losses = []
        model.train()
        epoch_features = features
        if variants:
            epoch_features = features.clone()
            for position, choices in variants:
                index = torch.randint(len(choices), (), generator=variant_random).item()
                epoch_features[position] = choices[index]
        permutation = torch.randperm(len(examples), generator=random)
        for indices in permutation.split(batch_size):
            optimizer.zero_grad(set_to_none=True)
            input_values = augment(epoch_features[indices], random).to(device)
            loss = criterion(model(input_values), labels[indices].to(device))
            loss.backward()
            optimizer.step()
            losses.append(float(loss.detach()))
        score, threshold, validation_metrics = choose_threshold(validation, collect(model, validation, device), catalog)
        history.append({
            "epoch": epoch, "trainLoss": float(np.mean(losses)), "threshold": threshold,
            "validationF1Macro": validation_metrics["f1Macro"],
            "validationFalseAcceptance": validation_metrics["falseAcceptance"]["rate"],
            "validationCoverage": validation_metrics["coverage"]["rate"],
        })
        if best is None or score > best["score"]:
            best = {
                "score": score, "epoch": epoch, "threshold": threshold, "validation": validation_metrics,
                "weights": copy.deepcopy(model.state_dict()),
            }
        if epoch == 1 or epoch % 10 == 0:
            print(f"época {epoch:3d} perda={np.mean(losses):.3f} F1 validação={validation_metrics['f1Macro']:.3f}", flush=True)

    model.load_state_dict(best["weights"])
    return model.cpu().eval(), best, history, counts.tolist()


def export(model, output):
    onnx_path = output / "isolated.onnx"
    temporary = output / "isolated.onnx.tmp"
    with torch.inference_mode():
        torch.onnx.export(
            model, torch.zeros(1, FRAMES, model.raw_features), str(temporary),
            input_names=["landmarks"], output_names=["logits"], opset_version=17, dynamo=False,
        )
    onnx.checker.check_model(onnx.load(temporary))
    temporary.replace(onnx_path)
    return onnx_path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--features", type=Path, default=Path("data/minds/features/index.json"))
    parser.add_argument("--out", type=Path, default=Path("data/models/isolated-v1"))
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--batch-size", type=int, default=12)
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument("--device", choices=("auto", "cpu", "cuda"), default="auto")
    parser.add_argument("--catalogo", choices=tuple(CATALOGS), default="inicial")
    parser.add_argument("--arch", choices=tuple(ARCHITECTURES), default="ConvSequence")
    parser.add_argument("--partial-negatives", type=Path,
                        help="Usa janelas temporais de negativos como alternativas de treino.")
    parser.add_argument("--extra-positives", type=Path, help="Inclui quartas gravações de pessoas do treino.")
    args = parser.parse_args()
    if args.epochs <= 0 or args.batch_size <= 0:
        parser.error("Épocas e tamanho de lote devem ser positivos.")
    if args.device == "cuda" and not torch.cuda.is_available():
        parser.error("CUDA não está disponível nesta instalação do PyTorch.")
    device = "cuda" if args.device == "auto" and torch.cuda.is_available() else (
        args.device if args.device != "auto" else "cpu"
    )
    torch.set_num_threads(min(4, os.cpu_count() or 1))
    catalog = CATALOGS[args.catalogo]
    index, data = load_features(args.features, {"train", "val"}, catalog)
    partial, provenance = (None, None)
    extra = None
    if args.partial_negatives is not None:
        partial, provenance = load_partial_negatives(args.partial_negatives, index, data, catalog)
    if args.extra_positives is not None:
        data, extra = add_training_positives(args.extra_positives, index, data, catalog)
    print(f"Treino no dispositivo {device} com Torch {torch.__version__}.", flush=True)
    model, best, history, counts = train(data, device, args.epochs, args.batch_size, args.seed, catalog, args.arch, partial)
    args.out.mkdir(parents=True, exist_ok=True)
    checkpoint = args.out / "isolated.pt"
    torch.save(model.state_dict(), checkpoint)
    onnx_path = export(model, args.out)
    manifest = {
        "preprocess": index["preprocess"], "frames": FRAMES, "features": FEATURE_COUNTS[index["preprocess"]],
        "inputName": "landmarks", "outputName": "logits", "labels": list(catalog),
        "threshold": best["threshold"], "modelSha256": digest(onnx_path),
        "extratorSha256": index["modelSha256"], "license": "CC-BY-4.0",
        "source": "https://doi.org/10.5281/zenodo.2667329",
        "status": "exploratório",
    }
    write_json(args.out / "isolated.json", manifest)
    write_json(args.out / "training.json", {
        "arch": args.arch, "onnxOpset": 17, "seed": args.seed, "epochs": args.epochs,
        "batchSize": args.batch_size, "optimizer": {"type": "AdamW", "learningRate": .002, "weightDecay": .01},
        "device": device, "cuda": torch.version.cuda, "gpu": torch.cuda.get_device_name() if device == "cuda" else None,
        "labels": list(catalog),
        "platform": platform.platform(), "python": sys.version.split()[0], "torch": torch.__version__,
        "numpy": np.__version__, "onnx": onnx.__version__, "eligibleTrainCounts": counts,
        "selectedEpoch": best["epoch"], "checkpointSha256": digest(checkpoint),
        "datasetManifestSha256": index["sourceManifestSha256"],
        "featuresManifestSha256": digest(args.features), "modelManifestSha256": digest(args.out / "isolated.json"),
        "modelSha256": manifest["modelSha256"], "validation": best["validation"],
        "validationChecks": checks(best["validation"]), "history": history,
        **({"partialNegatives": provenance} if provenance is not None else {}),
        **({"extraPositives": extra} if extra is not None else {}),
    })
    print(f"ONNX exportado em {onnx_path}, época {best['epoch']} e limiar {best['threshold']:.6f}.")


if __name__ == "__main__":
    main()
