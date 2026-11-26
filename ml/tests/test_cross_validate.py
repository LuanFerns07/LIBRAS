from collections import Counter
from unittest import TestCase

from cross_validate import signer_folds


class CrossValidationTests(TestCase):
    def test_partitions_are_disjoint_and_each_signer_is_measured_once(self):
        folds = signer_folds([7, 5, 4, 3, 4, 1, 2, 6])
        measured = Counter(signer for _, _, fold in folds for signer in fold)
        self.assertEqual(measured, {signer: 1 for signer in range(1, 8)})
        for train, validation, measurement in folds:
            self.assertEqual(min(map(len, (train, validation, measurement))), 2)
            self.assertEqual(len(set(train + validation + measurement)), len(train + validation + measurement))
