from copy import deepcopy
from unittest import TestCase

from dataset import LABELS
from live_review import ENVIRONMENT_FIELDS, analyze


MODEL = {"labels": list(LABELS), "modelSha256": "a" * 64}
MANIFEST_HASH = "b" * 64


def observed(number, label, prediction=None, *, flow="free", condition="expected", method="instrumented"):
    return {
        "number": number, "flow": flow, "condition": condition,
        "reference": {"label": label, "feedbackVerdict": "appropriate"},
        "application": {
            "decision": "accepted" if prediction else "inconclusive", "prediction": prediction,
            "latency": {"milliseconds": 10 * number, "method": method},
        },
    }


def session(attempts, session_id="S01", outside_training="yes"):
    return {
        "schema": "librasia-live-review/v1", "source": "live-manual-observation", "sessionId": session_id,
        "participant": {"id": "P01", "consent": True, "outsideTraining": outside_training},
        "reviewer": {"id": "R01", "independent": "yes", "profile": "fluent"},
        "environment": dict.fromkeys(ENVIRONMENT_FIELDS, "teste"),
        "version": {"commit": "deadbeef", "catalog": "v1", "avatar": "v1",
                    "modelSha256": MODEL["modelSha256"], "manifestSha256": MANIFEST_HASH},
        "attempts": attempts,
    }


class LiveReviewTests(TestCase):
    def test_only_independent_free_attempts_with_reference_feed_the_matrix(self):
        trials = [
            observed(1, "cinco", "cinco"),
            observed(2, "cinco"),
            observed(3, "other", "amarelo", condition="out-of-catalog"),
            observed(4, "none", condition="capture-denied"),
            observed(5, "uncertain", condition="occlusion", method="stopwatch"),
            observed(6, "espelho", "espelho", flow="guided"),
        ]
        rejected = session([observed(1, "cinco", "espelho")], "S02", outside_training="no")
        group = analyze([session(trials), rejected], MODEL, MANIFEST_HASH)["groups"][0]
        self.assertEqual(group["eligibleSessions"], 1)
        result = group["freeRecognition"]
        self.assertEqual(result["byLabel"]["cinco"]["recall"], .5)
        self.assertEqual(result["inconclusive"]["count"], 1)
        self.assertEqual(result["falseAcceptanceByCondition"]["out-of-catalog"]["count"], 1)
        self.assertEqual(result["excludedAttempts"], {"cameraCheck": 1, "referenceUnconfirmed": 1})
        self.assertIsNone(result["f1Macro"])
        self.assertEqual(group["guidedFeedback"], {"appropriate": 1})
        self.assertEqual(group["timingByEnvironment"][0]["byFlow"]["free"]["p95Ms"], 40)

    def test_duplicate_fixture_and_mixed_weights_are_rejected(self):
        item = session([])
        with self.assertRaisesRegex(ValueError, "duplicada"):
            analyze([item, item], MODEL, MANIFEST_HASH)
        other = deepcopy(item)
        other["version"]["modelSha256"] = "c" * 64
        with self.assertRaisesRegex(ValueError, "pesos"):
            analyze([other], MODEL, MANIFEST_HASH)

    def test_missing_eligible_data_stays_unmeasured(self):
        group = analyze([session([], outside_training="unknown")], MODEL, MANIFEST_HASH)["groups"][0]
        self.assertEqual(group["independentParticipants"], 0)
        self.assertIsNone(group["freeRecognition"]["falseAcceptance"]["rate"])
        self.assertEqual(group["timingByEnvironment"], [])
