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

export const cedilla = {
  id: 'letter-ç',
  label: 'Ç',
  text: 'Ç',
  version: catalogVersion,
  reference: alphabetSource,
  review: 'pending',
}

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
    parameter: 'Orientação inicial da palma',
    watch: 'Observe a mão aberta à frente do rosto e a rotação do punho.',
    hint: 'Comece com a palma voltada para você e gire o punho.',
    variants: 'Variante da referência. A amplitude e as variantes regionais requerem avaliação.',
  },
  {
    id: 'signal-amarelo',
    label: 'Amarelo',
    text: 'amarelo',
    parameter: 'Trajetória da mão',
    watch: 'Observe o deslocamento do indicador da testa em direção ao nariz.',
    hint: 'Desloque o indicador da testa em direção ao nariz.',
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
].map(entry => ({
  ...entry,
  text: entry.label.toLowerCase(),
  reference: 'https://goiaslibras.educacao.go.gov.br/sinal/nome',
  version: catalogVersion,
  review: 'pending',
}))

export const greeting = [
  { id: 'signal-bom', label: 'Bom' },
  { id: 'signal-dia', label: 'Dia' },
].map(entry => ({
  ...entry,
  text: entry.label.toLowerCase(),
  reference: alphabetSource,
  version: catalogVersion,
  review: 'pending',
}))

export const student = {
  id: 'signal-aluno',
  label: 'Aluno',
  text: 'aluno',
  reference: thesis,
  version: catalogVersion,
  review: 'pending',
}

export const studentFortaleza = {
  id: 'signal-aluno-fortaleza-historico',
  label: 'Aluno · Forma histórica',
  text: 'aluno',
  reference: 'https://repositorio.ufsc.br/bitstream/123456789/173253/1/343702.pdf#page=81',
  version: catalogVersion,
  review: 'pending',
}

export const spellingPause = Object.freeze({ id: 'pause', label: 'Pausa' })
