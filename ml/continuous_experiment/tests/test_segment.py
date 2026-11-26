import unittest

import numpy as np

from ml.continuous_experiment.metrics import Segment
from ml.continuous_experiment.segment import hand_motion, segment_motion


class SegmentTest(unittest.TestCase):
    def test_proposals_respect_bridging_and_minimum_duration(self):
        times = np.arange(0, 801, 100)
        scores = np.array([1.2, 1.1, 0.1, 0.9, 0.8, 0.1, 0.1, 1.2])
        outputs = segment_motion(times, scores, threshold=0.5, min_ms=150, bridge_ms=100)
        self.assertEqual(outputs, [Segment(0, 500)])

    def test_missing_hand_does_not_create_motion(self):
        times = np.arange(0, 201, 50)
        points = np.zeros((5, 2, 21, 2), dtype=np.float32)
        points[:, 0] = np.nan
        points[2, 1] = np.nan
        np.testing.assert_array_equal(hand_motion(times, points), np.zeros(4))


if __name__ == "__main__":
    unittest.main()
