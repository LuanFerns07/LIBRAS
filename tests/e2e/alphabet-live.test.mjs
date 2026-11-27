import assert from 'node:assert/strict'
import { test } from 'node:test'
import { withChromium } from './chromium.mjs'

const appUrl = process.env.LIBRASIA_TEST_URL
const videoFile = process.env.LIBRASIA_TEST_LETTER_VIDEO
const letter = process.env.LIBRASIA_TEST_EXPECT_LETTER || 'B'

test('a Área livre lê uma letra ao vivo sem iniciar uma tentativa', {
  skip: !appUrl || !videoFile,
  timeout: 35_000,
}, async () => {
  const url = new URL('/#area-livre', appUrl)
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
  await withChromium(async ({ navigate, evaluate, permission, waitUntil }) => {
    await navigate(url.href)
    await permission(url.origin, 'granted')
    await evaluate(`(() => {
      const mode = document.querySelector('[data-free-mode]')
      mode.value = 'letter'
      mode.dispatchEvent(new Event('change'))
      document.querySelector('[data-hand-points]').click()
      document.querySelector('[data-camera-toggle]').click()
    })()`, true)
    const live = 'document.querySelector("[data-live-character]").textContent'
    await waitUntil(`${live} === ${JSON.stringify(letter)}`, 18_000)
    assert.deepEqual(await evaluate(`(() => {
      const video = document.querySelector('video')
      const output = document.querySelector('[data-live-letter]')
      window.cameraTrack = video.srcObject.getVideoTracks()[0]
      return {
        beside: output.getBoundingClientRect().left >= video.getBoundingClientRect().right - 1,
        attemptHidden: document.querySelector('[data-attempt]').hidden,
        pointsHidden: document.querySelector('[data-hand-overlay]').hidden,
        written: document.querySelector('#transcription').value,
      }
    })()`), { beside: true, attemptHidden: true, pointsHidden: true, written: '' })
    await evaluate('document.querySelector("[data-add-letter]").click()', true)
    assert.equal(await evaluate('document.querySelector("#transcription").value'), letter)
    await waitUntil(`${live} === '—'`, 8000)
    await evaluate('document.querySelector("[data-page=saiba-mais]").click()', true)
    await waitUntil('window.cameraTrack.readyState === "ended"')
  }, { videoFile })
})

test('a Prática oferece 27 letras e mostra a leitura real mesmo com outra letra como alvo', {
  skip: !appUrl || !videoFile || letter !== 'B',
  timeout: 35_000,
}, async () => {
  const url = new URL('/#praticar', appUrl)
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
  await withChromium(async ({ navigate, evaluate, permission, waitUntil }) => {
    await navigate(url.href)
    await permission(url.origin, 'granted')
    const entries = await evaluate(`(() => {
      const mode = document.querySelector('[data-practice-mode]')
      mode.value = 'letter'
      mode.dispatchEvent(new Event('change'))
      const picker = document.querySelector('[data-signal]')
      return Array.from(picker.options, option => option.textContent).join('')
    })()`)
    assert.equal(entries, 'ABCDEFGHIJKLMNOPQRSTUVWXYZÇ')
    await evaluate(`(() => {
      document.querySelector('[data-stage="1"]').click()
      document.querySelector('[data-camera-toggle]').click()
    })()`, true)
    await waitUntil('document.querySelector("[data-live-character]").textContent === "B"', 18_000)
    assert.equal(await evaluate('document.querySelector("[data-signal]").value'), 'letter-a')
    assert.equal(await evaluate('document.querySelector("[data-attempt]").hidden'), true)
  }, { videoFile })
})
