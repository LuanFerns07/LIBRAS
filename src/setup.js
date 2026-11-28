import { cleanName, nameLimit, readPreferences, writePreferences } from './preferences.js'
import { icon } from './shell.js'

const characterKey = 'librasia-personagem'

function readCharacter(storage) {
  try {
    const saved = storage?.getItem(characterKey)
    if (saved === 'mulher' || saved === 'homem') return saved
  } catch {}
  return 'mulher'
}

// Configuração feita uma vez, ao abrir o site: câmera, pontos das mãos, personagem e tema.
export function mountSetup(root, { setTheme, getTheme }) {
  let storage
  try { storage = localStorage } catch {}
  const dialog = document.createElement('dialog')
  dialog.className = 'setup-dialog'
  dialog.setAttribute('aria-labelledby', 'setup-title')
  dialog.innerHTML = `
    <form method="dialog" class="setup-form">
      <h2 id="setup-title">Antes de começar</h2>
      <p class="setup-lead">Ajuste uma vez e pratique sem interrupções. Depois, foto, idade e nível ficam em Meu perfil, no rodapé do menu.</p>
      <label class="setup-name">
        <span>Como podemos te chamar?</span>
        <input type="text" name="user-name" data-pref-name required maxlength="${nameLimit}" autocomplete="nickname" spellcheck="false" placeholder="Seu nome">
      </label>
      <section class="setup-row">
        <div>
          <h3>Câmera</h3>
          <p>A imagem fica no seu dispositivo e não é enviada.</p>
          <p class="setup-status" data-camera-result role="status"></p>
        </div>
        <button class="button" type="button" data-camera-permission><span class="button-icon">${icon('camera')}</span><span>Permitir câmera</span></button>
      </section>
      <section class="setup-row">
        <div>
          <h3>Pontos das mãos</h3>
          <p>Mostra sobre a câmera os pontos que o reconhecimento enxerga.</p>
        </div>
        <label class="setup-switch"><input type="checkbox" data-pref-points><span aria-hidden="true"></span><span class="visually-hidden">Mostrar pontos das mãos</span></label>
      </section>
      <section class="setup-row">
        <div>
          <h3>Personagem</h3>
          <p>Quem demonstra os sinais no avatar 3D.</p>
        </div>
        <div class="segmented" role="radiogroup" aria-label="Personagem">
          <label><input type="radio" name="character" value="mulher"><span>Mulher</span></label>
          <label><input type="radio" name="character" value="homem"><span>Homem</span></label>
        </div>
      </section>
      <section class="setup-row">
        <div>
          <h3>Tema</h3>
          <p>Também muda no rodapé do menu.</p>
        </div>
        <div class="segmented" role="radiogroup" aria-label="Tema">
          <label><input type="radio" name="theme" value="light"><span>Claro</span></label>
          <label><input type="radio" name="theme" value="dark"><span>Escuro</span></label>
        </div>
      </section>
      <div class="setup-actions">
        <button class="button primary" value="done">Começar a praticar</button>
      </div>
    </form>`
  root.append(dialog)

  const result = dialog.querySelector('[data-camera-result]')
  const permission = dialog.querySelector('[data-camera-permission]')
  const points = dialog.querySelector('[data-pref-points]')
  const nameInput = dialog.querySelector('[data-pref-name]')
  const form = dialog.querySelector('form')

  function renderCamera(state) {
    result.dataset.state = state
    result.textContent = {
      unknown: 'Ainda não autorizada.',
      granted: 'Câmera autorizada.',
      denied: 'Não foi possível usar a câmera. Libere o acesso nas configurações do navegador.',
      busy: 'Aguardando a autorização do navegador…',
    }[state]
    permission.hidden = state === 'granted'
  }

  function fill() {
    const preferences = readPreferences(storage)
    points.checked = preferences.handPoints
    nameInput.value = preferences.name
    renderCamera(preferences.camera)
    dialog.querySelector(`input[name="character"][value="${readCharacter(storage)}"]`).checked = true
    dialog.querySelector(`input[name="theme"][value="${getTheme()}"]`).checked = true
  }

  permission.addEventListener('click', async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      writePreferences(storage, { camera: 'denied' })
      renderCamera('denied')
      return
    }
    renderCamera('busy')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      for (const track of stream.getTracks()) track.stop()
      writePreferences(storage, { camera: 'granted' })
      renderCamera('granted')
    } catch {
      writePreferences(storage, { camera: 'denied' })
      renderCamera('denied')
    }
  })
  points.addEventListener('change', () => {
    writePreferences(storage, { handPoints: points.checked })
    window.dispatchEvent(new CustomEvent('librasia:preferencias'))
  })
  dialog.addEventListener('change', event => {
    const { name, value } = event.target
    if (name === 'character') {
      try { storage?.setItem(characterKey, value) } catch {}
      window.dispatchEvent(new CustomEvent('librasia:personagem', { detail: value }))
    }
    if (name === 'theme') setTheme(value)
  })
  nameInput.addEventListener('input', () => {
    nameInput.setCustomValidity(cleanName(nameInput.value) ? '' : 'Digite um nome para continuar.')
  })
  // O nome é obrigatório: sem ele, Esc não fecha a configuração.
  dialog.addEventListener('cancel', event => {
    if (!readPreferences(storage).name) event.preventDefault()
  })
  form.addEventListener('submit', event => {
    const name = cleanName(nameInput.value)
    if (!name) {
      event.preventDefault()
      nameInput.setCustomValidity('Digite um nome para continuar.')
      nameInput.reportValidity()
      return
    }
    writePreferences(storage, { name, configured: true })
    window.dispatchEvent(new CustomEvent('librasia:preferencias'))
  })

  function open() {
    fill()
    if (!dialog.open) dialog.showModal?.()
    if (!nameInput.value) nameInput.focus()
  }

  const saved = readPreferences(storage)
  if (!saved.configured || !saved.name) open()
  return { open }
}
