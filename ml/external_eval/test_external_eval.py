import json
from pathlib import Path
from unittest import TestCase

import numpy as np

from dataset import FEATURE_COUNTS, FEATURES, FRAMES, NOSE_PREPROCESS
from ml.external_eval.evaluate import classified, summarize
from ml.external_eval.prepare import DEVELOPMENT, SOURCE, prepare, validate_clips


class ExternalMetricsTests(TestCase):
    def test_tracks_failed_capture_for_both_denominators(self):
        rows = [
            {"subject": 1, "predicted": "amarelo", "captureState": "ready"},
            {"subject": 1, "predicted": None, "captureState": "insufficient"},
            {"subject": 2, "predicted": None, "captureState": "ready"},
            {"subject": 2, "predicted": None, "captureState": "no-hand"},
        ]
        stats = summarize(rows)
        self.assertEqual(stats["falseAcceptance"], {"count": 1, "total": 4, "rate": .25})
        self.assertEqual(stats["falseAcceptanceGivenUsableTracking"], {"count": 1, "total": 2, "rate": .5})
        self.assertEqual(stats["subjectsWithAnyFalseAcceptance"], {"count": 1, "total": 2, "rate": .5})
        self.assertIsNone(summarize(rows[1:2])["falseAcceptanceGivenUsableTracking"]["rate"])

    def test_capture_failed_skips_session_and_confidence_matches_threshold(self):
        class Session:
            def __init__(self, feature_count):
                self.feature_count = feature_count

            def run(self, outputs, inputs):
                if inputs["landmarks"].shape != (1, FRAMES, self.feature_count):
                    raise AssertionError("Entrada ONNX tem dimensões inesperadas.")
                return (np.array([[0., .5]]),)

        labels = [None, "cinco"]
        self.assertEqual(classified(None, {"state": "no-hand", "values": None}, labels, .75), (None, None))
        sample = {"state": "ready", "values": [0.] * (FRAMES * FEATURES)}
        self.assertIsNone(classified(Session(FEATURES), sample, labels, .75)[0])
        self.assertEqual(classified(Session(FEATURES), sample, labels, .60)[0], "cinco")
        nose_count = FEATURE_COUNTS[NOSE_PREPROCESS]
        nose_sample = {"state": "ready", "values": [0.] * (FRAMES * nose_count)}
        self.assertEqual(classified(Session(nose_count), nose_sample, labels, .60, nose_count)[0], "cinco")
        with self.assertRaisesRegex(ValueError, "Forma ou valores"):
            classified(Session(nose_count), sample, labels, .60, nose_count)

    def test_protocol_has_independent_non_overlapping_windows(self):
        def example(id_, start, group, subject):
            return {"id": "clad-" + id_, "video": 25 + subject, "subject": subject,
                    "startMs": start, "stratum": group, "observation": "Pausa."}

        clips = [
            example("a", 0, "repouso", 1), example("b", 0, "repouso", 2),
            example("c", 4000, "movimento-comum", 1), example("d", 4000, "movimento-comum", 2),
        ]
        validate_clips(clips)
        with self.assertRaisesRegex(ValueError, "sobrepostos"):
            validate_clips([*clips[:-1], {**clips[-1], "startMs": 3000}])
        with self.assertRaisesRegex(ValueError, "2 pessoas"):
            validate_clips(clips[:-1])

    def test_evaluation_actors_cannot_be_used_in_development(self):
        protocol = json.loads(SOURCE.read_text(encoding="utf-8"))
        development = json.loads(DEVELOPMENT.read_text(encoding="utf-8"))
        self.assertEqual({row["subject"] for row in development}, {4})
        validate_clips(development, minimum_people=1)
        with self.assertRaisesRegex(ValueError, "separadas"):
            prepare(protocol, Path("."), source_path=DEVELOPMENT, development=True)
