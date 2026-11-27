"""Mede a partição UFSC reservada usando apenas as condições congeladas."""

import argparse
import json
from pathlib import Path
from tempfile import TemporaryDirectory

import torch

from .acquire import SOURCES, digest
from .compare_fragmentation import SHORT_MS, assess, predict, short_matches
from .decode import DecodeConfig
from .extract import SAMPLE_MS
from .model import BoundaryModel
from .train import IOU, probabilities
from .train_holistic import load_holistic_examples


PROTOCOL = Path(__file__).with_name("fragmentation-reserved.json")
DEVELOPMENT_REPORT = PROTOCOL.parents[2] / "evidence/ufsc-boundaries/fragmentation-comparison.json"


def evaluate(directory):
    frozen = json.loads(PROTOCOL.read_text(encoding="utf-8"))
    if (frozen["schemaVersion"] != 1 or frozen["sourceProtocolSha256"] != digest(SOURCES)
            or frozen["developmentReportSha256"] != digest(DEVELOPMENT_REPORT)
            or frozen["sampleMs"] != SAMPLE_MS or frozen["shortCutoffMs"] != SHORT_MS
            or frozen["handOrder"] != ["left", "right"]
            or tuple(frozen["iouThresholds"]) != IOU or frozen["primaryIou"] != 0.50):
        raise ValueError("O protocolo reservado diverge das condições congeladas.")
    conditions = frozen["conditions"]
    states = {}
    for spec in conditions:
        path = directory / spec["checkpoint"]
        if digest(path) != spec["checkpointSha256"]:
            raise ValueError(f"Checkpoint divergente para {spec['name']}.")
        if path not in states:
            states[path] = torch.load(path, map_location="cpu", weights_only=True)
        if states[path]["duration_prior_ms"] != spec["durationPriorMs"]:
            raise ValueError(f"Duração de referência divergente para {spec['name']}.")

    rows = load_holistic_examples(directory, splits=("test",))["test"]
    if (sorted(row.data["id"] for row in rows) != frozen["clipIds"]
            or any(row.data["seconds"] != frozen["windowSeconds"]
                   or row.identity["model_sha256"] != frozen["visionModelSha256"] for row in rows)):
        raise ValueError("Recortes ou modelo de visão divergentes na avaliação reservada.")
    scores = {}
    for path, state in states.items():
        model = BoundaryModel(rows[0].design.shape[1])
        model.load_state_dict(state["weights"])
        scores[path] = probabilities(model.eval(), state["mean"], state["std"], rows)

    baselines = {}
    for spec in conditions:
        path = directory / spec["checkpoint"]
        if not spec["controls"]:
            decoder = DecodeConfig(**spec["decoder"])
            baselines[path] = short_matches(rows, predict(rows, scores[path], spec["durationPriorMs"], decoder, {}))
    results = {}
    for spec in conditions:
        path = directory / spec["checkpoint"]
        results[spec["name"]] = assess(rows, scores[path], spec["durationPriorMs"], DecodeConfig(**spec["decoder"]),
                                      spec["controls"], baselines[path])
    return {
        "schema_version": 1,
        "protocol_sha256": digest(PROTOCOL),
        "development_report_sha256": frozen["developmentReportSha256"],
        "evaluation_split": "test",
        "sample_ms": SAMPLE_MS,
        "vision_model_sha256": frozen["visionModelSha256"],
        "development_extractor_sha256": frozen["developmentExtractorSha256"],
        "reserved_extractor_sha256": rows[0].identity["extractor_sha256"],
        "torch": str(torch.__version__),
        "reference": [{"id": row.data["id"], "annotation_sha256": row.data["annotation_sha256"],
                       "landmarks_sha256": row.provenance["landmarks_sha256"],
                       "video_prefix_sha256": row.data["video_prefix_sha256"], "intervals": len(row.reference)}
                      for row in rows],
        "conditions": results,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", nargs="?", type=Path, default=Path("data/ufsc-boundaries"))
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    torch.set_num_threads(1)
    report = evaluate(args.directory)
    output = args.out or args.directory / "holistic/test/fragmentation-comparison.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=output.parent) as staging:
        temporary = Path(staging) / output.name
        temporary.write_text(json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
        temporary.replace(output)
    print(output)


if __name__ == "__main__":
    main()
