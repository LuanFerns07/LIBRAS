import { lesson } from '../catalog.js'
import { mountPlayerControls, playerMarkup } from '../player-controls.js'
import { translate } from '../translate.js'

export function mountTranslator(main, createPlayer) {
  main.innerHTML = `
    <div class="page-heading">
      <h1>Português para Libras</h1>
      <p>Veja palavras do catálogo ou soletre um nome com o avatar.</p>
    </div>
    <div class="split-layout">
      <section class="panel content-panel">
        <h2>Texto em português</h2>
        <form class="stack">
          <div>
            <label class="field-label" for="translate-input">O que você quer demonstrar?</label>
            <textarea id="translate-input" name="texto" rows="4" maxlength="120" aria-describedby="translation-coverage" placeholder="Exemplo: Meu nome é Anna"></textarea>
          </div>
          <label class="check-label"><input type="checkbox" name="modo"> Soletrar como nome</label>
          <button type="submit" class="button primary">Gerar demonstração</button>
        </form>
        <p class="inline-status" data-translation-status role="status" hidden></p>
        <div class="coverage" id="translation-coverage">
          <h3>O que o protótipo cobre</h3>
          <p>${lesson.map(entry => entry.label).join(', ')} e a frase “Meu nome é [nome]”. As sequências do avatar estão em revisão linguística.</p>
        </div>
      </section>
      ${playerMarkup('Demonstração em Libras')}
    </div>`

  const player = mountPlayerControls(main, createPlayer)
  const form = main.querySelector('form')
  const input = form.elements.texto
  const mode = form.elements.modo
  const status = main.querySelector('[data-translation-status]')

  function reset() {
    player.setSequence([])
    status.hidden = true
    status.textContent = ''
  }
  input.addEventListener('input', reset)
  mode.addEventListener('change', reset)
  form.addEventListener('submit', event => {
    event.preventDefault()
    const result = translate(input.value, mode.checked ? 'name' : 'text')
    player.setSequence(result.steps, result.state === 'ready')
    status.hidden = false
    status.dataset.state = result.state
    status.textContent = result.unsupported
      ? `${result.message} Trecho: ${result.unsupported}`
      : result.message
  })
  return () => player.dispose()
}
