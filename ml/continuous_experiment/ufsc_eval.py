"""Avalia a segmentação em arquivos ELAN e gravações públicas emparelhadas."""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np

from .segment import hand_motion, read_eaf, segment_motion, segment_scores, select_on_dev


def sha256(path):
    with path.open("rb") as file:
        return hashlib.file_digest(file, "sha256").hexdigest()


def extract_camera(video, model, seconds):
    import cv2
    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions
    from mediapipe.tasks.python.vision import HandLandmarker, HandLandmarkerOptions, RunningMode

    capture = cv2.VideoCapture(str(video))
    cv2.setNumThreads(1)
    try:
        fps = capture.get(cv2.CAP_PROP_FPS)
        if not capture.isOpened() or fps <= 0:
            raise ValueError(f"Câmera sem vídeo decodificável: {video}")
        stride = max(1, round(fps / 15))
        opts = HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(model), delegate=BaseOptions.Delegate.CPU),
            running_mode=RunningMode.VIDEO,
            num_hands=2,
        )
        timestamps, frames = [], []
        with HandLandmarker.create_from_options(opts) as detector:
            frame_index = -1
            while capture.grab():
                frame_index += 1
                timestamp = round(frame_index * 1000 / fps)
                if timestamp >= 1000 * seconds:
                    break
                if frame_index % stride:
                    continue
                ok, frame = capture.retrieve()
                if not ok:
                    raise RuntimeError(f"Erro ao decodificar quadro {frame_index} de {video}")
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                landmarks = detector.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), timestamp)
                hands = np.full((2, 21, 2), np.nan, dtype=np.float32)
                confidence = [0.0, 0.0]
                for points, handedness in zip(landmarks.hand_landmarks, landmarks.handedness):
                    hand = handedness[0]
                    side = int(hand.category_name == "Right")
                    if hand.score >= confidence[side]:
                        confidence[side] = hand.score
                        hands[side] = [(point.x, point.y) for point in points]
                frames.append(hands)
                timestamps.append(timestamp)
        if len(timestamps) < 2 or timestamps[-1] < 1000 * seconds - 2 * 1000 * stride / fps:
            raise ValueError(f"Captura terminou antes da janela reservada: {video}")
    finally:
        capture.release()
    return np.array(timestamps), np.stack(frames), {
        "mediapipe": mp.__version__, "opencv": cv2.__version__, "source_fps": fps, "stride_frames": stride,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("annotations", type=Path)
    parser.add_argument("dev_video", type=Path)
    parser.add_argument("test_video", type=Path)
    parser.add_argument("model", type=Path)
    parser.add_argument("report", type=Path)
    parser.add_argument("--dev-tier", default="1SinaisD")
    parser.add_argument("--test-tier", default="2SinaisD")
    parser.add_argument("--seconds", type=float, default=60)
    args = parser.parse_args()
    if not 0 < args.seconds <= 300:
        parser.error("Use uma janela de até 300 segundos.")

    report = {
        "source": "Inventário Nacional de Libras, Grande Florianópolis, Corpus Libras/UFSC",
        "comparison": "proposals from either hand compared with right-hand ELAN tier",
        "annotation_sha256": sha256(args.annotations),
        "model_sha256": sha256(args.model),
        "seconds_max": args.seconds,
    }
    configuration = None
    for split in ("dev", "test"):
        video = getattr(args, f"{split}_video")
        tier = getattr(args, f"{split}_tier")
        timestamps, coords, environment = extract_camera(video, args.model, args.seconds)
        reference = read_eaf(args.annotations, tier, video.name, timestamps[-1])
        if not reference:
            raise ValueError(f"Trilha sem referências para a janela: {tier}")
        motion = hand_motion(timestamps, coords)
        if split == "dev":
            configuration = select_on_dev(reference, timestamps, motion)
        guessed = segment_motion(timestamps, motion, **configuration)
        report[split] = {
            "video": video.name,
            "video_sha256": sha256(video),
            "eaf_tier": tier,
            "decoded_frames": len(timestamps),
            "duration_ms": int(timestamps[-1]),
            "fraction_frames_with_hand": float(np.isfinite(coords).all(axis=(2, 3)).any(axis=1).mean()),
            "measures": segment_scores(reference, guessed),
            "environment": environment,
        }
    report["configuration_selected_on_dev"] = configuration
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
