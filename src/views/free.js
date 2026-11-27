import { recognitionCatalog } from '../catalog.js'
import { captureMarkup, mountCapture } from '../capture-panel.js'
import { appendTranscription, freeFeedback } from '../recognition/feedback.js'
import { readSignalManifest } from '../recognition/model-assets.js'
import { mountSpeech } from '../speech.js'
import { glossReviewMarkup, mountGlossReview } from './gloss-review.js'

export function mountFree(main, openEngine, draft) {
  const continuousEnabled = import.meta.env.VITE_LIBRASIA_CONTINUO === '1'
  main.innerHTML = `
    <div class="page-heading">
      <h1>Libras para texto e voz</h1>
      <p>Sinalize, confira a transcrição e edite o resultado antes de ouvir em português brasileiro.</p>
    </div>
    <div class="capture-mode">
      <label class="signal-picker">Conteúdo
        <select data-free-mode><option value="signal">Sinais</option><option value="letter">Alfabeto</option></select>
      </label>
      <div data-signal-modes>
        <label class="check-label"><input type="checkbox" data-sequence-mode> Sequência com pausas entre sinais</label>
        ${continuousEnabled ? '<label class="check-label"><input type="checkbox" data-continuous-mode> Sinalização contínua experimental</label>' : ''}
      </div>
      <p class="muted" data-mode-help>Por padrão, faça um sinal por tentativa.</p>
    </div>
    <div class="media-layout">
      ${captureMarkup({ letterRanking: true })}
      <section class="panel content-panel">
        <h2>Transcrição</h2>
        <label for="transcription" class="field-label">Texto editável</label>
        <textarea id="transcription" rows="7" placeholder="Os sinais reconhecidos aparecem aqui."></textarea>
        <div class="toolbar">
          <button class="button" type="button" data-add-letter disabled hidden>Adicionar letra</button>
          <button class="button" type="button" data-add-space hidden>Inserir espaço</button>
          <button class="button primary" type="button" data-speak>Ouvir</button>
          <button class="button" type="button" data-clear>Limpar texto</button>
        </div>
        <p class="inline-status" role="status" data-voice-status hidden></p>
        ${continuousEnabled ? glossReviewMarkup() : ''}
        <div class="coverage">
          <h3>Catálogo experimental</h3>
          <p data-recognition-coverage>Carregando o catálogo de sinais.</p>
        </div>
      </section>
    </div>`

  const transcription = main.querySelector('#transcription')
  transcription.value = draft.text
  const voiceStatus = main.querySelector('[data-voice-status]')
  const sequence = main.querySelector('[data-sequence-mode]')
  const continuous = main.querySelector('[data-continuous-mode]')
  const modeHelp = main.querySelector('[data-mode-help]')
  const coverage = main.querySelector('[data-recognition-coverage]')
  const mode = main.querySelector('[data-free-mode]')
  const signalModes = main.querySelector('[data-signal-modes]')
  const addLetter = main.querySelector('[data-add-letter]')
  const addSpace = main.querySelector('[data-add-space]')
  const voice = mountSpeech(voiceStatus)
  function setTranscription(text) {
    if (transcription.value === text) return
    transcription.value = text
    voice.textChanged()
  }
  const glossReview = continuousEnabled ? mountGlossReview(main, text => {
    setTranscription(appendTranscription(transcription.value, { state: 'accepted', text }))
    transcription.focus()
  }) : undefined
  let currentLetter = null
  let signalNames
  let supportedLetters
  const currentMode = () => mode.value === 'letter' ? 'letter'
    : continuous?.checked ? 'continuous' : sequence.checked ? 'sequence' : 'isolated'
  function renderCoverage() {
    if (currentMode() === 'letter') {
      coverage.textContent = supportedLetters?.length ? `Leitura experimental de ${supportedLetters.join(', ')}.`
        : supportedLetters ? 'O modelo local de alfabeto está indisponível.'
          : 'Ative a câmera para carregar a leitura do alfabeto.'
      return
    }
    coverage.textContent = signalNames?.length ? `Sinais disponíveis. ${signalNames.join(', ')}.`
      : signalNames ? 'O modelo local de sinais está indisponível.' : 'Carregando o catálogo de sinais.'
  }

  function showSignalNames(labels) {
    signalNames = recognitionCatalog.filter(signal => labels.includes(signal.text)).map(signal => signal.label)
    renderCoverage()
  }

  readSignalManifest().then(manifest => {
    if (!signalNames) showSignalNames(manifest.labels)
  }, () => {
    if (!signalNames) showSignalNames([])
  })

  const capture = mountCapture(main, {
    openEngine,
    captureMode: currentMode,
    interpret: result => result.glosses ? result : freeFeedback(result),
    onReady(engine, kind) {
      if (kind === 'letter') {
        supportedLetters = engine.alphabetCatalog
        renderCoverage()
      } else showSignalNames(engine.catalog)
    },
    onLetter(label) {
      currentLetter = label
      addLetter.disabled = !label
    },
    onResult(result) {
      if (result.glosses) glossReview?.show(result)
      else setTranscription(appendTranscription(transcription.value, result))
    },
  })
  function changeMode() {
    capture.reset()
    glossReview?.clear()
    const instructions = {
      isolated: 'Por padrão, faça um sinal por tentativa.',
      letter: 'Mostre uma letra com uma mão. Quando ela aparecer, você pode adicioná-la ao texto.',
      sequence: 'Função experimental. Abaixe as mãos entre os sinais do catálogo.',
      continuous: 'Use sinais do catálogo. Depois da tentativa, revise os sinais e confirme a sugestão para acrescentá-la ao texto.',
    }
    const current = currentMode()
    modeHelp.textContent = instructions[current]
    signalModes.hidden = current === 'letter'
    addLetter.hidden = current !== 'letter'
    addSpace.hidden = current !== 'letter'
    renderCoverage()
  }
  mode.addEventListener('change', changeMode)
  sequence.addEventListener('change', () => {
    if (continuous && sequence.checked) continuous.checked = false
    changeMode()
  })
  continuous?.addEventListener('change', () => {
    if (continuous.checked) sequence.checked = false
    changeMode()
  })
  transcription.addEventListener('input', voice.textChanged)
  main.querySelector('[data-speak]').addEventListener('click', () => voice.speak(transcription.value))
  addLetter.addEventListener('click', () => {
    if (currentLetter) setTranscription(transcription.value + currentLetter)
  })
  addSpace.addEventListener('click', () => {
    if (transcription.value && !/\s$/u.test(transcription.value)) setTranscription(transcription.value + ' ')
  })
  main.querySelector('[data-clear]').addEventListener('click', () => {
    voice.stop()
    capture.reset()
    glossReview?.clear()
    transcription.value = ''
    voiceStatus.hidden = false
    voiceStatus.dataset.state = 'idle'
    voiceStatus.textContent = 'Texto limpo.'
    transcription.focus()
  })
  return () => {
    draft.text = transcription.value
    voice.stop()
    capture.dispose()
  }
}
