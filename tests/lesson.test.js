import assert from 'node:assert/strict'
import test from 'node:test'
import { lesson, manualAlphabet } from '../src/catalog.js'
import { isComplete, markAttempt, readProgress, reviewOrder, reviewStep, writeProgress } from '../src/progress.js'
import { appendTranscription, freeFeedback, observePalm, observeVerticalTrajectory, practiceFeedback } from '../src/recognition/feedback.js'
import { brazilianVoice, mountSpeech } from '../src/speech.js'
import { letterPracticeFeedback } from '../src/views/practice.js'

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
  const [cinco, espelho, amarelo] = lesson
  assert.equal(practiceFeedback(acceptedCinco, cinco, 1).state, 'accepted')
  assert.equal(practiceFeedback(acceptedCinco, espelho, 1).state, 'inconclusive')
  assert.equal(practiceFeedback({ ...acceptedCinco, palm: 'away' }, cinco, 1).state, 'hint')
  assert.equal(practiceFeedback({ ...acceptedCinco, palm: 'away' }, cinco, 2).state, 'accepted')
  assert.equal(practiceFeedback({ ...acceptedCinco, id: espelho.id }, espelho, 1).state, 'hint')
  assert.equal(practiceFeedback({ state: 'accepted', id: amarelo.id, trajectory: 'upward' }, amarelo, 1).state, 'hint')
  assert.deepEqual(practiceFeedback(inconclusive, cinco, 1), inconclusive)
  const captureError = { state: 'capture-error', message: 'Câmera desligada.' }
  assert.deepEqual(practiceFeedback(captureError, cinco, 1), captureError)
})

test('a trajetória do indicador usa referência ao nariz e requer evidência temporal', () => {
  const frames = Array.from({ length: 6 }, (_, index) => {
    const pose = [{ x: .5, y: .5, visibility: .9 }]
    pose[11] = { x: .7, y: .7 }
    pose[12] = { x: .3, y: .7 }
    const rightHand = []
    rightHand[8] = { x: .5, y: .51 - index * .03 }
    return { pose, rightHand, leftHand: [], aspect: 4 / 3 }
  })
  assert.equal(observeVerticalTrajectory(frames), 'upward')
  assert.equal(observeVerticalTrajectory([...frames].reverse()), 'downward')
  assert.equal(observeVerticalTrajectory(frames.slice(0, 3)), 'uncertain')
})

test('a área livre mantém a edição e acrescenta uma palavra por decisão aceita', () => {
  const result = freeFeedback(acceptedCinco)
  assert.equal(appendTranscription('', result), 'cinco')
  assert.equal(appendTranscription('cinco', result), 'cinco cinco')
  assert.equal(appendTranscription('Cinco. ', freeFeedback({ state: 'accepted', id: 'signal-amarelo' })), 'Cinco. amarelo')
  assert.equal(appendTranscription('texto editado', freeFeedback(inconclusive)), 'texto editado')
  assert.equal(appendTranscription('texto editado', freeFeedback({ state: 'accepted', id: 'fora' })), 'texto editado')
})

test('a área livre preserva a ordem e informa incerteza na sequência', () => {
  const espelho = { state: 'accepted', id: 'signal-espelho' }
  const aluno = { state: 'accepted', id: 'signal-aluno' }
  const amarelo = { state: 'accepted', id: 'signal-amarelo' }
  assert.equal(freeFeedback({ state: 'sequence', segments: [acceptedCinco, espelho] }).text, 'cinco espelhos')
  assert.equal(freeFeedback({ state: 'sequence', segments: [acceptedCinco, aluno] }).text, 'cinco alunos')
  assert.equal(freeFeedback({ state: 'sequence', segments: [acceptedCinco, espelho, amarelo] }).text, 'cinco espelhos amarelos')
  const incomplete = freeFeedback({ state: 'sequence', segments: [espelho, inconclusive, acceptedCinco] })
  assert.equal(incomplete.text, 'espelho cinco')
  assert.match(incomplete.message, /Trechos inconclusivos: 1/)
  assert.equal(freeFeedback({ state: 'sequence', segments: [acceptedCinco, inconclusive, aluno] }).text, 'cinco aluno')
  assert.equal(freeFeedback({ state: 'sequence', segments: [inconclusive] }).state, 'inconclusive')
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

test('uma edição interrompe a leitura e ignora callbacks do texto anterior', () => {
  const status = { dataset: {}, hidden: true }
  let spoken
  class Utterance {
    constructor(text) { this.text = text }
  }
  const synthesis = {
    getVoices: () => [{ lang: 'pt-BR', localService: true }],
    speak(utterance) { spoken = utterance },
    cancel() { spoken.onerror() },
  }
  const speech = mountSpeech(status, synthesis, Utterance)
  speech.speak('Transcrição anterior.')
  const previous = spoken
  speech.textChanged()
  assert.equal(status.dataset.state, 'interrupted')
  speech.speak('Transcrição atualizada.')
  previous.onend()
  assert.equal(status.dataset.state, 'busy')
  assert.equal(spoken.text, 'Transcrição atualizada.')
  spoken.onend()
  assert.equal(status.dataset.state, 'accepted')
  speech.textChanged()
  assert.equal(status.hidden, true)
  assert.equal(status.dataset.state, undefined)
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

test('a revisão abre a primeira etapa pendente do sinal ou da letra', () => {
  const signal = readProgress()['signal-cinco']
  assert.equal(reviewStep(signal), 0)
  signal.observed = true
  signal.understood = true
  assert.equal(reviewStep(signal), 1)
  markAttempt(signal, 1, acceptedCinco)
  assert.equal(reviewStep(signal), 2)
  markAttempt(signal, 2, acceptedCinco)
  assert.equal(reviewStep(signal), 1)
  const letter = readProgress(undefined, 'letter')['letter-a']
  assert.equal(reviewStep(letter, 'letter'), 0)
  letter.observed = true
  assert.equal(reviewStep(letter, 'letter'), 1)
  markAttempt(letter, 1, acceptedCinco)
  assert.equal(reviewStep(letter, 'letter'), 2)
})

test('a prática de letras só aceita uma leitura do modelo compatível com o alvo', () => {
  const [a, b] = manualAlphabet
  const reading = { state: 'accepted', id: a.id, text: a.label, confidence: .96 }
  const accepted = letterPracticeFeedback(reading, a, ['A', 'B'])
  assert.equal(accepted.state, 'accepted')
  assert.equal(accepted.id, a.id)
  assert.equal(accepted.confidence, reading.confidence)
  const mismatch = letterPracticeFeedback(reading, b, ['A', 'B'])
  assert.equal(mismatch.state, 'inconclusive')
  assert.match(mismatch.message, /indicou A/u)
  assert.deepEqual(letterPracticeFeedback(inconclusive, a, ['A']), inconclusive)
  const unsupported = letterPracticeFeedback(reading, a, [])
  assert.equal(unsupported.state, 'unavailable')
  assert.match(unsupported.message, /avatar/u)
  const entry = readProgress(undefined, 'letter')[a.id]
  markAttempt(entry, 1, unsupported)
  assert.equal(entry.accepted + entry.retries, 0)
})

test('A a Z e Ç progridem e entram em revisão sem alterar o progresso antigo de sinais', () => {
  const entries = new Map([['librasia:progress:v1', JSON.stringify({ 'signal-cinco': { accepted: 4, guided: true } })]])
  const storage = { getItem: key => entries.get(key), setItem: (key, value) => entries.set(key, value) }
  const signals = readProgress(storage)
  const letters = readProgress(storage, 'letter')
  assert.deepEqual(manualAlphabet.map(letter => letter.label), Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZÇ'))
  assert.deepEqual(Object.keys(letters), manualAlphabet.map(letter => letter.id))

  const letterA = letters['letter-a']
  letterA.observed = true
  assert.equal(reviewOrder(letters, 'letter')[0].id, 'letter-b')
  markAttempt(letterA, 1, { state: 'accepted' })
  markAttempt(letterA, 2, { state: 'accepted' })
  assert.equal(isComplete(letterA, 'letter'), true)
  writeProgress(storage, letters, 'letter')
  assert.deepEqual(readProgress(storage, 'letter'), letters)
  assert.deepEqual(readProgress(storage), signals)
})
