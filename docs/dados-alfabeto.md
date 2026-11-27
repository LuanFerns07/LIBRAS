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

Há uma demonstração por letra em cada aula. Reutilizar ou transformar os quadros dessa demonstração mantém a mesma origem. A avaliação mede cobertura entre essas três gravações.

## Praticar e ler letras ao vivo

Abra **http://127.0.0.1:4177/#area-livre** no Chromium e selecione **Alfabeto** no campo **Conteúdo**. Ative a câmera e mostre uma letra com uma mão. A leitura aparece ao lado do vídeo assim que fica estável. Use **Adicionar letra** para levar o caractere à transcrição. **Inserir espaço** separa palavras.

Em **Praticar**, selecione **Alfabeto**, escolha entre A–Z e Ç e abra **Praticar com ajuda** para ver a leitura ao lado da câmera e a demonstração no avatar. O modelo escolhe a letra usando os pontos da mão. A escolha no exercício serve para comparar o resultado com o alvo e registrar o progresso.

O modo segue atualizando a leitura com a sobreposição de pontos oculta. Ao perder a mão ou sair do modo, a leitura é apagada. As letras estáticas aparecem após três leituras consecutivas de mesma classe. Quando os dois modelos discordam, o aplicativo aguarda uma leitura mais estável. As letras com movimento usam uma janela recente de pontos da mão.

### Compilar neste Linux

Depois de baixar e conferir os arquivos de vídeo dos manifestos da UFSM e preparar o LibraSign, execute a extração e o treino na raiz. A opção `--device cpu` também é aceita.

```bash
npm run setup:vision
.venv/bin/python -m ml.alphabet.extract_motion \
  --manifest ml/alphabet/ufsm-static-windows.json --out data/alphabet/static-video-final.json
.venv/bin/python -m ml.alphabet.extract_motion --out data/alphabet/motion-final.json
.venv/bin/python -m ml.alphabet.train --reference data/alphabet/static-video-final.json \
  --device cuda --out data/models/alphabet-ufsm-final
.venv/bin/python -m ml.alphabet.train --reference data/alphabet/static-video-final.json \
  --geometry --device cuda --out data/models/alphabet-geometry-final
.venv/bin/python -m ml.alphabet.agreement --primary data/models/alphabet-ufsm-final \
  --check data/models/alphabet-geometry-final --reference data/alphabet/static-video-final.json
node ml/alphabet/train-motion.mjs data/alphabet/motion-final.json
LIBRASIA_MODELO=data/models/isolated-combined ./scripts/executar-local.sh \
  --pacote data/releases/librasia-alfabeto-ao-vivo
python3 data/releases/librasia-alfabeto-ao-vivo/iniciar.py --porta 4177
```

Os vídeos de origem, os pontos extraídos e os modelos ficam no ambiente local. Os manifestos documentam os créditos dos autores, os intervalos rotulados e os hashes em cada partição. [Janelas estáticas](../ml/alphabet/ufsm-static-windows.json) · [Janelas de movimento](../ml/alphabet/ufsm-temporal-windows.json)

### Cobertura e verificação

A prévia usa 20 classes estáticas e dois padrões de movimento, Ç e Y. A Prática oferece também H, J, K, X e Z com o avatar. O detector de movimento confundiu algumas dessas letras entre as aulas e elas ficaram fora da leitura automática. A interface mostra a lista das classes do modelo local.

Treinamos os dois modelos estáticos com o LibraSign e quadros da aula do Libras ON. A validação usou outra aula da UFSM. Na terceira aula, a concordância dos modelos aceitou 250 de 290 quadros e acertou 243. Os quadros são correlacionados dentro de cada demonstração. O A da aula de teste ficou sem acertos nessa avaliação. [Matriz e resultado por letra](../ml/evidence/alphabet-live/agreement.json)

O detector temporal usa trajetórias das duas primeiras aulas e separa classes pelo formato da mão e deslocamento do pulso. Ç e Y passaram pelo recorte de seleção em gravações conhecidas. A seleção usou o resultado dos recortes, e a verificação em pessoas fora dessas aulas continua pendente. [Resultado por letra](../ml/evidence/alphabet-live/motion-evaluation.json)

O Chromium leu B, Ç e Y no vídeo reservado e mostrou o resultado ao lado da câmera sem o botão de tentativa. A transcrição recebeu a letra pelo botão **Adicionar letra**. O teste de Prática manteve A como alvo enquanto a câmera mostrava B. O vídeo entrou como câmera simulada nos testes automatizados. A confirmação com movimentos feitos na webcam do PC fica pendente. [Teste de navegador](../tests/e2e/alphabet-live.test.mjs)
