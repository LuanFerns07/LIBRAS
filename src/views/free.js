import { lesson, recognitionCatalog } from '../catalog.js'
import { captureMarkup, mountCapture } from '../capture-panel.js'
import { appendTranscription, freeFeedback } from '../recognition/feedback.js'
import { mountSpeech } from '../speech.js'

export function mountFree(main, openEngine) {
  main.innerHTML = `
    <div class="page-heading">
      <h1>Libras para texto e voz</h1>
      <p>Sinalize, confira a transcrição e edite o resultado antes de ouvir em português brasileiro.</p>
    </div>
    <div class="capture-mode">
      <label class="check-label"><input type="checkbox" data-sequence-mode> Sequência com pausas entre sinais</label>
      <p class="muted" data-mode-help>Por padrão, faça um sinal por tentativa.</p>
    </div>
    <div class="media-layout">
      ${captureMarkup()}
      <section class="panel content-panel">
        <h2>Transcrição</h2>
        <label for="transcription" class="field-label">Texto editável</label>
        <textarea id="transcription" rows="7" placeholder="Os sinais reconhecidos aparecem aqui."></textarea>
        <div class="toolbar">
          <button class="button primary" type="button" data-speak>Ouvir</button>
          <button class="button" type="button" data-clear>Limpar texto</button>
        </div>
        <p class="inline-status" role="status" data-voice-status hidden></p>
        <div class="coverage">
          <h3>Catálogo experimental</h3>
          <p data-recognition-coverage>Modelo inicial: ${lesson.map(signal => signal.label).join(', ')}.</p>
        </div>
      </section>
    </div>`

  const transcription = main.querySelector('#transcription')
  const voiceStatus = main.querySelector('[data-voice-status]')
  const sequence = main.querySelector('[data-sequence-mode]')
  const modeHelp = main.querySelector('[data-mode-help]')
  const coverage = main.querySelector('[data-recognition-coverage]')
  const voice = mountSpeech(voiceStatus)
  const capture = mountCapture(main, {
    openEngine,
    sequenceMode: () => sequence.checked,
    interpret: freeFeedback,
    onReady(engine) {
      const names = recognitionCatalog.filter(signal => engine.catalog.includes(signal.text)).map(signal => signal.label)
      coverage.textContent = `Modelo local em uso: ${names.join(', ')}.`
    },
    onResult(result) { transcription.value = appendTranscription(transcription.value, result) },
  })
  sequence.addEventListener('change', () => {
    capture.reset()
    modeHelp.textContent = sequence.checked
      ? 'Função experimental. Abaixe as mãos entre os sinais do catálogo.'
      : 'Por padrão, faça um sinal por tentativa.'
  })
  main.querySelector('[data-speak]').addEventListener('click', () => voice.speak(transcription.value))
  main.querySelector('[data-clear]').addEventListener('click', () => {
    voice.stop()
    capture.reset()
    transcription.value = ''
    voiceStatus.hidden = false
    voiceStatus.dataset.state = 'idle'
    voiceStatus.textContent = 'Texto limpo.'
    transcription.focus()
  })
  return () => {
    voice.stop()
    capture.dispose()
  }
}
