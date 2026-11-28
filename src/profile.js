import { cleanName, nameLimit, readPhoto, readPreferences, writePhoto, writePreferences } from './preferences.js'

const ageLabels = { 'ate-12': 'Até 12', '13-17': '13 a 17', '18-59': '18 a 59', '60+': '60 ou mais' }
const handLabels = { right: 'Destra', left: 'Canhota' }
const levelLabels = { iniciante: 'Começando', basico: 'Sei alguns sinais', fluente: 'Fluente' }

const options = (name, labels) => Object.entries(labels).map(([value, label]) =>
  `<label><input type="radio" name="${name}" value="${value}"><span>${label}</span></label>`).join('')

// Reduz a foto a um quadrado de 256 px, recortado no centro.
async function shrinkPhoto(file) {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  canvas.getContext('2d').drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256)
  bitmap.close?.()
  return canvas.toDataURL('image/jpeg', .82)
}

export function initialOf(name) {
  return name ? [...name][0].toLocaleUpperCase('pt-BR') : ''
}

// Meu perfil: quem pratica. Fica separado das configurações do aparelho.
export function mountProfile(root) {
  let storage
  try { storage = localStorage } catch {}
  const dialog = document.createElement('dialog')
  dialog.className = 'setup-dialog profile-dialog'
  dialog.setAttribute('aria-labelledby', 'profile-title')
  dialog.innerHTML = `
    <form method="dialog" class="setup-form">
      <h2 id="profile-title">Meu perfil</h2>
      <p class="setup-lead">Tudo fica só neste navegador e não é enviado para nenhum servidor.</p>
      <div class="profile-photo">
        <span class="profile-avatar" data-profile-avatar aria-hidden="true"></span>
        <div class="profile-photo-actions">
          <label class="button profile-upload">Escolher foto<input type="file" accept="image/*" data-profile-file class="visually-hidden"></label>
          <button class="button profile-remove" type="button" data-profile-remove>Remover foto</button>
          <p class="setup-status" data-profile-photo-status role="status"></p>
        </div>
      </div>
      <label class="setup-name">
        <span>Nome</span>
        <input type="text" name="name" required maxlength="${nameLimit}" autocomplete="nickname" spellcheck="false" placeholder="Seu nome">
      </label>
      <section class="setup-row profile-row">
        <div><h3>Faixa etária</h3><p>Ajuda a adaptar o conteúdo. Pedimos a faixa, não a idade exata.</p></div>
        <div class="segmented" role="radiogroup" aria-label="Faixa etária">${options('ageRange', ageLabels)}</div>
      </section>
      <section class="setup-row profile-row">
        <div><h3>Mão dominante</h3><p>A mão que você usa para sinalizar.</p></div>
        <div class="segmented" role="radiogroup" aria-label="Mão dominante">${options('hand', handLabels)}</div>
      </section>
      <section class="setup-row profile-row">
        <div><h3>Nível em Libras</h3><p>Define a velocidade inicial do avatar na prática.</p></div>
        <div class="segmented" role="radiogroup" aria-label="Nível em Libras">${options('level', levelLabels)}</div>
      </section>
      <div class="setup-actions">
        <button class="button" type="button" data-profile-cancel>Cancelar</button>
        <button class="button primary" value="save">Salvar perfil</button>
      </div>
    </form>`
  root.append(dialog)

  const form = dialog.querySelector('form')
  const avatar = dialog.querySelector('[data-profile-avatar]')
  const file = dialog.querySelector('[data-profile-file]')
  const remove = dialog.querySelector('[data-profile-remove]')
  const photoStatus = dialog.querySelector('[data-profile-photo-status]')
  let photo = ''

  function renderAvatar() {
    const name = cleanName(form.elements.name.value)
    avatar.innerHTML = photo ? `<img src="${photo}" alt="">` : initialOf(name)
    remove.hidden = !photo
  }

  function fill() {
    const preferences = readPreferences(storage)
    photo = readPhoto(storage)
    form.elements.name.value = preferences.name
    for (const field of ['ageRange', 'hand', 'level']) {
      for (const input of form.querySelectorAll(`input[name="${field}"]`)) input.checked = input.value === preferences[field]
    }
    photoStatus.textContent = ''
    renderAvatar()
  }

  form.elements.name.addEventListener('input', renderAvatar)
  file.addEventListener('change', async () => {
    const [chosen] = file.files
    file.value = ''
    if (!chosen) return
    if (!chosen.type.startsWith('image/')) {
      photoStatus.textContent = 'Escolha um arquivo de imagem.'
      return
    }
    try {
      photo = await shrinkPhoto(chosen)
      photoStatus.textContent = ''
    } catch {
      photoStatus.textContent = 'Não foi possível abrir essa imagem.'
    }
    renderAvatar()
  })
  remove.addEventListener('click', () => {
    photo = ''
    renderAvatar()
  })
  dialog.querySelector('[data-profile-cancel]').addEventListener('click', () => dialog.close())
  form.addEventListener('submit', event => {
    const name = cleanName(form.elements.name.value)
    if (!name) {
      event.preventDefault()
      form.elements.name.reportValidity()
      return
    }
    const data = new FormData(form)
    writePreferences(storage, { name, ageRange: data.get('ageRange') ?? '', hand: data.get('hand') ?? '', level: data.get('level') ?? '' })
    if (!writePhoto(storage, photo)) {
      event.preventDefault()
      photoStatus.textContent = 'Não havia espaço para guardar a foto neste navegador.'
      return
    }
    window.dispatchEvent(new CustomEvent('librasia:preferencias'))
  })

  return {
    open() {
      fill()
      if (!dialog.open) dialog.showModal?.()
    },
  }
}
