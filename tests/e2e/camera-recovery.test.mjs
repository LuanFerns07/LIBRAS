import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import { test } from 'node:test'
import { withChromium } from './chromium.mjs'
import { beginAtMarker, finish } from './recorded-capture.mjs'

const enabled = process.env.LIBRASIA_TEST_CAMERA_RECOVERY === '1'
const appUrl = process.env.LIBRASIA_TEST_URL
const physical = process.env.LIBRASIA_TEST_PHYSICAL === '1'
const videoFile = process.env.LIBRASIA_TEST_VIDEO

test('revogar a câmera durante uma tentativa cancela a captura e permite retomá-la', {
  skip: !enabled || !appUrl,
  timeout: 70000,
}, async context => {
  const url = new URL('/#area-livre', appUrl)
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Use a prévia local para testar a câmera.')
  assert.ok(!(physical && videoFile), 'Escolha a webcam física ou a gravação.')
  if (videoFile) await access(videoFile)

  await withChromium(async ({ permission, evaluate, navigate, waitUntil, page }) => {
    const status = 'document.querySelector("[data-capture-status]")'
    const video = 'document.querySelector("video")'
    const transcription = 'document.querySelector("#transcription")'
    const prefix = 'Texto conferido.'
    const click = selector => evaluate('document.querySelector(' + JSON.stringify(selector) + ').click()', true)
    const toggleCamera = () => click('[data-camera-toggle]')
    const waitForRecording = () => waitUntil(status + '.dataset.state === "recording"', 15000)
    const waitForCamera = () => waitUntil('document.querySelector("[data-camera-state]").textContent === "Ativa"')

    await navigate(url.href)
    await permission(url.origin, 'granted')
    await evaluate(transcription + '.focus()')
    await page('Input.insertText', { text: prefix })
    await toggleCamera()
    await waitForCamera()
    const device = await evaluate(`(() => {
      window.interruptedTrack = ${video}.srcObject.getVideoTracks()[0]
      const { width, height } = window.interruptedTrack.getSettings()
      return { label: window.interruptedTrack.label, width, height }
    })()`)
    await click('[data-attempt]')
    await waitForRecording()
    await permission(url.origin, 'denied')
    await waitUntil(status + '.dataset.state === "capture-error" && window.interruptedTrack.readyState === "ended"')
    assert.match(await evaluate(status + '.textContent'), /Problema de captura.*interrompida/u)
    assert.equal(await evaluate(video + '.srcObject'), null)
    assert.equal(await evaluate(transcription + '.value'), prefix)
    assert.equal(await evaluate('document.querySelector("[data-attempt]").disabled'), true)
    assert.equal(await evaluate(status + '.dataset.timing === undefined'), true)

    await toggleCamera()
    await waitUntil(status + '.dataset.state === "capture-error" && ' + status + '.textContent.includes("bloqueada")')
    assert.equal(await evaluate(video + '.srcObject'), null)
    await permission(url.origin, 'granted')
    await toggleCamera()
    await waitForCamera()
    assert.equal(await evaluate(`(() => {
      window.recoveredTrack = ${video}.srcObject.getVideoTracks()[0]
      return window.recoveredTrack !== window.interruptedTrack && window.recoveredTrack.readyState === 'live'
    })()`), true)
    await click('[data-attempt]')
    await waitForRecording()
    assert.equal(await evaluate(transcription + '.value'), prefix)

    if (videoFile) {
      await evaluate('(' + finish + ')()', true)
      assert.equal(await evaluate(transcription + '.value'), prefix)
      const marker = await evaluate('(' + beginAtMarker + ')(0, true, [false, true, false])', true, 15000)
      await waitForRecording()
      const decision = await evaluate('(' + finish + ')(false, ' + (marker.startMs + 3850) + ')', true)
      assert.equal(decision.state, 'accepted', decision.message)
      assert.equal(decision.timing.classifierCalls, 1)
      assert.equal(await evaluate(transcription + '.value'), prefix + ' cinco')
      context.diagnostic('Cinco foi reconhecido e acrescentado uma vez depois da retomada.')
    }

    await click('[data-page="saiba-mais"]')
    await waitUntil('location.hash === "#saiba-mais" && window.recoveredTrack.readyState === "ended"')
    context.diagnostic(`${device.label} · ${device.width}×${device.height} · revogação, nova trilha e liberação na saída.`)
  }, { fakeCamera: !physical, videoFile })
})
