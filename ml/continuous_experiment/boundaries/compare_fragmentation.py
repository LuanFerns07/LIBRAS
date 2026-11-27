"""Compara regras de duração nas duas gravações Holistic de validação da UFSC."""

import argparse
from dataclasses import asdict
import json
from pathlib import Path
from statistics import median
from tempfile import TemporaryDirectory

import numpy as np
import torch

from ..metrics import intersection_over_union, match_intervals
from .acquire import digest
from .decode import DecodeConfig, RECOGNIZER_MIN_FRAMES, decode
from .extract import SAMPLE_MS
from .model import BoundaryModel
from .train import IOU, decoder_grid, measure, probabilities
from .train_holistic import load_holistic_examples


SHORT_MS = SAMPLE_MS * RECOGNIZER_MIN_FRAMES
FLOOR = {"min_frames": RECOGNIZER_MIN_FRAMES}
WEAK_CUT = {"cut_penalty": 0.25}
PROFILES = {
    "retuned": {},
    "floor_retuned": FLOOR,
    "soft_retuned": {"short_penalty": 0.45},
    "linear_retuned": {"activity_power": 1},
    "linear_floor_retuned": {**FLOOR, "activity_power": 1},
    "weak_cut_retuned": WEAK_CUT,
    "weak_cut_floor_retuned": {**FLOOR, **WEAK_CUT},
}


def predict(rows, scores, prior, config, controls):
    return [decode(row.times, values, prior, config, **controls)
            for row, values in zip(rows, scores, strict=True)]


def is_short(interval):
    return interval.end_ms - interval.start_ms < SHORT_MS


def short_matches(rows, proposals):
    return {(row.data["id"], reference.start_ms, reference.end_ms)
            for row, segments in zip(rows, proposals, strict=True)
            for reference, _ in match_intervals(row.reference, segments, 0.5) if is_short(reference)}


def select_decoder(rows, scores, prior, controls):
    def quality(config):
        proposals = predict(rows, scores, prior, config, controls)
        result, = measure(rows, proposals, (0.5,))
        return (result["f1"], -sum(is_short(segment) for group in proposals for segment in group),
                len(short_matches(rows, proposals)), result["matched_mean_iou"] or 0)

    return max(decoder_grid(), key=quality)


def describe(rows, proposals):
    durations = [segment.end_ms - segment.start_ms for segments in proposals for segment in segments]
    fragmented = 0
    merged = 0
    with_five_hand_frames = 0
    for row, estimates in zip(rows, proposals, strict=True):
        fragmented += sum(sum(intersection_over_union(reference, estimate) >= 0.25 for estimate in estimates) > 1
                          for reference in row.reference)
        merged += sum(sum(intersection_over_union(reference, estimate) >= 0.25 for reference in row.reference) > 1
                      for estimate in estimates)
        with_hand = np.isfinite(row.points).all(axis=(2, 3)).any(axis=1)
        for segment in estimates:
            start, end = np.searchsorted(row.times, [segment.start_ms, segment.end_ms])
            with_five_hand_frames += int(np.count_nonzero(with_hand[start:end]) >= RECOGNIZER_MIN_FRAMES)
    return {
        "scores_by_iou": measure(rows, proposals, IOU),
        "predicted_under_500ms": sum(length < SHORT_MS for length in durations),
        "predicted_median_duration_ms": median(durations) if durations else None,
        "predicted_with_at_least_five_hand_frames": with_five_hand_frames,
        "reference_under_500ms": sum(is_short(segment) for row in rows for segment in row.reference),
        "matched_reference_under_500ms_at_iou_050": len(short_matches(rows, proposals)),
        "references_overlapping_multiple_predictions_at_iou_025": fragmented,
        "predictions_overlapping_multiple_references_at_iou_025": merged,
    }


def assess(rows, scores, prior, config, controls, frozen_short):
    proposals = predict(rows, scores, prior, config, controls)
    return {
        "decoder": asdict(config),
        "controls": controls,
        "aggregate": describe(rows, proposals),
        "by_case": {str(row.data["id"]): describe([row], [segments])
                    for row, segments in zip(rows, proposals, strict=True)},
        "short_references_also_matched_by_frozen": len(short_matches(rows, proposals) & frozen_short),
    }


def compare_checkpoint(checkpoint, rows):
    state = torch.load(checkpoint, map_location="cpu", weights_only=True)
    model = BoundaryModel(rows[0].design.shape[1])
    model.load_state_dict(state["weights"])
    scores = probabilities(model.eval(), state["mean"], state["std"], rows)
    prior = state["duration_prior_ms"]
    frozen = DecodeConfig(**state["decode"])
    frozen_short = short_matches(rows, predict(rows, scores, prior, frozen, {}))
    results = {
        "frozen": assess(rows, scores, prior, frozen, {}, frozen_short),
        "floor_frozen": assess(rows, scores, prior, frozen, FLOOR, frozen_short),
        "weak_cut_frozen": assess(rows, scores, prior, frozen, WEAK_CUT, frozen_short),
    }
    for name, controls in PROFILES.items():
        config = select_decoder(rows, scores, prior, controls)
        results[name] = assess(rows, scores, prior, config, controls, frozen_short)

    cross = {}
    for index, row in enumerate(rows):
        other = 1 - index
        cross[str(row.data["id"])] = {"decoder_tuned_on": rows[other].data["id"], "profiles": {}}
        for profile in ("retuned", "floor_retuned", "weak_cut_retuned", "weak_cut_floor_retuned"):
            controls = PROFILES[profile]
            config = select_decoder([rows[other]], [scores[other]], prior, controls)
            cross[str(row.data["id"])]["profiles"][profile] = {
                "decoder": asdict(config),
                "metrics": describe([row], predict([row], [scores[index]], prior, config, controls)),
            }
    return {
        "checkpoint_sha256": digest(checkpoint),
        "duration_prior_train_ms": prior,
        "profiles": results,
        "cross_check_within_dev": cross,
    }


def compare(directory):
    rows = load_holistic_examples(directory, splits=("dev",))["dev"]
    return {
        "schema_version": 1,
        "source": "Corpus de Libras UFSC, G1 D4, câmera 3, trilha 2SinaisD",
        "reserved_test_opened": False,
        "sample_ms": SAMPLE_MS,
        "gloss_recognizer_minimum_valid_frames": RECOGNIZER_MIN_FRAMES,
        "selection": "F1 IoU ≥ 0,50, menos propostas curtas, mais referências curtas pareadas e IoU médio",
        "reference": [{"id": row.data["id"], "annotation_sha256": row.data["annotation_sha256"],
                       "landmarks_sha256": row.provenance["landmarks_sha256"], "intervals": len(row.reference)}
                      for row in rows],
        "models": {
            "original": compare_checkpoint(directory / "boundary-model.pt", rows),
            "holistic": compare_checkpoint(directory / "holistic" / "boundary-model.pt", rows),
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", nargs="?", type=Path, default=Path("data/ufsc-boundaries"))
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    torch.set_num_threads(1)
    output = args.out or args.directory / "holistic" / "fragmentation-comparison.json"
    report = compare(args.directory)
    output.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=output.parent) as staging:
        temporary = Path(staging) / output.name
        temporary.write_text(json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
        temporary.replace(output)
    print(output)


if __name__ == "__main__":
    main()
