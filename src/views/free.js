import { lesson, recognitionCatalog } from '../catalog.js'
import { captureMarkup, mountCapture } from '../capture-panel.js'
import { appendTranscription, freeFeedback } from '../recognition/feedback.js'
import { mountSpeech } from '../speech.js'

export function mountFree(main, openEngine) {
  const continuousEnabled = import.meta.env.VITE_LIBRASIA_CONTINUO === '1'
  main.innerHTML = `
    <div class="page-heading">
      <h1>Libras para texto e voz</h1>
      <p>Sinalize, confira a transcrição e edite o resultado antes de ouvir em português brasileiro.</p>
    </div>
    <div class="capture-mode">
      <label class="check-label"><input type="checkbox" data-sequence-mode> Sequência com pausas entre sinais</label>
      ${continuousEnabled ? '<label class="check-label"><input type="checkbox" data-continuous-mode> Sinalização contínua experimental</label>' : ''}
      <p class="muted" data-mode-help>Por padrão, faça um sinal por tentativa.</p>
    </div>
    <div class="media-layout">
      ${captureMarkup()}
      <section class="panel content-panel">
        <h2>Transcrição</h2>
        ${continuousEnabled ? '<p class="muted" data-continuous-glosses hidden></p>' : ''}
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
  const continuous = main.querySelector('[data-continuous-mode]')
  const glossTrail = main.querySelector('[data-continuous-glosses]')
  const modeHelp = main.querySelector('[data-mode-help]')
  const coverage = main.querySelector('[data-recognition-coverage]')
  const voice = mountSpeech(voiceStatus)
  const currentMode = () => continuous?.checked ? 'continuous' : sequence.checked ? 'sequence' : 'isolated'
  const capture = mountCapture(main, {
    openEngine,
    captureMode: currentMode,
    interpret: result => result.glosses ? result : freeFeedback(result),
    onReady(engine) {
      const names = recognitionCatalog.filter(signal => engine.catalog.includes(signal.text)).map(signal => signal.label)
      coverage.textContent = `Modelo local em uso: ${names.join(', ')}.`
    },
    onResult(result) {
      transcription.value = appendTranscription(transcription.value, result)
      if (glossTrail) {
        glossTrail.hidden = !result.glosses?.length
        if (!glossTrail.hidden) {
          const trail = result.glosses.map(gloss => gloss ?? '[trecho inconclusivo]').join(' · ')
          glossTrail.textContent = `Sinais detectados — ${trail}`
        }
      }
    },
  })
  function changeMode() {
    capture.reset()
    if (glossTrail) glossTrail.hidden = true
    const instructions = {
      isolated: 'Por padrão, faça um sinal por tentativa.',
      sequence: 'Função experimental. Abaixe as mãos entre os sinais do catálogo.',
      continuous: 'Use sinais do catálogo. Confira os sinais detectados e revise a sugestão de texto antes de ouvir.',
    }
    modeHelp.textContent = instructions[currentMode()]
  }
  sequence.addEventListener('change', () => {
    if (continuous && sequence.checked) continuous.checked = false
    changeMode()
  })
  continuous?.addEventListener('change', () => {
    if (continuous.checked) sequence.checked = false
    changeMode()
  })
  main.querySelector('[data-speak]').addEventListener('click', () => voice.speak(transcription.value))
  main.querySelector('[data-clear]').addEventListener('click', () => {
    voice.stop()
    capture.reset()
    if (glossTrail) glossTrail.hidden = true
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
