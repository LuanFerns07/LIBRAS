import { icon } from './shell.js'
import { createCamera } from './recognition/camera.js'
import { handOverlay } from './recognition/hand-overlay.js'
import { trackHands } from './recognition/hand-tracking.js'
import { captureSequence } from './recognition/sequence.js'

export function captureMarkup() {
  return `
    <section class="panel media-card" aria-label="Sua câmera">
      <div class="panel-header"><h2>Sua câmera</h2><span class="media-status" data-camera-state>Desligada</span></div>
      <div class="camera-stage">
        <video aria-label="Prévia da webcam" autoplay muted playsinline hidden></video>
        <canvas data-hand-overlay aria-hidden="true" hidden></canvas>
        <div class="camera-placeholder">
          <span>${icon('camera')}</span>
          <p>Ative a câmera para sinalizar.</p>
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

export function mountCapture(main, { openEngine, interpret, onResult, onReady, captureMode, enabled = true }) {
  const video = main.querySelector('video')
  const placeholder = main.querySelector('.camera-placeholder')
  const stateLabel = main.querySelector('[data-camera-state]')
  const toggle = main.querySelector('[data-camera-toggle]')
  const button = main.querySelector('[data-attempt]')
  const status = main.querySelector('[data-capture-status]')
  const canvas = main.querySelector('[data-hand-overlay]')
  const points = main.querySelector('[data-hand-points]')
  const handStatus = main.querySelector('[data-hand-status]')
  const overlay = handOverlay(canvas, video)
  let cameraState = 'idle'
  let phase = 'idle'
  let enginePromise
  let engineLoadMs = null
  let preview
  let capture
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
    enginePromise?.then(engine => engine.close(), () => {}).catch(() => {})
    enginePromise = undefined
    engineLoadMs = null
  }

  function getEngine() {
    if (enginePromise) return enginePromise
    const startedAt = performance.now()
    const pending = Promise.resolve().then(openEngine)
    enginePromise = pending
    pending.then(engine => {
      if (pending !== enginePromise) return
      engineLoadMs = performance.now() - startedAt
      onReady?.(engine)
    }, () => {
      if (pending === enginePromise) enginePromise = undefined
    })
    return pending
  }

  function closePreview() {
    preview?.close()
    preview = undefined
    overlay.clear()
    handStatus.hidden = true
  }

  function showPreviewError() {
    closePreview()
    handStatus.textContent = 'Pontos das mãos indisponíveis. Desmarque a opção e marque novamente para tentar de novo.'
    handStatus.hidden = false
  }

  function syncPreview() {
    const visible = enabled && camera.active && points.checked
    handStatus.hidden = true
    try {
      if (visible && !preview) preview = trackHands(video, { onFrame: overlay.paint, onError: showPreviewError })
      preview?.setVisible(visible)
      if (!visible) overlay.clear()
    } catch {
      showPreviewError()
    }
  }

  const camera = createCamera(video, (state, message) => {
    cameraState = state
    if (state === 'error') {
      cancel()
      closePreview()
      closeEngine()
    }
    show(state === 'error' ? 'capture-error' : state, message)
    renderButtons()
    if (state === 'ready') syncPreview()
  })

  function stop(message) {
    cancel()
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
  })
  video.addEventListener('waiting', overlay.clear)
  video.addEventListener('resize', overlay.clear)

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
    if (!camera.active || phase !== 'idle') return
    const current = ++ticket
    const mode = captureMode?.() ?? 'isolated'
    phase = 'loading'
    renderButtons()
    show('busy', 'Preparando o reconhecimento no dispositivo.')
    let engine
    let analyze
    try {
      engine = await getEngine()
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
    const initialLoadMs = engineLoadMs
    engineLoadMs = null
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
      ...(mode !== 'isolated' ? { limitMs: 12_000, limitFrames: 125 } : {}),
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
        renderButtons()
      }
      if (cameraState === 'ready') show('ready', 'Mostre a mão e a parte superior do corpo.')
    },
    dispose() {
      disposed = true
      cancel()
      closePreview()
      camera.dispose()
      closeEngine()
      video.removeEventListener('waiting', overlay.clear)
      video.removeEventListener('resize', overlay.clear)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
    },
  }
}
