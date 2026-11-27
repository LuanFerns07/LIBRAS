import { lesson, manualAlphabet } from '../catalog.js'
import { captureMarkup, mountCapture } from '../capture-panel.js'
import { mountPlayerControls, playerMarkup } from '../player-controls.js'
import { isComplete, markAttempt, readProgress, reviewOrder, reviewStep, writeProgress } from '../progress.js'
import { practiceFeedback } from '../recognition/feedback.js'

const stages = [
  ['Observar', 'Reproduza a demonstração e responda à atividade sem câmera.'],
  ['Praticar com ajuda', 'Compare sua mão com a do avatar. Ative a câmera e faça um sinal por tentativa.'],
  ['Tentar com menos ajuda', 'Faça o sinal de memória. Você pode voltar à demonstração quando precisar.'],
]

const letterInstructions = [
  'Reproduza a demonstração da letra no avatar.',
  'Compare sua mão com a do avatar. A letra detectada aparece ao lado da câmera.',
  'Faça a letra de memória. Você pode voltar à demonstração quando precisar.',
]

const curricula = { signal: lesson, letter: manualAlphabet }
const listLetters = new Intl.ListFormat('pt-BR', { type: 'conjunction' })

const quizzes = [
  ['Como fica a palma no sinal Cinco?', ['Para a frente', 'Para baixo', 'Atrás da cabeça'], 0],
  ['Onde fica a mão aberta no sinal Espelho?', ['Perto da cintura', 'À frente do rosto', 'Atrás do ombro'], 1],
  ['Qual é a trajetória do dedo indicador no sinal Amarelo?', ['Do nariz ao ombro', 'Do peito ao queixo', 'Da testa em direção ao nariz'], 2],
]

export function letterPracticeFeedback(result, target, supportedLetters) {
  if (!['accepted', 'inconclusive'].includes(result.state)) return result
  if (supportedLetters && !supportedLetters.includes(target.label)) {
    return { state: 'unavailable', message: `Use o avatar para praticar a letra ${target.label}.` }
  }
  if (result.state !== 'accepted') return result
  if (result.id === target.id) return { ...result, message: `A leitura identificou a letra ${target.label}.` }
  const detected = manualAlphabet.find(letter => letter.id === result.id)
  const reading = detected ? `A leitura indicou ${detected.label}. ` : ''
  return { state: 'inconclusive', message: `${reading}Tente a letra ${target.label} novamente.` }
}

export function mountPractice(main, { createPlayer, openEngine }) {
  let storage
  try { storage = localStorage } catch {}
  const progress = { signal: readProgress(storage), letter: readProgress(storage, 'letter') }
  const selected = { signal: 0, letter: 0 }
  let mode = 'signal'
  let step = 0
  let supportedLetters

  main.innerHTML = `
    <div class="page-heading practice-heading">
      <div>
        <p class="eyebrow">Lição inicial</p>
        <h1>Pratique Libras</h1>
        <p data-practice-summary></p>
      </div>
      <div class="lesson-progress">
        <span class="progress-badge" data-progress></span>
        <progress aria-label="Progresso da lição" max="${lesson.length}" value="0"></progress>
      </div>
    </div>
    <div class="lesson-settings panel">
      <label class="signal-picker">Conteúdo
        <select data-practice-mode>
          <option value="signal">Sinais</option>
          <option value="letter">Alfabeto</option>
        </select>
      </label>
      <label class="signal-picker"><span data-picker-label>Sinal da lição</span>
        <select data-signal></select>
      </label>
      <ol class="stage-list">
        ${stages.map(([label], index) =>
          `<li><button class="stage-button" type="button" data-stage="${index}"><span>${index + 1}</span>${label}</button></li>`).join('')}
      </ol>
    </div>
    <div class="lesson-instructions">
      <h2 data-stage-title></h2>
      <p data-step-intro></p>
      <p class="muted" data-observation></p>
      <p class="muted" data-letter-coverage role="status" hidden></p>
    </div>
    <div class="media-layout">
      ${playerMarkup()}
      ${captureMarkup()}
    </div>
    <section class="panel content-panel practice-activity" aria-labelledby="activity-heading">
      <h2 id="activity-heading">Atividade sem câmera</h2>
      <form>
        <fieldset data-quiz></fieldset>
        <button class="button" type="submit">Conferir resposta</button>
      </form>
      <p class="inline-status" data-quiz-status role="status" hidden></p>
      <button class="button primary" type="button" data-practice-next hidden>Praticar com ajuda</button>
    </section>
    <section class="panel content-panel practice-activity" data-letter-observation aria-labelledby="letter-observation-heading" hidden>
      <h2 id="letter-observation-heading">Registro da observação</h2>
      <button class="button" type="button" data-observe-letter>Marcar letra como observada</button>
    </section>
    <section class="panel content-panel practice-activity" aria-labelledby="review-heading">
      <h2 id="review-heading">Revisão</h2>
      <p class="muted" data-review-reason></p>
      <button class="button" type="button" data-review></button>
    </section>
    <p class="inline-status subtle" data-practice-notice></p>`

  const player = mountPlayerControls(main, createPlayer)
  const avatar = main.querySelector('[data-avatar]').closest('.media-card')
  const activity = main.querySelector('.practice-activity')
  const letterActivity = main.querySelector('[data-letter-observation]')
  const observeLetter = main.querySelector('[data-observe-letter]')
  const fieldset = main.querySelector('[data-quiz]')
  const quizStatus = main.querySelector('[data-quiz-status]')
  const practiceNext = main.querySelector('[data-practice-next]')
  const progressLabel = main.querySelector('[data-progress]')
  const progressBar = main.querySelector('progress')
  const reviewButton = main.querySelector('[data-review]')
  const reviewReason = main.querySelector('[data-review-reason]')
  const observation = main.querySelector('[data-observation]')
  const title = main.querySelector('[data-stage-title]')
  const intro = main.querySelector('[data-step-intro]')
  const summary = main.querySelector('[data-practice-summary]')
  const notice = main.querySelector('[data-practice-notice]')
  const letterCoverage = main.querySelector('[data-letter-coverage]')
  const tabs = [...main.querySelectorAll('[data-stage]')]
  const modePicker = main.querySelector('[data-practice-mode]')
  const picker = main.querySelector('[data-signal]')
  const pickerLabel = main.querySelector('[data-picker-label]')
  const current = () => curricula[mode][selected[mode]]
  let reviewTarget

  function renderProgress() {
    const entries = Object.values(progress[mode])
    const count = entries.filter(entry => isComplete(entry, mode)).length
    const observed = entries.filter(entry => entry.observed).length
    const letters = mode === 'letter'
    progressLabel.textContent = letters
      ? `${observed} de ${entries.length} letras observadas${count ? ` · ${count} concluídas com a webcam` : ''}`
      : `${count} de ${entries.length} sinais concluídos`
    progressBar.setAttribute('aria-label', letters ? 'Letras observadas' : 'Progresso da lição')
    progressBar.max = entries.length
    progressBar.value = letters ? observed : count
    reviewTarget = reviewOrder(progress[mode], mode)[0]
    const entry = progress[mode][reviewTarget.id]
    reviewButton.textContent = `Revisar ${reviewTarget.label}`
    if (letters) {
      const done = progress.letter[current().id].observed
      observeLetter.disabled = done
      observeLetter.textContent = done ? 'Letra observada' : 'Marcar letra como observada'
      reviewReason.textContent = entry.retryStreak > 0
        ? 'A sugestão prioriza letras que ainda precisam de uma nova tentativa.'
        : observed < entries.length ? 'A sugestão prioriza letras ainda não observadas.'
          : 'Você observou todo o alfabeto e pode rever as demonstrações.'
    } else {
      reviewReason.textContent = entry.retryStreak > 0
        ? 'A sugestão prioriza sinais que ainda precisam de uma nova tentativa.'
        : count === entries.length ? 'Você concluiu as etapas da lição e pode praticar de novo.'
          : 'A sugestão prioriza sinais com etapas pendentes.'
    }
  }

  function store() {
    writeProgress(storage, progress[mode], mode)
    renderProgress()
  }

  function renderCoverage() {
    letterCoverage.hidden = mode !== 'letter'
    if (letterCoverage.hidden) return
    if (!supportedLetters) {
      letterCoverage.textContent = 'A leitura pela webcam depende das letras disponíveis no modelo local.'
    } else if (!supportedLetters.length) {
      letterCoverage.textContent = 'O reconhecimento de letras está indisponível no modelo local. Use o avatar para praticar.'
    } else {
      const support = supportedLetters.length === manualAlphabet.length ? 'todas as 27 letras' : listLetters.format(supportedLetters)
      const usage = supportedLetters.includes(current().label)
        ? '' : ` Para a letra ${current().label}, pratique com o avatar.`
      letterCoverage.textContent = `O modelo local tem leitura experimental para ${support}.${usage}`
    }
  }

  const camera = mountCapture(main, {
    openEngine,
    enabled: false,
    captureMode: () => current().kind === 'letter' ? 'letter' : 'isolated',
    onReady(engine, captureMode) {
      if (captureMode !== 'letter') return
      const labels = engine.alphabetCatalog ?? []
      supportedLetters = manualAlphabet.map(letter => letter.label).filter(label => labels.includes(label))
      renderCoverage()
    },
    onLetter(label) {
      if (!label || mode !== 'letter' || !step) return
      const detected = manualAlphabet.find(letter => letter.label === label)
      const result = letterPracticeFeedback({ state: 'accepted', id: detected?.id }, current(), supportedLetters)
      if (result.state !== 'accepted') return
      markAttempt(progress.letter[current().id], step, result)
      store()
    },
    interpret(result) {
      return practiceFeedback(result, current(), step)
    },
    onResult(result) {
      markAttempt(progress[mode][current().id], step, result)
      store()
    },
  })

  function renderPicker() {
    pickerLabel.textContent = mode === 'letter' ? 'Letra' : 'Sinal da lição'
    picker.innerHTML = curricula[mode].map(({ label, id }) => `<option value="${id}">${label}</option>`).join('')
    picker.value = current().id
  }

  function render() {
    const entry = current()
    const letters = entry.kind === 'letter'
    const label = letters ? `Letra ${entry.label}` : entry.label
    title.textContent = `${label} · ${stages[step][0]}`
    intro.textContent = letters ? letterInstructions[step] : stages[step][1]
    summary.textContent = letters ? 'Observe e pratique as letras de A a Z e Ç.' : 'Observe o avatar e pratique sinais isolados com a webcam.'
    notice.textContent = letters ? 'As demonstrações do alfabeto estão em revisão linguística.'
      : 'Protótipo experimental. Os sinais e as dicas estão em revisão linguística.'
    observation.textContent = entry.watch ?? ''
    observation.hidden = letters || step === 2
    if (!letters) {
      const [question, answers] = quizzes[selected.signal]
      fieldset.innerHTML = `<legend>${question}</legend>
        ${answers.map((answer, index) => `<label class="check-label"><input type="radio" name="answer" value="${index}" required> ${answer}</label>`).join('')}`
    }
    activity.hidden = letters || step !== 0
    letterActivity.hidden = !letters || step !== 0
    quizStatus.hidden = true
    practiceNext.hidden = true
    player.setSequence(step === 2 ? [] : [entry])
    avatar.hidden = step === 2
    camera.reset()
    camera.setEnabled(step !== 0)
    tabs.forEach((button, index) => {
      if (step === index) button.setAttribute('aria-current', 'step')
      else button.removeAttribute('aria-current')
    })
    renderCoverage()
    renderProgress()
  }

  tabs.forEach((button, index) => button.addEventListener('click', () => {
    if (step === index) return
    step = index
    render()
  }))
  practiceNext.addEventListener('click', () => {
    tabs[1].click()
    tabs[1].focus()
  })
  modePicker.addEventListener('change', () => {
    mode = modePicker.value
    step = 0
    renderPicker()
    render()
  })
  picker.addEventListener('change', () => {
    selected[mode] = curricula[mode].findIndex(entry => entry.id === picker.value)
    step = 0
    render()
  })
  reviewButton.addEventListener('click', () => {
    selected[mode] = curricula[mode].indexOf(reviewTarget)
    picker.value = reviewTarget.id
    step = reviewStep(progress[mode][reviewTarget.id], mode)
    render()
    tabs[step].focus()
  })
  observeLetter.addEventListener('click', () => {
    if (mode !== 'letter' || step !== 0) return
    progress.letter[current().id].observed = true
    store()
  })
  main.querySelector('form').addEventListener('submit', event => {
    event.preventDefault()
    if (mode !== 'signal' || step !== 0) return
    const answer = new FormData(event.currentTarget).get('answer')
    if (answer === null) return
    const correct = Number(answer) === quizzes[selected.signal][2]
    quizStatus.hidden = false
    quizStatus.dataset.state = correct ? 'accepted' : 'inconclusive'
    quizStatus.textContent = correct ? 'Resposta correta.' : 'Observe o avatar novamente e tente outra resposta.'
    practiceNext.hidden = !correct
    if (correct) {
      progress.signal[current().id].observed = true
      progress.signal[current().id].understood = true
      store()
    }
  })

  renderPicker()
  render()
  return () => {
    camera.dispose()
    player.dispose()
  }
}
