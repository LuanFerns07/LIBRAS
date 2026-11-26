"""Mede WER de landmarks EQT e Holistic Web no mesmo teste ONNX."""

import argparse
import json
from pathlib import Path

from .eqt import prepare, spaced_test_samples
from .train import evaluate


def token_words(ids, vocabulary):
    words = []
    for item in ids:
        if item == vocabulary["eos"]:
            break
        if not 3 <= item < len(vocabulary["symbols"]):
            raise ValueError("Token gerado fora do vocabulário.")
        words.append(vocabulary["symbols"][item])
    return tuple(words)


def score(dataset, browser, vocabulary):
    samples, _ = prepare(dataset, dataset / "Landmarks-hands.zip")
    chosen = spaced_test_samples(samples)
    observed = browser["samples"]
    if [sample.digest for sample in chosen] != [row["digest"] for row in observed]:
        raise ValueError("A ordem ou identidade do recorte preparado divergiu da extração web.")
    reference = [sample.tokens for sample in chosen]
    original = [token_words(row["original_tokens"], vocabulary) for row in observed]
    holistic = [token_words(row["holistic_tokens"], vocabulary) for row in observed]
    observed_frames = sum(row["sampled"] for row in observed)
    same_translation = sum(first == second for first, second in zip(original, holistic))
    return {
        "protocol": "same Browser WASM encoder/decoder, original landmarks vs browser Holistic landmarks",
        "browser": browser["browser"],
        "onnxruntime_web": browser["runtime"],
        "clip_count": len(chosen),
        "interval_ms": browser["interval_ms"],
        "sampled_web_frames": observed_frames,
        "web_frames_with_hand": sum(row["detected"] for row in observed),
        "identical_hypotheses": same_translation,
        "original_landmarks": evaluate(reference, original),
        "holistic_web": evaluate(reference, holistic),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", type=Path)
    parser.add_argument("browser_report", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    browser = json.loads(args.browser_report.read_text(encoding="utf-8"))
    vocabulary = json.loads((args.dataset / "onnx" / "vocabulary.json").read_text(encoding="utf-8"))
    report = json.dumps(score(args.dataset, browser, vocabulary), ensure_ascii=False, indent=2) + "\n"
    args.output.write_text(report, encoding="utf-8")
    print(report, end="")


if __name__ == "__main__":
    main()
