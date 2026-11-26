import { alphabet, lesson, namePrefix, spellingPause } from './catalog.js'

const letters = new Map(alphabet.map(item => [item.label, item]))
const words = new Map(lesson.map(item => [item.text, item]))

function unaccent(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '')
}

function spellName(text) {
  const normalized = unaccent(text).toUpperCase().trim()
  if (!/^[A-Z]+(?:[\s'’\-]+[A-Z]+)*$/u.test(normalized)) {
    return { state: 'unsupported', unsupported: text, steps: [], message: 'Use letras A a Z, espaços, hífens ou apóstrofos para soletrar um nome.' }
  }
  const steps = []
  for (const part of normalized.split(/[\s'’\-]+/u)) {
    if (steps.length) steps.push(spellingPause)
    steps.push(...Array.from(part, letter => letters.get(letter)))
  }
  return {
    state: 'ready',
    steps,
    message: 'Soletração pelo alfabeto manual. Letras acentuadas usam a letra base.',
  }
}

export function translate(input, mode = 'text') {
  const text = input.trim().replace(/\s+/gu, ' ')
  if (!text) return { state: 'empty', steps: [], message: 'Digite uma palavra, uma frase ou um nome.' }
  if (mode === 'name') return spellName(text)

  const word = text.replace(/[.!?]+$/u, '').toLocaleLowerCase('pt-BR')
  if (words.has(word)) {
    return { state: 'ready', steps: [words.get(word)], message: 'Palavra do catálogo do protótipo.' }
  }
  const name = /^meu nome (?:é|e) (.+?)[.!?]*$/iu.exec(text)?.[1]
  if (name) {
    const result = spellName(name)
    if (result.state !== 'ready') return result
    return {
      ...result,
      steps: [...namePrefix, spellingPause, ...result.steps],
      message: 'A frase apresenta a sequência NOME MEU e a soletração do nome.',
    }
  }
  return {
    state: 'unsupported',
    steps: [],
    unsupported: text,
    message: 'Este trecho está fora do catálogo. Para um nome, selecione Soletrar como nome.',
  }
}
