import unittest

from ml.continuous_experiment.metrics import Edits, Segment, Segmentation, intersection_over_union


class MetricsTest(unittest.TestCase):
    def test_word_edits_and_reference_denominator(self):
        edits = Edits()
        edits.add("eu vi dois pássaros".split(), "eu vi três pássaros".split())
        edits.add(["na", "árvore"], ["árvore"])
        edits.add(["não"], ["não", "hoje"])
        self.assertEqual(edits.report(), {
            "insertions": 1, "deletions": 1, "substitutions": 1,
            "reference_units": 7, "error_rate": 3 / 7,
        })

    def test_insertions_may_exceed_reference_length(self):
        edits = Edits()
        edits.add([], ["extra", "outro"])
        self.assertIsNone(edits.report()["error_rate"])
        self.assertEqual(edits.report()["insertions"], 2)

    def test_segmentation_uses_one_to_one_matching(self):
        expected = [Segment(100, 300), Segment(400, 700)]
        guessed = [Segment(80, 240), Segment(250, 310), Segment(410, 660)]
        metrics = Segmentation()
        metrics.add(expected, guessed)
        report = metrics.report()
        self.assertEqual(report["matched"], 2)
        self.assertEqual(report["precision"], 2 / 3)
        self.assertEqual(report["recall"], 1)
        self.assertEqual(report["f1"], 0.8)
        self.assertAlmostEqual(report["matched_mean_iou"], (140 / 220 + 250 / 300) / 2)
        self.assertEqual(report["median_start_error_ms"], 15)
        self.assertEqual(report["median_end_error_ms"], 50)

    def test_same_interval_different_gloss_is_not_a_match(self):
        expected = [Segment(0, 500, "EU")]
        guessed = [Segment(0, 500, "QUERER")]
        self.assertEqual(intersection_over_union(expected[0], guessed[0]), 1)
        metrics = Segmentation(labeled=True)
        metrics.add(expected, guessed)
        self.assertEqual(metrics.report()["matched"], 0)

    def test_intervals_must_be_ordered_and_non_overlapping(self):
        metrics = Segmentation()
        with self.assertRaises(ValueError):
            metrics.add([Segment(0, 200), Segment(100, 300)], [])
        with self.assertRaises(ValueError):
            Segment(1000, 800)


if __name__ == "__main__":
    unittest.main()
