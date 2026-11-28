import './styles.css'
import { createPlayer } from './avatar/player.js'
import { mountReferences } from './references.js'
import { mountShell, navigate } from './shell.js'
import { mountFree } from './views/free.js'
import { mountPractice } from './views/practice.js'
import { mountTranslator } from './views/translator.js'

const root = document.querySelector('#app')
const main = mountShell(root)
const freeDraft = { text: '' }
const openEngine = mode => import('./recognition/engine.js')
  .then(runtime => mode === 'letter' ? runtime.openAlphabetEngine() : runtime.openEngine())

navigate(root, main, {
  praticar: container => mountPractice(container, { createPlayer, openEngine }),
  tradutor: container => mountTranslator(container, createPlayer),
  'area-livre': container => mountFree(container, { createPlayer, openEngine, draft: freeDraft }),
  'saiba-mais': mountReferences,
})
