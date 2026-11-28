// Preferências escolhidas na configuração inicial, guardadas só neste navegador.
const key = 'librasia-preferencias'
const defaults = { configured: false, handPoints: true, camera: 'unknown', name: '', ageRange: '', hand: '', level: '' }
export const ageRanges = ['ate-12', '13-17', '18-59', '60+']
export const hands = ['right', 'left']
export const levels = ['iniciante', 'basico', 'fluente']
const pick = (list, value) => list.includes(value) ? value : ''
export const nameLimit = 24

export function cleanName(value) {
  return typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim().slice(0, nameLimit).trim() : ''
}

export function readPreferences(storage) {
  try {
    const saved = JSON.parse(storage?.getItem(key) ?? '{}')
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return { ...defaults }
    return {
      configured: saved.configured === true,
      handPoints: saved.handPoints !== false,
      camera: ['unknown', 'granted', 'denied'].includes(saved.camera) ? saved.camera : 'unknown',
      name: cleanName(saved.name),
      ageRange: pick(ageRanges, saved.ageRange),
      hand: pick(hands, saved.hand),
      level: pick(levels, saved.level),
    }
  } catch {
    return { ...defaults }
  }
}

export function writePreferences(storage, preferences) {
  const next = { ...readPreferences(storage), ...preferences }
  next.name = cleanName(next.name)
  next.ageRange = pick(ageRanges, next.ageRange)
  next.hand = pick(hands, next.hand)
  next.level = pick(levels, next.level)
  try { storage?.setItem(key, JSON.stringify(next)) } catch {}
  return next
}

// Foto do perfil: só neste navegador, já reduzida para um JPEG pequeno.
const photoKey = 'librasia-foto'
const photoLimit = 150_000

export function readPhoto(storage) {
  try {
    const photo = storage?.getItem(photoKey) ?? ''
    return /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/u.test(photo) && photo.length <= photoLimit ? photo : ''
  } catch {
    return ''
  }
}

export function writePhoto(storage, photo) {
  try {
    if (!photo) storage?.removeItem(photoKey)
    else storage?.setItem(photoKey, photo)
  } catch {
    return false
  }
  return readPhoto(storage) === (photo || '')
}
