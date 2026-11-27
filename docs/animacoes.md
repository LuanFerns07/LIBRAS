# Animações do LibrasIA

Versão do catálogo da aplicação `librasia-v0.1-draft`. As poses e trajetórias foram modeladas em código com geometria original. O navegador carrega o código local do avatar, cuja revisão é identificada pelo commit do pacote. As obras de referência servem à consulta e seus arquivos não integram o aplicativo.

## Alfabeto manual

O catálogo tem 26 letras e a forma dinâmica da cedilha. Cada posição articula separadamente a base, a articulação média e a ponta de cada dedo. O pulso recebe posição e orientação próprias. As letras são monomanuais e usam a mão direita. O avatar também articula a mão esquerda nas animações bimanuais. A câmera frontal enquadra as mãos, o rosto e a parte superior do tronco.

As referências orientam os movimentos de Ç, H, J, K, W, X, Y e Z. O clipe de P inclui o giro de apresentação para atingir a orientação ilustrada no quadro de Duarte. Entre letras diferentes, o player interpola as articulações e a posição do pulso. Entre letras iguais, um deslocamento breve separa as duas ocorrências. A fila aceita pausas explícitas entre as partes de nomes compostos.

- Anderson Duarte, *Libras para Acadêmicos*, básico I, p. 16. Quadro fotográfico de A–Z e Ç com setas de movimento. [Acervo do Clube de Libras da UFC](https://clubedelibras.ufc.br/wp-content/uploads/2021/04/livro-librasparaacademicos-basico1-profandersonduarte.pdf#page=14)
- Heloise Gripp Diniz, *Descrição da variação fonético-fonológica na letra manual “e” em Libras*, 2020, p. 454–455. Documenta pares mínimos, movimentos e variantes, como A/S, F/T, G/Q, I/J e N/U. [Revista Linguística da UFRJ](https://revistas.ufrj.br/index.php/rl/article/download/37488/22633/114954)
- Instituto Nacional de Educação de Surdos. Referência institucional para consulta. O portal declara licença CC BY-ND 3.0 para seu conteúdo. [Alfabeto de Libras e configuração de mãos](https://www.gov.br/ines/pt-br/central-de-conteudos/publicacoes-1/todas-as-publicacoes/alfabeto-manual-e-configuracao-de-maos)

## Sinais da lição

A fonte dos parâmetros é a descrição das amostras do MINDS-Libras. O trio inicial inclui uma execução estática e duas dinâmicas de uma mão, com parâmetros manuais observáveis. [Tese de Tamires Martins Rezende, Apêndice B, Tabela 17](https://repositorio.ufmg.br/server/api/core/bitstreams/4307a8e9-f22e-4374-a900-0f42d88974a8/content)

| Clipe | Referência de execução no avatar | Parâmetro usado pela prática guiada |
| --- | --- | --- |
| `signal-cinco` | Indicador e médio fletidos em V, palma para frente e mão à frente do tronco. Forma registrada no MINDS-Libras. | Orientação da palma da mão direita em captura nítida. |
| `signal-amarelo` | Mão em D, indicador parte da testa em direção ao nariz, com palma para a esquerda da pessoa destra. | Trajetória vertical do indicador se rosto e mão estiverem rastreados. |
| `signal-espelho` | Mão aberta à frente do rosto, palma voltada à pessoa sinalizante, com oscilações de rotação para os lados. | Orientação da palma voltada à pessoa na forma destra. |

## Apresentação

O clipe `signal-nome` desloca os dedos indicador e médio unidos para o lado direito da pessoa sinalizante. O clipe `signal-meu` leva a mão aberta ao peito. O exemplo de GoiásLibras ordena NOME, ME@ e datilologia na frase “Meu nome é Alexandre”.

- [NOME, GoiásLibras](https://goiaslibras.educacao.go.gov.br/sinal/nome)
- [Libras para Acadêmicos, p. 25, acervo do Clube de Libras da UFC](https://clubedelibras.ufc.br/wp-content/uploads/2021/04/livro-librasparaacademicos-basico1-profandersonduarte.pdf#page=23)
- [Pronomes possessivos, p. 153, repositório da UTFPR](https://repositorio.utfpr.edu.br/jspui/bitstream/1/1598/2/libras.pdf)

## Pares para observar na lição

| Par | O que observar |
| --- | --- |
| A e S | Em A, o polegar fica na lateral do punho. Em S, cruza a frente dos dedos fechados. |
| I e J | As duas letras começam com o mínimo estendido. A trajetória do pulso e da mão identifica J. |
| G e Q | O indicador se mantém estendido. A orientação muda de cima para baixo. |
| N e U | Ambas estendem indicador e médio; a mão aponta para baixo em N e para cima em U. |

Os contrastes são adequados para atividades visuais sem câmera. O trio da lição inicial tem configurações e trajetórias distintas. ESPELHO e AMARELO compartilham a região do rosto e permitem observar como a configuração e o movimento se combinam. [Diniz, 2020, p. 454–455](https://revistas.ufrj.br/index.php/rl/article/download/37488/22633/114954)

### Triagem da letra N

Em 27 de novembro de 2026, a pessoa usuária relatou dificuldade com N. Na aula da UFSM, N mostra indicador e médio juntos voltados para baixo, M acrescenta o anelar e U mostra indicador e médio voltados para cima. Diniz identifica N e U como par que se distingue pela orientação da palma. [Aula Libras ON, UFSM](https://ntetube.nte.ufsm.br/v/1527000916) · [Diniz, 2020, p. 455](https://revistas.ufrj.br/index.php/rl/article/download/37488/22633/114954#page=4)

No commit `0a36425`, o clipe de N estende indicador e médio, usa a mesma rotação para baixo de M e deixa o anelar flexionado. Na renderização frontal do Chromium, os dedos estendidos ficam parcialmente sobrepostos. A comparação visual com M fica difícil. A revisão deve conferir a rotação da mão e a visibilidade dos dedos na letra isolada e na soletração. O replay da câmera reconheceu N, M e U nos três recortes de cada letra da UFSM. A causa da dificuldade na webcam da pessoa usuária segue em aberto. [Verificação do leitor](dados-alfabeto.md#cobertura-e-verificação) · [Tarefa de revisão](../ROADMAP_LIBRASIA.md#prioridades-da-retomada)

Na versão `0.2.1-preliminar`, a rotação de M e N volta o dorso da mão para o observador e deixa as pontas à frente do pulso. A renderização frontal no Chromium exibe três dedos voltados para baixo em M, dois em N e dois voltados para cima em U. A verificação do tradutor reproduziu os dois Ns de “Meu nome é Anna”. A revisão linguística com pessoas fluentes segue pendente. [Alfabeto na UFSM](https://ntetube.nte.ufsm.br/v/1536677587) · [Teste de navegador](../tests/e2e/browser.test.mjs)

Na versão `0.2.2-preliminar`, o cotovelo de M e N sobe e a primeira articulação dos dedos estendidos flexiona levemente. A mudança reduz a dobra do pulso no avatar. Em N, só indicador e médio descem juntos. Em M, o anelar acompanha os outros dois. U mantém a palma voltada para quem observa e as duas pontas para cima. O material do IF Baiano e as gravações do Cecierj, da Unesp e da UFSM mostram a diferença entre as letras, com variação na inclinação do antebraço. [Quadro do IF Baiano](https://www.ifbaiano.edu.br/unidades/bonfim/files/2022/07/Alfabeto-manual-em-Libras-1.pdf) · [Cecierj](https://canal.cecierj.edu.br/recurso/13757) · [Unesp](https://acervodigital.unesp.br/handle/unesp/222981)

O Chromium exibiu as comparações **M e N** e **N e U** na página Alfabeto e reproduziu “Meu nome é Anna” com os dois Ns. Os testes do avatar verificam a orientação, a flexão do anelar e a transição do cotovelo. A revisão linguística e a execução na webcam por uma pessoa sinalizante continuam pendentes. [Teste de navegador](../tests/e2e/browser.test.mjs) · [Testes do avatar](../tests/avatar.test.js)

Na comparação técnica para a retomada, a vista frontal do avatar reproduz os traços principais do N do IF Baiano. O indicador e o médio aparecem juntos, voltados para baixo, com o dorso visível e o anelar dobrado. A revisão em Libras deve conferir a inclinação do antebraço, a posição do polegar e a legibilidade em sequência. O teste da câmera deve registrar separadamente se a mão foi rastreada e qual letra o painel exibiu. [Quadro do IF Baiano, página 1](https://www.ifbaiano.edu.br/unidades/bonfim/files/2022/07/Alfabeto-manual-em-Libras-1.pdf) · [Reteste com vídeo](dados-alfabeto.md#reteste-com-a-pose-revisada-de-n)

## Expansão de vocabulário e variantes

| Animação | Uso e contexto |
| --- | --- |
| `signal-aluno` | Versão monomanual descrita no MINDS-Libras. A mão em A se aproxima da parte superior do braço contralateral. O ponto de articulação se aproxima da forma do curso de Letras-Libras documentada por Machado. |
| `signal-aluno-fortaleza-historico` | Reconstrução preliminar a partir de fotografia frontal e escrita de sinais de Machado. As duas mãos ficam à frente do tronco, com palmas voltadas para cima e polegares para dentro, e se deslocam lateralmente em espelho. O autor registra como histórica a forma estudada em Fortaleza e relata seu desuso na comunidade observada até 2016. |
| `signal-bom` | Mão com dedos reunidos diante da boca e abertura enquanto se afasta. Integra o cumprimento “Bom dia”. |
| `signal-dia` | Forma monomanual de DIA em que a mão em L parte da lateral da cabeça e se afasta lateralmente. É a forma (b) ilustrada por Duarte. |

Em “Bom dia”, os clipes são executados na ordem BOM e DIA. As duas formas de ALUNO podem ser comparadas no avatar. O reconhecimento da lição depende de um modelo avaliado para a respectiva classe, incluindo as variantes anunciadas.

### Cobertura e reteste de M9

O tradutor oferece “Bom dia, meu nome é [nome]” com os clipes de BOM DIA, uma pausa, NOME MEU e a soletração. O Chromium percorreu a sequência completa com “Bom dia! Meu nome é Ivo.”. A interface indica que a avaliação de reconhecimento usou a forma de Aluno do MINDS-Libras e permite comparar no avatar a forma histórica de Fortaleza. [Teste do tradutor](../tests/translate.test.js) · [Teste no Chromium](../tests/e2e/browser.test.mjs)

O combinado reconheceu Aluno S11-1 em duas tentativas com gravação da partição reservada. No recorte externo do CLAD em que a mão passa do queixo ao teclado, a tentativa ficou inconclusiva e preservou o texto. Os registros ficam em `data/evidence/demonstracao/m9-cobertura/`. A revisão com pessoas fluentes e os novos testes fora do treino ficam nas pendências. [Controle de Aluno e proveniência](negativos.md#verificação-de-aluno-pela-posição-da-mão) · [Pendências](pendencias-futuras.md#m8-a-m11--piloto-cobertura-dados-contínuos-e-publicação)

- [Duarte, Libras para Acadêmicos, pp. 24–25, acervo do Clube de Libras da UFC](https://clubedelibras.ufc.br/wp-content/uploads/2021/04/livro-librasparaacademicos-basico1-profandersonduarte.pdf#page=22)
- [Luciana Marques Vale, Curso Básico de Libras, p. 12, repositório Enap](https://repositorio.enap.gov.br/items/367214fd-f325-49e6-8f9b-af29fa258be3). A Enap detém os direitos e sua licença permite uso educacional com crédito, sem uso comercial.
- [Rodrigo Nogueira Machado, 2016, tabela 5 e explicação nas pp. 79–81, repositório UFSC](https://repositorio.ufsc.br/bitstream/123456789/173253/1/343702.pdf#page=81)

## Verificação técnica

Em 26 de novembro de 2026, o Chromium 156.0.8078.79 em modo headless com WebGL no Debian 13 renderizou as poses A, C, M, CINCO, AMARELO e ESPELHO. A verificação do player reproduziu I, J, uma pausa e duas ocorrências de N na ordem correta, congelou a imagem ao pausar, retomou em outra velocidade e reiniciou a fila. A animação BOM DIA encerrou na segunda pose, e a variante histórica de ALUNO foi reproduzida em uma área estreita. A suíte `tests/avatar.test.js` também amostra a geometria e o enquadramento de todos os clipes.

## Revisão pendente

A equipe precisa validar a legibilidade de cada clipe com pessoas surdas fluentes em Libras. A revisão deve conferir contato dos dedos, orientação, trajetória, expressão, diferenças entre a letra isolada e em nome, separação de letras repetidas, pausas, uso da cedilha e tratamento de outras marcas ortográficas. Deve confirmar a glosa da apresentação, o sentido suportado em cada expressão, a variante proposta e a qualidade das dicas em tentativa real. Registrar, por item, versão, pessoa revisora, data, julgamento, ajustes e reteste.
