# Animações do LibrasIA

Versão do catálogo `0.1.0-preliminar`. As poses e trajetórias foram modeladas em código com geometria original. O navegador carrega o código local do avatar. As obras de referência servem à consulta e seus arquivos não integram o aplicativo.

## Alfabeto manual

O catálogo tem 26 letras e a forma dinâmica da cedilha. Cada posição articula separadamente a base, a articulação média e a ponta de cada dedo. O pulso recebe posição e orientação próprias. O avatar usa a mão direita e mantém a esquerda em repouso. A câmera frontal enquadra as mãos, o rosto e a parte superior do tronco.

As referências orientam os movimentos de Ç, H, J, K, W, X, Y e Z. O clipe de P inclui o giro de apresentação para atingir a orientação ilustrada no quadro de Duarte. Entre letras diferentes, o player interpola as articulações e a posição do pulso. Entre letras iguais, um deslocamento breve separa as duas ocorrências. A fila aceita pausas explícitas entre as partes de nomes compostos.

- Anderson Duarte, *Libras para Acadêmicos*, básico I, p. 16. Quadro fotográfico de A–Z e Ç com setas de movimento. [Acervo do Clube de Libras da UFC](https://clubedelibras.ufc.br/wp-content/uploads/2021/04/livro-librasparaacademicos-basico1-profandersonduarte.pdf#page=14)
- Heloise Gripp Diniz, *Descrição da variação fonético-fonológica na letra manual “e” em Libras*, 2020, p. 454–455. Documenta pares mínimos, movimentos e variantes, como A/S, F/T, G/Q, I/J e N/U. [Revista Linguística da UFRJ](https://revistas.ufrj.br/index.php/rl/article/download/37488/22633/114954)
- Instituto Nacional de Educação de Surdos. Referência institucional para consulta. O portal declara licença CC BY-ND 3.0 para seu conteúdo. [Alfabeto de Libras e configuração de mãos](https://www.gov.br/ines/pt-br/central-de-conteudos/publicacoes-1/todas-as-publicacoes/alfabeto-manual-e-configuracao-de-maos)

## Sinais da lição

A fonte dos parâmetros é a descrição das amostras do MINDS-Libras. O trio inicial inclui uma execução estática e duas dinâmicas de uma mão, com parâmetros manuais observáveis. [Tese de Tamires Martins Rezende, Apêndice B, Tabela 17](https://repositorio.ufmg.br/server/api/core/bitstreams/4307a8e9-f22e-4374-a900-0f42d88974a8/content)

| Clipe | Referência de execução no avatar | Parâmetro candidato a feedback |
| --- | --- | --- |
| `signal-cinco` | Indicador e médio fletidos em V, palma para frente e mão à frente do tronco. Forma registrada no MINDS-Libras. | Configuração dos dedos em captura nítida. |
| `signal-amarelo` | Mão em D, indicador parte da testa em direção ao nariz, com palma para a esquerda da pessoa destra. | Trajetória vertical do indicador se rosto e mão estiverem rastreados. |
| `signal-espelho` | Mão aberta à frente do rosto, palma voltada à pessoa sinalizante, com oscilações de rotação para os lados. | Rotação do pulso se a mão permanecer rastreada. |

## Apresentação

O clipe `signal-nome` desloca os dedos indicador e médio unidos para o lado direito da pessoa sinalizante. O clipe `signal-meu` leva a mão aberta ao peito. O exemplo de GoiásLibras ordena NOME, ME@ e datilologia na frase “Meu nome é Alexandre”.

- [NOME, GoiásLibras](https://goiaslibras.educacao.go.gov.br/sinal/nome)
- [Libras para Acadêmicos, p. 25, acervo do Clube de Libras da UFC](https://clubedelibras.ufc.br/wp-content/uploads/2021/04/livro-librasparaacademicos-basico1-profandersonduarte.pdf#page=23)
- [Pronomes possessivos, p. 153, repositório da UTFPR](https://repositorio.utfpr.edu.br/jspui/bitstream/1/1598/2/libras.pdf)

## Revisão pendente

A equipe precisa validar a legibilidade de cada clipe com pessoas surdas fluentes em Libras. A revisão deve conferir contato dos dedos, orientação, trajetória, expressão, diferenças entre a letra isolada e em nome, separação de letras repetidas, pausas, uso da cedilha e tratamento de outras marcas ortográficas. Deve confirmar a glosa da apresentação, o sentido suportado em cada expressão, a variante proposta e a qualidade das dicas em tentativa real. Registrar, por item, versão, pessoa revisora, data, julgamento, ajustes e reteste.
