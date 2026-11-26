"""Decisão compatível com o navegador e métricas incluindo rejeições."""

from statistics import median

import numpy as np

from dataset import LABELS


def decide(logits, threshold):
    if logits is None:
        return 0, None
    logits = np.asarray(logits, dtype=np.float64)
    best = int(np.argmax(logits))
    confidence = float(1.0 / np.exp(logits - logits[best]).sum())
    return (best if confidence >= threshold else 0), confidence


def ratio(numerator, denominator):
    return float(numerator / denominator) if denominator else 0.0


def describe(matrix, labels=LABELS):
    by_label = {}
    for label, name in enumerate(labels[1:], start=1):
        true_positive = int(matrix[label, label])
        predicted = int(matrix[:, label].sum())
        support = int(matrix[label].sum())
        precision = ratio(true_positive, predicted)
        recall = ratio(true_positive, support)
        by_label[name] = {
            "precision": precision,
            "recall": recall,
            "f1": ratio(2 * precision * recall, precision + recall),
            "support": support,
            "accepted": int(matrix[label, 1:].sum()),
            "predicted": predicted,
            "truePositives": true_positive,
        }
    pos_count = int(matrix[1:].sum())
    accepted = int(matrix[1:, 1:].sum())
    other_count = int(matrix[0].sum())
    false_acceptances = int(matrix[0, 1:].sum())
    rejected = int(matrix[:, 0].sum())
    total = int(matrix.sum())
    return {
        "expectedLabels": ["fora do catálogo", *labels[1:]],
        "decisionLabels": ["rejeitado", *labels[1:]],
        "matrix": matrix.tolist(),
        "byLabel": by_label,
        "f1Macro": float(np.mean([item["f1"] for item in by_label.values()])),
        "coverage": {"count": accepted, "total": pos_count, "rate": ratio(accepted, pos_count)},
        "falseAcceptance": {"count": false_acceptances, "total": other_count, "rate": ratio(false_acceptances, other_count)},
        "inconclusive": {"count": rejected, "total": total, "rate": ratio(rejected, total)},
    }


def measure(rows, logits_by_index, threshold, labels=LABELS):
    matrix = np.zeros((len(labels), len(labels)), dtype=int)
    details = []
    for row in rows:
        decision, confidence = decide(logits_by_index.get(row.index), threshold)
        matrix[row.label, decision] += 1
        details.append({
            "sha256": row.checksum, "signer": row.signer, "sourceLabel": row.source_label,
            "expected": labels[row.label], "predicted": labels[decision],
            "confidence": confidence, "captureState": row.state,
        })
    return describe(matrix, labels), details


def checks(metrics):
    return {
        "f1Macro": metrics["f1Macro"] >= 0.75,
        "recall": min(item["recall"] for item in metrics["byLabel"].values()) >= 0.65,
        "precision": min(item["precision"] for item in metrics["byLabel"].values()) >= 0.75,
        "coverage": metrics["coverage"]["rate"] >= 0.75,
        "falseAcceptance": metrics["falseAcceptance"]["rate"] <= 0.10,
    }


def choose_threshold(rows, logits_by_index, labels=LABELS):
    """Calibra só com validação. Prioriza rejeição e F1 macro."""
    if {row.partition for row in rows} != {"val"}:
        raise ValueError("O limiar deve ser escolhido exclusivamente em validação.")
    best_score = None
    best_thresholds = []
    best_metrics = None
    for hundredths in range(25, 101):
        threshold = hundredths / 100
        metrics, _ = measure(rows, logits_by_index, threshold, labels)
        gate = checks(metrics)
        score = (
            all(gate.values()), gate["falseAcceptance"],
            metrics["f1Macro"], metrics["coverage"]["rate"],
            -metrics["falseAcceptance"]["rate"],
        )
        if best_score is None or score > best_score:
            best_score = score
            best_thresholds = [threshold]
            best_metrics = metrics
        elif score == best_score:
            best_thresholds.append(threshold)
    return best_score, median(best_thresholds), best_metrics
