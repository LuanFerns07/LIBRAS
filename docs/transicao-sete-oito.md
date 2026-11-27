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
