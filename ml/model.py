"""Classificador temporal dos pontos e máscaras do MediaPipe Holistic."""

import torch


class ConvSequence(torch.nn.Module):
    def __init__(self, classes, input_features=192):
        super().__init__()
        self.temporal = torch.nn.Sequential(
            torch.nn.Conv1d(input_features, 64, kernel_size=5, padding=2),
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


class ConvSequenceGeometry(ConvSequence):
    """Combina o contexto corporal com o formato de cada mão em escala própria."""

    def __init__(self, classes):
        super().__init__(classes, input_features=192 + 2 * 21 * 4)

    @staticmethod
    def local_hand_features(video):
        hands = video[..., 24:].reshape(video.shape[0], video.shape[1], 2, 21, 4)
        xyz = hands[..., :3]
        mask = hands[..., 3:] * hands[..., :1, 3:]
        relative = xyz - xyz[..., :1, :]
        palm = relative[..., 9:10, :]
        scale = palm.square().sum(dim=-1, keepdim=True).clamp_min(.0025).sqrt()
        mask = mask * hands[..., 9:10, 3:]
        return torch.cat((relative / scale * mask, mask), dim=-1).flatten(start_dim=2)

    def forward(self, video):
        local = self.local_hand_features(video)
        return super().forward(torch.cat((video, local), dim=-1))


class ConvSequenceGated(ConvSequenceGeometry):
    """Estima se a entrada é conhecida e classifica o sinal dado esse evento."""

    def forward(self, video):
        scores = super().forward(video)
        known = scores[:, :1]
        signs = torch.log_softmax(scores[:, 1:], dim=1)
        return torch.cat((
            torch.nn.functional.logsigmoid(-known),
            torch.nn.functional.logsigmoid(known) + signs,
        ), dim=1)


ARCHITECTURES = {
    model.__name__: model for model in (ConvSequence, ConvSequenceGeometry, ConvSequenceGated)
}
