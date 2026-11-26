from pathlib import Path
from unittest import TestCase
from unittest.mock import patch

from dataset import Clip, add_training_positives


class TrainingSupplementTests(TestCase):
    def test_supplement_keeps_the_original_training_people_and_unique_recordings(self):
        identity = {"recipe": "r", "modelSha256": "h", "preprocess": "p"}
        main = {**identity, "clips": [
            {"partition": "train", "signer": 1, "sha256": "a"},
            {"partition": "val", "signer": 8, "sha256": "b"},
        ]}
        additional = {**identity, "sourceManifestSha256": "s", "clips": [{"recording": 4, "sensor": "Canon"}]}
        original = [Clip(3, 0, 1, "train", "a", "banco", "insufficient", None, [])]
        for signer, checksum, recording in ((1, "d", 4), (8, "d", 4), (1, "b", 4), (1, "d", 5)):
            with self.subTest(signer=signer, checksum=checksum, recording=recording):
                clip = Clip(0, 2, signer, "train", checksum, "espelho", "insufficient", None, [])
                additional["clips"][0]["recording"] = recording
                with (
                    patch("dataset.load_features", return_value=(additional, [clip])),
                    patch("dataset.digest", return_value="verified"),
                ):
                    if (signer, checksum, recording) == (1, "d", 4):
                        result, provenance = add_training_positives(Path("features.json"), main, original)
                        self.assertEqual([row.index for row in result], [3, 4])
                        self.assertEqual(provenance["signers"], [1])
                    else:
                        with self.assertRaisesRegex(ValueError, "fora das pessoas de treino"):
                            add_training_positives(Path("features.json"), main, original)
