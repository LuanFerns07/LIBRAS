import { brandHands, icon } from './shell.js'
import { createCamera } from './recognition/camera.js'
import { handOverlay } from './recognition/hand-overlay.js'
import { trackHands } from './recognition/hand-tracking.js'
import { createLiveLetterReader } from './recognition/alphabet.js'
import { captureSequence } from './recognition/sequence.js'

export function captureMarkup({ letterRanking = false } = {}) {
  const validation = new URLSearchParams(location.search).get('validacao') === '1'
  return `
    <section class="panel media-card" aria-label="Sua câmera">
      <div class="panel-header"><h2>Sua câmera</h2><span class="media-status" data-camera-state>Desligada</span></div>
      <div class="camera-display">
        <div class="camera-stage">
          <video aria-label="Prévia da webcam" autoplay muted playsinline hidden></video>
          <canvas data-hand-overlay aria-hidden="true" hidden></canvas>
          <svg class="stage-guide" data-stage-guide viewBox="0 0 90 160" preserveAspectRatio="xMidYMax meet" aria-hidden="true" hidden>
            <g class="guide-body"><ellipse cx="45" cy="86" rx="12.5" ry="15.5"/><path d="M12 160C12 131 25 116 45 116S78 131 78 160"/></g>
            <g class="guide-hand"><rect x="61" y="62" width="17" height="19" rx="6"/><path d="M63.5 62V45M68.5 62V41M73.5 62V43M78 64V49M61 73L55 64"/></g>
          </svg>
          <div class="stage-hud">
            <ol class="stage-stories" data-stage-stories aria-label="Sinais da lição" hidden></ol>
            <span class="stage-rec" data-stage-rec hidden>Gravando</span>
            <p class="stage-caption" data-stage-caption hidden><small data-stage-cue></small><span data-stage-target></span></p>
            <span class="stage-stamp" data-stage-stamp aria-hidden="true" hidden>Acertou!</span>
          </div>
          <div class="camera-placeholder">
            ${brandHands}
            <p class="placeholder-title" data-placeholder-title>Sua vez de sinalizar</p>
            <p class="placeholder-text" data-placeholder-text>Ative a câmera para começar.</p>
          </div>
        </div>
        <div class="live-letter" data-live-letter hidden>
          <span>Letra detectada</span>
          <output data-live-character aria-live="polite">—</output>
          ${letterRanking ? `
            <div class="letter-ranking" data-letter-ranking hidden>
              <span>Modelo base</span>
              <strong data-primary-letter-score></strong>
              <ol aria-label="Outras letras possíveis" start="2">
                <li data-letter-alternative></li>
                <li data-letter-alternative></li>
              </ol>
            </div>` : ''}
        </div>
      </div>
      <div class="toolbar panel-toolbar">
        <button class="button" type="button" data-camera-toggle><span class="button-icon">${icon('power')}</span><span data-label>Ativar câmera</span></button>
        <button class="button primary" type="button" data-attempt disabled><span class="button-icon" data-attempt-icon>${icon('record')}</span><span data-label>Iniciar tentativa</span></button>
        <label class="check-label"><input type="checkbox" data-hand-points checked> Mostrar pontos das mãos</label>
        <button class="button focus-toggle" type="button" data-focus-mode aria-pressed="false"><span class="button-icon">${icon('expand')}</span><span data-label>Modo foco</span></button>
      </div>
      <p class="capture-privacy">A imagem fica no seu dispositivo.</p>
      <div class="capture-feedback">
        <p class="inline-status" data-hand-status role="status" hidden></p>
        <p class="inline-status" data-capture-status data-state="idle" role="status">Mostre a mão e a parte superior do corpo.</p>
        <ul class="attempt-parts" data-attempt-parts aria-label="Leitura por parte do sinal" hidden></ul>
      </div>
      ${validation ? `
        <p class="capture-privacy" data-validation-camera hidden></p>
        <div class="toolbar panel-toolbar" data-validation-measurement hidden>
          <button type="button" class="button" data-copy-measurement>Copiar medição</button>
          <span class="muted" role="status" data-copy-status></span>
          <label data-manual-copy hidden>JSON da medição
            <textarea rows="3" readonly spellcheck="false"></textarea>
          </label>
        </div>` : ''}
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

const letterPercent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })

export function mountCapture(main, { openEngine, interpret, onResult, onReady, onLetter, captureMode, caption, celebrateAccepted = false, handPoints, enabled = true }) {
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
  const letterRanking = main.querySelector('[data-letter-ranking]')
  const primaryScore = letterRanking?.querySelector('[data-primary-letter-score]')
  const alternatives = letterRanking?.querySelectorAll('[data-letter-alternative]')
  const validationCamera = main.querySelector('[data-validation-camera]')
  const measurementPanel = main.querySelector('[data-validation-measurement]')
  const copyMeasurement = measurementPanel?.querySelector('[data-copy-measurement]')
  const copyStatus = measurementPanel?.querySelector('[data-copy-status]')
  const manualCopy = measurementPanel?.querySelector('[data-manual-copy]')
  const measurementText = manualCopy?.querySelector('textarea')
  const overlay = handOverlay(canvas, video)
  const card = video.closest('.media-card')
  const stage = video.closest('.camera-stage')
  const rec = main.querySelector('[data-stage-rec]')
  const captionBox = main.querySelector('[data-stage-caption]')
  const captionCue = main.querySelector('[data-stage-cue]')
  const captionTarget = main.querySelector('[data-stage-target]')
  const stamp = main.querySelector('[data-stage-stamp]')
  const focusButton = main.querySelector('[data-focus-mode]')
  const guide = main.querySelector('[data-stage-guide]')
  const stories = main.querySelector('[data-stage-stories]')
  const partsList = main.querySelector('[data-attempt-parts]')
  const placeholderTitle = main.querySelector('[data-placeholder-title]')
  const placeholderText = main.querySelector('[data-placeholder-text]')
  if (handPoints !== undefined) points.checked = handPoints
  let stampTimer
  const letterMode = () => captureMode?.() === 'letter'
  let cameraState = 'idle'
  let phase = 'idle'
  const engines = new Map()
  let preview
  let retryPreview = true
  let capture
  let reading
  let ticket = 0
  let disposed = false

  function resetMeasurementPanel() {
    if (!measurementPanel) return
    measurementPanel.hidden = true
    copyStatus.textContent = ''
    manualCopy.hidden = true
    measurementText.value = ''
  }

  function show(state, message) {
    status.dataset.state = state
    delete status.dataset.reason
    delete status.dataset.timing
    resetMeasurementPanel()
    const title = resultLabels[state]
    status.textContent = title ? `${title}. ${message}` : message
    stage.dataset.result = state
    showParts([])
    if (state === 'accepted' && celebrateAccepted) celebrate()
  }

  const partStates = { ok: 'certo', adjust: 'ajustar', unmeasured: 'não medido' }
  function showParts(parts) {
    partsList.hidden = !parts.length
    partsList.innerHTML = parts.map(({ label, state, note }) =>
      `<li data-state="${state}"><span class="part-mark" aria-hidden="true"></span><strong>${label}</strong><span class="visually-hidden"> (${partStates[state]})</span> <span>${note}</span></li>`).join('')
  }

  // Selo rápido de acerto sobre a câmera, no ritmo de vídeo curto.
  function celebrate() {
    clearTimeout(stampTimer)
    stamp.hidden = true
    stage.classList.remove('flash')
    void stamp.offsetWidth
    stamp.hidden = false
    stage.classList.add('flash')
    stampTimer = setTimeout(() => {
      stamp.hidden = true
      stage.classList.remove('flash')
    }, 1600)
  }

  function renderCaption() {
    const text = caption?.()
    const visible = Boolean(text) && enabled
    captionBox.hidden = !visible
    if (!visible) return
    const [cue, target] = Array.isArray(text) ? text : ['', text]
    if (captionCue.textContent !== cue) captionCue.textContent = cue
    if (captionTarget.textContent !== target) captionTarget.textContent = target
    captionCue.hidden = !cue
  }

  const fullscreenTarget = () => document.fullscreenElement === card
  function renderFocus() {
    const on = fullscreenTarget()
    focusButton.hidden = !card.requestFullscreen
    focusButton.setAttribute('aria-pressed', String(on))
    focusButton.querySelector('[data-label]').textContent = on ? 'Sair do modo foco' : 'Modo foco'
  }
  focusButton.addEventListener('click', async () => {
    try {
      if (fullscreenTarget()) await document.exitFullscreen()
      else await card.requestFullscreen()
    } catch {}
  })
  document.addEventListener('fullscreenchange', renderFocus)
  const onPreferences = () => {
    let preferences
    try { preferences = JSON.parse(localStorage.getItem('librasia-preferencias') ?? '{}') } catch { return }
    const next = preferences?.handPoints !== false
    if (points.checked === next) return
    points.checked = next
    points.dispatchEvent(new Event('change'))
  }
  window.addEventListener('librasia:preferencias', onPreferences)

  function renderButtons() {
    const ready = cameraState === 'ready'
    video.hidden = !ready
    canvas.hidden = !ready || !points.checked
    points.disabled = !enabled
    placeholder.hidden = ready
    placeholderTitle.textContent = enabled ? 'Sua vez de sinalizar' : 'Primeiro, observe'
    placeholderText.textContent = enabled ? 'Ative a câmera para começar.' : 'Veja o avatar e responda à atividade.'
    // SVG não tem a propriedade hidden: o atributo é trocado direto.
    guide.toggleAttribute('hidden', !ready || !enabled || letterMode() || !['idle', 'recording'].includes(phase) || stage.dataset.result === 'accepted')
    guide.classList.toggle('faint', phase === 'recording')
    stateLabel.textContent = cameraStates[cameraState]
    toggle.querySelector('[data-label]').textContent = ready || cameraState === 'starting' ? 'Desativar câmera' : 'Ativar câmera'
    toggle.disabled = !enabled
    letterPanel.hidden = !letterMode()
    button.hidden = !letterPanel.hidden
    button.disabled = !enabled || !ready || phase === 'loading' || phase === 'inferring'
    button.querySelector('[data-label]').textContent = phase === 'recording' ? 'Concluir tentativa' : 'Iniciar tentativa'
    button.querySelector('[data-attempt-icon]').innerHTML = icon(phase === 'recording' ? 'stop' : 'record')
    rec.hidden = phase !== 'recording'
    stage.classList.toggle('recording', phase === 'recording')
    renderCaption()
    renderFocus()
    if (validationCamera) {
      const track = ready ? video.srcObject?.getVideoTracks()[0] : undefined
      const { width, height } = track?.getSettings() ?? {}
      validationCamera.hidden = !(width && height)
      validationCamera.textContent = width && height ? `${track.label || 'Câmera'} · ${width} × ${height} px` : ''
    }
  }

  copyMeasurement?.addEventListener('click', async () => {
    const measurement = status.dataset.timing
    if (!measurement) return
    try {
      await navigator.clipboard.writeText(measurement)
      if (disposed || status.dataset.timing !== measurement) return
      manualCopy.hidden = true
      measurementText.value = ''
      copyStatus.textContent = 'Medição copiada.'
    } catch {
      if (disposed || status.dataset.timing !== measurement) return
      measurementText.value = measurement
      manualCopy.hidden = false
      copyStatus.textContent = 'Copie o JSON selecionado.'
      measurementText.focus()
      measurementText.select()
    }
  })

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

  function showLetterRanking(ranking) {
    letterRanking.hidden = !ranking
    if (!ranking) return
    const scoreText = letterPercent.format(ranking[0].score)
    if (primaryScore.textContent !== scoreText) primaryScore.textContent = scoreText
    for (const [index, item] of alternatives.entries()) {
      const alternative = ranking[index + 1]
      item.hidden = !alternative
      if (!alternative) continue
      const text = `${alternative.label} ${letterPercent.format(alternative.score)}`
      if (item.textContent !== text) item.textContent = text
    }
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
        request.reader = createLiveLetterReader(engine.predictLetter, showLetter, engine.findMotion,
          letterRanking ? showLetterRanking : undefined)
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
    if (!needsPreview()) return
    if (retryPreview) {
      retryPreview = false
      syncPreview()
      if (preview) void prepareLetters()
      return
    }
    handStatus.textContent = 'Pontos das mãos indisponíveis. Desmarque a opção e marque novamente para tentar de novo.'
    handStatus.hidden = false
  }

  const needsPreview = () => enabled && camera.active && (points.checked || letterMode())

  function syncPreview() {
    const needed = needsPreview()
    handStatus.hidden = true
    try {
      if (needed && !preview) preview = trackHands(video, {
        readLetters: letterMode,
        onFrame(frame) {
          overlay.paint(frame)
          void reading?.reader?.read(frame)
        },
        onError: showPreviewError,
        onStall: clearTracking,
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
      retryPreview = true
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
    retryPreview = true
    renderButtons()
    syncPreview()
    void prepareLetters()
  })
  function clearTracking() {
    preview?.discard()
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
    let classifierCalls = null
    let calls = 0
    try {
      analysis = await analyze(frames, () => { calls += 1 })
      classifierCalls = calls
    } catch {
      analysis = { state: 'unavailable', message: 'Tente novamente após reativar a câmera.' }
    } finally {
      frames.length = 0
    }
    if (current !== ticket || disposed) return
    const result = interpret?.(analysis) ?? analysis
    phase = 'idle'
    show(result.state, result.message)
    if (result.parts) showParts(result.parts)
    if (result.reason) status.dataset.reason = result.reason
    renderButtons()
    onResult?.(result)
    status.dataset.timing = JSON.stringify({
      trigger: timing.trigger,
      decisionMs: performance.now() - timing.finishedAt,
      initialLoadMs,
      extractionMs: timing.extractionMs,
      classifierCalls,
    })
    if (measurementPanel) measurementPanel.hidden = false
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
    celebrate,
    refreshCaption: renderCaption,
    // Barra no topo do vídeo, um segmento por item da lição, como nos stories.
    setStories(items) {
      stories.hidden = !items.length
      stories.innerHTML = items.map(({ label, state }) =>
        `<li data-state="${state}"><span class="visually-hidden">${label}: ${{ done: 'concluído', current: 'atual', todo: 'pendente' }[state]}</span></li>`).join('')
      stories.querySelectorAll('li').forEach((item, index) => {
        if (items[index].fill !== undefined) item.style.setProperty('--fill', `${Math.round(items[index].fill * 100)}%`)
      })
    },
    setEnabled(next) {
      enabled = next
      if (enabled) {
        if (cameraState === 'idle') show('idle', 'Mostre a mão e a parte superior do corpo.')
        renderButtons()
      }
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
      document.removeEventListener('fullscreenchange', renderFocus)
      window.removeEventListener('librasia:preferencias', onPreferences)
      clearTimeout(stampTimer)
      if (fullscreenTarget()) document.exitFullscreen().catch(() => {})
      window.removeEventListener('pagehide', onPageHide)
    },
  }
}
