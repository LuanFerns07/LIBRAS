import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from ml.continuous_experiment.boundaries.acquire import load_sources, media_url, video_name


class SourcesTest(unittest.TestCase):
    def test_manifest_uses_independent_groups(self):
        manifest = load_sources()
        groups = {
            split: {row["dyad"] for row in manifest["cases"] if row["split"] == split}
            for split in ("train", "dev", "test")
        }
        self.assertEqual(groups, {"train": {2, 3}, "dev": {4}, "test": {5, 6}})
        row = manifest["cases"][0]
        link = media_url(row, video_name(row, manifest["camera"]))
        self.assertIn("Dupla%202/1.%20Entrevista/", link)
        self.assertTrue(link.endswith("FLN_G1_D2_1entrevista_VIDEO3.mp4"))

    def test_a_previously_measured_entry_cannot_reappear_in_test(self):
        manifest = load_sources()
        test = next(entry for entry in manifest["cases"] if entry["split"] == "test")
        test["id"] = 321
        with TemporaryDirectory() as temporary:
            filename = Path(temporary) / "bad.json"
            filename.write_text(json.dumps(manifest), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "experimento anterior"):
                load_sources(filename)


if __name__ == "__main__":
    unittest.main()
