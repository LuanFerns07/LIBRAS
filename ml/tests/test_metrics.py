"""Cenários de rejeição, confusão de classe e calibração."""

from dataclasses import replace
from unittest import TestCase

import numpy as np

from dataset import Clip
from metrics import checks, choose_threshold, decide, measure


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
