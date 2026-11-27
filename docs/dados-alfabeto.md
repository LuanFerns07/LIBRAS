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

A prévia validada no PC usa um pacote local cuja versão aparece em `http://127.0.0.1:4177/commit.txt`. Para reabrir o pacote existente neste Linux, rode na raiz do projeto.

```sh
python3 data/releases/librasia-demonstracao/iniciar.py --porta 4177
```

### Pontuação ao vivo na Área livre

Quando a rede principal define a letra confirmada, **Área livre → Alfabeto** mostra a letra em destaque e as duas alternativas seguintes, em ordem de pontuação. O softmax normaliza as 20 classes da rede principal na prévia atual. As três pontuações exibidas podem somar menos de 100%, porque as outras classes também entram no cálculo. Os valores expressam a distribuição da rede para aquele quadro.

O painel acompanha as leituras confirmadas e limpa as pontuações quando perde a mão. Quando uma trajetória ou um classificador complementar determina a letra, o painel exibe só a letra confirmada. Esses caminhos têm seus próprios critérios de reconhecimento. **Adicionar letra** usa a leitura principal.

No Chromium com gravações, o B da UFSM exibiu a letra principal acima de duas alternativas ordenadas e limpou o painel quando perdeu a mão. O J da UFSM apareceu sem porcentagem. As sequências M → N da Unesp e M → N → U da UFF passaram na Área livre e em Praticar. Os logs locais estão em `data/evidence/pontuacao-alfabeto/`. [Teste no Chromium](../tests/e2e/alphabet-live.test.mjs)

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
  --check data/models/alphabet-n-geometry --reference data/alphabet/static-video-n-m-u.json \
  --out data/models/alphabet-n-candidate
.venv/bin/python -m ml.alphabet.extract_motion \
  --manifest ml/alphabet/institutional-static-a-e-s-o.json --out data/alphabet/institutional/static-a-e-s-o.json
.venv/bin/python -m ml.alphabet.merge_reference \
  data/alphabet/static-video-final.json data/alphabet/institutional/static-n-m-u.json \
  data/alphabet/institutional/static-a-e-s-o.json \
  --train-source cecierj-13757 --out data/alphabet/static-video-a-e-s-o.json
.venv/bin/python -m ml.alphabet.train --reference data/alphabet/static-video-a-e-s-o.json \
  --device cuda --out data/models/alphabet-ae-coordinate
.venv/bin/python -m ml.alphabet.train --reference data/alphabet/static-video-a-e-s-o.json \
  --geometry --device cuda --out data/models/alphabet-ae-geometry
.venv/bin/python -m ml.alphabet.agreement --primary data/models/alphabet-ae-coordinate \
  --check data/models/alphabet-ae-geometry --reference data/alphabet/static-video-a-e-s-o.json \
  --out data/models/alphabet-ae-candidate
.venv/bin/python -m ml.alphabet.supplement \
  data/models/alphabet-n-candidate data/models/alphabet-ae-candidate \
  --letters E --threshold 0.95 --out data/models/alphabet-e-supplement
.venv/bin/python -m ml.alphabet.refine_o data/models/alphabet-e-supplement \
  --reference data/alphabet/static-video-a-e-s-o.json --out data/models/alphabet-o-candidate
mkdir -p data/alphabet/o-compacto
.venv/bin/python -m ml.alphabet.extract_motion --manifest ml/alphabet/ifes-static-windows.json \
  --out data/alphabet/o-compacto/ifes-frames.json
.venv/bin/python -m ml.alphabet.merge_reference \
  data/alphabet/static-video-final.json data/alphabet/institutional/static-n-m-u.json \
  data/alphabet/institutional/static-a-e-s-o.json data/alphabet/o-compacto/ifes-frames.json \
  --train-source cecierj-13757 --train-source ifes-mfl8r4t36fe \
  --out data/alphabet/o-compacto/referencia-ifes.json
.venv/bin/python -m ml.alphabet.train --reference data/alphabet/o-compacto/referencia-ifes.json \
  --geometry --device cuda --out data/models/alphabet-o-compact-verifier
.venv/bin/python -m ml.alphabet.refine_o data/models/alphabet-o-candidate \
  --reference data/alphabet/o-compacto/referencia-ifes.json \
  --geometry-verifier data/models/alphabet-o-compact-verifier --out data/models/alphabet-o-compact-candidate
.venv/bin/python -m ml.alphabet.refine_s data/models/alphabet-o-compact-candidate \
  --reference data/alphabet/o-compacto/referencia-ifes.json --out data/models/alphabet-s-candidate
.venv/bin/python -m ml.alphabet.refine_e_o data/models/alphabet-s-candidate \
  --reference data/alphabet/o-compacto/referencia-ifes.json --out data/models/alphabet-live
node ml/alphabet/train-motion.mjs data/alphabet/motion-final.json
node ml/alphabet/train-trajectory.mjs
LIBRASIA_MODELO=data/models/isolated-combined ./scripts/executar-local.sh \
  --pacote data/releases/librasia-alfabeto-ao-vivo
python3 data/releases/librasia-alfabeto-ao-vivo/iniciar.py --porta 4177
```

Os vídeos de origem, os pontos extraídos e os modelos ficam no ambiente local. Os manifestos documentam os créditos dos autores, os intervalos rotulados e os hashes em cada partição. [Janelas estáticas](../ml/alphabet/ufsm-static-windows.json) · [Janelas de movimento](../ml/alphabet/ufsm-temporal-windows.json)

A gravação identificada no manifesto do Ifes entra no retreino de O compacto. Siga os formatos listados no manifesto e confira o SHA-256 antes de extrair os pontos. [Download e créditos do Ifes](../ml/evidence/alphabet-o-independent/README.md)

### Cobertura e verificação

A prévia tenta reconhecer A–Z e Ç na Área livre e em Praticar. H, K, X e Ç comparam a flexão dos dedos, a orientação da palma e o percurso da mão com recortes de referência. Em J, o leitor acompanha o percurso do dedo mínimo. Em Z, acompanha os três traços do indicador. Y usa o detector anterior. Os limiares são experimentais.

Os primeiros modelos estáticos foram treinados com o LibraSign e quadros da aula do Libras ON. A validação usou outra aula da UFSM. Na terceira aula, a concordância dos modelos aceitou 250 de 290 quadros e acertou 243. Os quadros são correlacionados dentro de cada demonstração. O A da terceira aula ficou sem acertos nessa avaliação. [Matriz e resultado por letra](../ml/evidence/alphabet-live/agreement.json)

No replay dos pontos da terceira aula, o leitor temporal exibiu H, J, K, X, Y, Z e Ç nas respectivas janelas e não exibiu nenhuma letra de movimento nas 20 janelas estáticas dessa aula. Essa gravação fica fora das referências, mas foi consultada ao ajustar os critérios. Os resultados medem apenas esses recortes. [Resultado do replay](../ml/evidence/alphabet-live/trajectory-evaluation.json)

Os testes automatizados no Chromium usaram gravações rotuladas como entrada da câmera. A Área livre exibiu B, H, J, K, X, Y, Z e Ç ao lado do vídeo durante a captura. O vídeo de C mostrou C sem acionar Ç. Os testes também verificaram X e Z separadamente, sem acionar um pelo outro. Em Praticar, B e K apareceram mesmo com A selecionado como alvo. O teste confirmou que a transcrição recebe a letra pelo botão **Adicionar letra** e que sair da Área livre encerra a câmera. A sobreposição acompanhou duas mãos no vídeo antes, durante e depois de uma tentativa. A pessoa usuária confirmou a fluidez dos pontos e que a atualização funcionou bem no seu teste, com ressalva para a letra N. A validação sistemática com pessoas sinalizantes na webcam segue pendente. [Teste do alfabeto](../tests/e2e/alphabet-live.test.mjs) · [Teste da sobreposição](../tests/e2e/hand-overlay-live.test.mjs)

Na triagem do N em 27 de novembro de 2026, a prévia `0a36425` exibiu a letra esperada em nove replays no Chromium na Área livre. Foram um M, um N e um U de cada uma das três aulas da UFSM, nas janelas do manifesto estático. Esses recortes já integravam as partições de treino, validação e teste. O recorte de N da terceira aula também foi exibido em Praticar com A selecionado como alvo. A revisão da pose do avatar segue em separado. [Janelas estáticas](../ml/alphabet/ufsm-static-windows.json) · [Triagem da pose](animacoes.md#triagem-da-letra-n)

### Retreino de N, M e U

Nas aulas do Cecierj e da Unesp, o modelo estático anterior deixou o painel sem leitura em ambas as demonstrações de N apesar de rastrear a mão. Entre os 52 quadros de N das duas aulas, a rede principal preferiu Q em 45. A rede geométrica preferiu N em 52. O leitor exige concordância com probabilidade de pelo menos 0,80 em cada rede. [Triagem nas duas aulas](../ml/evidence/alphabet-n-m-u/report.json)

O retreino acrescentou ao conjunto estático apenas os recortes de M, N e U do Cecierj e conservou a validação na segunda aula da UFSM. Na terceira aula da UFSM, os acertos estáticos passaram de 243 para 250 dos mesmos 290 quadros. Na Unesp, que ficou fora do treino e da seleção do modelo estático, os acertos de N passaram de 0 para 25 de 25 quadros. A prévia exibiu M, N e U em todos os seis replays institucionais. No recorte de U do Cecierj houve também uma leitura de H. Cada fonte fornece apenas um recorte de cada letra. Os modelos de trajetória já usavam outros recortes das aulas institucionais. [Métricas do retreino](../ml/evidence/alphabet-n-m-u/retraining-agreement.json) · [Replays institucionais](../ml/evidence/alphabet-n-m-u/replay-institutional.json)

O leitor agora pede três confirmações seguidas antes de exibir Ç. O trecho estático de C passou por três replays automatizados no Chromium sem acionar Ç. O trecho rotulado de Ç e as sete janelas temporais da terceira aula da UFSM continuaram produzindo a letra esperada.

Na prévia `4f2db54`, o replay exibiu a letra esperada em 25 das 27 janelas isoladas da terceira aula da UFSM. Em 24, exibiu só a letra esperada. No recorte de A apareceu X, no de E o painel ficou vazio e no de Z apareceu G antes de Z. O teste da sobreposição com as duas mãos passou nessa mesma prévia. [Leituras por janela](../ml/evidence/alphabet-n-m-u/replay-ufsm.json)

Use o script abaixo para registrar todas as letras exibidas, inclusive trocas momentâneas. A entrada da câmera é o vídeo gravado. O relatório guarda somente metadados e leituras.

```bash
node ml/alphabet/replay-web.mjs --url http://127.0.0.1:4177/ \
  --source 1535641159 --manifest ml/alphabet/ufsm-static-windows.json \
  --manifest ml/alphabet/ufsm-temporal-windows.json
```

### Distinção entre A e X e ensaio de E

O leitor temporal de X passou a exigir separação sustentada entre a ponta do indicador e as pontas vizinhas durante a parte ativa do movimento. No Chromium, as cinco janelas rotuladas de X exibiram X e nenhuma das cinco janelas rotuladas de A exibiu X. Quatro exibiram A. O A da terceira aula da UFSM ficou sem leitura. [Replay em cinco aulas](../ml/evidence/alphabet-a-e-s-o/replay-a-x.json)

Com o classificador estático da prévia do retreino de N, as oito janelas novas de A, E, O e S tiveram seis acertos e duas rejeições, E do Cecierj e O da Unesp. Um candidato acrescentou ao treino os quatro recortes do Cecierj e preservou os da Unesp fora do ajuste estático. No replay das duas aulas institucionais, o candidato mostrou a letra esperada nas 14 janelas, incluindo M, N e U. Na terceira aula da UFSM, recuperou E (12/12 quadros no modelo estático) e perdeu R (0/15). [Janelas de A, E, O e S](../ml/alphabet/institutional-static-a-e-s-o.json) · [Replays do candidato](../ml/evidence/alphabet-a-e-s-o/replay-candidate.json)

A prévia consulta as redes do candidato apenas para recuperar E em quadros em que as redes originais se abstêm. Para recomendar E, a menor probabilidade das duas redes candidatas precisa chegar a 0,95. A confirmação da letra continua exigindo três leituras seguidas. As duas redes originais continuam decidindo seus aceites com o limiar 0,80. O complemento roda no dispositivo no mesmo modo ao vivo de Praticar e da Área livre.

### Confirmação 3D de A na prévia local

Na compilação `b7b8d21`, o complemento recebe os pontos 3D da mesma mão que o leitor seleciona na imagem. Ele só pode acrescentar A quando as duas redes preferem letras de A/Q/R e as rotas anteriores ficam sem leitura. O ONNX manteve as decisões do PyTorch nos quadros da referência. A prévia preserva o limiar de três votos consecutivos para exibir a letra. [Treino offline](../ml/evidence/alphabet-a-e-independent/README.md#ensaio-de-flexão-em-coordenadas-3d) · [Hashes da exportação](../ml/evidence/alphabet-a-e-independent/exportacao-a-3d.json)

No recorte de A da terceira aula da UFSM, a compilação anterior ficou sem leitura nas três repetições. A prévia com o complemento exibiu A nas três, entre 543 e 552 ms após o início do recorte. Os testes de ponta a ponta exibiram A sem iniciar tentativa na Área livre e em Praticar com B como alvo. A transição M → N e o ensaio de duas mãos também passaram com gravações. [Replays da base](../ml/evidence/alphabet-a-e-independent/ufsm-a-058a990.json) · [Replays da prévia](../ml/evidence/alphabet-a-e-independent/ufsm-a-b7b8d21.json) · [Testes de ponta a ponta](../tests/e2e/alphabet-live.test.mjs)

Na rodada de 89 recortes rotulados, a letra esperada apareceu em todos. Q de Tel baixinha continuou sem leitura, e o R da mesma gravação continuou sendo exibido como U nos controles dedicados. Entre os 19 recortes fora do alfabeto, A apareceu no mesmo recorte da base. O aceite com pessoas sinalizantes na webcam continua pendente. [Recortes rotulados](../ml/evidence/alphabet-a-e-independent/positivos-b7b8d21.json) · [Controles A/Q/R](../ml/evidence/alphabet-a-e-independent/controle-aqr-b7b8d21.json) · [Recortes fora do alfabeto](../ml/evidence/alphabet-a-e-independent/negativos-b7b8d21.json)

### Confirmação de Q na prévia local

A compilação `81e20b9` usa coordenadas 3D para confirmar Q quando a rede principal prefere N, o verificador aceita Q e as rotas anteriores ficam sem leitura. Na gravação de Tel baixinha, Q apareceu nas três repetições. A Área livre exibiu Q antes de iniciar uma tentativa e Praticar exibiu Q com outra letra selecionada. O complemento de R está desabilitado. [Testes, regressão e hashes](../ml/evidence/alphabet-a-q-r/README.md#reteste-pareado-e-adoção-de-q)

No recorte da aula explicativa da Unicentro em que as redes aceitam P, a regra segue sem confirmar Q. Os ensaios com pessoas sinalizantes na webcam e a revisão das poses seguem pendentes. [Diagnóstico de P e Q](../ml/evidence/alphabet-a-q-r/README.md#diagnóstico-de-q-aceito-como-p)

### Resultado da prévia com o complemento de E

Na compilação `dbda17e`, o Chromium exibiu a letra esperada em 26 das 27 janelas da terceira aula da UFSM usadas como câmera. A ficou sem leitura. Nas janelas de Ç e Z, também apareceram C e G, respectivamente. O replay exibiu E, R e N nas respectivas janelas. [Replays da UFSM](../ml/evidence/alphabet-a-e-s-o/replay-supplement-ufsm.json)

Nos recortes do Cecierj e da Unesp, 13 das 14 janelas exibiram a letra esperada. E, M e N apareceram nas duas aulas. O da Unesp ficou sem leitura, e os dois recortes de U também exibiram H. A Unesp ficou fora do treino e do ajuste do classificador estático para esses recortes. [Replays das aulas institucionais](../ml/evidence/alphabet-a-e-s-o/replay-supplement-institutional.json)

Na mesma compilação, o Chromium mostrou E sem iniciar uma tentativa em Área livre e com outra letra selecionada em Praticar. O teste da sobreposição de duas mãos antes, durante e depois da tentativa passou com vídeo gravado. O reteste de N na webcam física e a revisão da pose do avatar seguem pendentes. [Teste da leitura](../tests/e2e/alphabet-live.test.mjs) · [Teste dos pontos](../tests/e2e/hand-overlay-live.test.mjs)

### Reteste com a pose revisada de N

A compilação `0c0da0f` inclui as comparações de N com M e U no avatar. No Chromium, o N gravado na Unesp foi reconhecido na Área livre e em Praticar, com o vídeo original e com uma versão invertida horizontalmente. O vídeo invertido verifica a leitura no outro lado da imagem. No trecho contínuo da Unesp, os dois modos exibiram M, limparam o painel durante a mudança e exibiram N na mesma captura. A execução por uma pessoa sinalizante na webcam física continua pendente. [Revisão do avatar](animacoes.md#triagem-da-letra-n) · [Leituras durante a transição](../ml/evidence/alphabet-n-m-u/replay-transition-unesp.json)

Na prévia `5b2d4c4`, a Área livre exibiu a letra esperada nas nove janelas de M, N e U do Cecierj, da Unesp e da UFAC. N foi a única letra nos três recortes de N. O U do Cecierj também exibiu H. Os três testes de ponta a ponta com vídeo da Unesp passaram, incluindo N em Área livre e em Praticar e a transição M → N nos dois modos. O conjunto reaproveita trechos já avaliados, incluindo amostras do Cecierj usadas no retreino. A dificuldade do N relatada na webcam ainda precisa ser reproduzida. [Leituras por recorte e hashes da prévia](../ml/evidence/alphabet-n-m-u/replay-5b2d4c4-mnu.json) · [Cenários de ponta a ponta](../tests/e2e/alphabet-live.test.mjs)

Em seis janelas reservadas da UFAC, a Área livre exibiu A, E, M, N e U. O ficou sem leitura com a mão rastreada. No A da UFSM, oito condições de tamanho e resolução do quadro mantiveram a mão rastreada, com zero acertos do classificador por quadro. [Replay na compilação atual](../ml/evidence/alphabet-a-e-independent/ufac-replay-0c0da0f.json) · [Diagnóstico de A na UFSM e repetição com a UFAC](../ml/evidence/alphabet-a-e-independent/README.md)

O teste da sobreposição de duas mãos passou com vídeo gravado na prévia atual. O Chromium também abriu e encerrou a captura da webcam ACER HD User Facing a 640 × 480 e concluiu a síntese de voz local em pt-BR. [Teste dos pontos](../tests/e2e/hand-overlay-live.test.mjs) · [Testes de câmera e voz](../tests/e2e/browser.test.mjs)

Para repetir a transição M → N, use o arquivo da Unesp indicado no manifesto estático. O recorte contínuo inclui a mudança original entre as janelas de M e N. O FFmpeg remove o áudio e acrescenta dois segundos de margem antes e depois. [Origem e SHA-256](../ml/alphabet/institutional-static-n-m-u.json) · [Teste da transição](../tests/e2e/alphabet-live.test.mjs)

```bash
mkdir -p data/evidence/alphabet-n-m-u
ffmpeg -nostdin -ss 86.850 -i data/alphabet/institutional/unesp-222981.flv \
  -an -pix_fmt yuv420p -vf 'trim=duration=3.51,scale=640:-2,fps=30,tpad=start_duration=2:stop_duration=2:color=black' \
  data/evidence/alphabet-n-m-u/unesp-m-n.y4m
LIBRASIA_TEST_URL=http://127.0.0.1:4177/ \
  LIBRASIA_TEST_M_N_VIDEO=data/evidence/alphabet-n-m-u/unesp-m-n.y4m \
  node --test tests/e2e/alphabet-live.test.mjs
```

### M → N → U nos dois modos de câmera

Na prévia `ff7969b`, o Chromium reproduziu as demonstrações de M, N e U de Thiago Cardoso Alves em uma única trilha por tela, sem iniciar tentativa. O vídeo preserva a transição original de M para N e acrescenta a tomada de U depois de uma margem preta. O painel mostrou M → vazio → N → vazio → U → vazio em Área livre e em Praticar. N ficou visível por 3,05 s e 3,04 s, respectivamente. Também passou o controle anterior de M → N da Unesp nos dois modos. A reprodução usa gravações, e a execução com uma pessoa na webcam física segue pendente. [Rótulos e créditos do NUEDIS/UFF](../ml/alphabet/uff-alfabeto-continuo.json) · [Teste no Chromium](../tests/e2e/alphabet-live.test.mjs)

Com a fonte indicada no manifesto e a prévia aberta, prepare e reproduza o mesmo cenário.

~~~bash
destino=data/evidence/alphabet-n-m-u
mkdir -p "$destino"
ffmpeg -nostdin -i data/alphabet/independent/uff-2025-download/uff-2025-alfabeto.mp4 \
  -filter_complex '[0:v]trim=start=49.249:end=54.955,setpts=PTS-STARTPTS,scale=640:360,fps=30,tpad=start_duration=2:stop_duration=0.8:color=black[mn];[0:v]trim=start=80.180:end=82.783,setpts=PTS-STARTPTS,scale=640:360,fps=30,tpad=stop_duration=1.5:color=black[u];[mn][u]concat=n=2:v=1:a=0[v]' \
  -map '[v]' -pix_fmt yuv420p "$destino/uff-m-n-u.y4m"
LIBRASIA_TEST_URL=http://127.0.0.1:4177 LIBRASIA_TEST_M_N_U_VIDEO="$destino/uff-m-n-u.y4m" \
  node --test tests/e2e/alphabet-live.test.mjs
~~~

O Y4M do ensaio tem SHA-256 `7e001e7e977b14dbc8f967656cfbeebd1db1be223e57f17317df4307ff1ec01f`. As mudanças e os tempos ficaram no log local `data/evidence/demonstracao/alfabeto-mnu-ff7969b.log`.

### M, N, U e Q em duas gravações reservadas

As janelas de Tel baixinha e da Unicentro foram fixadas no commit `560593b` antes da inferência. As fontes inteiras ficaram fora do ajuste do classificador. A Área livre mostrou M nos três recortes e N nos dois. No N de Tel baixinha, os dois modelos estáticos concordaram nos 21 quadros amostrados. No N da Unicentro, a rede principal preferiu N em 17 dos 18 quadros selecionáveis e o verificador preferiu M em oito. A concordância com os limiares confirmou oito quadros de N. [Manifesto](../ml/alphabet/independent-m-n-u-q-windows.json) · [Replay em Chromium](../ml/evidence/alphabet-m-n-u-q/replay-5b2d4c4.json) · [Votos por recorte](../ml/evidence/alphabet-m-n-u-q/diagnostico-estatico.json)

Em três repetições com a linha do tempo dos pontos, o N de Tel baixinha permaneceu no painel até a mão sair da captura. Nos três replays da Unicentro, a leitura sumiu entre 724 e 813 ms desde o início do recorte e a mão continuou rastreada até 1.240 a 1.257 ms. A discordância N/M nos quadros amostrados orienta a próxima investigação do classificador. [Linha do tempo da letra e do rastreamento](../ml/evidence/alphabet-m-n-u-q/linha-do-tempo-n.json)

Em Tel baixinha, Q ficou sem leitura e U apareceu seguido de H. Na Unicentro, Q apareceu como P e U em perfil ficou sem leitura. Havia quadros rastreados em todos os recortes. Os dois M da Unicentro vêm de planos diferentes da mesma demonstração. [Tel baixinha](https://www.youtube.com/watch?v=chzje8VmC1I&t=100s) · [Alfabeto Explicativo da Unicentro](https://www.youtube.com/watch?v=hxnpSXVWkgu&t=165s)

```sh
manifest=ml/alphabet/independent-m-n-u-q-windows.json
out=data/evidence/alphabet-m-n-u-q
models=data/releases/librasia-alfabeto-s-o-z-validado/site/models
mkdir -p "$out"
node ml/alphabet/replay-web.mjs --url http://127.0.0.1:4177/ --manifest "$manifest" \
  --source tel-baixinha-chzje8vmc1i --source unicentro-hxnpsxvwkgu --workers 1
node ml/alphabet/replay-web.mjs --url http://127.0.0.1:4177/ --manifest "$manifest" \
  --source tel-baixinha-chzje8vmc1i --source unicentro-hxnpsxvwkgu --letters N --timeline --workers 1
OPENCV_FFMPEG_CAPTURE_OPTIONS='threads;1' .venv/bin/python -m ml.alphabet.extract_motion \
  --manifest "$manifest" --out "$out/frames.json"
.venv/bin/python -m ml.alphabet.diagnose_static "$models" "$out/frames.json"
```

#### Orientação da imagem e estabilidade de N

Na gravação da Unicentro, a imagem ampliada mostra dois dedos voltados para baixo e o anelar dobrado durante o trecho em que o painel apaga. Um complemento logístico com descritores da flexão, projeção e distância entre os dedos foi treinado nas gravações de treino da UFSM e do Cecierj. Com limiar de 0,95, a versão com projeção reconheceu os 14 quadros de N e zero dos 29 quadros de M/Q na validação da UFSM. Na Unicentro, nenhum dos nove quadros elegíveis para o complemento chegou a esse limiar. O resultado continuou assim ao treinar com coordenadas 3D do mesmo extrator. [Gravação da Unicentro](https://www.youtube.com/watch?v=hxnpSXVWkgu&t=168s) · [Partições da UFSM](../ml/alphabet/ufsm-static-windows.json)

A extração com a imagem espelhada e o eixo x restaurado passou de 8 para 18 votos de N nos mesmos 18 quadros selecionáveis da Unicentro. Os dois modelos usados pela prévia são os mesmos. Os recortes de M continuaram exibindo apenas M nas decisões estáticas e os Q continuaram sem a leitura esperada. [Extração original](../ml/evidence/alphabet-m-n-u-q/diagnostico-estatico.json) · [Extração orientada](../ml/evidence/alphabet-m-n-u-q/diagnostico-espelhado.json)

O candidato `a1b5766` escolhe a orientação da entrada quando detecta com confiança uma mão em dois quadros sucessivos. Os pontos voltam ao referencial da câmera antes de alimentar a leitura e a sobreposição. Na versão em uso, o N da Unicentro apagou de 487 a 538 ms antes de perder o rastreamento nas três repetições com o vídeo original. No candidato, as seis reproduções da Unicentro, três por orientação da imagem, mantiveram N até perder a mão. Os três controles de N de Tel baixinha também passaram. A amostra invertida é uma derivação da mesma demonstração. [Janelas e origem](../ml/evidence/alphabet-m-n-u-q/n-lados.json) · [Base](../ml/evidence/alphabet-m-n-u-q/n-lados-5eccc2c.json) · [Candidato](../ml/evidence/alphabet-m-n-u-q/n-lados-a1b5766.json)

O candidato preservou os 88 acertos em 89 janelas rotuladas. Exibiu H junto de U em um recorte da Unesp e I antes de J em um recorte da UFSM. Os três M dos controles permaneceram como M. O Q de Tel baixinha ficou sem leitura, e o Q da Unicentro continuou sendo exibido como P. A sobreposição com o vídeo de duas mãos passou no Chromium. A mediana entre pinturas antes da tentativa foi de 39 ms no candidato e 40 ms em uma execução da versão em uso. [Recortes rotulados](../ml/evidence/alphabet-m-n-u-q/positivos-a1b5766.json) · [Controles de M e Q](../ml/evidence/alphabet-m-n-u-q/mq-a1b5766.json)

Nos 19 recortes fora do alfabeto, oito janelas exibiram alguma letra e nenhuma exibiu Z. Na repetição dirigida, a mão em repouso perto do rosto produziu P nos três replays do candidato e ficou sem leitura nos três replays de `5eccc2c`. Rosa → Marrom produziu J em dois de três replays do candidato e em um da versão em uso. A regra global fica na branch experimental. A próxima versão deve usar a segunda extração somente para confirmar N em quadros ambíguos e preservar a rota usual nos demais casos. [Dezenove controles](../ml/evidence/alphabet-m-n-u-q/negativos-a1b5766.json) · [Repetições na base](../ml/evidence/alphabet-m-n-u-q/negativos-repetidos-5eccc2c.json) · [Repetições no candidato](../ml/evidence/alphabet-m-n-u-q/negativos-repetidos-a1b5766.json)

```sh
manifest=ml/alphabet/independent-m-n-u-q-windows.json
out=data/alphabet/n-estabilidade
models=data/releases/librasia-alfabeto-z-polegar/site/models
mkdir -p "$out"
OPENCV_FFMPEG_CAPTURE_OPTIONS='threads;1' .venv/bin/python -m ml.alphabet.extract_motion \
  --manifest "$manifest" --mirror --out "$out/pontos-espelhados.json"
.venv/bin/python -m ml.alphabet.diagnose_static "$models" "$out/pontos-espelhados.json"
ffmpeg -nostdin -ss 168.910 -i data/alphabet/independent/unicentro-download/unicentro-alfabeto.mp4 \
  -t 1.18 -vf hflip -an -c:v libx264 -crf 15 "$out/unicentro-n-lado-oposto.mp4"
```

#### Confirmação específica de N na prévia

Na compilação `058a990`, a segunda extração só entra no modo de letras, diante de uma mão com indicador e médio apontando para baixo. A leitura pode usar os pontos dessa segunda passagem quando a rede principal indica N, a outra prefere N ou M e a rota usual fica inconclusiva. Os dois modelos precisam confirmar N nos pontos alternativos. Depois de exibir N, o leitor tolera uma única leitura inconclusiva com esses pontos presentes. Ao perder a mão, limpa o painel na próxima atualização. As trajetórias e o desenho continuam usando os pontos da primeira passagem.

O Chromium manteve N até perder a mão nas nove repetições. Passaram também N da Unicentro em Área livre e Praticar, a transição M → N da Unesp e o ensaio de sobreposição de duas mãos. A mediana entre pinturas antes da tentativa, com a gravação usada no ensaio, foi de 42 ms. Os três recortes de M permaneceram como M, e os dois Q mantiveram as leituras da base. [Repetições de N](../ml/evidence/alphabet-m-n-u-q/n-lados-058a990.json) · [Controles de M e Q](../ml/evidence/alphabet-m-n-u-q/mq-058a990.json) · [Teste da sobreposição](../tests/e2e/hand-overlay-live.test.mjs)

Em uma execução dos 89 recortes rotulados, houve 87 acertos. O A da UFSM continuou sem leitura e o U da UFAC ficou sem leitura nessa execução. Em três repetições dedicadas, as duas versões exibiram U nas três. Os 19 recortes fora do alfabeto tiveram os mesmos conjuntos de letras exibidas da versão com ajuste de Z. O trecho de repouso que produzia P no candidato global ficou sem leitura nas três repetições. Rosa → Marrom ainda pode exibir J, inclusive em replays em que a segunda extração ficou inativa. [89 recortes rotulados](../ml/evidence/alphabet-m-n-u-q/positivos-058a990.json) · [Reteste de U](../ml/evidence/alphabet-m-n-u-q/ufac-u-repetido-058a990.json) · [19 recortes fora do alfabeto](../ml/evidence/alphabet-m-n-u-q/negativos-058a990.json) · [Repouso e Rosa → Marrom](../ml/evidence/alphabet-m-n-u-q/negativos-repetidos-058a990.json) · [Uso da extração alternativa em Rosa → Marrom](../ml/evidence/alphabet-m-n-u-q/rosa-trace-058a990.json)

O Chromium abriu e liberou a câmera **ACER HD User Facing** a 640 × 480 no PC. Os resultados de reconhecimento desta rodada vieram de câmera virtual com gravações. O reteste do gesto N com uma pessoa sinalizando na webcam física continua pendente. [Teste da webcam](../tests/e2e/browser.test.mjs)

### Recuperação de O com geometria da mão

Nos quadros de O da Unesp e da UFAC, o verificador reconheceu a configuração em 18 de 18 e em 33 de 35 quadros, respectivamente. O classificador principal preferiu I e E na maior parte das duas janelas. O complemento treina uma regressão logística em 12 medidas dos pontos, entre elas distâncias do polegar às pontas, separação entre dedos adjacentes e curvatura relativa dos dedos. O leitor considera O quando as redes principais e o complemento de E ficam sem leitura, o verificador de O chega a 0,80 e a pontuação de forma chega a 0,95. A exibição ao vivo ainda exige três leituras consecutivas. [Exportador e treino](../ml/alphabet/refine_o.py) · [Configuração, hashes e paridade do ONNX](../ml/evidence/alphabet-o/training.json) · [Referência do IF Baiano para a forma em O](https://www.ifbaiano.edu.br/unidades/bonfim/files/2022/07/Alfabeto-manual-em-Libras-1.pdf)

Na validação, o complemento marcou O em 70 de 125 quadros rotulados do LibraSign e em 16 de 16 quadros da aula reservada para validação. Nenhum dos 2.632 quadros das outras letras recebeu O pelo complemento. Os quadros de uma mesma janela são correlacionados. O treino usa o LibraSign e os recortes de treino da primeira aula da UFSM e do Cecierj. Os recortes da Unesp, da terceira aula da UFSM, da UFAC e do Ifes ficaram fora do ajuste dos pesos do complemento. O ensaio específico do O usou os casos já conhecidos da Unesp e da UFAC como regressões. [Partições e resultados](../ml/evidence/alphabet-o/training.json)

Na compilação `99f0e90`, 50 das 53 janelas rotuladas mostraram a letra esperada no Chromium. O foi recuperado na Unesp e na UFAC. Os dois recortes de O do Ifes e o A da terceira aula da UFSM continuaram sem leitura. Todas as janelas que já mostravam a letra esperada continuaram mostrando essa letra, incluindo C, E e S. O vídeo da UFAC também exibiu O na Área livre e em Praticar sem iniciar tentativa. [Replays por janela](../ml/evidence/alphabet-o/replay-99f0e90.json) · [Anotação da fonte independente do Ifes](../ml/evidence/alphabet-o-independent/README.md)

O apareceu nos mesmos dois de 19 recortes de atividades ou sinais fora do alfabeto nas duas versões. As duas versões também exibiram O no trecho em que a aula do Ifes demonstra uma execução que marca como incorreta. Na extração dos quadros originais do Ifes, a rede principal preferiu F ou I nos dois recortes positivos de O. A forma compacta passou pelo complemento em dois quadros da primeira janela e em nenhum da segunda. A leitura pela webcam física e a cobertura de outras configurações de O seguem pendentes. [Comparação dos controles](../ml/evidence/alphabet-o/replay-negatives.json)

Em uma gravação posterior reservada da Uníntese, O com os dedos mais fechados ficou sem leitura nas duas compilações, com a mão rastreada. As duas compilações mostraram A, C e E nas janelas correspondentes e leram A na janela rotulada S. [Comparação e referências do gesto](../ml/evidence/alphabet-o-compact/README.md)

Para repetir a comparação de negativos, prepare os recortes CLAD e didáticos no caminho `data/isolated-negative-audit` e sirva cada compilação em uma porta própria. O roteiro confere os hashes dos recortes antes de ativar a câmera virtual no Chromium. [Preparação dos recortes](negativos.md#reprodução-dos-novos-recortes) · [Manifesto das janelas](../ml/evidence/alphabet-o/negative-windows.json)

```bash
manifest=ml/evidence/alphabet-o/negative-windows.json
mapfile -t ids < <(jq -r '.sources[].id' "$manifest")
args=()
for id in "${ids[@]}"; do args+=(--source "$id"); done
node ml/alphabet/replay-web.mjs --url http://127.0.0.1:4177/ \
  --manifest "$manifest" "${args[@]}" --workers 2
```

### O compacto com referências do Ifes

A compilação `bfe1945` usa as demonstrações do Ifes para retreinar o classificador de forma e um novo verificador geométrico de O. O modelo novo só acrescenta O quando as redes principais e o complemento anterior ficam sem leitura. Os dois limiares continuam em 0,80 para a confirmação geométrica e 0,95 para a forma. A validação manteve os 70 O do LibraSign e os 16 O em vídeo aceitos pelo complemento anterior e registrou zero novos O em outras letras. A exportação conferiu a paridade com PyTorch e regenerou o complemento anterior com o mesmo SHA-256. [Verificador geométrico](../ml/evidence/alphabet-o-compact/verifier-training.json) · [Exportação e validação](../ml/evidence/alphabet-o-compact/training.json)

No Chromium, a nova compilação exibiu a letra esperada em 57 das 60 janelas. As duas demonstrações do Ifes usadas no treino e a janela da Uníntese, mantida só para medir a regressão, passaram a exibir O. O da gravação reservada de Uéslei Paterno continuou a resultar em E e S da Unicentro exibiu S. A da UFSM e S da Uníntese continuam pendentes. O apareceu nos mesmos dois recortes entre os 19 controles fora do alfabeto. [Resultado por janela](../ml/evidence/alphabet-o-compact/replay-bfe1945.json) · [Controles fora do alfabeto](../ml/evidence/alphabet-o-compact/replay-negatives-bfe1945.json) · [Gravações reservadas](../ml/evidence/alphabet-o-s-independent/README.md)

### Distinção de S, E e O e leitura do traçado de Z

O complemento de S usa a posição e a flexão do polegar quando o modelo principal considera A ou S, o verificador confirma S e os outros classificadores ficam sem leitura. A decisão requer o limiar 0,80 do verificador e 0,95 da regressão de forma. Na validação de 2.500 quadros do LibraSign, os novos votos de S ficaram em zero. [Treino e paridade ONNX](../ml/evidence/alphabet-o-s-independent/s-training.json) · [Referência de A/S](https://revistas.ufrj.br/index.php/rl/article/download/37488/22633/114954#page=4)

Nas tomadas de Uéslei Paterno, O exibia E em dois ângulos, com ou sem a outra mão visível e com a mão ampliada. Uma tomada recebia E pelo complemento e a outra pelas duas redes principais. Na compilação `5b2d4c4`, toda leitura de E passa por uma regressão logística que verifica as distâncias da ponta do polegar às pontas do indicador e do médio. O leitor troca E por O quando o resultado chega a 0,95. O treino ficou restrito às fontes já usadas pelo alfabeto, sem quadros dessas tomadas. Na validação, o modelo marcou O em zero dos 142 quadros de E. [Diagnóstico por ângulo e modelo](../ml/evidence/alphabet-paterno-o-e/README.md) · [Treino e paridade ONNX](../ml/evidence/alphabet-o-s-independent/e-o-training.json)

No Chromium, as duas tomadas de O de Paterno exibiram O nos cinco enquadramentos de cada uma. E permaneceu E nos cinco enquadramentos de controle. O par reservado de Tel baixinha exibiu E e O nas respectivas janelas. Os replays de O em Praticar e na Área livre usaram a segunda tomada de Paterno. [Relatório por recorte](../ml/evidence/alphabet-o-s-independent/replay-5b2d4c4.json) · [Identificação do par reservado](../ml/evidence/alphabet-e-o-independent/README.md)

O leitor pode completar o traçado de Z após exibir X. Uma perda breve do rastreamento apaga a letra imediatamente e conserva os pontos do traçado por até 220 ms quando X já apareceu. Na janela de Z do Cecierj, houve Z em um de três replays na compilação anterior e em dois de três na nova. Uma versão intermediária conservava o traçado em toda interrupção breve e produziu Z em duas atividades de mesa. A versão adotada excluiu esses dois resultados e ainda exibiu Z no sinal Azul da UFSM, já visto em um replay com o leitor anterior. [Repetições de Z e controles](../ml/evidence/alphabet-o-s-independent/z-controls.json)

Nas 72 janelas do alfabeto, o Chromium exibiu a letra esperada em 71. S apareceu sozinho no recorte da Uníntese e A ficou sem leitura na terceira aula da UFSM. As 17 janelas adicionais de E e O, que incluem os enquadramentos do mesmo vídeo de Paterno, exibiram a letra esperada. Nos 19 controles fora do alfabeto, O e S apareceram nos mesmos recortes que na compilação `bfe1945`. O teste da câmera física com uma pessoa sinalizando segue pendente. [Janelas do alfabeto e variações de enquadramento](../ml/evidence/alphabet-o-s-independent/replay-5b2d4c4.json) · [Controles fora do alfabeto](../ml/evidence/alphabet-o-s-independent/replay-negatives-5b2d4c4.json)

Na prévia em 4177, os testes com vídeo passaram para S da Uníntese e O de Paterno em Praticar e na Área livre. Também passaram a troca de M para N na mesma captura e a sobreposição das duas mãos. [Testes do leitor](../tests/e2e/alphabet-live.test.mjs) · [Teste dos pontos](../tests/e2e/hand-overlay-live.test.mjs)

#### Ensaio do candidato de Z em Azul

A regra experimental exige que a projeção lateral mediana da ponta do polegar fique até 0,20 da escala da palma durante os três traços de Z. O limite foi fixado nos controles de Z antes de abrir Azul. O replay pareado dos mesmos pontos reduziu a leitura de Z em Azul da UFSM de uma em três capturas para zero em três. [Protocolo](../ml/evidence/alphabet-z-azul/protocol.json) · [Critério congelado](../ml/evidence/alphabet-z-azul/hypothesis.json)

O pacote candidato `605cacc` foi testado de ponta a ponta com câmera virtual no Chromium. Exibiu os mesmos quatro Z das cinco janelas rotuladas e as letras esperadas nos controles C, Ç, H, J, K, X e Y. Nas três repetições de Azul da UFSM apareceram A e L, e nos 19 controles fora do alfabeto também houve zero Z. [Janelas e repetições](../ml/evidence/alphabet-z-azul/replay-windows.json) · [Replay do candidato](../ml/evidence/alphabet-z-azul/e2e-605cacc.json) · [Dezenove controles](../ml/evidence/alphabet-z-azul/negativos-605cacc.json)

No reteste com dez janelas por versão, o Z da aula `1536677587` da UFSM ficou sem leitura nas três repetições de cada versão. O Z do Cecierj apareceu em uma das duas repetições em cada versão, com leituras transitórias. Ç apareceu nas duas janelas depois de C, e U foi seguido por H nas três janelas. A prévia local adotou a regra em `5eccc2c`. O pacote integrado passou os testes de Z da Unesp na Área livre e em Praticar, da transição M → N nos dois modos e da sobreposição das duas mãos. Esses testes usaram vídeo gravado. [Janelas do reteste](../ml/evidence/alphabet-z-azul/confirmacao-janelas.json) · [Base](../ml/evidence/alphabet-z-azul/confirmacao-5b2d4c4.json) · [Candidato](../ml/evidence/alphabet-z-azul/confirmacao-605cacc.json)

### Retomada do Z curto da UFSM

A câmera virtual alimentou seis reproduções do trecho de 42,500 a 43,950 s da aula `1536677587`. Em cada uma, duas detecções de mão próximas fizeram o leitor deixar de selecionar uma mão no meio de um traço. A leitura ficou vazia. Com os mesmos pontos e tempos de mídia, o leitor temporal anterior deixou de confirmar todas as seis reproduções. O candidato confirmou Z nas seis, entre 700 e 734 ms após o início do trecho. Nesta comparação, o classificador estático ficou fora do replay. [Manifesto da aula](../ml/alphabet/ufsm-temporal-windows.json) · [Comparação com os pontos congelados](../ml/evidence/alphabet-z-azul/ufsm-z-curto-pareado.json)

O candidato reinicia o painel ao perder a seleção da mão. Conserva o trecho anterior apenas para Z quando três juntas da palma coincidem aproximadamente nas duas detecções, a seleção volta ao mesmo lado em até 220 ms e o indicador continua o segundo ou o terceiro traço na mesma direção horizontal. A verificação da abertura do polegar continua em vigor. No Chromium, a compilação candidata `9d5d6fe` exibiu Z nas três novas capturas do mesmo recorte. Os três testes de ponta a ponta passaram, incluindo os dois modos e a troca M → N. No replay dos mesmos pontos das outras gravações, o leitor preservou os quatro Z já reconhecidos e manteve o detector temporal de Z vazio nos 19 negativos e nas três repetições de Azul. Nos seis recortes de três pessoas fora do ajuste, a prévia e o candidato exibiram os três Z e o Y de Tel baixinha. Os dois Y restantes ficaram sem leitura. A sequência da Unicentro também exibiu S durante o recorte de Z. [Prévia nos recortes independentes](../ml/evidence/alphabet-z-azul/independentes-81e20b9.json) · [Candidato nos mesmos recortes](../ml/evidence/alphabet-z-azul/independentes-9d5d6fe.json) [Repetições no Chromium](../ml/evidence/alphabet-z-azul/ufsm-z-curto-9d5d6fe.json) · [Comparação pareada dos controles](../ml/evidence/alphabet-z-azul/ufsm-z-curto-controles-pareados.json) [Recortes de Y e Z fora do ajuste](../ml/alphabet/independent-y-z-windows.json) · [Candidato com replays](https://github.com/LuanFerns07/LIBRAS/tree/9d5d6fe)

Para reproduzir uma captura com os pontos e rodar o leitor temporal sobre ela, use na raiz do código do candidato.

```sh
node ml/alphabet/replay-web.mjs --url http://127.0.0.1:4177/ \
  --manifest ml/evidence/alphabet-z-azul/confirmacao-janelas.json \
  --source 1536677587 --workers 1 --trace --timeline > data/ufsm-z-curto.json
node ml/alphabet/replay-motion-trace.mjs data/ufsm-z-curto.json \
  data/releases/librasia-q-teste/site/models/alphabet-motion.json
```

A compilação passou a servir a prévia local em 4177. A letra esperada apareceu em todos os 16 recortes dos controles C, Ç, H, J, K, X, Y e Z. Algumas letras breves continuaram aparecendo nas janelas de Z. Nenhum dos 19 controles fora do alfabeto nem as três repetições de Azul da UFSM exibiram Z. A rodada também verificou a sobreposição das duas mãos. Após a troca da prévia, o Chromium repetiu os testes de Z, Q e da passagem M → N com gravações. [Controles rotulados e Azul](../ml/evidence/alphabet-z-azul/ufsm-z-curto-continuidade-9d5d6fe.json) · [Dezenove recortes fora do alfabeto](../ml/evidence/alphabet-z-azul/ufsm-z-curto-negativos-9d5d6fe.json)

Para recompilar localmente com os mesmos pesos da prévia anterior, use um caminho de pacote livre.

```sh
base="$PWD/data/releases/librasia-q-teste/site/models"
LIBRASIA_MODELO="$base" LIBRASIA_ALFABETO_MOVIMENTO="$base" LIBRASIA_ALFABETO_MODELO="$base" \
  ./scripts/executar-local.sh --pacote data/releases/librasia-z-palma-reconstruido
python3 data/releases/librasia-z-palma-reconstruido/iniciar.py --porta 4177
```

### Confirmação de Y pela forma da mão

O leitor anterior comparava Y com sequências de movimento. Nas gravações reservadas, o Y de Uéslei Paterno e o da Unicentro ficaram sem leitura no Chromium. As redes estáticas também ficaram sem uma letra na maior parte dessas janelas. O ensaio comparou as coordenadas da imagem e as coordenadas 3D com a mesma regressão logística. Usou três demonstrações de Y e 47 recortes de outras letras, de três aulas de treino. As medidas incluem flexão, distância entre pontas dos dedos e posição do polegar e do mínimo em relação à palma. [Recortes adicionais de treino](../ml/alphabet/institutional-y-training.json) · [Replays da base](../ml/evidence/alphabet-y/y-base-9d5d6fe.json)

O modelo da imagem sustentou de oito a 12 votos consecutivos entre os quadros selecionáveis de cada um dos cinco Y reservados. No mesmo teste, a versão 3D teve dois votos consecutivos no Y da Unicentro. A forma estimada pela imagem também deu um voto isolado a um Z e a quadros de dois recortes fora do alfabeto. No candidato `59c47db`, o complemento entra apenas quando as demais decisões do classificador estático ficam inconclusivas. A saída continua exigindo três votos seguidos. A exportação verificou o mesmo resultado do PyTorch no ONNX com limiar de 0,95. [Treino, avaliação e paridade](../ml/evidence/alphabet-y/treino-e-paridade.json) · [Código do treino](https://github.com/LuanFerns07/LIBRAS/blob/59c47db/ml/alphabet/probe_y.py)

Na base, Y apareceu em duas de três reproduções de Tel baixinha e uma de três de Paterno e da Unicentro. O Chromium mostrou Y nas nove repetições com o candidato. As duas últimas gravações passaram nos testes em Praticar e na Área livre. As duas versões conservaram W e Y no recorte adicional da UFAC, reservado por pessoa. [Repetições na base](../ml/evidence/alphabet-y/y-base-repetido-9d5d6fe.json) · [Repetições no candidato](../ml/evidence/alphabet-y/y-candidato-59c47db.json) · [Recortes da UFAC](../ml/alphabet/ufac-w-y-holdout.json) · [UFAC no candidato](../ml/evidence/alphabet-y/ufac-59c47db.json)

A compilação `59c47db` passou a servir a prévia em 4177. O Chromium exibiu a letra esperada nos 89 recortes rotulados da bateria. No Z do Cecierj, a leitura breve de Y já aparecia na referência anterior. O Z curto da UFSM apareceu nas três repetições e nenhum dos 19 recortes fora do alfabeto exibiu Y. A sobreposição de duas mãos passou com vídeo gravado. Na porta 4177, também passaram os retestes gravados de Y, Q e da transição M → N. O aceite com pessoas sinalizantes na webcam permanece pendente. [Bateria de letras](../ml/evidence/alphabet-y/positivos-59c47db.json) · [Controles fora do alfabeto](../ml/evidence/alphabet-y/negativos-59c47db.json) · [Repetições do Z curto](../ml/evidence/alphabet-y/z-curto-59c47db.json)

Para reconstruir o complemento e empacotar a prévia com os modelos anteriores, use as gravações verificadas nos manifestos. O comando reutiliza a extração de [referência 3D de A](../ml/evidence/alphabet-a-e-independent/README.md#ensaio-de-flexão-em-coordenadas-3d).

```bash
out=data/alphabet/y-reproducao
base="$PWD/data/releases/librasia-z-palma-teste/site/models"
mkdir -p "$out"
for name in ufsm-temporal-windows institutional-y-training institutional-temporal-windows independent-y-z-windows; do
  OPENCV_FFMPEG_CAPTURE_OPTIONS='threads;1' .venv/bin/python -m ml.alphabet.extract_motion \
    --world --manifest "ml/alphabet/$name.json" --out "$out/$name.json"
done
.venv/bin/python -m ml.alphabet.probe_y data/alphabet/a-oculto/referencia-3d.json \
  "$out/"{ufsm-temporal-windows,institutional-y-training,institutional-temporal-windows,independent-y-z-windows}.json \
  --base "$base" --out data/models/alphabet-y-reproduzido
LIBRASIA_MODELO="$base" LIBRASIA_ALFABETO_MOVIMENTO="$base" \
  LIBRASIA_ALFABETO_MODELO="$PWD/data/models/alphabet-y-reproduzido" \
  ./scripts/executar-local.sh --pacote data/releases/librasia-y-reconstruido
```

### Confirmação de R na prévia local

A prévia verifica a forma de R quando as redes concordam em R ou U. Na comparação com gravações, a leitura R de Tel baixinha passou de zero a três acertos em três repetições. Os dez recortes de U já reconhecidos continuaram mostrando U, incluindo o da UFF em vista oblíqua. O falso R do movimento de queixo para teclado caiu de um em cinco replays a zero em cinco. [Configuração, comparação e reprodução](../ml/evidence/alphabet-a-q-r/README.md#adoção-da-confirmação-de-r)

O U oblíquo da Uníntese ficou sem letra depois da remoção do R indevido. O U em perfil da aula explicativa da Unicentro e o R da UFF também ficaram sem leitura. As hipóteses para recuperar esses casos seguem em avaliação. [Casos restantes](../ml/evidence/alphabet-a-q-r/README.md#casos-restantes-de-u-e-r)

### Reteste de letras com movimento na prévia local

O Chromium 156 usou a compilação `50ad447` na Área livre. O script reproduziu a mídia em velocidade original pelo dispositivo de teste do navegador e registrou as letras exibidas e os instantes em que o painel ficou vazio. Fixamos 12 recortes no commit `acdc21c`, usando as letras impressas na tela. Os vídeos da UFAC e da Unicentro já forneceram recortes de outras letras em avaliações anteriores. Estas janelas foram avaliadas pela primeira vez nesta rodada, com os modelos do alfabeto congelados. [Protocolo e hashes](../ml/alphabet/independent-motion-expanded-windows.json) · [Aula da UFAC](https://www.youtube.com/watch?v=B2U7c6OXgBg) · [Aula da Unicentro](https://www.youtube.com/watch?v=AnIqxVEqGNs)

| Letra rotulada | Leituras na UFAC | Leituras na Unicentro |
| --- | --- | --- |
| C | C | C |
| Ç | C → Ç → C | |
| H | H | K → H |
| J | I → J → J | I → J → J |
| K | L → H → G → K | K |
| X | X | X |
| Z | G → Z | |

As setas registram a ordem das leituras. O JSON permite ver os intervalos em que o painel ficou vazio entre elas. Os dois controles de C mostraram apenas C. No recorte de Ç da UFAC, o C inicial durou 801 ms e o C depois de Ç ficou visível por 2.093 ms. Os outros recortes com leituras adicionais registraram aparições entre 107 e 650 ms. [Tempos e contagem de quadros das 12 janelas](../ml/evidence/alphabet-movimento-final/independentes.json)

Nos 17 controles anteriores, a letra esperada apareceu em 14 reproduções. O Y apareceu nos quatro recortes rotulados. Z faltou uma vez em cada um dos recortes de Tel baixinha, Paterno e Cecierj. No reteste, Z apareceu em cinco de seis reproduções. Foram cinco recortes, com uma repetição do Cecierj. Em mais duas rodadas pareadas, o Z de Tel baixinha apareceu uma vez em cada versão, `50ad447` e `59c47db`. O Z de Paterno apareceu nas duas repetições de cada pacote. Os resultados mostram variação entre reproduções do mesmo recorte. [Controles](../ml/evidence/alphabet-movimento-final/controles.json) · [Reteste de Z](../ml/evidence/alphabet-movimento-final/reteste-z.json) · [Comparação entre pacotes](../ml/evidence/alphabet-movimento-final/comparacao-z.json)

Nos testes de ponta a ponta com vídeos da UFSM, Z curto e Ç apareceram na Área livre e em Praticar antes de iniciar uma tentativa. A Área livre permitiu adicionar a letra lida e liberou a trilha ao navegar. Em Praticar, a leitura mostrou a letra sinalizada com A como alvo. Os logs locais ficam em `data/evidence/alphabet-movimento-final/ponta-a-ponta-z.log` e `data/evidence/alphabet-movimento-final/ponta-a-ponta-cedilha.log`. O teste de Y e das trocas de letras com pessoas diretamente na webcam segue pendente. [Cenários no Chromium](../tests/e2e/alphabet-live.test.mjs)

~~~bash
node ml/alphabet/replay-web.mjs --url http://127.0.0.1:4177/ \
  --manifest ml/alphabet/independent-motion-expanded-windows.json \
  --source ufac-b2u7c6oxgbg --source unicentro-aniqxveqgns --workers 1 --timeline
~~~

### Alfabeto com a mesma trilha de câmera

No Chromium, a prévia `599f341` leu 79 janelas rotuladas em três gravações. O primeiro ensaio manteve uma única trilha por aula, a velocidade original e as transições entre as letras. O segundo abriu cada janela separadamente, com dois segundos de quadro preto antes e depois. Nos dois casos, a métrica conta as letras exibidas dentro do mesmo intervalo rotulado. Uma janela pode conter a letra esperada junto de outras leituras.

| Gravação | Janelas | Esperada na mesma câmera | Só a esperada | Esperada por recorte | Só a esperada |
| --- | ---: | ---: | ---: | ---: | ---: |
| NUEDIS/UFF, fonte reservada | 26 | 23 | 20 | 20 | 19 |
| Unicentro, regressão | 26 | 22 | 12 | 21 | 11 |
| UFSM, regressão com Ç | 27 | 26 | 16 | 27 | 24 |
| **Total** | **79** | **71** | **48** | **68** | **54** |

Na gravação da UFF, J, K e Z apareceram na mesma trilha e ficaram sem leitura nos recortes separados. D e T ficaram sem leitura nas duas condições. A janela de R exibiu X na mesma trilha e ficou vazia no recorte. Essa fonte foi reservada antes da inferência e está ausente dos manifestos usados no ajuste. [Aula do NUEDIS/UFF](https://www.youtube.com/watch?v=ffJZgofrtSg) · [Rótulos, licença e créditos](../ml/alphabet/uff-alfabeto-continuo.json) · [Leituras por janela](../ml/evidence/alphabet-sequencia/uff-resumo.json)

Na Unicentro, a janela de N exibiu M nas duas condições. Na mesma trilha, M apareceu quando a mão já baixava, a 54,323 s do vídeo. Ao recortar o lado da imagem que contém a vista secundária, apareceu N durante a pose e houve leituras adicionais de M. O recorte também aumentou o tamanho relativo da mão na entrada do extrator. Na UFF e na UFSM, N foi a única leitura nas respectivas janelas da mesma trilha. [Aula da Unicentro](https://www.youtube.com/watch?v=AnIqxVEqGNs) · [Leituras por janela](../ml/evidence/alphabet-sequencia/unicentro-resumo.json) · [Reteste do N com recorte](../ml/evidence/alphabet-sequencia/unicentro-n-sem-segunda-vista.json)

Na UFSM, a janela de Ç exibiu apenas Ç na mesma trilha e C seguido de Ç no recorte. A foi a única letra esperada que faltou na mesma trilha. As duas gravações de regressão incluem trechos já consultados no desenvolvimento. Cada condição teve uma reprodução por janela. As contagens descrevem essas tomadas e o aceite com pessoas diretamente na webcam segue pendente. [Aula da UFSM](https://ntetube.nte.ufsm.br/v/1535641159) · [Leituras por janela](../ml/evidence/alphabet-sequencia/ufsm-resumo.json)

Para reproduzir o ensaio da UFF, coloque o MP4 indicado no manifesto na pasta local e use a prévia aberta no Linux.

~~~bash
out=data/evidence/alphabet-refs
mkdir -p "$out"
manifest=ml/alphabet/uff-alfabeto-continuo.json
node ml/alphabet/replay-web.mjs --manifest "$manifest" --source uff-ffjzgofrtsg \
  --same-camera --workers 1 > "$out/uff-mesma-camera.json"
node ml/alphabet/replay-web.mjs --manifest "$manifest" --source uff-ffjzgofrtsg \
  --timeline --workers 2 > "$out/uff-recortes.json"
python3 -m ml.alphabet.compare_replays "$out/uff-mesma-camera.json" "$out/uff-recortes.json"
~~~

Para repetir a Unicentro, use o manifesto `ml/alphabet/unicentro-alfabeto-continuo.json` e a fonte `unicentro-aniqxveqgns`. Para repetir a UFSM, passe os dois manifestos `ml/alphabet/ufsm-static-windows.json` e `ml/alphabet/ufsm-temporal-windows.json` e selecione a fonte `1535641159`. [Relatórios com linhas do tempo e hashes da compilação](../ml/evidence/alphabet-sequencia)

### Aceite técnico de M4

O Chromium percorreu as 27 letras do avatar com controles de teclado, verificou a tradução de palavras e frases do catálogo e mostrou uma mensagem para uma entrada fora da cobertura. No nome `Ânna‑Graça`, o avatar soletrou A → N → N → A → Pausa → G → R → A → Ç → A. O teste unitário verificou a mesma soletração dentro de “Meu nome é”. O tradutor aceita hífen comum e os dois hífens tipográficos no nome composto. [Teste no Chromium](../tests/e2e/browser.test.mjs) · [Teste do tradutor](../tests/translate.test.js)

Com gravações rotuladas, o Chromium exibiu H, J, K, X, Z e Ç em Praticar e na Área livre, ao lado da câmera e sem iniciar tentativa. O recorte da UFF exibiu M → N → U nos dois modos e limpou o painel durante as transições, com a mesma trilha de vídeo. Os logs do reteste estão em `data/evidence/demonstracao/m4-alfabeto/`. As perdas em gravações reservadas, o caso de N em vista dupla e a revisão em Libras seguem no arquivo de pendências. [Teste da leitura ao vivo](../tests/e2e/alphabet-live.test.mjs) · [Pendências](pendencias-futuras.md#m4-e-m5--alfabeto-sinais-área-livre-e-voz)
