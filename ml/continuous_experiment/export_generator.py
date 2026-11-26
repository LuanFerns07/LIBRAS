"""Exporta encoder/decoder do gerador com paridade verificada em sequências EQT."""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
import torch
from torch import nn

from .eqt import FRAMES, prepare, spaced_test_samples
from .model import TokenGenerator
from .train import BOS, EOS


class EncoderGraph(nn.Module):
    def __init__(self, network, mean, std):
        super().__init__()
        self.network = network
        self.register_buffer("mean", mean)
        self.register_buffer("std", std)

    def forward(self, features):
        return self.network.encode((features - self.mean) / self.std)


class DecoderGraph(nn.Module):
    def __init__(self, network):
        super().__init__()
        self.network = network

    def forward(self, token, memory, keys, hidden):
        return self.network.decode(token, memory, keys, hidden)


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def session(path):
    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    options.inter_op_num_threads = 1
    onnx.checker.check_model(onnx.load(path))
    return ort.InferenceSession(str(path), options, providers=["CPUExecutionProvider"])


def export(checkpoint, directory, samples):
    torch.set_num_threads(1)
    state = torch.load(checkpoint, weights_only=True, map_location="cpu")
    if state["mode"] != "generator":
        raise ValueError("Escolha um checkpoint produzido por --mode generator.")
    symbols = state["labels"]
    maximum = state["maximum"]
    network = TokenGenerator(len(symbols))
    network.load_state_dict(state["weights"])
    network.eval()
    encoder = EncoderGraph(network, state["mean"], state["std"]).eval()
    decoder = DecoderGraph(network).eval()
    directory.mkdir(parents=True, exist_ok=True)
    encoder_path, decoder_path = (directory / name for name in ("encoder.onnx", "decoder.onnx"))
    fake = torch.zeros(1, 126, FRAMES)
    torch.onnx.export(
        encoder, (fake,), str(encoder_path), input_names=["features"],
        output_names=["memory", "keys", "hidden"], opset_version=17, dynamo=False,
    )
    with torch.no_grad():
        example = encoder(fake)
    torch.onnx.export(
        decoder, (torch.tensor([[BOS]]), *example), str(decoder_path),
        input_names=["token", "memory", "keys", "hidden"],
        output_names=["logits", "next_hidden"], opset_version=17, dynamo=False,
    )

    onnx_encoder, onnx_decoder = session(encoder_path), session(decoder_path)
    max_delta = 0.0
    decoder_steps = 0
    fixture = []
    with torch.inference_mode():
        for sample in samples:
            feature_array = np.ascontiguousarray(sample.values.T[None])
            memory_p, keys_p, hidden_p = encoder(torch.from_numpy(feature_array))
            memory_o, keys_o, hidden_o = onnx_encoder.run(None, {"features": feature_array})
            for left, right in zip((memory_p, keys_p, hidden_p), (memory_o, keys_o, hidden_o)):
                np.testing.assert_allclose(left.numpy(), right, atol=1e-5, rtol=1e-4)
                max_delta = max(max_delta, float(np.abs(left.numpy() - right).max()))
            token = np.ascontiguousarray([[BOS]], dtype=np.int64)
            expected_tokens = []
            for _ in range(maximum):
                logits_p, hidden_p = decoder(torch.from_numpy(token), memory_p, keys_p, hidden_p)
                logits_o, hidden_o = onnx_decoder.run(
                    None, {"token": token, "memory": memory_o, "keys": keys_o, "hidden": hidden_o},
                )
                for left, right in ((logits_p, logits_o), (hidden_p, hidden_o)):
                    np.testing.assert_allclose(left.numpy(), right, atol=1e-5, rtol=1e-4)
                    max_delta = max(max_delta, float(np.abs(left.numpy() - right).max()))
                predicted_p = int(logits_p[..., 2:].argmax(dim=-1)) + 2
                predicted_o = int(logits_o[..., 2:].argmax(axis=-1).item()) + 2
                if predicted_p != predicted_o:
                    raise ValueError("O decodificador divergiu na geração gulosa.")
                decoder_steps += 1
                expected_tokens.append(predicted_o)
                if predicted_o == EOS:
                    break
                token[0, 0] = predicted_o
            fixture.append({"features": feature_array.reshape(-1).tolist(), "tokens": expected_tokens,
                            "landmark_sha256": sample.digest})

    report = {
        "architecture": "temporal encoder and one-step autoregressive GRU attention decoder",
        "opset": 17,
        "runtime": ort.__version__,
        "device": "CPUExecutionProvider",
        "features": [1, 126, FRAMES],
        "batch": 1,
        "verified_real_clips": len(samples),
        "verified_decoder_steps": decoder_steps,
        "maximum_absolute_error": max_delta,
        "atol": 1e-5,
        "rtol": 1e-4,
        "checkpoint_sha256": digest(checkpoint),
        "encoder_sha256": digest(encoder_path),
        "decoder_sha256": digest(decoder_path),
    }
    (directory / "parity.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    (directory / "vocabulary.json").write_text(
        json.dumps({"bos": BOS, "eos": EOS, "maximum": maximum, "symbols": symbols},
                   ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (directory / "parity-fixture.json").write_text(json.dumps(fixture) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", type=Path)
    parser.add_argument("checkpoint", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    samples, _ = prepare(args.dataset, args.dataset / "Landmarks-hands.zip")
    export(args.checkpoint, args.output, spaced_test_samples(samples))


if __name__ == "__main__":
    main()
