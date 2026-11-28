import { lesson, manualAlphabet } from '../catalog.js'
import { captureMarkup, mountCapture } from '../capture-panel.js'
import { mountPlayerControls, playerMarkup } from '../player-controls.js'
import { readActivity, recordAttempt, summarizeActivity } from '../activity.js'
import { readPreferences } from '../preferences.js'
import { isComplete, markAttempt, readProgress, reviewOrder, reviewStep, writeProgress } from '../progress.js'
import { attemptParts, practiceFeedback } from '../recognition/feedback.js'

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
const comparisonTargets = {
  'signal-cinco': 'signal-espelho',
  'signal-espelho': 'signal-cinco',
  'signal-amarelo': 'signal-espelho',
}

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
  let comparing = false

  main.innerHTML = `
    <div class="practice-grid">
      <div class="practice-lesson">
        <div class="lesson-meta">
          <label class="lesson-select"><span class="visually-hidden">Conteúdo</span>
            <select data-practice-mode>
              <option value="signal">Sinais</option>
              <option value="letter">Alfabeto</option>
            </select>
          </label>
          <label class="lesson-select"><span class="visually-hidden" data-picker-label>Sinal da lição</span>
            <select data-signal></select>
          </label>
        </div>
        <div class="page-heading practice-heading">
          <p class="eyebrow" data-lesson-eyebrow></p>
          <h1 data-lesson-title></h1>
          <p class="visually-hidden" data-practice-summary></p>
          <p class="lesson-watch" data-observation></p>
        </div>
        <ol class="stage-list" aria-label="Etapas">
          ${stages.map(([label], index) =>
            `<li><button class="stage-button" type="button" data-stage="${index}"><span>${index + 1}</span>${label}</button></li>`).join('')}
        </ol>
        <div class="lesson-instructions">
          <h2 data-stage-title></h2>
          <p data-step-intro></p>
          <p class="muted" id="practice-contrast" role="status" hidden></p>
          <button class="button" type="button" data-practice-compare aria-controls="practice-contrast" hidden></button>
          <p class="muted" data-letter-coverage role="status" hidden></p>
          <section class="practice-activity" aria-labelledby="activity-heading">
            <h3 id="activity-heading">Atividade sem câmera</h3>
            <form>
              <fieldset data-quiz></fieldset>
              <button class="button" type="submit">Conferir resposta</button>
            </form>
            <p class="inline-status" data-quiz-status role="status" hidden></p>
            <button class="button primary" type="button" data-practice-next hidden>Praticar com ajuda</button>
          </section>
          <section class="practice-activity" data-letter-observation aria-labelledby="letter-observation-heading" hidden>
            <h3 id="letter-observation-heading">Registro da observação</h3>
            <button class="button" type="button" data-observe-letter>Marcar letra como observada</button>
          </section>
        </div>
        <p class="lesson-notice" data-practice-notice></p>
      </div>
      <div class="practice-stage">
        ${captureMarkup()}
      </div>
      <div class="practice-side">
        ${playerMarkup()}
        <section class="panel stats-panel" aria-labelledby="stats-heading">
          <h2 id="stats-heading">Seu progresso</h2>
          <div class="lesson-progress">
            <span class="progress-badge" data-progress></span>
            <progress aria-label="Progresso da lição" max="${lesson.length}" value="0"></progress>
          </div>
          <dl class="stat-row">
            <div><dt>Hoje</dt><dd data-stat-today>0</dd></div>
            <div><dt>Seguidos</dt><dd><span data-stat-streak>0</span><small> dias</small></dd></div>
            <div><dt>Semana</dt><dd data-stat-week>0</dd></div>
          </dl>
          <div class="week-goal" data-goal>
            <p class="goal-title"><strong data-goal-title>Meta da semana</strong><span data-goal-count></span></p>
            <ol class="goal-days" data-goal-days aria-hidden="true"></ol>
            <p class="goal-note" data-goal-note></p>
          </div>
          <div class="week-chart">
            <p class="week-title"><span>Tentativas nos últimos 7 dias</span></p>
            <ol class="week-bars" data-week aria-label="Tentativas por dia nos últimos 7 dias"></ol>
            <p class="week-empty" data-week-empty hidden>Sem tentativas nesta semana. A primeira aparece aqui.</p>
          </div>
          <div class="review-box">
            <p class="muted" data-review-reason></p>
            <button class="button primary" type="button" data-review></button>
          </div>
        </section>
      </div>
    </div>`

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
  const comparisonNote = main.querySelector('#practice-contrast')
  const compare = main.querySelector('[data-practice-compare]')
  const title = main.querySelector('[data-stage-title]')
  const lessonTitle = main.querySelector('[data-lesson-title]')
  const lessonEyebrow = main.querySelector('[data-lesson-eyebrow]')
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
  let activityLog = readActivity(storage)
  const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
  const weekdayNames = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

  function renderStats() {
    const summary = summarizeActivity(activityLog)
    main.querySelector('[data-stat-today]').textContent = summary.today
    main.querySelector('[data-stat-streak]').textContent = summary.streak
    main.querySelector('[data-stat-week]').textContent = summary.total
    main.querySelector('[data-week-empty]').hidden = summary.total > 0
    const goal = main.querySelector('[data-goal]')
    goal.dataset.reached = String(summary.goalReached)
    main.querySelector('[data-goal-title]').textContent = summary.goalReached ? 'Semana completa' : 'Meta da semana'
    main.querySelector('[data-goal-count]').textContent = `${Math.min(summary.activeDays, summary.goal)} de ${summary.goal} dias`
    main.querySelector('[data-goal-days]').innerHTML = Array.from({ length: summary.goal }, (_, index) =>
      `<li${index < summary.activeDays ? ' class="on"' : ''}></li>`).join('')
    const left = summary.goal - summary.activeDays
    main.querySelector('[data-goal-note]').textContent = summary.goalReached
      ? `Conquista desbloqueada. Seu recorde é de ${summary.bestStreak} ${summary.bestStreak === 1 ? 'dia' : 'dias'} seguidos.`
      : `Faltam ${left} ${left === 1 ? 'dia' : 'dias'} de prática. Recorde: ${summary.bestStreak} ${summary.bestStreak === 1 ? 'dia' : 'dias'} seguidos.`
    const most = Math.max(1, ...summary.week.map(entry => entry.count))
    const list = main.querySelector('[data-week]')
    list.innerHTML = summary.week.map(({ weekday, count }, index) => `
      <li${index === 6 ? ' class="today"' : ''}>
        <span class="bar-value">${count || ''}</span>
        <span class="bar${count ? '' : ' empty'}" aria-hidden="true"></span>
        <span class="bar-day" aria-hidden="true">${weekdays[weekday]}</span>
        <span class="visually-hidden">${index === 6 ? 'Hoje' : weekdayNames[weekday]}: ${count} tentativas</span>
      </li>`).join('')
    // Altura definida pelo CSSOM: a Content-Security-Policy bloqueia atributos style no HTML.
    list.querySelectorAll('.bar').forEach((bar, index) => {
      const { count } = summary.week[index]
      bar.style.setProperty('--h', `${count ? Math.max(8, count / most * 100) : 0}%`)
    })
  }

  function countAttempt() {
    activityLog = recordAttempt(storage, activityLog)
    renderStats()
  }

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
    renderStories()
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

  function renderStories() {
    const items = curricula[mode]
    const at = selected[mode]
    camera?.setStories(items.map((entry, index) => {
      const done = isComplete(progress[mode][entry.id], mode)
      return {
        label: entry.label,
        state: index === at ? 'current' : done ? 'done' : 'todo',
        fill: index === at ? (done ? 1 : (step + 1) / stages.length) : undefined,
      }
    }))
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
    handPoints: readPreferences(storage).handPoints,
    captureMode: () => current().kind === 'letter' ? 'letter' : 'isolated',
    caption: () => current().kind === 'letter'
      ? [step === 2 ? 'De memória · letra' : 'Faça a letra', current().label]
      : [step === 2 ? 'De memória · sinal' : 'Faça o sinal', current().label],
    celebrateAccepted: true,
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
      countAttempt()
      camera.celebrate()
    },
    interpret(result) {
      const feedback = practiceFeedback(result, current(), step)
      const parts = attemptParts(result, current(), { hand: readPreferences(storage).hand })
      return parts.length ? { ...feedback, parts } : feedback
    },
    onResult(result) {
      markAttempt(progress[mode][current().id], step, result)
      store()
      countAttempt()
    },
  })

  function renderPicker() {
    pickerLabel.textContent = mode === 'letter' ? 'Letra' : 'Sinal da lição'
    picker.innerHTML = curricula[mode].map(({ label, id }) => `<option value="${id}">${label}</option>`).join('')
    picker.value = current().id
  }

  function renderDemonstration(autoplay = false) {
    const entry = current()
    const other = step === 0 && mode === 'signal' ? lesson.find(signal => signal.id === comparisonTargets[entry.id]) : undefined
    const sequence = step === 2 ? [] : [entry]
    compare.hidden = !other
    if (other) compare.textContent = comparing ? `Exibir só ${entry.label}` : `Comparar com ${other.label}`
    comparisonNote.hidden = !(other && comparing)
    if (other && comparing) {
      comparisonNote.textContent = `${other.label}. ${other.watch}`
      sequence.push(other)
    }
    player.setSequence(sequence, autoplay)
  }

  function render() {
    const entry = current()
    const letters = entry.kind === 'letter'
    const label = letters ? `Letra ${entry.label}` : entry.label
    title.textContent = stages[step][0]
    lessonTitle.textContent = label
    const position = curricula[mode].indexOf(entry) + 1
    lessonEyebrow.textContent = letters
      ? `Alfabeto · letra ${position} de ${curricula[mode].length}`
      : `Lição inicial · sinal ${position} de ${curricula[mode].length}`
    intro.textContent = letters ? letterInstructions[step] : stages[step][1]
    summary.textContent = letters ? 'Observe e pratique as letras de A a Z e Ç.' : 'Observe o avatar e pratique sinais isolados com a webcam.'
    notice.textContent = letters ? 'As demonstrações do alfabeto estão em revisão linguística.'
      : 'Protótipo experimental. Os sinais e as dicas estão em revisão linguística.'
    observation.textContent = entry.watch ?? ''
    observation.hidden = !observation.textContent || step === 2
    if (!letters) {
      const [question, answers] = quizzes[selected.signal]
      fieldset.innerHTML = `<legend>${question}</legend>
        ${answers.map((answer, index) => `<label class="check-label"><input type="radio" name="answer" value="${index}" required> ${answer}</label>`).join('')}`
    }
    activity.hidden = letters || step !== 0
    letterActivity.hidden = !letters || step !== 0
    quizStatus.hidden = true
    practiceNext.hidden = true
    comparing = false
    renderDemonstration()
    // Na prática com ajuda, o avatar repete o sinal devagar ao lado da câmera.
    // O nível do perfil define a velocidade do loop: mais lento para quem está começando.
    const loopSpeed = { iniciante: '.4', basico: '.65', fluente: '1' }[readPreferences(storage).level] ?? '.65'
    player.setLoop(step === 1, step === 1 ? loopSpeed : '1')
    avatar.hidden = step === 2
    camera.reset()
    camera.setEnabled(step !== 0)
    camera.refreshCaption()
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
  compare.addEventListener('click', () => {
    comparing = !comparing
    renderDemonstration(true)
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
  renderStats()
  return () => {
    camera.dispose()
    player.dispose()
  }
}
