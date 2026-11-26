"""Compara dois segmentadores sobre a mesma extração Holistic do navegador."""

import argparse
import json
from pathlib import Path

import numpy as np

from .metrics import Segment
from .segment import hand_motion, read_eaf, segment_motion, segment_scores, select_on_dev


def unpack_frames(rows):
    timestamps = np.array([row["timestamp"] for row in rows], dtype=float)
    points = np.full((len(rows), 2, 21, 2), np.nan, dtype=np.float32)
    for index, row in enumerate(rows):
        if len(row["hands"]) != 2:
            raise ValueError("Frame sem os dois canais de mão.")
        for side, hand in enumerate(row["hands"]):
            if hand:
                values = np.array(hand, dtype=np.float32)
                if values.shape != (21, 2) or not np.isfinite(values).all():
                    raise ValueError("Frame com coordenadas da mão inválidas.")
                points[index, side] = values
    return timestamps, points


def compare(annotations, extracted):
    comparisons = {}
    configuration = None
    for split, tier in (("dev", "1SinaisD"), ("test", "2SinaisD")):
        record = extracted[split]
        times, coordinates = unpack_frames(record["frames"])
        reference = read_eaf(annotations, tier, record["video"], extracted["duration_ms"])
        motion = hand_motion(times, coordinates)
        if split == "dev":
            configuration = select_on_dev(reference, times, motion)
        browser = [Segment(**value) for value in record["intervals"]]
        rule = segment_motion(times, motion, **configuration)
        comparisons[split] = {
            "video": record["video"],
            "eaf_tier": tier,
            "sampled_frames": len(times),
            "fraction_frames_with_hand": float(np.isfinite(coordinates).all(axis=(2, 3)).any(axis=1).mean()),
            "javascript_signing_space": segment_scores(reference, browser),
            "motion_only": segment_scores(reference, rule),
        }
    return {
        "features": "MediaPipe Holistic from LibrasIA web extractor",
        "interval_ms": extracted["interval_ms"],
        "duration_ms": extracted["duration_ms"],
        "motion_configuration_selected_on_dev": configuration,
        **comparisons,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("annotations", type=Path)
    parser.add_argument("extracted", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    extracted = json.loads(args.extracted.read_text(encoding="utf-8"))
    report = compare(args.annotations, extracted)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
