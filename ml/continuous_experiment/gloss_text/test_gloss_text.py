import unittest

import torch

from .corpus import Pair, partition
from .model import EOS, UNK, GlossGenerator, Vocabulary


class Partitions(unittest.TestCase):
    def test_grouping_across_both_columns_and_excluded_bridge(self):
        pairs = [
            Pair(1, ("sim",), ("é",)),
            Pair(2, ("e",), ("ou",)),
            Pair(3, ("ou",), ("até",) * 13),
            Pair(4, ("até",) * 13, ("depois",)),
            Pair(5, ("depois",), ("então",)),
            Pair(6, ("sim",), ("e",)),
            *(Pair(index, (f"origem{index}",), (f"destino{index}",)) for index in range(7, 300)),
        ]
        report = partition(pairs)
        self.assertEqual(report, partition(pairs))
        self.assertEqual(report["duplicate_pairs_in_length_range"], 1)
        self.assertEqual(report["outside_length_range"], 2)
        members = {row: split for split, rows in report["rows"].items() for row in rows}
        self.assertEqual(members[1], members[2])
        self.assertEqual(members[2], members[5])
        self.assertTrue({3, 4, 6}.isdisjoint(members))


class CopyVocabulary(unittest.TestCase):
    def test_repeated_unseen_gloss_can_be_generated_by_copy(self):
        torch.set_num_threads(1)
        vocabulary = Vocabulary.fit([Pair(1, ("boa",), ("boa",))])
        source, copies, rare = vocabulary.input_tensors([("ipê", "ipê")])
        extra = len(vocabulary.target)
        self.assertEqual(rare, [("ipê",)])
        self.assertEqual(copies.tolist(), [[extra, extra]])
        previous, target = vocabulary.reference_tensors([("ipê",)], rare)
        self.assertEqual(target.tolist(), [[extra, EOS]])
        self.assertEqual(previous.tolist()[0][-1], UNK)

        model = GlossGenerator(vocabulary)
        with torch.no_grad():
            model.generate_gate.weight.zero_()
            model.generate_gate.bias.fill_(-20)
        self.assertEqual(model.generate(source, copies, 1), [[extra]])
        self.assertTrue(torch.isfinite(model.loss(source, copies, previous, target)))


if __name__ == "__main__":
    unittest.main()
