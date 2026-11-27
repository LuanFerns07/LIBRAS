import { icon } from './shell.js'
import { createCamera } from './recognition/camera.js'
import { handOverlay } from './recognition/hand-overlay.js'
import { trackHands } from './recognition/hand-tracking.js'
import { createLiveLetterReader } from './recognition/alphabet.js'
import { captureSequence } from './recognition/sequence.js'

export function captureMarkup() {
  return `
    <section class="panel media-card" aria-label="Sua câmera">
      <div class="panel-header"><h2>Sua câmera</h2><span class="media-status" data-camera-state>Desligada</span></div>
      <div class="camera-display">
        <div class="camera-stage">
          <video aria-label="Prévia da webcam" autoplay muted playsinline hidden></video>
          <canvas data-hand-overlay aria-hidden="true" hidden></canvas>
          <div class="camera-placeholder">
            <span>${icon('camera')}</span>
            <p>Ative a câmera para sinalizar.</p>
          </div>
        </div>
        <div class="live-letter" data-live-letter hidden>
          <span>Letra detectada</span>
          <output data-live-character aria-live="polite">—</output>
        </div>
      </div>
      <div class="toolbar panel-toolbar">
        <button class="button" type="button" data-camera-toggle>Ativar câmera</button>
        <button class="button primary" type="button" data-attempt disabled>Iniciar tentativa</button>
        <label class="check-label"><input type="checkbox" data-hand-points checked> Mostrar pontos das mãos</label>
      </div>
      <p class="capture-privacy">A imagem fica no seu dispositivo.</p>
      <p class="inline-status" data-hand-status role="status" hidden></p>
      <p class="inline-status" data-capture-status data-state="idle" role="status">Mostre a mão e a parte superior do corpo.</p>
    </section>`
}

const cameraStates = {
  idle: 'Desligada', starting: 'Aguardando', ready: 'Ativa', error: 'Indisponível',
}

const resultLabels = {
  accepted: 'Sinal reconhecido',
  hint: 'Ajuste sugerido',
  inconclusive: 'Tentativa inconclusiva',
  'capture-error': 'Problema de captura',
  unavailable: 'Reconhecimento indisponível',
}

export function mountCapture(main, { openEngine, interpret, onResult, onReady, onLetter, captureMode, enabled = true }) {
  const video = main.querySelector('video')
  const placeholder = main.querySelector('.camera-placeholder')
  const stateLabel = main.querySelector('[data-camera-state]')
  const toggle = main.querySelector('[data-camera-toggle]')
  const button = main.querySelector('[data-attempt]')
  const status = main.querySelector('[data-capture-status]')
  const canvas = main.querySelector('[data-hand-overlay]')
  const points = main.querySelector('[data-hand-points]')
  const handStatus = main.querySelector('[data-hand-status]')
  const letterPanel = main.querySelector('[data-live-letter]')
  const letterOutput = main.querySelector('[data-live-character]')
  const overlay = handOverlay(canvas, video)
  const letterMode = () => captureMode?.() === 'letter'
  let cameraState = 'idle'
  let phase = 'idle'
  const engines = new Map()
  let preview
  let capture
  let reading
  let ticket = 0
  let disposed = false

  function show(state, message) {
    status.dataset.state = state
    delete status.dataset.reason
    delete status.dataset.timing
    const title = resultLabels[state]
    status.textContent = title ? `${title}. ${message}` : message
  }

  function renderButtons() {
    const ready = cameraState === 'ready'
    video.hidden = !ready
    canvas.hidden = !ready || !points.checked
    points.disabled = !enabled
    placeholder.hidden = ready
    stateLabel.textContent = cameraStates[cameraState]
    toggle.textContent = ready || cameraState === 'starting' ? 'Desativar câmera' : 'Ativar câmera'
    toggle.disabled = !enabled
    letterPanel.hidden = !letterMode()
    button.hidden = !letterPanel.hidden
    button.disabled = !enabled || !ready || phase === 'loading' || phase === 'inferring'
    button.textContent = phase === 'recording' ? 'Concluir tentativa' : 'Iniciar tentativa'
  }

  function cancel() {
    ticket += 1
    capture?.abort()
    capture = undefined
    phase = 'idle'
  }

  function closeEngine() {
    for (const { pending } of engines.values()) {
      pending.then(engine => engine.close(), () => {}).catch(() => {})
    }
    engines.clear()
  }

  function getEngine(mode) {
    const key = mode === 'letter' ? 'letter' : 'isolated'
    if (engines.has(key)) return engines.get(key)
    const startedAt = performance.now()
    const pending = Promise.resolve().then(() => openEngine(key))
    const entry = { pending, loadMs: null }
    engines.set(key, entry)
    pending.then(engine => {
      if (engines.get(key) !== entry) return
      entry.loadMs = performance.now() - startedAt
      onReady?.(engine, key)
    }, () => {
      if (engines.get(key) === entry) engines.delete(key)
    })
    return entry
  }

  function showLetter(label) {
    letterOutput.textContent = label ?? '—'
    onLetter?.(label)
  }

  function stopLetters() {
    reading?.reader?.clear()
    reading = undefined
    if (letterOutput.textContent !== '—') showLetter(null)
  }

  async function prepareLetters() {
    if (!camera.active || !letterMode() || reading) return
    const request = {}
    reading = request
    try {
      const engine = await getEngine('letter').pending
      if (reading !== request) return
      if (engine.alphabetCatalog.length) {
        request.reader = createLiveLetterReader(engine.predictLetter, showLetter, engine.findMotion)
        show('ready', 'Mostre uma letra com uma mão.')
      } else {
        show('unavailable', 'O modelo local de alfabeto está indisponível.')
      }
    } catch {
      if (reading === request) show('unavailable', 'Verifique se o modelo local de alfabeto está instalado.')
    }
  }

  function closePreview() {
    preview?.close()
    preview = undefined
    overlay.clear()
    handStatus.hidden = true
  }

  function showPreviewError() {
    if (letterMode()) stopLetters()
    closePreview()
    handStatus.textContent = 'Pontos das mãos indisponíveis. Desmarque a opção e marque novamente para tentar de novo.'
    handStatus.hidden = false
  }

  function syncPreview() {
    const needed = enabled && camera.active && (points.checked || letterMode())
    handStatus.hidden = true
    try {
      if (needed && !preview) preview = trackHands(video, {
        readLetters: letterMode,
        onFrame(frame) {
          overlay.paint(frame)
          void reading?.reader?.read(frame)
        },
        onError: showPreviewError,
      })
      preview?.setVisible(needed)
      if (!points.checked || !needed) overlay.clear()
    } catch {
      showPreviewError()
    }
  }

  const camera = createCamera(video, (state, message) => {
    cameraState = state
    if (state === 'error') {
      cancel()
      stopLetters()
      closePreview()
      closeEngine()
    }
    show(state === 'error' ? 'capture-error' : state, message)
    renderButtons()
    if (state === 'ready') {
      syncPreview()
      void prepareLetters()
    }
  })

  function stop(message) {
    cancel()
    stopLetters()
    closePreview()
    camera.stop()
    closeEngine()
    cameraState = 'idle'
    show('idle', message)
    renderButtons()
  }

  toggle.addEventListener('click', () => {
    if (cameraState === 'ready' || cameraState === 'starting') stop('Câmera desativada.')
    else void camera.start()
  })
  points.addEventListener('change', () => {
    renderButtons()
    syncPreview()
    void prepareLetters()
  })
  function clearTracking() {
    overlay.clear()
    reading?.reader?.clear()
  }
  video.addEventListener('waiting', clearTracking)
  video.addEventListener('resize', clearTracking)

  async function complete(analyze, frames, current, timing, initialLoadMs) {
    if (current !== ticket || disposed) return
    phase = 'inferring'
    capture = undefined
    renderButtons()
    show('busy', 'Analisando a tentativa.')
    let analysis
    try {
      analysis = await analyze(frames)
    } catch {
      analysis = { state: 'unavailable', message: 'Tente novamente após reativar a câmera.' }
    } finally {
      frames.length = 0
    }
    if (current !== ticket || disposed) return
    const result = interpret?.(analysis) ?? analysis
    phase = 'idle'
    show(result.state, result.message)
    if (result.reason) status.dataset.reason = result.reason
    renderButtons()
    onResult?.(result)
    status.dataset.timing = JSON.stringify({
      trigger: timing.trigger,
      decisionMs: performance.now() - timing.finishedAt,
      initialLoadMs,
      extractionMs: timing.extractionMs,
    })
  }

  async function attempt() {
    if (phase === 'recording') {
      capture.finish()
      return
    }
    if (!camera.active || phase !== 'idle' || letterMode()) return
    const current = ++ticket
    const mode = captureMode?.() ?? 'isolated'
    phase = 'loading'
    renderButtons()
    show('busy', 'Preparando o reconhecimento no dispositivo.')
    let engine
    let analyze
    const entry = getEngine(mode)
    try {
      engine = await entry.pending
      if (current !== ticket || disposed) return
      if (mode === 'continuous') analyze = (await engine.prepareContinuous()).recognize
      else analyze = mode === 'sequence' ? engine.recognizeSequence : engine.recognize
    } catch {
      if (current !== ticket || disposed) return
      phase = 'idle'
      renderButtons()
      show('unavailable', 'Verifique se os modelos locais estão instalados.')
      return
    }
    if (current !== ticket || disposed) return
    const initialLoadMs = entry.loadMs
    entry.loadMs = null
    phase = 'recording'
    renderButtons()
    const prompt = {
      isolated: 'Faça um único sinal agora e conclua a tentativa.',
      sequence: 'Faça os sinais e abaixe as mãos entre eles. Conclua a sequência ao terminar.',
      continuous: 'Sinalize a sequência e conclua a tentativa quando terminar.',
    }
    show('recording', prompt[mode])
    capture = captureSequence(video, engine, {
      ...engine.captureOptions,
      ...(['sequence', 'continuous'].includes(mode) ? { limitMs: 12_000, limitFrames: 125 } : {}),
      onFinish(frames, timing) { void complete(analyze, frames, current, timing, initialLoadMs) },
      onError() { stop('A captura foi interrompida. Ative a câmera e tente novamente.'); show('capture-error', status.textContent) },
    })
  }

  const onVisibility = () => {
    if (document.hidden && cameraState !== 'idle') stop('Câmera desativada ao sair da aba. Ative-a para continuar.')
  }
  const onPageHide = () => stop('Câmera desativada. Ative-a para continuar.')
  renderButtons()
  button.addEventListener('click', attempt)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onPageHide)

  return {
    setEnabled(next) {
      enabled = next
      if (enabled) renderButtons()
      else stop('A câmera fica desligada na etapa de observação.')
    },
    reset() {
      if (phase !== 'idle') {
        cancel()
      }
      stopLetters()
      renderButtons()
      if (cameraState === 'ready') show('ready', 'Mostre a mão e a parte superior do corpo.')
      syncPreview()
      void prepareLetters()
    },
    dispose() {
      disposed = true
      cancel()
      stopLetters()
      closePreview()
      camera.dispose()
      closeEngine()
      video.removeEventListener('waiting', clearTracking)
      video.removeEventListener('resize', clearTracking)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
    },
  }
}
