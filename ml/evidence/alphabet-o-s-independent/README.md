# O com pouca abertura visível e referência de S

Duas gravações completas ficam reservadas à avaliação. As janelas abaixo foram escolhidas pela aparência da mão e pela identificação da letra na fonte. A inspeção passou por quadros espaçados de 80 ms antes desta anotação.

| Letra | Fonte | Início–fim, âncora (ms) | Identificação e pose |
| --- | --- | --- | --- |
| O | Uéslei Paterno | 147000–148000, 147640 | No segundo alfabeto, entre N e P. Na vista quase frontal, as pontas dos dedos curvados cobrem o encontro com o polegar e o fundo não aparece. A outra mão permanece junto ao torso. |
| S | Nead/Unicentro | 68340–69380, 68740 | Glifo S preto à direita. A mão ativa fecha os dedos e o polegar cruza por cima. O vídeo inclui uma janela menor com outro ângulo do mesmo sinal. |

Uéslei Paterno apresenta o vídeo para o e-book *Aprenda Libras em 5 Passos*. O IFSC referencia a aula em seu Moodle. A segunda sequência não imprime as letras na imagem. A legenda automática em português fornece O em 147560 ms e P em 148760 ms. A ordem das letras e o intervalo de pose visível foram verificados junto com essa legenda. Trata-se de uma pessoa diferente das gravações de O do Ifes e da Uníntese. [Aula de Uéslei Paterno](https://www.youtube.com/watch?v=__fMtXL8knA&t=147s), [Unidade didática do IFSC](https://moodle4.ifsc.edu.br/mod/book/tool/print/index.php?id=274178#ch50538).

O Nead da Unicentro publicou o S na sequência de alfabeto da disciplina da professora Eliziane Streiechen. A presença da mão também no quadro menor pode influenciar um detector de mãos que receba o vídeo inteiro. A anotação usa a pose da imagem principal como referência para o polegar. [Aula de alfabeto da Unicentro](https://www.youtube.com/watch?v=AnIqxVEqGNs&t=68s), [Aula explicativa com a identificação da professora em tela](https://www.youtube.com/watch?v=hxnpSXVWkGU&t=14s).

A mão de O em Paterno se aproxima, na vista frontal, das poses ensinadas pelo Ifes nas âncoras 285040 e 293020 ms. A aparência da abertura é dependente do ângulo. A primeira sequência de Paterno já apresenta outra vista em que a cavidade é mais visível, por volta de 65 s. A avaliação usa somente a janela definida na tabela. [O do Ifes](https://www.youtube.com/watch?v=MFL8R4t36fE&t=285s), [primeira sequência de Paterno](https://www.youtube.com/watch?v=__fMtXL8knA&t=65s).

## Origem, licença e reprodução

O campo Licença das duas publicações autoriza reutilização sob Creative Commons de atribuição. A publicação do YouTube que descreve essa modalidade vincula CC BY 3.0. Os créditos completos das fontes utilizadas e o SHA-256 de cada MP4 estão no [manifesto](../../alphabet/institutional-static-o-s-holdout.json). [Licença na publicação de Paterno](https://www.youtube.com/watch?v=__fMtXL8knA&hl=pt-BR), [Licença na publicação da Unicentro](https://www.youtube.com/watch?v=AnIqxVEqGNs&hl=pt-BR), [Versão adotada pelo YouTube](https://blog.youtube/news-and-events/youtube-and-creative-commons-raising/), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

```bash
mkdir -p data/alphabet/independent/ifsc-download data/alphabet/independent/unicentro-sequencia-download
yt-dlp --no-playlist --no-mtime -f '136+140' --merge-output-format mp4 \
  -o 'data/alphabet/independent/ifsc-download/ifsc-alfabeto.%(ext)s' \
  'https://www.youtube.com/watch?v=__fMtXL8knA'
yt-dlp --no-playlist --no-mtime -f '136+140' --merge-output-format mp4 \
  -o 'data/alphabet/independent/unicentro-sequencia-download/unicentro-sequencia-alfabeto.%(ext)s' \
  'https://www.youtube.com/watch?v=AnIqxVEqGNs'
```
