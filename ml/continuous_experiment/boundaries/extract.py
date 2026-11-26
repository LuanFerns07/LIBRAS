"""Extrai mãos de recortes UFSC em uma grade de 10 Hz, em até duas CPUs."""

import argparse
import json
import os
from pathlib import Path
from tempfile import NamedTemporaryFile

import numpy as np

from .acquire import digest


SAMPLE_MS = 100
MAX_WIDTH = 480


def restrict_cpu():
    if hasattr(os, "sched_getaffinity"):
        cpus = sorted(os.sched_getaffinity(0))
        if len(cpus) > 2:
            os.sched_setaffinity(0, cpus[-2:])


def extract(video, model, seconds):
    import cv2
    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions
    from mediapipe.tasks.python.vision import HandLandmarker, HandLandmarkerOptions, RunningMode

    cv2.setNumThreads(1)
    capture = cv2.VideoCapture(str(video))
    grid = np.arange(0, int(seconds * 1000), SAMPLE_MS, dtype=np.int64)
    results = []
    try:
        fps = capture.get(cv2.CAP_PROP_FPS)
        if not capture.isOpened() or not np.isfinite(fps) or fps < 1000 / SAMPLE_MS:
            raise ValueError(f"Vídeo abaixo da taxa de amostragem: {video.name}.")
        indexes = np.rint(grid * fps / 1000).astype(np.int64)
        opts = HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(model), delegate=BaseOptions.Delegate.CPU),
            running_mode=RunningMode.VIDEO,
            num_hands=2,
        )
        with HandLandmarker.create_from_options(opts) as detector:
            frame_index = -1
            for requested, timestamp in zip(indexes, grid):
                while frame_index < requested:
                    if not capture.grab():
                        raise ValueError(f"Vídeo terminou antes da janela reservada: {video.name}.")
                    frame_index += 1
                ok, frame = capture.retrieve()
                if not ok:
                    raise ValueError(f"Não foi possível decodificar {video.name} em {timestamp} ms.")
                height, width = frame.shape[:2]
                if width > MAX_WIDTH:
                    frame = cv2.resize(frame, (MAX_WIDTH, round(height * MAX_WIDTH / width)),
                                       interpolation=cv2.INTER_AREA)
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = detector.detect_for_video(
                    mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), int(timestamp),
                )
                hands = np.full((2, 21, 3), np.nan, dtype=np.float32)
                confidence = np.zeros(2, dtype=np.float32)
                for points, handedness in zip(result.hand_landmarks, result.handedness):
                    if len(points) != 21 or not handedness:
                        continue
                    side = int(handedness[0].category_name == "Right")
                    if handedness[0].score > confidence[side]:
                        confidence[side] = handedness[0].score
                        hands[side] = [(point.x, point.y, point.z) for point in points]
                results.append(hands)
    finally:
        capture.release()
    return grid, np.stack(results), {
        "mediapipe": mp.__version__, "opencv": cv2.__version__, "source_fps": fps,
        "interval_ms": SAMPLE_MS, "max_width": MAX_WIDTH,
    }


def main():
    restrict_cpu()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("model", type=Path)
    args = parser.parse_args()
    manifest = json.loads((args.directory / "media.json").read_text(encoding="utf-8"))
    model_hash = digest(args.model)
    source_hash = digest(Path(__file__))
    for row in manifest:
        video = args.directory / row["video"]
        if digest(video) != row["video_prefix_sha256"]:
            raise ValueError(f"O vídeo {video.name} diverge do manifesto.")
        target = args.directory / f"{row['id']}-hands.npz"
        identity = {
            "video_sha256": row["video_prefix_sha256"],
            "model_sha256": model_hash,
            "extractor_sha256": source_hash,
            "seconds": row["seconds"],
        }
        if target.is_file():
            with np.load(target, allow_pickle=False) as cached:
                if json.loads(str(cached["identity"])) == identity:
                    print(f"{row['id']} {row['split']}: landmarks reutilizados", flush=True)
                    continue
        timestamps, points, provenance = extract(video, args.model, row["seconds"])
        with NamedTemporaryFile(dir=args.directory, suffix=".npz", delete=False) as output:
            temporary = Path(output.name)
            try:
                np.savez_compressed(output, timestamps=timestamps, points=points,
                                    identity=json.dumps(identity), provenance=json.dumps(provenance))
                output.flush()
                temporary.replace(target)
            finally:
                temporary.unlink(missing_ok=True)
        has_hands = int(np.isfinite(points).all(axis=(2, 3)).any(axis=1).sum())
        print(f"{row['id']} {row['split']}: {has_hands}/{len(timestamps)} quadros com mão", flush=True)


if __name__ == "__main__":
    main()
