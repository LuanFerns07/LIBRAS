# Letra O da Uníntese com a mão mais fechada

Na sequência de alfabeto da Uníntese, a mão apresenta O com os dedos curvados em direção ao polegar. Na vista de frente, as pontas dos dedos cobrem a junção e quase não há abertura visível. O glifo O aparece no rodapé durante toda a pose. A janela de 75320 a 76200 ms foi definida pela imagem antes da extração e fica reservada para avaliação, junto com a gravação inteira. [Vídeo no trecho anotado](https://www.youtube.com/watch?v=nCFjW-0-mro&t=75s), [manifesto](../../alphabet/unintese-static-windows.json).

| Fonte e âncora | Aparência no quadro |
| --- | --- |
| Ifes, O branco, 285040 e 293020 ms | Dedos curvados juntos sobre a ponta do polegar, com a palma visível e sem fundo aparecendo no centro da mão. |
| Ifes, X vermelho sobre a demonstração de O, 288820 ms | Dedos e polegar delimitam um círculo maior, com o fundo azul visível por dentro. A própria aula marca essa execução como incorreta. |
| UFAC, O no cartão, 198720 ms | Dedos curvados junto ao polegar e pequena abertura pela qual aparece a camiseta. O contorno tem abertura menor que a do exemplo marcado com X no Ifes. |
| Uníntese, O no rodapé, 75760 ms | Mão mais baixa no quadro, próxima ao ombro, com a palma oblíqua. As pontas dos dedos cobrem a junção do polegar de forma parecida com os dois O rotulados do Ifes. |

A comparação trata da aparência em uma câmera por trecho. O ângulo pode alterar a abertura aparente, e cada fonte usa seu próprio rótulo didático. Os quadros não permitem atribuir a diferença só à articulação. [Demonstração do Ifes](https://www.youtube.com/watch?v=MFL8R4t36fE&t=283s), [demonstração da UFAC](https://www.youtube.com/watch?v=B2U7c6OXgBg&t=198s).

O A de controle da Uníntese mostra a lateral do polegar e a palma mais voltada à câmera. Na terceira aula da UFSM, a mão gira mais e aparece sobretudo a ponta do polegar. As duas poses ficam registradas com seus rótulos originais. [A da Uníntese](https://www.youtube.com/watch?v=nCFjW-0-mro&t=40s), [A da UFSM](https://ntetube.nte.ufsm.br/v/1535641159).

## Publicação e licença

A Escola de Libras da Uníntese publicou o material em 8 de fevereiro de 2022. A descrição credita Patrícia Santos pela apresentação. A pessoa que interpreta a introdução demonstra o alfabeto. O nome dessa sinalizante não consta na descrição nem nos créditos exibidos que foram examinados. O campo Licença declara Creative Commons de atribuição com reutilização permitida, modalidade vinculada pelo YouTube a CC BY 3.0. [Publicação da Uníntese](https://www.youtube.com/watch?v=nCFjW-0-mro&hl=pt-BR), [Versão da licença adotada pelo YouTube](https://blog.youtube/news-and-events/youtube-and-creative-commons-raising/), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

## Extração

O Hand Landmarker em CPU encontrou a mão em todos os quadros amostrados, com intervalo de 65 ms. Foram 14 quadros de A, 14 de C, 11 de E, 14 de O e 20 de S. A extração foi registrada antes do replay. O registro inclui os hashes da mídia, da anotação, do modelo de mãos e dos pontos. [Resultado da extração](unintese-extraction.json)

```bash
mkdir -p data/alphabet/independent/unintese-download data/evidence/alphabet-o-compact
yt-dlp --no-playlist --no-mtime -f '298+140-2' --merge-output-format mp4 \
  -o 'data/alphabet/independent/unintese-download/unintese-alfabeto.%(ext)s' \
  'https://www.youtube.com/watch?v=nCFjW-0-mro'

.venv/bin/python -m ml.alphabet.extract_motion \
  --manifest ml/alphabet/unintese-static-windows.json \
  --out data/evidence/alphabet-o-compact/unintese-static-frames.json
```

## Replay com dois modelos congelados

A gravação ficou fora do treino e da escolha do complemento de O. No Chromium, as duas compilações mostraram A, C e E nas janelas correspondentes. Nas duas, S produziu A, e O ficou sem leitura, com 22 quadros com mão em cada replay. O controle C também mostrou Ç por um instante na compilação anterior. A rejeição de O foi reproduzida em outra pessoa com uma configuração compacta semelhante à do Ifes. [Compilação anterior](replay-0c0da0f.json) · [Compilação com o complemento](replay-99f0e90.json)
