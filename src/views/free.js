import { lesson } from '../catalog.js'
import { captureMarkup, mountCapture } from '../capture-panel.js'
import { appendTranscription, freeFeedback } from '../recognition/feedback.js'
import { mountSpeech } from '../speech.js'

export function mountFree(main, openEngine) {
  main.innerHTML = `
    <div class="page-heading">
      <h1>Libras para texto e voz</h1>
      <p>Mostre um sinal por tentativa. Edite o resultado antes de ouvir em português.</p>
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
          <p>${lesson.map(signal => signal.label).join(', ')}. Cada tentativa reconhecida acrescenta uma palavra.</p>
        </div>
      </section>
    </div>`

  const transcription = main.querySelector('#transcription')
  const voiceStatus = main.querySelector('[data-voice-status]')
  const voice = mountSpeech(voiceStatus)
  const capture = mountCapture(main, {
    openEngine,
    interpret: freeFeedback,
    onResult(result) { transcription.value = appendTranscription(transcription.value, result) },
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
