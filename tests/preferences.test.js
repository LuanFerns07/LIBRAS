import test from 'node:test'
import assert from 'node:assert/strict'
import { readPreferences, writePreferences } from '../src/preferences.js'

function memory() {
  const data = new Map()
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) }
}

test('preferências começam sem configuração e com pontos ligados', () => {
  assert.deepEqual(readPreferences(memory()), { configured: false, handPoints: true, camera: 'unknown', name: '', ageRange: '', hand: '', level: '' })
  assert.deepEqual(readPreferences(undefined), { configured: false, handPoints: true, camera: 'unknown', name: '', ageRange: '', hand: '', level: '' })
})

test('preferências salvas voltam iguais e valores inválidos são ignorados', () => {
  const storage = memory()
  writePreferences(storage, { configured: true, handPoints: false, camera: 'granted', name: '  Ana   Clara ' })
  assert.deepEqual(readPreferences(storage), { configured: true, handPoints: false, camera: 'granted', name: 'Ana Clara', ageRange: '', hand: '', level: '' })
  storage.setItem('librasia-preferencias', '{"handPoints":"sim","camera":"talvez","name":42}')
  assert.deepEqual(readPreferences(storage), { configured: false, handPoints: true, camera: 'unknown', name: '', ageRange: '', hand: '', level: '' })
})

test('o nome é limitado a 24 caracteres', () => {
  const storage = memory()
  assert.equal(writePreferences(storage, { name: 'x'.repeat(40) }).name.length, 24)
})

test('perfil guarda faixa etária, mão e nível só com valores conhecidos', () => {
  const storage = memory()
  const saved = writePreferences(storage, { ageRange: '18-59', hand: 'left', level: 'iniciante' })
  assert.deepEqual([saved.ageRange, saved.hand, saved.level], ['18-59', 'left', 'iniciante'])
  const wrong = writePreferences(storage, { ageRange: '35', hand: 'ambas', level: 'expert' })
  assert.deepEqual([wrong.ageRange, wrong.hand, wrong.level], ['', '', ''])
})

test('a foto só é aceita como JPEG pequeno', async () => {
  const { readPhoto, writePhoto } = await import('../src/preferences.js')
  const storage = { ...memory(), removeItem() {} }
  const data = new Map()
  storage.getItem = key => data.get(key) ?? null
  storage.setItem = (key, value) => data.set(key, value)
  storage.removeItem = key => data.delete(key)
  assert.equal(writePhoto(storage, 'data:image/jpeg;base64,AAAA'), true)
  assert.equal(readPhoto(storage), 'data:image/jpeg;base64,AAAA')
  assert.equal(writePhoto(storage, 'javascript:alert(1)'), false)
  assert.equal(writePhoto(storage, ''), true)
  assert.equal(readPhoto(storage), '')
})
