import unittest

from ml.continuous_experiment.boundaries.score_pairs import summarize


class PairedControlsTest(unittest.TestCase):
    def test_abstention_counts_as_word_omissions_but_keeps_partial_glosses(self):
        references = [
            {"gloss": "cinco", "startMs": 100, "endMs": 700},
            {"gloss": "aluno", "startMs": 900, "endMs": 1500},
        ]
        example = {"references": references, "referenceText": "cinco alunos",
                   "textFromReferenceGlosses": "cinco aluno"}
        result = summarize([
            {**example, "proposals": references, "suggestedText": "cinco aluno"},
            {**example, "proposals": [references[0], {**references[1], "gloss": None}], "suggestedText": None},
        ])
        self.assertEqual(result["suggestions"], 1)
        self.assertEqual(result["exactGlossSequences"], 1)
        self.assertEqual(result["glossEdits"]["deletions"], 1)
        self.assertEqual(result["suggestedTextEdits"]["deletions"], 2)
        self.assertEqual(result["suggestedTextEdits"]["substitutions"], 1)
        self.assertEqual(result["textEditsFromReferenceGlosses"]["deletions"], 0)
        self.assertEqual(result["boundaries"]["matched"], 4)
        self.assertEqual(result["labeledBoundaries"]["matched"], 3)
