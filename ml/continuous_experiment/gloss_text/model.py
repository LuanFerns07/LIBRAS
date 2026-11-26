"""Gerador recorrente pequeno com atenção e cópia de palavras das glosas."""

from collections import Counter

import torch
from torch import nn


PAD, BOS, EOS, UNK = range(4)
SPECIAL = ("<pad>", "<bos>", "<eos>", "<unk>")
TARGET_LIMIT = 2800
SOURCE_LIMIT = 5000
HIDDEN = 64


class Vocabulary:
    def __init__(self, source, target):
        self.target = tuple(target)
        self.target_ids = {token: index for index, token in enumerate(target)}
        self.source = tuple(source)
        self.source_ids = {token: index for index, token in enumerate(source)}

    @classmethod
    def fit(cls, pairs):
        source = Counter(token for pair in pairs for token in pair.gloss)
        target = Counter(token for pair in pairs for token in pair.portuguese)
        output = SPECIAL + tuple(token for token, _ in target.most_common(TARGET_LIMIT))
        output_set = set(output)
        input_only = [token for token, _ in source.most_common() if token not in output_set]
        return cls(output + tuple(input_only[:SOURCE_LIMIT]), output)

    def input_tensors(self, phrases):
        width = max(map(len, phrases))
        embeddings = torch.full((len(phrases), width), PAD)
        copies = torch.full_like(embeddings, PAD)
        rare_words = []
        size = len(self.target)
        for row, phrase in enumerate(phrases):
            rare = {}
            for column, word in enumerate(phrase):
                embeddings[row, column] = self.source_ids.get(word, UNK)
                token = self.target_ids.get(word)
                if token is None:
                    token = rare.setdefault(word, size + len(rare))
                copies[row, column] = token
            rare_words.append(tuple(rare))
        return embeddings, copies, rare_words

    def reference_tensors(self, phrases, rare_words):
        width = max(map(len, phrases)) + 1
        references = torch.full((len(phrases), width), PAD)
        previous = torch.full_like(references, PAD)
        previous[:, 0] = BOS
        size = len(self.target)
        for row, (phrase, rare) in enumerate(zip(phrases, rare_words)):
            extra = {word: size + index for index, word in enumerate(rare)}
            ids = [self.target_ids.get(word, extra.get(word, UNK)) for word in phrase]
            references[row, :len(ids) + 1] = torch.tensor([*ids, EOS])
            previous[row, 1:len(ids) + 1] = torch.tensor([token if token < size else UNK for token in ids])
        return previous, references


class GlossGenerator(nn.Module):
    def __init__(self, vocabulary):
        super().__init__()
        self.target_size = len(vocabulary.target)
        self.embedding = nn.Embedding(len(vocabulary.source), HIDDEN, padding_idx=PAD)
        self.encoder = nn.GRU(HIDDEN, HIDDEN, batch_first=True)
        self.decoder = nn.GRU(HIDDEN, HIDDEN, batch_first=True)
        self.key = nn.Linear(HIDDEN, HIDDEN, bias=False)
        self.fuse = nn.Linear(2 * HIDDEN, HIDDEN)
        self.output = nn.Linear(HIDDEN, self.target_size)
        self.generate_gate = nn.Linear(2 * HIDDEN, 1)

    def encode(self, source):
        mask = source.ne(PAD)
        memory, _ = self.encoder(self.embedding(source))
        last = memory[torch.arange(len(source)), mask.sum(dim=1) - 1]
        return (memory, self.key(memory), mask), last.unsqueeze(0)

    def decode(self, encoded, state, previous):
        memory, keys, mask = encoded
        query, state = self.decoder(self.embedding(previous), state)
        scores = (query @ keys.transpose(1, 2)).masked_fill(~mask[:, None, :], -torch.inf)
        attention = scores.softmax(dim=-1)
        features = torch.cat((query, attention @ memory), dim=-1)
        gate = self.generate_gate(features).sigmoid()
        word_probs = self.output(self.fuse(features).tanh()).softmax(dim=-1) * gate
        return word_probs, attention * (1 - gate), state

    def loss(self, source, copies, previous, reference):
        encoded, state = self.encode(source)
        word_probs, pointer_probs, _ = self.decode(encoded, state, previous)
        in_vocabulary = reference.lt(self.target_size)
        indices = reference.masked_fill(~in_vocabulary, UNK).unsqueeze(-1)
        generated = word_probs.gather(-1, indices).squeeze(-1) * in_vocabulary
        copied = (pointer_probs * copies[:, None, :].eq(reference[:, :, None])).sum(dim=-1)
        loss = -(generated + copied).clamp_min(1e-8).log()
        return loss[reference.ne(PAD)].mean()

    def generate(self, source, copies, maximum):
        encoded, state = self.encode(source)
        previous = torch.full_like(source[:, :1], BOS)
        guesses = []
        finished = torch.zeros(len(source), dtype=torch.bool)
        for _ in range(maximum):
            word_probs, pointer_probs, state = self.decode(encoded, state, previous)
            scores = nn.functional.pad(word_probs.squeeze(1), (0, source.shape[1]))
            scores.scatter_add_(1, copies, pointer_probs.squeeze(1))
            scores[:, PAD] = -1
            scores[:, BOS] = -1
            chosen = scores.argmax(dim=-1)
            finished |= chosen.eq(EOS)
            guesses.append(chosen)
            if finished.all():
                break
            previous = chosen.masked_fill(chosen.ge(self.target_size), UNK).unsqueeze(-1)
        return torch.stack(guesses, dim=1).tolist()


def batches(pairs, vocabulary, size, *, references):
    for begin in range(0, len(pairs), size):
        batch = pairs[begin:begin + size]
        source, copies, rare = vocabulary.input_tensors([pair.gloss for pair in batch])
        if references:
            previous, expected = vocabulary.reference_tensors([pair.portuguese for pair in batch], rare)
            yield source, copies, previous, expected
        else:
            yield source, copies, rare
