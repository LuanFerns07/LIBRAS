import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addAttempt, createSession, exportMetadata, setCheckpoint, summarize } from '../qa/registro.js'

const time = new Date('2026-11-26T19:00:00Z')
const setup = {
  sessionId: 'S01', participantId: 'P01', reviewerId: 'R01',
  outsideTraining: 'yes', reviewerProfile: 'fluent', reviewerIndependent: 'yes', consent: true,
  commit: 'deadbeef', modelSha256: 'a'.repeat(64), manifestSha256: 'b'.repeat(64),
  catalog: 'catalogo-teste', avatar: 'avatar-teste',
  system: 'Debian 13', browser: 'Chromium 156', cpu: 'Processador de teste', gpu: 'GPU de teste',
  camera: 'Webcam de teste', cameraWidth: '640', cameraHeight: '480', sampleIntervalMs: '100',
}
const observed = {
  flow: 'guided', target: 'cinco', condition: 'expected', hand: 'right', lighting: 'regular', framing: 'adequate',
  referenceLabel: 'cinco', referenceParameter: 'none', feedbackVerdict: 'not-assessed',
  decision: 'accepted', prediction: 'espelho', shownParameter: 'none',
  voiceStatus: 'not-run', audibility: 'not-checked', editedTextMatch: 'not-checked',
}

test('a sessão conserva pseudônimos e versão do modelo e deixa etapas pendentes', () => {
  const session = createSession({ ...setup, frames: [1, 2], participantName: 'Ignorado' }, time)
  assert.equal(session.startedAt, time.toISOString())
  assert.equal(session.source, 'live-manual-observation')
  assert.deepEqual(session.participant, { id: 'P01', outsideTraining: 'yes', consent: true })
  assert.deepEqual(session.reviewer, { id: 'R01', profile: 'fluent', independent: 'yes' })
  assert.equal(session.version.modelSha256, 'a'.repeat(64))
  assert.equal(session.version.manifestSha256, 'b'.repeat(64))
  assert.equal(session.environment.sampleIntervalMs, 100)
  assert.ok(Object.values(session.checkpoints).every(value => value === 'pending'))
  assert.equal('frames' in session, false)
  assert.equal('participantName' in session, false)
})

test('consentimento, pseudônimo, ambiente e hashes são verificados', () => {
  assert.throws(() => createSession({ ...setup, consent: false }), /consentimento/u)
  assert.throws(() => createSession({ ...setup, participantId: 'Nome de participante' }), /identificador/u)
  assert.throws(() => createSession({ ...setup, modelSha256: '123' }), /SHA-256/u)
  assert.throws(() => createSession({ ...setup, manifestSha256: '123' }), /manifesto/u)
  assert.throws(() => createSession({ ...setup, cameraWidth: '0' }), /largura/u)
  assert.throws(() => createSession({ ...setup, reviewerIndependent: '' }), /independência/u)
})

test('a referência humana e a classificação divergente permanecem registradas', () => {
  const session = createSession(setup, time)
  const attempt = addAttempt(session, { ...observed, latencyMs: '13.8', latencyMethod: 'instrumented' }, time)
  assert.equal(attempt.reference.label, 'cinco')
  assert.equal(attempt.application.prediction, 'espelho')
  assert.deepEqual(attempt.application.latency, { milliseconds: 13.8, method: 'instrumented' })
  assert.throws(() => addAttempt(session, { ...observed, prediction: '' }), /palavra exibida/u)
  assert.throws(() => addAttempt(session, { ...observed, flow: 'free' }), /sinal escolhido/u)
  assert.throws(() => addAttempt(session, { ...observed, latencyMs: '0' }), /método/u)
  assert.equal(session.attempts.length, 1)
})

test('a ficha importa a medição da tentativa e conserva a origem da conclusão', () => {
  const session = createSession(setup, time)
  const capture = { trigger: 'manual', decisionMs: 13.8, initialLoadMs: 300, extractionMs: [16.5, 17], classifierCalls: 1 }
  const { application } = addAttempt(session, {
    ...observed, captureTiming: JSON.stringify({ ...capture, image: 'Ignorada' }),
  }, time)
  assert.deepEqual(application.captureTiming, capture)
  assert.deepEqual(application.latency, { milliseconds: 13.8, method: 'instrumented' })
  assert.equal(application.classifierCalls, 1)
  const auto = addAttempt(session, {
    ...observed, captureTiming: JSON.stringify({ ...capture, trigger: 'time-limit', initialLoadMs: null }),
  }, time)
  assert.equal(auto.application.latency, null)
  assert.equal(auto.application.captureTiming.initialLoadMs, null)
  for (const captureTiming of ['incompleto', 'null', JSON.stringify({ ...capture, extractionMs: [-1] })]) {
    assert.throws(() => addAttempt(session, { ...observed, captureTiming }), /JSON da medição/u)
  }
})

test('uma dica conserva o parâmetro humano, o assunto exibido e o desacordo', () => {
  const session = createSession(setup, time)
  const attempt = addAttempt(session, {
    ...observed, condition: 'intentional-adjustment', decision: 'hint', prediction: null,
    referenceParameter: 'palm', shownParameter: 'trajectory', feedbackVerdict: 'inappropriate',
  }, time)
  assert.equal(attempt.application.prediction, null)
  assert.equal(attempt.application.shownParameter, 'trajectory')
  assert.equal(attempt.reference.parameter, 'palm')
  assert.equal(attempt.reference.feedbackVerdict, 'inappropriate')
  assert.throws(() => addAttempt(session, { ...observed, decision: 'hint', prediction: null }), /assunto/u)
  assert.throws(() => addAttempt(session, {
    ...observed, referenceParameter: 'not-observed', feedbackVerdict: 'appropriate',
  }), /referência humana/u)
})

test('o estado de voz exibido fica separado da audibilidade e da confirmação humana', () => {
  const session = createSession(setup, time)
  const attempt = addAttempt(session, {
    ...observed, voiceStatus: 'completed', audibility: 'inaudible', editedTextMatch: 'not-checked',
  }, time)
  assert.deepEqual(attempt.voice, {
    applicationStatus: 'completed', humanAudibility: 'inaudible', editedTextMatch: 'not-checked',
  })
  assert.throws(() => addAttempt(session, { ...observed, audibility: 'intelligible' }), /estado de voz/u)
  assert.throws(() => addAttempt(session, { ...observed, editedTextMatch: 'matches' }), /audição/u)
  assert.throws(() => addAttempt(session, {
    ...observed, voiceStatus: 'completed', audibility: 'unintelligible', editedTextMatch: 'matches',
  }), /compreendido/u)
})

test('o JSON agrupa estratos observados e preserva etapas pendentes sem conteúdo de mídia', () => {
  const session = createSession(setup, time)
  addAttempt(session, { ...observed, text: 'Ignorado', video: [1, 2], image: 'Ignorada' }, time)
  addAttempt(session, {
    ...observed, flow: 'free', target: null, condition: 'no-hand', referenceLabel: 'none',
    decision: 'inconclusive', prediction: null, classifierCalls: '0',
  }, time)
  setCheckpoint(session, 'letter', 'passed')
  assert.throws(() => setCheckpoint(session, 'outra', 'passed'), /Etapa/u)
  assert.throws(() => setCheckpoint(session, 'letter', 'invented'), /resultado/u)
  const summary = summarize(session)
  assert.equal(summary.attempts, 2)
  assert.equal(summary.byCondition.expected, 1)
  assert.equal(summary.byCondition['no-hand'], 1)
  assert.equal(summary.byCondition['out-of-catalog'], 0)
  const json = exportMetadata(session, time)
  assert.doesNotMatch(json, /Ignorad|video|image/u)
  const exported = JSON.parse(json)
  assert.deepEqual(exported.summary, summary)
  assert.deepEqual(exported.attempts.map(attempt => attempt.number), [1, 2])
  assert.deepEqual(exported.attempts.map(attempt => attempt.application.classifierCalls), [null, 0])
  assert.throws(() => addAttempt(session, { ...observed, classifierCalls: '1.5' }), /chamadas ao classificador/u)
  assert.equal(exported.checkpoints.letter, 'passed')
  assert.equal(exported.checkpoints.exercise, 'pending')
  assert.equal(exported.exportedAt, time.toISOString())
})
