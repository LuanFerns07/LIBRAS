import './styles.css'
import { createPlayer } from './avatar/player.js'
import { mountReferences } from './references.js'
import { mountShell, navigate } from './shell.js'
import { mountAlphabet } from './views/alphabet.js'
import { mountFree } from './views/free.js'
import { mountPractice } from './views/practice.js'
import { mountTranslator } from './views/translator.js'

const root = document.querySelector('#app')
const main = mountShell(root)
const openEngine = () => import('./recognition/engine.js').then(runtime => runtime.openEngine())

navigate(root, main, {
  praticar: container => mountPractice(container, { createPlayer, openEngine }),
  alfabeto: container => mountAlphabet(container, createPlayer),
  tradutor: container => mountTranslator(container, createPlayer),
  'area-livre': container => mountFree(container, openEngine),
  'saiba-mais': mountReferences,
})
