"""Aprende transduções locais e um modelo de língua com os pares de treino."""

from collections import Counter, defaultdict
from dataclasses import dataclass
from functools import lru_cache
from math import log
import unicodedata


START = "<início>"
END = "<fim>"
MAX_PHRASE = 3
BEAM = 6
FUNCTION_WORDS = frozenset(
    "a o as os um uma uns umas de do da dos das em no na nos nas ao aos à às "
    "por pelo pela pelos pelas para com sem e ou que se".split()
)


@dataclass(frozen=True)
class Settings:
    language: float
    length: float
    copy: float


SETTINGS = (
    Settings(0.00, 0.00, 1.0),
    Settings(0.08, 0.25, 1.0),
    Settings(0.16, 0.45, 1.0),
    Settings(0.24, 0.67, 1.0),
    Settings(0.16, 0.45, 3.0),
    Settings(0.16, 0.68, 0.4),
)


@lru_cache(maxsize=20_000)
def unaccent(word):
    return "".join(c for c in unicodedata.normalize("NFD", word) if not unicodedata.combining(c))


def replace_cost(source, target):
    if source == target:
        return 0
    if unaccent(source) == unaccent(target):
        return 2
    if target in FUNCTION_WORDS:
        return 19
    shortest = min(len(source), len(target))
    if shortest >= 4 and source[:max(4, shortest - 2)] == target[:max(4, shortest - 2)]:
        return 4
    if shortest >= 4 and source[:3] == target[:3]:
        return 10
    return 15


def align(source, target):
    """Devolve os fragmentos de saída atribuídos a cada palavra da entrada."""
    width = len(target) + 1
    costs = [[0] * width for _ in range(len(source) + 1)]
    moves = [[0] * width for _ in costs]
    insertion = [0, *(5 if word in FUNCTION_WORDS else 12 for word in target)]
    for j in range(1, width):
        costs[0][j] = costs[0][j - 1] + insertion[j]
        moves[0][j] = 2
    for i, word in enumerate(source, 1):
        costs[i][0] = i * 12
        moves[i][0] = 1
        for j, translated in enumerate(target, 1):
            choices = (
                (costs[i - 1][j - 1] + replace_cost(word, translated), 0),
                (costs[i - 1][j] + 12, 1),
                (costs[i][j - 1] + insertion[j], 2),
            )
            costs[i][j], moves[i][j] = min(choices)

    chunks = [[] for _ in source]
    i, j = len(source), len(target)
    while i or j:
        direction = moves[i][j]
        if direction == 0:
            chunks[i - 1].append(target[j - 1])
            i -= 1
            j -= 1
        elif direction == 1:
            i -= 1
        else:
            chunks[min(i, len(chunks) - 1)].append(target[j - 1])
            j -= 1
    return [tuple(reversed(chunk)) for chunk in chunks]


class MonotoneTranslator:
    def __init__(self, pairs):
        self.phrases = defaultdict(Counter)
        self.left_context = defaultdict(Counter)
        self.right_context = defaultdict(Counter)
        self.words = Counter()
        self.bigrams = defaultdict(Counter)
        self.trigrams = defaultdict(Counter)
        for pair in pairs:
            self.observe(pair.gloss, pair.portuguese)
        self.total_words = self.words.total()
        self.phrase_sizes = {phrase: counts.total() for phrase, counts in self.phrases.items()}
        self.left_sizes = {phrase: counts.total() for phrase, counts in self.left_context.items()}
        self.right_sizes = {phrase: counts.total() for phrase, counts in self.right_context.items()}
        self.bigram_sizes = {key: counts.total() for key, counts in self.bigrams.items()}
        self.trigram_sizes = {key: counts.total() for key, counts in self.trigrams.items()}

    def observe(self, source, target):
        chunks = align(source, target)
        for i, word in enumerate(source):
            self.left_context[source[i - 1] if i else START, word][chunks[i]] += 1
            self.right_context[word, source[i + 1] if i + 1 < len(source) else END][chunks[i]] += 1
            phrase = ()
            for width in range(1, min(MAX_PHRASE, len(source) - i) + 1):
                phrase += chunks[i + width - 1]
                self.phrases[source[i:i + width]][phrase] += 1

        padded = (START, START, *target, END)
        for first, second, word in zip(padded, padded[1:], padded[2:]):
            self.words[word] += 1
            self.bigrams[second][word] += 1
            self.trigrams[first, second][word] += 1

    @lru_cache(maxsize=130_000)
    def log_word(self, first, second, word):
        prior = (self.words[word] + 0.2) / (self.total_words + 0.2 * (len(self.words) + 1))
        previous = self.bigrams.get(second, {})
        bigram = (previous.get(word, 0) + 8 * prior) / (self.bigram_sizes.get(second, 0) + 8)
        context = first, second
        history = self.trigrams.get(context, {})
        trigram = (history.get(word, 0) + 5 * bigram) / (self.trigram_sizes.get(context, 0) + 5)
        return log(trigram)

    def candidates(self, source, start, width, settings):
        phrase = source[start:start + width]
        counts = self.phrases.get(phrase, Counter())
        total = self.phrase_sizes.get(phrase, 0)
        if width > 1:
            return [(output, width * log(count / total) - 0.20 * (width - 1))
                    for output, count in counts.most_common(4) if count >= 2]

        word, = phrase
        before = source[start - 1] if start else START
        after = source[start + 1] if start + 1 < len(source) else END
        left_key, right_key = (before, word), (word, after)
        left = self.left_context.get(left_key, Counter())
        right = self.right_context.get(right_key, Counter())
        left_total = self.left_sizes.get(left_key, 0)
        right_total = self.right_sizes.get(right_key, 0)
        copy = (word,)
        outputs = dict.fromkeys([
            copy,
            *(option for option, _ in counts.most_common(5)),
            *(option for option, _ in left.most_common(3)),
            *(option for option, _ in right.most_common(3)),
        ])
        scored = []
        for output in outputs:
            prior = (counts[output] + settings.copy * (output == copy)) / (total + settings.copy)
            probability = (prior + (left[output] + 3 * prior) / (left_total + 3)
                           + (right[output] + 3 * prior) / (right_total + 3)) / 3
            scored.append((output, log(probability)))
        return sorted(scored, key=lambda item: (-item[1], item[0]))[:6]

    def translate(self, source, settings):
        states = [dict() for _ in range(len(source) + 1)]
        states[0][()] = 0.0
        for start in range(len(source)):
            beam = sorted(states[start].items(), key=lambda item: (-item[1], item[0]))[:BEAM]
            for width in range(1, min(MAX_PHRASE, len(source) - start) + 1):
                destination = states[start + width]
                for emitted, translation in self.candidates(source, start, width, settings):
                    for prefix, score in beam:
                        history = (START, START, *prefix[-2:], *emitted)
                        boundary = 2 + min(len(prefix), 2)
                        language = sum(
                            self.log_word(history[i - 2], history[i - 1], history[i])
                            for i in range(boundary, len(history))
                        ) if settings.language else 0.0
                        output = prefix + emitted
                        proposal = score + translation + settings.language * language + settings.length * len(emitted)
                        if proposal > destination.get(output, float("-inf")):
                            destination[output] = proposal

        def final_score(candidate):
            output, score = candidate
            first, second = (START, START, *output[-2:])[-2:]
            return -(score + settings.language * self.log_word(first, second, END)), output

        return min(states[-1].items(), key=final_score)[0]
