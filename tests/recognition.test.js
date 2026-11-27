import assert from 'node:assert/strict'
import test from 'node:test'
import { checkAlunoPosition, decide, readModelManifest } from '../src/recognition/decision.js'
import { featureCount, preprocessFrames, preprocessId, sequenceLength } from '../src/recognition/preprocess.js'
import { segmentFrames, signingSpaceIntervals } from '../src/recognition/segmentation.js'

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
  assert.equal(decide([8, 0, 2, 1], manifest).reason, 'out-of-catalog')
  assert.equal(decide([0, 2, 1, 1], manifest).reason, 'low-confidence')
  assert.throws(() => decide([0, 2, 1, Number.NaN], manifest), /Saída/)
  const expanded = readModelManifest({
    ...manifest,
    labels: [...manifest.labels, 'aluno'],
    inputName: 'landmarks', outputName: 'logits',
    frames: sequenceLength, features: featureCount, preprocess: preprocessId,
  })
  assert.equal(decide([0, 1, 2, 3, 6], expanded).id, 'signal-aluno')
})

test('a segmentação separa sinais com pausa, preserva sustentações e descarta trechos curtos', () => {
  const frames = Array.from({ length: 21 }, (_, index) => makeFrame(index * 100, {
    hand: index < 6 || index >= 10 && index <= 16 || index === 20,
  }))
  const segments = segmentFrames(frames)
  assert.equal(segments.length, 2)
  assert.deepEqual(segments.map(window => [window[0].timestamp, window.at(-1).timestamp]), [[0, 500], [1000, 1600]])
  assert.equal(segmentFrames(Array.from({ length: 21 }, (_, index) => makeFrame(index * 100))).length, 1)
  const irregular = [...frames.slice(0, 6), makeFrame(575, { hand: false }), ...frames.slice(6)]
  assert.deepEqual(signingSpaceIntervals(irregular, 100), [{ startMs: 0, endMs: 575 }, { startMs: 1000, endMs: 1700 }])
})

test('Aluno exige oito quadros na região dos ombros para o combinado calibrado', () => {
  const manifest = { modelSha256: 'a8e991d9cfedc23a2cf899ed68799c8006682f3306cf6fc0006eacdec1e62f63',
    preprocess: preprocessId, threshold: .525 }
  const values = new Float32Array(sequenceLength * featureCount)
  const aluno = { state: 'accepted', id: 'signal-aluno', confidence: .9 }
  const cinco = { state: 'accepted', id: 'signal-cinco', confidence: .9 }
  function showHand(frame, joint, x, y) {
    const wrist = frame * featureCount + joint * 4
    values.set([x, y, 0, 1], wrist)
    values[wrist + 9 * 4 + 3] = 1
  }
  for (let frame = 0; frame < 7; frame += 1) {
    showHand(frame, 6, -.23, -.30)
    showHand(frame, 27, .23, -.30)
  }
  showHand(7, 6, -.23, .6)
  showHand(8, 27, .15, .2)
  assert.equal(checkAlunoPosition(aluno, values, manifest).reason, 'uncertain-aluno')
  assert.equal(checkAlunoPosition(cinco, values, manifest), cinco)
  assert.equal(checkAlunoPosition(aluno, values, { ...manifest, threshold: .9 }), aluno)
  showHand(7, 27, .23, .50)
  assert.equal(checkAlunoPosition(aluno, values, manifest), aluno)
})
