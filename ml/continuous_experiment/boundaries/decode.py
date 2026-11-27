"""Decodifica uma sequência de intervalos disjuntos a partir das fronteiras estimadas."""

from dataclasses import dataclass
from numbers import Integral

import numpy as np

from ..metrics import Segment


RECOGNIZER_MIN_FRAMES = 5


@dataclass(frozen=True)
class DecodeConfig:
    activity_floor: float
    boundary_weight: float
    proposal_penalty: float
    duration_weight: float


def decode(times, probabilities, duration_prior, config, *, min_frames=1, short_penalty=0, activity_power=0,
           cut_penalty=0):
    if probabilities.shape != (len(times), 3) or len(times) < 2:
        raise ValueError("Cada quadro precisa de atividade, início e fim.")
    if not np.isfinite(probabilities).all() or duration_prior <= 0:
        raise ValueError("Valores inválidos para decodificação.")
    if (not isinstance(min_frames, Integral) or isinstance(min_frames, bool) or min_frames < 1
            or not np.isfinite(short_penalty) or short_penalty < 0 or activity_power not in (0, 0.5, 1)
            or not np.isfinite(cut_penalty) or cut_penalty < 0):
        raise ValueError("Controle de duração inválido.")
    step = times[1] - times[0]
    grid = np.append(times, times[-1] + step)
    occupancy = np.concatenate(([0], np.cumsum(probabilities[:, 0], dtype=np.float64)))
    best = np.zeros(len(grid), dtype=np.float64)
    starts = np.full(len(grid), -1, dtype=np.int64)
    selected = np.zeros(len(grid), dtype=bool)
    if cut_penalty:
        if probabilities.min() < 0 or probabilities.max() > 1:
            raise ValueError("O custo de corte requer probabilidades entre zero e um.")
        # Guarda também a melhor sequência que termina exatamente nesse instante.
        ending = np.full(len(grid), -np.inf)
        previous_touches = np.zeros(len(grid), dtype=bool)
        shared_edge_costs = cut_penalty * (1 - np.sqrt(probabilities[:, 1] * probabilities[:, 2]))
    max_length = min(len(times), max(3, round(2100 / step)))
    if min_frames > max_length:
        return []
    lengths = np.arange(min_frames, max_length + 1)
    relative_duration = lengths * step / duration_prior
    activity_weights = relative_duration ** activity_power
    duration_costs = config.duration_weight * np.abs(np.log(relative_duration))
    duration_costs += short_penalty * np.maximum(0, RECOGNIZER_MIN_FRAMES - lengths) / (RECOGNIZER_MIN_FRAMES - 1)
    for end in range(min_frames, len(grid)):
        span = lengths[:end - min_frames + 1]
        possible = end - span
        # Usa o último quadro disponível para o fim na borda da janela.
        start_end = probabilities[possible, 1] + probabilities[min(end, len(times) - 1), 2]
        activity = (occupancy[end] - occupancy[possible]) / span
        length_cost = duration_costs[:len(span)]
        weight = ((activity - config.activity_floor) * activity_weights[:len(span)] + config.boundary_weight * start_end
                  - config.proposal_penalty - length_cost)
        previous = best[possible]
        if cut_penalty:
            gap = best[np.maximum(possible - 1, 0)]
            touching = ending[possible] - shared_edge_costs[possible]
            previous = np.maximum(gap, touching)
        options = previous + weight
        index = int(options.argmax())
        starts[end] = possible[index]
        if cut_penalty:
            ending[end] = options[index]
            previous_touches[end] = touching[index] > gap[index]
        best[end] = best[end - 1]
        if options[index] > best[end]:
            best[end] = options[index]
            selected[end] = True

    intervals = []
    end = len(grid) - 1
    must_end_here = False
    while end > 0:
        if selected[end] or must_end_here:
            start = starts[end]
            intervals.append(Segment(float(grid[start]), float(grid[end])))
            if cut_penalty:
                must_end_here = previous_touches[end]
                end = start if must_end_here else start - 1
            else:
                end = start
        else:
            end -= 1
    return list(reversed(intervals))
