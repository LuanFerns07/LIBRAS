# Experimentos de sinalização contínua (M10)

Os experimentos usam gravações contínuas reais. A tradução inicial é avaliada em frases roteirizadas do setor de energia. A segmentação é avaliada em trilhas temporais de uma entrevista pública do Corpus Libras. São experimentos de pesquisa locais e o aplicativo mantém o fluxo de sinais isolados.

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

Para os oito pares de teste com IoU ≥ 0,50, o IoU médio dos pares foi 0,639. Os desvios absolutos medianos de início e fim foram 87 e 165 ms. O teste evidencia baixa cobertura de fronteiras lexicais. O segmentador só propõe intervalos de movimento. A edição de glosas, a qualidade do sentido com revisão humana e o reconhecimento de uma sequência livre integrada à webcam ficam em aberto.

## Reprodução

Dados, modelos, predições individuais e arquivos da partição ficam em `data/`, fora do Git. Reproduza os experimentos na raiz do repositório com o ambiente de `ml/requirements.txt`. A extração da avaliação UFSC usa também `mediapipe==0.10.32` e OpenCV `4.12.0`.

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
python -m ml.continuous_experiment.score_web   data/continuous-ufsc/FLN_G1_D1_1entrevista_VIDEOS123-5.eaf   data/continuous-ufsc/web-segments.json   data/continuous-ufsc/web-scores.json
```

Para diagnosticar as coordenadas do gerador na entrada web, baixe um vídeo RGB equivalente do treino com `python -m ml.continuous_experiment.acquire_eqt data/eqt-v4 --annotations-only --rgb-reference`. Abra `/ml/continuous_experiment/eqt-reference.html` e salve `eqt-reference-holistic.json` em `data/eqt-v4`. A comparação mede cobertura bilateral e erros por eixo nos mesmos 82 quadros, para as duas ordens possíveis das mãos.

```bash
python -m ml.continuous_experiment.compare_eqt_features   data/eqt-v4/Landmarks-hands.zip   data/eqt-v4/eqt-reference-holistic.json   data/eqt-v4/feature-comparison.json
```
