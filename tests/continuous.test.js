import assert from 'node:assert/strict'
import { test } from 'node:test'
import { continuousResult, regularizeBoundaryFrames } from '../src/recognition/continuous.js'

test('a grade mantém posições temporais sem repetir quadros durante a perda de captura', () => {
  const frames = [20, 117, 324, 417, 563].map(timestamp => ({ timestamp }))
  const sampled = regularizeBoundaryFrames(frames, 100)
  assert.deepEqual(sampled.times, [20, 120, 220, 320, 420, 520])
  assert.deepEqual(sampled.frames.map(frame => frame?.timestamp ?? null), [20, 117, null, 324, 417, 563])
})

test('os limites separam as glosas em ordem e o tradutor recebe a sequência completa', async () => {
  const times = [0, 100, 200, 300, 400].map(timestamp => ({ timestamp }))
  const intervals = [{ startMs: 0, endMs: 200 }, { startMs: 200, endMs: 500 }]
  const result = await continuousResult(intervals, times, frames => {
    const timestamps = frames.map(({ timestamp }) => timestamp)
    if (timestamps[0] === 0) {
      assert.deepEqual(timestamps, [0, 100])
      return { state: 'accepted', id: 'signal-cinco' }
    }
    assert.deepEqual(timestamps, [200, 300, 400])
    return { state: 'accepted', id: 'signal-espelho' }
  }, glosses => {
    assert.deepEqual(glosses, ['cinco', 'espelho'])
    return ['cinco', 'espelhos']
  })
  assert.equal(result.state, 'accepted')
  assert.equal(result.text, 'cinco espelhos')
})

test('a sequência incerta exibe glosas conhecidas e evita produzir texto parcial', async () => {
  const times = [0, 200].map(timestamp => ({ timestamp }))
  const intervals = [{ startMs: 0, endMs: 200 }, { startMs: 200, endMs: 300 }]
  const result = await continuousResult(intervals, times, ([frame]) => frame.timestamp === 0
    ? { state: 'accepted', id: 'signal-cinco' } : { state: 'inconclusive' },
  () => assert.fail('Uma sequência incompleta deve ficar sem sugestão de texto.'))
  assert.equal(result.state, 'inconclusive')
  assert.equal(result.reason, 'partial-sequence')
  assert.deepEqual(result.glosses, ['cinco', null])
  assert.equal(result.text, undefined)
})
