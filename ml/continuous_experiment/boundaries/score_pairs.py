"""Mede glosas, fronteiras e texto nas sequências montadas do MINDS."""

import argparse
from hashlib import file_digest
import json
from pathlib import Path

from ml.continuous_experiment.metrics import Edits, Segment, Segmentation


PROTOCOL = Path(__file__).parents[2] / "evidence/ufsc-boundaries/minds-pairs-protocol.json"


def summarize(conditions):
    glosses, suggested_text, text_from_reference = (Edits() for _ in range(3))
    boundaries = Segmentation()
    labeled_boundaries = Segmentation(labeled=True)
    exact_glosses = exact_text = exact_reference_text = suggestions = 0
    for condition in conditions:
        reference = [Segment(row["startMs"], row["endMs"], row["gloss"]) for row in condition["references"]]
        proposals = [Segment(row["startMs"], row["endMs"], row["gloss"]) for row in condition["proposals"]]
        accepted = [proposal for proposal in proposals if proposal.label is not None]
        expected_glosses = [item.label for item in reference]
        predicted_glosses = [item.label for item in accepted]
        expected_text = condition["referenceText"].split()
        text = (condition["suggestedText"] or "").split()
        from_reference = (condition["textFromReferenceGlosses"] or "").split()
        glosses.add(expected_glosses, predicted_glosses)
        suggested_text.add(expected_text, text)
        text_from_reference.add(expected_text, from_reference)
        boundaries.add(reference, proposals)
        labeled_boundaries.add(reference, accepted)
        suggestions += bool(text)
        exact_glosses += expected_glosses == predicted_glosses
        exact_text += expected_text == text
        exact_reference_text += expected_text == from_reference
    return {
        "cases": len(conditions), "suggestions": suggestions,
        "exactGlossSequences": exact_glosses, "exactSuggestedTexts": exact_text,
        "exactTextsFromReferenceGlosses": exact_reference_text,
        "glossEdits": glosses.report(), "suggestedTextEdits": suggested_text.report(),
        "textEditsFromReferenceGlosses": text_from_reference.report(),
        "boundaries": boundaries.report(), "labeledBoundaries": labeled_boundaries.report(),
    }


def digest(path):
    with path.open("rb") as file:
        return file_digest(file, "sha256").hexdigest()


def score(path):
    protocol = json.loads(PROTOCOL.read_text(encoding="utf-8"))
    report = json.loads(path.read_text(encoding="utf-8"))
    if (report["pairsProtocolSha256"] != digest(PROTOCOL)
            or report["protocolSha256"] != protocol["replayProtocolSha256"]):
        raise ValueError("O replay diverge do protocolo de sequências.")
    cases = report["cases"]
    decoders = [entry["id"] for entry in cases[0]["conditions"]]
    clips = {row["id"]: row for row in protocol["clips"]}
    if len(set(decoders)) != len(decoders):
        raise ValueError("Identificador de segmentador duplicado.")
    for case, reference in zip(cases, protocol["cases"], strict=True):
        if any(case[key] != reference[key] for key in ("id", "clips", "gapMs")):
            raise ValueError("Sequência diferente da referência congelada.")
        first, second = (clips[clip] for clip in reference["clips"])
        second_offset = first["endMs"] - first["startMs"] + reference["gapMs"]
        expected = [
            (clip["gloss"], clip["glossStartMs"] - clip["startMs"] + offset,
             clip["glossEndMs"] - clip["startMs"] + offset)
            for clip, offset in ((first, 0), (second, second_offset))
        ]
        if [entry["id"] for entry in case["conditions"]] != decoders:
            raise ValueError("Segmentadores divergentes entre as sequências.")
        for entry in case["conditions"]:
            intervals = [(row["gloss"], row["startMs"], row["endMs"]) for row in entry["references"]]
            if entry["referenceText"] != reference["referenceText"] or intervals != expected:
                raise ValueError("Referência de glosas ou texto divergente.")
        manual = [(row["gloss"], row["startMs"], row["endMs"]) for row in case["manualWindows"]]
        if manual != expected:
            raise ValueError("Janelas manuais diferentes da sequência anotada.")
    summaries = []
    for index, decoder in enumerate(decoders):
        rows = [case["conditions"][index] for case in cases]
        by_gap = {str(gap): summarize([case["conditions"][index] for case in cases if case["gapMs"] == gap])
                  for gap in sorted({case["gapMs"] for case in cases})}
        summaries.append({"id": decoder, **summarize(rows), "byGapMs": by_gap})
    manual = [row for case in cases for row in case["manualWindows"]]
    return {"schemaVersion": 1, "replaySha256": digest(path), "conditions": summaries,
            "manualWindows": {"total": len(manual),
                              "recognized": sum(row["score"]["label"] == row["gloss"] for row in manual)}}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("replay", type=Path)
    args = parser.parse_args()
    print(json.dumps(score(args.replay), ensure_ascii=False, indent=2))
