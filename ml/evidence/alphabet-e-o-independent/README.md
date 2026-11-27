# Par E e O da gravação de Tel baixinha

As duas letras foram registradas na mesma apresentação, com um cartão em tela e apenas a mão ativa visível. O vídeo é de autoria da pessoa que se apresenta publicamente como Tel baixinha. Ela descreve a gravação como um trabalho de faculdade. Seu nome de canal não aparece nas fontes de treino e avaliação já catalogadas no repositório. A gravação inteira fica na partição de teste.

| Letra | Início–fim, âncora (ms) | Referência visual |
| --- | --- | --- |
| E | 79800–81300, 80520 | Cartão E de Esquilo. Palma mais voltada para a câmera, com os quatro dedos dobrados. |
| O | 105940–107440, 106660 | Cartão O de Ovelha. Mão em vista oblíqua, com os dedos curvados em direção ao polegar. |

As janelas foram definidas por quadros amostrados a cada 180 ms antes de qualquer extração de pontos ou replay. O [manifesto](../../alphabet/tel-baixinha-static-e-o.json) fixa os horários, os créditos e o SHA-256 do MP4. [Trecho de E](https://www.youtube.com/watch?v=chzje8VmC1I&t=79s), [trecho de O](https://www.youtube.com/watch?v=chzje8VmC1I&t=105s).

## Licença e arquivo local

O campo Licença da publicação declara Creative Commons de atribuição, com reutilização permitida. O YouTube vincula essa modalidade à CC BY 3.0 na publicação sobre seu lançamento. O MP4 fica em `data/`, que é ignorado pelo Git. [Publicação da autora](https://www.youtube.com/watch?v=chzje8VmC1I&hl=pt-BR), [Versão da licença no YouTube](https://blog.youtube/news-and-events/youtube-and-creative-commons-raising/), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

```bash
mkdir -p data/alphabet/independent/tel-baixinha-download
yt-dlp --no-playlist --no-mtime -f '136+140' --merge-output-format mp4 \
  -o 'data/alphabet/independent/tel-baixinha-download/tel-baixinha-alfabeto.%(ext)s' \
  'https://www.youtube.com/watch?v=chzje8VmC1I'
```
