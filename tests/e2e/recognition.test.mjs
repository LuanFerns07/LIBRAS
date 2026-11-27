import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { access, writeFile } from 'node:fs/promises'
import { test } from 'node:test'
import { withChromium } from './chromium.mjs'
import { beginAtMarker, finish } from './recorded-capture.mjs'

const appUrl = process.env.LIBRASIA_TEST_URL
const enabled = process.env.LIBRASIA_TEST_RECOGNITION === '1'
const videoFile = process.env.LIBRASIA_TEST_VIDEO
const expected = process.env.LIBRASIA_EXPECT_TEXT?.trim()
const secondText = process.env.LIBRASIA_TEST_SECOND_TEXT?.trim()
const multiple = process.env.LIBRASIA_TEST_SEQUENCE === '1'
const continuous = process.env.LIBRASIA_TEST_CONTINUOUS === '1'
const expectedGlosses = process.env.LIBRASIA_EXPECT_GLOSSES
const reviewGlosses = process.env.LIBRASIA_TEST_GLOSS_REVIEW === '1'
const sync = multiple || continuous || process.env.LIBRASIA_TEST_SYNC === '1'
const target = process.env.LIBRASIA_TEST_TARGET?.trim()
const lessonFlow = process.env.LIBRASIA_TEST_LESSON_FLOW === '1'
const expectedHint = process.env.LIBRASIA_TEST_EXPECT_HINT?.trim()
const trials = Number(process.env.LIBRASIA_TEST_TRIALS || 1)
const autoFinish = process.env.LIBRASIA_TEST_AUTO_FINISH === '1'
const expectedReason = process.env.LIBRASIA_EXPECT_REASON
const expectedClassifierCalls = process.env.LIBRASIA_EXPECT_CLASSIFIER_CALLS
const prefix = process.env.LIBRASIA_TEST_TRANSCRIPT_PREFIX ?? ''
const voiceMode = process.env.LIBRASIA_TEST_VOICE_MODE
const offline = process.env.LIBRASIA_TEST_OFFLINE === '1'
const fixedCaptureMs = process.env.LIBRASIA_TEST_CAPTURE_MS === undefined
  ? null : Number(process.env.LIBRASIA_TEST_CAPTURE_MS)
const markerOffsetMs = Number(process.env.LIBRASIA_TEST_START_OFFSET_MS ?? 0)
const windowToleranceMs = 300
const reportFile = process.env.LIBRASIA_TEST_REPORT

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
  if (expected || expectedHint) assert.ok(videoFile, 'Informe o arquivo Y4M rotulado para verificar um sinal ou uma dica.')
  if (sync) assert.ok(videoFile, 'A sincronização usa um Y4M com marcador inicial verde.')
  if (multiple) assert.ok(expected && !target, 'O teste da sequência usa o texto esperado na área livre.')
  if (secondText) assert.ok(expected && sync && trials === 2 && !target && !multiple && !continuous,
    'Use duas tentativas isoladas e marcadores verde e azul para verificar sinais diferentes.')
  if (continuous) assert.ok(!multiple && !target && !autoFinish && !offline, 'Use a área livre no cenário contínuo.')
  if (reviewGlosses) assert.ok(continuous && !expected && trials === 1,
    'Use uma tentativa contínua inconclusiva para verificar a revisão.')
  if (target) assert.ok(/^signal-[a-z-]+$/u.test(target), 'Informe o identificador do sinal usado na lição.')
  if (lessonFlow) assert.ok(target === 'signal-cinco' && expected === 'cinco' && sync && trials === 2,
    'Use duas tentativas com o clipe sincronizado de Cinco para verificar a lição inteira.')
  if (expectedHint) assert.ok(target && sync && !expected && !expectedReason,
    'Use um clipe sincronizado e o alvo da prática guiada para verificar uma dica.')
  if (autoFinish) assert.ok(expected && sync && !multiple && !target, 'Use um clipe sincronizado na área livre para o teste de sustentação.')
  if (offline) assert.ok(expected && sync && !multiple && !target && trials >= 2,
    'Use um sinal confirmado na área livre, com clipe sincronizado e pelo menos duas tentativas.')
  if (expectedReason) assert.ok(!expected, 'O motivo esperado deve corresponder a uma tentativa inconclusiva.')
  if (expectedClassifierCalls !== undefined) assert.match(expectedClassifierCalls, /^\d+$/u)
  assert.ok(Number.isInteger(markerOffsetMs) && markerOffsetMs >= 0 && markerOffsetMs <= 2500,
    'Informe um deslocamento de 0 a 2500 ms a partir do marcador.')
  if (fixedCaptureMs !== null) {
    const limitMs = continuous || multiple ? 11000 : 4200
    assert.ok(Number.isInteger(fixedCaptureMs) && fixedCaptureMs >= 500 && fixedCaptureMs <= limitMs,
      `Informe uma duração de captura de 500 a ${limitMs} ms.`)
    assert.ok(sync && !autoFinish && !target, 'Use clipe sincronizado e tentativa manual na área livre.')
  } else {
    assert.equal(markerOffsetMs, 0, 'Defina a duração da captura para deslocar o início.')
  }
  if (voiceMode) assert.ok(['missing', 'error'].includes(voiceMode) && expected && !target &&
    process.env.LIBRASIA_TEST_VOICE !== '1', 'Escolha um único cenário de voz após reconhecimento na área livre.')
  assert.ok(Number.isInteger(trials) && trials >= 1 && trials <= 30, 'Informe de 1 a 30 tentativas.')
  if (trials > 1 && videoFile) assert.ok(sync, 'Use o marcador de sincronização para repetir um clipe.')
  const base = new URL('/', appUrl)
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Use uma prévia local em loopback para este teste de vídeo.')
  async function readBuild() {
    const [release, manifest] = await Promise.all(['commit.txt', 'models/isolated.json']
      .map(path => fetch(new URL(path, base))))
    assert.ok(release.ok && manifest.ok, 'Use um pacote local com versão e manifesto para registrar a medição.')
    const commit = (await release.text()).trim()
    assert.match(commit, /^[a-f0-9]{40}$/u)
    const bytes = Buffer.from(await manifest.arrayBuffer())
    const { modelSha256, threshold } = JSON.parse(bytes)
    return { commit, manifestSha256: createHash('sha256').update(bytes).digest('hex'), modelSha256, threshold }
  }
  const build = reportFile ? await readBuild() : null
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
      if (lessonFlow) {
        assert.equal(await evaluate('document.querySelector("[data-camera-toggle]").disabled'), true)
        const answer = value => evaluate(`document.querySelector('[data-quiz] input[value="${value}"]').click();
          document.querySelector('[data-quiz]').form.requestSubmit()`)
        await answer(1)
        assert.equal(await evaluate('document.querySelector("[data-quiz-status]").dataset.state'), 'inconclusive')
        await answer(0)
        assert.equal(await evaluate('document.querySelector("[data-quiz-status]").dataset.state'), 'accepted')
        await evaluate('document.querySelector("[data-review]").click()', true)
        assert.equal(await evaluate('document.activeElement.dataset.stage'), '1')
      } else {
        await evaluate('document.querySelector(\'[data-stage="1"]\').click()', true)
      }
      assert.equal(await evaluate('!!document.querySelector("[data-avatar] canvas").getContext("webgl2")'), true)
    }
    if (continuous) await evaluate('document.querySelector("[data-continuous-mode]").click()', true)
    await permission(base.origin, 'granted')
    await evaluate('document.querySelector("[data-camera-toggle]").click()', true)
    await waitUntil('document.querySelector("[data-camera-state]").textContent === "Ativa"')
    const environment = reportFile ? await evaluate(`(() => {
      const { width, height, frameRate } = document.querySelector('video').srcObject.getVideoTracks()[0].getSettings()
      const gl = document.querySelector('[data-avatar] canvas')?.getContext('webgl2')
      const info = gl?.getExtension('WEBGL_debug_renderer_info')
      return { browser: navigator.userAgent, video: { width, height, frameRate },
        graphics: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : null }
    })()`) : null
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

    let warmup = null
    if (sync) {
      // A primeira tentativa carrega o extrator e o classificador. A avaliação começa no marcador do clipe.
      const first = await evaluate('(' + finish + ')()', true)
      warmup = first.timing
      if (reportFile) assert.ok(Number.isFinite(warmup?.initialLoadMs) && warmup.initialLoadMs > 0,
        'O aquecimento deve registrar o carregamento dos modelos.')
      if (!target) await evaluate('document.querySelector("[data-clear]").click()', true)
      if (multiple) await evaluate('document.querySelector("[data-sequence-mode]").click()', true)
    }

    const getTranscript = () => evaluate('document.querySelector("#transcription").value')
    if (!target && prefix) await evaluate('document.querySelector("#transcription").value = ' + JSON.stringify(prefix))
    const captureMs = multiple ? 10300 : videoFile ? 3850 : 1600
    const decisions = []
    for (let trial = 0; trial < trials; trial += 1) {
      if (lessonFlow && trial === 1) {
        assert.equal(decisions[0].state, 'accepted', 'A tentativa guiada deve ser reconhecida antes da etapa seguinte.')
        await evaluate('document.querySelector(\'[data-stage="2"]\').click()', true)
        assert.equal(await evaluate('document.querySelector("[data-avatar]").closest(".media-card").offsetWidth'), 0)
        assert.equal(await evaluate('document.querySelector("video").srcObject.getVideoTracks()[0].readyState'), 'live')
      }
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
        const channels = secondText && trial === 1 ? [false, false, true] : [false, true, false]
        const marker = [markerOffsetMs, fixedCaptureMs !== null, channels]
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
      const restartAvatar = target && !(lessonFlow && trial === 1)
      if (restartAvatar) await evaluate('document.querySelector("[data-restart]").click()', true)
      if (reportFile && restartAvatar) {
        await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
        assert.equal(await evaluate('document.querySelector("[data-play]").textContent'), 'Pausar',
          'O avatar deve estar em reprodução antes de concluir a tentativa.')
      }
      const endAtMediaMs = fixedCaptureMs === null ? null : marked.startMs + fixedCaptureMs
      const decision = await evaluate('(' + finish + ')(' + autoFinish + ',' + endAtMediaMs + ')', true)
      const glosses = continuous ? await evaluate(`(() => {
        const trail = document.querySelector("[data-continuous-glosses]")
        return trail.hidden ? '' : trail.textContent.split(' — ')[1]
      })()`) : null
      if (continuous && expected && decision.state === 'accepted') {
        await evaluate('document.querySelector("[data-apply-gloss-suggestion]").click()', true)
      }
      const transcript = target ? null : await getTranscript()
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
      const expectedState = expectedHint ? 'hint' : expected ? 'accepted' : 'inconclusive'
      check('estado', () => assert.equal(decision.state, expectedState, decision.message))
      if (expectedHint) check('dica', () => assert.ok(decision.message.includes(expectedHint), decision.message))
      if (expectedReason) check('motivo', () => assert.equal(decision.reason, expectedReason, decision.message))
      if (expectedClassifierCalls !== undefined) check('classificador', () =>
        assert.equal(decision.timing?.classifierCalls, Number(expectedClassifierCalls)))
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
    if (reportFile) {
      assert.deepEqual(await readBuild(), build, 'A compilação ou o modelo mudou durante o teste.')
      await writeFile(reportFile, JSON.stringify({
        build, environment, target: target ?? null, videoFile: videoFile ?? null, warmup, decisions, mismatches,
      }, null, 2) + '\n')
    }
    assert.deepEqual(mismatches, [], 'Divergências observadas nas tentativas.')

    if (reviewGlosses) {
      const field = 'document.querySelector("#gloss-review-input")'
      const output = 'document.querySelector("[data-gloss-suggestion]")'
      const apply = 'document.querySelector("[data-apply-gloss-suggestion]")'
      const generate = () => evaluate('document.querySelector("[data-generate-gloss-suggestion]").click()', true)
      const edit = async text => {
        await evaluate(field + '.select()')
        await page('Input.insertText', { text })
      }
      assert.match(await evaluate(field + '.value'), /\?/u)
      assert.match(decisions[0].glosses, /amarelo|espelho/u)
      await generate()
      assert.equal(await evaluate(output + '.dataset.state'), 'inconclusive')
      assert.equal(await evaluate(apply + '.disabled'), true)
      for (const [glosses, suggestion] of [
        ['cinco aluno', 'cinco alunos'],
        ['cinco espelho', 'cinco espelhos'],
        ['cinco espelho amarelo', 'cinco espelhos amarelos'],
        ['amarelo espelho', 'amarelo espelho'],
      ]) {
        await edit(glosses)
        await generate()
        assert.equal(await evaluate(output + '.textContent'), 'Sugestão de texto — ' + suggestion)
        assert.equal(await getTranscript(), prefix)
      }
      await edit('amarelo ?')
      assert.equal(await evaluate(apply + '.disabled'), true, 'Uma edição deve invalidar a sugestão anterior.')
      await edit('cinco espelho amarelo')
      await generate()
      await evaluate(apply + '.click()', true)
      await evaluate(apply + '.click()', true)
      const separator = prefix && !/\s$/u.test(prefix) ? ' ' : ''
      assert.equal(await getTranscript(), prefix + separator + 'cinco espelhos amarelos')
      assert.equal(await evaluate('document.querySelector("[data-gloss-review]").hidden'), true)
      assert.equal(await evaluate('document.activeElement.id'), 'transcription')
      assert.deepEqual(otherRequests, [], 'A revisão também deve ser local.')
      context.diagnostic('A revisão testou a concordância em três expressões, rejeitou trechos em aberto e acrescentou uma vez a sugestão confirmada.')
    }

    if (expectedHint) {
      const progress = await evaluate('JSON.parse(localStorage.getItem("librasia:progress:v1"))[' + JSON.stringify(target) + ']')
      assert.ok(progress.hints >= trials, 'A lição deve registrar todas as dicas exibidas.')
      assert.equal(progress.guided, false, 'A dica mantém a prática guiada pendente.')
    }

    if (lessonFlow) {
      const progress = 'document.querySelector("[data-progress]")?.textContent === "1 de 3 sinais concluídos"'
      await waitUntil(progress)
      await evaluate('window.testLessonCompleted = true')
      await page('Page.reload')
      await waitUntil('!window.testLessonCompleted && ' + progress)
      assert.equal(await evaluate('document.querySelector("video").srcObject'), null)
      context.diagnostic('A lição concluiu observação, tentativa guiada e tentativa de memória. O progresso voltou após recarregar.')
    }

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
