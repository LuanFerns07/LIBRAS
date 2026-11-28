# Vídeo de referência para os pontos das mãos

## Retomada na Área livre

No Chromium com o B gravado da UFSM, o teste bloqueou as respostas do primeiro rastreador enquanto o vídeo seguia ativo. Na prévia anterior, o desenho ficou vazio. Com a retomada automática, o aplicativo abriu outro rastreador, voltou a desenhar os pontos e exibiu B na mesma trilha. O teste confirmou também que desmarcar e remarcar a opção apaga e restaura o desenho. A webcam Acer forneceu quadros de 640 × 480 ao rastreador e foi liberada ao desligar a câmera. A verificação visual das mãos usou vídeo gravado. [Teste no Chromium](../tests/e2e/alphabet-live.test.mjs)

## Vídeo das duas mãos

O teste no Chromium usa o trecho CLAD de desenvolvimento `clad-dev-58a` (Subject 4, vídeo 58, segundo inicial 0). A pessoa coloca um headset e leva ambas as mãos ao computador. A versão local desacelera o trecho, mantém a orientação original e cobre temporariamente a mão esquerda anatômica. O arquivo Y4M fica em `data/evidence/hand-overlay-live/clad-duas-maos.y4m`, com 640 × 480 pixels, 25 quadros por segundo e 10,76 s de duração. [Seleção do trecho](../ml/external_eval/clad-development.json) · [Licença e procedência](negativos.md#negativos-complementares-no-treino)

| Tempo no Y4M | Marcador no vídeo | Mãos esperadas |
| --- | --- | --- |
| 0–3,20 s | Magenta `#ef209a` | Esquerda e direita, do headset ao computador |
| 3,20–7,00 s | Azul `#1368ff` | Direita junto ao teclado. Esquerda coberta pelo retângulo |
| 7,00–10,76 s | Vermelho `#f73927` | Esquerda e direita. Entre 7,55 e 8,15 s, a esquerda passa da mesa ao teclado |

Leia o marcador no vídeo sem espelhamento, no pixel (24, 24) ou na posição relativa com x igual a 0,0375 e y igual a 0,05. Os testes podem comparar os pixels coloridos do canvas da aplicação com o marcador presente no quadro. As cores RGB do marcador variam ligeiramente com a conversão de YUV para RGB.

No Chromium 156.0.8078.79, uma sonda da câmera simulada com o Holistic amostrou o primeiro ciclo a intervalos de pelo menos 95 ms. O extrator identificou ambas as mãos em 21 de 24 amostras magenta, somente a direita nas 32 amostras azuis e ambas em 28 de 31 amostras vermelhas. O maior deslocamento distinto das duas mãos entre pares de amostras foi de 51,4 px na faixa magenta e 31,2 px na vermelha, comparando os centroides dos 21 pontos de cada mão.

## Reprodução local

O recorte MP4 está em `data/clad-development/raw/clad-dev-58a.mp4` após o preparo descrito no protocolo. O comando usa FFmpeg 7.1.5 e grava apenas o Y4M derivado.

```bash
mkdir -p data/evidence/hand-overlay-live
filter="trim=start=0.60:end=3.96,setpts=3.2*(PTS-STARTPTS),fps=25,
scale=568:480:flags=lanczos,pad=640:480:36:0:black,
drawbox=x=306:y=322:w=87:h=75:color=0x343434:t=fill:enable='gte(t,3.2)*lt(t,7)',
drawbox=x=8:y=8:w=32:h=32:color=0xef209a:t=fill:enable='lt(t,3.2)',
drawbox=x=8:y=8:w=32:h=32:color=0x1368ff:t=fill:enable='gte(t,3.2)*lt(t,7)',
drawbox=x=8:y=8:w=32:h=32:color=0xf73927:t=fill:enable='gte(t,7)'"
ffmpeg -nostdin -hide_banner -loglevel error \
  -i data/clad-development/raw/clad-dev-58a.mp4 -vf "$filter" \
  -an -pix_fmt yuv420p -y data/evidence/hand-overlay-live/clad-duas-maos.y4m
sha256sum data/clad-development/raw/clad-dev-58a.mp4 \
  data/evidence/hand-overlay-live/clad-duas-maos.y4m
```

| Arquivo | SHA-256 |
| --- | --- |
| `clad-dev-58a.mp4` | `b004a869aa8edee809d88fd4c661404e45742f7f1b0a118dd41d9e4354d0506f` |
| `clad-duas-maos.y4m` | `f94d2c2139afb9f7d8f4979de5b13b010f4d5b48d9136955ea5b18a1ce79623c` |

TAYYUB, Jawad, HAWASLY, Majd e COHN, Anthony G. *Complex and Long Activities Dataset*. University of Leeds, 2017. O LibrasIA recortou, desacelerou e redimensionou o vídeo, aplicou a oclusão e marcou as fases. [Dataset](https://doi.org/10.5518/249) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Verificar a prévia

Com o pacote local da demonstração servindo a porta 4177, execute os testes na raiz. O primeiro injeta o Y4M na câmera do Chromium e confere as articulações desenhadas nos pixels do canvas. O segundo abre a webcam do computador, verifica a trilha e confirma sua liberação.

```bash
LIBRASIA_TEST_URL=http://127.0.0.1:4177/ \
  LIBRASIA_TEST_HAND_VIDEO=data/evidence/hand-overlay-live/clad-duas-maos.y4m \
  node --test tests/e2e/hand-overlay-live.test.mjs

LIBRASIA_TEST_URL=http://127.0.0.1:4177/ LIBRASIA_TEST_PHYSICAL=1 \
  node --test tests/e2e/browser.test.mjs
```

## Resultado da prévia empacotada

O Chromium 156.0.8078.79 testou a compilação `7e30829`. Com o vídeo gravado, o canvas desenhou 21 pontos por mão, mostrou movimentos distintos das duas mãos e apagou os pontos da mão ocluída até seu retorno. O vídeo e o canvas tiveram o mesmo encaixe e espelhamento em janelas de 1.280 e 390 px. A opção começou marcada, apagou os pontos ao ser desmarcada e retomou o desenho ao ser marcada durante a tentativa. Ao sair da Área livre, a trilha terminou e o vídeo soltou a referência à câmera.

Na amostra com leitura dos pixels do canvas, os intervalos medianos entre pinturas foram 43 ms antes da tentativa, 89 ms durante a captura e 40 ms depois de concluir. A primeira pintura após o clique para iniciar ocorreu em 14 ms. O teste separado de reconhecimento acrescentou Amarelo à transcrição com a sobreposição ativa.

Com a webcam física ACER HD User Facing, o Chromium abriu a trilha a 640 × 480 e confirmou sua liberação ao mudar de aba e ao sair da Área livre. O aceite visual com movimentos na webcam física fica na checklist. Os registros locais estão em `data/evidence/hand-overlay-live/final-video.log`, `final-webcam-fisica.log` e `final-reconhecimento.log`. [Checklist](../ROADMAP_LIBRASIA.md#m2--primeiro-sinal-com-webcam-e-avatar-reais)
