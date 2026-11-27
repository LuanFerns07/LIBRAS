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

## Pontos das mãos

A extração em CPU foi feita depois do commit `9ec5776`, que fixou a anotação. O Hand Landmarker detectou duas mãos em todos os 16 quadros amostrados de O. A separação vertical entre elas foi suficiente para escolher a mão superior em cada quadro. Em S, detectou uma mão nos 16 quadros amostrados. Esta etapa produziu somente os pontos das mãos.

- SHA-256 do Hand Landmarker `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`
- SHA-256 do manifesto `2cb073aa8bdd0cfc11058e1ff8a9c4da8977de5364e2dd85b922557cded274f0`
- SHA-256 dos pontos `de57a4ed58e9e7dbfbcc08d6bfca990e1ae6b84709fc8f08f2566ce2e2afbe39`

```bash
mkdir -p data/evidence/alphabet-o-s-independent
.venv/bin/python -m ml.alphabet.extract_motion \
  --manifest ml/alphabet/institutional-static-o-s-holdout.json \
  --out data/evidence/alphabet-o-s-independent/static-frames.json
```
## Replay das gravações reservadas

As compilações `99f0e90` e `bfe1945` exibiram E na janela de O de Uéslei Paterno e S na janela da Unicentro. No O de Uéslei Paterno, os dois classificadores principais concordaram em E nos 16 quadros processados na extração em CPU. O complemento de O só atua depois de uma abstenção. O caso exige avaliar a distinção entre E e O quando os classificadores principais já aceitam E. [Compilação anterior](replay-99f0e90.json) · [Compilação com O compacto](../alphabet-o-compact/replay-bfe1945.json)

## Distinção de A e S nos pontos

A sonda treinou regressões logísticas para distinguir A de S a partir da posição lateral e longitudinal da ponta do polegar em relação à palma, sua distância à base do dedo médio e a abertura do polegar. Uma segunda versão acrescentou a flexão relativa dos quatro outros dedos. Ambas usaram apenas os blocos de treino do LibraSign e os recortes de treino da UFSM, do Cecierj e do Ifes. A análise só considera a forma de S quando as duas redes principais preferem alguma letra do par A/S. [Implementação da sonda](../../alphabet/probe_as.py)

Nos 20 quadros de S da Uníntese, a regra com quatro medidas acrescentou 16 votos de S, com 14 trios consecutivos. A regra com oito medidas acrescentou quatro votos, sem trio. A regra com quatro medidas também formou quatro trios de S em Z do Cecierj. Exigir a confirmação de S pelo verificador eliminou esses trios e conservou os 16 votos de S da Uníntese. As quatro leituras por quadro já aceitas como A na mesma janela continuaram presentes. O ensaio usa os pontos extraídos e ainda precisa de replay na câmera para avaliar a sucessão de letras. [Resultado e hashes](as-probe.json)

```bash
reference=data/alphabet/o-compacto/referencia-ifes.json
.venv/bin/python -m ml.alphabet.probe_as --reference "$reference" "$reference" \
  data/alphabet/motion-final.json data/alphabet/institutional/motion-frames.json \
  data/evidence/alphabet-o-compact/unintese-static-frames.json \
  data/evidence/alphabet-o-s-independent/static-frames.json \
  data/evidence/alphabet-a-e-independent/ufac-static-frames.json
```
