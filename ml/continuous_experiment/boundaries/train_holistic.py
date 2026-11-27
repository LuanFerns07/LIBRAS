"""Adapta o detector de fronteiras ao Holistic Web usando treino e validação do recorte UFSC."""

import argparse
from dataclasses import asdict
import json
from pathlib import Path
import re
from statistics import median
from tempfile import TemporaryDirectory

import numpy as np
import torch

from ..segment import hand_motion, read_eaf
from .acquire import digest, load_sources, video_name
from .decode import DecodeConfig, decode
from .extract import SAMPLE_MS, restrict_cpu
from .model import BoundaryModel, features, targets
from .train import Example, choose_decoder, example_report, fit, measure, probabilities


DEV_SPLITS = {"train": 4, "dev": 2}
SHA256 = re.compile(r"[0-9a-f]{64}")


def load_holistic_points(path, case, times):
    payload = json.loads(path.read_text(encoding="utf-8"))
    expected = {
        "schemaVersion": 1, "id": case["id"], "split": case["split"],
        "videoSha256": case["video_prefix_sha256"], "sampleMs": SAMPLE_MS,
        "handOrder": ["left", "right"], "times": times.tolist(),
    }
    if any(payload.get(key) != value for key, value in expected.items()):
        raise ValueError(f"Captura Holistic de {case['id']} incompatível com o recorte planejado.")
    hashes = (payload.get("modelSha256"), payload.get("extractorSha256"))
    if not all(isinstance(value, str) and SHA256.fullmatch(value) for value in hashes):
        raise ValueError(f"Receita de extração ausente ou inválida em {path.name}.")

    frames = payload.get("points")
    if not isinstance(frames, list) or len(frames) != len(times):
        raise ValueError(f"Quantidade de quadros incompatível em {path.name}.")
    points = np.full((len(times), 2, 21, 3), np.nan, dtype=np.float32)
    for index, frame in enumerate(frames):
        if not isinstance(frame, list) or len(frame) != 2:
            raise ValueError(f"Frame {index} de {path.name} deve representar as duas mãos.")
        for side, hand in enumerate(frame):
            if hand is None:
                continue
            coordinates = np.asarray(hand, dtype=np.float32)
            if coordinates.shape != (21, 3) or not np.isfinite(coordinates).all():
                raise ValueError(f"Landmarks inválidos no frame {index} de {path.name}.")
            points[index, side] = coordinates
    return points, hashes


def load_holistic_examples(directory):
    sources = load_sources()
    known = {case["id"]: case for case in sources["cases"] if case["split"] in DEV_SPLITS}
    media = json.loads((directory / "media.json").read_text(encoding="utf-8"))
    cohort = [case for case in media if case["id"] in known]
    if len(cohort) != len(known) or {case["id"] for case in cohort} != set(known):
        raise ValueError("O manifesto local deve conter todas as gravações de treino e validação, uma vez cada.")
    rows = {split: [] for split in DEV_SPLITS}
    times = np.arange(0, sources["seconds"] * 1000, SAMPLE_MS)
    recipes = set()
    video_hashes = set()
    for case in cohort:
        case_id = case["id"]
        planned = known[case_id]
        if (any(case.get(key) != value for key, value in planned.items())
                or case["seconds"] != sources["seconds"] or case["tier"] != sources["tier"]
                or case["video"] != video_name(planned, sources["camera"])
                or case["annotation"] != f"{case_id}.eaf"):
            raise ValueError(f"O item {case_id} não corresponde ao recorte planejado.")
        video_hash = case["video_prefix_sha256"]
        if video_hash in video_hashes or not SHA256.fullmatch(video_hash):
            raise ValueError(f"Hash de vídeo inválido ou duplicado no item {case_id}.")
        video_hashes.add(video_hash)

        annotation = directory / case["annotation"]
        if digest(annotation) != case["annotation_sha256"]:
            raise ValueError(f"Anotação do item {case_id} divergiu do manifesto.")
        path = directory / "holistic" / f"{case_id}.json"
        points, recipe = load_holistic_points(path, case, times)
        recipes.add(recipe)
        reference = read_eaf(annotation, case["tier"], case["video"], case["seconds"] * 1000)
        if not reference:
            raise ValueError(f"Trilha sem referência no item {case_id}.")
        identity = {"model_sha256": recipe[0], "extractor_sha256": recipe[1]}
        provenance = {"extractor": "MediaPipe Holistic Web", "sample_ms": SAMPLE_MS, "landmarks_sha256": digest(path)}
        rows[case["split"]].append(Example(
            case, times, points, features(points), targets(times, reference), reference,
            hand_motion(times, points[..., :2]), identity, provenance,
        ))
    if {split: len(examples) for split, examples in rows.items()} != DEV_SPLITS:
        raise ValueError("A adaptação requer quatro gravações de treino e duas de validação.")
    if len(recipes) != 1:
        raise ValueError("Use a mesma receita Holistic nos seis recortes.")
    return rows


def score_with_duration(rows, predictions):
    result, = measure(rows, predictions, (0.5,))
    durations = [segment.end_ms - segment.start_ms for segments in predictions for segment in segments]
    return {**result, "median_predicted_duration_ms": median(durations) if durations else None}


def score_decoder(rows, scores, duration_prior, config):
    segments = [decode(row.times, values, duration_prior, config) for row, values in zip(rows, scores, strict=True)]
    return {
        "decoder": asdict(config), "duration_prior_train_ms": duration_prior,
        "aggregate": score_with_duration(rows, segments),
        "cases": {str(row.data["id"]): score_with_duration([row], [prediction])
                  for row, prediction in zip(rows, segments, strict=True)},
    }


def compare(directory, epochs, seed):
    rows = load_holistic_examples(directory)
    dev = rows["dev"]
    original = directory / "boundary-model.pt"
    baseline = torch.load(original, map_location="cpu", weights_only=True)
    baseline_model = BoundaryModel(rows["train"][0].design.shape[1])
    baseline_model.load_state_dict(baseline["weights"])
    baseline_scores = probabilities(baseline_model.eval(), baseline["mean"], baseline["std"], dev)
    baseline_report = score_decoder(
        dev, baseline_scores, baseline["duration_prior_ms"], DecodeConfig(**baseline["decode"]),
    )

    model, mean, std, (val_loss, epoch) = fit(rows, epochs, seed)
    duration = float(np.median([segment.end_ms - segment.start_ms
                               for row in rows["train"] for segment in row.reference]))
    scores = probabilities(model, mean, std, dev)
    decoder = choose_decoder(dev, scores, duration)
    candidate_report = score_decoder(dev, scores, duration, decoder)
    candidate = {"weights": model.state_dict(), "mean": mean, "std": std, "decode": asdict(decoder),
                 "duration_prior_ms": duration}
    output = directory / "holistic"
    with TemporaryDirectory(dir=output) as staging:
        checkpoint = Path(staging) / "boundary-model.pt"
        torch.save(candidate, checkpoint)
        report = {
            "schema_version": 1,
            "source": "Corpus de Libras UFSC, G1, entrevistas e trilha direita da câmera 3",
            "features": "MediaPipe Holistic Web para ambos os modelos",
            "sample_ms": SAMPLE_MS,
            "evaluation_split": "dev",
            "reserved_test_used": False,
            "coverage": {split: [example_report(row) for row in examples] for split, examples in rows.items()},
            "baseline": {"training_features": "MediaPipe Hand Landmarker",
                         "retuned_on_holistic_dev": False, "checkpoint_sha256": digest(original), **baseline_report},
            "candidate": {"training_features": "MediaPipe Holistic Web",
                          "checkpoint_selected_on_reported_dev": True, "decoder_selected_on_reported_dev": True,
                          "checkpoint_sha256": digest(checkpoint),
                          "training": {"epochs": epochs, "seed": seed, "selected_epoch": epoch,
                                       "selected_checkpoint_dev_bce": val_loss, "torch": str(torch.__version__),
                                       "threads": torch.get_num_threads()},
                          **candidate_report},
        }
        report_path = Path(staging) / "comparison.json"
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
                               encoding="utf-8")
        checkpoint.replace(output / checkpoint.name)
        report_path.replace(output / report_path.name)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", nargs="?", type=Path, default=Path("data/ufsc-boundaries"))
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--seed", type=int, default=2845)
    args = parser.parse_args()
    if args.epochs < 1:
        parser.error("Escolha ao menos uma época.")
    restrict_cpu()
    torch.set_num_threads(2)
    torch.set_num_interop_threads(1)
    report = compare(args.directory, args.epochs, args.seed)
    print(json.dumps({model: report[model]["aggregate"] for model in ("baseline", "candidate")},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
