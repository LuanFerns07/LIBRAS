import { alphabet, cedilla } from '../catalog.js'
import { mountPlayerControls, playerMarkup } from '../player-controls.js'

const comparisons = [
  ['A', 'S', 'Em A, o polegar fica ao lado dos dedos fechados. Em S, ele cruza à frente dos dedos.'],
  ['I', 'J', 'I mantém a configuração com o dedo mínimo estendido. J usa essa configuração com movimento.'],
  ['M', 'N', 'Em M, indicador, médio e anelar apontam para baixo. Em N, o anelar fica dobrado.'],
  ['N', 'U', 'Em N, indicador e médio apontam para baixo, com o dorso voltado para quem observa. Em U, apontam para cima, com a palma voltada para quem observa.'],
]

export function mountAlphabet(main, createPlayer) {
  const characters = [...alphabet, cedilla]
  main.innerHTML = `
    <div class="page-heading">
      <h1>Alfabeto manual</h1>
      <p>Escolha uma letra e observe a posição da mão e o movimento no avatar.</p>
    </div>
    <div class="split-layout">
      <section class="panel content-panel">
        <h2>Letras de A a Z e cedilha</h2>
        <p class="muted">Use Tab para entrar na grade e as setas para percorrer as letras.</p>
        <div class="letter-grid" aria-label="Letras do alfabeto" role="group">
          ${characters.map(({ label }, index) =>
            `<button class="letter-button" type="button" aria-pressed="${index === 0}" tabindex="${index === 0 ? 0 : -1}">${label}</button>`).join('')}
        </div>
        <p class="inline-status subtle">As demonstrações estão em revisão linguística.</p>
        <div class="coverage">
          <h3>Compare letras parecidas</h3>
          <div class="toolbar">
            ${comparisons.map(([first, second], index) => `<button type="button" class="button" data-comparison="${index}">${first} e ${second}</button>`).join('')}
          </div>
          <p class="inline-status" data-comparison-status role="status" hidden></p>
        </div>
      </section>
      ${playerMarkup('Demonstração da letra')}
    </div>`

  const player = mountPlayerControls(main, createPlayer)
  const grid = main.querySelector('.letter-grid')
  const buttons = Array.from(grid.querySelectorAll('button'))
  const comparisonStatus = main.querySelector('[data-comparison-status]')
  let selected = 0

  function select(index, autoplay) {
    buttons[selected].setAttribute('aria-pressed', 'false')
    buttons[selected].tabIndex = -1
    selected = index
    buttons[selected].setAttribute('aria-pressed', 'true')
    buttons[selected].tabIndex = 0
    comparisonStatus.hidden = true
    player.setSequence([characters[selected]], autoplay)
  }

  buttons.forEach((button, index) => button.addEventListener('click', () => select(index, true)))
  for (const button of main.querySelectorAll('[data-comparison]')) {
    button.addEventListener('click', () => {
      const [first, second, description] = comparisons[Number(button.dataset.comparison)]
      const firstIndex = characters.findIndex(letter => letter.label === first)
      select(firstIndex, false)
      buttons[firstIndex].setAttribute('aria-pressed', 'false')
      player.setSequence([characters[firstIndex], characters.find(letter => letter.label === second)], true)
      comparisonStatus.textContent = description
      comparisonStatus.hidden = false
    })
  }
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
