# Transição de Sete para Oito aceita como Cinco

O combinado `a8e991d9`, com limiar 0,525, aceitou como Cinco a transição entre Sete e Oito da Fiocruz. A área livre reproduziu esse erro no Chromium. A sonda abaixo procurou evidência de que a posição ou a direção do movimento da mão poderia separar o erro de um Cinco correto. Os modelos, os recortes reservados da Fiocruz e os pontos MINDS de teste ficaram congelados durante esta rodada. [Evidência original da área livre](../ml/fresh_eval/evidence-negatives/browser.json)

## Sonda de desenvolvimento

O plano `cad4ea2` fixou três transições da aula **Números**, da UFSM, e nove combinações de início e duração para cada transição. As janelas têm de 900 a 2.100 ms e se sobrepõem. São 27 janelas de três movimentos de uma pessoa na mesma gravação. O positivo Cinco da mesma aula, em outro intervalo, já tinha rastreamento insuficiente no protocolo exploratório. Usamos seis pessoas do MINDS no treino, duas na validação e os nove clipes de uma pessoa do CLAD de desenvolvimento como controles de atividade cotidiana. [Grade de janelas](../ml/fresh_eval/transition-geometry-development.json) · [Aula da UFSM e créditos](../ml/fresh_eval/protocol.json) · [Clipes CLAD de desenvolvimento](../ml/external_eval/clad-development.json)

Na sequência normalizada de 24 quadros, a sonda usa a mão com mais quadros rastreados e mede a posição mediana do pulso em relação ao centro dos ombros na metade central, a amplitude vertical entre os percentis 10 e 90 e a diferença vertical entre o primeiro e o último quarto. A anisotropia mede quanto o movimento se concentra em uma direção. Calculamos `1 − 2 × menor autovalor / traço` da matriz dos produtos dos deslocamentos consecutivos em x e y. O resultado é perto de 1 para movimento em uma direção e perto de 0 para energia equilibrada nas duas direções. Também medimos a fração horizontal dessa energia. As pontas dos dedos indicador e médio são medidas em relação ao pulso e divididas pelo tamanho da palma. A sonda usa apenas pares vizinhos rastreados e deixa a medida direcional ausente com menos de quatro deslocamentos ou amplitude RMS abaixo de 0,01 na unidade normalizada. [Implementação](../ml/probe_transition_geometry.py)

| Recortes de desenvolvimento | Rastreamento utilizável | Aceites como Cinco | Maior probabilidade de Cinco |
| --- | ---: | ---: | ---: |
| UFSM, Seis → Sete | 7/9 | 0 | 0,00024513 |
| UFSM, Sete → Oito | 8/9 | 0 | 0,00001084 |
| UFSM, Oito → Nove | 8/9 | 0 | 0,00000104 |
| CLAD, atividades cotidianas | 9/9 | 0 | 0,29827 |

Houve três falsos aceites nas janelas da UFSM, um como Amarelo em Seis → Sete e dois como Espelho em Sete → Oito e Oito → Nove. O pulso da UFSM apareceu entre 1,85 e 5,67 larguras de ombros acima do centro dos ombros. Nos Cinco aceitos do MINDS treino, a mediana do pulso variou de 0,23 largura acima a 0,44 abaixo. O enquadramento fechado da UFSM e a distância aparente entre os ombros limitam a interpretação dessa separação. As faixas de anisotropia se sobrepuseram entre a UFSM e os exemplos de Cinco na validação. [Resultados por janela, modelo e hashes](../ml/evidence/isolated-combined/transition-geometry-development.json)

Cada filtro foi limitado à faixa observada nos 18 Cinco corretos do MINDS treino. Um filtro só avançaria se preservasse os seis Cinco corretos da validação e vetasse pelo menos um falso Cinco em transições de desenvolvimento. O filtro de posição vetaria 6/6 positivos da validação, o de direção do pulso 1/6 e o de direção das pontas dos dedos 1/6. A amostra de desenvolvimento não reproduziu o falso aceite que motivou o ensaio e nenhum filtro atingiu o critério. O caso Fiocruz e a partição de teste MINDS ficaram fora da sonda. [Resultados dos filtros](../ml/evidence/isolated-combined/transition-geometry-development.json)

## Aquisição de negativos de validação

1. Coletar Sete → Oito de pessoas e sessões licenciadas novas, ou gravadas com consentimento específico. Para cada pessoa, registrar também Cinco isolado e controles de Oito → Sete, Seis → Sete e Oito → Nove em enquadramento comparável. Incluir sequência natural e sequência com pausa, com mãos e ombros visíveis e posição de câmera anotada. Anotar o intervalo de mudança e conferir os numerais com pessoa fluente em Libras antes de rodar o classificador.
2. Fixar os grupos por pessoa antes de consultar qualquer predição. Manter recortes sobrepostos da mesma gravação, repetições da sessão e controles da pessoa dentro do mesmo grupo. Separar pessoas de desenvolvimento e validação, com mais de uma pessoa por grupo para permitir comparação entre apresentações. Documentar a distribuição por pessoa, sessão e fonte.
3. Usar o [contrato de proveniência existente](../ml/fresh_eval/protocol-negatives.json) como base. Registrar origem e condições de uso ou identificador de consentimento local, SHA-256, pessoa codificada, sessão, grupo, rótulo, início, duração, posição temporal da mudança e condições de captura. Usar `null` como rótulo dos negativos, com os numerais esperados anotados separadamente. Manter vídeo, pontos e dados de consentimento em `data/`, fora do histórico.
4. Rodar o combinado congelado em todas as tomadas aceitas na triagem. Reportar contagens totais, utilizáveis, falsos Cinco e Cinco corretos por pessoa. Usar os falsos Cinco de desenvolvimento para explorar a regra e os positivos do mesmo contexto para medir perdas. Fixar descritores, limiares e tratamento de medidas ausentes antes de abrir a validação com novas pessoas. Uma regra que preserve os positivos e reduza os falsos Cinco na validação pode seguir para uma comparação final no caso Fiocruz existente, nos controles CLAD e no MINDS reservado.

## Reprodução

O preparo verifica o SHA-256 já registrado de `data/fresh-sign/source/ufsm-numeros-480.mp4` e usa FFmpeg para recortar o vídeo e remover o áudio. A inferência usa Chromium 156.0.8078.79 para a extração Holistic e ONNX Runtime em CPU para o classificador. Os modelos e pontos locais já preparados estão descritos na documentação de avaliação. [Avaliação e dependências](avaliacao.md) · [Licença CC BY-NC-SA 4.0 da UFSM](https://creativecommons.org/licenses/by-nc-sa/4.0/)

```bash
out=data/transition-gate-m5/geometry-development
PYTHONPATH=ml .venv/bin/python -m ml.probe_transition_geometry prepare
node ml/extract.mjs --manifest "$out/manifest.json" --out "$out/features" --workers 1
PYTHONPATH=ml .venv/bin/python -m ml.probe_transition_geometry compare
```

O relatório local fica em `$out/probe.json`.

## Duas novas gravações com Cinco no mesmo enquadramento

A UFSM publicou duas gravações de **Números Cardinais** com pessoas diferentes da aula **Números** usada na sonda e da turma da Fiocruz. Em cada gravação, a mesma pessoa mantém cabeça, ombros e mão visíveis durante Cinco, a transição de Sete para Oito e as duas transições vizinhas. Os rótulos foram conferidos pela legenda da própria aula e pela mudança da mão quadro a quadro. O commit `cebe89f` fixou os 12 intervalos e os hashes dos vídeos e do combinado antes da inferência. Cada vídeo contribui com um Cinco, três janelas sobrepostas de Sete → Oito e um recorte de cada transição vizinha. As seis janelas de Sete → Oito correspondem a dois movimentos. [Caderno Didático Libras D, roteiro e apresentação de Giovana Fracari Hautrive](https://ntetube.nte.ufsm.br/v/1543950577) · [Grupo de Produção de Material Didático em Língua de Sinais](https://ntetube.nte.ufsm.br/v/1536688636) · [Seleção de desenvolvimento, créditos e hashes](../ml/fresh_eval/protocol-numerais-desenvolvimento.json)

| Gravação | Cinco isolado | Sete → Oito aceitas como Cinco | Transições de controle |
| --- | --- | ---: | --- |
| Caderno Didático Libras D | Inconclusivo, confiança máxima 0,479 | 0/3 | Seis → Sete e Oito → Nove rejeitadas |
| Grupo de Produção de Material Didático | Cinco, 0,970 | 0/3 | Seis → Sete rejeitada e Oito → Nove aceita como Cinco, 0,682 |

As 12 janelas tiveram rastreamento utilizável. Na segunda gravação, o falso Cinco em Oito → Nove e o Cinco correto da mesma pessoa formam um par com enquadramento comparável para desenvolvimento de uma regra. O falso aceite em Sete → Oito segue reproduzido apenas no caso existente da Fiocruz, que ficou fora desta rodada. O modelo e seu limiar de 0,525 permaneceram congelados. [Relatório ONNX em CPU](../ml/fresh_eval/evidence-numerais-desenvolvimento/report-combined.json) · [Manifesto executado](../ml/fresh_eval/evidence-numerais-desenvolvimento/manifest.json)

As duas aulas usam CC BY-NC-SA 4.0. A preparação limita a modificação ao recorte temporal e à remoção do áudio. Vídeos e pontos ficam em `data/` para uso local não comercial. O avaliador didático usa o campo técnico `partition: test` para ler os recortes externos. O campo `scope` do protocolo registra o uso exclusivo em desenvolvimento. [Licença CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)

```bash
out=data/transition-gate-m5/numerais-independentes
protocol=ml/fresh_eval/protocol-numerais-desenvolvimento.json
.venv/bin/python -m ml.fresh_eval.prepare --protocol "$protocol" --out "$out"
node ml/extract.mjs --manifest "$out/manifest.json" --out "$out/features" --workers 1
PYTHONPATH=ml .venv/bin/python -m ml.fresh_eval.evaluate --protocol "$protocol" \
  --manifest "$out/manifest.json" --features "$out/features/index.json" --out "$out/report.json"
```

## Comparação de vetos no par Oito → Nove e Cinco

A comparação reaplicou os vetos históricos de confiança, concordância entre modelos e quadros estáticos, além das faixas geométricas da primeira sonda. Foram acrescentadas duas regras calibradas nos 18 Cinco corretos do MINDS treino, a confirmação em subtrechos e a mudança de forma da mão. O critério do ensaio foi rejeitar o falso Cinco de Oito → Nove, manter o Cinco isolado da mesma gravação e os seis Cinco corretos do MINDS validação, conservar os 18 Cinco da calibração e manter as seis janelas de Sete → Oito rejeitadas. Os recortes Fiocruz e os pontos reservados do MINDS ficaram fora. [Regras, contagens e decisões](../ml/fresh_eval/evidence-numerais-desenvolvimento/veto-development.json)

| Regra para uma janela que o modelo aceitou como Cinco | Cinco perdidos no MINDS treino / validação | Cinco pareado preservado | Falso Cinco de Oito → Nove vetado |
| --- | ---: | --- | --- |
| Confiança do combinado ≥ 0,692, mínimo histórico em treino e validação | 0/18 · 0/6 | Sim | Sim |
| Concordância entre modelos ≥ 0,544, mínimo histórico em treino e validação | 0/18 · 0/6 | Sim | Não |
| Mediana da confiança em três quadros estáticos ≥ 0,661, mínimo histórico em treino e validação | 0/18 · 0/6 | Sim | Sim |
| Mediana da probabilidade de Cinco em três subtrechos ≥ 0,667402, mínimo em treino | 0/18 · 0/6 | Sim | Sim |
| Mudança de forma da mão ≤ 0,563732, máximo em treino | 0/18 · 0/6 | Sim | Não |
| Faixa de posições do pulso do treino | 0/18 · 6/6 | Não | Sim |
| Faixa de movimento do pulso do treino | 0/18 · 1/6 | Sim | Não |
| Faixa de movimento das pontas dos dedos do treino | 0/18 · 1/6 | Sim | Sim |

Para a confirmação em subtrechos, o combinado recebe três janelas de 12 quadros a partir dos índices 0, 6 e 12 da sequência normalizada de 24 quadros. Cada quadro é duplicado e mantém a sua máscara de rastreamento. A mediana da probabilidade de Cinco foi 0,973 no positivo pareado e 0,398 no falso. A medida da forma da mão usa distâncias tridimensionais entre o pulso e as pontas dos cinco dedos, divididas pela distância entre o pulso e a base do dedo médio. O percentil 90 do desvio absoluto médio em relação ao próprio clipe foi 0,064 no Cinco isolado e 0,142 em Oito → Nove, ambos abaixo do limite de treino. [Implementação da comparação](../ml/evaluate_paired_numerals.py)

O limiar dos subtrechos deriva só do MINDS treino e a regra usa apenas o modelo combinado. A única observação de um falso Cinco com controle positivo pareado ainda vem de uma pessoa. O protocolo fixa a regra para um segundo par de desenvolvimento de outra pessoa e sessão. Os rótulos e recortes precisam estar definidos antes de rodar o modelo congelado. O segundo par é informativo se o modelo acertar o Cinco isolado e aceitar a transição como Cinco no mesmo enquadramento. A regra precisa manter todos os Cinco corretos e vetar pelo menos um falso Cinco desse novo grupo. [Regra e critério congelados](../ml/fresh_eval/evidence-numerais-desenvolvimento/partial-confirmation-protocol.json)

Com os pontos das duas aulas extraídos, este comando grava `$out/veto-development.json` em CPU.

```bash
PYTHONPATH=ml .venv/bin/python -m ml.evaluate_paired_numerals
```

## Segundo par independente na aula da Cecierj

A aula **Datilologia: alfabeto manual e números**, da UFF e da Fundação Cecierj, deu um segundo par com a mesma pessoa e o mesmo enquadramento dentro da aula. Uma intérprete diferente das duas novas aulas UFSM apresenta sequências de cardinais, quantitativos e ordinais. O Canal Cecierj fornece o MP4 e a publicação equivalente da própria Fundação no YouTube declara Creative Commons Atribuição. O roteiro é de Mariana da Cunha Teixeira de Souza. Os créditos finais registram atuação de Vanessa Rodrigues Ildefonso e Cíntia Ingrid Macedo Ribeiro e filmagem e edição de Leandro Lima de Souza. [Aula e download oficial](https://canal.cecierj.edu.br/recurso/13757) · [Publicação com a licença declarada](https://www.youtube.com/watch?v=cT3l6iP7NXY) · [Licença de atribuição no YouTube](https://support.google.com/youtube/answer/2797468?hl=pt-BR)

O commit `849b360` fixou, antes da inferência, as duas janelas de Cinco isolado e 36 janelas de transição. Cada uma das três sequências fornece janelas de 600, 1.000 e 1.500 ms em torno de quatro transições, de Seis → Sete a Nove → Dez. A numeração na tela e a trajetória da mão orientaram a marcação quadro a quadro. As três durações se sobrepõem para cada movimento. O FFmpeg recortou o arquivo e removeu o áudio. Vídeo e pontos ficaram em `data/`. [Protocolo de seleção e crédito](../ml/fresh_eval/protocol-numerais-segundo-par.json) · [Manifesto executado](../ml/fresh_eval/evidence-numerais-segundo-par/manifest.json)

| Sequência e transição | Janelas utilizáveis | Aceitas como Cinco no combinado | Vetadas com o limiar congelado |
| --- | ---: | ---: | ---: |
| Cardinais, Sete → Oito | 3/3 | 3 | 0 |
| Quantitativos, Sete → Oito | 3/3 | 3 | 0 |
| Quantitativos, Oito → Nove | 3/3 | 3 | 0 |
| Demais transições cardinais, quantitativas e ordinais | 27/27 | 0 | 0 |

O combinado aceitou o Cinco cardinal com confiança 0,972 e o Cinco de quantidade com 0,955. A confirmação em subtrechos, congelada em 0,667402, preservou os dois acertos e vetou zero dos nove falsos aceites. Os nove recortes correspondem a três movimentos de uma única intérprete. O Sete → Oito cardinal manteve confirmação de 0,920 a 0,948 nos subtrechos. Há um segundo par independente e a regra falhou no critério fixado. A Fiocruz e o teste reservado do MINDS ficaram fora desta rodada. [Relatório por janela, modelo e resultado](../ml/fresh_eval/evidence-numerais-segundo-par/report.json) · [Critério e limiar congelados](../ml/fresh_eval/evidence-numerais-desenvolvimento/partial-confirmation-protocol.json)

```bash
out=data/transition-gate-m5/numerais-segundo-par
protocol=ml/fresh_eval/protocol-numerais-segundo-par.json
.venv/bin/python -m ml.fresh_eval.prepare --protocol "$protocol" --out "$out"
node ml/extract.mjs --manifest "$out/manifest.json" --out "$out/features" --workers 1
PYTHONPATH=ml .venv/bin/python -m ml.evaluate_frozen_numeric_confirmation
```

O relatório local fica em `$out/frozen-veto-report.json`.

## Ajuste com outras sessões de transições

Um ajuste linear em CPU usou quatro gravações de quatro pessoas da UFSM e da Cecierj. O protocolo `9adfa57` fixou os índices e a estratégia antes de ajustar os coeficientes. Cada rodada deixou de fora todas as janelas de uma mesma pessoa e gravação, inclusive o Cinco isolado e todas as janelas sobrepostas da mesma transição. O MINDS treino forneceu 18 Cinco para o ajuste. Os seis Cinco do MINDS validação serviram de controle em todas as rodadas. A Fiocruz e o MINDS teste ficaram fora. [Plano congelado e hashes](../ml/fresh_eval/protocol-numerais-ajuste.json)

Das 77 janelas didáticas, 73 tiveram rastreamento utilizável. Havia quatro exemplos isolados de Cinco e 73 janelas de 21 transições didáticas. O combinado acertou três dos quatro Cinco. Os 10 falsos aceites vieram de quatro transições de duas pessoas. Quando a Cecierj ficou de fora, restou só uma transição difícil para o ajuste. Quando o Grupo UFSM ficou de fora, restaram três, todas da mesma pessoa da Cecierj. As demais transições ajudaram a testar sensibilidade ao conjunto de negativos.

O ajuste comparou a forma da mão e a forma acrescida de deslocamento. A forma usa a mediana e a faixa entre os percentis 10 e 90 das 15 distâncias par a par entre seis pontos, o pulso e as cinco pontas dos dedos. As distâncias são divididas pelo tamanho da palma. A segunda opção acrescenta a mudança das distâncias no começo e fim da janela, o deslocamento vertical do pulso e a energia direcional do pulso e das pontas dos dedos. Cada opção foi treinada com todas as transições utilizáveis ou apenas as já aceitas como Cinco. A regressão linear penalizada usa pesos equilibrados por classe, pessoa e movimento. O limiar de cada rodada é a menor pontuação de um Cinco do ajuste. O veto só atua quando o combinado aceita Cinco e há geometria suficiente. [Implementação](../ml/evaluate_numeric_transition_fit.py)

| Descritores e negativos usados no ajuste | Falsos Cinco vetados nas sessões excluídas | Cinco didáticos corretos preservados | Cinco MINDS de validação preservados por rodada |
| --- | ---: | ---: | --- |
| Forma, todas as transições | 10/10 janelas, 4/4 movimentos | 3/3 | 6/6, 6/6, 5/6, 6/6 |
| Forma e movimento, todas as transições | 10/10 janelas, 4/4 movimentos | 3/3 | 6/6, 6/6, 6/6, 5/6 |
| Forma, apenas falsos Cinco | 10/10 janelas, 4/4 movimentos | 3/3 | 3/6, 3/6, 3/6, 3/6 |
| Forma e movimento, apenas falsos Cinco | 10/10 janelas, 4/4 movimentos | 2/3 | 5/6, 3/6, 3/6, 3/6 |

A ordem das rodadas na tabela é Cecierj, Grupo UFSM, Caderno Libras D e Libras ON. Nos dois grupos com falsos aceites, os ajustes com todas as transições preservaram os Cinco pareados e os seis Cinco do MINDS validação. Em rodadas com outros grupos excluídos, cada ajuste ainda perdeu um Cinco do MINDS. A perda no teste de forma foi de 0,148 abaixo do limiar. A de forma e movimento foi de 0,027. O critério exigia preservar todos os acertos nas quatro rodadas e vetar todas as janelas de ao menos uma transição com falso Cinco por pessoa. Nenhum ajuste o atingiu. [Resultados por rodada e hash do relatório completo](../ml/fresh_eval/evidence-numerais-ajuste/summary.json)

```bash
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 PYTHONPATH=ml .venv/bin/python -m ml.evaluate_numeric_transition_fit
```

Os relatórios ficam em `data/transition-gate-m5/numeric-transition-fit.json` e `data/transition-gate-m5/numeric-transition-fit-summary.json`.

### Conjunção pós-hoc

A conjunção surgiu depois da comparação anterior, pois forma e forma com movimento perderam um Cinco em rodadas diferentes. Reaplicamos as decisões dos dois vetos treinados com todas as transições, com os pesos e limiares originais de cada rodada. Uma janela só é vetada quando o combinado aceita Cinco e os dois escores ficam abaixo dos respectivos limiares. [Decisões por rodada, com o SHA-256 do relatório original](../ml/fresh_eval/evidence-numerais-ajuste/conjunction.json)

| Pessoa e gravação excluídas do ajuste | Falsos Cinco vetados | Cinco didáticos preservados | Cinco corretos do MINDS validação preservados |
| --- | ---: | ---: | ---: |
| Cecierj | 9/9, três movimentos | 2/2 | 6/6 |
| Grupo UFSM | 1/1, um movimento | 1/1 | 6/6 |
| Caderno Libras D | 0, sem falsos Cinco | 0, sem Cinco correto no combinado | 6/6 |
| Libras ON | 0, sem falsos Cinco | 0, sem positivo isolado avaliado | 6/6 |

Para a primeira confirmação independente, ajustamos os mesmos dois vetos uma vez em todo o desenvolvimento, com 22 janelas de Cinco e 69 janelas utilizáveis de transições. Os seis Cinco do MINDS validação ficaram fora do ajuste e os seis permaneceram aceitos. A execução também manteve os três Cinco didáticos já corretos. Os limiares fixados foram 0,166268 para forma e 0,388047 para forma com movimento. O próximo ensaio deve fixar os recortes de uma pessoa e sessão novas antes da inferência, preservar todos os Cinco que o combinado acertar e vetar todas as janelas de pelo menos um movimento que o combinado confundir com Cinco. A Fiocruz e o MINDS teste ficaram fora. [Pesos, limiares e critério congelados](../ml/fresh_eval/evidence-numerais-ajuste/conjunction-frozen.json)

```bash
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 PYTHONPATH=ml .venv/bin/python -m ml.freeze_numeric_veto_pair
```
