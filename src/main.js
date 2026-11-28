import './styles.css'
import { createPlayer } from './avatar/player.js'
import { mountReferences } from './references.js'
import { getTheme, mountShell, navigate, setTheme } from './shell.js'
import { mountProfile } from './profile.js'
import { mountSetup } from './setup.js'
import { mountFree } from './views/free.js'
import { mountPractice } from './views/practice.js'
import { mountTranslator } from './views/translator.js'

const root = document.querySelector('#app')
const main = mountShell(root)
const setup = mountSetup(root, { getTheme, setTheme })
root.querySelectorAll('[data-open-setup]').forEach(button => button.addEventListener('click', () => setup.open()))
const profile = mountProfile(root)
root.querySelectorAll('[data-open-profile]').forEach(button => button.addEventListener('click', () => profile.open()))
const freeDraft = { text: '' }
const openEngine = mode => import('./recognition/engine.js')
  .then(runtime => mode === 'letter' ? runtime.openAlphabetEngine() : runtime.openEngine())

navigate(root, main, {
  praticar: container => mountPractice(container, { createPlayer, openEngine }),
  tradutor: container => mountTranslator(container, createPlayer),
  'area-livre': container => mountFree(container, { createPlayer, openEngine, draft: freeDraft }),
  'saiba-mais': mountReferences,
})
