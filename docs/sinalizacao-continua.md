# Experimentos de sinalização contínua (M10)

O estudo de glosas para português avalia o componente textual em um corpus paralelo da UFPB, com as glosas de entrada fornecidas. A triagem de dados de vídeo identifica o que falta para medir conjuntamente segmentação, reconhecimento e tradução com pessoas fora do treino. [Glosas para português](glosas-texto.md) · [Triagem de fontes anotadas](dados-glosas.md)

Os experimentos usam gravações contínuas reais. A tradução inicial é avaliada em frases roteirizadas do setor de energia. A segmentação é avaliada em trilhas temporais de uma entrevista pública do Corpus Libras. O aplicativo oferece sinais isolados e um modo experimental de sequências separadas por pausas. Os modelos deste estudo permanecem em pesquisa local enquanto a equivalência das coordenadas e o desempenho na webcam estão em avaliação.

## Fluxo contínuo experimental na câmera

O modo local usa os quadros do Holistic em uma grade de 100 ms. O detector ONNX propõe fronteiras, o classificador já usado na área livre reconhece cada trecho e o tradutor monotônico propõe texto a partir da sequência de glosas. A interface exibe as glosas detectadas e permite revisar a sequência. A transcrição recebe a sugestão quando a pessoa a confirma. [Treino do detector de fronteiras](fronteiras.md) · [Treino da tradução de glosas](comparacao-glosas.md)

Com os pesos de fronteiras, o corpus textual e a validação local preparados conforme os ensaios acima, execute na raiz do projeto.

```bash
.venv/bin/python -m ml.continuous_experiment.boundaries.export
.venv/bin/python -m ml.continuous_experiment.gloss_text.export_web \
  data/vlibrasbd-v2 data/vlibrasbd-holdout
LIBRASIA_CONTINUO=1 LIBRASIA_PORTA=4201 \
  LIBRASIA_MODELO=data/models/isolated-combined ./scripts/executar-local.sh
```

Abra [Área livre](http://127.0.0.1:4201/#area-livre) e selecione **Sinalização contínua experimental**. Ative a câmera e abra uma tentativa. Confira os sinais detectados. Para ajustar a sequência, edite os nomes no campo de revisão, substitua ou remova os trechos marcados com `?` e use **Gerar sugestão**. Use **Acrescentar à transcrição** para confirmar. No modelo combinado, o catálogo tem Cinco, Espelho, Amarelo e Aluno.

Para reabrir o pacote local já compilado neste PC, execute `python3 data/releases/librasia-continuo-revisao/iniciar.py --porta 4201` na raiz do projeto.

Os pesos de fronteiras são mantidos no ambiente local de pesquisa. O detector congelado tem SHA-256 `c6fc6ba3f013c2d551eb9e0614a1dff326bb028b2d81c84cb4442eed9154b610`. O artefato monotônico deriva de 14.000 pares de treino do VLibrasBD v2, sob CC BY-SA 4.0, e tem SHA-256 `99cee189d6fd05402cf0a04c4dac706fd25470933240c3e8929aab927e421b11`. Cada carregamento confere os hashes. [Condições da fonte UFSC](fronteiras.md#proveniência-e-condições-de-uso) · [VLibrasBD v2 e atribuição](glosas-texto.md)

### Revisão dos sinais detectados

Na prévia experimental do Chromium, o controle com Amarelo e Espelho apresentou sete trechos em cada execução. Em ambas apareceram Amarelo repetido e Espelho. O último trecho foi lido como Cinco na primeira execução e ficou inconclusivo no reteste do pacote `b514496`. O texto anterior permaneceu intacto. A revisão substituiu a sequência por “amarelo espelho”, mostrou a sugestão e acrescentou o texto uma vez após a confirmação. Uma nova edição invalidou a sugestão anterior. No recorte de repouso do CLAD, dois trechos ficaram inconclusivos e o texto também foi preservado. O reteste isolado de Cinco acrescentou a palavra ao concluir a tentativa.

Na webcam física Acer HD User Facing a 640 × 480, a tentativa em repouso ficou inconclusiva, sem fronteiras detectadas. A trilha foi liberada ao sair da Área livre. O ensaio com Amarelo e Espelho usou clipes de treino unidos. A avaliação de sequências naturais com anotação de referência e a revisão do sentido em português seguem pendentes.

Para repetir o controle com vídeo, sirva a prévia com o detector Holistic com penalidade de corte e use:

~~~bash
LIBRASIA_TEST_URL=http://127.0.0.1:4201 LIBRASIA_TEST_RECOGNITION=1 \
  LIBRASIA_TEST_CONTINUOUS=1 LIBRASIA_TEST_CAPTURE_MS=7900 LIBRASIA_TEST_GLOSS_REVIEW=1 \
  LIBRASIA_TEST_TRANSCRIPT_PREFIX='Texto conferido.' \
  LIBRASIA_TEST_VIDEO=data/evidence/continuo-integrado/amarelo-espelho-s04.y4m \
  node --test tests/e2e/recognition.test.mjs
~~~

Os logs ficam em `data/evidence/continuo-integrado`, nos arquivos `revisao-amarelo-espelho.log`, `revisao-final-b514496.log`, `isolado-b514496.log`, `revisao-repouso.log` e `revisao-webcam.log`. [Configuração do detector com penalidade](#controle-de-fragmentação-no-navegador)

### Preservação do numeral Cinco

O tradutor congelado sugeria “o espelho” para a sequência “cinco espelho”. No modo contínuo, cada trecho da decodificação passou a conservar a quantidade de ocorrências do numeral, aceitando “cinco” e “5”. A sugestão para esse caso passou a “cinco espelho” e continua editável na transcrição. A restrição mantém o numeral informado ao tradutor, inclusive quando a leitura original da câmera estiver errada.

| Teste | Tradutor anterior | Com preservação de Cinco |
| --- | --- | --- |
| 84 combinações de um a três sinais do catálogo | 35 sequências mudaram a contagem de Cinco | 0 mudaram a contagem |
| 1.800 pares da amostra reservada, WER | 50,66% | 50,66% |
| 53 pares com Cinco ou 5 em pelo menos um lado, WER | 57,32% | 56,59% |
| 44 pares desses 53 com contagem positiva igual nos dois lados | 3 omissões de Cinco frente ao português | 0 omissões |
| 66 pares numéricos da validação, WER | 61,85% | 63,65% |

Os recortes textuais vêm dos mesmos componentes reservados do VLibrasBD v2. A presença de Cinco em pelo menos um lado define o recorte numérico. No teste, nove pares desse recorte tinham contagens diferentes entre as glosas e o português. Cada WER usa uma referência e a tokenização do ensaio textual. As 84 combinações servem para verificar o numeral, sem referência de correção gramatical. O artefato de tradução foi mantido. [Comparação anterior](comparacao-glosas.md) · [Resultados por partição e método](../ml/evidence/vlibrasbd-holdout/preservacao-cinco.json)

No Chromium, o clipe montado de Amarelo e Espelho produziu Amarelo, Amarelo e Espelho entre sete propostas. Quatro propostas ficaram inconclusivas. Entre as glosas reconhecidas, houve uma inserção de Amarelo em relação aos dois sinais de referência. A tentativa preservou a transcrição. Com os sinais fornecidos diretamente ao tradutor, a saída foi “amarelo espelho”. O teste também conferiu a sugestão “cinco espelho” após editar as glosas, antes de confirmar qualquer texto. O log fica em `data/evidence/continuo-integrado/cinco-revisao-teste.log`. [Teste da revisão](#revisão-dos-sinais-detectados)

Reproduza a comparação textual com o CSV e o artefato do navegador já preparados.

~~~bash
.venv/bin/python -m ml.continuous_experiment.gloss_text.evaluate_five \
  data/vlibrasbd-v2 data/vlibrasbd-holdout data/vlibrasbd-holdout/preservacao-cinco.json
~~~

### Ensaio da integração no Chromium

O pré-processamento e a decodificação de fronteiras coincidiram com o Python em controles de paridade. O ONNX em WASM reproduziu os intervalos do Python com diferença máxima de 2,38 × 10⁻⁷ nas probabilidades. O tradutor carregado no navegador repetiu as saídas de referência. Na comparação Python e JavaScript, os 1.200 pares de validação e 12 casos adicionais tiveram saídas idênticas.

| Controle pela câmera simulada | Trechos propostos | Glosas reconhecidas | Resultado na transcrição |
| --- | ---: | --- | --- |
| Amarelo do Cederj | 4 | Nenhuma | Texto anterior preservado |
| Amarelo e Espelho S04, dois clipes do treino unidos | 8 | Amarelo, Amarelo, Espelho | Texto anterior preservado |
| Repouso CLAD 01a | 7 | Nenhuma | Texto anterior preservado |

As decisões levaram de 27 a 30 ms depois do clique de conclusão. O excesso de propostas em repouso e a repetição de Amarelo mostram que o detector, treinado com Hand Landmarker, ainda precisa de ajuste com pontos do Holistic e de avaliação em gravações contíguas anotadas. A medição de erro de glosas e tradução em sequências naturais segue pendente. Os registros locais ficam em `data/evidence/continuo-integrado`.

O teste de câmera usa `LIBRASIA_TEST_CONTINUOUS=1` no [roteiro automatizado](../tests/e2e/recognition.test.mjs), junto do Y4M sincronizado e da duração da tentativa. O controle abaixo verifica que a tentativa preserva o texto anterior quando os trechos ficam inconclusivos.

```bash
LIBRASIA_TEST_URL=http://127.0.0.1:4201/ LIBRASIA_TEST_RECOGNITION=1 \
  LIBRASIA_TEST_CONTINUOUS=1 LIBRASIA_TEST_CAPTURE_MS=4200 \
  LIBRASIA_TEST_TRANSCRIPT_PREFIX='Texto conferido.' \
  LIBRASIA_TEST_VIDEO=data/evidence/controle-nariz-browser/clad-repouso-01a.y4m \
  node --test tests/e2e/recognition.test.mjs
```

### Controle de fragmentação no navegador

A exportação do detector aceita as condições congeladas do [protocolo](../ml/continuous_experiment/boundaries/fragmentation-reserved.json) para testar a penalidade de corte e, opcionalmente, o piso de cinco posições. O navegador aceita os dois formatos de decodificador. A prévia padrão usa os artefatos originais. [Medição reservada das fronteiras](fronteiras.md#resultado-na-partição-reservada)

| Condição | Propostas em Amarelo e Espelho | Propostas em repouso |
| --- | --- | --- |
| Original | 7, com Amarelo e dois Espelhos | 7, todas inconclusivas |
| Penalidade de corte | 7, com Amarelo e Espelho | 2, ambas inconclusivas |
| Penalidade e piso de cinco posições | 6, com Amarelo e dois Espelhos | 3, todas inconclusivas |

Cada linha corresponde a um replay de cada cenário no Chromium. A sequência usa dois clipes MINDS de treino unidos e não representa sinalização natural. As seis tentativas preservaram o texto anterior. Ainda é necessário avaliar o erro de glosas e de tradução em sequências anotadas dentro da cobertura do catálogo. [Leituras, janelas e versões](../ml/evidence/ufsc-boundaries/fragmentation-browser.json)

```bash
fronteiras=data/ufsc-boundaries/holistic/web-only-cut
.venv/bin/python -m ml.continuous_experiment.boundaries.export \
  data/ufsc-boundaries/holistic/boundary-model.pt "$fronteiras" \
  --decoder-protocol ml/continuous_experiment/boundaries/fragmentation-reserved.json \
  --condition holistic_weak_cut
LIBRASIA_CONTINUO=1 LIBRASIA_FRONTEIRAS="$fronteiras" \
  LIBRASIA_MODELO=data/models/isolated-combined LIBRASIA_PORTA=4201 ./scripts/executar-local.sh
```

Para acrescentar o piso de cinco posições ao ensaio, selecione `holistic_weak_cut_with_floor` na exportação.

### Diálogo didático do Cederj

O recorte de 210,500 a 220,500 s da aula 12 da UFF e do Consórcio Cederj preserva dois turnos de um diálogo roteirizado num único enquadramento. Identificamos duas ocorrências de Amarelo pela trajetória do indicador junto à testa e ao nariz, comparada à demonstração isolada da mesma aula, com apoio da legenda em português. A pessoa à direita sinaliza entre 213,000 e 214,000 s e a da esquerda entre 217,500 e 218,100 s. A anotação visual é aproximada e aguarda revisão fluente. O protocolo fixou os intervalos, o recorte e os candidatos antes da extração de pontos e da inferência. [Aula e créditos no portal da Fundação Cecierj](https://canal.cecierj.edu.br/recurso/13766) · [Publicação em CC BY 3.0](https://www.youtube.com/watch?v=4NVpij6RvGg) · [Protocolo](../ml/evidence/ufsc-boundaries/cederj-dialogue-protocol.json)

O piloto usa um único diálogo com uma classe anotada do catálogo. Há outras glosas no quadro e duas pessoas simultaneamente, o que pode afetar o Holistic, que rastreia uma pessoa por quadro. A demonstração isolada da mesma aula já foi usada em outra avaliação. A inspeção dos diálogos das aulas 5 e 9 não confirmou duas classes do catálogo no mesmo trecho. Os 5.335 registros do EQT v4 vieram com `label_gloss` vazio. As anotações ELAN do Corpus Libras oferecem casos com `5` e `ALUNO` na mesma trilha. O uso formal dessas gravações continua sujeito às condições do acervo. [Aula 5](https://canal.cecierj.edu.br/recurso/13764) · [Aula 9](https://canal.cecierj.edu.br/recurso/13763) · [Triagem de fontes](dados-glosas.md) · [FAQ do Corpus Libras](https://corpuslibras.ufsc.br/espacointerativo/perguntas/view/6)

O script verifica os hashes do MP4 e dos modelos, corta o trecho sem áudio e usa o Chromium para extrair uma grade fixa a 10 fps. Os quatro candidatos recebem os mesmos quadros, pelo mesmo classificador de sinais e pelo mesmo tradutor do aplicativo. O Holistic retornou pelo menos uma mão nos 100 quadros. O melhor IoU de cada anotação compara a duração da interseção temporal com a da união, independentemente do rótulo previsto.

| Condição | Propostas | Melhor IoU à direita | Melhor IoU à esquerda | Amarelo com IoU ≥ 0,50 |
| --- | ---: | ---: | ---: | ---: |
| Detector original | 16 | 0,50 | 0,10 | 0/2 |
| Holistic sem controle de fragmentação | 14 | 0,50 | 0,10 | 0/2 |
| Holistic com penalidade de corte | 10 | 0,60 | 0,10 | 0/2 |
| Holistic com penalidade e piso de cinco posições | 12 | 0,60 | 0,10 | 0/2 |

As duas rodadas com SwiftShader e decodificação por CPU geraram relatórios idênticos. O primeiro ensaio com a configuração padrão do Chromium contou 11 propostas com penalidade e piso e manteve os mesmos totais para as outras condições. Em todos os casos, cada detector alinhou um dos dois intervalos com IoU ≥ 0,50, nenhuma proposta recebeu o rótulo Amarelo e o fluxo permaneceu inconclusivo, sem sugestão de texto. As condições Holistic compartilham os pesos e usam parâmetros de decodificação diferentes. A anotação parcial permite comparar os dois alvos e deixa em aberto a precisão sobre todas as glosas do trecho. A avaliação de sequência e tradução ainda precisa de anotação fluente de duas ou mais classes, texto de referência e validação em webcam física. [Resultado por intervalo](../ml/evidence/ufsc-boundaries/cederj-dialogue-browser.json)

```bash
mkdir -p data/continuous-natural-eval
node ml/continuous_experiment/boundaries/replay-dialogue.mjs "$PWD" \
  data/continuous-natural-eval/replay-dialogue.json
```

Execute na raiz do repositório com FFmpeg, Chromium, dependências do projeto e os ativos locais previstos no protocolo. O Vite abre uma porta de loopback temporária. Para reproduzir o Chromium com renderização por software, indique em `LIBRASIA_CHROMIUM` um executável que invoque o navegador com `--use-gl=angle --use-angle=swiftshader --disable-accelerated-video-decode`.

#### Diagnóstico do classificador de Amarelo

O diagnóstico entrega ao classificador combinado `a8e991d9` os intervalos de referência já anotados, quatro janelas adjacentes e as propostas automáticas que sobrepõem as referências. O limiar de 0,525 e a extração Holistic ficaram fixos. Para cada quadro do diálogo, também extraímos pontos nas duas metades da imagem, conservando a escala em pixels e usando um rastreador separado por metade. O lado rastreado usa o centro dos ombros no quadro inteiro. Um controle geométrico reexpressa os pontos da imagem inteira nas coordenadas da metade correspondente e compara os tensores que alimentam a inferência. [Protocolo do diagnóstico](../ml/evidence/ufsc-boundaries/cederj-diagnosis-protocol.json)

| Intervalo anotado | Quadro inteiro | Metade da pessoa que sinaliza |
| --- | --- | --- |
| Amarelo à direita | 10/10 quadros com a pessoa da direita. Inconclusivo, com escore de Amarelo de 0,472. | 10/10 quadros com a pessoa da direita. Classe de rejeição com 0,5254 e Amarelo com 0,361. |
| Amarelo à esquerda | 6/6 quadros com a pessoa da direita. Aluno com 0,977 e Amarelo com 0,010. | 6/6 quadros com a pessoa da esquerda. Amarelo com 0,565. |

Os dois controles geométricos tiveram diferença máxima zero nos tensores. À esquerda, a combinação do enquadramento e da escolha da pessoa pelo Holistic mudou a decisão. À direita, o mesmo classificador rejeitou a janela manual mesmo com a pessoa que sinaliza rastreada e isolada no quadro. A demonstração frontal da mesma aula também ficou inconclusiva, com Amarelo em 0,373. A tomada de treino MINDS S01-1, usada como controle de funcionamento, deu Amarelo em 0,877. Os recortes variam em pessoa, realização e posição, de modo que o ensaio deixa em aberto a contribuição individual desses fatores. [Demonstração institucional](https://canal.cecierj.edu.br/recurso/13766) · [Tomada MINDS](sinais-com-movimento-browser.md)

O replay do quadro inteiro repetiu exatamente as propostas congeladas. À direita, as cinco janelas sobrepostas distintas tinham 500 a 600 ms, passaram pelo pré-processamento e ficaram inconclusivas. O maior escore de Amarelo foi 0,502. À esquerda, o melhor IoU com a referência foi 0,10 e as três propostas sobrepostas distintas receberam Aluno. Nos quatro intervalos adjacentes, o quadro inteiro acompanhou a pessoa da direita e retornou Espelho, uma tentativa inconclusiva e duas de Aluno, na ordem do vídeo. Essas janelas servem como controles de contexto e carecem de anotação lexical para medir acertos. [Decisões, escores e rastreamento por janela](../ml/evidence/ufsc-boundaries/cederj-dialogue-diagnosis.json)

Na execução registrada, concluímos a extração e a segmentação do quadro inteiro antes de reabrir o mesmo vídeo para os recortes laterais. Uma tentativa intercalada produziu intervalos automáticos diferentes. O comando abaixo conserva a ordem usada no resultado registrado.

```bash
node ml/continuous_experiment/boundaries/replay-dialogue.mjs "$PWD" \
  data/continuous-natural-eval/diagnosis.json --diagnose
```

### Amarelo com uma pessoa no quadro

O BioCiNAIS da UFF mostra Amarelo antes de Metal no item sobre cores da reciclagem e um movimento compatível com Amarelo depois de Febre na expressão legendada *Febre amarela*. Cada recorte mantém a transição original entre os sinais e uma única pessoa no quadro. Metal e Febre ficam fora da cobertura do catálogo. Para o segundo item, a identificação do componente Amarelo é visual e fica sujeita à revisão fluente. O MP4 disponível sob o nome *Materiais poliméricos* no depósito traz a cartela *Libras em Saúde*. A abertura dos dois arquivos indica CC BY-NC-SA, condição aplicada às versões locais. [Vídeos e metadados BioCiNAIS](https://educapes.capes.gov.br/handle/capes/431171?mode=full)

O Caderno Didático de Libras D da UFSM apresenta Amarelo de frente com rótulo próprio, em um exercício de vocabulário com pausas. As três janelas manuais, os intervalos de contexto e os hashes dos vídeos foram fixados antes da inferência. Os quadros foram processados a 10 fps com o mesmo Holistic, classificador combinado, limiar 0,525 e quatro detectores utilizados no Cederj. [Aula Cores da UFSM, CC BY-NC-SA 4.0](https://ntetube.nte.ufsm.br/v/1543949237) · [Protocolo](../ml/evidence/ufsc-boundaries/single-signer-amarelo-protocol.json)

| Janela manual | Quadros com mão | Escore de Amarelo | Decisão |
| --- | ---: | ---: | --- |
| BioCiNAIS, Amarelo antes de Metal, 142,000–142,900 s | 9/9 | 0,549 | Amarelo |
| BioCiNAIS, componente de Febre amarela, 46,300–47,400 s | 11/11 | 0,803 | Amarelo |
| UFSM, apresentação de Amarelo, 38,700–40,100 s | 14/14 | 0,113 | Rejeição |

As três janelas chegaram à inferência, com mão detectada em todos os quadros. A demonstração frontal do Cederj, também de uma pessoa, teve escore de 0,373. Os recortes BioCiNAIS mostram que o mesmo classificador pode recuperar Amarelo junto de outra articulação. A rejeição da demonstração da UFSM mostra que a presença de apenas uma pessoa e a cobertura de mão também ocorreram em uma perda. [Diagnóstico do Cederj](../ml/evidence/ufsc-boundaries/cederj-dialogue-diagnosis.json)

| Detector | Antes de Metal, melhor IoU rotulado | Em Febre amarela, melhor IoU rotulado | UFSM, melhor IoU rotulado |
| --- | ---: | ---: | ---: |
| Original | 0,667 | 0,545 | 0 |
| Holistic sem controle de fragmentação | 0,556 | 0,455 | 0 |
| Holistic com penalidade de corte | 0,667 | 0,455 | 0 |
| Holistic com penalidade e piso de cinco posições | 0,667 | 0,455 | 0 |

Na reciclagem, as quatro condições alinharam e reconheceram Amarelo em IoU ≥ 0,50. As duas condições com penalidade propuseram nove intervalos cada, contra 14 do Holistic sem controle. Em Febre amarela, o classificador retornou Amarelo em todas as condições. Só o original atingiu IoU ≥ 0,50, com duas propostas de Amarelo na mesma ocorrência. Na UFSM, o maior IoU de qualquer proposta foi 0,429. As 12 combinações de recorte e detector ficaram inconclusivas, sem texto sugerido. A anotação cobre uma classe e as fontes trazem exemplos didáticos. Os recortes BioCiNAIS vêm da mesma produção e a independência entre eles por pessoa fica sem verificação. [Propostas, janelas manuais e escores](../ml/evidence/ufsc-boundaries/single-signer-amarelo-browser.json)

```bash
node ml/continuous_experiment/boundaries/replay-dialogue.mjs "$PWD" \
  data/continuous-natural-eval/single-signer/replay.json --single-signer
```

Use os caminhos dos MP4 indicados no protocolo. O comando preserva a velocidade dos trechos, remove o áudio e usa uma porta de loopback temporária.

### Frases do EQT fora do vocabulário

A triagem leu as 5.335 referências oficiais do EQT-UECE v4. A busca por palavras inteiras, incluindo flexões de Amarelo, Espelho e Aluno, além de `cinco` e `5`, encontrou zero frases com esses termos. Os campos de glosas vieram vazios. A busca mede a cobertura do vocabulário nas referências em português. A anotação em português deixa em aberto a identidade dos sinais produzidos em cada trecho. [Release v4, CC BY-NC 4.0](https://zenodo.org/records/21398895) · [Protocolo e lista de termos](../ml/evidence/ufsc-boundaries/eqt-outside-catalog-protocol.json)

O ensaio reaproveitou os mesmos 12 vídeos integrais do teste oficial usados na paridade do gerador EQT. No Chromium, o Holistic encontrou mãos em 425 de 483 quadros amostrados a 10 Hz. As quatro condições usaram o classificador combinado, o mesmo tradutor e as mesmas imagens.

| Detector | Propostas | Propostas rotuladas | Frases com sugestão |
| --- | ---: | ---: | ---: |
| Original | 92 | 13 | 0 de 12 |
| Holistic sem controle de fragmentação | 81 | 12 | 0 de 12 |
| Holistic com penalidade de corte | 61 | 12 | 0 de 12 |
| Holistic com penalidade e piso de cinco posições | 61 | 15 | 0 de 12 |

Cada tentativa teve pelo menos um trecho inconclusivo. A configuração da prévia experimental, com penalidade de corte, rotulou sete trechos como Espelho, três como Cinco e dois como Amarelo. O mesmo fluxo, na captura do Chromium com os vídeos 00 e 11 em Y4M, manteve “Texto conferido.” nos dois casos. Esses ensaios medem a abstenção do fluxo em um conjunto de frases fora do vocabulário nominal. A avaliação de glosas e de tradução em sequências anotadas dentro da cobertura continua pendente. [Resultados por vídeo](../ml/evidence/ufsc-boundaries/eqt-outside-catalog-browser.json)

Use os MP4 locais de `data/eqt-v4/web-test`, preparados conforme a seção de reprodução. O comando confere os hashes, abre os vídeos sem cortes no Chromium e registra as propostas com tempos. Os logs da Área livre ficam em `data/continuous-natural-eval/eqt-camera/{00,11}.log`.

~~~bash
node ml/continuous_experiment/boundaries/replay-dialogue.mjs "$PWD" \
  data/continuous-natural-eval/eqt-outside-catalog.json --eqt
~~~

## Base de frases

Moraes et al., *LIBRAS-EQT-UECE: A Dataset for Isolated and Continuous Brazilian Sign Language Recognition and Translation*, descrevem 55 sinais isolados e 123 frases contínuas. Cinco participantes do conjunto de sete gravam cada item. Os rótulos de pessoa são locais ao item. O uso aqui é educacional e não comercial, com atribuição e indicação de que os landmarks foram recortados, filtrados e reamostrados. [Artigo, IEEE Access](https://doi.org/10.1109/ACCESS.2026.3715086) · [Release v4](https://zenodo.org/records/21398895) · [Licença CC BY-NC 4.0](https://zenodo.org/records/21398895/files/LICENSE.txt?download=1)

A aquisição verifica os hashes SHA-256 dos três arquivos de anotação e os CRC dos membros ZIP de landmarks lidos. O `Landmarks.zip` completo foi conferido contra o MD5 oficial `415a18d9be6d65468bcf92db5e940df8`. A aquisição por intervalos HTTPS evita baixar o arquivo de vídeo de 35,6 GB e os landmarks corporais. São cerca de 182 MB transferidos na modalidade mãos, mais 61 KB para as anotações de partição. O ZIP esparso tem tamanho lógico total do original e só contém o diretório central e os dados da modalidade mãos.

| Partição | Anotações com texto | Frases com menos de três palavras | Junções ambíguas descartadas | Usadas |
| --- | ---: | ---: | ---: | ---: |
| Treino | 3.202 | 1.122 | 24 | 2.056 |
| Validação | 1.068 | 372 | 12 | 684 |
| Teste | 1.065 | 371 | 12 | 682 |

O release tem 5.335 alvos de texto e todos os campos `label_gloss` vieram vazios. As referências de frase são tokens de português, sem intervalos por sinal. Os 48 registros ambíguos têm correspondência em duas pastas de título equivalente para o mesmo código de informante local e de vídeo. A ferramenta descarta duplicatas com base no SHA-256 da amostra, bloqueia o vazamento do mesmo item e rótulo local entre partições e preserva o teste oficial. As 114 categorias do subconjunto experimental aparecem no treino, na validação e no teste. A separação por informante local é verificável dentro de cada item. A identidade de uma mesma pessoa entre itens e a generalização a frases novas continuam sem avaliação.

## Texto em português

Cada arquivo NumPy fornece uma sequência de 126 valores por quadro de mãos (duas mãos, 21 pontos por mão, três coordenadas). A reamostragem escolhe 64 índices igualmente espaçados, preservando a ordem e os valores do quadro escolhido. A normalização usa média e desvio exclusivamente do treino.

Os modelos foram treinados em CPU, com semente 422, três threads e lotes de 64. O primeiro usa convoluções temporais e seleciona um texto conhecido. O segundo usa convoluções, GRU e atenção para gerar tokens de português até o marcador de fim. O gerador usa seu próprio token anterior na avaliação. O checkpoint escolhido tem menor WER na validação, com desempate pela maior proporção de frases exatas e pela época mais antiga. A WER mede distância de edição de palavras após normalizar caixa e remover pontuação externa.

| Modelo | Época | WER validação | WER teste | Frases exatas no teste | Inserções | Omissões | Trocas |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Frase mais frequente do treino | — | — | 137,77% | 12/682 | 1.904 | 126 | 3.037 |
| Recuperação de frase roteirizada | 20 | 30,68% | 37,44% | 319/682 | 331 | 256 | 790 |
| Geração de palavras | 24 | 33,12% | 30,70% | 382/682 | 230 | 191 | 708 |

O denominador de teste foi 3.678 palavras de referência. WER pode ultrapassar 100% com muitas inserções. Resultados de texto medem aproximação ao roteiro. A qualidade do sentido em português requer revisão humana com produções de Libras fora desse catálogo.

O gerador foi exportado em dois grafos ONNX opset 17. O encoder recebe `[1, 126, 64]` com normalização incorporada. O decoder recebe um token e o estado recorrente, junto com a memória e as chaves do encoder. Em 12 clipes espaçados do teste, PyTorch e ONNX Runtime CPU 1.23.2 coincidiram nos 74 passos de geração, com erro absoluto máximo de 9,54 × 10⁻⁶ nos tensores. O backend WASM do ONNX Runtime Web 1.24.3 em Node também produziu os mesmos tokens. A paridade usa os landmarks EQT e não valida a webcam do aplicativo.

No RGB de treino `IMG_3311.mp4`, a extração Holistic Web de 82 quadros a 30 fps teve 92,68% de concordância de presença (152/164 quadro-mãos) com os landmarks do release para a ordem esquerda/direita. Nos 105 pares de mãos detectadas em ambas as fontes, o erro absoluto médio (x, y, z) foi (0,00214, 0,00397, 0,00311). Inverter a ordem aumentou o erro médio em x para 0,172. A diferença de 12 detecções indica que o contrato precisa de validação em mais clipes. O clipe confirma a estrutura e a ordem apenas para essa amostra.


O ensaio de ponta a ponta em Chromium 156 com ONNX Runtime Web 1.24.3 usou os mesmos 12 clipes RGB do teste reservado e 62 palavras de referência. Nos 483 quadros amostrados a 10 fps, o Holistic Web detectou ao menos uma mão em 425. Os dois caminhos produziram a mesma hipótese em 11 dos 12 clipes.

| Entrada do mesmo modelo ONNX no Chromium | WER | Frases exatas | Inserções | Omissões | Trocas |
| --- | ---: | ---: | ---: | ---: | ---: |
| Landmarks originais EQT | 29,03% | 6/12 | 4 | 4 | 10 |
| RGB reextraído pelo Holistic Web | 30,65% | 6/12 | 4 | 4 | 11 |

O ensaio comprova que a extração web e o gerador ONNX funcionam juntos nesses clipes completos. O recorte tem 12 gravações de frases conhecidas. A diferença entre os caminhos inclui detecção, escala de entrada e frequência de amostragem. A confirmação em webcam, sinais contínuos fora do roteiro e julgamento de sentido por pessoas fluentes ainda precisam de avaliação.

## Segmentação temporal

A fonte é Quadros, Schmitt, Lohn e Leite, *Corpus de Libras*, UFSC, 2020. Os experimentos usam localmente os vídeos públicos UFSC 159521 e 159522 e a transcrição ELAN da mesma entrevista, vinculada oficialmente no acervo do Inventário Nacional da Libras. O FAQ oficial permite baixar e usar as gravações MP4 e transcrições ELAN para pesquisa e ensino. Os registros individuais dos vídeos não indicam licença adicional. Conservamos os dados de origem e as coordenadas no ambiente local de pesquisa. [Condições de uso do Corpus Libras](https://corpuslibras.ufsc.br/espacointerativo/perguntas/view/7) · [Como citar](https://corpuslibras.ufsc.br/espacointerativo/perguntas/view/9) · [Acervo e transcrição da entrevista](https://corpuslibras.ufsc.br/dados/dado/porprojeto/Invent%C3%A1rio%20Libras) · [Registro da câmera 2](https://repositorio.ufsc.br/handle/123456789/159521?show=full) · [Registro da câmera 3](https://repositorio.ufsc.br/handle/123456789/159522?show=full)

O experimento compara intervalos de atividade manual com anotações de sinal da mão direita. As câmeras 2 e 3 mostram pessoas distintas da mesma entrevista `FLN_G1_D1_1entrevista`. A fonte da anotação `FLN_G1_D1_1entrevista_VIDEOS123-5.eaf` referencia as duas câmeras. Foi reservada uma janela inicial de 60 segundos de cada câmera. A trilha `1SinaisD` calibra parâmetros na câmera 2. A trilha `2SinaisD` fica no teste da câmera 3. O método usa velocidade suavizada dos pontos da mão e uma duração mínima. O emparelhamento de propostas e referências é ordenado e individual. As métricas incluem precisão, revocação, F1 e erros de fronteira com IoU de 0,25, 0,50 e 0,75. [Documentação das câmeras do Corpus](https://uplopen.com/chapters/4860/files/3d9b9750-29db-4a0a-ae97-ebe106dd3d59.pdf) · [MediaPipe Hand Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker?tab=Python)

| IoU mínimo | Partição | Referências | Propostas | Pares | Precisão | Revocação | F1 |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 0,25 | Validação | 65 | 33 | 27 | 81,82% | 41,54% | 55,10% |
| 0,50 | Validação | 65 | 33 | 13 | 39,39% | 20,00% | 26,53% |
| 0,75 | Validação | 65 | 33 | 2 | 6,06% | 3,08% | 4,08% |
| 0,25 | Teste | 42 | 27 | 18 | 66,67% | 42,86% | 52,17% |
| 0,50 | Teste | 42 | 27 | 8 | 29,63% | 19,05% | 23,19% |
| 0,75 | Teste | 42 | 27 | 2 | 7,41% | 4,76% | 5,80% |

Para os oito pares de teste com IoU ≥ 0,50, o IoU médio dos pares foi 0,639. Os desvios absolutos medianos de início e fim foram 87 e 165 ms.

Também extraímos os mesmos dois recortes no Chromium 156 com o MediaPipe Holistic do aplicativo, um quadro a cada 100 ms, e usamos os mesmos landmarks para avaliar as duas regras. A regra do aplicativo agrupa presença de mãos no espaço de sinalização. A regra de movimento seleciona na validação seus próprios parâmetros para essa extração. A cobertura de pelo menos uma mão no vídeo de teste foi 595/600 quadros.

| Regra em teste com Holistic Web | Referências | Propostas | Pares IoU ≥ 0,50 | Precisão | Revocação | F1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Espaço de sinalização do aplicativo | 42 | 8 | 2 | 25,00% | 4,76% | 8,00% |
| Atividade por movimento | 42 | 34 | 4 | 11,76% | 9,52% | 10,53% |

O teste evidencia baixa cobertura de fronteiras lexicais. As duas regras propõem intervalos. O ensaio seguinte treina a detecção de fronteiras com anotações e compara os métodos em outras duplas. A edição de glosas, a qualidade do sentido com revisão humana e o reconhecimento de uma sequência livre integrada à webcam ficam em aberto. [Segmentação supervisionada e condições de uso](fronteiras.md)

## Reprodução

Dados, modelos, predições individuais e arquivos da partição ficam em `data/`, fora do Git. Reproduza os experimentos na raiz do repositório com o ambiente de `ml/requirements.txt`. A extração da avaliação UFSC usa também `mediapipe==0.10.32` e `opencv-contrib-python==4.12.0.88`.

```bash
python -m ml.continuous_experiment.acquire_eqt data/eqt-v4
python -m ml.continuous_experiment.train data/eqt-v4 data/eqt-v4/retriever --epochs 20 --threads 3
python -m ml.continuous_experiment.train data/eqt-v4 data/eqt-v4/generator --mode generator --epochs 24 --threads 3
python -m ml.continuous_experiment.export_generator data/eqt-v4 data/eqt-v4/generator/checkpoint.pt data/eqt-v4/onnx
node ml/continuous_experiment/verify-generator-wasm.mjs data/eqt-v4/onnx
python -m unittest discover -s ml/continuous_experiment/tests -v
```

Para a segmentação, coloque os dois vídeos públicos e a anotação ELAN em `data/continuous-ufsc`. Use o modelo Hand Landmarker float16 na revisão 1. [Arquivos oficiais de vídeo no NALS/UFSC](https://videos.nals.cce.ufsc.br/Corpus%20Libras/Projeto%20Inventario%20de%20Libras%20-%20Regi%C3%A3o%20Metropolitana%20de%20Florianopolis-sc/Produ%C3%A7%C3%A3o/Grupo%201/Dupla%201/1.%20Entrevista/) · [Anotação temporal](https://corpuslibras.ufsc.br/dados/dado/download/321/FLN_G1_D1_1entrevista_VIDEOS123-5?custom=1) · [Modelo Hand Landmarker](https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task)

```bash
python -m ml.continuous_experiment.ufsc_eval \
  data/continuous-ufsc/FLN_G1_D1_1entrevista_VIDEOS123-5.eaf \
  data/continuous-ufsc/FLN_G1_D1_1entrevista_VIDEO2.mp4 \
  data/continuous-ufsc/FLN_G1_D1_1entrevista_VIDEO3.mp4 \
  data/continuous-ufsc/hand_landmarker.task \
  data/continuous-ufsc/results.json
```

O script `ufsc_eval` registra SHA-256 dos vídeos, da transcrição e do modelo. A revisão usada do Hand Landmarker tem SHA-256 `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`.

Para comparar a regra de espaço de sinalização do aplicativo e o método por movimento sobre a mesma extração, prepare os ativos locais do MediaPipe, execute `npm run dev` e abra `/ml/continuous_experiment/web-segments.html` no navegador. Salve os resultados em `data/continuous-ufsc/web-segments.json`.

```bash
python -m ml.continuous_experiment.score_web \
  data/continuous-ufsc/FLN_G1_D1_1entrevista_VIDEOS123-5.eaf \
  data/continuous-ufsc/web-segments.json \
  data/continuous-ufsc/web-scores.json
```

Para diagnosticar as coordenadas do gerador na entrada web, baixe um vídeo RGB equivalente do treino com `python -m ml.continuous_experiment.acquire_eqt data/eqt-v4 --annotations-only --rgb-reference`. Abra `/ml/continuous_experiment/eqt-reference.html` e salve `eqt-reference-holistic.json` em `data/eqt-v4`. A comparação mede cobertura bilateral e erros por eixo nos mesmos 82 quadros, para as duas ordens possíveis das mãos.

```bash
python -m ml.continuous_experiment.compare_eqt_features \
  data/eqt-v4/Landmarks-hands.zip \
  data/eqt-v4/eqt-reference-holistic.json \
  data/eqt-v4/feature-comparison.json
```

### Ensaio Holistic → ONNX no navegador

A aquisição a seguir baixa somente os 12 vídeos RGB correspondentes às amostras espaçadas do teste de paridade. A identificação combina item do acervo, rótulo local do informante e nome do vídeo. O CRC de cada membro ZIP é conferido. Execute o exportador antes de abrir o ensaio.

```bash
python -m ml.continuous_experiment.acquire_web_subset data/eqt-v4 data/eqt-v4/web-test
```

Com o servidor local em execução, abra `/ml/continuous_experiment/eqt-web-test.html`. O teste usa 10 fps e reamostra 64 quadros para cada vídeo. As coordenadas x, y e z seguem a ordem mão esquerda e mão direita, com zeros para a mão ausente. O mesmo encoder e decoder em ONNX Runtime Web executam os landmarks originais e a extração Holistic. Salve o resultado em `data/eqt-v4/eqt-web-predictions.json` e meça a edição de palavras.

```bash
python -m ml.continuous_experiment.score_generator_web \
  data/eqt-v4 \
  data/eqt-v4/eqt-web-predictions.json \
  data/eqt-v4/eqt-web-scores.json
```
