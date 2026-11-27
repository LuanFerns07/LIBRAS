# Dados das letras estáticas de Libras

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
