"""Métricas para texto e intervalos anotados de sinalização contínua."""

from dataclasses import dataclass, field
from math import isfinite
from statistics import median


@dataclass
class Edits:
    insertions: int = 0
    deletions: int = 0
    substitutions: int = 0
    reference_units: int = 0

    def add(self, reference, prediction):
        """Acumula operações da distância de Levenshtein com desempate fixo."""
        width = len(prediction) + 1
        costs = [list(range(width))]
        costs.extend([[i] + [0] * (width - 1) for i in range(1, len(reference) + 1)])
        for i, token in enumerate(reference, 1):
            for j, guess in enumerate(prediction, 1):
                costs[i][j] = min(
                    costs[i - 1][j - 1] + (token != guess),
                    costs[i - 1][j] + 1,
                    costs[i][j - 1] + 1,
                )

        i, j = len(reference), len(prediction)
        self.reference_units += i
        while i or j:
            if i and j and costs[i][j] == costs[i - 1][j - 1] + (reference[i - 1] != prediction[j - 1]):
                self.substitutions += reference[i - 1] != prediction[j - 1]
                i -= 1
                j -= 1
            elif i and costs[i][j] == costs[i - 1][j] + 1:
                self.deletions += 1
                i -= 1
            else:
                self.insertions += 1
                j -= 1

    def report(self):
        total = self.insertions + self.deletions + self.substitutions
        return {
            "insertions": self.insertions,
            "deletions": self.deletions,
            "substitutions": self.substitutions,
            "reference_units": self.reference_units,
            "error_rate": total / self.reference_units if self.reference_units else None,
        }


@dataclass(frozen=True)
class Segment:
    start_ms: float
    end_ms: float
    label: str | None = None

    def __post_init__(self):
        if not isfinite(self.start_ms) or not isfinite(self.end_ms):
            raise ValueError("Intervalo precisa de tempos finitos.")
        if self.start_ms < 0 or self.end_ms <= self.start_ms:
            raise ValueError("Intervalo deve ter início não negativo e duração positiva.")


def intersection_over_union(reference, prediction):
    intersection = max(0, min(reference.end_ms, prediction.end_ms) - max(
        reference.start_ms, prediction.start_ms,
    ))
    total = reference.end_ms - reference.start_ms + prediction.end_ms - prediction.start_ms
    return intersection / (total - intersection)


def match_intervals(reference, prediction, threshold, *, labels=False):
    """Maximiza a contagem e a soma de IoU com pareamento ordenado um a um."""
    for intervals in (reference, prediction):
        if any(first.end_ms > second.start_ms for first, second in zip(intervals, intervals[1:])):
            raise ValueError("Os intervalos da mesma trilha devem ser ordenados e sem sobreposição.")
        if labels and any(interval.label in (None, "") for interval in intervals):
            raise ValueError("A avaliação com glosas exige rótulo em cada intervalo.")
    if not 0 < threshold <= 1:
        raise ValueError("Limiar de IoU fora de (0, 1].")

    width = len(prediction) + 1
    scores = [[(0, 0.0) for _ in range(width)] for _ in range(len(reference) + 1)]
    paths = [[0] * width for _ in scores]
    for i, expected in enumerate(reference, 1):
        for j, guessed in enumerate(prediction, 1):
            candidates = [(scores[i - 1][j], 1), (scores[i][j - 1], 2)]
            overlap = intersection_over_union(expected, guessed)
            if overlap >= threshold and (not labels or expected.label == guessed.label):
                count, total = scores[i - 1][j - 1]
                candidates.append(((count + 1, total + overlap), 3))
            scores[i][j], paths[i][j] = max(candidates)

    i, j = len(reference), len(prediction)
    pairs = []
    while i and j:
        direction = paths[i][j]
        if direction == 3:
            pairs.append((reference[i - 1], prediction[j - 1]))
            i -= 1
            j -= 1
        elif direction == 1:
            i -= 1
        else:
            j -= 1
    return list(reversed(pairs))


@dataclass
class Segmentation:
    threshold: float = 0.5
    labeled: bool = False
    references: int = 0
    predictions: int = 0
    overlaps: list[float] = field(default_factory=list)
    start_errors_ms: list[float] = field(default_factory=list)
    end_errors_ms: list[float] = field(default_factory=list)

    def add(self, reference, prediction):
        pairs = match_intervals(reference, prediction, self.threshold, labels=self.labeled)
        self.references += len(reference)
        self.predictions += len(prediction)
        for expected, guessed in pairs:
            self.overlaps.append(intersection_over_union(expected, guessed))
            self.start_errors_ms.append(abs(expected.start_ms - guessed.start_ms))
            self.end_errors_ms.append(abs(expected.end_ms - guessed.end_ms))

    def report(self):
        matched = len(self.overlaps)
        return {
            "iou_threshold": self.threshold,
            "requires_matching_label": self.labeled,
            "reference_intervals": self.references,
            "predicted_intervals": self.predictions,
            "matched": matched,
            "precision": matched / self.predictions if self.predictions else None,
            "recall": matched / self.references if self.references else None,
            "f1": (2 * matched / (self.predictions + self.references)
                   if self.predictions + self.references else None),
            "matched_mean_iou": sum(self.overlaps) / matched if matched else None,
            "median_start_error_ms": median(self.start_errors_ms) if matched else None,
            "median_end_error_ms": median(self.end_errors_ms) if matched else None,
        }
