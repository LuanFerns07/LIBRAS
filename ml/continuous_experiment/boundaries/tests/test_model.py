import unittest

import numpy as np

from ml.continuous_experiment.boundaries.decode import DecodeConfig, decode
from ml.continuous_experiment.boundaries.model import features, targets
from ml.continuous_experiment.metrics import Segment


class TemporalTest(unittest.TestCase):
    def test_real_time_targets_do_not_make_boundary_at_right_crop(self):
        times = np.arange(0, 800, 100)
        labels = targets(times, [Segment(150, 400), Segment(700, 800)])
        self.assertEqual(int(labels[:, 0].sum()), 4)
        self.assertEqual(np.flatnonzero(labels[:, 1] == 1).tolist(), [2, 7])
        self.assertEqual(np.flatnonzero(labels[:, 2] == 1).tolist(), [4])

    def test_decoder_separates_touching_positive_signs(self):
        times = np.arange(0, 800, 100)
        prediction = np.zeros((8, 3))
        prediction[1:7, 0] = 0.85
        prediction[[1, 4], 1] = 0.98
        prediction[[4, 7], 2] = 0.99
        config = DecodeConfig(0.5, 0.8, 0.7, 0.3)
        expected = [Segment(100, 400), Segment(400, 700)]
        self.assertEqual(decode(times, prediction, 300, config), expected)
        self.assertEqual(decode(times, prediction, 300, config, short_penalty=0.45), expected)
        self.assertEqual(decode(times, prediction, 300, config, min_frames=5), [Segment(100, 700)])

    def test_soft_cost_rejects_weak_short_segments_and_floor_handles_short_clip(self):
        times = np.arange(0, 800, 100)
        prediction = np.zeros((8, 3))
        prediction[2:4, 0] = 0.6
        prediction[2, 1] = prediction[4, 2] = 0.5
        config = DecodeConfig(0.5, 0.2, 0.2, 0)
        self.assertEqual(decode(times, prediction, 300, config), [Segment(200, 400)])
        self.assertEqual(decode(times, prediction, 300, config, short_penalty=0.45), [])
        self.assertEqual(decode(times[:4], prediction[:4], 300, config, min_frames=5), [])
        with self.assertRaisesRegex(ValueError, "duração inválido"):
            decode(times, prediction, 300, config, min_frames=0)

    def test_weak_shared_edge_merges_and_strong_shared_edge_preserves_two_signs(self):
        times = np.arange(0, 800, 100)
        prediction = np.zeros((8, 3))
        prediction[1:7, 0] = 0.85
        prediction[1, 1] = prediction[7, 2] = 0.98
        prediction[4, 1:] = 0.10
        config = DecodeConfig(0.60, 0.30, 0.35, 0.10)
        separated = [Segment(100, 400), Segment(400, 700)]
        self.assertEqual(decode(times, prediction, 300, config), separated)
        self.assertEqual(decode(times, prediction, 300, config, cut_penalty=0.25), [Segment(100, 700)])
        prediction[4, 1:] = 0.98
        self.assertEqual(decode(times, prediction, 300, config, cut_penalty=0.25), separated)

    def test_missing_hands_are_safe_and_do_not_generate_speed_jump(self):
        raw = np.full((3, 2, 21, 3), np.nan, dtype=np.float32)
        raw[[0, 2], 0] = 0.5
        observed = features(raw)
        self.assertTrue(np.isfinite(observed).all())
        self.assertTrue(np.all(observed[1] == 0))
        self.assertEqual(np.count_nonzero(observed[:, -2:]), 2)


if __name__ == "__main__":
    unittest.main()
