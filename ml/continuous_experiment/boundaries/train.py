"""Treina e compara fronteiras com partições fixas de duplas do Corpus Libras."""

import argparse
import copy
from dataclasses import asdict, dataclass
from itertools import product
import json
from pathlib import Path

import numpy as np
import torch

from ..metrics import Segmentation
from ..segment import hand_motion, read_eaf, segment_motion
from .acquire import digest, load_sources, video_name
from .decode import DecodeConfig, decode
from .extract import SAMPLE_MS, restrict_cpu
from .model import BoundaryModel, features, targets


SPLITS = ("train", "dev", "test")
IOU = (0.25, 0.5, 0.75)


@dataclass
class Example:
    data: dict
    times: np.ndarray
    points: np.ndarray
    design: np.ndarray
    target: np.ndarray
    reference: list
    motion: np.ndarray
    identity: dict
    provenance: dict


def load_examples(directory):
    known = load_sources()
    expected = {case["id"]: case for case in known["cases"]}
    actual = json.loads((directory / "media.json").read_text(encoding="utf-8"))
    if len(actual) != len(expected) or {case["id"] for case in actual} != set(expected):
        raise ValueError("O manifesto não confere com o recorte oficial planejado.")
    rows = {split: [] for split in SPLITS}
    seen_hashes = set()
    recipes = set()
    for case in actual:
        expected_case = expected[case["id"]]
        if any(value != case[key] for key, value in expected_case.items()):
            raise ValueError("A entrada não corresponde à partição planejada.")
        if (case["video"] != video_name(expected_case, known["camera"])
                or case["tier"] != known["tier"] or case["seconds"] != known["seconds"]):
            raise ValueError("Câmera, trilha ou janela incompatível.")
        if case["video_prefix_sha256"] in seen_hashes:
            raise ValueError("Gravação duplicada nas partições.")
        annotation_path = directory / case["annotation"]
        if digest(annotation_path) != case["annotation_sha256"]:
            raise ValueError(f"Anotação do item {case['id']} divergiu do manifesto.")
        seen_hashes.add(case["video_prefix_sha256"])

        with np.load(directory / f"{case['id']}-hands.npz", allow_pickle=False) as raw:
            times = raw["timestamps"]
            hand = raw["points"]
            identity = json.loads(str(raw["identity"]))
            provenance = json.loads(str(raw["provenance"]))
        if (identity["video_sha256"] != case["video_prefix_sha256"]
                or identity["seconds"] != case["seconds"]):
            raise ValueError("Landmarks divergiram do recorte planejado.")
        if not np.array_equal(times, np.arange(0, case["seconds"] * 1000, SAMPLE_MS)):
            raise ValueError("Timestamps incompatíveis com o recorte planejado.")
        recipes.add((identity["model_sha256"], identity["extractor_sha256"]))

        reference = read_eaf(annotation_path, case["tier"], case["video"], case["seconds"] * 1000)
        if not reference:
            raise ValueError(f"Trilha sem referência em {case['id']}.")
        rows[case["split"]].append(Example(
            case, times, hand, features(hand), targets(times, reference), reference,
            hand_motion(times, hand[..., :2]), identity, provenance,
        ))
    if len(recipes) != 1:
        raise ValueError("As gravações devem usar a mesma receita de extração.")
    return rows


def example_report(example):
    present = np.isfinite(example.points).all(axis=(2, 3)).any(axis=1)
    active = example.target[:, 0] == 1
    return {
        "id": example.data["id"], "dyad": example.data["dyad"], "source": example.data["video"],
        "annotation_sha256": example.data["annotation_sha256"],
        "video_prefix_sha256": example.data["video_prefix_sha256"],
        "model_sha256": example.identity["model_sha256"],
        "extractor_sha256": example.identity["extractor_sha256"],
        "extractor": example.provenance,
        "intervals": len(example.reference), "frames": len(example.times),
        "frames_with_hand": int(present.sum()), "annotated_active_frames": int(active.sum()),
        "annotated_active_frames_with_hand": int((present & active).sum()),
    }


def arrays(rows):
    x = torch.from_numpy(np.stack([example.design.T for example in rows]))
    y = torch.from_numpy(np.stack([example.target.T for example in rows]))
    return x, y


def fit(rows, epochs, seed):
    torch.manual_seed(seed)
    model = BoundaryModel(rows["train"][0].design.shape[1])
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.003, weight_decay=0.01)
    x_train, y_train = arrays(rows["train"])
    x_dev, y_dev = arrays(rows["dev"])
    mean = x_train.mean(dim=(0, 2), keepdim=True)
    std = x_train.std(dim=(0, 2), keepdim=True).clamp_min(0.05)
    x_train = (x_train - mean) / std
    x_dev = (x_dev - mean) / std
    all_positives = y_train.sum(dim=(0, 2))
    count = y_train.shape[0] * y_train.shape[2]
    weights = ((count - all_positives) / all_positives.clamp_min(1)).sqrt().clamp(1, 6)
    objective = torch.nn.BCEWithLogitsLoss(pos_weight=weights[None, :, None])

    best = None
    state = None
    for epoch in range(1, epochs + 1):
        model.train()
        optimizer.zero_grad(set_to_none=True)
        loss = objective(model(x_train), y_train)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=5)
        optimizer.step()

        model.eval()
        with torch.inference_mode():
            val_loss = float(objective(model(x_dev), y_dev))
        if best is None or val_loss < best[0]:
            best = val_loss, epoch
            state = copy.deepcopy(model.state_dict())
        if epoch == 1 or epoch % 10 == 0:
            print(f"Época {epoch:02}: BCE validação {val_loss:.4f}", flush=True)
    model.load_state_dict(state)
    return model.eval(), mean, std, best


def probabilities(model, mean, std, rows):
    x = torch.from_numpy(np.stack([example.design.T for example in rows]))
    with torch.inference_mode():
        logits = model((x - mean) / std)
        return torch.sigmoid(logits).numpy().transpose(0, 2, 1)


def measure(rows, outputs, thresholds=IOU):
    measures = []
    for cutoff in thresholds:
        scorer = Segmentation(cutoff)
        for example, guessed in zip(rows, outputs, strict=True):
            scorer.add(example.reference, guessed)
        measures.append(scorer.report())
    return measures


def key(metrics):
    return (metrics["f1"] or 0, metrics["matched_mean_iou"] or 0,
            -abs(metrics["reference_intervals"] - metrics["predicted_intervals"]))


def choose_decoder(rows, probabilities, duration_prior):
    values = product((0.35, 0.52, 0.68), (0.1, 0.3, 0.5), (0.15, 0.35, 0.55), (0.10, 0.25))
    selected = None
    best = None
    for guess in (DecodeConfig(*config) for config in values):
        outputs = [decode(row.times, scores, duration_prior, guess) for row, scores in zip(rows, probabilities, strict=True)]
        quality = key(measure(rows, outputs, (0.5,))[0])
        if best is None or quality > best:
            best = quality
            selected = guess
    return selected


def choose_baseline(rows):
    values = product((0.5, 0.8, 1.2, 1.8, 2.5, 3.5), (100, 160, 230), (0, 65, 125))
    selected = None
    best = None
    for threshold, minimum, bridge in values:
        config = {"threshold": threshold, "min_ms": minimum, "bridge_ms": bridge}
        outputs = [segment_motion(row.times, row.motion, **config) for row in rows]
        quality = key(measure(rows, outputs, (0.5,))[0])
        if best is None or quality > best:
            best = quality
            selected = config
    return selected


def analyze(rows, model, mean, std):
    duration_prior = float(np.median([
        segment.end_ms - segment.start_ms for example in rows["train"] for segment in example.reference
    ]))
    dev_probs = probabilities(model, mean, std, rows["dev"])
    decoder = choose_decoder(rows["dev"], dev_probs, duration_prior)
    baseline = choose_baseline(rows["dev"])
    report = {}
    for split in ("dev", "test"):
        data = rows[split]
        prediction = dev_probs if split == "dev" else probabilities(model, mean, std, data)
        supervised = [decode(row.times, scores, duration_prior, decoder)
                      for row, scores in zip(data, prediction, strict=True)]
        motion = [segment_motion(row.times, row.motion, **baseline) for row in data]
        report[split] = {
            "motion": measure(data, motion),
            "supervised": measure(data, supervised),
            "cases": {
                str(row.data["id"]): {
                    "motion": measure([row], [naive]),
                    "supervised": measure([row], [learned]),
                } for row, naive, learned in zip(data, motion, supervised, strict=True)
            },
        }
    return report, asdict(decoder), baseline, duration_prior


def main():
    restrict_cpu()
    torch.set_num_threads(2)
    torch.set_num_interop_threads(1)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--seed", type=int, default=2845)
    args = parser.parse_args()
    if args.epochs < 1:
        parser.error("Escolha ao menos uma época.")
    rows = load_examples(args.directory)
    model, mean, std, (val_loss, epoch) = fit(rows, args.epochs, args.seed)
    scores, decoder, baseline, duration_prior = analyze(rows, model, mean, std)
    report = {
        "source": "Corpus de Libras UFSC, G1, entrevistas e trilha direita da câmera 3",
        "test_has_previously_measured_records": False,
        "training": {
            "device": "cpu", "torch": str(torch.__version__), "threads": torch.get_num_threads(),
            "seed": args.seed, "epochs": args.epochs, "selected_epoch": epoch,
            "selected_checkpoint_dev_bce": val_loss,
        },
        "controls_selected_on_dev": {
            "decoder": decoder, "motion": baseline, "duration_prior_train_ms": duration_prior,
        },
        "coverage": {split: [example_report(row) for row in rows[split]] for split in SPLITS},
        "metrics": scores,
    }
    output = args.directory / "supervised-results.json"
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    torch.save({"weights": model.state_dict(), "mean": mean, "std": std, "decode": decoder,
                "duration_prior_ms": duration_prior}, args.directory / "boundary-model.pt")
    print(json.dumps({mode: results[1] for mode, results in scores["test"].items() if mode != "cases"},
                     ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
