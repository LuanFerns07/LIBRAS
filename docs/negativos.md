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

O extrator produziu vetores utilizáveis nos 9 trechos. Acumulando as três matrizes de medição, os negativos adicionais reduziram as falsas aceitações de 8 para 5 em 42 clipes e elevaram o F1 macro de 0,668 para 0,673. A cobertura passou de 61 para 60 em 78. Os acertos de Cinco caíram de 13 para 9 em 18, com sete trocas por Espelho. O ensaio ficou abaixo do critério de Cinco e o modelo local continua com os mesmos pesos. [Manifesto dos recortes](../ml/evidence/isolated-clad/manifest.json) · [Matrizes por rodada](../ml/evidence/isolated-clad/cross-validation.json)

## Novas posturas, transições e glosas externas

O modelo combinado já havia sido medido em 12 trechos do CLAD, com uma falsa aceitação, e em dez reproduções parciais de uma única gravação de Banco, todas rejeitadas. A partição reservada do MINDS contém pessoas distintas, com glosas negativas também presentes entre os dados de treino. A nova seleção inclui nove demonstrações de seis glosas ausentes do catálogo e do treino dos modelos, três transições entre glosas externas e sete trechos de repouso ou atividade cotidiana. [CLAD original com o combinado](../ml/evidence/isolated-combined/clad-evaluation.json) · [Banco no Chromium](janelas-area-livre.md#reteste-com-a-combinação-de-geometria-e-flexão) · [Manifesto do treino MINDS](../ml/manifests/minds-expanded-v1.json)

O CLAD contribui com seis tomadas diferentes das usadas no primeiro teste, das mesmas três pessoas reservadas à avaliação. Os novos recortes incluem mãos junto à boca ou atrás de objetos, ajuste de headset, manuseio de pen drive e retorno ao teclado com oclusão. As pessoas reservadas ao desenvolvimento permaneceram fora do recorte. Os outros 13 clipes vêm de três apresentadores em materiais licenciados da UFSM, da Fiocruz e da Fundação Cecierj. O rótulo de cada sinal externo vem da legenda ou do algarismo mostrado na gravação. O recorte também inclui uma pausa em pé com as mãos abaixo do enquadramento. Os intervalos foram fixados por inspeção visual antes da inferência. [Protocolo CLAD](../ml/external_eval/clad-variants.json) · [Protocolo didático, créditos e licenças](../ml/fresh_eval/protocol-negatives.json)

Os três modelos congelados produziram as mesmas seis falsas aceitações em 19 tentativas. Os 17 trechos com rastreamento utilizável chegaram à inferência. Duas tentativas de repouso terminaram com rastreamento insuficiente, uma no CLAD e uma na UFSM. [Manifesto CLAD](../ml/external_eval/evidence/variants/manifest.json) · [Geometria no CLAD](../ml/external_eval/evidence/variants/report-geometry.json) · [Parciais no CLAD](../ml/external_eval/evidence/variants/report-partials.json) · [Combinado no CLAD](../ml/external_eval/evidence/variants/report-combined.json) · [Manifesto didático](../ml/fresh_eval/evidence-negatives/manifest.json) · [Comparação didática](../ml/fresh_eval/evidence-negatives/report.json)

| Estrato | Total | Rastreamento utilizável | Falsos aceites em cada modelo |
| --- | ---: | ---: | ---: |
| Repouso | 4 | 2 | 0 |
| Movimento cotidiano | 3 | 3 | 1 |
| Transição entre sinais | 3 | 3 | 1 |
| Sinal fora do catálogo | 9 | 9 | 4 |

Com o combinado, a volta do queixo ao teclado foi aceita como Aluno. Na UFSM, Vermelho e Laranja foram aceitos como Amarelo e Azul como Cinco. Na Fiocruz, Seis foi aceito como Espelho e a transição de Sete para Oito como Cinco. As três demonstrações da Cecierj, com os mesmos rótulos de cores dos clipes da UFSM, foram rejeitadas. A diferença observada entre apresentações limita a generalização. Os recortes não equivalem a uma amostra de novas pessoas sinalizando espontaneamente em webcam. [Decisões por clipe no CLAD](../ml/external_eval/evidence/variants/report-combined.json) · [Decisões por clipe nas aulas](../ml/fresh_eval/evidence-negatives/report.json)

O Chromium reproduziu três dessas janelas usando uma câmera simulada e o combinado em WebAssembly. As falsas aceitações de Aluno e Cinco voltaram a acrescentar palavras à área livre. O Azul da Cecierj ficou inconclusivo e preservou o texto. Cada linha corresponde a uma tentativa. [Janelas reais, transcrição e hashes](../ml/fresh_eval/evidence-negatives/browser.json)

| Recorte | Quadros processados | Resultado na área livre |
| --- | ---: | --- |
| CLAD, mão do queixo ao teclado | 40 | Acrescentou `aluno` |
| Cecierj, Azul | 17 | Preservou o texto |
| Fiocruz, Sete para Oito | 22 | Acrescentou `cinco` |

### Reprodução dos novos recortes

Os comandos usam os modelos locais `isolated-geometry`, `isolated-partials` e `isolated-combined`, com os respectivos limiares 0,640, 0,600 e 0,525. O FFmpeg recorta os trechos e remove o áudio. Para reutilizar arquivos já baixados, coloque os três MP4 de origem descritos pelo protocolo em `data/isolated-negative-audit/didactic/source`. O Chromium extrai os pontos com Holistic e os modelos rodam em CPU. Os MP4s, vetores e janelas de câmera simulada ficam em `data/`. [Contratos e hashes dos modelos](../ml/fresh_eval/protocol-negatives.json)

```bash
out=data/isolated-negative-audit
python3 -m ml.external_eval.prepare --protocol ml/external_eval/clad-variants.json \
  --archives data/external-negative/source --out "$out/clad"
python3 -m ml.fresh_eval.prepare --protocol ml/fresh_eval/protocol-negatives.json \
  --out "$out/didactic"

for group in clad didactic; do
  node ml/extract.mjs --manifest "$out/$group/manifest.json" \
    --out "$out/$group/features" --workers 2
done

for model in geometry partials combined; do
  PYTHONPATH=ml .venv/bin/python -m ml.external_eval.evaluate \
    --protocol ml/external_eval/clad-variants.json \
    --manifest "$out/clad/manifest.json" --features "$out/clad/features/index.json" \
    --run "data/models/isolated-$model" --out "$out/clad/report-$model.json"
done
PYTHONPATH=ml .venv/bin/python -m ml.fresh_eval.evaluate \
  --protocol ml/fresh_eval/protocol-negatives.json \
  --manifest "$out/didactic/manifest.json" --features "$out/didactic/features/index.json" \
  --out "$out/didactic/report.json"
```

Para repetir as três capturas simuladas, use a transformação de vídeo registrada na evidência para preparar os Y4M. Execute o teste `recognition.test.mjs` do roteiro de capturas parciais com `LIBRASIA_TEST_START_OFFSET_MS=500`, a duração de cada clipe e o texto esperado na reprodução. Os rótulos esperados `aluno` e `cinco` verificam a reprodução do erro observado. [Roteiro Chromium](janelas-area-livre.md#reproduzir) · [Parâmetros das três capturas](../ml/fresh_eval/evidence-negatives/browser.json)

## Negativos complementares no controle com máscara do nariz

O mesmo grupo de nove clipes de desenvolvimento do CLAD entrou no treino de `ConvSequenceNoseMasked`. O controle usa a mesma arquitetura e a mesma extração, com as relações com o nariz zeradas. Mantivemos as três rodadas por pessoa do MINDS, a semente 7391 e 80 épocas por rodada. Os recortes externos de avaliação ficaram fora do ajuste.

| Condição | F1 macro | Amarelo | Precisão de Amarelo | Falsos aceites |
| --- | ---: | ---: | ---: | ---: |
| Controle | 0,818 | 13/21 | 81,3% | 5/42 |
| Com nove negativos de treino | 0,780 | 11/21 | 64,7% | 2/42 |

A rejeição melhorou, com perda de acertos de Amarelo e Espelho. A variante ficou abaixo das metas de Amarelo e continua em avaliação local. [Matrizes e procedência](../ml/evidence/isolated-nose-masked/cross-validation-clad.json) · [Metas](protocolo-aceite.md#metas-de-aceite)

```bash
node ml/extract.mjs --manifest data/clad-development/manifest.json \
  --preprocess holistic-shoulders-nose-v1 --out data/clad-development/features-nose
.venv/bin/python ml/cross_validate.py --device cuda \
  --features data/minds-expanded/features-nose-train/index.json \
  --reference ConvSequenceNoseMasked --candidate ConvSequenceNoseMasked \
  --candidate-negatives data/clad-development/features-nose/index.json \
  --out data/isolated-negative-audit/experimento/cv-nose-masked-negativos.json
```
