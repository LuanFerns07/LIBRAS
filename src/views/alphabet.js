import { alphabet } from '../catalog.js'
import { mountPlayerControls, playerMarkup } from '../player-controls.js'

export function mountAlphabet(main, createPlayer) {
  main.innerHTML = `
    <div class="page-heading">
      <h1>Alfabeto manual</h1>
      <p>Escolha uma letra e observe a posição da mão e o movimento no avatar.</p>
    </div>
    <div class="split-layout">
      <section class="panel content-panel">
        <h2>Letras de A a Z</h2>
        <p class="muted">Use Tab para entrar na grade e as setas para percorrer as letras.</p>
        <div class="letter-grid" aria-label="Letras do alfabeto" role="group">
          ${alphabet.map(({ label }, index) =>
            `<button class="letter-button" type="button" aria-pressed="${index === 0}" tabindex="${index === 0 ? 0 : -1}">${label}</button>`).join('')}
        </div>
        <p class="inline-status subtle">As demonstrações estão em revisão linguística.</p>
      </section>
      ${playerMarkup('Demonstração da letra')}
    </div>`

  const player = mountPlayerControls(main, createPlayer)
  const grid = main.querySelector('.letter-grid')
  const buttons = Array.from(grid.querySelectorAll('button'))
  let selected = 0

  function select(index, autoplay) {
    buttons[selected].setAttribute('aria-pressed', 'false')
    buttons[selected].tabIndex = -1
    selected = index
    buttons[selected].setAttribute('aria-pressed', 'true')
    buttons[selected].tabIndex = 0
    player.setSequence([alphabet[selected]], autoplay)
  }

  buttons.forEach((button, index) => button.addEventListener('click', () => select(index, true)))
  grid.addEventListener('keydown', event => {
    const current = buttons.indexOf(event.target)
    if (current < 0) return
    const columns = getComputedStyle(grid).gridTemplateColumns.split(/\s+/u).length
    let next
    switch (event.key) {
      case 'ArrowLeft': next = current - 1; break
      case 'ArrowRight': next = current + 1; break
      case 'ArrowUp': next = current - columns; break
      case 'ArrowDown': next = current + columns; break
      case 'Home': next = 0; break
      case 'End': next = buttons.length - 1; break
      default: return
    }
    event.preventDefault()
    if (buttons[next]) {
      select(next, false)
      buttons[next].focus()
    }
  })
  select(0, false)
  return () => player.dispose()
}
