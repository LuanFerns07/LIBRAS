# Controles A, Q e R e duas vistas de A

O vídeo de Tel baixinha fornece A, Q e R com a mesma pessoa, a câmera fixa e os cartões das letras em tela. O polegar fica bem visível no A. Na aula explicativa da Unicentro, a professora Eliziane Streiechen mostra o A de frente e de um ângulo oblíquo. Na segunda vista, a unha fica mais voltada para a câmera, e a margem do polegar continua distinguível. A terceira aula da UFSM tem mais ocultação, com a ponta do polegar em evidência. [A de Tel baixinha](https://www.youtube.com/watch?v=chzje8VmC1I&t=70s), [A da Unicentro](https://www.youtube.com/watch?v=hxnpSXVWkGU&t=88s), [A da terceira aula da UFSM](https://ntetube.nte.ufsm.br/v/1535641159).

| Fonte | Letra | Início–fim, âncora em ms | Identificação |
| --- | --- | --- | --- |
| Tel baixinha | A | 70320–71420, 70880 | Cartão A de Abelha |
| Tel baixinha | Q | 110780–111880, 111340 | Cartão Q de Queijo |
| Tel baixinha | R | 112900–114000, 113420 | Cartão R de Rato |
| Nead/Unicentro | A | 88380–89480, 88900 | A frontal |
| Nead/Unicentro | A | 92280–93380, 92800 | A oblíquo enquanto explica a posição lateral do polegar |

As duas janelas da Unicentro pertencem à explicação do A. A legenda automática identifica a letra em 88350 ms e a posição do polegar entre 90180 e 92159 ms. A professora demonstra S depois, quando leva o polegar por cima dos dedos, identificado pela fala legendada a partir de 94890 ms. Essa demonstração posterior fica fora das janelas. [Vista oblíqua](https://www.youtube.com/watch?v=hxnpSXVWkGU&t=92s).

As gravações inteiras ficam reservadas à avaliação. A autora de *Alfabeto em libras* usa o nome Tel baixinha na publicação. A aula da Unicentro credita a professora em tela e foi publicada pelo Núcleo de Educação a Distância. O campo Licença de cada publicação indica Creative Commons de atribuição com reutilização permitida. O [manifesto](../../alphabet/independent-a-q-r-windows.json) registra o SHA-256 de cada MP4, a licença e a faixa de legendas usada como apoio. [Publicação de Tel baixinha](https://www.youtube.com/watch?v=chzje8VmC1I&hl=pt-BR), [publicação do Nead/Unicentro](https://www.youtube.com/watch?v=hxnpSXVWkGU&hl=pt-BR), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

## Replay basal `5b2d4c4`

O modo Letras exibiu A nos três recortes de A. Nos dois replays de Q e R, Q ficou sem leitura e R apareceu como U. O Chromium recebeu os recortes por câmera virtual, com um processo e aceleração por GPU desativada. O [relatório](replay-5b2d4c4.json) registra os hashes da compilação e dos modelos.

| Recorte | 1º replay | 2º replay | Quadros com mão no replay | Quadros selecionáveis na extração |
| --- | --- | --- | --- | --- |
| Tel baixinha A | A em 222 ms | — | 21 | 17/17 |
| Tel baixinha Q | Sem leitura | Sem leitura | 27 / 25 | 17/17 |
| Tel baixinha R | U em 297 ms | U em 283 ms | 23 / 25 | 16/17 |
| Unicentro A frontal | A em 212 ms | — | 25 | 17/17 |
| Unicentro A oblíquo | A em 276 ms | — | 26 | 17/17 |

Os tempos contam a partir do início de cada recorte. No Q, o indicador aponta para baixo e fica inteiro no enquadramento. No R, os dois dedos estendidos se sobrepõem na imagem. A vista lateral deixa a profundidade do cruzamento indeterminada em uma única câmera. A extração dos clipes originais encontrou pontos de 21 articulações nos 17 quadros amostrados de Q e de R. No R, houve uma segunda detecção próxima em um quadro e o seletor deixou esse quadro sem mão. As leituras repetidas mostram o comportamento nesses recortes de uma só sessão. A extração local também confirma o rastreamento dos três recortes de A, cuja posição do polegar ainda é distinguível. [Q de Tel baixinha](https://www.youtube.com/watch?v=chzje8VmC1I&t=110s), [R de Tel baixinha](https://www.youtube.com/watch?v=chzje8VmC1I&t=113s).

## Reprodução local

Na raiz do projeto, use os MP4 com os hashes registrados, a compilação `5b2d4c4` na porta 4177 e um executável `chromium-cpu` que invoque Chromium com `--disable-gpu`.

```sh
LIBRASIA_CHROMIUM=/caminho/chromium-cpu node ml/alphabet/replay-web.mjs \
  --url http://127.0.0.1:4177/ \
  --manifest ml/alphabet/independent-a-q-r-windows.json \
  --source tel-baixinha-chzje8vmc1i --source unicentro-hxnpsxvwkgu --workers 1
LIBRASIA_CHROMIUM=/caminho/chromium-cpu node ml/alphabet/replay-web.mjs \
  --url http://127.0.0.1:4177/ \
  --manifest ml/alphabet/independent-a-q-r-windows.json \
  --source tel-baixinha-chzje8vmc1i --letters QR --workers 1
OPENCV_FFMPEG_CAPTURE_OPTIONS='threads;1' .venv/bin/python -m ml.alphabet.extract_motion \
  --manifest ml/alphabet/independent-a-q-r-windows.json \
  --out data/evidence/alphabet-a-q-r/static-frames.json
```
