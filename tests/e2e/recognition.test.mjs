import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import { test } from 'node:test'
import { withChromium } from './chromium.mjs'

const appUrl = process.env.LIBRASIA_TEST_URL
const enabled = process.env.LIBRASIA_TEST_RECOGNITION === '1'
const videoFile = process.env.LIBRASIA_TEST_VIDEO
const expected = process.env.LIBRASIA_EXPECT_TEXT?.trim()
const secondText = process.env.LIBRASIA_TEST_SECOND_TEXT?.trim()
const multiple = process.env.LIBRASIA_TEST_SEQUENCE === '1'
const continuous = process.env.LIBRASIA_TEST_CONTINUOUS === '1'
const expectedGlosses = process.env.LIBRASIA_EXPECT_GLOSSES
const sync = multiple || continuous || process.env.LIBRASIA_TEST_SYNC === '1'
const target = process.env.LIBRASIA_TEST_TARGET?.trim()
const trials = Number(process.env.LIBRASIA_TEST_TRIALS || 1)
const autoFinish = process.env.LIBRASIA_TEST_AUTO_FINISH === '1'
const expectedReason = process.env.LIBRASIA_EXPECT_REASON
const prefix = process.env.LIBRASIA_TEST_TRANSCRIPT_PREFIX ?? ''
const voiceMode = process.env.LIBRASIA_TEST_VOICE_MODE
const offline = process.env.LIBRASIA_TEST_OFFLINE === '1'
const fixedCaptureMs = process.env.LIBRASIA_TEST_CAPTURE_MS === undefined
  ? null : Number(process.env.LIBRASIA_TEST_CAPTURE_MS)
const markerOffsetMs = Number(process.env.LIBRASIA_TEST_START_OFFSET_MS ?? 0)
const windowToleranceMs = 300

const finish = ((automatic, endAtMediaMs) => new Promise(resolve => {
  const status = document.querySelector('[data-capture-status]')
  const video = document.querySelector('video')
  let start
  let endMs
  let pending
  const observer = new MutationObserver(() => {
    if (['busy', 'recording'].includes(status.dataset.state)) return
    observer.disconnect()
    if (pending !== undefined) video.cancelVideoFrameCallback(pending)
    const timing = JSON.parse(status.dataset.timing ?? 'null')
    resolve({
      state: status.dataset.state, reason: status.dataset.reason, message: status.textContent, timing, endMs,
      elapsedMs: automatic ? timing?.decisionMs : start === undefined ? null : performance.now() - start,
    })
  })
  observer.observe(status, { attributes: true, attributeFilter: ['data-state'] })
  if (status.dataset.state !== 'recording') {
    observer.disconnect()
    resolve({ state: status.dataset.state, elapsedMs: null, message: status.textContent })
    return
  }
  if (automatic) return
  function conclude(mediaTime) {
    endMs = Math.round(mediaTime * 1000)
    start = performance.now()
    document.querySelector('[data-attempt]').click()
  }
  function checkEnd(_, { mediaTime }) {
    pending = undefined
    if (Math.round(mediaTime * 1000) >= endAtMediaMs) conclude(mediaTime)
    else pending = video.requestVideoFrameCallback(checkEnd)
  }
  if (endAtMediaMs == null) conclude(video.currentTime)
  else pending = video.requestVideoFrameCallback(checkEnd)
})).toString()

const beginAtMarker = ((offsetMs, waitForMarkerEdge, blueMarker) => new Promise(resolve => {
  const video = document.querySelector('video')
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 2
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  let markerMs
  let seenOutsideMarker = !waitForMarkerEdge
  function checkFrame(_, { mediaTime }) {
    const startMs = Math.round(mediaTime * 1000)
    if (markerMs === undefined) {
      ctx.drawImage(video, 0, 0, 2, 2)
      const [red, green, blue] = ctx.getImageData(0, 0, 1, 1).data
      const isMarker = red < 35 && (blueMarker ? blue > 170 && green < 35 : green > 170 && blue < 35)
      if (isMarker && seenOutsideMarker) markerMs = startMs
      if (!isMarker) seenOutsideMarker = true
    }
    if (markerMs !== undefined && startMs - markerMs >= offsetMs) {
      document.querySelector('[data-attempt]').click()
      resolve({ markerMs, startMs })
    } else video.requestVideoFrameCallback(checkFrame)
  }
  video.requestVideoFrameCallback(checkFrame)
})).toString()

const useVoiceFixture = (mode => {
  window.testSpeechCalls = 0
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      getVoices: () => mode === 'missing' ? [] : [{ lang: 'pt-BR', localService: true }],
      cancel() {},
      speak(utterance) {
        window.testSpeechCalls += 1
        window.testUtterance = utterance.text
        queueMicrotask(() => utterance.onerror?.({ error: 'synthesis-failed' }))
      },
    },
  })
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    value: class {
      constructor(text) { this.text = text }
    },
  })
  window.location.hash = 'area-livre'
}).toString()

test('a prévia faz a extração e a decisão no navegador sem transmitir quadros', {
  skip: !appUrl || !enabled,
}, async context => {
  if (videoFile) await access(videoFile)
  if (expected) assert.ok(videoFile, 'Informe o arquivo Y4M rotulado para verificar um sinal positivo.')
  if (sync) assert.ok(videoFile, 'A sincronização usa um Y4M com marcador inicial verde.')
  if (multiple) assert.ok(expected && !target, 'O teste da sequência usa o texto esperado na área livre.')
  if (secondText) assert.ok(expected && sync && trials === 2 && !target && !multiple && !continuous,
    'Use duas tentativas isoladas e marcadores verde e azul para verificar sinais diferentes.')
  if (continuous) assert.ok(!multiple && !target && !autoFinish && !offline, 'Use a área livre no cenário contínuo.')
  if (target) assert.ok(/^signal-[a-z-]+$/u.test(target), 'Informe o identificador do sinal usado na lição.')
  if (autoFinish) assert.ok(expected && sync && !multiple && !target, 'Use um clipe sincronizado na área livre para o teste de sustentação.')
  if (offline) assert.ok(expected && sync && !multiple && !target && trials >= 2,
    'Use um sinal confirmado na área livre, com clipe sincronizado e pelo menos duas tentativas.')
  if (expectedReason) assert.ok(!expected, 'O motivo esperado deve corresponder a uma tentativa inconclusiva.')
  assert.ok(Number.isInteger(markerOffsetMs) && markerOffsetMs >= 0 && markerOffsetMs <= 2500,
    'Informe um deslocamento de 0 a 2500 ms a partir do marcador.')
  if (fixedCaptureMs !== null) {
    const limitMs = continuous ? 11000 : 4200
    assert.ok(Number.isInteger(fixedCaptureMs) && fixedCaptureMs >= 500 && fixedCaptureMs <= limitMs,
      `Informe uma duração de captura de 500 a ${limitMs} ms.`)
    assert.ok(sync && !autoFinish && !multiple && !target, 'Use clipe sincronizado e tentativa manual na área livre.')
  } else {
    assert.equal(markerOffsetMs, 0, 'Defina a duração da captura para deslocar o início.')
  }
  if (voiceMode) assert.ok(['missing', 'error'].includes(voiceMode) && expected && !target &&
    process.env.LIBRASIA_TEST_VOICE !== '1', 'Escolha um único cenário de voz após reconhecimento na área livre.')
  assert.ok(Number.isInteger(trials) && trials >= 1 && trials <= 30, 'Informe de 1 a 30 tentativas.')
  if (trials > 1 && videoFile) assert.ok(sync, 'Use o marcador de sincronização para repetir um clipe.')
  const base = new URL('/', appUrl)
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Use uma prévia local em loopback para este teste de vídeo.')
  const otherRequests = []
  const offlineRequests = []
  const seenAssets = new Set()
  const probeUrl = offline ? new URL('?librasia-test-offline-probe=1', base).href : null
  let offlineActive = false
  let probeRequestId
  let probeError
  await withChromium(async ({ page, evaluate, waitUntil, navigate, permission, listen }) => {
    listen('Network.requestWillBeSent', ({ request, requestId }) => {
      if (request.url === probeUrl) {
        probeRequestId = requestId
        return
      }
      const url = new URL(request.url)
      if (url.protocol === 'blob:' || url.protocol === 'data:') return
      if (url.origin !== base.origin || request.method !== 'GET') otherRequests.push([request.method, url.origin])
      if (offlineActive) offlineRequests.push([request.method, url.pathname])
      seenAssets.add(url.pathname)
    })
    if (offline) listen('Network.loadingFailed', ({ requestId, errorText }) => {
      if (requestId === probeRequestId) probeError = errorText
    })
    await page('Network.enable')
    await navigate(base.href + (target ? '#praticar' : voiceMode ? '#saiba-mais' : '#area-livre'))
    if (voiceMode) {
      await evaluate('(' + useVoiceFixture + ')(' + JSON.stringify(voiceMode) + ')')
      await waitUntil('!!document.querySelector("#transcription")')
    }
    if (target) {
      const select = '(id => { const field = document.querySelector("[data-signal]"); field.value = id; field.dispatchEvent(new Event("change")); })'
      await evaluate(select + '(' + JSON.stringify(target) + ')')
      await evaluate('document.querySelector(' + JSON.stringify('[data-stage="1"]') + ').click()', true)
      assert.equal(await evaluate('!!document.querySelector("[data-avatar] canvas").getContext("webgl2")'), true)
    }
    if (continuous) await evaluate('document.querySelector("[data-continuous-mode]").click()', true)
    await permission(base.origin, 'granted')
    await evaluate('document.querySelector("[data-camera-toggle]").click()', true)
    await waitUntil('document.querySelector("[data-camera-state]").textContent === "Ativa"')
    if (process.env.LIBRASIA_TEST_POINTS === '1') {
      assert.ok(videoFile && expected, 'Use um clipe rotulado para verificar os pontos da mão.')
      const hasPoints = `(() => {
        const canvas = document.querySelector('[data-hand-overlay]')
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
        return new Uint32Array(pixels.buffer).some(pixel => pixel !== 0)
      })()`
      await waitUntil(hasPoints, 25000)
      assert.equal(await evaluate(`(() => {
        const canvas = document.querySelector('[data-hand-overlay]')
        const video = document.querySelector('video')
        return canvas.width === video.videoWidth && canvas.height === video.videoHeight &&
          getComputedStyle(canvas).transform === getComputedStyle(video).transform &&
          getComputedStyle(canvas).objectFit === getComputedStyle(video).objectFit
      })()`), true)
      const togglePoints = 'document.querySelector("[data-hand-points]").click()'
      await evaluate(togglePoints)
      assert.equal(await evaluate('document.querySelector("[data-hand-overlay]").hidden'), true)
      assert.equal(await evaluate(hasPoints), false)
      await evaluate(togglePoints)
      await waitUntil(hasPoints, 15000)
      context.diagnostic('Os pontos foram desenhados com a câmera ativa, apagados ao desmarcar e retomados ao marcar.')
    }
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

    const getTranscript = () => evaluate('document.querySelector("#transcription").value')
    if (!target && prefix) await evaluate('document.querySelector("#transcription").value = ' + JSON.stringify(prefix))
    const captureMs = multiple ? 10300 : videoFile ? 3850 : 1600
    const decisions = []
    for (let trial = 0; trial < trials; trial += 1) {
      if (offline && trial === 1) {
        assert.equal(decisions[0].state, 'accepted', 'Confirme o reconhecimento antes de desconectar.')
        await evaluate('window.testCameraTrack = document.querySelector("video").srcObject.getVideoTracks()[0]; true')
        const state = { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }
        offlineActive = true
        await page('Network.emulateNetworkConditionsByRule', {
          emulateOfflineServiceWorker: true,
          matchedNetworkConditions: [{ urlPattern: '', ...state }],
        })
        await page('Network.overrideNetworkState', state)
        await waitUntil('navigator.onLine === false')
      }
      let marked
      if (sync) {
        const marker = [markerOffsetMs, fixedCaptureMs !== null, Boolean(secondText && trial === 1)]
        marked = await evaluate('(' + beginAtMarker + ')(...' + JSON.stringify(marker) + ')', true)
        await record()
      } else if (trial > 0) {
        await startAttempt()
        await record()
      }
      if (fixedCaptureMs === null) {
        await evaluate('new Promise(resolve => setTimeout(resolve, ' + (autoFinish ? 800 : captureMs) + '))')
      }
      if (autoFinish) {
        assert.equal(await evaluate('document.querySelector("[data-capture-status]").dataset.state'), 'recording')
        assert.equal(await getTranscript(), decisions.at(-1)?.transcript ?? prefix)
      }
      if (target) await evaluate('document.querySelector("[data-restart]").click()', true)
      const endAtMediaMs = fixedCaptureMs === null ? null : marked.startMs + fixedCaptureMs
      const decision = await evaluate('(' + finish + ')(' + autoFinish + ',' + endAtMediaMs + ')', true)
      const transcript = target ? null : await getTranscript()
      const glosses = continuous ? await evaluate(`(() => {
        const trail = document.querySelector("[data-continuous-glosses]")
        return trail.hidden ? '' : trail.textContent.split(' — ')[1]
      })()`) : null
      const window = fixedCaptureMs === null || !Number.isFinite(decision.endMs) ? null : {
        offsetMs: marked.startMs - marked.markerMs,
        durationMs: decision.endMs - marked.startMs,
        endMs: decision.endMs - marked.markerMs,
      }
      if (autoFinish) {
        const mediaTime = await evaluate('document.querySelector("video").currentTime')
        await evaluate('new Promise(resolve => setTimeout(resolve, 1200))')
        assert.ok(await evaluate('document.querySelector("video").currentTime') > mediaTime)
        assert.equal(await getTranscript(), transcript)
        assert.equal(await evaluate('document.querySelector("[data-attempt]").textContent'), 'Iniciar tentativa')
      }
      decisions.push({ ...decision, transcript, window, glosses })
      context.diagnostic('Tentativa ' + (trial + 1) + '/' + trials + ' · ' + decision.message +
        (window ? ' · janela real ' + window.offsetMs.toFixed(0) + '–' + window.endMs.toFixed(0) +
          ' ms · ' + (decision.timing?.extractionMs.length ?? 0) + ' quadros · texto ' + JSON.stringify(transcript) : '') +
        (continuous ? ' · sinais detectados ' + JSON.stringify(glosses) : '') +
        ' · ' + (autoFinish ? 'fim do tempo até resposta: ' : 'conclusão até resposta: ') +
        (decision.elapsedMs?.toFixed(1) ?? 'indisponível') + ' ms')
    }

    const times = decisions.map(({ elapsedMs }) => elapsedMs).filter(elapsedMs => elapsedMs > 0).sort((a, b) => a - b)
    if (times.length) {
      const middle = times.length >> 1
      const median = times.length % 2 ? times[middle] : (times[middle - 1] + times[middle]) / 2
      const p95 = times[Math.ceil(times.length * .95) - 1]
      context.diagnostic('Latência de ' + times.length + '/' + trials + ' tentativas ' +
        (autoFinish ? 'por fim do tempo' : 'manuais') + ' · mediana ' +
        median.toFixed(1) + ' ms e p95 ' + p95.toFixed(1) + ' ms (posto mais próximo).')
    }
    const mismatches = []
    for (const [index, decision] of decisions.entries()) {
      const check = (field, assertion) => {
        try {
          assertion()
        } catch (error) {
          mismatches.push('Tentativa ' + (index + 1) + ' · ' + field + ' · ' + error.message)
        }
      }
      check('medição', () => {
        assert.ok(Number.isFinite(decision.elapsedMs), 'A tentativa deve registrar o tempo da decisão.')
        assert.equal(decision.timing?.trigger, autoFinish ? 'time-limit' : 'manual')
        assert.ok(Number.isFinite(decision.timing.decisionMs) && decision.timing.decisionMs >= 0)
        assert.ok(decision.timing.decisionMs <= decision.elapsedMs)
        assert.ok(decision.timing.extractionMs.length > 0)
        assert.ok(decision.timing.extractionMs.every(time => Number.isFinite(time) && time >= 0))
        if (!sync && index === 0) assert.ok(decision.timing.initialLoadMs > 0)
        else assert.equal(decision.timing.initialLoadMs, null)
      })
      if (fixedCaptureMs !== null) check('janela', () => {
        assert.ok(decision.window, 'A conclusão manual deve registrar o fim da janela no vídeo.')
        const { offsetMs, durationMs } = decision.window
        assert.ok(offsetMs >= markerOffsetMs && offsetMs <= markerOffsetMs + windowToleranceMs,
          'O início real divergiu do deslocamento planejado.')
        assert.ok(durationMs >= fixedCaptureMs && durationMs <= fixedCaptureMs + windowToleranceMs,
          'A duração real divergiu da janela planejada.')
      })
      check('estado', () => assert.equal(decision.state, expected ? 'accepted' : 'inconclusive', decision.message))
      if (expectedReason) check('motivo', () => assert.equal(decision.reason, expectedReason, decision.message))
      if (expectedGlosses !== undefined) check('glosas', () => assert.equal(decision.glosses, expectedGlosses))
      if (!target) {
        const words = secondText ? [expected, secondText].slice(0, index + 1) : Array(index + 1).fill(expected)
        const addition = expected ? words.join(' ').toLocaleLowerCase('pt-BR') : ''
        const spacer = prefix && addition && !/\s$/u.test(prefix) ? ' ' : ''
        check('texto', () => assert.equal(decision.transcript, prefix + spacer + addition))
      }
    }

    for (const path of ['/models/isolated.json', '/models/isolated.onnx', '/runtime/holistic_landmarker.task']) {
      assert.ok(seenAssets.has(path), 'Ativo carregado: ' + path)
    }
    if (continuous) {
      for (const file of ['boundary-model.json', 'boundary-model.onnx', 'monotone-web.json', 'monotone-web.manifest.json']) {
        assert.ok(seenAssets.has('/models/continuous/' + file), 'Ativo carregado: ' + file)
      }
    }
    assert.ok(Array.from(seenAssets).some(path => /ort-wasm.*\.wasm$/u.test(path)), 'WebAssembly do ONNX Runtime carregado.')
    assert.deepEqual(otherRequests, [], 'A página deve solicitar apenas arquivos locais.')
    assert.deepEqual(mismatches, [], 'Divergências observadas nas tentativas.')

    if (offline) {
      const unchangedCamera = 'document.querySelector("video").srcObject?.getVideoTracks()[0] === window.testCameraTrack'
      assert.equal(await evaluate('navigator.onLine === false && ' + unchangedCamera +
        ' && window.testCameraTrack.readyState === "live"'), true)
      const blocked = await evaluate('fetch(' + JSON.stringify(probeUrl) + ', { cache: "no-store" }).then(() => false, () => true)')
      assert.equal(blocked, true, 'A rede emulada deve bloquear até a sonda para o servidor local.')
      assert.equal(probeError, 'net::ERR_INTERNET_DISCONNECTED')
      assert.deepEqual(offlineRequests, [], 'O reconhecimento offline deve usar apenas os ativos já carregados.')
      context.diagnostic('A câmera permaneceu ativa, a transcrição foi atualizada offline e a página não fez novas requisições.')
    }

    if (voiceMode) {
      const edit = decisions.at(-1).transcript + '. Texto revisado.'
      await evaluate('document.querySelector("#transcription").value = ' + JSON.stringify(edit))
      await evaluate('document.querySelector("[data-speak]").click()', true)
      await waitUntil('document.querySelector("[data-voice-status]").dataset.state === "unavailable"')
      assert.match(await evaluate('document.querySelector("[data-voice-status]").textContent'),
        voiceMode === 'missing' ? /voz local.*indisponível/u : /leitura falhou/u)
      assert.equal(await getTranscript(), edit)
      assert.equal(await evaluate('window.testSpeechCalls'), voiceMode === 'missing' ? 0 : 1)
      if (voiceMode === 'error') assert.equal(await evaluate('window.testUtterance'), edit)
      await evaluate('const field = document.querySelector("#transcription"); field.focus(); field.setSelectionRange(field.value.length, field.value.length)')
      await page('Input.insertText', { text: ' Nova edição.' })
      assert.equal(await getTranscript(), edit + ' Nova edição.')
      context.diagnostic('Texto editado preservado e ainda editável após ' +
        (voiceMode === 'missing' ? 'ausência simulada de voz local.' : 'erro simulado da síntese.'))
    }

    if (!target && expected && process.env.LIBRASIA_TEST_VOICE === '1') {
      await waitUntil('speechSynthesis.getVoices().some(v => v.localService && v.lang.replaceAll("_", "-").toLowerCase() === "pt-br")')
      const edit = decisions.at(-1).transcript + '. Teste da transcrição editada.'
      const observeVoice = (() => {
        const synthesis = speechSynthesis
        const speak = synthesis.speak.bind(synthesis)
        synthesis.speak = utterance => {
          window.testUtterance = utterance.text
          speak(utterance)
        }
      }).toString()
      await evaluate('(' + observeVoice + ')()')
      await evaluate('document.querySelector("#transcription").value = ' + JSON.stringify(edit))
      await evaluate('document.querySelector("[data-speak]").click()', true)
      await waitUntil('document.querySelector("[data-voice-status]").dataset.state === "accepted"')
      assert.equal(await evaluate('window.testUtterance'), edit)
      context.diagnostic('A voz local em pt-BR concluiu a leitura da edição após o reconhecimento.')
    }

  }, { videoFile })
})
