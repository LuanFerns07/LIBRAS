# Comparação de O e E na aula de Uéslei Paterno

A gravação permanece reservada à avaliação. O primeiro O foi anotado entre N e P na sequência de fundo preto. A mão gira e deixa a cavidade mais visível. O segundo O usa fundo roxo e uma vista mais frontal. A mão curvada deixa pouca abertura visível. O E de controle pertence à mesma sequência de fundo roxo e mantém a palma voltada à câmera enquanto os quatro dedos dobram. A seleção usa somente a demonstração e sua ordem, com a faixa de legendas automáticas em português como apoio.

| Letra | Sequência | Início–fim, âncora (ms) | Identificação na publicação |
| --- | --- | --- | --- |
| O | Primeira | 65125–66125, 65500 | A legenda automática indica N em 64159 ms, O em 66200 ms já perto do fim da pose e P em 67520 ms. |
| E | Segunda | 131950–132950, 132550 | A configuração é demonstrada entre D e F. A legenda automática indica E em 132560 ms. |
| O | Segunda | 147000–148000, 147640 | Janela da avaliação original. A legenda automática indica O em 147560 ms e P em 148760 ms. |

A publicação de Uéslei Paterno declara licença Creative Commons de atribuição. O SHA-256 do MP4, o da faixa de legendas e o vínculo com o material didático do IFSC estão no [manifesto de origem](../../alphabet/institutional-static-o-s-holdout.json). As legendas são uma faixa da plataforma e o MP4 original não exibe as letras. [Vídeo](https://www.youtube.com/watch?v=__fMtXL8knA&hl=pt-BR), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

## Ensaio

O [protocolo](protocolo.json) fixa as janelas e os enquadramentos antes do replay. Todos os vídeos derivados são de 640 × 360 pixels, usam os mesmos quadros de origem por janela e ficam em `data/`. A região da mão em repouso é coberta sem redimensionar o quadro. O recorte de 960 × 540 pixels preserva as duas mãos e amplia o conteúdo por um fator de 4/3. Os dois cenários ficam disponíveis com e sem máscara. O recorte de 640 × 360 pixels isola a mão ativa e dobra seu tamanho em relação ao quadro inteiro. O desenho da máscara e dos recortes é fixo para as três janelas.

## Resultado com a compilação bfe1945

O Chromium exibiu E nas duas janelas de O em todos os cinco enquadramentos. O controle de E também foi exibido corretamente em todos eles. As leituras abaixo foram registradas com câmera virtual na porta 4193, servida pelo pacote local `librasia-alfabeto-o-compacto`.

| Enquadramento | O, primeira sequência | E, segunda sequência | O, segunda sequência | Mãos detectadas por quadro na extração em CPU |
| --- | --- | --- | --- | --- |
| Quadro inteiro | E, 250 ms | E, 224 ms | E, 224 ms | Duas |
| Quadro inteiro com máscara | E, 238 ms | E, 272 ms | E, 216 ms | Uma |
| Ampliação de 4/3 | E, 271 ms | E, 232 ms | E, 239 ms | Duas |
| Ampliação de 4/3 com máscara | E, 223 ms | E, 235 ms | E, 238 ms | Uma |
| Recorte da mão ativa, ampliação de 2× | E, 223 ms | E, 222 ms | E, 263 ms | Uma |

A altura mediana da mão ativa passou de 16,0% para 32,4% do quadro no primeiro O e de 18,8% para 37,6% no segundo. A regra de escolha da mão ativa aceitou todos os 16 quadros amostrados de cada janela e enquadramento.

Nas três redes da compilação, a primeira tomada de O foi aceita como E pelo complemento nos 16 quadros de cada enquadramento. Na segunda tomada, as duas redes estáticas concordaram em E nos 16 quadros de cada enquadramento. O E de controle foi aceito pelas duas redes estáticas do mesmo modo. A retirada da outra mão e as ampliações escolhidas mantiveram o erro. As tomadas variam em ângulo e iluminação. O ensaio localiza as duas rotas de classificação de E sem atribuir a diferença entre elas a uma única característica da imagem.

## Reprodução

Da raiz do repositório, inicie o servidor local do pacote de referência numa porta livre. O replay abaixo usa a porta 4193 e um único processo Chromium.

```bash
.venv/bin/python data/releases/librasia-alfabeto-o-compacto/iniciar.py --porta 4193
```

Em outro terminal, prepare os recortes e execute o replay.

```bash
paterno_data=data/evidence/alphabet-paterno-o-e
paterno_tools=ml/evidence/alphabet-paterno-o-e
.venv/bin/python "$paterno_tools/preparar_replay.py" --out "$paterno_data"
mapfile -t paterno_sources < <(.venv/bin/python -c \
  'import json,sys; print("\n".join(s["id"] for s in json.load(open(sys.argv[1]))["sources"]))' \
  "$paterno_data/replay-manifest.json")
paterno_args=()
for paterno_source in "${paterno_sources[@]}"; do
  paterno_args+=(--source "$paterno_source")
done
cat > "$paterno_data/chromium-cpu" <<'SH'
#!/bin/sh
exec chromium --disable-gpu "$@"
SH
chmod u+x "$paterno_data/chromium-cpu"
LIBRASIA_CHROMIUM="$PWD/$paterno_data/chromium-cpu" node ml/alphabet/replay-web.mjs \
  --url http://127.0.0.1:4193/ --manifest "$paterno_data/replay-manifest.json" \
  "${paterno_args[@]}" --workers 1 > "$paterno_data/replay-bfe1945.json"
OPENCV_FFMPEG_CAPTURE_OPTIONS='threads;1' .venv/bin/python -m ml.alphabet.extract_motion \
  --manifest "$paterno_data/replay-manifest.json" --out "$paterno_data/frames.json"
PYTHONPATH=. .venv/bin/python "$paterno_tools/resumir_replay.py" --data "$paterno_data" \
  --release-site data/releases/librasia-alfabeto-o-compacto/site --out "$paterno_data/resultados.json"
```

O [relatório](resultados-bfe1945.json) preserva os hashes dos recortes utilizados, dos modelos e dos pontos, junto com as contagens da extração, as leituras no Chromium e os votos estáticos por quadro em CPU.
