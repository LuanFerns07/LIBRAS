"""Modelo temporal de atividade da mão direita e fronteiras de sinais."""

import numpy as np
import torch
from torch import nn


def features(points):
    """Mão relativa ao pulso, pulso relativo ao recorte e variação entre quadros."""
    visible = np.isfinite(points).all(axis=(2, 3))
    origin = points[:, :, 0, :]
    per_hand_width = np.linalg.norm(points[:, :, 5, :2] - points[:, :, 17, :2], axis=-1)
    width = np.where(visible, np.maximum(per_hand_width, 0.015), 1.0)
    delta = points[1:] - points[:-1]
    available = visible[1:] & visible[:-1]
    displacement = np.zeros_like(points)
    displacement[1:] = np.where(
        available[..., None, None], delta / width[1:, :, None, None], 0,
    )
    local = np.where(visible[..., None, None],
                     (points - origin[:, :, None, :]) / width[:, :, None, None], 0)
    pose = np.zeros_like(origin)
    for side in range(2):
        mask = visible[:, side]
        if mask.any():
            pose[mask, side] = origin[mask, side] - np.median(origin[mask, side], axis=0)
    count = len(points)
    return np.concatenate((
        local.reshape(count, -1),
        displacement.reshape(count, -1),
        pose.reshape(count, -1) * 4,
        visible.astype(np.float32),
    ), axis=1).astype(np.float32)


def targets(times, reference):
    step = times[1] - times[0]
    result = np.zeros((len(times), 3), dtype=np.float32)
    centers = times + step / 2
    for segment in reference:
        result[(centers >= segment.start_ms) & (centers < segment.end_ms), 0] = 1
        for channel, edge in enumerate((segment.start_ms, segment.end_ms), 1):
            if not times[0] < edge <= times[-1]:
                continue
            index = int(np.rint((edge - times[0]) / step))
            result[index, channel] = 1
            for index_near in (index - 1, index + 1):
                if 0 <= index_near < len(times):
                    result[index_near, channel] = max(result[index_near, channel], 0.35)
    return result


class BoundaryModel(nn.Module):
    def __init__(self, dimensions, hidden=48):
        super().__init__()
        self.project = nn.Conv1d(dimensions, hidden, 1)
        self.near = nn.Conv1d(hidden, hidden, 5, padding=2)
        self.far = nn.Conv1d(hidden, hidden, 5, padding=8, dilation=4)
        self.regularizer = nn.Dropout(0.20)
        self.output = nn.Conv1d(hidden, 3, 1)

    def forward(self, values):
        encoded = nn.functional.gelu(self.project(values))
        near = nn.functional.gelu(self.near(encoded))
        temporal = nn.functional.gelu(self.far(near))
        return self.output(self.regularizer(near + temporal))
