# LibrasIA · To-do de UX e design

Prazo do edital: **30/11, 23h59**. A banca vê só o PDF, as capturas de tela e o vídeo.
Originalidade vale 3 pontos e clareza da apresentação vale 2. Por isso a ordem abaixo
prioriza o que aparece nas capturas e no vídeo.

Direção escolhida: linguagem visual de vídeo curto (estilo Reels/TikTok): tela cheia,
ritmo rápido, legendas grandes, gestos simples. Depois, exportar a tentativa certa do
usuário como um clipe curto com a marca, pronto para redes sociais.

---

## Fase 0 · Correções rápidas antes das capturas e do vídeo (hoje e amanhã)

- [ ] Carregar de fato a fonte **Atkinson Hyperlegible Next** (hoje ela está declarada em
      `src/styles.css`, mas nunca é carregada, então o navegador cai para Segoe UI).
      Opção mais simples: `@fontsource` ou `<link>` do Google Fonts no `index.html`.
- [ ] Trocar o ícone genérico de mão (`shapes.hand` em `src/shell.js`) pela nova marca
      com "IA" em datilologia (ver conceitos de logo).
- [ ] Substituir o roxo genérico de IA (`--accent: #593aaa`) pela paleta nova.
- [ ] Levar as ~14 cores soltas de `src/styles.css` para variáveis da paleta
      (`#f5f1fb`, `#262137`, `#eee6fa`, `#3d3453`, `#f7f3ff`, `#f2ecfa`, `#422a74`,
      `#f7f5f8`, `#e7f6ed`, `#205139`, `#f9efd9`, `#67470e`, `#fae8eb`, `#79283e`, `#f3eff8`).
- [ ] Atualizar `theme-color` no `index.html` e criar favicon com o símbolo novo.
- [ ] Conferir contraste AA de todos os pares texto/fundo da paleta nova.
- [ ] Refazer as capturas de tela só depois desses itens.

## Fase 1 · Linguagem visual de vídeo curto (para o vídeo da inscrição)

- [ ] Modo prática em **tela cheia** no celular (câmera ocupa a tela, controles por cima).
- [ ] **Legenda grande** da letra/sinal-alvo sobre o vídeo, no estilo caption de Reels
      (caixa sólida, peso 800, 2 a 3 palavras por vez).
- [ ] **Feedback instantâneo** de acerto: flash curto com a cor de destaque, carimbo
      "Acertou!" e vibração leve (`navigator.vibrate`) quando disponível.
- [ ] Barra de progresso fina no topo (estilo stories) mostrando as letras da sequência.
- [ ] Transições rápidas entre letras (150 a 250 ms), respeitando `prefers-reduced-motion`.
- [ ] Gestos simples: tocar para repetir, deslizar para a próxima letra.
- [ ] Roteiro do vídeo da inscrição em formato vertical 9:16, cortes curtos, legenda
      sempre visível (acessível também para quem assiste sem som).

## Fase 2 · Exportar acerto como clipe para redes sociais (próxima fase)

- [ ] Gravar os últimos 3 a 5 s da câmera durante a prática (`MediaRecorder` sobre um
      `canvas` que compõe câmera + legenda + marca).
- [ ] Ao acertar, oferecer "Salvar meu acerto" com prévia.
- [ ] Clipe 9:16 com: legenda da letra/palavra, selo "Acertei em LIBRAS", logo e
      endereço do site no final (1 s de cartela).
- [ ] Compartilhar com a Web Share API (`navigator.share` com arquivo) e baixar como
      alternativa.
- [ ] Privacidade: nada sai do aparelho sem o usuário tocar em salvar; explicar isso na tela.
- [ ] Opção de esconder o rosto (recorte só das mãos ou desfoque) antes de exportar.

## Fase 3 · Identidade completa (plano de continuidade para o memorial)

- [ ] Manual de marca curto: logo, área de proteção, tamanhos mínimos, usos proibidos.
- [ ] Validação dos sinais do logo com pessoas surdas e intérpretes (crédito no memorial).
- [ ] Biblioteca de ilustrações de configurações de mão no mesmo traço do logo.
- [ ] Sistema de ícones próprio (substituir os ícones genéricos de navegação).
- [ ] Modo escuro da paleta.
- [ ] Templates para redes sociais (post, story, capa de Reels).
- [ ] Descrever no memorial a decisão de design: datilologia no nome, linguagem de
      vídeo curto e exportação como ponte para engajamento.
