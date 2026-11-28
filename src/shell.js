import { readPhoto, readPreferences } from './preferences.js'
import { initialOf } from './profile.js'

export const credits = 'O LibrasIA é uma iniciativa educacional sem fins lucrativos, desenvolvida por Luan Fernandes e Wellington Sales.'

export const pages = [
  { id: 'praticar', label: 'Praticar', icon: 'practice' },
  { id: 'tradutor', label: 'Tradutor', icon: 'translate' },
  { id: 'area-livre', label: 'Área livre', icon: 'free' },
  { id: 'saiba-mais', label: 'Saiba mais', icon: 'info' },
]

// Ícones da marca: mesma construção das mãos do logo (mão fechada com nós e dedos em traço redondo).
const shapes = {
  practice: '<path d="M6 11h11v6.5a3.5 3.5 0 0 1-3.5 3.5h-4A3.5 3.5 0 0 1 6 17.5Z"/><path d="M6 11a1.4 1.4 0 0 1 2.75 0a1.4 1.4 0 0 1 2.75 0a1.4 1.4 0 0 1 2.75 0a1.4 1.4 0 0 1 2.75 0"/><path d="M17 11V3.5"/>',
  translate: '<path d="M3 5.5h8M3 9.5h5"/><path d="M12 13h8v4.5a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3Z"/><path d="M12 13a1.35 1.35 0 0 1 2.7 0a1.35 1.35 0 0 1 2.65 0a1.35 1.35 0 0 1 2.65 0"/><path d="M12 13V8"/><path d="M5 14.5 3 17l2 2.5"/>',
  free: '<path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16"/><path d="M8.5 12h7v3.5a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2Z"/><path d="M8.5 12a1.17 1.17 0 0 1 2.33 0a1.17 1.17 0 0 1 2.34 0a1.17 1.17 0 0 1 2.33 0"/>',
  info: '<path d="M7 3.5V12"/><path d="M7 12h10v5.5a3.5 3.5 0 0 1-3.5 3.5h-3A3.5 3.5 0 0 1 7 17.5Z"/><path d="M7 12a1.67 1.67 0 0 1 3.33 0a1.67 1.67 0 0 1 3.34 0a1.67 1.67 0 0 1 3.33 0"/><path d="M17 16h-6"/>',
  repeat: '<path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/>',
  record: '<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none"/>',
  power: '<path d="M12 3v8M6.3 6.3a8 8 0 1 0 11.4 0"/>',
  sun: '<circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor" stroke="none"/>',
  play: '<path d="m9 5 11 7-11 7V5Z"/>',
  arrow: '<path d="M3 8h16m-4-4 4 4-4 4m6 4H5m4-4-4 4 4 4"/>',
  camera: '<rect x="3" y="6" width="13" height="12" rx="3"/><path d="m16 10 5-3v10l-5-3"/>',
  book: '<path d="M12 5v15M3 4h4a5 5 0 0 1 5 2 5 5 0 0 1 5-2h4v14h-4a6 6 0 0 0-5 2 6 6 0 0 0-5-2H3Z"/>',
  external: '<path d="M13 5h6v6m0-6-9 9m7 0v5H5V7h5"/>',
  expand: '<path d="M4 9V5a1 1 0 0 1 1-1h4m6 0h4a1 1 0 0 1 1 1v4m0 6v4a1 1 0 0 1-1 1h-4m-6 0H5a1 1 0 0 1-1-1v-4"/>',
}

// Logo LibrasIA: “Libras” em Instrument Sans convertida em curvas; I e A em datilologia da LIBRAS
// desenhados com o mesmo traço (80 unidades) da haste do “l”.
const brandLogo = '<svg class="brand-logo" viewBox="196 0 3853 720" aria-hidden="true"><path fill="currentColor" d="M196 720V0H278V720ZM238 720V648H648V720ZM778 720V210H858V720ZM772 94V0H864V94ZM1270 729Q1198 729 1149.0 694.0Q1100 659 1082 595L1093 593V720H1018V0H1098V329L1087 326Q1106 267 1156.5 233.5Q1207 200 1277 200Q1345 200 1395.5 233.0Q1446 266 1474.0 325.0Q1502 384 1502 463Q1502 543 1473.0 603.0Q1444 663 1392.0 696.0Q1340 729 1270 729ZM1258 659Q1334 659 1377.0 606.5Q1420 554 1420 463Q1420 373 1377.0 321.5Q1334 270 1258 270Q1182 270 1138.0 322.5Q1094 375 1094 466Q1094 555 1138.0 607.0Q1182 659 1258 659ZM1624 720V210H1699V340H1704V720ZM1704 454 1691 333Q1709 268 1755.0 234.0Q1801 200 1861 200Q1886 200 1895 204V281Q1890 279 1881.0 278.5Q1872 278 1859 278Q1783 278 1743.5 323.5Q1704 369 1704 454ZM2312 720Q2308 703 2306.5 681.0Q2305 659 2305 625H2300V381Q2300 323 2273.5 295.5Q2247 268 2188 268Q2130 268 2095.5 291.5Q2061 315 2057 358H1980Q1985 284 2042.0 242.0Q2099 200 2191 200Q2286 200 2332.0 245.0Q2378 290 2378 380V625Q2378 647 2381.0 670.5Q2384 694 2389 720ZM2137 730Q2058 730 2011.5 691.5Q1965 653 1965 586Q1965 519 2011.0 482.0Q2057 445 2145 430L2323 400V466L2157 492Q2101 501 2072.0 522.0Q2043 543 2043 583Q2043 622 2069.5 642.0Q2096 662 2148 662Q2215 662 2257.5 631.5Q2300 601 2300 552L2313 623Q2297 674 2250.5 702.0Q2204 730 2137 730ZM2705 730Q2611 730 2555.0 686.5Q2499 643 2491 563H2568Q2575 612 2611.0 638.0Q2647 664 2707 664Q2760 664 2790.0 644.0Q2820 624 2820 587Q2820 561 2803.0 541.5Q2786 522 2735 509L2653 488Q2583 470 2548.0 432.5Q2513 395 2513 343Q2513 277 2562.0 238.5Q2611 200 2695 200Q2778 200 2830.0 240.0Q2882 280 2889 351H2812Q2805 310 2774.0 288.0Q2743 266 2692 266Q2643 266 2616.0 284.5Q2589 303 2589 337Q2589 363 2608.5 382.0Q2628 401 2674 414L2754 436Q2825 455 2861.0 494.0Q2897 533 2897 588Q2897 655 2846.0 692.5Q2795 730 2705 730Z"/><path fill="none" stroke="var(--signal)" stroke-width="80" stroke-linejoin="round" stroke-linecap="round" d="M3055.0 306.0H3391.0V570.0A110 110 0 0 1 3281.0 680.0H3165.0A110 110 0 0 1 3055.0 570.0ZM3055.0 306.0A56 56 0 0 1 3167.0 306.0M3167.0 306.0A56 56 0 0 1 3279.0 306.0M3279.0 306.0A56 56 0 0 1 3391.0 306.0M3055.0 40.0V306.0M3391.0 500H3175.0M3561.0 306.0H4009.0V570.0A110 110 0 0 1 3899.0 680.0H3671.0A110 110 0 0 1 3561.0 570.0ZM3561.0 306.0A56 56 0 0 1 3673.0 306.0M3673.0 306.0A56 56 0 0 1 3785.0 306.0M3785.0 306.0A56 56 0 0 1 3897.0 306.0M3897.0 306.0A56 56 0 0 1 4009.0 306.0M4009.0 40.0V306.0"/></svg>'

// As mãos I e A do logo, em traço, para estados vazios.
export const brandHands = '<svg class="brand-hands" viewBox="3000 0 1064 720" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="80" stroke-linejoin="round" stroke-linecap="round" d="M3055.0 306.0H3391.0V570.0A110 110 0 0 1 3281.0 680.0H3165.0A110 110 0 0 1 3055.0 570.0ZM3055.0 306.0A56 56 0 0 1 3167.0 306.0M3167.0 306.0A56 56 0 0 1 3279.0 306.0M3279.0 306.0A56 56 0 0 1 3391.0 306.0M3055.0 40.0V306.0M3391.0 500H3175.0M3561.0 306.0H4009.0V570.0A110 110 0 0 1 3899.0 680.0H3671.0A110 110 0 0 1 3561.0 570.0ZM3561.0 306.0A56 56 0 0 1 3673.0 306.0M3673.0 306.0A56 56 0 0 1 3785.0 306.0M3785.0 306.0A56 56 0 0 1 3897.0 306.0M3897.0 306.0A56 56 0 0 1 4009.0 306.0M4009.0 40.0V306.0"/></svg>'

export function icon(name) {
  return `<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${shapes[name]}</svg>`
}

const themeKey = 'librasia-tema'

function readTheme() {
  try {
    const saved = localStorage.getItem(themeKey)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {}
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

let themeToggle

export function getTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function setTheme(theme) {
  applyTheme(theme, themeToggle)
  try { localStorage.setItem(themeKey, theme) } catch {}
}

function applyTheme(theme, toggle) {
  document.documentElement.dataset.theme = theme
  const dark = theme === 'dark'
  toggle.setAttribute('aria-checked', String(dark))
  toggle.querySelector('[data-theme-label]').textContent = 'Tema escuro'
  toggle.querySelector('.theme-knob').innerHTML = icon(dark ? 'moon' : 'sun')
}

export function mountShell(root) {
  root.innerHTML = `
    <a class="skip-link" href="#conteudo">Ir para o conteúdo</a>
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" href="#praticar" aria-label="LibrasIA · início">
          ${brandLogo}
        </a>
        <p class="sidebar-label" id="menu-label">Menu</p>
        <nav aria-labelledby="menu-label">
          ${pages.map(({ id, label, icon: name }) =>
            `<a class="nav-link" href="#${id}" data-page="${id}">${icon(name)}<span>${label}</span></a>`).join('')}
        </nav>
        <button class="nav-link settings-link" type="button" data-open-setup>${icon('settings')}<span>Configurações</span></button>
        <button class="user-card" type="button" data-open-profile data-user hidden aria-label="Abrir meu perfil">
          <span class="user-initial" aria-hidden="true" data-user-initial></span>
          <span class="user-text"><span class="user-name" data-user-name></span><span class="user-hint">Meu perfil</span></span>
        </button>
        <button class="theme-toggle" type="button" role="switch" aria-checked="false" data-theme-toggle>
          <span data-theme-label>Tema escuro</span>
          <span class="theme-switch" aria-hidden="true"><span class="theme-knob"></span></span>
        </button>
      </aside>
      <div class="app-content">
        <main id="conteudo" tabindex="-1"></main>
        <footer class="site-footer"><div>${credits}</div></footer>
      </div>
    </div>`
  // Nome escolhido na configuração inicial, no rodapé do menu.
  const user = root.querySelector('[data-user]')
  const renderUser = () => {
    let storage
    try { storage = localStorage } catch {}
    const { name } = readPreferences(storage)
    const photo = readPhoto(storage)
    user.hidden = !name
    user.querySelector('[data-user-name]').textContent = name
    const initial = user.querySelector('[data-user-initial]')
    initial.classList.toggle('has-photo', Boolean(photo))
    initial.innerHTML = photo ? `<img src="${photo}" alt="">` : initialOf(name)
  }
  renderUser()
  window.addEventListener('librasia:preferencias', renderUser)
  themeToggle = root.querySelector('[data-theme-toggle]')
  applyTheme(readTheme(), themeToggle)
  themeToggle.addEventListener('click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'))
  const main = root.querySelector('main')
  root.querySelector('.skip-link').addEventListener('click', event => {
    event.preventDefault()
    main.focus()
  })
  return main
}

export function navigate(root, main, views) {
  let current
  let dispose

  function open() {
    if (location.hash === '#alfabeto') history.replaceState(history.state, '', '#area-livre')
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
