# Negativos reais fora do MINDS-Libras

Este teste exploratório usa trechos de atividades do *Complex and Long Activities Dataset* (CLAD), depositado pela University of Leeds. A licença CC BY 4.0 está explícita no depósito para os vídeos e as anotações. Os autores gravaram atores executando tarefas com uma câmera Kinect 2 estática. O registro vincula cada tomada aos IDs de ator. [Depósito e licença](https://archive.researchdata.leeds.ac.uk/254/) · [Método dos autores](https://arxiv.org/html/1709.03456)

Os doze recortes e a identificação das três pessoas de teste foram definidos antes da inferência. As duas pessoas restantes ficam reservadas para eventual desenvolvimento. As tomadas de teste têm um único ID nas anotações oficiais. Cenas futuras de desenvolvimento precisam conter apenas os IDs 4 ou 5. Cada pessoa de teste contribui com dois clipes de repouso e dois de movimentos cotidianos. Repouso corresponde a pausas sentadas com mãos apoiadas, juntas ou mantendo um objeto em posição aproximadamente estável. Os clipes em movimento incluem manusear um pote, escrever, servir cereal, beber e digitar. A triagem visual conferiu a postura e o contexto do intervalo de 4 segundos. As marcações temporais referem-se aos MP4s compactados da fonte depositada. [Protocolo e proveniência por clipe](../ml/external_eval/clad.json)

O pré-processamento recorta espacialmente para 416 × 352 em região comum às tomadas, mantém a ordem temporal e remove o áudio. O protocolo exige clipes sem sobreposição, checa duração e SHA-256, e rejeita tomadas com IDs diferentes do manifestado. Os arquivos recortados e os pontos inferidos ficam em `data/external-negative`. A inferência usa o extrator e pré-processamento compartilhados com o aplicativo e os arquivos ONNX congelados. As métricas registram tanto os totais de clipes como as tentativas com rastreamento utilizável.

## Reprodução

Execute após instalar o aplicativo e as dependências de avaliação descritas no [treinamento](avaliacao.md). O preparo usa FFmpeg e FFprobe.

```bash
python3 -m ml.external_eval.prepare
node ml/extract.mjs --manifest data/external-negative/manifest.json \
  --out data/external-negative/features --workers 2
PYTHONPATH=ml .venv/bin/python -m ml.external_eval.evaluate
PYTHONPATH=ml .venv/bin/python -m unittest ml.external_eval.test_external_eval
```

A amostra é agrupada por ator e foi produzida em um único tipo de ambiente e câmera. A taxa de falsas aceitações nestes clipes descreve o recorte. O aceite da demonstração exige também entradas negativas de pessoas independentes em webcam, com controle de enquadramento, oclusão e iluminação, além do teste de sinais suportados.

## Resultado de 26 de novembro de 2026

O Chromium 156.0.8078.79 extraiu os pontos dos 12 clipes. Todos tiveram rastreamento utilizável. A inferência usou ONNX Runtime 1.23.2 em CPU, com o limiar original de cada modelo. O [manifesto de execução](../ml/external_eval/evidence/manifest.json) contém os 12 SHA-256 dos recortes. Seu SHA-256 é `3b4d83b9cb61d37e831cc0c007bf63bca37086375c201dfdb1b9074107fc5145`.

| Modelo congelado | Limiar | Repouso | Movimento comum | Falsos aceites | Pessoas com algum falso aceite |
| --- | ---: | ---: | ---: | ---: | ---: |
| [Inicial `52bfe58f`](../ml/external_eval/evidence/report-v1.json) | 0,495 | 4/6 | 1/6 | 5/12 (41,7%) | 3/3 |
| [Expandido `fc50063c`](../ml/external_eval/evidence/report-expanded.json) | 0,475 | 2/6 | 3/6 | 5/12 (41,7%) | 3/3 |
| [Geometria manual `f1bdefcc`](../ml/external_eval/evidence/report-geometry.json) | 0,640 | 0/6 | 1/6 | 1/12 (8,3%) | 1/3 |

O inicial previu Cinco em quatro falsos aceites e Espelho em um. O expandido previu Aluno em três e Cinco em dois. O cenário remanescente de geometria manual foi a pessoa que digitou no laptop e levou a mão ao queixo, com rótulo Aluno e confiança 0,988. Os relatórios têm o resultado por clipe e por estrato. Para inspecionar um dos candidatos com o mesmo protocolo, acrescente `--run data/models/isolated-expanded` ou `--run data/models/isolated-geometry` ao comando de avaliação.

Este conjunto negativo foi aberto depois de fixar os três modelos, os limiares e os recortes. A geometria manual teve a menor taxa observada no conjunto, com três pessoas e seis trechos por estrato. O teste mede apenas rejeição nesses contextos e fica separado do teste reservado MINDS e de qualquer coleta futura em webcam. Os IDs 1–3 e seus clipes permanecem reservados a avaliação.

TAYYUB, Jawad, HAWASLY, Majd e COHN, Anthony G. *Complex and Long Activities Dataset*. University of Leeds, 2017. Foram feitos recortes espaciais e temporais dos MP4s e removidas as trilhas de áudio. [Dataset](https://doi.org/10.5518/249) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Negativos complementares no treino

O ensaio acrescenta ao treino do modelo com geometria nove trechos de quatro segundos, todos de Subject4. Os recortes foram escolhidos nas tomadas 16, 58 e 60 com base nas anotações das tarefas e inspeção do vídeo, antes da inferência. A seleção inclui alcance de objetos, mão junto ao cabelo, colocação de headset, bebida, escrita e uma pausa. Os IDs oficiais confirmam a presença de uma única pessoa por tomada, distinta dos atores 1 a 3 usados no teste externo. O manifesto conserva a origem, o início da janela, a observação e o SHA-256. [Seleção de janelas](../ml/external_eval/clad-development.json)

A comparação usa a mesma arquitetura, a mesma semente e as mesmas três rodadas por pessoa descritas na avaliação do MINDS. A arquitetura de referência usa somente MINDS. O candidato adiciona os negativos do CLAD apenas no ajuste dos pesos. A validação e a medição de cada rodada continuam usando pessoas distintas do MINDS original. O candidato precisa reduzir as falsas aceitações, manter ao menos os 13 acertos de Cinco em 18 da referência e manter F1 macro igual ou maior. Nenhuma decisão usa os clipes de teste do CLAD ou do MINDS. [Avaliação e divisão dos dados](avaliacao.md)

```bash
python3 -m ml.external_eval.prepare --development
node ml/extract.mjs --manifest data/clad-development/manifest.json \
  --out data/clad-development/features --workers 2
.venv/bin/python ml/cross_validate.py --device cuda \
  --reference ConvSequenceGeometry --candidate ConvSequenceGeometry \
  --candidate-negatives data/clad-development/features/index.json \
  --out data/models/isolated-clad/cross-validation.json
```
