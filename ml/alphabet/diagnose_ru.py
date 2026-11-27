"""Localiza rejeições de R e U nos quadros de uma captura do Chromium."""

import argparse
from collections import Counter
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort

from .diagnose_static import top_votes
from .probe_as import normalized_frames
from .supplement import load_model
from .train import FEATURES, checksum


def diagnose(package, trace_path):
    trace = json.loads(trace_path.read_text())
    base = package / "models"
    manifest = base / "alphabet.json"
    metadata = json.loads(manifest.read_text())
    shape = metadata["imageR"]
    commit = (package / "commit.txt").read_text().strip()
    fingerprints = {
        "commit": commit, "modelSha256": metadata["modelSha256"],
        "agreementSha256": metadata["agreementSha256"], "imageRSha256": shape["modelSha256"],
        "imageRPolicy": {"threshold": shape["threshold"], "vetoThreshold": shape["vetoThreshold"],
                         "allowU": shape.get("allowU", True)},
    }
    if any(trace["build"].get(key) != value for key, value in fingerprints.items()):
        raise ValueError("Use os modelos e a configuração da compilação registrada na captura.")
    if shape["preprocess"] != metadata["preprocess"] or metadata["features"] != FEATURES:
        raise ValueError("Os modelos precisam usar os pontos de imagem normalizados pelo pulso e pela palma.")

    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    primary, verifier, r_shape = [
        ort.InferenceSession(load_model(base, name, digest), options, providers=["CPUExecutionProvider"])
        for name, digest in (
            ("alphabet.onnx", metadata["modelSha256"]),
            ("alphabet-check.onnx", metadata["agreementSha256"]),
            ("alphabet-r-shape.onnx", shape["modelSha256"]),
        )
    ]
    labels = np.array(metadata["labels"])
    results = []
    for window in trace["results"]:
        frames = [{**frame["hands"], "aspect": frame["timing"]["aspect"]} for frame in window["frames"]]
        selected = [points for points in normalized_frames(frames) if points is not None]
        result = {key: window[key] for key in ("source", "label", "startMs", "endMs", "readings")}
        result.update(workerFrames=len(frames), eligibleFrames=len(selected))
        results.append(result)
        if not selected:
            continue

        inputs = {"hand": np.stack(selected).reshape(-1, metadata["features"])}
        first, first_ok = top_votes(primary, inputs, labels, metadata["threshold"])
        second, second_ok = top_votes(verifier, inputs, labels, metadata["threshold"])
        scores = r_shape.run(["scores"], inputs)[0].ravel()
        strong = scores >= shape["threshold"]
        consensus = first_ok & second_ok & (first == second)
        consensus_r = consensus & (first == "R")
        consensus_u = consensus & (first == "U")
        current_r = consensus_r & (scores >= shape["vetoThreshold"])
        from_u = consensus_u & strong & shape.get("allowU", True)
        reverse_pair = first_ok & (first == "U") & (second == "R") & strong
        pairs = Counter(zip(first.tolist(), second.tolist(), first_ok.tolist(), second_ok.tolist(), strict=True))
        result.update(
            topPairs=[{"primary": main, "verifier": check, "primaryAboveThreshold": main_ok,
                       "verifierAboveThreshold": check_ok, "frames": count}
                      for (main, check, main_ok, check_ok), count in pairs.most_common()],
            rShapeScoreRange=[round(float(scores.min()), 6), round(float(scores.max()), 6)],
            strongRShapeFrames=int(strong.sum()),
            consensusFrames={"R": int(consensus_r.sum()), "U": int(consensus_u.sum())},
            acceptedByCurrentRURoutes={"R": int((current_r | from_u).sum()),
                                       "U": int((consensus_u & ~from_u).sum())},
            reverseDisagreementRFrames=int(reverse_pair.sum()),
            reverseDisagreementWithBothAboveThreshold=int((reverse_pair & second_ok).sum()),
        )
    report = {"schemaVersion": 1, "traceSha256": checksum(trace_path), "manifestSha256": checksum(manifest),
              "threshold": metadata["threshold"], "build": fingerprints, "results": results}
    if "crop" in trace:
        report["crop"] = trace["crop"]
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("site", type=Path, help="Diretório site do pacote presente na captura.")
    parser.add_argument("trace", type=Path, help="Captura do script replay-web.mjs com --trace.")
    args = parser.parse_args()
    print(json.dumps(diagnose(args.site, args.trace), ensure_ascii=False, indent=2))
