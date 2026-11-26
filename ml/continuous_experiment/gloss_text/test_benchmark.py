import unittest
from unittest.mock import patch

from .corpus import Pair, sentence_components
from .holdout import reserve
from .monotone import MonotoneTranslator, SETTINGS, align


class HoldoutTests(unittest.TestCase):
    def test_excludes_components_seen_in_any_previous_partition(self):
        pairs = [
            Pair(1, ("origem",), ("ponte",)),
            Pair(2, ("nunca",), ("jamais",)),
            Pair(3, ("fim",), ("último",)),
            Pair(4, ("ponte",), ("analise",) * 13),
            Pair(5, ("análise",) * 13, ("novo",)),
            Pair(6, ("novo",), ("novidade",)),
            Pair(7, ("jamais",), ("nada",)),
            Pair(8, ("último",), ("certo",)),
            *(Pair(row, (f"glosa{row}",), (f"texto{row}",)) for row in range(9, 85)),
        ]
        previous = {"rows": {"train": [1], "dev": [2], "test": [3]}}
        with patch("ml.continuous_experiment.gloss_text.holdout.LIMITS", {"dev": 15, "test": 15}):
            result = reserve(pairs, previous)
            self.assertEqual(result, reserve(pairs, previous))
        _, components = sentence_components(pairs)
        used = {components[row - 1] for row in (1, 2, 3)}
        dev = {components[row - 1] for row in result["rows"]["dev"]}
        test = {components[row - 1] for row in result["rows"]["test"]}
        self.assertEqual(result["rows"]["train"], [1])
        self.assertTrue(dev.isdisjoint(used))
        self.assertTrue(test.isdisjoint(used | dev))
        self.assertEqual(result["available"]["dev"] + result["available"]["test"], 76)


class MonotoneTests(unittest.TestCase):
    def test_learns_function_words_and_keeps_unseen_words(self):
        source = ("ir", "escola")
        target = ("ir", "à", "escola")
        self.assertEqual(sum(align(source, target), ()), target)
        pairs = [Pair(row, source, target) for row in range(6)]
        translator = MonotoneTranslator(pairs)
        self.assertEqual(translator.translate(source, SETTINGS[0]), target)
        self.assertEqual(translator.translate(("ipê",), SETTINGS[0]), ("ipê",))


if __name__ == "__main__":
    unittest.main()
