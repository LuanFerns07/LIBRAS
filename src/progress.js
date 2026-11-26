import { lesson } from './catalog.js'

const storageKey = 'librasia:progress:v1'
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0

export function readProgress(storage) {
  let stored
  try { stored = JSON.parse(storage?.getItem(storageKey)) } catch {}
  return Object.fromEntries(lesson.map(({ id }) => {
    const entry = stored?.[id]
    return [id, {
      observed: entry?.observed === true,
      guided: entry?.guided === true,
      independent: entry?.independent === true,
      understood: entry?.understood === true,
      accepted: count(entry?.accepted),
      hints: count(entry?.hints),
      retries: count(entry?.retries),
      retryStreak: count(entry?.retryStreak),
    }]
  }))
}

export function writeProgress(storage, progress) {
  try { storage?.setItem(storageKey, JSON.stringify(progress)) } catch {}
}

export function markAttempt(entry, step, result) {
  if (result.state === 'accepted') {
    entry[step === 1 ? 'guided' : 'independent'] = true
    entry.accepted += 1
    entry.retryStreak = 0
  } else if (result.state === 'hint') {
    entry.hints += 1
    entry.retryStreak += 1
  } else if (result.state === 'inconclusive') {
    entry.retries += 1
    entry.retryStreak += 1
  }
}

export function isComplete(entry) {
  return entry.observed && entry.guided && entry.independent && entry.understood
}

export function reviewOrder(progress) {
  return [...lesson].sort((left, right) => {
    const a = progress[left.id]
    const b = progress[right.id]
    return b.retryStreak - a.retryStreak ||
      Number(isComplete(a)) - Number(isComplete(b)) ||
      a.accepted - b.accepted
  })
}
