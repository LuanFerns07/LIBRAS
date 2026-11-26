"""Congela a média de dois classificadores compatíveis e confirma paridade em validação."""

import argparse
import math
from pathlib import Path

import torch

from dataset import digest, load_features, write_json
from evaluate import create_session, run_inference, verified_inputs, write_parity_fixture
from metrics import choose_threshold, measure
from model import ARCHITECTURES
from train import collect, export


class ProbabilityAverage(torch.nn.Module):
    def __init__(self, models):
        super().__init__()
        self.models = torch.nn.ModuleList(models)
        self.raw_features = models[0].raw_features

    def forward(self, frames):
        scores = torch.stack([model(frames).log_softmax(dim=1) for model in self.models], dim=0)
        return torch.logsumexp(scores, dim=0) - math.log(len(self.models))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--features", type=Path, default=Path("data/minds-expanded/features/index.json"))
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("runs", type=Path, nargs=2)
    args = parser.parse_args()
    torch.set_num_threads(1)
    records = [verified_inputs(args.features, run) for run in args.runs]
    manifest = records[0][1].copy()
    fields = ("labels", "preprocess", "frames", "features", "extratorSha256", "inputName", "outputName", "source", "license")
    if any(manifest[field] != records[1][1][field] for field in fields):
        raise ValueError("Os modelos precisam do mesmo catálogo, licença e contrato de entrada e saída.")
    if args.out.resolve() in {run.resolve() for run in args.runs}:
        raise ValueError("Use um diretório de saída separado dos modelos de entrada.")
    labels = tuple(manifest["labels"])
    _, rows = load_features(args.features, {"val"}, labels)
    components = []
    members = []
    for training, info, paths in records:
        component = ARCHITECTURES[training["arch"]](len(labels)).eval()
        component.load_state_dict(torch.load(paths["checkpointSha256"], map_location="cpu", weights_only=True))
        components.append(component)
        members.append({"architecture": training["arch"], "modelSha256": info["modelSha256"],
                        "checkpointSha256": training["checkpointSha256"]})
    model = ProbabilityAverage(components).eval()
    _, threshold, _ = choose_threshold(rows, collect(model, rows, "cpu"), labels)
    args.out.mkdir(parents=True, exist_ok=True)
    onnx_path = export(model, args.out)
    session, _ = create_session(onnx_path, labels, manifest["features"])
    logits, error, _ = run_inference(rows, model, session, threshold)
    metrics, _ = measure(rows, logits, threshold, labels)
    manifest.update(threshold=threshold, modelSha256=digest(onnx_path))
    write_json(args.out / "isolated.json", manifest)
    write_json(args.out / "validation-evaluation.json", {
        "evaluationSplit": "val", "rule": "média das probabilidades", "members": members,
        "featuresManifestSha256": digest(args.features), "modelSha256": manifest["modelSha256"],
        "threshold": threshold, "results": metrics, "onnxParity": {
            "samples": len(logits), "maxAbsLogitError": error, "differencesInDecision": 0,
        },
    })
    write_parity_fixture(args.out / "parity-web.json", rows, logits, threshold, labels)
    print(f"Combinação exportada com limiar {threshold:.3f} e paridade em {len(logits)} entradas.")


if __name__ == "__main__":
    main()
