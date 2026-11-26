# Comparação textual em componentes inéditos do VLibrasBD

O protocolo `vlibrasbd-v2-heldout-components-01` compara a cópia das glosas, o gerador congelado do primeiro ensaio e um tradutor monotônico treinado nos mesmos 14.000 pares. A entrada é uma sequência de glosas escrita por intérpretes. A avaliação mede a saída textual em português, sem captura em vídeo. [Fonte e primeiro ensaio](glosas-texto.md)

A partição exclui todo componente de frases normalizadas que inclua qualquer linha de treino, validação ou teste do ensaio anterior. Uma frase pode aparecer do lado de entrada, do lado de saída ou ligar duas linhas indiretamente. O protocolo divide os componentes restantes por SHA-256 para selecionar 1.200 pares de validação e 1.800 pares de teste. Conserva o limite de 12 palavras dos dois lados. A verificação reconstrói a partição a partir do CSV oficial e do manifesto anterior antes de cada medição. Paráfrases e padrões de frases semelhantes ainda podem cruzar partições.

O tradutor alinha cada par de treino com custo de edição, aprende saídas para sequências de uma a três glosas e estima um modelo de trigramas do português. Também usa as glosas vizinhas como contexto e pode copiar termos fora das correspondências aprendidas. A validação escolhe uma entre seis configurações predefinidas pelo menor WER, depois pela maior taxa de correspondência exata. O teste compara os três métodos com a mesma referência e os mesmos denominadores. Os pesos do gerador anterior são verificados pelo SHA-256 e utilizados com a decodificação original.

## Reprodução

Execute na raiz com as dependências do ambiente Python instaladas e com o CSV, o manifesto anterior e o checkpoint em `data/vlibrasbd-v2`. Use outro diretório novo para o ensaio. O código configura duas threads para PyTorch.

```bash
.venv/bin/python -m ml.continuous_experiment.gloss_text.benchmark prepare data/vlibrasbd-v2 data/vlibrasbd-holdout
.venv/bin/python -m ml.continuous_experiment.gloss_text.benchmark validate data/vlibrasbd-v2 data/vlibrasbd-holdout
.venv/bin/python -m ml.continuous_experiment.gloss_text.benchmark score data/vlibrasbd-v2 data/vlibrasbd-holdout
.venv/bin/python -m unittest ml.continuous_experiment.gloss_text.test_benchmark
```

## Partição e seleção registradas

O manifesto `split.json` tem SHA-256 `5bbbe1d19ecaf4207e285eb328f9fd775d4b830f9638548e3cdc454188830cbd`. As 17.000 linhas usadas no ensaio anterior correspondem a 16.183 componentes excluídos. Após o filtro de comprimento e a deduplicação, 30.563 pares ficaram elegíveis para validação e 30.063 para teste.

A validação selecionou os pesos 0,16 para o modelo de língua, 0,45 para o comprimento e 3 para a cópia. Em 1.200 pares, o método selecionado teve WER de 51,76% e 88 frases exatas. Copiar as glosas teve WER de 62,41% e 23 frases exatas. O SHA-256 de `validation.json` é `1d642aa20a6427cc93b16ce154f674e994cfe4efd76be9d86aa82077a40a40ee`. O manifesto e a seleção foram registrados antes de abrir o teste.

## Resultado no teste

Os três métodos foram medidos nos mesmos 1.800 pares. O denominador do WER foi de 10.394 palavras de referência. Uma correspondência exata exige igualdade em toda a sequência normalizada.

| Método | Inserções | Omissões | Trocas | WER | Frases exatas |
| --- | ---: | ---: | ---: | ---: | ---: |
| Copiar as glosas | 300 | 2.518 | 3.660 | 62,32% | 28 de 1.800 (1,56%) |
| Gerador congelado | 499 | 1.989 | 3.912 | 61,57% | 66 de 1.800 (3,67%) |
| Tradutor monotônico | 283 | 2.551 | 2.432 | 50,66% | 134 de 1.800 (7,44%) |

O tradutor monotônico reduziu o WER em 10,91 pontos percentuais frente ao gerador congelado. Houve 1.480 trocas a menos e 562 omissões a mais. O erro residual de 50,66% limita a fidelidade da saída. Cada frase tem uma única referência e a tokenização ignora pontuação. Os resultados se aplicam a frases curtas e glosas prontas do VLibrasBD. A avaliação integrada com reconhecimento em vídeo continua pendente.

O arquivo agregado local `data/vlibrasbd-holdout/test.json` tem SHA-256 `44db482e77fedad12f64faf165b50d1bdf46e61426bf4a2af06a566506c2810f`. Os dados, o manifesto e os pesos permanecem fora do Git.
