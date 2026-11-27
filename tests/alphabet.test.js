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

test('o leitor exige três janelas de Ç antes de trocar a leitura de C', async () => {
  const readings = []
  let motion = null
  const reader = createLiveLetterReader(async () => 'C', value => readings.push(value), () => motion)
  for (const time of [0, 100, 200]) await reader.read(frame(time))

  motion = 'Ç'
  for (const time of [300, 400]) await reader.read(frame(time))
  motion = null
  await reader.read(frame(500))
  assert.deepEqual(readings, ['C'])

  motion = 'Ç'
  for (const time of [600, 700, 800]) await reader.read(frame(time))
  assert.deepEqual(readings, ['C', 'Ç'])
})

test('o leitor pode completar Z após um X inicial e uma perda breve da mão', async () => {
  const readings = []
  const windows = []
  const reader = createLiveLetterReader(async () => null, value => readings.push(value), (frames, indexPath) => {
    windows.push([frames.map(item => item.timestamp), indexPath.map(item => item.timestamp)])
    const now = frames.at(-1).timestamp
    if (now === 100 || now === 200) return 'X'
    return now === 400 && indexPath[0].timestamp === 0 ? 'Z' : null
  })

  for (const time of [0, 100, 200]) await reader.read(frame(time))
  await reader.read({ ...frame(300), rightHand: [] })
  await reader.read(frame(400))
  assert.deepEqual(readings, ['X', null, 'Z'])
  assert.deepEqual(windows.at(-1), [[400], [0, 100, 200, 400]])

  reader.clear()
  await reader.read(frame(500))
  assert.deepEqual(windows.at(-1), [[500], [500]])
  await reader.read({ ...frame(550), rightHand: [] })
  await reader.read(frame(600))
  assert.deepEqual(windows.at(-1), [[600], [600]])
})
