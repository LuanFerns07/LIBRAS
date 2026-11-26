"""Modelos temporais leves para frases roteirizadas e geração de tokens."""

import torch
from torch import nn


class Encoder(nn.Sequential):
    def __init__(self, channels=96):
        super().__init__(
            nn.Conv1d(126, channels, 5, padding=2),
            nn.BatchNorm1d(channels),
            nn.GELU(),
            nn.Conv1d(channels, channels, 5, stride=2, padding=2),
            nn.BatchNorm1d(channels),
            nn.GELU(),
            nn.Conv1d(channels, channels, 3, padding=1),
            nn.BatchNorm1d(channels),
            nn.GELU(),
            nn.Dropout(0.15),
        )


class SentenceRetriever(nn.Module):
    def __init__(self, vocabulary_size, channels=96):
        super().__init__()
        self.encoder = Encoder(channels)
        self.pool = nn.AdaptiveAvgPool1d(8)
        self.classifier = nn.Linear(8 * channels, vocabulary_size)

    def forward(self, features):
        memory = self.encoder(features)
        return self.classifier(self.pool(memory).flatten(1))


class TokenGenerator(nn.Module):
    def __init__(self, vocabulary_size, channels=96):
        super().__init__()
        self.encoder = Encoder(channels)
        self.embedding = nn.Embedding(vocabulary_size, channels, padding_idx=0)
        self.decoder = nn.GRU(channels, channels, batch_first=True)
        self.memory_projection = nn.Linear(channels, channels)
        self.output = nn.Linear(2 * channels, vocabulary_size)
        self.scale = channels ** 0.5

    def encode(self, features):
        memory = self.encoder(features).transpose(1, 2)
        hidden = memory.mean(dim=1)[None]
        return memory, self.memory_projection(memory), hidden

    def decode(self, inputs, memory, keys, hidden):
        queries, hidden = self.decoder(self.embedding(inputs), hidden)
        attention = torch.softmax((queries @ keys.transpose(1, 2)) / self.scale, dim=-1)
        logits = self.output(torch.cat((queries, attention @ memory), dim=-1))
        return logits, hidden

    def forward(self, features, inputs):
        memory, keys, hidden = self.encode(features)
        logits, _ = self.decode(inputs, memory, keys, hidden)
        return logits

    def generate(self, features, maximum, *, bos, eos):
        memory, keys, hidden = self.encode(features)
        token = torch.full((features.shape[0], 1), bos, dtype=torch.long)
        ended = torch.zeros_like(token, dtype=torch.bool)
        generated = []
        for _ in range(maximum):
            logits, hidden = self.decode(token, memory, keys, hidden)
            # Os dois primeiros ids representam preenchimento e início da frase.
            token = logits[..., 2:].argmax(dim=-1) + 2
            token = torch.where(ended, eos, token)
            generated.append(token)
            ended |= token.eq(eos)
            if bool(ended.all()):
                break
        return torch.cat(generated, dim=1)
