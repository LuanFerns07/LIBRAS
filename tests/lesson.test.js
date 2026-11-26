import assert from 'node:assert/strict'
import test from 'node:test'
import { lesson } from '../src/catalog.js'
import { markAttempt, readProgress, reviewOrder, writeProgress } from '../src/progress.js'
import { appendTranscription, freeFeedback, observePalm, practiceFeedback } from '../src/recognition/feedback.js'
import { brazilianVoice, mountSpeech } from '../src/speech.js'

const acceptedCinco = { state: 'accepted', id: 'signal-cinco', palm: 'front' }
const inconclusive = { state: 'inconclusive', message: 'Pouca evidência.' }

test('uma observação da palma requer quadros suficientes e orientação consistente', () => {
  const wrist = { x: .5, y: .65, z: 0 }
  const makeFrame = mirror => {
    const rightHand = Array.from({ length: 21 }, () => wrist)
    rightHand[5] = { x: .5 + .065 * mirror, y: .52, z: 0 }
    rightHand[17] = { x: .5 - .065 * mirror, y: .53, z: 0 }
    return { rightHand, leftHand: [] }
  }
  const front = makeFrame(1)
  const back = makeFrame(-1)
  assert.equal(observePalm(Array(6).fill(front)), 'front')
  assert.equal(observePalm(Array(6).fill(back)), 'away')
  assert.equal(observePalm([front, back, front, back, front, back]), 'uncertain')
  assert.equal(observePalm([front]), 'uncertain')
})

test('a prática distingue reconhecimento, dica, incerteza e falhas', () => {
  const [cinco, espelho] = lesson
  assert.equal(practiceFeedback(acceptedCinco, cinco, 1).state, 'accepted')
  assert.equal(practiceFeedback(acceptedCinco, espelho, 1).state, 'inconclusive')
  assert.equal(practiceFeedback({ ...acceptedCinco, palm: 'away' }, cinco, 1).state, 'hint')
  assert.equal(practiceFeedback({ ...acceptedCinco, palm: 'away' }, cinco, 2).state, 'accepted')
  assert.deepEqual(practiceFeedback(inconclusive, cinco, 1), inconclusive)
  const captureError = { state: 'capture-error', message: 'Câmera desligada.' }
  assert.deepEqual(practiceFeedback(captureError, cinco, 1), captureError)
})

test('a área livre mantém a edição e acrescenta uma palavra por decisão aceita', () => {
  const result = freeFeedback(acceptedCinco)
  assert.equal(appendTranscription('', result), 'cinco')
  assert.equal(appendTranscription('cinco', result), 'cinco cinco')
  assert.equal(appendTranscription('Cinco. ', freeFeedback({ state: 'accepted', id: 'signal-amarelo' })), 'Cinco. amarelo')
  assert.equal(appendTranscription('texto editado', freeFeedback(inconclusive)), 'texto editado')
  assert.equal(appendTranscription('texto editado', freeFeedback({ state: 'accepted', id: 'fora' })), 'texto editado')
})

test('apenas a voz pt-BR local lê a edição atual e a falha mantém a mensagem visível', () => {
  const local = { lang: 'pt_BR', localService: true }
  const voices = [{ lang: 'pt-BR', localService: false }, { lang: 'pt-PT', localService: true }, local]
  const status = { dataset: {}, hidden: true }
  const spoken = []
  class Utterance {
    constructor(text) { this.text = text }
  }
  const synthesis = { getVoices: () => voices, speak: value => spoken.push(value), cancel() {} }
  const speech = mountSpeech(status, synthesis, Utterance)
  assert.equal(brazilianVoice(voices), local)
  speech.speak('Cinco espelhos amarelos.')
  assert.equal(spoken[0].text, 'Cinco espelhos amarelos.')
  assert.equal(spoken[0].voice, local)
  spoken[0].onerror()
  assert.equal(status.dataset.state, 'unavailable')
  assert.equal(status.hidden, false)
  voices.pop()
  speech.speak('Uma edição.')
  assert.equal(spoken.length, 1)
  assert.match(status.textContent, /voz local/)
})

test('o progresso local persiste somente os contadores e estados do catálogo', () => {
  const entries = new Map()
  const storage = { getItem: key => entries.get(key), setItem: (key, value) => entries.set(key, value) }
  const progress = readProgress(storage)
  const entry = progress['signal-cinco']
  markAttempt(entry, 1, inconclusive)
  markAttempt(entry, 2, acceptedCinco)
  entry.observed = true
  writeProgress(storage, progress)
  assert.deepEqual(readProgress(storage), progress)
  assert.equal(entry.retries, 1)
  assert.equal(entry.accepted, 1)
  assert.equal(entry.independent, true)
  assert.equal(entry.guided, false)
})

test('a revisão prioriza tentativas pendentes e atualiza a sugestão após acerto', () => {
  const progress = readProgress()
  const [cinco, espelho] = lesson
  markAttempt(progress[espelho.id], 1, inconclusive)
  markAttempt(progress[espelho.id], 1, inconclusive)
  markAttempt(progress[cinco.id], 1, inconclusive)
  assert.equal(reviewOrder(progress)[0], espelho)
  markAttempt(progress[espelho.id], 1, { state: 'accepted' })
  assert.equal(reviewOrder(progress)[0], cinco)
})
