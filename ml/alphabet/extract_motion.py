"""Extrai pontos das janelas anotadas de datilologia nos vídeos locais da UFSM."""

import argparse
from hashlib import file_digest
import json
from pathlib import Path

import cv2
import mediapipe
import numpy as np


def sha256(path):
    with path.open("rb") as stream:
        return file_digest(stream, "sha256").hexdigest()


def extract(path, windows, model, *, mirror=False, include_world=False):
    task = mediapipe.tasks.vision
    opts = task.HandLandmarkerOptions(
        base_options=mediapipe.tasks.BaseOptions(model_asset_path=str(model)),
        running_mode=task.RunningMode.VIDEO, num_hands=2,
    )
    reader = cv2.VideoCapture(str(path))
    fps = reader.get(cv2.CAP_PROP_FPS)
    if not reader.isOpened() or fps < 10:
        reader.release()
        raise ValueError(f"Não foi possível ler o vídeo {path.name}.")
    records = []
    try:
        with task.HandLandmarker.create_from_options(opts) as detector:
            last = -1
            for window in sorted(windows, key=lambda item: item["startMs"]):
                frames = []
                for time in range(window["startMs"], window["endMs"], 65):
                    if time <= last:
                        raise ValueError(f"Janelas sobrepostas em {path.name}.")
                    reader.set(cv2.CAP_PROP_POS_FRAMES, round(time * fps / 1000))
                    ok, bgr = reader.read()
                    if not ok:
                        raise ValueError(f"Quadro indisponível em {path.name}, {time} ms.")
                    rows, columns = bgr.shape[:2]
                    if mirror:
                        bgr = cv2.flip(bgr, 1)
                    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
                    image = mediapipe.Image(image_format=mediapipe.ImageFormat.SRGB, data=np.ascontiguousarray(rgb))
                    signal = detector.detect_for_video(image, time)
                    hands = [[dict(x=1 - p.x if mirror else p.x, y=p.y, z=p.z) for p in hand]
                             for hand in signal.hand_landmarks]
                    # A geometria será testada espelhada também, em ambas as mãos.
                    frame = dict(timestamp=time, aspect=columns / rows,
                                 leftHand=hands[1] if len(hands) == 2 else [],
                                 rightHand=hands[0] if hands else [])
                    if include_world:
                        world = [[dict(x=-p.x if mirror else p.x, y=p.y, z=p.z) for p in hand]
                                 for hand in signal.hand_world_landmarks]
                        frame["leftWorld"] = world[1] if len(world) == 2 else []
                        frame["rightWorld"] = world[0] if world else []
                    frames.append(frame)
                    last = time
                records.append({**window, "frames": frames})
    finally:
        reader.release()
    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=Path("ml/alphabet/ufsm-temporal-windows.json"))
    parser.add_argument("--root", type=Path, default=Path("."), help="Raiz dos caminhos de vídeo do manifesto.")
    parser.add_argument("--model", type=Path, default=Path("public/runtime/hand_landmarker.task"))
    parser.add_argument("--mirror", action="store_true", help="Espelha a entrada do extrator e restaura o eixo x na saída.")
    parser.add_argument("--world", action="store_true", help="Registra as coordenadas 3D junto aos pontos de imagem.")
    parser.add_argument("--out", type=Path, default=Path("data/alphabet/motion-frames.json"))
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text())
    cv2.setNumThreads(1)
    samples = []
    for source in manifest["sources"]:
        path = args.root / source["file"]
        if sha256(path) != source["sha256"]:
            raise ValueError(f"Vídeo divergente da anotação em {path.name}.")
        records = extract(path, [*source["windows"], *source.get("staticChecks", [])], args.model,
                          mirror=args.mirror, include_world=args.world)
        samples.extend({**row, "source": source["id"], "split": source["split"]} for row in records)
        print(source["id"], [(row["label"], sum(bool(frame["rightHand"]) for frame in row["frames"]),
                              len(row["frames"])) for row in records], flush=True)
    evidence = {"manifestSha256": sha256(args.manifest), "landmarkerSha256": sha256(args.model), "samples": samples}
    if args.mirror:
        evidence["mirroredInput"] = True
    args.out.write_text(json.dumps(evidence, ensure_ascii=False))


if __name__ == "__main__":
    main()
