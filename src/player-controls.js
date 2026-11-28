const characterKey = 'librasia-personagem'
const characters = ['mulher', 'homem']

function readCharacter() {
  try {
    const saved = localStorage.getItem(characterKey)
    if (characters.includes(saved)) return saved
  } catch {}
  return 'mulher'
}

export function playerMarkup(title = 'Avatar 3D', { picker = '', extra = '' } = {}) {
  return `
    <section class="panel media-card" aria-label="${title}">
      <div class="panel-header"><h2>${title}</h2><span class="media-status" data-player-step>Pronto</span></div>
      <div class="avatar-stage" data-avatar></div>
      <p class="inline-status" data-player-alert role="status" hidden></p>
      ${picker}
      <div class="toolbar panel-toolbar" aria-label="Controles do avatar">
        <button class="button primary" type="button" data-play>Reproduzir</button>
        <button class="button" type="button" data-restart>Repetir</button>
        <label class="control-label">Velocidade
          <select data-speed><option value="1">Normal</option><option value=".65">Reduzida</option><option value=".4">Lenta</option></select>
        </label>
      </div>
      ${extra}
    </section>`
}

export function mountPlayerControls(area, createPlayer) {
  const host = area.querySelector('[data-avatar]')
  const play = area.querySelector('[data-play]')
  const repeat = area.querySelector('[data-restart]')
  const speed = area.querySelector('[data-speed]')
  const status = area.querySelector('[data-player-step]')
  const alert = area.querySelector('[data-player-alert]')
  let player
  let state = 'paused'
  let populated = false
  let character = readCharacter()
  let sequence = []
  let looping = false
  let loopTimer

  function build() {
    try {
      player = createPlayer(host, {
        character,
        onStep(step) {
          status.textContent = step?.label ?? 'Pronto'
        },
        onState(next) {
          state = next
          play.textContent = state === 'playing' ? 'Pausar' : 'Reproduzir'
          // Em loop, o sinal recomeça sozinho após uma pausa curta, como um vídeo curto.
          clearTimeout(loopTimer)
          if (looping && state === 'finished') loopTimer = setTimeout(() => { if (looping) player?.restart() }, 700)
        },
      })
    } catch {
      player = undefined
      alert.hidden = false
      alert.textContent = 'O avatar precisa de WebGL 2. Verifique a aceleração gráfica ou tente outro navegador.'
    }
  }

  build()
  // A personagem é escolhida na configuração inicial; o avatar aberto troca na hora.
  const onCharacter = ({ detail }) => {
    if (!characters.includes(detail) || detail === character) return
    character = detail
    player?.dispose()
    state = 'paused'
    play.textContent = 'Reproduzir'
    build()
    if (!player) return
    player.setSpeed(Number(speed.value))
    player.setSequence(sequence)
    renderAvailability()
  }
  window.addEventListener('librasia:personagem', onCharacter)

  function renderAvailability() {
    play.disabled = !player || !populated
    repeat.disabled = play.disabled
    speed.disabled = play.disabled
  }
  renderAvailability()

  play.addEventListener('click', () => {
    if (state === 'playing') player.pause()
    else if (state === 'finished') player.restart()
    else player.play()
  })
  repeat.addEventListener('click', () => player.restart())
  speed.addEventListener('change', () => player.setSpeed(Number(speed.value)))

  return {
    setSequence(steps, autoplay = false) {
      sequence = steps
      populated = !!steps.length
      status.textContent = steps[0]?.label ?? 'Pronto'
      renderAvailability()
      if (!player) return
      player.pause()
      player.setSequence(steps)
      if (populated && autoplay && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        player.play()
      }
    },
    setLoop(on, slow = speed.value) {
      looping = on && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      area.querySelector('[data-avatar]').closest('.media-card')?.classList.toggle('looping', looping)
      speed.value = String(slow)
      player?.setSpeed(Number(speed.value))
      clearTimeout(loopTimer)
      if (looping && populated && state !== 'playing') player?.restart()
    },
    dispose() {
      clearTimeout(loopTimer)
      looping = false
      window.removeEventListener('librasia:personagem', onCharacter)
      player?.dispose()
    },
  }
}
