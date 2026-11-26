from pathlib import Path
from unittest import TestCase
from unittest.mock import patch

import numpy as np

from compare_partial_negatives import fragment_results
from dataset import Clip
from partial_negatives import load_partial_negatives


def negative(index, checksum, signer=1, partition="train", state="ready"):
    return Clip(index, 0, signer, partition, checksum, "banco", state, None, [])


class PartialNegativesTests(TestCase):
    def test_pair_belongs_to_a_negative_parent_with_the_same_person(self):
        parent = negative(7, "original")
        first = {"parentSha256": parent.checksum, "window": "prefix"}
        second = {**first, "window": "suffix"}
        extraction = {"recipe": "same", "modelSha256": "same", "preprocess": "same", "sourceManifestSha256": "source",
                      "clips": [first, second]}
        source = {**extraction, "clips": [{"sha256": parent.checksum}]}
        clips = [negative(0, "first"), negative(1, "second")]
        with (
            patch("partial_negatives.load_features", return_value=(extraction, clips)),
            patch("partial_negatives.digest", return_value="verified"),
        ):
            pairs, _ = load_partial_negatives(Path("index.json"), source, [parent])
            self.assertEqual(list(pairs[7]), ["prefix", "suffix"])
            with self.assertRaisesRegex(ValueError, "vínculo"):
                load_partial_negatives(Path("index.json"), source, [negative(7, "original", signer=2)])
            with self.assertRaisesRegex(ValueError, "vínculo"):
                load_partial_negatives(Path("index.json"), source, [negative(7, "original", partition="val")])
            second["window"] = "prefix"
            with self.assertRaisesRegex(ValueError, "mesma posição"):
                load_partial_negatives(Path("index.json"), source, [parent])

    def test_two_false_acceptances_for_one_parent_count_only_once(self):
        pairs = {
            10: {"prefix": negative(0, "a"), "suffix": negative(1, "b")},
            11: {"prefix": negative(2, "c", state="no-hand"), "suffix": negative(3, "d")},
        }
        accepted = np.array([0., 3., 0.])
        rejected = np.array([3., 0., 0.])
        report = fragment_results(pairs, {0: accepted, 1: accepted, 3: rejected}, .5)
        self.assertEqual(report["parentsWithAnyFalseAcceptance"], 1)
        self.assertEqual(report["parents"], 2)
        self.assertEqual(report["byPosition"]["prefix"]["captureStates"], {"ready": 1, "no-hand": 1})
