import assert from 'node:assert/strict'
import { test } from 'node:test'
import { withChromium } from './chromium.mjs'

const appUrl = process.env.LIBRASIA_TEST_URL
const videoFile = process.env.LIBRASIA_TEST_STALL_VIDEO

function installStallFixture() {
  const mediaDevices = navigator.mediaDevices
  const getUserMedia = mediaDevices.getUserMedia.bind(mediaDevices)
  mediaDevices.getUserMedia = async options => {
    const source = await getUserMedia(options)
    const video = document.createElement('video')
    video.muted = true
    video.srcObject = source
    await video.play()
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    const stream = canvas.captureStream(0)
    const track = stream.getVideoTracks()[0]
    const fixture = { frozen: false, sent: 0, track }
    window.stallFixture = fixture

    function sendFrame() {
      if (track.readyState === 'ended') {
        source.getTracks().forEach(item => item.stop())
        video.srcObject = null
        return
      }
      if (!fixture.frozen) {
        track.requestFrame()
        context.drawImage(video, 0, 0)
        fixture.sent += 1
      }
      video.requestVideoFrameCallback(sendFrame)
    }
    video.requestVideoFrameCallback(sendFrame)
    return stream
  }
}

test('a prática apaga os pontos e cancela a tentativa ao parar de receber vídeo', {
  skip: !appUrl || !videoFile,
  timeout: 45000,
}, async () => {
  const url = new URL('/#praticar', appUrl)
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
  await withChromium(async ({ navigate, evaluate, permission, waitUntil }) => {
    const camera = 'document.querySelector("[data-camera-state]").textContent'
    const status = 'document.querySelector("[data-capture-status]")'
    const click = selector => evaluate('document.querySelector(' + JSON.stringify(selector) + ').click()', true)
    const painted = `(() => {
      const canvas = document.querySelector('[data-hand-overlay]')
      const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
      return new Uint32Array(data.buffer).some(pixel => pixel !== 0)
    })()`
    await navigate(url.href)
    await evaluate('(' + installStallFixture + ')()')
    await permission(url.origin, 'granted')
    await evaluate(`(() => {
      const picker = document.querySelector('[data-signal]')
      picker.value = 'signal-amarelo'
      picker.dispatchEvent(new Event('change'))
    })()`)
    await click('[data-stage="1"]')
    await click('[data-camera-toggle]')
    await waitUntil(camera + ' === "Ativa"')
    await waitUntil(painted, 12000)
    await evaluate('window.firstTrack = window.stallFixture.track')

    const freeze = () => evaluate('window.stallFixture.frozen = true; window.stallFixture.sent')
    const before = await freeze()
    await waitUntil('!' + painted, 2500)
    assert.equal(await evaluate('window.stallFixture.sent'), before)
    assert.equal(await evaluate('window.stallFixture.track.readyState'), 'live')
    await evaluate('window.stallFixture.frozen = false')
    await waitUntil(painted, 12000)
    assert.equal(await evaluate('document.querySelector("video").srcObject.getVideoTracks()[0] === window.firstTrack'), true)

    await click('[data-attempt]')
    await waitUntil(status + '.dataset.state === "recording"', 8000)
    const recording = await evaluate('window.stallFixture.sent')
    await waitUntil('window.stallFixture.sent >= ' + (recording + 20))
    await freeze()
    await waitUntil(status + '.dataset.state === "capture-error"', 2500)
    assert.match(await evaluate(status + '.textContent'), /Problema de captura.*interrompida/u)
    assert.equal(await evaluate(status + '.dataset.timing'), undefined)
    assert.equal(await evaluate('window.stallFixture.track.readyState'), 'ended')
    assert.equal(await evaluate(painted), false)

    await click('[data-camera-toggle]')
    await waitUntil(camera + ' === "Ativa"')
    await waitUntil(painted, 12000)
    assert.equal(await evaluate('window.stallFixture.track !== window.firstTrack'), true)
    await click('[data-page="saiba-mais"]')
    await waitUntil('location.hash === "#saiba-mais" && window.stallFixture.track.readyState === "ended"')
  }, { videoFile })
})
