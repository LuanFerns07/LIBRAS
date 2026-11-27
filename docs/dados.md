# Dados de reconhecimento

## Fontes e condições de uso

| Fonte | Conteúdo | Condições e decisão |
| --- | --- | --- |
| [MINDS-Libras RGB v1](https://zenodo.org/records/2667329) | 20 glosas, 12 pessoas sinalizantes, tomadas repetidas em vídeo RGB com fundo chroma key. O nome do arquivo contém glosa, ID sinalizante e repetição. O registro enumera gravações ausentes e extras. | Os metadados do depósito declaram CC BY 4.0. A licença permite adaptação e compartilhamento com atribuição, referência à licença e indicação de alterações. O projeto treina com pontos reextraídos dos vídeos Canon. A demonstração local usa apenas pesos e metadados. [Metadados do depósito](https://zenodo.org/api/records/2667329) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| [MINDS-Libras MediaPipe, revisão bfe5a6b](https://huggingface.co/datasets/danielelvs/minds_mediapipe/tree/bfe5a6b85cdbef135e28fad045f02963e5416c81) | CSV com 3.459.662.367 bytes, SHA-256 `cf93b3b22ac29fbb4ddbeeabc5de0290de1d1245efcb5bc62ab7aa848854ebfd`. A faixa inicial de 128 KiB confirmou 1.635 colunas, incluindo `category`, `video_name`, `frame`, `person`, 543 pontos XYZ e dois indicadores de ausência. Mão 0 é esquerda e mão 1 é direita conforme o código de extração associado. | O depósito isolado carece de licença explícita. O [conjunto harmonizado](https://huggingface.co/datasets/danielelvs/multilingual-islr-mediapipe) do mantenedor é MIT com ressalvas sobre termos das fontes. O código associado usa `mp.solutions.holistic.Holistic`, a implementação anterior à tarefa web. A inspeção não estabelece equivalência na extração. Foram escolhidos os RGB originais e o extrator efetivo da aplicação. [Código associado](https://github.com/danielelvs/islr-subset/blob/main/src/extraction/mediapipe_extractor.py) |
| [LIBRAS-EQT-UECE v4](https://zenodo.org/records/21398895) | Sinais isolados e sequências contínuas. `Landmarks.zip` tem 773.596.409 bytes e MD5 `415a18d9be6d65468bcf92db5e940df8`. O índice do ZIP lido por faixa HTTP contém 5.347 arquivos NPY de mãos e 5.335 de pontos gerais, organizados por glosa e informante. Um arquivo de mãos usa `float32[119,126]`. O valor 126 corresponde a 42 triplas. O README cita formatos CSV/JSON, enquanto o índice da v4 contém NPY. | O arquivo de licença declara CC BY-NC 4.0. Treino, demonstração e compartilhamento não comercial podem se apoiar nos termos da licença com atribuição e indicação de alterações. Antes de misturar pessoas ou transmitir resultados, é preciso verificar o mapeamento dos IDs e o extrator, cuja equivalência permanece pendente. As glosas Cinco, Espelho e Amarelo não apareceram por esses nomes no índice. [Licença do depósito](https://zenodo.org/records/21398895/files/LICENSE.txt?download=1) · [README dos autores](https://zenodo.org/records/21398895/files/README.md?download=1) |

A licença do dataset cobre os direitos licenciados pelo depositante. A exibição pública de gravações identificáveis precisa considerar os direitos de personalidade que se aplicam à gravação. O aplicativo guarda somente o progresso e o treino mantém vídeos e coordenadas fora do histórico.

## Seleção e partições

O recorte inicial usa **Cinco** (10), **Espelho** (12) e **Amarelo** (03). Cinco tem um parâmetro manual observável, enquanto Espelho e Amarelo introduzem movimento e posições próximas do rosto. A origem dos rótulos é a glosa no arquivo Canon, confrontada com a lista dos autores. As variantes linguísticas e a adequação pedagógica das demonstrações dependem de revisão em Libras. [Tabela de glosas do MINDS-Libras](https://zenodo.org/records/2667329) · [Tese e fichas articulatórias](https://repositorio.ufmg.br/server/api/core/bitstreams/4307a8e9-f22e-4374-a900-0f42d88974a8/content)

A partição é predeterminada por pessoa do MINDS-Libras. Treino usa 01–07, validação usa 08 e 10, e teste reserva 09, 11 e 12. Repetições e quadros da mesma pessoa seguem sempre essa partição. O conteúdo é conferido pelo CRC e tamanho do ZIP e depois vinculado ao SHA-256 do arquivo. A extração e a avaliação rejeitam duplicatas exatas de vídeos e vetores. O registro oficial documenta a ausência de Cinco em 03 e de Amarelo em 09. O manifesto do recorte descreve as amostras efetivamente adquiridas.

O [manifesto MINDS v1](../ml/manifests/minds-v1.json) fixa o recorte adquirido em 26/11/2026. Seu SHA-256 é `467ebc1ee584b8e6587f2507d9d4e648266148beb48ee12d8b9630bf1c8ea5b4`. Os 174 clipes de 12 pessoas têm hashes de conteúdo distintos.

| Partição | Pessoas | Cinco | Espelho | Amarelo | Fora do catálogo | Total |
| --- | --- | --- | --- | --- | --- | --- |
| Treino | 01–07 | 18 | 21 | 21 | 42 | 102 |
| Validação | 08, 10 | 6 | 6 | 6 | 12 | 30 |
| Teste reservado | 09, 11, 12 | 9 | 9 | 6 | 18 | 42 |

A classe de rejeição é formada por outras glosas disponíveis no MINDS-Libras. Clipes fora do catálogo na validação e no teste podem representar glosas do mesmo repertório de negativos do treino, com pessoas distintas. Para estimar generalização a gestos comuns e sinais inéditos, ainda são necessárias amostras de repouso, sinais fora do vocabulário, oclusão, bordas do enquadramento e movimentos cotidianos em webcam.

O [manifesto expandido](../ml/manifests/minds-expanded-v1.json) mantém os 174 clipes anteriores e acrescenta 33 execuções de ALUNO (glosa 02). São 18 de treino, 6 de validação e 9 de teste, com os mesmos grupos de pessoas. O SHA-256 do manifesto de 207 clipes é `3e3e171602f17138ad2ba251a34f2d13a2f545ddd525ed650b945fb40ecc70be`.

## Contrato e revisão técnica de M1

O catálogo inicial vincula Cinco, Espelho e Amarelo aos IDs `signal-cinco`, `signal-espelho` e `signal-amarelo`. Cada item tem nome, texto, referência, versão, situação da revisão e o parâmetro da dica. O player recebe uma sequência de itens com esses IDs e resolve os clipes pelo mesmo identificador. Um ID desconhecido é rejeitado pelo player. [Catálogo compartilhado](../src/catalog.js) · [Player](../src/avatar/playback.js) · [Referências de animação](animacoes.md#sinais-da-lição)

Na prévia local `dfb045b`, o manifesto do combinado declara o esquema `holistic-shoulders-v1`. O tensor `landmarks` tem formato `float32[1, 24, 192]`. Cada quadro contém ombros, cotovelos e pulsos do corpo, seguidos pelos 21 pontos da mão esquerda e pelos 21 da direita. Cada ponto tem XYZ e uma máscara de presença. X e Y usam o centro dos ombros como origem, a largura entre os ombros como escala e a proporção da imagem no eixo X. A profundidade das mãos usa a referência dos pulsos. Durante a captura, a amostragem é de 100 ms e a tentativa é reamostrada para 24 quadros. [Pré-processamento](../src/recognition/preprocess.js)

O modelo retorna `logits` na ordem de rótulos do manifesto, com a classe fora do catálogo na primeira posição. A aplicação calcula a confiança e usa o limiar do pacote. A prática guiada compara a classe aceita com o alvo e avalia separadamente a palma ou a trajetória para apresentar a dica. A falha de captura tem estado próprio. [Decisão do classificador](../src/recognition/decision.js) · [Feedback da prática](../src/recognition/feedback.js)

A revisão técnica conferiu os três IDs, os clipes do avatar e os rótulos no manifesto efetivamente servido. A extração local passou na verificação de partições, hashes e duplicatas nos 174 clipes do recorte inicial e nos 207 do expandido. O teste de paridade em WebAssembly conferiu cinco amostras do combinado sem divergências de decisão. O registro DataCite do DOI `10.5281/zenodo.2667329` confirmou a indicação de CC BY 4.0. Os logs ficam em `data/evidence/demonstracao/m1-m2-dfb045b/` e `data/evidence/demonstracao/m1-m2-wasm-dfb045b.log`. As amostras de negativos com pessoas independentes na webcam seguem pendentes. [Consulta DataCite](https://api.datacite.org/dois/10.5281/zenodo.2667329) · [Referências e bases](referencias.md) · [Protocolo de aceite](protocolo-aceite.md)

### Aceite técnico de M1

Na prévia `10b084e`, o Chromium abriu e reproduziu os clipes de Cinco, Espelho e Amarelo na lição. O catálogo, o player e a decisão do classificador resolveram os mesmos três identificadores. O manifesto servido foi idêntico ao registrado no Git e a soma dos pesos ONNX correspondeu à declarada. A licença e o DOI inscritos no manifesto corresponderam ao registro DataCite. [Teste do contrato](../tests/recognition-manifest.test.js) · [Manifesto do combinado](../ml/evidence/isolated-combined/model.json) · [Registro DataCite](https://api.datacite.org/dois/10.5281/zenodo.2667329)

Os commits `cef3eae` e `31b7bf2` registram o protocolo e as partições antes da combinação dos modelos em `dcf05f4` e da avaliação reservada em `c210b83`. O reteste conferiu os hashes dos vídeos e dos manifestos, os quatro rótulos do recorte inicial com a classe de rejeição e a inclusão de 33 clipes de Aluno no expandido. Em ambos os recortes, as 12 pessoas permaneceram separadas por partição, com 7 no treino, 2 na validação e 3 no teste. [Manifesto inicial](../ml/manifests/minds-v1.json) · [Manifesto expandido](../ml/manifests/minds-expanded-v1.json)

Os mesmos pesos reproduziram as decisões e a matriz de confusão dos 51 clipes reservados. O F1 macro foi 0,972, a cobertura foi 97,0% e houve uma falsa aceitação em 18 negativos do MINDS-Libras. No Chromium, a comparação de cinco amostras em WebAssembly manteve as decisões. Os resultados sustentam o uso exploratório do protótipo. Nos 19 recortes externos, houve cinco falsas aceitações. A coleta com pessoas independentes na webcam e a revisão linguística permanecem no roteiro de aceite. Os registros desta auditoria ficam em `data/evidence/demonstracao/m1-aceite-10b084e/`. [Avaliação reservada](avaliacao.md#modelo-combinado-na-partição-reservada) · [Recortes externos no Chromium](negativos.md#os-19-recortes-na-área-livre-do-chromium)

## Atribuição dos artefatos de reconhecimento

ALMEIDA, Sílvia G. M. et al. *MINDS-Libras Dataset*. Versão 1. Zenodo, 2019. DOI 10.5281/zenodo.2667329. Extração local de pontos, normalização, recorte de classes e treinamento do LibrasIA a partir da fonte sob CC BY 4.0. [Dataset](https://doi.org/10.5281/zenodo.2667329) · [Licença CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
