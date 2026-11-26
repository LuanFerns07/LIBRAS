# De glosas a português escrito

O gerador textual alcançou **61,81% de WER** e **3,89% de frases exatas** em 1.800 pares reservados do VLibrasBD v2. Copiar as glosas obteve **62,26% de WER** e **1,39% de frases exatas**. Os pares têm glosas preparadas por intérpretes a partir de texto escrito. O ensaio avalia texto de entrada e de saída.

## Fonte e preparação

Foi usado apenas o CSV `pt_br2libras_gloss.csv` da Universidade Federal da Paraíba, DOI `10.17632/ryj88ckjww.2`, CC BY-SA 4.0. O arquivo tem 31.292.736 bytes e SHA-256 `de0f1ddf8368b7f343b07c00e5f122ac46193d1aea2c36b642e0805c5c73fcbf`. O leitor usa as colunas `libras-gloss` e `pt-br`. [Depósito e licença](https://data.mendeley.com/datasets/ryj88ckjww/2) · [Metadados do arquivo](https://data.mendeley.com/public-api/datasets/ryj88ckjww/files?folder_id=root&version=2)

Os autores coletaram frases de fontes de domínio geral e do governo federal. Intérpretes profissionais traduziram cada frase escrita para a notação de glosas do projeto, com revisão por amostragem por um intérprete mais experiente. Portanto a referência conserva a convenção escrita do VLibrasBD. O corpus não tem gravações, transcrições de sinalização espontânea, fronteiras por sinal ou identificadores de pessoas sinalizantes. [Artigo, seções 4.3 e 4.4](https://pmc.ncbi.nlm.nih.gov/articles/PMC12341731/#sec4) · [Notação de glosas](https://zenodo.org/records/15399589)

O protocolo `vlibrasbd-v2-gloss-pt-01` foi registrado antes da pontuação do teste. Os dois lados passam por normalização Unicode, caixa baixa e tokenização por palavras. Os três marcadores de pontuação das glosas são removidos. Para a partição, uma chave adicional ignora acentos e separa palavras ligadas por pontuação. Cada componente de frases iguais fica numa única partição. A igualdade pode ocorrer na mesma coluna, entre colunas ou através de outra linha fora do recorte. O código verifica a interseção das chaves entre as partições. [Código da partição](../ml/continuous_experiment/gloss_text/corpus.py)

Foram lidas 127.349 linhas, com 43.451 fora do intervalo de 1 a 12 palavras em ambos os lados e 786 pares repetidos no intervalo. Depois da deduplicação, a distribuição por componentes forneceu 66.442, 8.323 e 8.347 pares elegíveis, respectivamente. Uma ordem fixada por SHA-256 selecionou 14.000 para treino, 1.200 para validação e 1.800 para teste. A partição controla frases iguais pela chave definida. Paráfrases, moldes semelhantes e páginas de origem podem ocorrer em mais de uma partição.

## Treinamento e teste

O vocabulário foi ajustado apenas no treino, com até 2.800 palavras de saída e 5.000 palavras adicionais de entrada. O gerador de 64 dimensões usa codificador e decodificador GRU, atenção e cópia das palavras da entrada. A cópia preserva palavras raras observadas na frase mesmo quando estão fora do vocabulário de saída. A avaliação usa decodificação gulosa. As seis épocas levaram 26,4 segundos em um Intel Core i7-13650HX, com PyTorch 2.6.0, Python 3.13.5 e duas threads de CPU. A época 5 minimizou o WER de validação, com 62,38% ante 63,18% de copiar as glosas.

O teste foi executado após selecionar o modelo. O comando confere os hashes da partição e dos pesos registrados na validação e grava o resultado em um arquivo novo. O WER divide o total de inserções, omissões e trocas pelas 9.829 palavras de referência. Uma correspondência exata exige que toda a sequência de palavras normalizadas coincida com a referência.

| Método | Inserções | Omissões | Trocas | WER | Frases exatas |
| --- | ---: | ---: | ---: | ---: | ---: |
| Copiar glosas | 263 | 2.332 | 3.525 | 62,26% | 25 / 1.800 (1,39%) |
| Gerador com cópia | 490 | 1.756 | 3.829 | 61,81% | 70 / 1.800 (3,89%) |

O gerador reduziu o WER em 0,46 ponto percentual e elevou as correspondências exatas em 2,50 pontos. As omissões caíram, e as inserções e trocas aumentaram. O erro segue alto. A referência única contabiliza paráfrases divergentes como erros e a tokenização ignora a pontuação. Os resultados se limitam a frases curtas com glosas fornecidas pelo corpus. A avaliação de reconhecimento de glosas em vídeo e de tradução a partir da webcam continua pendente. [Triagem de dados multimodais com glosas](dados-glosas.md)

## Reprodução

Desde a raiz, com o ambiente Python do projeto ativo, use um diretório local novo sob `data/` para repetir o ensaio. A preparação baixa o CSV oficial quando necessário. Os comandos usam somente CPU.

```sh
python -m ml.continuous_experiment.gloss_text.corpus data/vlibrasbd-v2
python -m ml.continuous_experiment.gloss_text.run fit data/vlibrasbd-v2
python -m ml.continuous_experiment.gloss_text.run score data/vlibrasbd-v2
python -m unittest ml.continuous_experiment.gloss_text.test_gloss_text
```

A preparação produziu `split.json` com SHA-256 `556131fe63d105c0613a06431bacc9ce51acc1e9be80545361b7fa4c7ef8d3dc`. O arquivo `model.pt` medido tem SHA-256 `e771d65fafd761f3f9c5dba415eae93dc27ee2d1d31794fd26f24a384f1e83fa`. O CSV, o manifesto gerado e os pesos ficam sob `data/`, ignorado pelo Git. [Métricas de validação](../ml/evidence/vlibrasbd-v2/validation.json) · [Métricas do teste reservado](../ml/evidence/vlibrasbd-v2/test.json)
