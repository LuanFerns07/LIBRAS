import assert from 'node:assert/strict'
import test from 'node:test'
import { readActivity, recordAttempt, summarizeActivity } from '../src/activity.js'

function memoryStorage() {
  const data = new Map()
  return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) }
}

test('o registro soma tentativas do dia e resume a semana e a sequência', () => {
  const storage = memoryStorage()
  const day = d => new Date(2026, 10, d, 12)
  let activity = readActivity(storage)
  activity = recordAttempt(storage, activity, day(25))
  activity = recordAttempt(storage, activity, day(27))
  activity = recordAttempt(storage, activity, day(28))
  activity = recordAttempt(storage, activity, day(28))
  assert.deepEqual(readActivity(storage), activity)
  const summary = summarizeActivity(activity, day(28))
  assert.equal(summary.today, 2)
  assert.equal(summary.total, 4)
  assert.equal(summary.streak, 2)
  assert.equal(summary.week.length, 7)
  assert.deepEqual(summary.week.map(entry => entry.count), [0, 0, 0, 1, 0, 1, 2])
})

test('a sequência continua visível antes da primeira tentativa do dia', () => {
  const activity = { '2026-11-26': 1, '2026-11-27': 3 }
  assert.equal(summarizeActivity(activity, new Date(2026, 10, 28, 9)).streak, 2)
  assert.equal(summarizeActivity(activity, new Date(2026, 10, 29, 9)).streak, 0)
})

test('dados corrompidos viram um registro vazio', () => {
  const storage = { getItem: () => '[1,2]', setItem() {} }
  assert.deepEqual(readActivity(storage), {})
  assert.deepEqual(readActivity({ getItem: () => '{"x":1,"2026-11-28":-2,"2026-11-27":2}' }), { '2026-11-27': 2 })
})

test('meta semanal conta dias ativos e guarda o melhor recorde', () => {
  const activity = { '2026-11-01': 1, '2026-11-02': 1, '2026-11-03': 1, '2026-11-04': 2,
    '2026-11-23': 1, '2026-11-24': 1, '2026-11-26': 4, '2026-11-27': 1, '2026-11-28': 1 }
  const summary = summarizeActivity(activity, new Date(2026, 10, 28, 9))
  assert.equal(summary.activeDays, 5)
  assert.equal(summary.goal, 5)
  assert.equal(summary.goalReached, true)
  assert.equal(summary.streak, 3)
  assert.equal(summary.bestStreak, 4)
  assert.equal(summarizeActivity({ '2026-11-28': 1 }, new Date(2026, 10, 28, 9)).goalReached, false)
})
