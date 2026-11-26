import assert from 'node:assert/strict'
import test from 'node:test'
import { alphabet, lesson } from '../src/catalog.js'
import { translate } from '../src/translate.js'

const ids = result => result.steps.map(step => step.id)

test('as 26 letras têm identificadores compartilhados pelo alfabeto e pela soletração', () => {
  assert.equal(alphabet.length, 26)
  assert.equal(new Set(alphabet.map(item => item.id)).size, 26)
  assert.deepEqual(ids(translate('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'name')), alphabet.map(item => item.id))
})

test('nomes mantêm repetições e separações, com a letra base de acentos', () => {
  assert.deepEqual(ids(translate('Anna Luís-D’Ávila', 'name')), [
    'letter-a', 'letter-n', 'letter-n', 'letter-a', 'pause',
    'letter-l', 'letter-u', 'letter-i', 'letter-s', 'pause',
    'letter-d', 'pause', 'letter-a', 'letter-v', 'letter-i', 'letter-l', 'letter-a',
  ])
})

test('palavras e a apresentação do nome seguem sequências explícitas', () => {
  for (const signal of lesson) {
    assert.deepEqual(ids(translate(` ${signal.label}! `)), [signal.id])
  }
  assert.deepEqual(ids(translate('MEU NOME É   Léo.')), [
    'signal-meu', 'signal-nome', 'pause', 'letter-l', 'letter-e', 'letter-o',
  ])
})

test('entradas fora do catálogo ou com caracteres não soletráveis têm mensagens', () => {
  assert.equal(translate('   ').state, 'empty')
  assert.equal(translate('Hoje é terça-feira').unsupported, 'Hoje é terça-feira')
  assert.equal(translate('Amarelo', 'name').steps[0].id, 'letter-a')
  assert.equal(translate('Meu nome é Ana2').unsupported, 'Ana2')
  assert.deepEqual(translate('Ana 😀', 'name').steps, [])
})
