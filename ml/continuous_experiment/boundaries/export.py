"""Exporta o detector temporal supervisionado e verifica a paridade local do ONNX."""

import argparse
from dataclasses import asdict
import json
from math import isfinite
from pathlib import Path
from tempfile import TemporaryDirectory

import numpy as np
import onnx
import onnxruntime as ort
import torch
from torch import nn

from .acquire import digest
from .decode import DecodeConfig, decode
from .extract import SAMPLE_MS
from .model import BoundaryModel, features


FEATURE_COUNT = 260
OPSET = 17
INPUT_NAME = "features"
OUTPUT_NAME = "probabilities"
MODEL_NAME = "boundary-model.onnx"
ATOL = 1e-5
RTOL = 1e-5


class BoundaryGraph(nn.Module):
    def __init__(self, network, mean, std):
        super().__init__()
        self.network = network
        self.register_buffer("mean", mean)
        self.register_buffer("std", std)

    def forward(self, values):
        normalized = (values.T.unsqueeze(0) - self.mean) / self.std
        return torch.sigmoid(self.network(normalized)).squeeze(0).T


def synthetic_hands(length, seed):
    rng = np.random.default_rng(seed)
    offsets = rng.uniform(-0.04, 0.04, (2, 21, 3)).astype(np.float32)
    offsets[:, 0, :] = 0
    offsets[:, (5, 17), 0] = [-0.04, 0.04]
    offsets[0] *= 0.5
    points = np.broadcast_to(offsets, (length, 2, 21, 3)).copy()
    time = np.arange(length, dtype=np.float32)
    points[..., 0] += (0.5 + 0.12 * np.sin(time / 3))[:, None, None]
    points[..., 1] += (0.5 + 0.10 * np.cos(time / 5))[:, None, None]
    points[:, 1, :, 0] += 0.15
    # Simula uma mudança brusca de profundidade no indicador esquerdo.
    points[:, 0, 8, 2] -= 0.6 * (np.clip(np.sin(time / 2), -0.5, 0.5) + 0.5)
    points[::9, 0] = np.nan
    points[5::13, 1] = np.nan
    return points


def verify(graph, model_path, prior, decoder, controls):
    onnx.checker.check_model(str(model_path), full_check=True)
    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(model_path), options, providers=["CPUExecutionProvider"])
    max_error = 0.0
    fixtures = []
    lengths = (2, 17, 61, 600)
    with torch.inference_mode():
        for length in lengths:
            points = synthetic_hands(length, seed=2845 + length)
            design = features(points)
            expected = graph(torch.from_numpy(design)).numpy()
            (actual,) = session.run([OUTPUT_NAME], {INPUT_NAME: design})
            np.testing.assert_allclose(actual, expected, atol=ATOL, rtol=RTOL, equal_nan=False)
            max_error = max(max_error, float(np.max(np.abs(actual - expected))))
            times = np.arange(length) * SAMPLE_MS
            segments = decode(times, expected, prior, decoder, **controls)
            if decode(times, actual, prior, decoder, **controls) != segments:
                raise ValueError(f"Os intervalos ONNX divergiram em {length} quadros.")
            if length <= 61:
                fixtures.append({
                    "name": f"synthetic-{length}",
                    "points": [[hand.tolist() if np.isfinite(hand).all() else None for hand in frame]
                               for frame in points],
                    "probabilities": expected.tolist(),
                    "segments": [{"startMs": item.start_ms, "endMs": item.end_ms} for item in segments],
                })
    return fixtures, {"lengths": list(lengths), "onnxRuntime": ort.__version__,
                      "atol": ATOL, "rtol": RTOL, "maxAbsError": max_error}


def write_json(path, content, indent=None):
    path.write_text(json.dumps(content, ensure_ascii=False, allow_nan=False, indent=indent) + "\n", encoding="utf-8")


def select_decoder(checkpoint, state, protocol, condition_name):
    prior = float(state["duration_prior_ms"])
    if protocol is None:
        return prior, DecodeConfig(**state["decode"]), {}, {}
    conditions = json.loads(protocol.read_text(encoding="utf-8"))
    matches = [row for row in conditions["conditions"] if row["name"] == condition_name]
    if len(matches) != 1:
        raise ValueError("A condição escolhida precisa estar no protocolo uma única vez.")
    row, = matches
    if row["checkpointSha256"] != digest(checkpoint) or row["durationPriorMs"] != prior:
        raise ValueError("Checkpoint ou duração não correspondem à condição escolhida.")
    controls = row["controls"]
    if not set(controls) <= {"min_frames", "cut_penalty"}:
        raise ValueError("A condição usa controles sem equivalente no navegador.")
    return prior, DecodeConfig(**row["decoder"]), controls, {
        "decoderSelection": {"protocolSha256": digest(protocol), "condition": condition_name},
    }


def export(checkpoint, directory, protocol=None, condition_name=None):
    torch.set_num_threads(1)
    state = torch.load(checkpoint, map_location="cpu", weights_only=True)
    network = BoundaryModel(FEATURE_COUNT)
    network.load_state_dict(state["weights"])
    mean, std = state["mean"], state["std"]
    if any(tensor.shape != (1, FEATURE_COUNT, 1) or tensor.dtype != torch.float32 or
           not torch.isfinite(tensor).all() for tensor in (mean, std)) or not (std > 0).all():
        raise ValueError("Normalização do checkpoint incompatível com o detector temporal.")
    prior, decoder, controls, selection = select_decoder(checkpoint, state, protocol, condition_name)
    if not isfinite(prior) or prior <= 0 or any(
        not isfinite(value) or value < 0 for value in asdict(decoder).values()
    ) or decoder.activity_floor > 1:
        raise ValueError("Configuração de duração ou decodificação inválida no checkpoint.")

    graph = BoundaryGraph(network, mean, std).eval()
    directory.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=directory) as work:
        staging = Path(work)
        model_path = staging / MODEL_NAME
        torch.onnx.export(
            graph, (torch.zeros(24, FEATURE_COUNT),), str(model_path),
            input_names=[INPUT_NAME], output_names=[OUTPUT_NAME], opset_version=OPSET,
            dynamic_axes={INPUT_NAME: {0: "T"}, OUTPUT_NAME: {0: "T"}}, dynamo=False,
        )
        fixtures, parity = verify(graph, model_path, prior, decoder, controls)
        model_hash = digest(model_path)
        decoding = {"version": 1, "maxDurationMs": 2100, "activityFloor": decoder.activity_floor,
                    "boundaryWeight": decoder.boundary_weight, "proposalPenalty": decoder.proposal_penalty,
                    "durationWeight": decoder.duration_weight}
        if controls:
            decoding.update(version=2, minFrames=controls.get("min_frames", 1),
                            cutPenalty=controls.get("cut_penalty", 0))
        manifest = {
            "schemaVersion": 1,
            "modelVersion": "ufsc-boundary-conv1d-v1",
            "preprocess": "ufsc-hand-boundary-v1",
            "modelSha256": model_hash,
            "checkpointSha256": digest(checkpoint),
            "opset": OPSET,
            "input": {"name": INPUT_NAME, "dtype": "float32", "shape": ["T", FEATURE_COUNT]},
            "output": {"name": OUTPUT_NAME, "dtype": "float32", "shape": ["T", 3],
                       "channels": ["activity", "start", "end"]},
            "sampleMs": SAMPLE_MS,
            "durationPriorMs": prior,
            "decoder": decoding,
            "provenance": {"trainingCorpus": "Corpus de Libras (UFSC), Inventário Nacional da Libras, G1",
                           "useConditions": "https://corpuslibras.ufsc.br/espacointerativo/perguntas/view/6",
                           "distribution": "local-only"},
            "parity": parity,
            **selection,
        }
        write_json(staging / "boundary-parity.json", {"schemaVersion": 1, "modelSha256": model_hash,
                   "sampleMs": SAMPLE_MS, "atol": ATOL, "cases": fixtures})
        write_json(staging / "boundary-model.json", manifest, indent=2)
        for name in (MODEL_NAME, "boundary-parity.json", "boundary-model.json"):
            (staging / name).replace(directory / name)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("checkpoint", type=Path, nargs="?", default=Path("data/ufsc-boundaries/boundary-model.pt"))
    parser.add_argument("output", type=Path, nargs="?", default=Path("data/ufsc-boundaries/web"))
    parser.add_argument("--decoder-protocol", type=Path)
    parser.add_argument("--condition")
    args = parser.parse_args()
    if bool(args.decoder_protocol) != bool(args.condition):
        parser.error("Informe --decoder-protocol e --condition juntos.")
    print(json.dumps(export(args.checkpoint, args.output, args.decoder_protocol, args.condition),
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
