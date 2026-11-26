import json
from pathlib import Path
import unittest

from .acquire import FROZEN, make_inventory, symbols


class ExtraTakesTests(unittest.TestCase):
    def test_only_matching_canon_takes_are_selected(self):
        self.assertEqual(symbols("Sinalizador01/Canon/03AmareloSinalizador01-4.mp4", 1), ("03", 4))
        self.assertIsNone(symbols("Sinalizador01/Kinect/03AmareloSinalizador01-4.mp4", 1))
        self.assertIsNone(symbols("Sinalizador08/Canon/03AmareloSinalizador08-4.mp4", 1))
        self.assertIsNone(symbols("Sinalizador01/Canon/13EsquinaSinalizador01-4.mp4", 1))

    def test_frozen_selection_expands_only_development_signers(self):
        root = Path(__file__).resolve().parents[2]
        frozen = json.loads(FROZEN.read_text(encoding="utf-8"))
        actual = make_inventory(frozen["archives"], root / "ml/manifests/minds-expanded-v1.json")
        self.assertEqual(actual, frozen)
        self.assertEqual({row["take"] for row in actual["selection"]}, {4})
        self.assertEqual({row["signer"] for row in actual["selection"]}, set(range(1, 8)))
        self.assertEqual(len(actual["selection"]), 14)


if __name__ == "__main__":
    unittest.main()
