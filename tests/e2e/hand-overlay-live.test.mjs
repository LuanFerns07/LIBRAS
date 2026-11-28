import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import { test } from 'node:test'
import { withChromium } from './chromium.mjs'

const appUrl = process.env.LIBRASIA_TEST_URL
const videoFile = process.env.LIBRASIA_TEST_HAND_VIDEO

function observeOverlay() {
  const video = document.querySelector('video')
  const canvas = document.querySelector('[data-hand-overlay]')
  const status = document.querySelector('[data-capture-status]')
  const context = canvas.getContext('2d')
  const markerCanvas = document.createElement('canvas')
  markerCanvas.width = 1
  markerCanvas.height = 1
  const markerContext = markerCanvas.getContext('2d', { willReadFrequently: true })
  // Marcadores do Y4M, no canto superior esquerdo do vídeo sem espelhamento.
  const markers = { initial: [239, 32, 154], occluded: [19, 104, 255], returned: [247, 57, 39] }
  const paints = []
  const probe = {
    video, paints, part: 'before', phase: '', phaseStart: 0, cycle: 0, mediaTime: 0,
    readCanvas() {
      const { width, height } = canvas
      const pixels = context.getImageData(0, 0, width, height).data
      const hands = [{ x: 0, y: 0, count: 0 }, { x: 0, y: 0, count: 0 }]
      let painted = false
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] === 0) continue
        painted = true
        if (pixels[i + 3] < 245) continue
        const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]]
        const side = r === 217 && g === 184 && b === 255 ? 0 : r === 117 && g === 240 && b === 206 ? 1 : -1
        if (side < 0) continue
        const row = Math.floor(i / 4 / width)
        hands[side].count += 1
        hands[side].x += i / 4 - row * width
        hands[side].y += row
      }
      return { hidden: canvas.hidden, painted, hands: hands.map(({ x, y, count }) =>
        count < 10 ? null : [x / count, y / count]) }
    },
    fixtureEvidence() {
      const cycles = [...new Set(paints.map(paint => paint.cycle))]
      for (const cycle of cycles) {
        const group = paints.filter(paint => paint.cycle === cycle && paint.part === 'before' && !paint.hidden)
        const initial = group.filter(paint => paint.phase === 'initial' && paint.hands.every(Boolean))
        const returned = group.filter(paint => paint.phase === 'returned' && paint.hands.every(Boolean))
        const occluded = group.filter(paint => paint.phase === 'occluded' && !paint.hands.every(Boolean))
        const single = occluded.filter(paint => paint.hands.filter(Boolean).length === 1)
        if (initial.length >= 3 && returned.length >= 8 && returned.at(-1).mediaTime - returned[0].mediaTime >= 1500) {
          for (const side of [0, 1]) {
            const sameHand = single.filter(paint => paint.hands[side])
            if (sameHand.length >= 4) return { cycle, initial, single: sameHand, returned, visibleSide: side }
          }
        }
      }
      return null
    },
    geometry() {
      const describe = node => {
        const { transform, objectFit, objectPosition } = getComputedStyle(node)
        const { x, y, width, height } = node.getBoundingClientRect()
        return { transform, objectFit, objectPosition, rect: [x, y, width, height] }
      }
      return { viewport: innerWidth, canvas: describe(canvas), video: describe(video),
        backing: [canvas.width, canvas.height], source: [video.videoWidth, video.videoHeight] }
    },
  }
  window.handOverlayProbe = probe

  function readMarker(_, { mediaTime }) {
    probe.mediaTime = mediaTime * 1000
    markerContext.drawImage(video, video.videoWidth * .0375, video.videoHeight * .05, 1, 1, 0, 0, 1, 1)
    const pixel = markerContext.getImageData(0, 0, 1, 1).data
    const phase = Object.entries(markers).find(([, rgb]) => rgb.every((value, i) => Math.abs(pixel[i] - value) <= 35))?.[0]
    if (phase && phase !== probe.phase) {
      if (phase === 'initial') probe.cycle += 1
      probe.phase = phase
      probe.phaseStart = probe.mediaTime
    }
    video.requestVideoFrameCallback(readMarker)
  }
  video.requestVideoFrameCallback(readMarker)

  // O desenho é síncrono após clearRect. Leia os pixels ao fim da pintura, sem mudar a aplicação.
  let joints = 0
  const arc = context.arc.bind(context)
  context.arc = (...args) => {
    joints += 1
    arc(...args)
  }
  const clear = context.clearRect.bind(context)
  context.clearRect = (...args) => {
    clear(...args)
    joints = 0
    const { part, phase, cycle, mediaTime } = probe
    const at = performance.now()
    const state = status.dataset.state
    queueMicrotask(() => paints.push({ part, phase, cycle, mediaTime, at, state, joints, ...probe.readCanvas() }))
  }
}

function assertMotion(context, paints) {
  const displacement = (a, b, hand) => b.hands[hand].map((value, axis) => value - a.hands[hand][axis])
  const movement = paints.map((previous, index) => paints.slice(index + 1).map(current => {
    const left = displacement(previous, current, 0)
    const right = displacement(previous, current, 1)
    return Math.min(Math.hypot(...left), Math.hypot(...right), Math.hypot(left[0] - right[0], left[1] - right[1]))
  })).flat()
  const independentMovement = Math.max(...movement)
  context.diagnostic(`Deslocamento simultâneo distinto das duas cores de até ${independentMovement.toFixed(1)} px.`)
  assert.ok(independentMovement > 3, 'As duas cores do canvas devem seguir movimentos distintos.')
}

function reportCadence(context, paints) {
  const stages = { before: 'Antes', during: 'Durante', resumed: 'Após remarcar', after: 'Após concluir' }
  for (const [part, title] of Object.entries(stages)) {
    const times = paints.filter(paint => paint.part === part && !paint.hidden).map(paint => paint.at)
    const gaps = times.slice(1).map((time, index) => time - times[index]).sort((a, b) => a - b)
    if (!gaps.length) continue
    const median = (gaps[Math.floor((gaps.length - 1) / 2)] + gaps[Math.floor(gaps.length / 2)]) / 2
    context.diagnostic(`${title} · ${times.length} pinturas, intervalo mediano ${median.toFixed(0)} ms, maior ${gaps.at(-1).toFixed(0)} ms.`)
  }
}

test('os pontos das duas mãos acompanham a câmera antes, durante e depois da tentativa', {
  skip: !appUrl || !videoFile,
  timeout: 90000,
}, async context => {
  await access(videoFile)
  const base = new URL('/', appUrl)
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Use a prévia local para o teste de vídeo.')
  await withChromium(async ({ page, evaluate, waitUntil, navigate, permission }) => {
    const probe = 'window.handOverlayProbe'
    const state = 'document.querySelector("[data-capture-status]").dataset.state'
    const points = '[data-hand-points]'
    const attempt = '[data-attempt]'
    const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`, true)
    const mark = part => evaluate(`${probe}.part = ${JSON.stringify(part)}`)
    const changeAttempt = part => evaluate(`(() => {
      ${probe}.part = ${JSON.stringify(part)}
      const at = performance.now()
      document.querySelector(${JSON.stringify(attempt)}).click()
      return at
    })()`, true)
    const visibleCount = (part, condition) => `${probe}.paints.filter(p =>
      p.part === ${JSON.stringify(part)} && !p.hidden && ${condition}).length`
    const assertLayout = async (width, height, mobile) => {
      await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
      await waitUntil(`innerWidth === ${width}`)
      const layout = await evaluate(`${probe}.geometry()`)
      assert.ok(layout.canvas.rect[2] > 0 && layout.canvas.rect[3] > 0, 'O canvas deve ocupar a área da câmera.')
      for (const [index, value] of layout.canvas.rect.entries()) {
        assert.ok(Math.abs(value - layout.video.rect[index]) <= 1, `Retângulos do vídeo e do canvas em ${width}px.`)
      }
      assert.equal(layout.canvas.transform, 'matrix(-1, 0, 0, 1, 0, 0)')
      assert.equal(layout.video.transform, layout.canvas.transform)
      assert.equal(layout.canvas.objectFit, 'contain')
      assert.equal(layout.video.objectFit, layout.canvas.objectFit)
      assert.equal(layout.video.objectPosition, layout.canvas.objectPosition)
      assert.ok(layout.source.every(dimension => dimension > 0))
      assert.deepEqual(layout.backing, layout.source)
    }
    await page('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
    await navigate(base.href + '#praticar')
    await click('[data-stage="1"]')
    await permission(base.origin, 'granted')
    await evaluate(`(${observeOverlay})()`)
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(points)}).checked`), true)
    await click('[data-camera-toggle]')
    await waitUntil('document.querySelector("[data-camera-state]").textContent === "Ativa"')
    assert.equal(await evaluate(`(${probe}.track = ${probe}.video.srcObject.getVideoTracks()[0]).readyState`), 'live')

    try {
      const evidence = await waitUntil(`${probe}.fixtureEvidence()`, 35000)
      assertMotion(context, evidence.initial.concat(evidence.returned))
      assert.ok(evidence.initial.some(paint => paint.joints === 42), 'Devem ser desenhadas 21 articulações em cada mão.')
      assert.ok(evidence.single.some(paint => paint.joints === 21), 'A mão visível deve manter as 21 articulações durante a oclusão.')
      assert.ok(evidence.returned.some(paint => paint.joints === 42), 'As 42 articulações devem voltar com a segunda mão.')
      context.diagnostic(`Ciclo ${evidence.cycle}: ${evidence.initial.length} pinturas com duas mãos, ` +
        `${evidence.single.length} só com a mão ${evidence.visibleSide === 0 ? 'lilás' : 'verde'} e ` +
        `${evidence.returned.length} com as duas mãos de volta.`)
      assert.equal(await evaluate(state), 'ready')
      await assertLayout(1280, 900, false)
      await assertLayout(390, 840, true)

      await waitUntil(`${probe}.phase === 'initial' && ${probe}.mediaTime - ${probe}.phaseStart < 700 &&
        ${probe}.paints.at(-1)?.phase === 'initial' && ${probe}.paints.at(-1)?.cycle === ${probe}.cycle &&
        ${probe}.paints.at(-1)?.hands.every(Boolean)`, 25000)
      const startAt = await changeAttempt('during')
      await waitUntil(`${state} === 'recording'`)
      await waitUntil(`${visibleCount('during', "p.state === 'recording' && p.hands.every(Boolean) && p.joints === 42")} >= 3`, 3000)

      await mark('off')
      await click(points)
      assert.equal(await evaluate(`document.querySelector(${JSON.stringify(points)}).checked`), false)
      assert.deepEqual(await evaluate(`${probe}.readCanvas()`), { hidden: true, painted: false, hands: [null, null] })
      const offAt = await evaluate(`${probe}.mediaTime`)
      await waitUntil(`${probe}.mediaTime >= ${offAt + 300}`)
      assert.equal(await evaluate(state), 'recording')
      assert.deepEqual(await evaluate(`${probe}.readCanvas()`), { hidden: true, painted: false, hands: [null, null] })
      await mark('resumed')
      await click(points)
      assert.equal(await evaluate(`document.querySelector(${JSON.stringify(points)}).checked`), true)
      await waitUntil(`${visibleCount('resumed', "p.state === 'recording' && p.hands.some(Boolean)")} >= 3`, 3000)

      const finishAt = await changeAttempt('finishing')
      await waitUntil(`!['busy', 'recording'].includes(${state})`)
      const result = await evaluate(state)
      assert.ok(['accepted', 'inconclusive', 'hint'].includes(result), `Resultado da tentativa: ${result}.`)
      await mark('after')
      await waitUntil(`${visibleCount('after', 'p.hands.some(Boolean)')} >= 3`, 3000)
      assert.equal(await evaluate(`${probe}.track.readyState`), 'live')
      const painted = await evaluate(`${probe}.paints.filter(p => !p.hidden && p.hands.some(Boolean))`)
      const startGap = painted.find(p => p.part === 'during').at - startAt
      const finishGap = painted.find(p => p.at >= finishAt).at - finishAt
      context.diagnostic(`Primeira pintura após iniciar em ${startGap.toFixed(0)} ms e após concluir em ${finishGap.toFixed(0)} ms.`)
      assert.ok(startGap < 1200 && finishGap < 1200, 'A troca de etapa não deve interromper os pontos por mais de 1,2 s.')

      await click('[data-page="saiba-mais"]')
      await waitUntil(`location.hash === '#saiba-mais' && ${probe}.track.readyState === 'ended'`)
      assert.equal(await evaluate(`${probe}.video.srcObject === null`), true)
    } finally {
      const paints = await evaluate(`${probe}.paints`).catch(() => [])
      reportCadence(context, paints)
      if (!paints.some(paint => paint.part === 'during')) {
        const phases = ['initial', 'occluded', 'returned'].map(phase => {
          const counts = [0, 0, 0]
          for (const paint of paints.filter(item => item.phase === phase)) counts[paint.hands.filter(Boolean).length] += 1
          return `${phase} ${counts.join('/')}`
        })
        context.diagnostic('Pinturas por fase e número de mãos (0/1/2) · ' + phases.join(', '))
      }
    }
  }, { videoFile })
})
