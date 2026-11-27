import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createLiveLetterReader, letterFeatures, oneHand, rankLetterLogits } from '../src/recognition/alphabet.js'
import { createTrajectoryMatcher, trajectorySize } from '../src/recognition/alphabet-trajectory.js'

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
  const reader = createLiveLetterReader(async () => ({ label: letter }), value => readings.push(value))
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

test('o ranking usa o softmax de todo o catálogo antes de selecionar três letras', () => {
  const ranked = rankLetterLogits([1000, 1002, 999, 1001], ['A', 'B', 'C', 'D'])
  assert.deepEqual(ranked.map(({ label }) => label), ['B', 'D', 'A'])
  const total = 1 + Math.exp(-1) + Math.exp(-2) + Math.exp(-3)
  assert.ok(Math.abs(ranked[0].score - 1 / total) < 1e-12)
  assert.ok(Math.abs(ranked[2].score - Math.exp(-2) / total) < 1e-12)
  const complete = rankLetterLogits([1000, 1002, 999], ['A', 'B', 'C'])
  assert.ok(Math.abs(complete.reduce((sum, { score }) => sum + score, 0) - 1) < 1e-12)
})

test('o ranking se atualiza com a mesma letra e some em trajetórias e ao perder a mão', async () => {
  const initial = rankLetterLogits([5, 2, 4], ['A', 'B', 'C'])
  const next = rankLetterLogits([5, 3, 2], ['A', 'B', 'C'])
  const labels = []
  const rankings = []
  let reading = { label: 'A', ranking: initial }
  let motion = null
  const reader = createLiveLetterReader(async () => reading, label => labels.push(label),
    () => motion, ranking => rankings.push(ranking))

  for (const time of [0, 90]) await reader.read(frame(time))
  assert.deepEqual(rankings, [])
  await reader.read(frame(180))
  reading = { label: 'A', ranking: next }
  await reader.read(frame(270))
  assert.deepEqual(rankings, [initial, next])
  assert.deepEqual(labels, ['A'])

  motion = 'J'
  await reader.read(frame(360))
  assert.deepEqual(labels, ['A', 'J'])
  assert.equal(rankings.at(-1), null)
  motion = null
  for (const time of [460, 700, 990, 1080, 1170]) await reader.read(frame(time))
  assert.equal(rankings.at(-1), next)
  await reader.read({ ...frame(1260), rightHand: [] })
  assert.equal(rankings.at(-1), null)
  assert.deepEqual(labels, ['A', 'J', null, 'A', null])
})

test('um N confirmado tolera uma única leitura inconclusiva com extração alternativa', async () => {
  const readings = []
  let letter = 'N'
  const reader = createLiveLetterReader(async () => letter ? { label: letter } : null, value => readings.push(value))
  const sample = time => ({ ...frame(time), alternateHand: hand(.1) })
  for (const time of [0, 90, 180]) await reader.read(sample(time))
  assert.deepEqual(readings, ['N'])

  letter = null
  await reader.read(sample(270))
  assert.deepEqual(readings, ['N'])
  await reader.read(sample(360))
  assert.deepEqual(readings, ['N', null])

  letter = 'N'
  for (const time of [450, 540, 630]) await reader.read(sample(time))
  await reader.read({ ...frame(660), rightHand: [] })
  assert.deepEqual(readings, ['N', null, 'N', null])
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

  finishPrediction({ label: 'V' })
  await pending
  assert.deepEqual(readings, ['K'])
  await reader.read({ ...frame(150), rightHand: [] })
  assert.deepEqual(readings, ['K', null])
})

test('o leitor exige três janelas de Ç antes de trocar a leitura de C', async () => {
  const readings = []
  let motion = null
  const reader = createLiveLetterReader(async () => ({ label: 'C' }), value => readings.push(value), () => motion)
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

function zTrace(thumbX) {
  const pose = [
    [.48, .53], [.42, .51], [.40, .49], [.40, .47], [thumbX, .45],
    [.40, .40], [.40, .37], [.40, .34], [.40, .31],
    [.44, .39], [.44, .37], [.44, .39], [.44, .43],
    [.48, .39], [.48, .37], [.48, .39], [.48, .43],
    [.52, .40], [.52, .38], [.52, .40], [.52, .43],
  ]
  const positions = [[0, 0], [-.06, 0], [-.13, .005], [-.05, .065], [.01, .10], [-.08, .10], [-.19, .105]]
  return positions.map(([x, y], index) => ({
    timestamp: index * 100,
    aspect: 1,
    leftHand: [],
    rightHand: pose.map(([px, py]) => ({ x: px + x, y: py + y, z: 0 })),
  }))
}

function trajectoryOnly() {
  return createTrajectoryMatcher({
    templates: ['X', 'H'].map(label => ({ label, vector: new Float32Array(trajectorySize) })),
    limits: {},
  })
}

test('o traçado de Z distingue o polegar aberto durante as três passagens', () => {
  const matcher = trajectoryOnly()
  assert.equal(matcher(zTrace(.43)), 'Z')
  assert.equal(matcher(zTrace(.32)), null)
})

test('Z retoma um traço interrompido por uma sobreposição breve da mesma mão', async () => {
  const trace = zTrace(.43)
  const before = trace.at(-2)
  const end = trace.at(-1)
  const overlap = { ...before, timestamp: 550, leftHand: before.rightHand }
  const matcher = trajectoryOnly()

  async function read(tail) {
    const readings = []
    const reader = createLiveLetterReader(async () => ({ label: 'G' }), value => readings.push(value), matcher)
    for (const sample of [...trace.slice(0, -1), ...tail]) await reader.read(sample)
    return readings
  }

  assert.deepEqual(await read([overlap, end]), ['G', null, 'Z'])
  assert.deepEqual(await read([{ ...overlap, leftHand: [], rightHand: [] }, end]), ['G', null])
  const other = before.rightHand.map(point => ({ ...point, x: point.x + .30 }))
  assert.deepEqual(await read([{ ...overlap, leftHand: other }, end]), ['G', null])
  assert.deepEqual(await read([overlap, { ...overlap, timestamp: 575 }, end]), ['G', null])
  assert.deepEqual(await read([overlap, { ...end, timestamp: 725 }]), ['G', null])
  assert.deepEqual(await read([overlap, { ...end, leftHand: end.rightHand, rightHand: [] }]), ['G', null])
})
