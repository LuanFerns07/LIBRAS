"""Compara a saída JavaScript com o modelo de referência em Python."""

import json
import os
from pathlib import Path
from shutil import which
import subprocess
import unittest

from .corpus import CSV, GLOSS_PUNCTUATION, Pair, checksum, read_pairs, words
from .export_web import artifact, frozen_selection
from .monotone import SETTINGS, MonotoneTranslator


PROJECT = Path(__file__).resolve().parents[3]
LOCAL_DATA = os.environ.get("LIBRASIA_DATA")
NODE = """
import { readFileSync } from 'node:fs'
import { createGlossTranslator } from './src/recognition/gloss-text.js'
const request = JSON.parse(readFileSync(0, 'utf8'))
const model = request.model ?? JSON.parse(readFileSync(request.path, 'utf8'))
const translate = createGlossTranslator(model)
process.stdout.write(JSON.stringify(request.examples.map(translate)))
"""
EXAMPLES = [
    [], [""], ["[PONTO]", "[INTERROGAÇÃO]"], ["AMARELO", "IR", "ESCOLA"],
    ["IPÊ", "AÇAÍ", "TERMOQUASECERTAMENTEFORADOVOCABULÁRIO"], ["PÃO", "AÇAÍ"],
    ["À", "CIDADE"], ["D’ÁVILA", "terça-feira"], ["Fuß", "Σ", "İ"],
    ["constructor", "__proto__"], ["𐐀", "K"], ["[PONTO]", "ÁGUA", "[EXCLAMAÇÃO]"],
]


@unittest.skipUnless(which("node"), "Requer Node.js.")
class WebTranslationTests(unittest.TestCase):
    def check_parity(self, translator, settings, examples, **model):
        process = subprocess.run(
            ["node", "--input-type=module", "-e", NODE], cwd=PROJECT,
            input=json.dumps({**model, "examples": examples}), text=True, capture_output=True,
        )
        self.assertEqual(process.returncode, 0, process.stderr)
        predictions = json.loads(process.stdout)
        self.assertEqual(len(predictions), len(examples))
        for index, (raw, observed) in enumerate(zip(examples, predictions, strict=True)):
            with self.subTest(index=index):
                tokens = tuple(words(GLOSS_PUNCTUATION.sub(" ", " ".join(raw))))
                self.assertEqual(tuple(observed), translator.translate(tokens, settings))

    def test_translates_training_patterns_and_unknown_tokens(self):
        examples = [("ir", "escola"), ("comprar", "pão"), ("ela", "ir", "amanhã"), ("chá", "açaí")]
        targets = [("ir", "à", "escola"), ("comprar", "o", "pão"), ("ela", "irá", "amanhã"), ("chá", "e", "açaí")]
        pairs = [Pair(row, gloss, target) for row, (gloss, target) in enumerate(zip(examples, targets, strict=True))]
        translator = MonotoneTranslator(pairs * 5)
        for settings in (SETTINGS[0], SETTINGS[4]):
            with self.subTest(settings=settings):
                self.check_parity(translator, settings, [*examples, *EXAMPLES], model=artifact(translator, settings, {}))

    @unittest.skipUnless(LOCAL_DATA, "Defina LIBRASIA_DATA para a paridade no VLibrasBD local.")
    def test_frozen_artifact_matches_all_validation_examples(self):
        root = Path(LOCAL_DATA).resolve()
        source = root / "vlibrasbd-v2" / CSV
        directory = root / "vlibrasbd-holdout"
        model_path = directory / "monotone-web.json"
        metadata = json.loads((directory / "monotone-web.manifest.json").read_bytes())
        self.assertEqual(checksum(model_path), metadata["sha256"])
        self.assertEqual(model_path.stat().st_size, metadata["bytes"])
        train, _, selected = frozen_selection(directory)
        dev = set(json.loads((directory / "split.json").read_bytes())["rows"]["dev"])
        self.assertEqual(len(dev), 1200)
        self.assertTrue(train.isdisjoint(dev))
        validation = list(read_pairs(source, dev))
        self.assertEqual(len(validation), len(dev))
        translator = MonotoneTranslator(read_pairs(source, train))
        self.check_parity(translator, SETTINGS[selected], [*[pair.gloss for pair in validation], *EXAMPLES], path=str(model_path))


if __name__ == "__main__":
    unittest.main()
