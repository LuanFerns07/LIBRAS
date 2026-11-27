import { icon } from './shell.js'

export const references = [
  ['Perfil de Karin Strobel', 'Iphan · Inventário Nacional da Diversidade Linguística', 'https://indl.iphan.gov.br/pessoas-de-referencia/karin-strobel/'],
  ['As imagens do outro sobre a cultura surda', 'Karin Strobel · Editora da UFSC', 'https://editora.ufsc.br/2016/10/10/lancamento-as-imagens-do-outro-sobre-a-cultura-surda/'],
  ['Língua de Sinais Brasileira', 'Ronice Müller de Quadros e Lodenir Becker Karnopp · Artmed', 'https://m.grupoa.com.br/lingua-de-sinais-brasileira-estudos-9788536303086-p991033'],
  ['Dicionário da Língua Brasileira de Sinais', 'Guilherme de Azambuja Lira e Tanya Amara Felipe de Souza · INES', 'https://dicionario.ines.gov.br/'],
  ['Manuário Acadêmico e Escolar', 'Instituto Nacional de Educação de Surdos (INES)', 'https://manuario.ines.gov.br/'],
  ['Corpus de Libras', 'Universidade Federal de Santa Catarina (UFSC) · Publicações', 'https://corpuslibras.ufsc.br/publicacoes'],
  ['Clube de Libras', 'Universidade Federal do Ceará (UFC) · Projeto de extensão', 'https://faced.ufc.br/pt/extensao/programa-de-pos-graduacao-em-educacao/clube-de-libras-ufc/'],
]

export function mountReferences(main) {
  main.innerHTML = `
    <div class="page-heading">
      <h1>Saiba mais</h1>
      <p>Referências sobre Libras e cultura surda. Os links abrem em outra aba.</p>
    </div>
    <ul class="reference-list">
      ${references.map(([title, author, url]) => `
        <li><a href="${url}" target="_blank" rel="noopener noreferrer">
          <div><strong>${title}</strong><span>${author}</span></div>
          ${icon('external')}
        </a></li>`).join('')}
    </ul>`
}
