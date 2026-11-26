import { icon } from './shell.js'
import { createCamera } from './recognition/camera.js'
import { captureSequence } from './recognition/sequence.js'

export function captureMarkup() {
  return `
    <section class="panel media-card" aria-label="Sua câmera">
      <div class="panel-header"><h2>Sua câmera</h2><span class="media-status" data-camera-state>Desligada</span></div>
      <div class="camera-stage">
        <video aria-label="Prévia da webcam" autoplay muted playsinline hidden></video>
        <div class="camera-placeholder">
          <span>${icon('camera')}</span>
          <p>Ative a câmera para sinalizar.</p>
        </div>
      </div>
      <div class="toolbar panel-toolbar">
        <button class="button" type="button" data-camera-toggle>Ativar câmera</button>
        <button class="button primary" type="button" data-attempt disabled>Iniciar tentativa</button>
      </div>
      <p class="capture-privacy">A imagem fica no seu dispositivo.</p>
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

export function mountCapture(main, { openEngine, interpret, onResult }) {
  const video = main.querySelector('video')
  const placeholder = main.querySelector('.camera-placeholder')
  const stateLabel = main.querySelector('[data-camera-state]')
  const toggle = main.querySelector('[data-camera-toggle]')
  const button = main.querySelector('[data-attempt]')
  const status = main.querySelector('[data-capture-status]')
  let cameraState = 'idle'
  let phase = 'idle'
  let enginePromise
  let capture
  let ticket = 0
  let disposed = false

  function show(state, message) {
    status.dataset.state = state
    const title = resultLabels[state]
    status.textContent = title ? `${title}. ${message}` : message
  }

  function renderButtons() {
    const ready = cameraState === 'ready'
    video.hidden = !ready
    placeholder.hidden = ready
    stateLabel.textContent = cameraStates[cameraState]
    toggle.textContent = ready || cameraState === 'starting' ? 'Desativar câmera' : 'Ativar câmera'
    button.disabled = !ready || phase === 'loading' || phase === 'inferring'
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
  }

  const camera = createCamera(video, (state, message) => {
    cameraState = state
    if (state === 'error') {
      cancel()
      closeEngine()
    }
    show(state === 'error' ? 'capture-error' : state, message)
    renderButtons()
  })

  function stop(message) {
    cancel()
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

  async function complete(engine, frames, current) {
    if (current !== ticket || disposed) return
    phase = 'inferring'
    capture = undefined
    renderButtons()
    show('busy', 'Analisando a tentativa.')
    let analysis
    try {
      analysis = await engine.recognize(frames)
    } catch {
      analysis = { state: 'unavailable', message: 'Tente novamente após reativar a câmera.' }
    } finally {
      frames.length = 0
    }
    if (current !== ticket || disposed) return
    const result = interpret?.(analysis) ?? analysis
    phase = 'idle'
    show(result.state, result.message)
    renderButtons()
    onResult?.(result)
  }

  async function attempt() {
    if (phase === 'recording') {
      capture.finish()
      return
    }
    if (!camera.active || phase !== 'idle') return
    const current = ++ticket
    phase = 'loading'
    renderButtons()
    show('busy', 'Preparando o reconhecimento no dispositivo.')
    let engine
    try {
      enginePromise ??= openEngine()
      engine = await enginePromise
    } catch {
      if (current !== ticket || disposed) return
      enginePromise = undefined
      phase = 'idle'
      renderButtons()
      show('unavailable', 'Verifique se os modelos locais estão instalados.')
      return
    }
    if (current !== ticket || disposed) return
    phase = 'recording'
    renderButtons()
    show('recording', 'Faça um único sinal agora e conclua a tentativa.')
    capture = captureSequence(video, engine, {
      ...engine.captureOptions,
      onFinish(frames) { void complete(engine, frames, current) },
      onError() { stop('A captura foi interrompida. Ative a câmera e tente novamente.'); show('capture-error', status.textContent) },
    })
  }

  const onVisibility = () => {
    if (document.hidden && cameraState !== 'idle') stop('Câmera desativada ao sair da aba. Ative-a para continuar.')
  }
  const onPageHide = () => stop('Câmera desativada. Ative-a para continuar.')
  button.addEventListener('click', attempt)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onPageHide)

  return {
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
      camera.dispose()
      closeEngine()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
    },
  }
}
