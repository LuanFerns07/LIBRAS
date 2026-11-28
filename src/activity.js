// Registro leve de tentativas por dia, só no navegador, para o painel de prática.
const key = 'librasia-atividade'
const keepDays = 35
// Meta semanal no estilo dos apps de treino: praticar em 5 dos últimos 7 dias.
export const weeklyGoal = 5

export function dayKey(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export function readActivity(storage) {
  try {
    const data = JSON.parse(storage?.getItem(key) ?? '{}')
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
    return Object.fromEntries(Object.entries(data)
      .filter(([day, count]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isInteger(count) && count > 0))
  } catch {
    return {}
  }
}

export function recordAttempt(storage, activity, now = new Date()) {
  const today = dayKey(now)
  const next = { ...activity, [today]: (activity[today] ?? 0) + 1 }
  const oldest = dayKey(new Date(now.getTime() - keepDays * 86_400_000))
  for (const day of Object.keys(next)) if (day < oldest) delete next[day]
  try { storage?.setItem(key, JSON.stringify(next)) } catch {}
  return next
}

export function summarizeActivity(activity, now = new Date()) {
  const week = []
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(now.getTime() - offset * 86_400_000)
    week.push({ day: dayKey(date), weekday: date.getDay(), count: activity[dayKey(date)] ?? 0 })
  }
  let streak = 0
  for (let offset = activity[dayKey(now)] ? 0 : 1; ; offset++) {
    if (!activity[dayKey(new Date(now.getTime() - offset * 86_400_000))]) break
    streak++
  }
  const days = Object.keys(activity).sort()
  let bestStreak = 0
  let run = 0
  let previous
  for (const day of days) {
    const next = previous && dayKey(new Date(new Date(`${previous}T12:00`).getTime() + 86_400_000)) === day
    run = next ? run + 1 : 1
    bestStreak = Math.max(bestStreak, run)
    previous = day
  }
  const activeDays = week.filter(entry => entry.count > 0).length
  return {
    today: week.at(-1).count,
    activeDays,
    goal: weeklyGoal,
    goalReached: activeDays >= weeklyGoal,
    bestStreak: Math.max(bestStreak, streak),
    total: week.reduce((sum, entry) => sum + entry.count, 0),
    streak,
    week,
  }
}
