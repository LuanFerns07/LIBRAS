import assert from 'node:assert/strict'
import test from 'node:test'
import { decide, readModelManifest } from '../src/recognition/decision.js'
import { featureCount, preprocessFrames, preprocessId, sequenceLength } from '../src/recognition/preprocess.js'

function makeFrame(timestamp, { hand = true, pose = true } = {}) {
  const landmarks = []
  if (pose) {
    landmarks[11] = { x: .6, y: .5, z: .02, visibility: .8 }
    landmarks[12] = { x: .4, y: .5, z: -.02, visibility: .8 }
    landmarks[16] = { x: .34, y: .51, z: -.10 }
  }
  return {
    timestamp, aspect: 4 / 3, pose: landmarks, leftHand: [],
    rightHand: hand ? Array.from({ length: 21 }, () => ({ x: .34, y: .52, z: 0 })) : [],
  }
}

test('o pré-processamento centraliza ombros e mantém ordem, escala e máscaras', () => {
  const frames = Array.from({ length: 5 }, (_, index) => makeFrame(index * 100))
  const { state, values } = preprocessFrames(frames)
  assert.equal(state, 'ready')
  assert.equal(values.length, sequenceLength * featureCount)
  assert.ok(Math.abs(values[0] - .5) < 1e-6)
  assert.ok(Math.abs(values[4] + .5) < 1e-6)
  assert.equal(values[3], 1)
  assert.equal(values[7], 1)
  assert.deepEqual(Array.from(values.slice(24, 108)), Array(84).fill(0))
  assert.ok(Math.abs(values[110] + .5) < 1e-6)
  assert.equal(values[111], 1)
})

test('falta de evidência é explicitada e lacunas de tempo não repetem quadros distantes', () => {
  assert.equal(preprocessFrames([makeFrame(0, { hand: false })]).state, 'no-hand')
  assert.equal(preprocessFrames([makeFrame(0, { pose: false })]).state, 'no-hand')
  assert.equal(preprocessFrames([makeFrame(0)]).state, 'insufficient')
  assert.throws(() => preprocessFrames([makeFrame(0), makeFrame(0)]), /Quadro inválido/)
  const { values } = preprocessFrames([0, 100, 200, 300, 1600].map(timestamp => makeFrame(timestamp)))
  assert.ok(values.slice(10 * featureCount, 11 * featureCount).every(value => value === 0))
})

test('o classificador só aceita classes suportadas acima de confiança fixada', () => {
  const manifest = readModelManifest({
    labels: [null, 'cinco', 'espelho', 'amarelo'],
    threshold: .8,
    frames: sequenceLength,
    features: featureCount,
    preprocess: preprocessId,
    inputName: 'landmarks',
    outputName: 'logits',
    modelSha256: 'a'.repeat(64),
  })
  assert.equal(decide([0, 8, 2, 1], manifest).id, 'signal-cinco')
  assert.equal(decide([8, 0, 2, 1], manifest).state, 'inconclusive')
  assert.equal(decide([0, 2, 1, 1], manifest).state, 'inconclusive')
  assert.throws(() => decide([0, 2, 1, Number.NaN], manifest), /Saída/)
})
