"""Classificador temporal dos pontos e máscaras do MediaPipe Holistic."""

import torch


class ConvSequence(torch.nn.Module):
    def __init__(self, classes):
        super().__init__()
        self.temporal = torch.nn.Sequential(
            torch.nn.Conv1d(192, 64, kernel_size=5, padding=2),
            torch.nn.BatchNorm1d(64),
            torch.nn.ReLU(),
            torch.nn.Conv1d(64, 64, kernel_size=3, padding=1, dilation=1),
            torch.nn.BatchNorm1d(64),
            torch.nn.ReLU(),
            torch.nn.Conv1d(64, 48, kernel_size=3, padding=2, dilation=2),
            torch.nn.BatchNorm1d(48),
            torch.nn.ReLU(),
        )
        self.classify = torch.nn.Sequential(
            torch.nn.Dropout(0.2),
            torch.nn.Linear(48 * 3, classes),
        )

    def forward(self, video):
        encoded = self.temporal(video.transpose(1, 2))
        # As médias por metade retêm a ordem de movimentos lentos.
        return self.classify(torch.cat((
            encoded.amax(dim=2),
            encoded[:, :, :12].mean(dim=2),
            encoded[:, :, 12:].mean(dim=2),
        ), dim=1))
