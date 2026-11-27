import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createLiveLetterReader, letterFeatures, oneHand } from '../src/recognition/alphabet.js'

const hand = y => Array.from({ length: 21 }, (_, i) => ({ x: .2 + i / 50, y: y + i / 70, z: i / 100 }))
const frame = timestamp => ({ timestamp, aspect: 4 / 3, rightHand: hand(.1), leftHand: [] })

test('o leitor usa uma mão levantada e trata duas mãos no mesmo nível como ambíguas', () => {
  const upper = hand(.1)
  assert.equal(oneHand({ rightHand: upper, leftHand: hand(.65) }), upper)
  assert.equal(oneHand({ rightHand: upper, leftHand: hand(.15) }), null)
  assert.equal(letterFeatures(upper, 4 / 3).length, 63)
  assert.equal(letterFeatures(Array.from({ length: 21 }, () => upper[0]), 1), null)
})

test('a letra aparece no fluxo de quadros após três leituras iguais e some sem a mão', async () => {
  const readings = []
  let letter = 'A'
  const reader = createLiveLetterReader(async () => letter, value => readings.push(value))
  for (const time of [0, 90]) await reader.read(frame(time))
  assert.deepEqual(readings, [])
  await reader.read(frame(180))
  assert.deepEqual(readings, ['A'])
  letter = 'B'
  for (const time of [270, 360, 450]) await reader.read(frame(time))
  assert.deepEqual(readings, ['A', null, 'B'])
  await reader.read({ ...frame(540), rightHand: [] })
  assert.equal(readings.at(-1), null)
})

test('a trajetória usa quadros entre leituras e prevalece sobre uma previsão estática atrasada', async () => {
  const readings = []
  const windows = []
  let finishPrediction
  const prediction = new Promise(resolve => { finishPrediction = resolve })
  const reader = createLiveLetterReader(() => prediction, value => readings.push(value), frames => {
    windows.push(frames.map(item => item.timestamp))
    return frames.length >= 3 ? 'K' : null
  })

  const pending = reader.read(frame(0))
  for (const time of [30, 60, 90, 120]) await reader.read(frame(time))
  assert.deepEqual(windows, [[0], [0, 30, 60], [0, 30, 60, 90, 120]])
  assert.deepEqual(readings, ['K'])

  finishPrediction('V')
  await pending
  assert.deepEqual(readings, ['K'])
  await reader.read({ ...frame(150), rightHand: [] })
  assert.deepEqual(readings, ['K', null])
})
