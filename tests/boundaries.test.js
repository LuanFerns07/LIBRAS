import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { boundaryFeatureCount, boundaryFeatures, decodeBoundaries } from '../src/recognition/boundaries.js'

function hand([x, y, z], spread) {
  return Array.from({ length: 21 }, (_, index) => ({
    x: x + index * spread / 12,
    y: y - index % 3 * spread / 8,
    z: z + index * .003,
  }))
}

test('a matriz de mãos sintéticas coincide byte a byte com o pré-processamento Python', () => {
  const frames = [
    { timestamp: 0, leftHand: hand([.35, .61, -.09], .089), rightHand: [] },
    { timestamp: 100, leftHand: hand([.4, .58, -.05], .067), rightHand: hand([.82, .32, .03], .085) },
    { timestamp: 200, leftHand: [hand([.5, .53, -.05], .095)[0], ...Array(20).fill(null)] },
    { timestamp: 300, leftHand: hand([.43, .6, -.064], .006), rightHand: hand([.77, .35, .01], .045) },
    { timestamp: 400, leftHand: hand([.48, .61, -.02], .098), rightHand: hand([.8, .375, .01], .062) },
  ]
  const result = boundaryFeatures(frames)
  assert.equal(boundaryFeatureCount, 260)
  assert.equal(result.length, frames.length * boundaryFeatureCount)
  // SHA-256 de model.py::features para esses pontos em float32 little-endian.
  const bytes = Buffer.alloc(result.byteLength)
  result.forEach((value, index) => bytes.writeFloatLE(value, index * Float32Array.BYTES_PER_ELEMENT))
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'a1652a65d053253c5450bf6e9f7eb3b7006e26cdbe5bef3409c6b4aacae4fd2b')
  assert.deepEqual(result.slice(2 * 260, 3 * 260), new Float32Array(260))
  assert.deepEqual(boundaryFeatures([null]), new Float32Array(260))
})

const config = {
  version: 1,
  maxDurationMs: 2100,
  activityFloor: .52,
  boundaryWeight: .3,
  proposalPenalty: .35,
  durationWeight: .1,
}

test('a decodificação reproduz os intervalos obtidos no Python, inclusive na borda final', () => {
  const probabilities = new Float32Array([
    .02, .02, .02, .02, .02, .02, .94, .96, .04, .91, .04, .03,
    .86, .06, .06, .03, .02, .90, .04, .02, .02, .01, .01, .03,
    .02, .03, .02, .89, .98, .05, .92, .04, .02, .94, .04, .04,
    .05, .02, .98, .93, .96, .02, .94, .05, .04, .95, .02, .98,
  ])
  const times = Float64Array.from({ length: 16 }, (_, index) => 200 + index * 100)
  assert.deepEqual(decodeBoundaries(times, probabilities, 300, config), [
    { startMs: 400, endMs: 700 },
    { startMs: 1100, endMs: 1400 },
    { startMs: 1500, endMs: 1700 },
    { startMs: 1700, endMs: 1800 },
  ])
})

test('o limite de duração e o empate com a ausência de sinais seguem o Python', () => {
  const times = Array.from({ length: 55 }, (_, index) => index * 40)
  const probabilities = new Float32Array(Array.from(times, () => [.92, .05, .05]).flat())
  const limitedConfig = { ...config, activityFloor: .5, boundaryWeight: 0, proposalPenalty: .22, durationWeight: .75 }
  assert.deepEqual(decodeBoundaries(times, probabilities, 2100, limitedConfig), [{ startMs: 0, endMs: 2080 }])
  assert.deepEqual(decodeBoundaries(times, probabilities, 2100, { ...limitedConfig, maxDurationMs: 2000 }),
    [{ startMs: 0, endMs: 2000 }])
  const tie = new Float32Array([.75, 0, 0, .75, 0, 0, .75, 0, 0, .75, 0, 0])
  assert.deepEqual(decodeBoundaries([0, 100, 200, 300], tie, 100,
    { ...limitedConfig, proposalPenalty: .25, durationWeight: 0 }), [])
})

test('o corte fraco e a duração mínima reproduzem os controles do Python', () => {
  const times = Array.from({ length: 8 }, (_, index) => index * 100)
  const probabilities = new Float32Array(24)
  for (let index = 1; index < 7; index += 1) probabilities[index * 3] = .85
  probabilities[4] = probabilities[23] = .98
  probabilities[13] = probabilities[14] = .10
  const temporal = { ...config, version: 2, activityFloor: .60, cutPenalty: .25, minFrames: 1 }
  assert.deepEqual(decodeBoundaries(times, probabilities, 300, temporal), [{ startMs: 100, endMs: 700 }])
  probabilities[13] = probabilities[14] = .98
  assert.deepEqual(decodeBoundaries(times, probabilities, 300, temporal),
    [{ startMs: 100, endMs: 400 }, { startMs: 400, endMs: 700 }])
  assert.deepEqual(decodeBoundaries(times, probabilities, 300, { ...temporal, minFrames: 5 }),
    [{ startMs: 100, endMs: 700 }])
  assert.deepEqual(decodeBoundaries(times.slice(0, 4), probabilities.slice(0, 12), 300,
    { ...temporal, minFrames: 5 }), [])
})

test('grades irregulares e valores inválidos geram erro explícito', () => {
  const probabilities = new Float32Array(9)
  assert.throws(() => decodeBoundaries([0, 100, 250], probabilities, 300, config), /irregular/)
  assert.throws(() => decodeBoundaries([100, 100, 100], probabilities, 300, config), /Grade temporal/)
  assert.throws(() => decodeBoundaries([0, 100], probabilities, 300, config), /Cada quadro/)
  assert.throws(() => decodeBoundaries([0, 100, 200], probabilities, 0, config), /Configuração/)
  probabilities[2] = Number.NaN
  assert.throws(() => decodeBoundaries([0, 100, 200], probabilities, 300, config), /finitas/)
})
