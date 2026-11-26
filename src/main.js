import './styles.css'
import { mountReferences } from './references.js'
import { mountShell, navigate, pages } from './shell.js'

const root = document.querySelector('#app')
const main = mountShell(root)

const views = Object.fromEntries(pages.map(({ id, label }) => [
  id,
  container => {
    container.innerHTML = `<div class="page-heading"><h1>${label}</h1><p>Área em desenvolvimento.</p></div>`
  },
]))
views['saiba-mais'] = mountReferences
navigate(root, main, views)
