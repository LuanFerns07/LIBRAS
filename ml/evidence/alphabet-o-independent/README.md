# Letra O do Ifes na Área livre

O Chromium não exibiu O nas duas janelas reservadas do Ifes com a compilação `0c0da0f`. A câmera virtual entregou 50 e 26 quadros com mão ao aplicativo. As quatro janelas de controle exibiram a letra esperada.

| Letra | Início–fim e âncora no vídeo (ms) | Leitura | Primeira exibição após o início do trecho |
| --- | --- | --- | ---: |
| A | 23400–25300, 24640 | A | 322 ms |
| C | 50240–51480, 50660 | C | 276 ms |
| E | 87200–89600, 88300 | E | 231 ms |
| O | 283780–285880, 285040 | Sem letra | — |
| O | 292600–293680, 293020 | Sem letra | — |
| S | 360220–362500, 361620 | S | 217 ms |

Na extração em CPU do vídeo original, a primeira janela de O teve as duas mãos em 32 dos 33 quadros amostrados. A separação vertical permitiu escolher a mão superior em todos eles. A segunda teve uma única mão nos 17 quadros. As duas janelas são do mesmo sinalizante e experimentam posições diferentes da mão de repouso.

## Fonte e licença

O vídeo **Alfabeto em Libras** foi publicado pelo Centro de Referência em Formação e em Educação a Distância do Instituto Federal do Espírito Santo. O sinalizante se apresenta como Edgar na abertura. O campo Licença da publicação indica Creative Commons de atribuição com reutilização permitida. O YouTube vincula essa modalidade à CC BY 3.0 na publicação que a introduziu. A gravação inteira fica na partição de teste. [Publicação do Ifes](https://www.youtube.com/watch?v=MFL8R4t36fE&hl=pt-BR), [Versão da licença adotada pelo YouTube](https://blog.youtube/news-and-events/youtube-and-creative-commons-raising/), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

As janelas foram escolhidas com base no glifo branco da letra, na estabilidade da pose e na posição da mão de repouso antes do replay. A aula mostra O com os dedos mais próximos entre si. Uma demonstração com o círculo mais aberto aparece marcada com X vermelho por volta de 4 min 48 s e fica fora da avaliação positiva. Essa distinção é da própria aula e vale para os trechos anotados. [Demonstração de O](https://www.youtube.com/watch?v=MFL8R4t36fE&t=283s).

A amostragem dos vídeos de Uéslei Paterno e do Alfabeto Explicativo da Unicentro encontrou demonstrações de O, porém sem glifo em tela nos trechos examinados. Outra edição do Ifes, de duração menor, declara CC BY-NC-ND na descrição. A anotação usa a edição do Ifes de 8 min 54 s, cujo campo de licença autoriza reutilização e cuja descrição identifica a produção. [Vídeo de Uéslei Paterno](https://www.youtube.com/watch?v=__fMtXL8knA), [Aula da Unicentro](https://www.youtube.com/watch?v=hxnpSXVWkGU), [Edição curta do Ifes](https://www.youtube.com/watch?v=JpFOhTsxyQE).

## Reprodução

O arquivo de origem combina os formatos 137 e 140, sem recodificação. O SHA-256 registrado no [manifesto](../../alphabet/ifes-static-windows.json) é verificado pelo replay e pelo extrator. O replay usou um Chromium com `--disable-gpu` e câmera virtual. O arquivo de mídia e os pontos completos ficam no diretório local `data/`.

```bash
mkdir -p data/alphabet/independent/ifes-download data/evidence/alphabet-o-independent
yt-dlp --no-playlist --no-mtime -f '137+140' --merge-output-format mp4 \
  -o 'data/alphabet/independent/ifes-download/ifes-alfabeto.%(ext)s' \
  'https://www.youtube.com/watch?v=MFL8R4t36fE'

node ml/alphabet/replay-web.mjs --url http://127.0.0.1:4177/ \
  --manifest ml/alphabet/ifes-static-windows.json --source ifes-mfl8r4t36fe --workers 1

.venv/bin/python -m ml.alphabet.extract_motion \
  --manifest ml/alphabet/ifes-static-windows.json \
  --out data/evidence/alphabet-o-independent/ifes-static-frames.json
```

O [relatório](ifes-replay-0c0da0f.json) registra os hashes da compilação, dos modelos, do manifesto, do vídeo e dos pontos extraídos.
