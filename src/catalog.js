export const catalogVersion = 'librasia-v0.1-draft'

const thesis = 'https://repositorio.ufmg.br/items/b4a21355-8b2d-445f-a610-d95f07e28b2a'
const alphabetSource = 'https://clubedelibras.ufc.br/wp-content/uploads/2021/04/livro-librasparaacademicos-basico1-profandersonduarte.pdf'

export const alphabet = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ', label => ({
  id: `letter-${label.toLowerCase()}`,
  label,
  text: label,
  version: catalogVersion,
  reference: alphabetSource,
  review: 'pending',
}))

export const lesson = [
  {
    id: 'signal-cinco',
    label: 'Cinco',
    text: 'cinco',
    parameter: 'Orientação da palma',
    watch: 'Observe a palma voltada para a frente e a curvatura do indicador e do dedo médio.',
    hint: 'Vire a palma da mão para a frente.',
    variants: 'Variante destra da referência. A equivalência para mão esquerda requer avaliação.',
  },
  {
    id: 'signal-espelho',
    label: 'Espelho',
    text: 'espelho',
    parameter: 'Rotação da mão',
    watch: 'Observe a mão aberta à frente do rosto e a rotação do punho.',
    hint: null,
    variants: 'Variante da referência. A amplitude e as variantes regionais requerem avaliação.',
  },
  {
    id: 'signal-amarelo',
    label: 'Amarelo',
    text: 'amarelo',
    parameter: 'Trajetória da mão',
    watch: 'Observe o deslocamento do indicador da testa em direção ao nariz.',
    hint: null,
    variants: 'Variante da referência. Outras realizações requerem avaliação.',
  },
].map(entry => ({
  ...entry,
  version: catalogVersion,
  reference: thesis,
  review: 'pending',
}))

export const namePrefix = [
  { id: 'signal-nome', label: 'Nome' },
  { id: 'signal-meu', label: 'Meu' },
]

export const spellingPause = Object.freeze({ id: 'pause', label: 'Pausa' })
