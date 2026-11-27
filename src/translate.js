import { alphabet, cedilla, greeting, lesson, namePrefix, spellingPause, student } from './catalog.js'

const letters = new Map([...alphabet, cedilla].map(item => [item.label, item]))
const words = new Map([...lesson, student].map(item => [item.text, item]))

function unaccent(text) {
  return text.normalize('NFD').replace(/[cC]\u0327/gu, 'Ç').replace(/\p{M}/gu, '')
}

function spellName(text) {
  const plain = unaccent(text).replace(/[\u2010\u2011]/gu, '-').trim()
  if (!/^[A-Za-zÇ]+(?:[\s'’\-]+[A-Za-zÇ]+)*$/u.test(plain)) {
    return { state: 'unsupported', unsupported: text, steps: [], message: 'Use as letras do alfabeto português, espaços, hífens ou apóstrofos para soletrar um nome.' }
  }
  const steps = []
  for (const part of plain.toUpperCase().split(/[\s'’\-]+/u)) {
    if (steps.length) steps.push(spellingPause)
    steps.push(...Array.from(part, letter => letters.get(letter)))
  }
  return {
    state: 'ready',
    steps,
    message: 'A soletração apresenta a cedilha e usa a letra base para os demais acentos.',
  }
}

export function translate(input, mode = 'text') {
  const text = input.normalize('NFC').trim().replace(/\s+/gu, ' ')
  if (!text) return { state: 'empty', steps: [], message: 'Digite uma palavra, uma frase ou um nome.' }
  if (mode === 'name') return spellName(text)

  const word = text.replace(/[.!?]+$/u, '').toLocaleLowerCase('pt-BR')
  if (words.has(word)) {
    return { state: 'ready', steps: [words.get(word)], message: 'Palavra do catálogo do protótipo.' }
  }
  if (word === 'bom dia') {
    return { state: 'ready', steps: greeting, message: 'A frase apresenta a sequência BOM DIA.' }
  }
  const introduction = /^(?:(bom dia)\s*[,!.?]+\s*)?meu nome (?:é|e) (.+?)[.!?]*$/iu.exec(text)
  if (introduction) {
    const [, greeted, name] = introduction
    const result = spellName(name)
    if (result.state !== 'ready') return result
    const prefix = greeted ? [...greeting, spellingPause, ...namePrefix] : namePrefix
    return {
      ...result,
      steps: [...prefix, spellingPause, ...result.steps],
      message: greeted ? 'A sequência apresenta BOM DIA, NOME MEU e a soletração do nome.'
        : 'A frase apresenta a sequência NOME MEU e a soletração do nome.',
    }
  }
  return {
    state: 'unsupported',
    steps: [],
    unsupported: text,
    message: 'Este trecho está fora do catálogo. Para um nome, selecione Soletrar como nome.',
  }
}
