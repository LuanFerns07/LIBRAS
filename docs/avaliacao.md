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

A cada época, o treino testa limiares de 0,25 a 1,00 em passos de 0,01 usando a validação. A regra verifica primeiro o conjunto de metas da classificação, depois o limite de falsos aceites, F1 macro e cobertura. Entre limiares igualmente eficazes, usa a mediana. Após a seleção de pesos e limiar, `evaluate.py` abre o teste por pessoa. O teste contabiliza extrações insuficientes como rejeições. As métricas de classe e a matriz têm suporte e denominadores para separar rejeições corretas de tentativas de sinais válidos perdidas.

`evaluate.py` compara os logits e as decisões da rede PyTorch aos do ONNX Runtime em CPU para cada tentativa elegível no teste. Ele grava `parity-web.json` com amostras de validação para `verify-wasm.mjs`. O verificador abre Chromium e usa o runtime WASM e a função de decisão do app, medindo a divergência de logits e saídas. O tempo do classificador CPU e a extração de quadros offline têm campos separados no relatório. O aceite de latência com webcam e avatar é avaliado no roteiro de demonstração em outra medição.

## Saídas locais

`data/models/isolated-v1` contém `isolated.pt`, `isolated.onnx`, `isolated.json`, `training.json`, `evaluation.json` e `parity-web.json`. Guarde o manifesto do recorte e os relatórios para vincular pesos, configuração, versão dos dados e métricas. O manifesto do modelo identifica a licença e o SHA-256 do arquivo ONNX. Instale a versão avaliada com `npm run setup:model -- data/models/isolated-v1`.

```bash
PYTHONPATH=ml .venv/bin/python -m unittest discover -s ml/tests -v
```

## Execução do catálogo inicial em 26 de novembro de 2026

O recorte completo tem 174 clipes Canon distribuídos por 12 pessoas. São 102 clipes para treino, 30 para validação e 42 para teste reservado. Houve um negativo de treino com rastreamento insuficiente. A otimização usou 101 exemplos elegíveis, RTX 4060 Laptop GPU, PyTorch 2.6.0+cu124, semente 7391, 80 épocas e lote 12. O conjunto ficou fixado no [manifesto de partição](../ml/manifests/minds-v1.json), de SHA-256 `467ebc1ee584b8e6587f2507d9d4e648266148beb48ee12d8b9630bf1c8ea5b4`.

A validação selecionou a época 56 e limiar 0,495 com a regra da mediana do empate. O resultado de validação foi F1 macro 0,970, cobertura 17/18 e 0/12 falsos aceites. Às 22h06 em Paris, o ONNX e o limiar foram congelados antes da leitura do teste reservado. O SHA-256 do ONNX é `52bfe58f63fa1adda9815bb32fbb0e59be196e8bf24c3807eba9704cb45bdf6a`. Houve uma tentativa de treino interna com o mesmo modelo e limiar 0,48. O QA independente também executou a cópia com limiar 0,48 e registrou a mesma matriz no teste. Os relatórios desta seção usam o limiar 0,495 selecionado pela validação. [Configuração e histórico da execução](../ml/evidence/isolated-v1/training.json)

| Sinal no teste | Suporte | Precisão | Revocação | F1 |
| --- | ---: | ---: | ---: | ---: |
| Cinco | 9 | 100,0% | 33,3% | 50,0% |
| Espelho | 9 | 70,0% | 77,8% | 73,7% |
| Amarelo | 6 | 42,9% | 100,0% | 60,0% |

| Esperado no teste | Rejeitado | Cinco | Espelho | Amarelo |
| --- | ---: | ---: | ---: | ---: |
| Fora do catálogo | 13 | 0 | 0 | 5 |
| Cinco | 0 | 3 | 3 | 3 |
| Espelho | 2 | 0 | 7 | 0 |
| Amarelo | 0 | 0 | 0 | 6 |

O F1 macro foi 0,612, com cobertura 22/24, 15/42 tentativas inconclusivas e 5/18 falsos aceites. Todos os falsos aceites foram classificados como Amarelo. O teste ficou abaixo das metas de F1 macro, revocação por classe, precisão por classe e rejeição. O modelo serve como protótipo exploratório e requer uma nova avaliação com pessoas independentes após novas mudanças. Esses clipes contêm outras glosas MINDS como negativos. O acervo não cobre repouso, movimentos comuns e revisão da orientação dada pela lição em webcam. [Métricas e decisões do teste reservado](../ml/evidence/isolated-v1/evaluation.json)

O teste de paridade PyTorch × ONNX Runtime CPU cobriu as 42 entradas com erro máximo absoluto nos logits de 2,86 × 10⁻⁶ e decisões idênticas. O runtime WASM na versão 156 do Chromium produziu o mesmo resultado para quatro entradas de validação com erro máximo de 9,54 × 10⁻⁷. A mediana de inferência isolada em CPU foi 0,071 ms e o p95 0,085 ms. A extração offline concorrente mediu 271 ms de mediana e 436 ms no p95 por quadro em 2.170 quadros do teste. Os números correspondem às etapas informadas. A latência entre o fim da tentativa e a resposta com webcam e avatar é medida separadamente no roteiro de demonstração. [Paridade WASM](../ml/evidence/isolated-v1/wasm-parity.json)

O manifesto exato da execução fica versionado, e os pesos permanecem em `data/models/isolated-v1` neste PC. [Manifesto do modelo](../ml/evidence/isolated-v1/model.json)

## Experimento de expansão com ALUNO

O catálogo expandido acrescenta ALUNO à área livre. A forma histórica de Fortaleza aparece no avatar para comparação, com escopo descrito em [Animações](animacoes.md). A execução do experimento abaixo mantém o modelo inicial e o catálogo de prática. Execute cada treino de GPU separadamente.

```bash
mkdir -p data/minds-expanded/raw data/minds-expanded/features
cp -aln data/minds/raw/. data/minds-expanded/raw/
python3 scripts/download_minds.py --catalogo expandido
cmp ml/manifests/minds-expanded-v1.json data/minds-expanded/manifest.json
cp -aln data/minds/features/*.json data/minds-expanded/features/
node ml/extract.mjs --manifest data/minds-expanded/manifest.json --out data/minds-expanded/features --workers 3
.venv/bin/python ml/train.py --catalogo expandido --features data/minds-expanded/features/index.json --out data/models/isolated-expanded
.venv/bin/python ml/evaluate.py --features data/minds-expanded/features/index.json --run data/models/isolated-expanded
node ml/verify-wasm.mjs --run data/models/isolated-expanded
```

Compare as matrizes de confusão e a taxa de falsa aceitação em seus denominadores originais. O manifesto do modelo instalado informa a cobertura da área livre. Para executar separadamente o modelo expandido em Linux, use `LIBRASIA_MODELO=data/models/isolated-expanded ./scripts/executar-local.sh`.

### Resultado da expansão em 26 de novembro de 2026

O treino na RTX 4060 usou 119 clipes elegíveis entre 120 clipes de treino. A validação usou 36 clipes. A configuração manteve a semente 7391, 80 épocas e lote 12. A validação selecionou a época 64 e o limiar 0,475, com F1 macro 0,935 e 0/12 falsas aceitações. O ONNX tem SHA-256 `fc50063cb217efbb71cff5758df723ccc643a59b1673ffc54e0e0815c5233e27`. [Manifesto do modelo](../ml/evidence/isolated-expanded/model.json) · [Configuração e histórico](../ml/evidence/isolated-expanded/training.json)

| Sinal no teste | Suporte | Precisão | Revocação | F1 |
| --- | ---: | ---: | ---: | ---: |
| Cinco | 9 | 100,0% | 33,3% | 50,0% |
| Espelho | 9 | 81,8% | 100,0% | 90,0% |
| Amarelo | 6 | 75,0% | 100,0% | 85,7% |
| Aluno | 9 | 100,0% | 100,0% | 100,0% |

| Esperado no teste | Rejeitado | Cinco | Espelho | Amarelo | Aluno |
| --- | ---: | ---: | ---: | ---: | ---: |
| Fora do catálogo | 16 | 0 | 0 | 2 | 0 |
| Cinco | 4 | 3 | 2 | 0 | 0 |
| Espelho | 0 | 0 | 9 | 0 | 0 |
| Amarelo | 0 | 0 | 0 | 6 | 0 |
| Aluno | 0 | 0 | 0 | 0 | 9 |

No teste de 51 clipes, o F1 macro foi 0,814, com cobertura de 29/33, 20/51 tentativas inconclusivas e 2/18 falsas aceitações. As duas falsas aceitações foram previstas como Amarelo. Cinco manteve 3/9 acertos, com quatro rejeições e duas trocas para Espelho. O desempenho abaixo das metas de revocação de Cinco e de falsa aceitação mantém o modelo experimental. O teste de Aluno cobre a execução presente no MINDS-Libras. A variante histórica de Fortaleza permanece em revisão linguística no avatar. [Métricas do teste reservado](../ml/evidence/isolated-expanded/evaluation.json)

A paridade PyTorch e ONNX Runtime CPU cobriu os 51 clipes, com diferença máxima de 7,63 × 10⁻⁶ nos logits e decisões iguais. Cinco entradas de validação no Chromium deram as mesmas decisões e diferença máxima de 1,43 × 10⁻⁶. [Paridade WASM](../ml/evidence/isolated-expanded/wasm-parity.json)

Na prévia do Chromium, a repetição do clipe Aluno S09-1 acrescentou `aluno aluno` em duas tentativas, com mediana de 4,9 ms e p95 de 8,6 ms do clique de conclusão à resposta. A revisão independente repetiu a verificação com um clipe de outra pessoa da partição reservada. [Roteiro de validação](roteiro-validacao.md)

## Experimento com geometria das mãos

Uma variante da Conv1D recebe a posição no espaço de sinalização e coordenadas adicionais relativas ao próprio pulso. As coordenadas locais usam a distância do pulso à base do dedo médio como escala e preservam as máscaras de ausências. A transformação faz parte do ONNX e o navegador continua enviando o mesmo tensor.

A comparação usou somente os 120 clipes da partição de treino do catálogo expandido. Dividimos as sete pessoas em três grupos. Em cada rodada, um grupo ajustou os pesos, outro escolheu a época e o limiar e o terceiro mediu o resultado. Somamos as matrizes da medição para contabilizar cada clipe uma vez.

| Arquitetura | F1 macro | Acertos de Cinco | Cobertura | Falsas aceitações |
| --- | ---: | ---: | ---: | ---: |
| Conv1D original | 0,543 | 3/18 | 48/78 | 5/42 |
| Conv1D com geometria | 0,668 | 13/18 | 61/78 | 8/42 |

A geometria aumentou a revocação de Cinco e também elevou os falsos aceites nessas rodadas. A rodagem com todas as pessoas do treino obteve 24/24 acertos e 0/12 falsos aceites nos clipes da validação que também definiu a época e o limiar. A concordância de cinco entradas no Chromium foi integral, com erro máximo de 4,77 × 10⁻⁷ nos logits. [Rodadas por pessoa](../ml/evidence/isolated-geometry/cross-validation.json) · [Validação](../ml/evidence/isolated-geometry/validation-evaluation.json) · [Paridade WASM](../ml/evidence/isolated-geometry/wasm-parity.json)

Em um recorte externo de 12 clipes com três pessoas, a geometria teve 1 falsa aceitação, ante 5 em cada um dos dois modelos anteriores. A avaliação externa cobre a rejeição de repouso e de movimentos cotidianos. Um novo grupo independente com sinais do catálogo e entradas fora dele ainda é necessário para avaliar a versão de demonstração. [Protocolo e resultados no CLAD](negativos.md)

```bash
.venv/bin/python ml/cross_validate.py --device cuda --out data/models/isolated-geometry/cross-validation.json
.venv/bin/python ml/train.py --arch ConvSequenceGeometry --catalogo expandido --device cuda \
  --features data/minds-expanded/features/index.json --out data/models/isolated-geometry
.venv/bin/python ml/evaluate.py --split val --features data/minds-expanded/features/index.json \
  --run data/models/isolated-geometry
node ml/verify-wasm.mjs --run data/models/isolated-geometry
```

## Experimento de rejeição separada

A arquitetura `ConvSequenceGated` usa as mesmas entradas e a mesma rede temporal do modelo com geometria. A primeira saída estima a probabilidade de a tentativa pertencer ao catálogo. As demais estimam a distribuição dos sinais, condicionada a esse pertencimento. O ONNX devolve log-probabilidades com a classe de rejeição em primeiro lugar. A decisão no navegador continua usando softmax e o limiar do manifesto.

Compare a arquitetura nova e a anterior com a mesma semente, as mesmas três rodadas por pessoa e o mesmo procedimento de escolha de época e limiar. Use apenas a partição original de treino. O candidato deve reduzir as falsas aceitações mantendo ao menos 13 acertos de Cinco em 18 e F1 macro no mínimo igual ao da geometria. Esta comparação orienta o desenvolvimento. Os clipes reservados MINDS e CLAD ficam fora do ajuste e uma avaliação com pessoas novas continua necessária.

```bash
.venv/bin/python ml/cross_validate.py --device cuda \
  --reference ConvSequenceGeometry --candidate ConvSequenceGated \
  --out data/models/isolated-gated/cross-validation.json
```

| Arquitetura | F1 macro | Acertos de Cinco | Cobertura | Falsas aceitações |
| --- | ---: | ---: | ---: | ---: |
| Geometria das mãos | 0,668 | 13/18 | 61/78 | 8/42 |
| Geometria com decisão de pertencimento | 0,579 | 5/18 | 53/78 | 7/42 |

A variante reduziu a cobertura e perdeu oito acertos de Cinco. O resultado ficou abaixo do critério. [Comparação por pessoa](../ml/evidence/isolated-gated/cross-validation.json)

## Experimento com flexão dos dedos

A forma de Cinco documentada no MINDS flexiona o indicador e o médio em V. O candidato `ConvSequenceFlexion` acrescenta à geometria o cosseno entre ossos vizinhos de cada dedo e a máscara dos pontos necessários para esse cálculo. Isso representa flexão mesmo quando a mão muda de escala ou de posição. A rede recebe também as coordenadas no referencial dos ombros e dos pulsos para distinguir posição, orientação e movimento. [Referências dos sinais](animacoes.md)

A comparação usa as três rodadas por pessoa do conjunto de treino, a mesma semente e os mesmos critérios de seleção da referência. O candidato deve preservar pelo menos os 13 acertos de Cinco da referência em 18, manter F1 macro igual ou superior e reduzir falsas aceitações. Os demais conjuntos ficam fora da escolha.

```bash
.venv/bin/python ml/cross_validate.py --device cuda \
  --reference ConvSequenceGeometry --candidate ConvSequenceFlexion \
  --out data/models/isolated-flexion/cross-validation.json
```

| Arquitetura | F1 macro | Acertos de Cinco | Acertos de Aluno | Cobertura | Falsas aceitações |
| --- | ---: | ---: | ---: | ---: | ---: |
| Geometria das mãos | 0,668 | 13/18 | 13/18 | 61/78 | 8/42 |
| Geometria e flexão dos dedos | 0,679 | 15/18 | 6/18 | 52/78 | 5/42 |

A flexão melhorou a classificação de Cinco e as falsas aceitações nesta comparação. A revocação de Aluno caiu de 13 para 6 em 18 e a cobertura ficou abaixo da meta de 75%. A rodada com 119 exemplos elegíveis de treino acertou os 24 positivos e rejeitou os 12 negativos na validação que também selecionou a época 11 e o limiar 0,500. O erro máximo de logits foi 2,38 × 10⁻⁶ entre PyTorch e ONNX em 36 clipes de validação. No Chromium com WebAssembly, foi 4,77 × 10⁻⁷ em cinco amostras, com decisões iguais. [Rodadas e matrizes](../ml/evidence/isolated-flexion/cross-validation.json) · [Validação](../ml/evidence/isolated-flexion/validation-evaluation.json) · [Paridade WASM](../ml/evidence/isolated-flexion/wasm-parity.json)

No conjunto de 12 negativos do CLAD já usado para comparar outros modelos, o candidato fixado aceitou três clipes indevidamente. O modelo com geometria havia aceitado um. Em uma prévia separada do Chromium, a flexão também classificou como Espelho duas reproduções da captura parcial do clipe conhecido Banco S12-2. O modelo inicial segue instalado no aplicativo local. [Resultados no CLAD](../ml/evidence/isolated-flexion/clad-evaluation.json) · [Regressão do Banco](regressao-area-livre.md)

```bash
.venv/bin/python ml/train.py --arch ConvSequenceFlexion --catalogo expandido --device cuda \
  --features data/minds-expanded/features/index.json --out data/models/isolated-flexion
.venv/bin/python ml/evaluate.py --split val \
  --features data/minds-expanded/features/index.json --run data/models/isolated-flexion
node ml/verify-wasm.mjs --run data/models/isolated-flexion
```

## Treino com janelas parciais de negativos

Uma captura pode conter só parte de um sinal desconhecido. Para avaliar a rejeição nessa situação, o protocolo fixa o primeiro e o último 60% de cada vídeo negativo da partição original de treino. Os dois trechos conservam a velocidade, a pessoa e a classe do original. A avaliação usa três rodadas por pessoa, com as mesmas pessoas de treino, validação e medição nas duas condições. A validação que escolhe época e limiar recebe vídeos completos.

No candidato, cada negativo elegível contribui com somente uma entrada por época, sorteada entre o vídeo completo e os recortes com extração válida. Isso mantém a contagem por classe e o peso total de cada exemplo. Os sinais conhecidos entram inteiros no treino. Na medição de negativos parciais, um vídeo conta uma vez quando pelo menos um de seus dois recortes é aceito. O candidato precisa reduzir essa contagem, manter pelo menos 75% de cobertura nos positivos completos e preservar os acertos de Cinco da referência. O recorte de Banco usado no navegador fica fora da seleção.

```bash
.venv/bin/python ml/compare_partial_negatives.py --device cuda \
  --partial-negatives data/minds-partial/features-negative/index.json \
  --out data/models/isolated-partials/cross-validation.json
```

O Holistic extraiu 82 vetores utilizáveis de 84 janelas, de 42 gravações de sete pessoas. O prefixo e o sufixo de Vontade S06-1 ficaram com rastreamento insuficiente. Na avaliação, essas tentativas permanecem no denominador como rejeições. [Preparação](janelas-parciais.md) · [Manifesto das janelas](../ml/evidence/isolated-partials/manifest.json)

| Condição de treino | Gravações com falso aceite em pelo menos uma janela | Falsas aceitações dos vídeos completos | Acertos de Cinco completo | Cobertura dos positivos completos | F1 macro nos vídeos completos |
| --- | ---: | ---: | ---: | ---: | ---: |
| Só vídeos completos | 15/42 | 8/42 | 13/18 | 61/78 | 0,668 |
| Com janelas negativas | 3/42 | 4/42 | 14/18 | 56/78 | 0,722 |

A falsa aceitação em prefixos caiu de 7 para 1 em 42. Em sufixos, caiu de 12 para 2 em 42. A cobertura dos positivos completos ficou em 71,8%, abaixo da meta de 75%. As métricas descrevem as rodadas de desenvolvimento e seus recortes. A versão local segue com os pesos iniciais. [Matrizes e contagens por rodada](../ml/evidence/isolated-partials/cross-validation.json)

O candidato exportado com limiar 0,600 acertou 24/24 sinais e rejeitou 12/12 negativos na validação que selecionou o limiar. As decisões coincidiram entre PyTorch e ONNX nos 36 clipes, e entre o ONNX de referência e o WebAssembly em cinco amostras. No recorte já conhecido do CLAD, houve uma falsa aceitação em 12 trechos, no gesto de digitar e tocar o queixo. Uma prévia separada rejeitou o recorte original de Banco em 2/2 reproduções e reconheceu Cinco e Espelho em 2/2 cada. [Validação](../ml/evidence/isolated-partials/validation-evaluation.json) · [Paridade WASM](../ml/evidence/isolated-partials/wasm-parity.json) · [Resultados no CLAD](../ml/evidence/isolated-partials/clad-evaluation.json)

```bash
.venv/bin/python ml/train.py --arch ConvSequenceGeometry --catalogo expandido --device cuda \
  --partial-negatives data/minds-partial/features-negative/index.json \
  --features data/minds-expanded/features/index.json --out data/models/isolated-partials
.venv/bin/python ml/evaluate.py --split val \
  --features data/minds-expanded/features/index.json --run data/models/isolated-partials
node ml/verify-wasm.mjs --run data/models/isolated-partials
```

## Combinação de geometria e flexão

A terceira condição atribui peso igual às probabilidades dos modelos de geometria e de flexão, treinados separadamente nas mesmas três rodadas de desenvolvimento. A média inclui a classe de rejeição. A validação de cada rodada escolhe um limiar para a combinação, com as mesmas regras dos modelos isolados. Verifique se a combinação melhora a cobertura e preserva a rejeição. Use as metas de classificação e rejeição do [protocolo](protocolo-aceite.md) para avaliar a possibilidade de abrir um teste com novas pessoas.

```bash
.venv/bin/python ml/cross_validate.py --device cuda --combine \
  --reference ConvSequenceGeometry --candidate ConvSequenceFlexion \
  --out data/models/isolated-combined/cross-validation.json
```

| Condição | F1 macro | Acertos de Cinco | Acertos de Aluno | Cobertura | Falsas aceitações |
| --- | ---: | ---: | ---: | ---: | ---: |
| Geometria | 0,668 | 13/18 | 13/18 | 61/78 | 8/42 |
| Flexão | 0,679 | 15/18 | 6/18 | 52/78 | 5/42 |
| Média das probabilidades | 0,761 | 15/18 | 13/18 | 59/78 | 3/42 |

A média passou as metas de F1 macro, cobertura e falsas aceitações dentro da comparação de desenvolvimento. Espelho acertou 13/21 e Amarelo 12/21, ambos abaixo da meta de 65% de revocação. A precisão de Amarelo foi 12/17, abaixo da meta de 75%. Os resultados ainda incluem pessoas da partição original de treino, agrupadas por rodada. [Matrizes por rodada](../ml/evidence/isolated-combined/cross-validation.json)

O ONNX combina os dois checkpoints locais. A validação que definiu o limiar 0,525 teve 24/24 acertos e 0/12 falsas aceitações. Nos 36 clipes, os logits de PyTorch e ONNX tiveram diferença máxima de 1,91 × 10⁻⁶ e as decisões coincidiram. A paridade WebAssembly foi conferida em cinco exemplos, também com decisões iguais. Os artefatos do aplicativo permanecem os do modelo inicial. [Calibração e paridade ONNX](../ml/evidence/isolated-combined/validation-evaluation.json) · [Paridade WASM](../ml/evidence/isolated-combined/wasm-parity.json)

No Chromium, a combinação rejeitou as dez reproduções parciais de Banco e preservou todos os textos já digitados. Reconheceu também as quatro reproduções de Cinco e Espelho. Nos 12 negativos já conhecidos do CLAD, houve um falso aceite, o mesmo gesto de digitar e tocar o queixo que foi aceito pelo modelo de geometria. [Resultados de Banco por janela](janelas-area-livre.md) · [Resultados no CLAD](../ml/evidence/isolated-combined/clad-evaluation.json)

```bash
.venv/bin/python ml/export_combined.py --out data/models/isolated-combined \
  data/models/isolated-geometry data/models/isolated-flexion
node ml/verify-wasm.mjs --run data/models/isolated-combined
LIBRASIA_PORTA=4175 LIBRASIA_MODELO=data/models/isolated-combined ./scripts/executar-local.sh
```
