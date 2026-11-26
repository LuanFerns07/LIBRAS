import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import { test } from 'node:test'
import { withChromium } from './chromium.mjs'

const appUrl = process.env.LIBRASIA_TEST_URL
const enabled = process.env.LIBRASIA_TEST_RECOGNITION === '1'
const videoFile = process.env.LIBRASIA_TEST_VIDEO
const expected = process.env.LIBRASIA_EXPECT_TEXT?.trim()

test('a prévia faz a extração e a decisão no navegador sem transmitir quadros', {
  skip: !appUrl || !enabled,
}, async context => {
  if (videoFile) await access(videoFile)
  if (expected) assert.ok(videoFile, 'Informe o arquivo Y4M rotulado para verificar um sinal positivo.')
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
    await navigate(base.href + '#area-livre')
    await permission(base.origin, 'granted')
    await evaluate('document.querySelector("[data-camera-toggle]").click()', true)
    await waitUntil('document.querySelector("[data-camera-state]").textContent === "Ativa"')
    await evaluate('document.querySelector("[data-attempt]").click()', true)
    await waitUntil('["recording", "unavailable", "capture-error"].includes(document.querySelector("[data-capture-status]").dataset.state)', 25000)
    assert.equal(await evaluate('document.querySelector("[data-capture-status]").dataset.state'), 'recording',
      await evaluate('document.querySelector("[data-capture-status]").textContent'))

    // A câmera roda enquanto a tentativa é delimitada. Deixe o clipe ser capturado antes de finalizar.
    const captureMs = videoFile ? 3850 : 1600
    await evaluate('new Promise(resolve => setTimeout(resolve, ' + captureMs + '))')
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
    const decision = await evaluate('(' + finish + ')()', true)
    assert.equal(decision.state, expected ? 'accepted' : 'inconclusive', decision.message)
    const transcript = await evaluate('document.querySelector("#transcription").value')
    assert.equal(transcript.toLocaleLowerCase('pt-BR'), expected?.toLocaleLowerCase('pt-BR') ?? '')
    assert.ok(decision.elapsedMs > 0, 'A tentativa deve terminar pelo botão para medir a latência.')
    context.diagnostic(decision.message + ' · conclusão até resposta: ' + decision.elapsedMs.toFixed(1) + ' ms')

    for (const path of ['/models/isolated.json', '/models/isolated.onnx', '/runtime/holistic_landmarker.task']) {
      assert.ok(seenAssets.has(path), 'Ativo carregado: ' + path)
    }
    assert.ok(Array.from(seenAssets).some(path => /ort-wasm.*\.wasm$/u.test(path)), 'WebAssembly do ONNX Runtime carregado.')
    assert.deepEqual(otherRequests, [], 'A página deve solicitar apenas arquivos locais.')
  }, { videoFile })
})
