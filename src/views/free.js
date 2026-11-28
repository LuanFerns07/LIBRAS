import { captureMarkup, mountCapture } from '../capture-panel.js'
import { mountSpeech } from '../speech.js'
import { alphabetMarkup, mountAlphabet } from './alphabet.js'

export function mountFree(main, { createPlayer, openEngine, draft }) {
  main.innerHTML = `
    <div class="page-heading">
      <h1>Área livre</h1>
      <p>Consulte o alfabeto no avatar e sinalize uma letra por vez para a câmera.</p>
    </div>
    <div class="media-layout free-layout">
      ${captureMarkup({ letterRanking: true })}
      ${alphabetMarkup()}
      <section class="panel content-panel free-transcription">
        <h2>Transcrição</h2>
        <label for="transcription" class="field-label">Texto editável</label>
        <textarea id="transcription" rows="4" placeholder="Adicione as letras detectadas ou digite aqui."></textarea>
        <div class="toolbar">
          <button class="button" type="button" data-add-letter disabled>Adicionar letra</button>
          <button class="button" type="button" data-add-space>Inserir espaço</button>
          <button class="button primary" type="button" data-speak>Ouvir</button>
          <button class="button" type="button" data-clear>Limpar texto</button>
        </div>
        <p class="inline-status" role="status" data-voice-status hidden></p>
      </section>
    </div>`

  const transcription = main.querySelector('#transcription')
  transcription.value = draft.text
  const voiceStatus = main.querySelector('[data-voice-status]')
  const addLetter = main.querySelector('[data-add-letter]')
  const voice = mountSpeech(voiceStatus)
  const disposeAlphabet = mountAlphabet(main.querySelector('[data-alphabet-reference]'), createPlayer)
  let currentLetter = null

  function setTranscription(text) {
    if (transcription.value === text) return
    transcription.value = text
    voice.textChanged()
  }

  const capture = mountCapture(main, {
    openEngine,
    captureMode: () => 'letter',
    onLetter(label) {
      currentLetter = label
      addLetter.disabled = !label
    },
  })
  transcription.addEventListener('input', voice.textChanged)
  main.querySelector('[data-speak]').addEventListener('click', () => voice.speak(transcription.value))
  addLetter.addEventListener('click', () => {
    if (currentLetter) setTranscription(transcription.value + currentLetter)
  })
  main.querySelector('[data-add-space]').addEventListener('click', () => {
    if (transcription.value && !/\s$/u.test(transcription.value)) setTranscription(transcription.value + ' ')
  })
  main.querySelector('[data-clear]').addEventListener('click', () => {
    voice.stop()
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
    disposeAlphabet()
  }
}
