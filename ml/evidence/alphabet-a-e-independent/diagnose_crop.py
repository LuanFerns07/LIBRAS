"""Compara pontos e escores de A da UFSM com enquadramentos fixos, em CPU."""

import argparse
from collections import Counter
import json
from pathlib import Path
import statistics
import subprocess

import cv2
import mediapipe
import numpy as np
import onnxruntime

from ml.alphabet.extract_motion import extract, sha256
from ml.alphabet.train import centered


VIDEOS = {
    "480": ("1535641159.mp4", "1d1be8a4fe346d004147ab258d88499c4620f95dd21312ec809748efa20f4af7"),
    "576": ("1535641159-720p.mp4", "a5c4dc8862e287d42841f53b13a630466d4d9f838ae639fcdbaa8bb298e62194"),
}
CROPS = {
    "480": {"wide": (384, 216, 258, 192), "close": (240, 136, 330, 232)},
    "576": {"wide": (460, 258, 310, 230), "close": (288, 162, 396, 278)},
}
RELEASE = "759a671d434ac99cabbf6567bb9649d98f46cac8"
LANDMARKER = "fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1"


def verified(path, digest):
    if sha256(path) != digest:
        raise ValueError(f"SHA-256 divergente: {path}")
    return path


def score(session, values, labels):
    logits = session.run(["logits"], {"hand": values})[0][0].astype(np.float64)
    exp = np.exp(logits - logits.max())
    probability = exp / exp.sum()
    best = int(probability.argmax())
    return {"top": labels[best], "topProbability": float(probability[best]),
            "aProbability": float(probability[labels.index("A")])}


def classify(frame, sessions, labels, threshold):
    hands = [frame[key] for key in ("leftHand", "rightHand") if frame[key]]
    summary = {"timeMs": frame["timestamp"], "hands": len(hands), "accepted": None}
    if not hands or (len(hands) == 2 and abs(hands[0][9]["y"] - hands[1][9]["y"]) < .18):
        return summary
    hand = min(hands, key=lambda item: item[9]["y"])
    points = np.array([[[joint[axis] for axis in "xyz"] for joint in hand]], dtype=np.float32)
    values = centered(points, frame["aspect"]).reshape(1, 63)
    summary["scores"] = [score(session, values, labels) for session in sessions]
    first, second = summary["scores"]
    if first["top"] == second["top"] and min(first["topProbability"], second["topProbability"]) >= threshold:
        summary["accepted"] = first["top"]
    for prediction in summary["scores"]:
        for key in ("aProbability", "topProbability"):
            prediction[key] = round(prediction[key], 6)
    summary["handHeightFraction"] = round(float(np.ptp(points[0, :, 1])), 4)
    return summary


def count(values):
    return dict(Counter(value if value is not None else "null" for value in values))


def prepare(source, width, height, roi, variant, path):
    crop_width, crop_height, x, y = roi
    crop = f"crop={crop_width}:{crop_height}:{x}:{y}"
    transform = (f"pad={width}:{height}:{x}:{y}" if variant == "same-scale"
                 else f"scale={width}:{height}:flags=bicubic")
    subprocess.run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-threads", "1",
                    "-i", str(source), "-an", "-t", "5", "-vf", f"{crop},{transform}", "-c:v", "ffv1",
                    "-threads", "1", str(path)], check=True)
    return path


def run(args):
    cv2.setNumThreads(1)
    if (args.assets / "commit.txt").read_text().strip() != RELEASE:
        raise ValueError("A cópia dos modelos deve corresponder à compilação registrada.")
    metadata = json.loads((args.assets / "alphabet.json").read_text())
    model = verified(args.assets / "hand_landmarker.task", LANDMARKER)
    options = onnxruntime.SessionOptions()
    options.intra_op_num_threads = options.inter_op_num_threads = 1
    model_files = [verified(args.assets / "alphabet.onnx", metadata["modelSha256"]),
                   verified(args.assets / "alphabet-check.onnx", metadata["agreementSha256"])]
    sessions = [onnxruntime.InferenceSession(str(path), options, providers=["CPUExecutionProvider"])
                for path in model_files]
    manifest_path = Path("ml/alphabet/ufsm-static-windows.json")
    manifest = json.loads(manifest_path.read_text())
    reference = next(source for source in manifest["sources"] if str(source["id"]) == "1535641159")
    window = next(window for window in reference["windows"] if window["label"] == "A")

    args.out.mkdir(parents=True, exist_ok=True)
    records = {}
    for resolution, (name, digest) in VIDEOS.items():
        source = verified(args.videos / name, digest)
        capture = cv2.VideoCapture(str(source))
        width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
        capture.release()
        zones = CROPS[resolution]
        for variant, roi in (("full", None), ("same-scale", zones["wide"]), *zones.items()):
            key = f"{resolution}-{variant}"
            video = prepare(source, width, height, roi, variant, args.out / f"{key}.mkv") if roi else source
            frames = extract(video, [window], model)[0]["frames"]
            rows = [classify(frame, sessions, metadata["labels"], metadata["threshold"]) for frame in frames]
            scored = [row for row in rows if "scores" in row]
            records[key] = {
                "roiWidthHeightXY": roi, "hands": count(row["hands"] for row in rows),
                "accepted": count(row["accepted"] for row in rows),
                "medianHandHeightFraction": statistics.median(row["handHeightFraction"] for row in scored) if scored else None,
                "topLabels": [count(row["scores"][index]["top"] for row in scored) for index in range(len(sessions))],
                "aMedians": [statistics.median(row["scores"][index]["aProbability"] for row in scored)
                             for index in range(len(sessions))] if scored else [],
                "frames": rows,
            }
    result = {"release": RELEASE, "window": window, "threshold": metadata["threshold"],
              "manifestSha256": sha256(manifest_path), "landmarkerSha256": sha256(model),
              "classifierSha256": [sha256(path) for path in model_files],
              "versions": {"opencv": cv2.__version__, "mediapipe": mediapipe.__version__,
                           "onnxruntime": onnxruntime.__version__},
              "videos": VIDEOS, "variants": records}
    (args.out / "diagnosis.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    result["variants"] = {name: {key: val for key, val in record.items() if key != "frames"}
                          for name, record in records.items()}
    (args.out / "summary.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--videos", type=Path, required=True)
    parser.add_argument("--assets", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    run(parser.parse_args())
