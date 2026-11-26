# Espelho e Amarelo no Chromium

Este reteste dirigido usa quatro gravações de duas pessoas da partição de treino para verificar o percurso entre captura, reconhecimento e transcrição na área livre. Os clipes são reproduzidos em velocidade original na câmera simulada. [Procedência e partição do MINDS](dados.md) · [Protocolo de janela no Chromium](janelas-area-livre.md)

Os quatro controles foram fixados antes da inferência. Escolhemos a primeira gravação de cada sinal nas pessoas S01 e S04 e inspecionamos quadros dos vídeos de origem para localizar a trajetória da mão. A janela dura 4.200 ms desde o primeiro quadro verde observado. Cerca de 500 ms iniciais pertencem ao marcador e cerca de 3.700 ms ao vídeo de origem. A tabela mostra o trecho nominal capturado, com os mesmos limites de tolerância do ensaio de janelas.

| Controle | Arquivo original | Duração do original | Trecho nominal do original |
| --- | --- | ---: | ---: |
| Amarelo S01-1 | 03AmareloSinalizador01-1.mp4 | 5,43 s | 0,70–4,40 s |
| Amarelo S04-1 | 03AmareloSinalizador04-1.mp4 | 5,57 s | 1,40–5,10 s |
| Espelho S01-1 | 12EspelhoSinalizador01-1.mp4 | 6,63 s | 1,10–4,80 s |
| Espelho S04-1 | 12EspelhoSinalizador04-1.mp4 | 5,37 s | 0,75–4,45 s |

Cada controle tem duas tentativas manuais. O teste espera a palavra da glosa correta em cada tentativa e exige que o texto anterior permaneça intacto. Registra também o intervalo entregue, os quadros processados, o estado exibido e o tempo da conclusão à decisão.

## Reproduzir

Prepare os Y4M a partir dos MP4 de treino. O FFmpeg inicia o vídeo no ponto inspecionado e conserva a velocidade da gravação, com escala de 640 px de largura, 30 fps e marcador verde no começo.

```bash
mkdir -p data/evidence/moving-sign-fixtures
fixture() {
  ffmpeg -threads 1 -filter_threads 1 -ss "$3" \
    -i "data/minds-expanded/raw/$1.mp4" -an \
    -vf 'scale=640:-2,fps=30,tpad=start_duration=0.5:color=lime' \
    -pix_fmt yuv420p "data/evidence/moving-sign-fixtures/$2.y4m"
}
fixture 03AmareloSinalizador01-1 amarelo-s01 0.70
fixture 03AmareloSinalizador04-1 amarelo-s04 1.40
fixture 12EspelhoSinalizador01-1 espelho-s01 1.10
fixture 12EspelhoSinalizador04-1 espelho-s04 0.75
```

Inicie a prévia com a combinação exportada em um terminal.

```bash
LIBRASIA_PORTA=4194 LIBRASIA_MODELO=data/models/isolated-combined ./scripts/executar-local.sh
```

Em outro terminal, execute as tentativas em série.

```bash
controle() {
  env "LIBRASIA_TEST_URL=${LIBRASIA_TEST_URL:-http://127.0.0.1:4194}" \
    LIBRASIA_TEST_RECOGNITION=1 LIBRASIA_TEST_SYNC=1 LIBRASIA_TEST_TRIALS=2 \
    LIBRASIA_TEST_START_OFFSET_MS=0 LIBRASIA_TEST_CAPTURE_MS=4200 \
    "LIBRASIA_TEST_VIDEO=data/evidence/moving-sign-fixtures/$1.y4m" \
    "LIBRASIA_EXPECT_TEXT=$2" 'LIBRASIA_TEST_TRANSCRIPT_PREFIX=Texto conferido.' \
    node --test tests/e2e/recognition.test.mjs
}
controle amarelo-s01 amarelo
controle amarelo-s04 amarelo
controle espelho-s01 espelho
controle espelho-s04 espelho
```
