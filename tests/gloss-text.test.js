import assert from 'node:assert/strict'
import test from 'node:test'
import { createGlossTranslator, glossTranslatorSchema } from '../src/recognition/gloss-text.js'

const artifact = {
  schema: glossTranslatorSchema,
  parameters: { language: 0, length: 0.45, copy: 3 },
  beam: 6,
  maxPhrase: 3,
  start: '<início>',
  end: '<fim>',
  caseFolding: { ß: 'ss' },
  tables: {
    phrases: { 'ir escola': [10, [['ir à escola', 10]]] },
    left: {}, right: {}, words: {}, totalWords: 0, bigrams: {}, trigrams: {},
  },
}

test('o tradutor monotônico normaliza glosas e emite a sequência aprendida', () => {
  const translate = createGlossTranslator(artifact)
  assert.deepEqual(translate(['IR', 'ESCOLA', '[PONTO]']), ['ir', 'à', 'escola'])
  assert.deepEqual(translate([]), [])
  assert.deepEqual(translate(['AÇAÍ', 'Fuß', 'constructor']), ['açaí', 'fuss', 'constructor'])
})

test('o tradutor rejeita formatos incompatíveis de artefato e de entrada', () => {
  assert.throws(() => createGlossTranslator({ ...artifact, schema: 'desconhecido' }), TypeError)
  assert.throws(() => createGlossTranslator({ ...artifact, tables: null }), TypeError)
  const translate = createGlossTranslator(artifact)
  assert.throws(() => translate('IR'), TypeError)
  assert.throws(() => translate([null]), TypeError)
})
