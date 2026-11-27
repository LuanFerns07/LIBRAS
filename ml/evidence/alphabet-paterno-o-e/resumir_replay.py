"""Identifica em qual estágio a leitura estática é aceita em quadros do ensaio."""

import argparse
from collections import Counter
from hashlib import file_digest
import json
import os
from pathlib import Path
from statistics import median
import subprocess

import numpy as np
import onnxruntime

from ml.alphabet.train import centered


def sha256(path):
    with path.open("rb") as stream:
        return file_digest(stream, "sha256").hexdigest()


def session(path, digest):
    if sha256(path) != digest:
        raise ValueError(f"Modelo diferente da compilação: {path}.")
    options = onnxruntime.SessionOptions()
    options.intra_op_num_threads = options.inter_op_num_threads = 1
    return onnxruntime.InferenceSession(str(path), options, providers=["CPUExecutionProvider"])


def top_labels(model, values, labels, threshold):
    logits = model.run(["logits"], {"hand": values})[0].astype(np.float64)
    probabilities = np.exp(logits - logits.max(axis=1, keepdims=True))
    probabilities /= probabilities.sum(axis=1, keepdims=True)
    best = probabilities.argmax(axis=1)
    return [labels[i] if row[i] >= threshold else None for row, i in zip(probabilities, best, strict=True)]


def offline(frames, models, metadata):
    counts = Counter()
    hand_data = []
    heights = []
    for frame in frames:
        hands = [frame[name] for name in ("leftHand", "rightHand") if len(frame[name]) == 21]
        counts[len(hands)] += 1
        if not hands or (len(hands) == 2 and abs(hands[0][9]["y"] - hands[1][9]["y"]) < .18):
            continue
        hand = min(hands, key=lambda item: item[9]["y"])
        points = np.array([[[joint[axis] for axis in "xyz"] for joint in hand]], dtype=np.float32)
        hand_data.append(centered(points, frame["aspect"]).reshape(63))
        heights.append(float(np.ptp(points[0, :, 1])))

    report = {
        "sampledFrames": len(frames),
        "oneHand": counts[1],
        "twoHands": counts[2],
        "selectableHand": len(hand_data),
        "medianHandHeightFraction": round(median(heights), 4) if heights else None,
        "acceptedByAgreement": {},
        "acceptedBySupplement": {},
        "rejectedByBoth": 0,
    }
    if not hand_data:
        return report

    values = np.stack(hand_data)
    first, second = [top_labels(model, values, metadata["labels"], metadata["threshold"]) for model in models[:2]]
    agreed = Counter(a for a, b in zip(first, second, strict=True) if a and a == b)
    pending = values[[not a or a != b for a, b in zip(first, second, strict=True)]]
    supplement = metadata["supplement"]
    accepted = Counter()
    if len(pending):
        scores = models[2].run(["scores"], {"hand": pending})[0]
        best = scores.argmax(axis=1)
        accepted.update(supplement["labels"][i] for row, i in zip(scores, best, strict=True) if
                        row[i] >= supplement["threshold"])
    report["acceptedByAgreement"] = dict(agreed)
    report["acceptedBySupplement"] = dict(accepted)
    report["rejectedByBoth"] = len(pending) - sum(accepted.values())
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--release-site", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    protocol_path = Path(__file__).with_name("protocolo.json")
    protocol = json.loads(protocol_path.read_text())
    manifest = args.data / "replay-manifest.json"
    points = args.data / "frames.json"
    sources = json.loads(manifest.read_text())
    frames = json.loads(points.read_text())
    replay = json.loads((args.data / "replay-bfe1945.json").read_text())
    build = replay["build"]
    site = args.release_site
    path = site / "models"
    metadata = json.loads((path / "alphabet.json").read_text())
    if (sha256(protocol_path) != sources["protocolSha256"] or sha256(manifest) != frames["manifestSha256"] or
            sha256(site / "runtime/hand_landmarker.task") != frames["landmarkerSha256"] or
            build["commit"] != protocol["build"] or (site / "commit.txt").read_text().strip() != build["commit"] or
            metadata["modelSha256"] != build["modelSha256"] or
            metadata["agreementSha256"] != build["agreementSha256"] or
            metadata["supplement"]["modelSha256"] != build["supplementSha256"] or
            sha256(path / "alphabet-motion.json") != build["motionSha256"]):
        raise ValueError("Os pontos, as fontes e o replay precisam corresponder ao protocolo e à compilação.")

    models = [
        session(path / "alphabet.onnx", build["modelSha256"]),
        session(path / "alphabet-check.onnx", build["agreementSha256"]),
        session(path / "alphabet-supplement.onnx", build["supplementSha256"]),
    ]
    rows = []
    for source, sample, playback in zip(sources["sources"], frames["samples"], replay["results"], strict=True):
        window = source["windows"][0]
        if (source["id"] != sample["source"] or source["id"] != playback["source"] or source["split"] != sample["split"] or
                any(window[key] != sample[key] or window[key] != playback[key] for key in ("label", "startMs", "endMs"))):
            raise ValueError("A ordem das janelas diverge entre a extração e o replay.")
        rows.append({
            "window": source["sourceWindow"],
            "variant": source["variant"],
            "clipSha256": source["sha256"],
            "replay": playback,
            "classificationByFrame": offline(sample["frames"], models, metadata),
        })
    report = {
        "protocolSha256": sha256(protocol_path),
        "derivedManifestSha256": sha256(manifest),
        "landmarkerSha256": frames["landmarkerSha256"],
        "pointsSha256": sha256(points),
        "chromium": subprocess.check_output([os.environ.get("LIBRASIA_CHROMIUM", "chromium"), "--version"],
                                            text=True).strip(),
        "ffmpeg": subprocess.check_output(["ffmpeg", "-version"], text=True).splitlines()[0],
        "onnxruntime": onnxruntime.__version__,
        "build": build,
        "results": rows,
    }
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
