# Reproduzir treinamento e avaliação

Consulte a [procedência dos dados](dados.md) e o [protocolo de aceite](protocolo-aceite.md). Os comandos são executados na raiz do repositório após instalar Node, o Chromium, dependências web e Python.

```bash
npm ci
npm run setup:vision
python3 -m venv .venv
.venv/bin/python -m pip install -r ml/requirements.txt
python3 scripts/download_minds.py
cmp ml/manifests/minds-v1.json data/minds/manifest.json
node ml/extract.mjs --workers 3
.venv/bin/python ml/train.py --device auto
.venv/bin/python ml/evaluate.py
node ml/verify-wasm.mjs
```

Para a RTX 4060 com driver compatível com CUDA 12.4, instale a variante correspondente do PyTorch na mesma `.venv`. Em Linux x86_64, `.venv/bin/python -m pip install torch==2.6.0+cu124 --index-url https://download.pytorch.org/whl/cu124` seleciona essa variante. `--device auto` usa CUDA quando a instalação a disponibiliza e registra o dispositivo escolhido.

## Extração e contrato

O Chromium executa o mesmo `openHolistic()` e `preprocessFrames()` importados pelo aplicativo. Isso mantém versão do extrator, modelo e implementação de normalização em comum. A tarefa Holistic da versão 0.10.32 está no pacote Web. A inspeção do wheel Python oficial da mesma versão encontrou extratores individuais de pose, mãos e rosto, sem a classe Holistic dessa API. PyTorch recebe as janelas prontas do código web. [MediaPipe Holistic Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/holistic_landmarker) · [MediaPipe 0.10.32 no PyPI](https://pypi.org/project/mediapipe/0.10.32/)

O extrator local serve um único vídeo por vez a cada instância de navegador em loopback. O vídeo é decodificado no Chromium, reamostrado a 100 ms e redimensionado a no máximo 640 px de largura proporcionalmente antes da tarefa. A webcam solicita 640 × 480 e seleciona o próximo quadro disponível após o mesmo intervalo de 100 ms. Os metadados e vetores normalizados são gravados em `data/minds/features`, com o SHA-256 do clipe e da receita de extração. Nenhuma janela atravessa vídeos ou pessoas.

O tensor `landmarks` é `float32[1,24,192]`. Cada quadro contém os índices 11–16 da pose, seguidos dos 21 pontos de cada mão, esquerda antes da direita. Cada ponto traz `x, y, z, presença`. A posição é centrada entre os ombros e escalada pela distância entre eles com correção da proporção da imagem. O eixo Z das mãos é relativo ao próprio pulso e usa o Z do pulso da pose quando disponível. Ausência produz quatro zeros. A janela vai do primeiro ao último quadro com ombros e uma mão observáveis e requer cinco quadros rastreados e 55% de cobertura. A reamostragem usa 24 instantes uniformes e o vizinho temporal até 150 ms. Entrada insuficiente é inconclusiva antes do classificador.

O modelo exporta `logits` com quatro classes ordenadas no manifesto, começando por rejeição. A melhor classe precisa ser um sinal do catálogo com confiança softmax acima ou igual ao limiar.

## Seleção e avaliação

A rede usa três camadas Conv1D com normalização, agregação máxima temporal e médias em cada metade da tentativa. O treino usa AdamW, pesos de classe inversos à raiz da frequência e perturbações leves de escala e coordenadas. O espelhamento de exemplos de treino inverte X e troca os índices anatômicos de mãos e membros. As máscaras de ausências são preservadas. Os parâmetros da execução estão no relatório `training.json`.

A cada época, o treino seleciona limiar de 0,25 a 1,00 em passos de 0,01 usando a validação. A regra verifica primeiro o conjunto de metas da classificação, depois o limite de falsos aceites, F1 macro e cobertura. Após a seleção de pesos e limiar, `evaluate.py` abre o teste por pessoa. O teste contabiliza extrações insuficientes como rejeições. As métricas de classe e a matriz têm suporte e denominadores para separar rejeições corretas de tentativas de sinais válidos perdidas.

`evaluate.py` compara os logits e as decisões da rede PyTorch aos do ONNX Runtime em CPU para cada tentativa elegível no teste. Ele grava `parity-web.json` com amostras de validação para `verify-wasm.mjs`. O verificador abre Chromium e usa o runtime WASM e a função de decisão do app, medindo a divergência de logits e saídas. O tempo do classificador CPU e a extração de quadros offline têm campos separados no relatório. O aceite de latência com webcam e avatar é avaliado no roteiro de demonstração em outra medição.

## Saídas locais

`data/models/isolated-v1` contém `isolated.pt`, `isolated.onnx`, `isolated.json`, `training.json`, `evaluation.json` e `parity-web.json`. Guarde o manifesto do recorte e os relatórios para vincular pesos, configuração, versão dos dados e métricas. O manifesto do modelo identifica a licença e o SHA-256 do arquivo ONNX. Instale a versão avaliada com `npm run setup:model -- data/models/isolated-v1`.

```bash
PYTHONPATH=ml .venv/bin/python -m unittest discover -s ml/tests -v
```

## Experimento de expansão com ALUNO

O catálogo expandido acrescenta ALUNO à área livre. A forma histórica de Fortaleza aparece no avatar para comparação, com escopo descrito em [Animações](animacoes.md). A execução do experimento abaixo mantém o modelo inicial e o catálogo de prática. Execute cada treino de GPU separadamente.

```bash
mkdir -p data/minds-expanded/raw data/minds-expanded/features
cp -aln data/minds/raw/. data/minds-expanded/raw/
python3 scripts/download_minds.py --catalogo expandido
cp -aln data/minds/features/*.json data/minds-expanded/features/
node ml/extract.mjs --manifest data/minds-expanded/manifest.json --out data/minds-expanded/features --workers 3
.venv/bin/python ml/train.py --catalogo expandido --features data/minds-expanded/features/index.json --out data/models/isolated-expanded
.venv/bin/python ml/evaluate.py --features data/minds-expanded/features/index.json --run data/models/isolated-expanded
node ml/verify-wasm.mjs --run data/models/isolated-expanded
```

Compare as matrizes de confusão e a taxa de falsa aceitação em seus denominadores originais. O manifesto do modelo instalado informa a cobertura da área livre. Para executar separadamente o modelo expandido em Linux, use `LIBRASIA_MODELO=data/models/isolated-expanded ./scripts/executar-local.sh`.
