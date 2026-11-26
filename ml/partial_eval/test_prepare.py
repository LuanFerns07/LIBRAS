from decimal import Decimal
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from .prepare import interval, load_parents, parent_path


class PartialPreparationTests(unittest.TestCase):
    def test_crops_keep_natural_rate_on_each_edge(self):
        duration = Decimal("7.5")
        self.assertEqual(interval(duration, "prefix"), (0, Decimal("4.5")))
        self.assertEqual(interval(duration, "suffix"), (Decimal("3.0"), duration))

    def test_parent_selection_is_limited_to_original_training_negatives(self):
        root = Path(__file__).resolve().parents[2]
        parents = load_parents(root / "ml/manifests/minds-expanded-v1.json")
        self.assertEqual(len(parents), 42)
        self.assertEqual({(clip["label"], clip["partition"]) for clip in parents}, {(None, "train")})

    def test_rejects_an_altered_source_manifest_and_an_unverified_video(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "wrong.mp4"
            path.write_bytes(b"alterado")
            with self.assertRaisesRegex(ValueError, "manifesto"):
                load_parents(path)
            with self.assertRaisesRegex(ValueError, "SHA-256"):
                parent_path(path.parent, {"file": path.name, "sha256": "a" * 64})


if __name__ == "__main__":
    unittest.main()
