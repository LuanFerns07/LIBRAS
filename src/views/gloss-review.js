export function glossReviewMarkup() {
  return `
    <div class="coverage" data-gloss-review hidden>
      <p class="muted" data-continuous-glosses hidden></p>
      <label for="gloss-review-input" class="field-label">Revisar sinais detectados</label>
      <textarea id="gloss-review-input" rows="2" maxlength="512" aria-describedby="gloss-review-help"></textarea>
      <p id="gloss-review-help">Separe os nomes dos sinais por espaço. Substitua ou remova ? nos trechos inconclusivos.</p>
      <div class="toolbar">
        <button class="button" type="button" data-generate-gloss-suggestion disabled>Gerar sugestão</button>
        <button class="button" type="button" data-apply-gloss-suggestion disabled>Acrescentar à transcrição</button>
      </div>
      <output class="inline-status" data-gloss-suggestion hidden></output>
    </div>`
}

export function mountGlossReview(main, append) {
  const panel = main.querySelector('[data-gloss-review]')
  const trail = panel.querySelector('[data-continuous-glosses]')
  const input = panel.querySelector('textarea')
  const generate = panel.querySelector('[data-generate-gloss-suggestion]')
  const apply = panel.querySelector('[data-apply-gloss-suggestion]')
  const output = panel.querySelector('[data-gloss-suggestion]')
  let review
  let suggestion

  function renderSuggestion(result) {
    suggestion = result?.text
    apply.disabled = !suggestion
    output.hidden = !result
    output.textContent = suggestion ? `Sugestão de texto — ${suggestion}` : result?.message ?? ''
    output.dataset.state = result?.state ?? 'idle'
  }

  function clear() {
    panel.hidden = true
    trail.hidden = true
    trail.textContent = ''
    input.value = ''
    review = undefined
    generate.disabled = true
    renderSuggestion()
  }

  input.addEventListener('input', () => renderSuggestion())
  generate.addEventListener('click', () => renderSuggestion(review(input.value)))
  apply.addEventListener('click', () => {
    if (!suggestion) return
    const text = suggestion
    clear()
    append(text)
  })

  return {
    clear,
    show(result) {
      clear()
      if (!result.glosses.length) return
      panel.hidden = false
      trail.hidden = false
      trail.textContent = 'Sinais detectados — ' + result.glosses.map(sign => sign ?? '[trecho inconclusivo]').join(' · ')
      input.value = result.glosses.map(sign => sign ?? '?').join(' ')
      review = result.review
      generate.disabled = false
      if (result.text) renderSuggestion(result)
    },
  }
}
