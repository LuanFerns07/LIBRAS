import { addAttempt, checkpoints, createSession, exportMetadata, options, setCheckpoint, summarize } from './registro.js'

const sessionForm = document.querySelector('#session-form')
const attemptForm = document.querySelector('#attempt-form')
const workflow = document.querySelector('#workflow')
const mainTable = document.querySelector('#attempts')
const tbody = mainTable.querySelector('tbody')
const conditionCounts = document.querySelector('#counts-by-condition')
const fields = attemptForm.elements
const loadVersion = document.querySelector('#load-version')
let session

function fill(select, key, empty = true) {
  if (empty) select.add(new Option('Selecione', ''))
  for (const [value, label] of options[key]) select.add(new Option(label, value))
  if (select.dataset.default) select.value = select.dataset.default
}

function show(id, message, error = false) {
  const status = document.getElementById(id)
  status.dataset.error = String(error)
  status.textContent = message
}

function selected(key, value) {
  return options[key].find(([id]) => id === value)?.[1] ?? 'Sem palavra exibida'
}

function valueOf(form) {
  return Object.fromEntries(new FormData(form))
}

function updateSummary() {
  const summary = summarize(session)
  show('count', summary.attempts
    ? summary.attempts + (summary.attempts === 1 ? ' tentativa registrada.' : ' tentativas registradas.')
    : 'Nenhuma tentativa registrada.')
  const items = Object.entries(summary.byCondition).filter(([, count]) => count > 0).map(([id, count]) => {
    const item = document.createElement('li')
    item.textContent = selected('condition', id) + ' · ' + count
    return item
  })
  conditionCounts.replaceChildren(...items)
}

function updateInputs() {
  const lesson = fields.flow.value !== '' && fields.flow.value !== 'free'
  fields.target.disabled = !lesson
  fields.target.required = lesson

  const accepted = fields.decision.value === 'accepted'
  fields.prediction.disabled = !accepted
  fields.prediction.required = accepted
  if (!accepted) fields.prediction.value = ''

  const hint = fields.decision.value === 'hint'
  if (!hint) fields.shownParameter.value = 'none'

  const imported = fields.captureTiming.value.trim() !== ''
  for (const name of ['classifierCalls', 'latencyMs', 'latencyMethod']) {
    fields[name].disabled = imported
  }
}

function addRow(attempt) {
  const labels = [
    attempt.number,
    selected('condition', attempt.condition),
    selected('referenceLabel', attempt.reference.label),
    selected('decision', attempt.application.decision),
    selected('label', attempt.application.prediction),
  ]
  const row = document.createElement('tr')
  for (const value of labels) {
    const cell = document.createElement('td')
    cell.textContent = value
    row.append(cell)
  }
  tbody.append(row)
  mainTable.hidden = false
}

for (const select of document.querySelectorAll('select[data-options]')) fill(select, select.dataset.options)
for (const [id, title] of checkpoints) {
  const label = document.createElement('label')
  label.textContent = title
  const select = document.createElement('select')
  select.name = id
  fill(select, 'checkpointResult', false)
  select.addEventListener('change', () => setCheckpoint(session, id, select.value))
  label.append(select)
  document.querySelector('#checkpoints').append(label)
}

loadVersion.hidden = !location.pathname.startsWith('/validacao/')
loadVersion.addEventListener('click', async () => {
  loadVersion.disabled = true
  show('version-status', 'Carregando a versão do pacote…')
  try {
    const response = await fetch('versao.json')
    if (!response.ok) throw new Error('Não foi possível carregar a versão.')
    const version = await response.json()
    if (session) return
    for (const name of ['commit', 'catalog', 'avatar', 'modelSha256', 'manifestSha256']) {
      sessionForm.elements[name].value = version[name]
    }
    if (version.alphabetSha256) sessionForm.elements.alphabetSha256.value = version.alphabetSha256
    show('version-status', 'Versão do pacote preenchida.')
  } catch {
    show('version-status', 'Confira a versão do pacote e preencha os campos manualmente.', true)
  } finally {
    if (!session) loadVersion.disabled = false
  }
})

sessionForm.addEventListener('submit', event => {
  event.preventDefault()
  const input = { ...valueOf(sessionForm), consent: sessionForm.elements.consent.checked }
  try {
    session = createSession(input)
    for (const control of sessionForm.elements) control.disabled = true
    workflow.hidden = false
    show('session-status', 'Sessão ' + session.sessionId + ' iniciada.')
    updateInputs()
    document.querySelector('#attempt-heading').focus()
  } catch (error) {
    show('session-status', error.message, true)
  }
})

fields.flow.addEventListener('change', updateInputs)
fields.decision.addEventListener('change', updateInputs)
fields.captureTiming.addEventListener('input', updateInputs)

attemptForm.addEventListener('submit', event => {
  event.preventDefault()
  const input = valueOf(attemptForm)
  try {
    const attempt = addAttempt(session, input)
    addRow(attempt)
    updateSummary()
    show('attempt-status', 'Tentativa ' + attempt.number + ' registrada.')

    attemptForm.reset()
    for (const name of ['flow', 'target', 'hand', 'lighting', 'framing']) fields[name].value = input[name] ?? ''
    for (const field of attemptForm.querySelectorAll('select[data-default]')) {
      if (['hand', 'lighting', 'framing'].includes(field.name)) continue
      field.value = field.dataset.default
    }
    updateInputs()
    fields.condition.focus()
  } catch (error) {
    show('attempt-status', error.message, true)
  }
})

document.querySelector('#download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([exportMetadata(session)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'librasia-validacao-' + session.sessionId + '.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  show('download-status', 'Download solicitado. Confira o arquivo antes de fechar esta aba.')
})
