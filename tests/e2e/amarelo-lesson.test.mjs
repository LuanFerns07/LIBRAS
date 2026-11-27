import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import { test } from 'node:test'
import { withChromium } from './chromium.mjs'
import { beginAtMarker, finish } from './recorded-capture.mjs'

const appUrl = process.env.LIBRASIA_TEST_URL
const videoFile = process.env.LIBRASIA_TEST_AMARELO_LESSON_VIDEO

test('a lição de Amarelo permite corrigir, tentar de memória e retomar a prática', {
  skip: !appUrl || !videoFile,
  timeout: 65000,
}, async context => {
  const url = new URL('/#praticar', appUrl)
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Use a prévia local para testar a câmera.')
  await access(videoFile)

  await withChromium(async ({ page, navigate, evaluate, waitUntil, permission, listen }) => {
    const status = 'document.querySelector("[data-capture-status]")'
    const video = 'document.querySelector("video")'
    const avatar = 'document.querySelector("[data-avatar]").closest(".media-card")'
    const click = selector => evaluate('document.querySelector(' + JSON.stringify(selector) + ').click()', true)
    const waitForRecording = () => waitUntil(status + '.dataset.state === "recording"', 15000)
    const readProgress = () => evaluate('JSON.parse(localStorage.getItem("librasia:progress:v1"))["signal-amarelo"]')
    const readCount = () => evaluate('document.querySelector("progress").value')
    const sameCamera = () => evaluate(video + '.srcObject.getVideoTracks()[0] === window.lessonTrack && window.lessonTrack.readyState === "live"')
    const unexpectedRequests = []
    listen('Network.requestWillBeSent', ({ request }) => {
      const target = new URL(request.url)
      if (['blob:', 'data:'].includes(target.protocol)) return
      if (target.origin !== url.origin || request.method !== 'GET') unexpectedRequests.push(request.url)
    })
    await page('Network.enable')
    await navigate(url.href)

    async function startCamera() {
      await permission(url.origin, 'granted')
      await click('[data-camera-toggle]')
      await waitUntil('document.querySelector("[data-camera-state]").textContent === "Ativa"')
    }

    async function capture(channels, durationMs) {
      const args = JSON.stringify([0, true, channels])
      const { startMs } = await evaluate(`(${beginAtMarker})(...${args})`, true, 25000)
      await waitForRecording()
      const result = await evaluate(`(${finish})(false, ${startMs + durationMs})`, true)
      assert.equal(result.timing?.trigger, 'manual')
      context.diagnostic(result.message + ' · ' + result.timing.classifierCalls + ' chamada(s) ao classificador')
      return result
    }

    await evaluate(`(() => {
      const picker = document.querySelector('[data-signal]')
      picker.value = 'signal-amarelo'
      picker.dispatchEvent(new Event('change'))
    })()`)
    assert.equal(await evaluate('document.querySelector("[data-camera-toggle]").disabled'), true)
    assert.equal(await evaluate('!!document.querySelector("[data-avatar] canvas").getContext("webgl2")'), true)
    await click('[data-quiz] input[value="2"]')
    await click('.practice-activity [type="submit"]')
    assert.equal(await evaluate('document.querySelector("[data-quiz-status]").dataset.state'), 'accepted')
    await click('[data-stage="1"]')
    await startCamera()
    await evaluate('window.lessonTrack = ' + video + '.srcObject.getVideoTracks()[0]')
    await click('[data-attempt]')
    await waitForRecording()
    await evaluate(`(${finish})()`, true)
    const baseline = await readProgress()
    assert.equal(baseline.guided, false, 'O aquecimento deve concluir antes de observar um sinal.')

    const hint = await capture([false, false, true], 3850)
    assert.equal(hint.state, 'hint', hint.message)
    assert.match(hint.message, /Desloque o indicador da testa em direção ao nariz/u)
    assert.equal(hint.timing.classifierCalls, 1)
    assert.deepEqual(await readProgress(), { ...baseline, hints: baseline.hints + 1, retryStreak: baseline.retryStreak + 1 })
    assert.equal(await readCount(), 0)
    assert.equal(await evaluate('document.querySelector("[data-review]").textContent'), 'Revisar Amarelo')

    const blank = await capture([true, false, true], 1600)
    assert.equal(blank.state, 'inconclusive', blank.message)
    assert.equal(blank.reason, 'no-hand')
    assert.equal(blank.timing.classifierCalls, 0)
    assert.deepEqual(await readProgress(), { ...baseline, hints: baseline.hints + 1, retries: baseline.retries + 1, retryStreak: baseline.retryStreak + 2 })

    const guided = await capture([false, true, false], 3850)
    assert.equal(guided.state, 'accepted', guided.message)
    assert.equal(guided.timing.classifierCalls, 1)
    const afterGuidance = {
      ...baseline, guided: true, accepted: baseline.accepted + 1, hints: baseline.hints + 1, retries: baseline.retries + 1, retryStreak: 0,
    }
    assert.deepEqual(await readProgress(), afterGuidance)
    assert.equal(await readCount(), 0)
    await click('[data-stage="2"]')
    assert.equal(await evaluate(avatar + '.hidden'), true)
    assert.equal(await sameCamera(), true)

    const independent = await capture([true, false, false], 3850)
    assert.equal(independent.state, 'accepted', independent.message)
    assert.equal(independent.timing.classifierCalls, 1)
    const completed = { ...afterGuidance, independent: true, accepted: afterGuidance.accepted + 1 }
    assert.deepEqual(await readProgress(), completed)
    assert.equal(await readCount(), 1)

    await click('[data-attempt]')
    await waitForRecording()
    await permission(url.origin, 'denied')
    await waitUntil(status + '.dataset.state === "capture-error" && window.lessonTrack.readyState === "ended"')
    assert.match(await evaluate(status + '.textContent'), /Problema de captura/u)
    assert.equal(await evaluate(status + '.dataset.timing === undefined'), true)
    assert.deepEqual(await readProgress(), completed)
    await startCamera()
    assert.equal(await sameCamera(), false)

    await page('Page.reload')
    await waitUntil('!window.lessonTrack && document.readyState === "complete" && document.querySelector("progress")?.value === 1')
    assert.equal(await evaluate(video + '.srcObject'), null)
    assert.deepEqual(await readProgress(), completed)
    assert.deepEqual(await evaluate('[Object.keys(localStorage), sessionStorage.length]'), [['librasia:progress:v1'], 0])
    assert.deepEqual(unexpectedRequests, [])
  }, { videoFile })
})
