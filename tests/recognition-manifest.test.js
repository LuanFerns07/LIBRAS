import assert from 'node:assert/strict'
import test from 'node:test'
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
