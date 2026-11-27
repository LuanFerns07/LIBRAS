# Alfabeto ao vivo de Libras

O ensaio inicial usa o **Libras Landmark Dataset (A-Z), versão 1**, de Heitor Câmara Costa Fernandes (IFSP). O depósito do Kaggle declara licença GPL 3. O ZIP contém 26 CSVs de 1.000 linhas, cada linha com os 63 valores dos 21 pontos da mão obtidos com MediaPipe. A coleta usou webcam e gestos do alfabeto de Libras. O depósito fornece apenas coordenadas. Os vídeos ou imagens originais, a lateralidade, as pessoas e as sessões de captura ficam desconhecidos para cada amostra. [Dataset](https://www.kaggle.com/datasets/heitorccf/librasign/versions/1) · [Metadados oficiais](https://www.kaggle.com/api/v1/datasets/view/heitorccf/librasign) · [Metodologia, seção 4.1](https://github.com/Heitorccf/librasign/blob/36468650171e260282103ef411eb49fbe156ba35/HeitorFernandes-TCC_BSI.pdf)

O recorte conserva **A, B, C, D, E, F, G, I, L, M, N, O, P, Q, R, S, T, U, V e W**. H, J, K, X, Y e Z foram reservadas para uma validação temporal da datilologia. A fonte não contém Ç. Os pontos seguem a ordem do MediaPipe, com pulso no índice 0, XYZ por ponto, x e y em relação à imagem e z em relação ao pulso. A captura da época do depósito espelhava o quadro antes da detecção. A preparação aplica `x = 1 - x` para aproximar a orientação do vídeo sem espelho do aplicativo. A resolução original e a paridade entre o extrator legado e o Hand Landmarker atual permanecem desconhecidas. [Código de captura, revisão de agosto de 2025](https://github.com/Heitorccf/librasign/blob/c89e5153d7f89f275737887b90e6cbf464bfdc6e/src/capture.py)

## Partições do ensaio

A preparação fixa faixas por ordem de gravação no CSV antes de deduplicar. Os índices começam em zero e cada faixa contém 25 linhas por bloco. O recorte descarta duas faixas de 25 linhas por letra entre as partições, além de descartar cópias exatas. As classes têm a mesma quantidade de amostras em cada partição.

| Partição | Índices incluídos por classe | Blocos ordinais | Amostras |
| --- | --- | ---: | ---: |
| `train` | 0–699 | 28 | 14.000 |
| `val` | 725–849 | 5 | 2.500 |
| `test` | 875–999 | 5 | 2.500 |

Os blocos aproximam a ordem temporal e não isolam pessoas ou sessões. A auditoria encontrou 19.000 vetores distintos após o recorte. O conjunto serve para medir uma referência exploratória dentro da fonte. Generalização em webcam requer gravações de outras pessoas, com as sessões identificadas e separadas desde a coleta.

## Reprodução local

```bash
mkdir -p data/alphabet/.sources
curl -fL 'https://www.kaggle.com/api/v1/datasets/download/heitorccf/librasign?datasetVersionNumber=1' \
  -o data/alphabet/.sources/librasign-v1.zip
.venv/bin/python ml/alphabet/prepare_static.py
```

O programa escreve `data/alphabet/static.npz` com `points` no formato float32 `[N, 21, 3]` e vetores `labels`, `handedness`, `groups`, `splits` e `source_rows` de comprimento N. `handedness` usa `U` para lateralidade desconhecida. `static.json` registra cobertura, protocolo e hashes. O ZIP, o NPZ e os pesos do ensaio ficam no ambiente local.

| Arquivo | SHA-256 |
| --- | --- |
| `librasign-v1.zip` | `f1ca1f53d47bbba99b64c6f5815f740a200b354a6ddf7f939f6b78655313b8dd` |
| `static.npz` | `a2995cb3af683a0bc65b14969e5b7675378aaaf8257e247392c3f08a9a04dbd6` |

## Outras fontes verificadas

- O depósito **Brazilian Sign Language Alphabet**, de Passos, Fernandes e Comunello (UNIVALI), reanota 4.411 imagens de 15 letras capturadas para o *ASL Alphabet*. O recorte do LibrasIA exige capturas de Libras e excluiu essa fonte. [Depósito Mendeley v5](https://data.mendeley.com/datasets/k4gs3bmx5k/5) · [Descrição dos autores](https://github.com/biankatpas/Brazilian-Sign-Language-Alphabet-Dataset)
- O **Alfabeto em Libras**, de ElaineSilva, declara CC BY 4.0 e mostra 22 rótulos, contando D1 e D2. O endpoint de exportação oficial retornou HTTP 401 sem credenciais, e a ficha pública não informa pessoas ou sessões de captura. [Ficha no Roboflow Universe](https://universe.roboflow.com/elainesilva/alfabeto-em-libras-qrvnw)
- A **LIBRAS-HC-RGBDS**, da UFPR, contém vídeos RGB-D de 61 configurações de mão, com cinco atores e duas tomadas por pessoa. O laboratório permite uso em pesquisa não comercial com atribuição. A fonte rotula configurações, e o ensaio de letras ainda precisaria verificar quais gravações preservam também a orientação e o movimento da datilologia. [Ficha e condições de uso da UFPR](https://web.inf.ufpr.br/vri/databases/brazilian-sign-language-libras-hand-configurations-database/)

## Recortes de letras com movimento

As três aulas do NTE da UFSM têm licença CC BY-NC-SA 4.0 e rotulam em tela as demonstrações de H, J, K, X, Y, Z e Ç. O manifesto fixa os intervalos visuais, a âncora em que a letra está legível, os créditos e os SHA-256 dos MP4 em 480p. Cada aula fica em uma partição. [Manifesto dos intervalos](../ml/alphabet/ufsm-temporal-windows.json) · [Licença CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)

- A aula do Libras ON entra em treino. O enquadramento aproxima a mão durante os sete gestos. [Aula 1527000916](https://ntetube.nte.ufsm.br/v/1527000916)
- A aula do Grupo de Produção de Material Didático entra em validação. O quadro inclui o tronco e a cartela de letras. [Aula 1536677587](https://ntetube.nte.ufsm.br/v/1536677587)
- A aula de Giovana Fracari Hautrive fica reservada para teste. O manifesto inclui a pose estática de A de 3,66 a 4,37 s e de B de 5,06 a 6,14 s. A transição ocorre entre as duas janelas no vídeo original. [Aula 1535641159](https://ntetube.nte.ufsm.br/v/1535641159)

Há uma demonstração por letra em cada aula da UFSM. A versão atual também usa 12 recortes rotulados de duas aulas institucionais. A Fundação Cecierj oferece seis demonstrações, incluindo Ç. O acervo da Unesp oferece H, J, K, X e Z, com duas execuções de K na mesma aula. Os créditos, licenças, intervalos e hashes estão no manifesto. [Cecierj](https://canal.cecierj.edu.br/recurso/13757) · [Unesp](https://acervodigital.unesp.br/handle/unesp/222981) · [Manifesto das aulas adicionais](../ml/alphabet/institutional-temporal-windows.json)

## Praticar e ler letras ao vivo

Abra **http://127.0.0.1:4177/#area-livre** no Chromium e selecione **Alfabeto** no campo **Conteúdo**. Ative a câmera e mostre uma letra com uma mão. A leitura aparece ao lado do vídeo assim que fica estável. Use **Adicionar letra** para levar o caractere à transcrição. **Inserir espaço** separa palavras.

Em **Praticar**, selecione **Alfabeto**, escolha entre A–Z e Ç e abra **Praticar com ajuda** para ver a leitura ao lado da câmera e a demonstração no avatar. O modelo escolhe a letra usando os pontos da mão. A escolha no exercício serve para comparar o resultado com o alvo e registrar o progresso.

O modo segue atualizando a leitura com a sobreposição de pontos oculta. Ao perder a mão ou sair do modo, a leitura é apagada. As letras estáticas aparecem após três leituras consecutivas de mesma classe. Quando os dois modelos discordam, o aplicativo aguarda uma leitura mais estável. As letras com movimento aparecem quando os pontos registram o trecho que caracteriza o gesto. O leitor continua recebendo quadros enquanto o modelo estático processa o anterior.

### Compilar neste Linux

Depois de baixar e conferir os vídeos dos manifestos e preparar o LibraSign, execute a extração e o treino na raiz. A opção `--device cpu` também é aceita.

```bash
npm run setup:vision
.venv/bin/python -m ml.alphabet.extract_motion \
  --manifest ml/alphabet/ufsm-static-windows.json --out data/alphabet/static-video-final.json
.venv/bin/python -m ml.alphabet.extract_motion --out data/alphabet/motion-final.json
mkdir -p data/alphabet/institutional
.venv/bin/python -m ml.alphabet.extract_motion \
  --manifest ml/alphabet/institutional-static-n-m-u.json --out data/alphabet/institutional/static-n-m-u.json
.venv/bin/python -m ml.alphabet.merge_reference \
  data/alphabet/static-video-final.json data/alphabet/institutional/static-n-m-u.json \
  --train-source cecierj-13757 --out data/alphabet/static-video-n-m-u.json
.venv/bin/python -m ml.alphabet.extract_motion \
  --manifest ml/alphabet/institutional-temporal-windows.json --out data/alphabet/institutional/motion-frames.json
.venv/bin/python -m ml.alphabet.train --reference data/alphabet/static-video-n-m-u.json \
  --device cuda --out data/models/alphabet-n-coordinate
.venv/bin/python -m ml.alphabet.train --reference data/alphabet/static-video-n-m-u.json \
  --geometry --device cuda --out data/models/alphabet-n-geometry
.venv/bin/python -m ml.alphabet.agreement --primary data/models/alphabet-n-coordinate \
  --check data/models/alphabet-n-geometry --reference data/alphabet/static-video-n-m-u.json
node ml/alphabet/train-motion.mjs data/alphabet/motion-final.json
node ml/alphabet/train-trajectory.mjs
LIBRASIA_MODELO=data/models/isolated-combined ./scripts/executar-local.sh \
  --pacote data/releases/librasia-alfabeto-ao-vivo
python3 data/releases/librasia-alfabeto-ao-vivo/iniciar.py --porta 4177
```

Os vídeos de origem, os pontos extraídos e os modelos ficam no ambiente local. Os manifestos documentam os créditos dos autores, os intervalos rotulados e os hashes em cada partição. [Janelas estáticas](../ml/alphabet/ufsm-static-windows.json) · [Janelas de movimento](../ml/alphabet/ufsm-temporal-windows.json)

### Cobertura e verificação

A prévia tenta reconhecer A–Z e Ç na Área livre e em Praticar. H, K, X e Ç comparam a flexão dos dedos, a orientação da palma e o percurso da mão com recortes de referência. Em J, o leitor acompanha o percurso do dedo mínimo. Em Z, acompanha os três traços do indicador. Y usa o detector anterior. Os limiares são experimentais.

Os primeiros modelos estáticos foram treinados com o LibraSign e quadros da aula do Libras ON. A validação usou outra aula da UFSM. Na terceira aula, a concordância dos modelos aceitou 250 de 290 quadros e acertou 243. Os quadros são correlacionados dentro de cada demonstração. O A da terceira aula ficou sem acertos nessa avaliação. [Matriz e resultado por letra](../ml/evidence/alphabet-live/agreement.json)

No replay dos pontos da terceira aula, o leitor temporal exibiu H, J, K, X, Y, Z e Ç nas respectivas janelas e não exibiu nenhuma letra de movimento nas 20 janelas estáticas dessa aula. Essa gravação fica fora das referências, mas foi consultada ao ajustar os critérios. Os resultados medem apenas esses recortes. [Resultado do replay](../ml/evidence/alphabet-live/trajectory-evaluation.json)

Os testes automatizados no Chromium usaram gravações rotuladas como entrada da câmera. A Área livre exibiu B, H, J, K, X, Y, Z e Ç ao lado do vídeo durante a captura. O vídeo de C mostrou C sem acionar Ç. Os testes também verificaram X e Z separadamente, sem acionar um pelo outro. Em Praticar, B e K apareceram mesmo com A selecionado como alvo. O teste confirmou que a transcrição recebe a letra pelo botão **Adicionar letra** e que sair da Área livre encerra a câmera. A sobreposição acompanhou duas mãos no vídeo antes, durante e depois de uma tentativa. A pessoa usuária confirmou a fluidez dos pontos e que a atualização funcionou bem no seu teste, com ressalva para a letra N. A validação sistemática com pessoas sinalizantes na webcam segue pendente. [Teste do alfabeto](../tests/e2e/alphabet-live.test.mjs) · [Teste da sobreposição](../tests/e2e/hand-overlay-live.test.mjs)

Na triagem do N em 27 de novembro de 2026, a prévia `0a36425` exibiu a letra esperada em nove replays no Chromium na Área livre. Foram um M, um N e um U de cada uma das três aulas da UFSM, nas janelas do manifesto estático. Esses recortes já integravam as partições de treino, validação e teste. O recorte de N da terceira aula também foi exibido em Praticar com A selecionado como alvo. A revisão da pose do avatar segue em separado. [Janelas estáticas](../ml/alphabet/ufsm-static-windows.json) · [Triagem da pose](animacoes.md#triagem-da-letra-n)

### Retreino de N, M e U

Nas aulas do Cecierj e da Unesp, o modelo estático anterior deixou o painel sem leitura em ambas as demonstrações de N apesar de rastrear a mão. Entre os 52 quadros de N das duas aulas, a rede principal preferiu Q em 45. A rede geométrica preferiu N em 52. O leitor exige concordância com probabilidade de pelo menos 0,80 em cada rede. [Triagem nas duas aulas](../ml/evidence/alphabet-n-m-u/report.json)

O retreino acrescentou ao conjunto estático apenas os recortes de M, N e U do Cecierj e conservou a validação na segunda aula da UFSM. Na terceira aula da UFSM, os acertos estáticos passaram de 243 para 250 dos mesmos 290 quadros. Na Unesp, que ficou fora do treino e da seleção do modelo estático, os acertos de N passaram de 0 para 25 de 25 quadros. A prévia exibiu M, N e U em todos os seis replays institucionais. No recorte de U do Cecierj houve também uma leitura de H. Cada fonte fornece apenas um recorte de cada letra. Os modelos de trajetória já usavam outros recortes das aulas institucionais.

O leitor agora pede três confirmações seguidas antes de exibir Ç. O trecho estático de C passou por três replays automatizados no Chromium sem acionar Ç. O trecho rotulado de Ç e as sete janelas temporais da terceira aula da UFSM continuaram produzindo a letra esperada.

O script abaixo percorre as 27 janelas isoladas de uma mesma aula pela Área livre e registra todas as letras exibidas, inclusive trocas momentâneas. A entrada da câmera é o vídeo gravado. O relatório só guarda metadados e leituras.

```bash
node ml/alphabet/replay-web.mjs --url http://127.0.0.1:4177/ \
  --source 1535641159 --manifest ml/alphabet/ufsm-static-windows.json \
  --manifest ml/alphabet/ufsm-temporal-windows.json
```
