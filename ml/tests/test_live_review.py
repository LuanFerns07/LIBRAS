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

    def test_alphabet_assets_distinguish_sessions_with_the_same_build(self):
        legacy, first, second = session([]), session([], "S02"), session([], "S03")
        first["version"]["alphabetSha256"] = "a" * 64
        second["version"]["alphabetSha256"] = "b" * 64
        groups = analyze([legacy, first, second], MODEL, MANIFEST_HASH)["groups"]
        self.assertEqual([group["version"].get("alphabetSha256") for group in groups], [None, "a" * 64, "b" * 64])
        second["version"]["alphabetSha256"] = None
        with self.assertRaisesRegex(ValueError, "SHA-256 do alfabeto"):
            analyze([second], MODEL, MANIFEST_HASH)

    def test_counts_classifier_reach_separately_from_decision_and_legacy_data(self):
        trials = [observed(number, "other", condition="out-of-catalog") for number in range(1, 4)]
        trials[0]["application"]["classifierCalls"] = 1
        trials[1]["application"]["classifierCalls"] = 0
        result = analyze([session(trials)], MODEL, MANIFEST_HASH)["groups"][0]["freeRecognition"]
        self.assertEqual(result["classifierReachByCondition"], {
            "out-of-catalog": {"reached": 1, "notReached": 1, "unobserved": 1},
        })
        self.assertEqual(result["falseAcceptanceByCondition"]["out-of-catalog"]["total"], 3)
        trials[0]["application"]["classifierCalls"] = True
        with self.assertRaisesRegex(ValueError, "chamadas ao classificador"):
            analyze([session(trials)], MODEL, MANIFEST_HASH)

    def test_summarizes_load_and_frame_extraction_separately_from_decision(self):
        trials = [observed(number, "cinco", "cinco", flow="guided") for number in range(1, 4)]
        manual = {"trigger": "manual", "decisionMs": 15, "initialLoadMs": 350, "extractionMs": [8, 11]}
        trials[0]["application"]["captureTiming"] = manual
        trials[1]["application"]["captureTiming"] = {
            "trigger": "time-limit", "decisionMs": 50, "initialLoadMs": None, "extractionMs": [12],
        }
        result = analyze([session(trials)], MODEL, MANIFEST_HASH)["groups"][0]["timingByEnvironment"][0]["byFlow"]
        self.assertEqual(result["guided"], {
            "count": 2, "medianMs": 22.5, "p95Ms": 30,
            "initialLoad": {"count": 1, "medianMs": 350, "p95Ms": 350},
            "extraction": {"count": 3, "medianMs": 11, "p95Ms": 12},
        })
        manual["extractionMs"] = [None]
        with self.assertRaisesRegex(ValueError, "duração inválida"):
            analyze([session(trials)], MODEL, MANIFEST_HASH)
