import { lesson } from '../catalog.js'
import { captureMarkup, mountCapture } from '../capture-panel.js'
import { mountPlayerControls, playerMarkup } from '../player-controls.js'
import { markAttempt, readProgress, writeProgress } from '../progress.js'
import { practiceFeedback } from '../recognition/feedback.js'

const stages = [
  ['Observar', 'Reproduza a demonstração e responda à atividade sem câmera.'],
  ['Praticar com ajuda', 'Compare sua mão com a do avatar. Ative a câmera e faça um sinal por tentativa.'],
  ['Tentar com menos ajuda', 'Faça o sinal de memória. Você pode voltar à demonstração quando precisar.'],
]

const quizzes = [
  ['Como fica a palma no sinal Cinco?', ['Para a frente', 'Para baixo', 'Atrás da cabeça'], 0],
  ['Onde fica a mão aberta no sinal Espelho?', ['Perto da cintura', 'À frente do rosto', 'Atrás do ombro'], 1],
  ['Qual é a trajetória do dedo indicador no sinal Amarelo?', ['Do nariz ao ombro', 'Do peito ao queixo', 'Da testa em direção ao nariz'], 2],
]

export function mountPractice(main, { createPlayer, openEngine }) {
  let storage
  try { storage = localStorage } catch {}
  const progress = readProgress(storage)
  let signal = 0
  let step = 0

  main.innerHTML = `
    <div class="page-heading practice-heading">
      <div>
        <p class="eyebrow">Lição inicial</p>
        <h1>Pratique Libras</h1>
        <p>Observe o avatar e pratique sinais isolados com a webcam.</p>
      </div>
      <span class="progress-badge" data-progress></span>
    </div>
    <div class="lesson-settings panel">
      <label class="signal-picker">Sinal da lição
        <select data-signal>
          ${lesson.map(({ label, id }) => `<option value="${id}">${label}</option>`).join('')}
        </select>
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
    </section>
    <p class="inline-status subtle">Protótipo experimental. Os sinais e as dicas estão em revisão linguística.</p>`

  const player = mountPlayerControls(main, createPlayer)
  const activity = main.querySelector('.practice-activity')
  const fieldset = main.querySelector('[data-quiz]')
  const quizStatus = main.querySelector('[data-quiz-status]')
  const progressLabel = main.querySelector('[data-progress]')
  const observation = main.querySelector('[data-observation]')
  const title = main.querySelector('[data-stage-title]')
  const intro = main.querySelector('[data-step-intro]')
  const tabs = [...main.querySelectorAll('[data-stage]')]
  const picker = main.querySelector('[data-signal]')
  const current = () => lesson[signal]

  function store() {
    writeProgress(storage, progress)
    const count = Object.values(progress).filter(entry => entry.observed && entry.guided && entry.independent && entry.understood).length
    progressLabel.textContent = `${count} de ${lesson.length} sinais concluídos`
  }

  const camera = mountCapture(main, {
    openEngine,
    enabled: false,
    interpret(result) { return practiceFeedback(result, current(), step) },
    onResult(result) {
      markAttempt(progress[current().id], step, result)
      store()
    },
  })

  function render() {
    const entry = current()
    const [question, answers] = quizzes[signal]
    title.textContent = `${entry.label} · ${stages[step][0]}`
    intro.textContent = stages[step][1]
    observation.textContent = step < 2 ? entry.watch : ''
    observation.hidden = step === 2
    fieldset.innerHTML = `<legend>${question}</legend>
      ${answers.map((answer, index) => `<label class="check-label"><input type="radio" name="answer" value="${index}" required> ${answer}</label>`).join('')}`
    activity.hidden = step !== 0
    quizStatus.hidden = true
    player.setSequence(step === 2 ? [] : [entry])
    camera.reset()
    camera.setEnabled(step !== 0)
    tabs.forEach((button, index) => {
      if (step === index) button.setAttribute('aria-current', 'step')
      else button.removeAttribute('aria-current')
    })
    store()
  }

  tabs.forEach((button, index) => button.addEventListener('click', () => {
    if (step === index) return
    step = index
    render()
  }))
  picker.addEventListener('change', () => {
    signal = lesson.findIndex(entry => entry.id === picker.value)
    step = 0
    render()
  })
  main.querySelector('form').addEventListener('submit', event => {
    event.preventDefault()
    const answer = new FormData(event.currentTarget).get('answer')
    if (answer === null) return
    const correct = Number(answer) === quizzes[signal][2]
    quizStatus.hidden = false
    quizStatus.dataset.state = correct ? 'accepted' : 'inconclusive'
    quizStatus.textContent = correct ? 'Resposta correta. Avance para praticar com ajuda.' : 'Observe o avatar novamente e tente outra resposta.'
    if (correct) {
      progress[current().id].observed = true
      progress[current().id].understood = true
      store()
    }
  })

  render()
  return () => {
    camera.dispose()
    player.dispose()
  }
}
