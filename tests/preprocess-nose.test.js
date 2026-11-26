import assert from 'node:assert/strict'
import test from 'node:test'
import {
  featureCount, nosePreprocessId, preprocessFeatureCounts, preprocessFrames, preprocessId, sequenceLength,
} from '../src/recognition/preprocess.js'

const nose = { x: .5625, y: .25, z: .25 }
const frameSize = preprocessFeatureCounts[nosePreprocessId]

function makeFrame(timestamp, { hand = true, shoulders = true } = {}) {
  const pose = [nose]
  if (shoulders) {
    pose[11] = { x: .25, y: .5, z: .125 }
    pose[12] = { x: .75, y: .5, z: .125 }
    pose[16] = { x: .625, y: .625, z: .25 }
  }
  return {
    timestamp, aspect: 2, pose, leftHand: [],
    rightHand: hand ? Array.from({ length: 21 }, () => ({ x: .625, y: .625, z: .125 })) : [],
  }
}

function noseAt(values, index) {
  return Array.from(values.subarray(index * frameSize + featureCount, (index + 1) * frameSize))
}

test('o esquema com nariz preserva as 192 posições anteriores por quadro', () => {
  const frames = Array.from({ length: 5 }, (_, index) => makeFrame(index * 100))
  const original = preprocessFrames(frames)
  const withNose = preprocessFrames(frames, nosePreprocessId)
  assert.deepEqual(preprocessFeatureCounts, { [preprocessId]: 192, [nosePreprocessId]: 196 })
  assert.deepEqual(original, preprocessFrames(frames, preprocessId))
  assert.equal(original.values.length, 24 * 192)
  assert.equal(withNose.state, 'ready')
  assert.equal(withNose.values.length, 24 * 196)
  for (let index = 0; index < sequenceLength; index += 1) {
    assert.deepEqual(
      withNose.values.subarray(index * frameSize, index * frameSize + featureCount),
      original.values.subarray(index * featureCount, (index + 1) * featureCount),
    )
    assert.deepEqual(noseAt(withNose.values, index), [.125, -.25, .25, 1])
  }
})

test('o nariz tem máscara zero quando ausente, invisível ou sem referência', () => {
  const frames = Array.from({ length: 6 }, (_, index) => makeFrame(index * 100, { shoulders: index !== 4 }))
  frames[0].pose[0] = undefined
  frames[1].pose[0] = { ...nose, visibility: .49 }
  frames[2].pose[0] = { ...nose, presence: .49 }
  frames[3].pose[0] = { ...nose, z: Number.NaN }
  const { values } = preprocessFrames(frames, nosePreprocessId)
  for (const index of [0, 5, 9, 14, 18]) {
    assert.deepEqual(noseAt(values, index), [0, 0, 0, 0])
  }
  assert.deepEqual(noseAt(values, sequenceLength - 1), [.125, -.25, .25, 1])
  assert.equal(preprocessFrames([makeFrame(0, { hand: false })], nosePreprocessId).state, 'no-hand')
  assert.equal(preprocessFrames([makeFrame(0)], nosePreprocessId).state, 'insufficient')
  assert.throws(() => preprocessFrames([], 'unknown'), /Esquema/)
})
