import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createPlayback } from '../src/avatar/playback.js'
import { lesson } from '../src/catalog.js'
import { decide, readModelManifest } from '../src/recognition/decision.js'

const model = {
  labels: [null, 'cinco', 'espelho', 'amarelo'],
  threshold: .6,
  frames: 24,
  inputName: 'landmarks',
  outputName: 'logits',
  modelSha256: 'a'.repeat(64),
}
const shoulders = 'holistic-shoulders-v1'
const nose = 'holistic-shoulders-nose-v1'

for (const [preprocess, features] of [[shoulders, 192], [nose, 196]]) {
  test(`o manifesto conserva o contrato de entrada de ${preprocess}`, () => {
    const manifest = readModelManifest({ ...model, preprocess, features })
    assert.deepEqual([manifest.frames, manifest.features, manifest.preprocess], [24, features, preprocess])
    assert.equal(decide([0, 1, 1, 5], manifest).id, 'signal-amarelo')
    assert.equal(decide([5, 1, 1, 0], manifest).reason, 'out-of-catalog')
  })
}

test('o manifesto rejeita tensores que não correspondem a um esquema de extração suportado', () => {
  for (const dimensions of [
    { preprocess: shoulders, features: 196 },
    { preprocess: nose, features: 192 },
    { preprocess: nose, features: 196, frames: 23 },
    { preprocess: 'holistic-shoulders-nose-v2', features: 196 },
    { preprocess: [nose], features: 196 },
    { preprocess: 'constructor' },
  ]) {
    assert.throws(() => readModelManifest({ ...model, ...dimensions }), /Manifesto do classificador incompatível/)
  }
})

test('os sinais da lição usam o mesmo identificador no modelo combinado e no avatar', () => {
  const combined = new URL('../ml/evidence/isolated-combined/model.json', import.meta.url)
  const manifest = readModelManifest(JSON.parse(readFileSync(combined, 'utf8')))
  let selected
  const player = createPlayback({ paint() {}, onStep(step) { selected = step } })
  for (const signal of lesson) {
    const index = manifest.labels.indexOf(signal.text)
    assert.ok(index > 0, signal.text)
    const logits = manifest.labels.map((_, position) => position === index ? 8 : 0)
    assert.equal(decide(logits, manifest).id, signal.id)
    player.setSequence([signal])
    assert.equal(selected.id, signal.id)
  }
  player.dispose()
})
