import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import { test } from 'node:test'
import { withChromium } from './chromium.mjs'

const appUrl = process.env.LIBRASIA_TEST_URL
const enabled = process.env.LIBRASIA_TEST_RECOGNITION === '1'
const videoFile = process.env.LIBRASIA_TEST_VIDEO
const expected = process.env.LIBRASIA_EXPECT_TEXT?.trim()
const multiple = process.env.LIBRASIA_TEST_SEQUENCE === '1'
const sync = multiple || process.env.LIBRASIA_TEST_SYNC === '1'
const target = process.env.LIBRASIA_TEST_TARGET?.trim()
const trials = Number(process.env.LIBRASIA_TEST_TRIALS || 1)

const finish = (() => new Promise(resolve => {
  const status = document.querySelector('[data-capture-status]')
  const start = performance.now()
  const observer = new MutationObserver(() => {
    if (['busy', 'recording'].includes(status.dataset.state)) return
    observer.disconnect()
    resolve({ state: status.dataset.state, elapsedMs: performance.now() - start, message: status.textContent })
  })
  observer.observe(status, { attributes: true, attributeFilter: ['data-state'] })
  if (status.dataset.state !== 'recording') {
    observer.disconnect()
    resolve({ state: status.dataset.state, elapsedMs: 0, message: status.textContent })
    return
  }
  document.querySelector('[data-attempt]').click()
})).toString()

const beginAtGreenMarker = (() => new Promise(resolve => {
  const video = document.querySelector('video')
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 2
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  function checkFrame() {
    ctx.drawImage(video, 0, 0, 2, 2)
    const [red, green, blue] = ctx.getImageData(0, 0, 1, 1).data
    if (green > 170 && red < 35 && blue < 35) {
      document.querySelector('[data-attempt]').click()
      resolve()
    } else video.requestVideoFrameCallback(checkFrame)
  }
  video.requestVideoFrameCallback(checkFrame)
})).toString()

test('a prévia faz a extração e a decisão no navegador sem transmitir quadros', {
  skip: !appUrl || !enabled,
}, async context => {
  if (videoFile) await access(videoFile)
  if (expected) assert.ok(videoFile, 'Informe o arquivo Y4M rotulado para verificar um sinal positivo.')
  if (sync) assert.ok(videoFile, 'A sincronização usa um Y4M com marcador inicial verde.')
  if (multiple) assert.ok(expected && !target, 'O teste da sequência usa o texto esperado na área livre.')
  if (target) assert.ok(/^signal-[a-z-]+$/u.test(target), 'Informe o identificador do sinal usado na lição.')
  assert.ok(Number.isInteger(trials) && trials >= 1 && trials <= 30, 'Informe de 1 a 30 tentativas.')
  if (trials > 1 && videoFile) assert.ok(sync, 'Use o marcador de sincronização para repetir um clipe.')
  const base = new URL('/', appUrl)
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Use uma prévia local em loopback para este teste de vídeo.')
  const otherRequests = []
  const seenAssets = new Set()
  await withChromium(async ({ page, evaluate, waitUntil, navigate, permission, listen }) => {
    listen('Network.requestWillBeSent', ({ request }) => {
      const url = new URL(request.url)
      if (url.protocol === 'blob:' || url.protocol === 'data:') return
      if (url.origin !== base.origin || request.method !== 'GET') otherRequests.push([request.method, url.origin])
      seenAssets.add(url.pathname)
    })
    await page('Network.enable')
    await navigate(base.href + (target ? '#praticar' : '#area-livre'))
    if (target) {
      const select = '(id => { const field = document.querySelector("[data-signal]"); field.value = id; field.dispatchEvent(new Event("change")); })'
      await evaluate(select + '(' + JSON.stringify(target) + ')')
      await evaluate('document.querySelector(' + JSON.stringify('[data-stage="1"]') + ').click()', true)
      assert.equal(await evaluate('!!document.querySelector("[data-avatar] canvas").getContext("webgl2")'), true)
    }
    await permission(base.origin, 'granted')
    await evaluate('document.querySelector("[data-camera-toggle]").click()', true)
    await waitUntil('document.querySelector("[data-camera-state]").textContent === "Ativa"')
    const record = async () => {
      await waitUntil('["recording", "unavailable", "capture-error"].includes(document.querySelector("[data-capture-status]").dataset.state)', 25000)
      assert.equal(await evaluate('document.querySelector("[data-capture-status]").dataset.state'), 'recording',
        await evaluate('document.querySelector("[data-capture-status]").textContent'))
    }
    const startAttempt = () => evaluate('document.querySelector("[data-attempt]").click()', true)
    await startAttempt()
    await record()

    if (sync) {
      // A primeira tentativa carrega o extrator e o classificador. A avaliação começa no marcador do clipe.
      await evaluate('(' + finish + ')()', true)
      if (!target) await evaluate('document.querySelector("[data-clear]").click()', true)
      if (multiple) await evaluate('document.querySelector("[data-sequence-mode]").click()', true)
    }

    const captureMs = multiple ? 10300 : videoFile ? 3850 : 1600
    const decisions = []
    for (let trial = 0; trial < trials; trial += 1) {
      if (sync) {
        await evaluate('(' + beginAtGreenMarker + ')()', true)
        await record()
      } else if (trial > 0) {
        await startAttempt()
        await record()
      }
      await evaluate('new Promise(resolve => setTimeout(resolve, ' + captureMs + '))')
      if (target) await evaluate('document.querySelector("[data-restart]").click()', true)
      const decision = await evaluate('(' + finish + ')()', true)
      const transcript = target ? null : await evaluate('document.querySelector("#transcription").value')
      decisions.push({ ...decision, transcript })
      context.diagnostic('Tentativa ' + (trial + 1) + '/' + trials + ' · ' + decision.message +
        ' · conclusão até resposta: ' + decision.elapsedMs.toFixed(1) + ' ms')
    }

    const times = decisions.map(({ elapsedMs }) => elapsedMs).filter(elapsedMs => elapsedMs > 0).sort((a, b) => a - b)
    if (times.length) {
      const middle = times.length >> 1
      const median = times.length % 2 ? times[middle] : (times[middle - 1] + times[middle]) / 2
      const p95 = times[Math.ceil(times.length * .95) - 1]
      context.diagnostic('Latência de ' + times.length + '/' + trials + ' tentativas manuais · mediana ' +
        median.toFixed(1) + ' ms e p95 ' + p95.toFixed(1) + ' ms (posto mais próximo).')
    }
    for (const [index, decision] of decisions.entries()) {
      assert.ok(decision.elapsedMs > 0, 'A tentativa deve terminar pelo botão para medir a latência.')
      assert.equal(decision.state, expected ? 'accepted' : 'inconclusive', decision.message)
      if (!target) {
        const expectedTranscript = expected ? Array(index + 1).fill(expected.toLocaleLowerCase('pt-BR')).join(' ') : ''
        assert.equal(decision.transcript.toLocaleLowerCase('pt-BR'), expectedTranscript)
      }
    }

    for (const path of ['/models/isolated.json', '/models/isolated.onnx', '/runtime/holistic_landmarker.task']) {
      assert.ok(seenAssets.has(path), 'Ativo carregado: ' + path)
    }
    assert.ok(Array.from(seenAssets).some(path => /ort-wasm.*\.wasm$/u.test(path)), 'WebAssembly do ONNX Runtime carregado.')
    assert.deepEqual(otherRequests, [], 'A página deve solicitar apenas arquivos locais.')
  }, { videoFile })
})
