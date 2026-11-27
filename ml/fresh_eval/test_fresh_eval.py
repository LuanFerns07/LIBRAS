from unittest import TestCase

from ml.fresh_eval.evaluate import case_decision, summarize


class PositiveMetricsTests(TestCase):
    def test_misses_include_failed_capture(self):
        rows = []
        for signer, state, prediction in [
            (1, "no-hand", None), (2, "ready", "cinco"), (3, "ready", "espelho"), (4, "ready", None),
        ]:
            row = {"expected": "cinco", "signer": signer, "captureState": state}
            row["decision"] = case_decision(row, prediction, [None, "cinco", "espelho"])
            rows.append(row)
        self.assertEqual(summarize(rows), {"cinco": {
            "examples": 4, "signers": 4, "correct": 1, "wrongLabel": 1,
            "inconclusive": 2, "withoutModelCoverage": 0, "captureInconclusive": 1,
        }})

    def test_model_without_label_is_recorded(self):
        case = {"expected": "aluno", "signer": 1, "captureState": "ready"}
        self.assertEqual(case_decision(case, None, [None, "cinco"]), "unsupported")

    def test_explicit_negatives_distinguish_rejection_false_accept_and_capture(self):
        case = {"expected": None, "signer": 1, "captureState": "ready"}
        labels = [None, "cinco"]
        self.assertEqual(case_decision(case, None, labels), "rejected")
        self.assertEqual(case_decision(case, "cinco", labels), "false-accept")
        self.assertEqual(case_decision({**case, "captureState": "no-hand"}, None, labels), "capture-inconclusive")
        self.assertEqual(summarize([case]), {})
