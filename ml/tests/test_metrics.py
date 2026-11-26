"""Cenários de rejeição, confusão de classe e calibração."""

from dataclasses import replace
from unittest import TestCase

import numpy as np

from dataset import Clip
from metrics import checks, choose_threshold, decide, measure, recognition_breakdown


def clip(index, label, state="ready"):
    return Clip(index, label, index, "val", str(index), str(label), state, None, [])


class MetricsTests(TestCase):
    def test_missing_hand_counts_as_false_negative(self):
        rows = [clip(0, 1, "no-hand"), clip(1, 1), clip(2, 2), clip(3, 3), clip(4, 0)]
        scores = {
            1: [0, 5, 0, 0], 2: [0, 0, 5, 0], 3: [0, 0, 5, 4], 4: [0, 0, 0, 5],
        }
        result, details = measure(rows, scores, .5)
        self.assertEqual(result["matrix"], [[0, 0, 0, 1], [1, 1, 0, 0],
                                            [0, 0, 1, 0], [0, 0, 1, 0]])
        self.assertEqual(result["byLabel"]["cinco"]["recall"], .5)
        self.assertEqual(result["byLabel"]["espelho"]["precision"], .5)
        self.assertEqual(result["coverage"], {"count": 3, "total": 4, "rate": .75})
        self.assertEqual(result["falseAcceptance"]["rate"], 1)
        self.assertEqual(result["inconclusive"]["count"], 1)
        self.assertEqual(details[0]["captureState"], "no-hand")
        self.assertIsNone(details[0]["confidence"])

    def test_choose_threshold_only_uses_validation_and_prefers_rejection(self):
        rows = [clip(0, 1), clip(1, 2), clip(2, 3), clip(3, 0)]
        scores = {0: [0, 5, 0, 0], 1: [0, 0, 5, 0], 2: [0, 0, 0, 5], 3: [0, 0, 0, .5]}
        _, threshold, result = choose_threshold(rows, scores)
        self.assertGreater(threshold, decide(scores[3], 0)[1])
        self.assertTrue(all(checks(result).values()))
        self.assertEqual(result["f1Macro"], 1)
        with self.assertRaisesRegex(ValueError, "exclusivamente"):
            choose_threshold([*rows[:-1], replace(rows[-1], partition="test")], scores)

    def test_equal_logits_select_first_class(self):
        self.assertEqual(decide(np.ones(4), .25), (0, .25))
        self.assertEqual(decide([0., 3., 3., 0.], .6)[0], 0)

    def test_diagnosis_distinguishes_threshold_from_incorrect_winner_and_capture(self):
        rows = [clip(index, 3) for index in range(5)] + [clip(5, 0)]
        scores = {
            1: [0, 0, 0, 6], 2: [0, 0, 0, .2], 3: [4, 0, 0, 3],
            4: [0, 0, .3, .2], 5: [0, 0, 0, 3],
        }
        breakdown = recognition_breakdown(rows, scores, .7)
        self.assertEqual(breakdown["amarelo"], {
            "correct": 1, "capture": 1, "belowThreshold": 1, "outOfCatalogWinner": 1, "wrongLabelWinner": 1,
        })
        self.assertEqual(sum(breakdown["espelho"].values()), 0)

    def test_threshold_uses_middle_of_equally_effective_validation_range(self):
        rows = [clip(0, 1), clip(1, 2), clip(2, 3), clip(3, 0)]
        scores = {0: [0, 5, 0, 0], 1: [0, 0, 5, 0], 2: [0, 0, 0, 5], 3: [5, 0, 0, 0]}
        _, threshold, result = choose_threshold(rows, scores)
        self.assertAlmostEqual(threshold, (.25 + .98) / 2)
        self.assertEqual(result["f1Macro"], 1)
