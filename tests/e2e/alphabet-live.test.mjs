import assert from 'node:assert/strict'
import { test } from 'node:test'
import { withChromium } from './chromium.mjs'

const appUrl = process.env.LIBRASIA_TEST_URL
const videoFile = process.env.LIBRASIA_TEST_LETTER_VIDEO
const transitionVideo = process.env.LIBRASIA_TEST_M_N_VIDEO
const sequenceVideo = process.env.LIBRASIA_TEST_M_N_U_VIDEO
const letter = process.env.LIBRASIA_TEST_EXPECT_LETTER || 'B'
const forbidden = process.env.LIBRASIA_TEST_FORBIDDEN_LETTER
const testPractice = letter === 'B' || process.env.LIBRASIA_TEST_ALPHABET_PRACTICE === '1'

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
      const live = document.querySelector('[data-live-character]')
      window.alphabetReadings = []
      new MutationObserver(() => window.alphabetReadings.push(live.textContent))
        .observe(live, { childList: true, characterData: true, subtree: true })
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
    if (forbidden) assert.ok(!(await evaluate('window.alphabetReadings')).includes(forbidden))
    await evaluate('document.querySelector("[data-page=saiba-mais]").click()', true)
    await waitUntil('window.cameraTrack.readyState === "ended"')
  }, { videoFile })
})

test('a Prática oferece 27 letras e mostra a leitura real mesmo com outra letra como alvo', {
  skip: !appUrl || !videoFile || !testPractice,
  timeout: 35_000,
}, async () => {
  const url = new URL('/#praticar', appUrl)
  const target = letter === 'A' ? 'letter-b' : 'letter-a'
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
      const picker = document.querySelector('[data-signal]')
      picker.value = ${JSON.stringify(target)}
      picker.dispatchEvent(new Event('change'))
      document.querySelector('[data-stage="1"]').click()
      document.querySelector('[data-camera-toggle]').click()
    })()`, true)
    await waitUntil('document.querySelector("[data-live-character]").textContent === ' + JSON.stringify(letter), 18_000)
    assert.equal(await evaluate('document.querySelector("[data-signal]").value'), target)
    assert.equal(await evaluate('document.querySelector("[data-attempt]").hidden'), true)
  }, { videoFile })
})

async function observeTransitions(view, videoFile, until) {
  const url = new URL('/#' + view, appUrl)
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
  return withChromium(async ({ navigate, evaluate, permission, waitUntil }) => {
    await navigate(url.href)
    await permission(url.origin, 'granted')
    await evaluate(`(() => {
      const mode = document.querySelector('[data-free-mode], [data-practice-mode]')
      mode.value = 'letter'
      mode.dispatchEvent(new Event('change'))
      document.querySelector('[data-stage="1"]')?.click()
      const video = document.querySelector('video')
      const output = document.querySelector('[data-live-character]')
      window.transitionReadings = []
      video.addEventListener('loadedmetadata', () => {
        window.transitionTrack = video.srcObject.getVideoTracks()[0]
      }, { once: true })
      new MutationObserver(() => {
        window.transitionReadings.push({ letter: output.textContent, at: video.currentTime })
      }).observe(output, { childList: true })
      document.querySelector('[data-camera-toggle]').click()
    })()`, true)
    await waitUntil(`document.querySelector("video").currentTime >= ${until}`, 20000)
    const { readings, sameTrack } = await evaluate(`(() => {
      const [track] = document.querySelector('video').srcObject.getVideoTracks()
      return {
        readings: window.transitionReadings,
        sameTrack: window.transitionTrack === track && track.readyState === 'live',
      }
    })()`)
    assert.equal(sameTrack, true, view)
    return readings
  }, { videoFile })
}

test('a leitura acompanha a troca de M para N na mesma captura nos dois modos', {
  skip: !appUrl || !transitionVideo,
  timeout: 55_000,
}, async () => {
  for (const view of ['area-livre', 'praticar']) {
    const readings = await observeTransitions(view, transitionVideo, 6.2)
    assert.deepEqual(readings.map(({ letter }) => letter), ['M', '—', 'N', '—'], view)
  }
})

test('a mesma trilha mostra M, N sustentado e U na Área livre e em Praticar', {
  skip: !appUrl || !sequenceVideo,
  timeout: 55_000,
}, async context => {
  for (const view of ['area-livre', 'praticar']) {
    const readings = await observeTransitions(view, sequenceVideo, 12)
    context.diagnostic(view + ' ' + JSON.stringify(readings.map(({ letter, at }) => ({ letter, at: +at.toFixed(3) }))))
    assert.deepEqual(readings.map(({ letter }) => letter), ['M', '—', 'N', '—', 'U', '—'], view)
    const [, , n, clearN, u, clearU] = readings
    // A pose pode ser reconhecida antes de o rótulo impresso de N estabilizar.
    const nWithinWindow = Math.min(clearN.at, 7.706) - Math.max(n.at, 5.504)
    assert.ok(nWithinWindow >= .5, view + ' N sustentado')
    assert.ok(clearN.at >= 7.4 && clearN.at <= 8.1, view + ' perde a leitura no fim de N')
    assert.ok(u.at >= 8.506 && u.at < 11.109, view + ' U')
    assert.ok(clearU.at <= 11.6, view + ' perde a leitura no fim de U')
  }
})
