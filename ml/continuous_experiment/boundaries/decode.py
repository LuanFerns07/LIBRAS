"""Decodifica uma sequência de intervalos disjuntos a partir das fronteiras estimadas."""

from dataclasses import dataclass

import numpy as np

from ..metrics import Segment


@dataclass(frozen=True)
class DecodeConfig:
    activity_floor: float
    boundary_weight: float
    proposal_penalty: float
    duration_weight: float


def decode(times, probabilities, duration_prior, config):
    if probabilities.shape != (len(times), 3) or len(times) < 2:
        raise ValueError("Cada quadro precisa de atividade, início e fim.")
    if not np.isfinite(probabilities).all() or duration_prior <= 0:
        raise ValueError("Valores inválidos para decodificação.")
    step = times[1] - times[0]
    grid = np.append(times, times[-1] + step)
    occupancy = np.concatenate(([0], np.cumsum(probabilities[:, 0], dtype=np.float64)))
    best = np.zeros(len(grid), dtype=np.float64)
    starts = np.full(len(grid), -1, dtype=np.int64)
    max_length = min(len(times), max(3, round(2100 / step)))
    lengths = np.arange(1, max_length + 1)
    duration_costs = config.duration_weight * np.abs(np.log(lengths * step / duration_prior))
    for end in range(1, len(grid)):
        span = lengths[:min(end, max_length)]
        possible = end - span
        # Usa o último quadro disponível para o fim na borda da janela.
        start_end = probabilities[possible, 1] + probabilities[min(end, len(times) - 1), 2]
        activity = (occupancy[end] - occupancy[possible]) / span
        length_cost = duration_costs[:len(span)]
        weight = (activity - config.activity_floor + config.boundary_weight * start_end
                  - config.proposal_penalty - length_cost)
        options = best[possible] + weight
        index = int(options.argmax())
        best[end] = best[end - 1]
        if options[index] > best[end]:
            best[end] = options[index]
            starts[end] = possible[index]

    intervals = []
    end = len(grid) - 1
    while end > 0:
        start = starts[end]
        if start >= 0:
            intervals.append(Segment(float(grid[start]), float(grid[end])))
            end = start
        else:
            end -= 1
    return list(reversed(intervals))
