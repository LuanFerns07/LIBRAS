# Letra A da UFSM com a mão ampliada

Os dois classificadores da compilação `759a671` recusaram A nos 11 quadros da janela anotada em todos os oito cenários. O Hand Landmarker retornou pontos para a mão que sinaliza nos 11 quadros de todos os cenários. No quadro inteiro, detectou também a mão em repouso. A separação vertical entre as mãos permitiu aplicar a mesma regra de escolha da mão superior do leitor do app.

| Imagem do ensaio | Altura mediana da mão no quadro, 480 / 576 linhas | Top 1 principal | Votos em A aceitos |
| --- | ---: | --- | ---: |
| Quadro inteiro | 13,2% / 13,1% | R em 11/11 nas duas resoluções | 0/11 |
| Recorte com preenchimento, à escala original | 13,2% / 13,1% | R em 11/11 nas duas resoluções | 0/11 |
| Recorte ampliado | 29,4% / 29,2% | R em 11/11 nas duas resoluções | 0/11 |
| Recorte mais fechado | 46,7% / 46,4% | R em 11/11 nas duas resoluções | 0/11 |

O verificador dos recortes mais fechados classificou dez quadros como Q e um como R nas duas resoluções. Um quadro do controle a 480 linhas atingiu o limiar de concordância para R. O recorte ampliado e o arquivo de maior resolução testados não recuperaram A. Como o mesmo sinal foi filmado de um único ângulo, o ensaio distingue ausência de detecção de divergência na classificação dos pontos, sem medir a fidelidade anatômica dos pontos estimados.

## Reprodução

Janela reservada de 3660 a 4370 ms, com âncora em 4100 ms, do vídeo de Giovana Fracari Hautrive e UFSM. Os dois downloads oficiais têm 852 × 480 e 1024 × 576 pixels. O sufixo do segundo arquivo no servidor é `720p.mp4`. Os recortes foram escolhidos pelo enquadramento da mão na âncora, antes da inferência, e são fixos durante a janela. O controle com preenchimento exclui a mão em repouso e preserva o tamanho original da mão ativa em pixels. [Aula da UFSM](https://ntetube.nte.ufsm.br/v/1535641159), [arquivo 480p](https://ntetube.nte.ufsm.br/repositorio/b338729ecef4a7b5b4bbe96728aa7cb8/480p.mp4), [arquivo de maior resolução](https://ntetube.nte.ufsm.br/repositorio/b338729ecef4a7b5b4bbe96728aa7cb8/720p.mp4), [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

Para reproduzir, use a cópia dos arquivos `commit.txt`, `alphabet.json`, `alphabet.onnx`, `alphabet-check.onnx` e `hand_landmarker.task` da compilação indicada e os dois MP4 locais. O script verifica os hashes, usa o extrator a cada 65 ms e executa os ONNX com o provedor CPU. Os resultados são escores por quadro e não incluem a etapa de votos ao vivo, a trajetória ou a câmera virtual.

```bash
PYTHONPATH=. python ml/evidence/alphabet-a-e-independent/diagnose_crop.py \
  --videos data/alphabet/ufsm \
  --assets .cache/alphabet-a-e-independent \
  --out data/evidence/alphabet-a-e-independent
```

O arquivo [ufsm-a-crop.json](ufsm-a-crop.json) registra as versões, os hashes e os resultados agregados de `summary.json`. `diagnosis.json` e os vídeos derivados são saídas locais.

## Ensaio de flexão em coordenadas 3D

Uma regressão logística usa a razão entre a distância da base à ponta e o comprimento das articulações de cada um dos quatro dedos, do indicador ao mínimo. O Hand Landmarker fornece as coordenadas 3D da mesma mão selecionada nas coordenadas da imagem. O treino usou 35 quadros de A e 340 das outras letras da primeira aula da UFSM e do Cecierj. A regra avaliada permite um novo voto de A a partir de 0,50 somente se as redes estáticas preferirem letras de A/Q/R e se as rotas da prévia ficarem sem leitura.

Dos 11 quadros do A da terceira aula da UFSM, nove receberam voto do complemento. A maior sequência foi de cinco quadros amostrados seguidos. Nenhum dos outros 65 recortes ganhou votos, incluindo 57 recortes de outras letras e os Q e R reservados de Tel baixinha. O ensaio percorreu os pontos extraídos em CPU. A compilação `b7b8d21` inclui a confirmação 3D. [Contagens e hashes](ufsm-a-flexao-3d.json) · [Novos controles A/Q/R](../alphabet-a-q-r/README.md) · [Teste em Chromium](../../../docs/dados-alfabeto.md#confirmação-3d-de-a-na-prévia-local)

```bash
out=data/alphabet/a-oculto
mkdir -p "$out"
export OPENCV_FFMPEG_CAPTURE_OPTIONS='threads;1'
refs=()
for input in ufsm-static-windows institutional-static-a-e-s-o ifes-static-windows \
  ufac-static-windows unintese-static-windows independent-a-q-r-windows; do
  path="$out/$input-3d.json"
  .venv/bin/python -m ml.alphabet.extract_motion --world --manifest "ml/alphabet/$input.json" --out "$path"
  refs+=("$path")
done
.venv/bin/python -m ml.alphabet.merge_reference "${refs[@]}" --train-source cecierj-13757 \
  --out "$out/referencia-3d.json"
.venv/bin/python -m ml.alphabet.probe_a_world data/releases/librasia-alfabeto-z-polegar/site/models \
  "$out/referencia-3d.json"
```

Para treinar, exportar e compilar a partir da referência 3D e dos pesos da prévia anterior, use a raiz do projeto.

```bash
base=data/releases/librasia-n-confirmacao/site/models
modelo=data/models/alphabet-a-world-candidate
.venv/bin/python -m ml.alphabet.probe_a_world "$base" data/alphabet/a-oculto/referencia-3d.json --out "$modelo"
LIBRASIA_MODELO="$base" LIBRASIA_ALFABETO_MODELO="$modelo" LIBRASIA_ALFABETO_MOVIMENTO="$base" \
  ./scripts/executar-local.sh --pacote data/releases/librasia-a-3d
```

## Fonte independente da UFAC

A aula **Datilologia ou Alfabeto Manual**, do professor Israel Queiroz de Lima, foi produzida pelo Niead/UFAC para Matemática EaD. O campo Licença do vídeo institucional registra Creative Commons de atribuição com reutilização permitida. A publicação do YouTube sobre a modalidade de licença aponta para CC BY 3.0. A gravação inteira está na partição de teste. [Aula da UFAC](https://www.youtube.com/watch?v=B2U7c6OXgBg&hl=pt-BR), [Referência institucional do IFAC, p. 19](https://repositorio.ifac.edu.br/jspui/bitstream/123456789/34/3/Chegou%20um%20aluno%20Surdo%2C%20e%20agora.%20Um%20roteiro%20de%20aprendizagem%20para%20professores%20do%20ensino%20de%20administra%C3%A7%C3%A3o%20para%20Surdos.pdf), [Termos da licença](https://creativecommons.org/licenses/by/3.0/), [Versão da licença adotada pelo YouTube](https://blog.youtube/news-and-events/youtube-and-creative-commons-raising/).

A letra impressa fica ao lado do sinalizante. No A, o polegar está visível ao lado do indicador e a face da palma fica mais exposta que no A da terceira aula da UFSM. No E, as pontas dos quatro dedos ficam visíveis e o polegar se dobra em frente à palma. Em M e N, o dorso da mão fica voltado para a câmera, com três e dois dedos voltados para baixo, respectivamente. Em U, o indicador e o médio ficam juntos e para cima.

| Letra | Início–fim e âncora no vídeo (ms) | Leitura na Área livre | Primeira exibição após o início do trecho |
| --- | --- | --- | ---: |
| A | 80580–83350, 81960 | A | 254 ms |
| E | 117520–119750, 118760 | E | 266 ms |
| M | 181440–183320, 182400 | M | 224 ms |
| N | 189160–191240, 190280 | N | 223 ms |
| O | 197600–199840, 198720 | Sem letra em dois replays | — |
| U | 251590–253240, 252240 | U nos dois replays, intermitente no primeiro | 1173 ms e 1604 ms |

O navegador rastreou uma mão em 58 quadros da janela de O em cada reprodução. A extração em CPU do vídeo original também encontrou apenas a mão ativa nos 35 quadros amostrados de O. Em U, o extrator detectou a mão em repouso além da ativa, com separação vertical suficiente para escolher a mão superior nos 26 quadros. As duas execuções são da compilação `dbda17e` na câmera virtual e cobrem um único sinalizante. Os valores de tempo descrevem essas execuções.

### Como repetir

Baixe os formatos 137 e 140 da aula com `yt-dlp` e combine em MP4 sem recodificar. O SHA-256 do arquivo local está no [manifesto](../../alphabet/ufac-static-windows.json). O vídeo fonte e os pontos por quadro ficam em `data/`. A câmera virtual usa os trechos anotados, sem áudio, reduzidos a 640 pixels de largura e precedidos por uma tela preta.

```bash
mkdir -p data/alphabet/independent/ufac-download data/evidence/alphabet-a-e-independent
yt-dlp --no-playlist --no-mtime -f '137+140' --merge-output-format mp4 \
  -o 'data/alphabet/independent/ufac-download/ufac-alfabeto.%(ext)s' \
  'https://www.youtube.com/watch?v=B2U7c6OXgBg'

node ml/alphabet/replay-web.mjs --url http://127.0.0.1:4177/ \
  --manifest ml/alphabet/ufac-static-windows.json --source ufac-b2u7c6oxgbg --workers 1

.venv/bin/python -m ml.alphabet.extract_motion \
  --manifest ml/alphabet/ufac-static-windows.json \
  --out data/evidence/alphabet-a-e-independent/ufac-static-frames.json
```

A repetição do replay usou `--letters OU`. Nas duas execuções, o Chromium foi iniciado com `--disable-gpu`. O Hand Landmarker e os classificadores da prévia usaram CPU. Os hashes dos modelos, os resultados por janela e o hash dos pontos estão em [ufac-replay-dbda17e.json](ufac-replay-dbda17e.json).
