export const credits = 'O LibrasIA é uma iniciativa educacional sem fins lucrativos, desenvolvida por Luan Fernandes e Wellington Sales.'

export const pages = [
  { id: 'praticar', label: 'Praticar', icon: 'play' },
  { id: 'alfabeto', label: 'Alfabeto', icon: 'letters' },
  { id: 'tradutor', label: 'Tradutor', icon: 'arrow' },
  { id: 'area-livre', label: 'Área livre', icon: 'camera' },
  { id: 'saiba-mais', label: 'Saiba mais', icon: 'book' },
]

const shapes = {
  hand: '<path d="M8 13V6a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v5-2a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.5-2.7L3 15a1.5 1.5 0 0 1 2.2-2l2.8 2.5"/>',
  play: '<path d="m9 5 11 7-11 7V5Z"/>',
  letters: '<path d="m3 18 6-12 6 12M5 14h8m5-3a3 3 0 1 1 0 6m3-8v9"/>',
  arrow: '<path d="M3 8h16m-4-4 4 4-4 4m6 4H5m4-4-4 4 4 4"/>',
  camera: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
  book: '<path d="M12 5v15M3 4h4a5 5 0 0 1 5 2 5 5 0 0 1 5-2h4v14h-4a6 6 0 0 0-5 2 6 6 0 0 0-5-2H3Z"/>',
  external: '<path d="M13 5h6v6m0-6-9 9m7 0v5H5V7h5"/>',
}

export function icon(name) {
  return `<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${shapes[name]}</svg>`
}

export function mountShell(root) {
  root.innerHTML = `
    <a class="skip-link" href="#conteudo">Ir para o conteúdo</a>
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="#praticar" aria-label="LibrasIA · início">
          <span class="brand-icon">${icon('hand')}</span> Libras<span>IA</span>
        </a>
        <nav aria-label="Navegação principal">
          ${pages.map(({ id, label, icon: name }) =>
            `<a class="nav-link" href="#${id}" data-page="${id}">${icon(name)}${label}</a>`).join('')}
        </nav>
      </div>
    </header>
    <main id="conteudo" tabindex="-1"></main>
    <footer class="site-footer"><div>${credits}</div></footer>`
  return root.querySelector('main')
}

export function navigate(root, main, views) {
  let current
  let dispose

  function open() {
    const id = location.hash.slice(1)
    if (id === 'conteudo' && current) {
      main.focus()
      return
    }
    const page = pages.find(entry => entry.id === id) ?? pages[0]
    if (current === page.id) return
    const initial = current === undefined
    dispose?.()
    current = page.id
    for (const link of root.querySelectorAll('[data-page]')) {
      if (link.dataset.page === current) link.setAttribute('aria-current', 'page')
      else link.removeAttribute('aria-current')
    }
    document.title = `${page.label} · LibrasIA`
    dispose = views[current](main)
    if (!initial) {
      window.scrollTo(0, 0)
      main.focus({ preventScroll: true })
    }
  }

  window.addEventListener('hashchange', open)
  open()
}
