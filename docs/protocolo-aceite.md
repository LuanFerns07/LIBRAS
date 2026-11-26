# Protocolo de aceite do reconhecimento

Fixado em 26 de novembro de 2026, antes da avaliação final. O alvo é um primeiro vocabulário de sinais isolados, composto por Cinco, Espelho e Amarelo. A aplicação delimita cada tentativa por início e fim. A validação pedagógica e o reconhecimento são avaliados em etapas independentes.

## Partições e unidades de análise

- Cada clipe, seus quadros, recortes e transformações têm unicamente a partição da pessoa sinalizante. O manifesto registra identificador da fonte, pessoa, classe, partição e SHA-256 do clipe. Derivações repetidas não contam como observações independentes.
- Separe treino, validação e teste antes de medir resultados. Use pelo menos duas pessoas de validação e duas de teste no MINDS-Libras para o experimento exploratório. Nomes ou aliases diferentes na mesma fonte devem ser reconciliados antes da divisão.
- Para medir rejeição, inclua sinais fora do catálogo e informe seu conjunto de origens. Para a câmera, acrescente tentativas de repouso, gestos comuns, ausência de mão, perda de enquadramento e oclusão. Reporte as contagens e taxas de cada estrato.
- Escolha arquitetura, modelo e limiares usando treino e validação. Avalie a versão escolhida uma vez no teste reservado. Qualquer ajuste informado pelo teste exige novo conjunto final independente.

## Metas de aceite

| Métrica | Meta da versão de demonstração |
| --- | --- |
| F1 macro dos sinais suportados | ≥ 0,75 |
| Revocação de cada sinal suportado | ≥ 0,65 |
| Precisão de cada sinal suportado | ≥ 0,75 |
| Cobertura nos sinais suportados | ≥ 0,75 |
| Falsas aceitações de negativos | ≤ 0,10 |
| Latência entre o fim da tentativa e a decisão no PC, com avatar aberto e modelos carregados | mediana ≤ 250 ms e p95 ≤ 600 ms |

Conte uma rejeição ou decisão inconclusiva no denominador de revocação do respectivo sinal. Relate precisão, revocação, F1, suporte e matriz de confusão, incluindo coluna de rejeição. Apresente uma linha separada para a avaliação com webcam em pessoas fora do treino e indique a resolução e intervalo de captura, navegador, processador, GPU e modelos. Meça também separadamente o tempo de extração por quadro e o carregamento inicial. Resultados com poucas pessoas indicam viabilidade exploratória e precisam de replicação para estimar generalização.

## Aceite do feedback da lição

Uma pessoa fluente em Libras, preferencialmente surda, compara a dica com a execução e a referência de cada sinal. Apresente execuções esperadas, ajustes intencionais, mãos dominantes e variantes pertinentes. Repita sob mais de uma condição de iluminação e enquadramento. Uma dica passa quando aponta um parâmetro observável de forma coerente e quando tentativas de baixa evidência geram nova tentativa em vez de correção. Registre erros de orientação e casos inconclusivos por sinal, com as datas e as versões do player, modelo e pré-processamento.

Um piloto de aprendizagem pode comparar a tentativa inicial e a seguinte após a dica. Registre a avaliação humana, o tamanho da amostra, as condições e potenciais efeitos de repetição.
