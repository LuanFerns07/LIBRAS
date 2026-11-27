import { lesson, manualAlphabet } from './catalog.js'

const curricula = {
  signal: { items: lesson, storageKey: 'librasia:progress:v1' },
  letter: { items: manualAlphabet, storageKey: 'librasia:alphabet-progress:v1' },
}
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0

export function readProgress(storage, kind = 'signal') {
  const { items, storageKey } = curricula[kind]
  let stored
  try { stored = JSON.parse(storage?.getItem(storageKey)) } catch {}
  return Object.fromEntries(items.map(({ id }) => {
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

export function writeProgress(storage, progress, kind = 'signal') {
  try { storage?.setItem(curricula[kind].storageKey, JSON.stringify(progress)) } catch {}
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

export function isComplete(entry, kind = 'signal') {
  return entry.observed && entry.guided && entry.independent && (kind === 'letter' || entry.understood)
}

export function reviewOrder(progress, kind = 'signal') {
  return [...curricula[kind].items].sort((left, right) => {
    const a = progress[left.id]
    const b = progress[right.id]
    return b.retryStreak - a.retryStreak ||
      (kind === 'letter' ? Number(a.observed) - Number(b.observed) : 0) ||
      Number(isComplete(a, kind)) - Number(isComplete(b, kind)) ||
      a.accepted - b.accepted
  })
}
