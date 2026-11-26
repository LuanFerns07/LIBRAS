# Regressões da área livre no Chromium

Os ensaios verificam a área livre com MediaPipe Holistic e ONNX no Chromium do PC de referência. O build da prévia usou a árvore de aplicação de 17c6d29, o classificador inicial com SHA-256 52bfe58f63fa1adda9815bb32fbb0e59be196e8bf24c3807eba9704cb45bdf6a e limiar 0,495. O manifesto instalado tem SHA-256 8d2e30c7c20d243f717c4fc86d1ac533988cdbb862adf8abff6a1b3fa0818b33. [Roteiro de validação](roteiro-validacao.md) · [Procedência e licença do MINDS-Libras](dados.md)

São regressões dirigidas com clipes conhecidos, repetidos em uma câmera simulada a 640 × 360 e 30 fps. O quadro preto é uma imagem de ausência gerada localmente. A falha e a falta de voz foram provocadas na interface Web Speech do teste. As requisições da página se limitaram a arquivos locais. Essas medições ficam fora da avaliação por pessoa e da observação humana ao vivo.

## Resultados

| Caso | Resultado observado | Log local |
| --- | --- | --- |
| Cinco sustentado até o limite de tempo | 2/2 acrescentaram uma palavra após o fim automático do tempo. A transcrição ficou sem acréscimos durante a coleta e estável por mais 1,2 s de vídeo depois da decisão. | qa-m5-sustentado.log |
| Dois acionamentos intencionais e erro da síntese | 2/2 acrescentaram uma palavra e formaram “cinco cinco”. Após a edição, **Ouvir** recebeu o texto exato e o erro exibido deixou o texto disponível para nova edição. | qa-m5-repetido-erro-voz.log |
| Voz local ausente | 1/1 preservou a edição e permitiu digitar novamente após **Ouvir**. A interface mostrou voz local indisponível. A síntese teve zero chamadas. | qa-m5-voz-ausente.log |
| Vontade S09-4 | 2/2 ficaram inconclusivas por sinal fora do catálogo. O texto “Texto conferido.” foi preservado em ambas. | qa-m5-fora-catalogo.log |
| Quadro preto sem pessoa | 1/1 ficou inconclusiva por ausência de mãos rastreadas e preservou “Texto conferido.”. | qa-m5-sem-maos.log |
| Banco S12-2 em velocidade original | 0/2 rejeições. O modelo aceitou incorretamente Espelho em ambas e acrescentou palavras. A janela medida foi de cerca de 3,85 s em um Y4M de 6,87 s. | qa-m5-baixa-confianca.log |
| Banco S12-2 compactado | 2/2 ficaram inconclusivas por baixa confiança e preservaram “Texto conferido.”. A compactação levou o Y4M a 3,70 s, incluindo o marcador, para apresentar a ação completa. | qa-m5-baixa-banco-s12-2-compacto.log |
| Espelho S09-3 | 2/2 ficaram inconclusivas. O motivo foi baixa confiança na primeira e fora do catálogo na segunda. A asserção que exigia baixa confiança nas duas falhou. | qa-m5-baixa-espelho-s09-3.log |

O caso sustentado foi construído a partir dos primeiros 2,4 s de Cinco S09-1. O quadro final desse recorte foi mantido por mais 4 s para prolongar o gesto observado no vídeo. Cada captura automática encerrou pelo limite de tempo. Duas repetições reutilizaram a mesma mídia.

## Reproduzir localmente

Instale os ativos e inicie a prévia na porta 4193, em um checkout reservado à verificação.

~~~bash
npm ci
npm run setup:vision
npm run setup:model -- data/models/isolated-v1
npm run build
npm run preview -- --host 127.0.0.1 --port 4193 --strictPort
~~~

Com os clipes autorizados em data/minds/raw, prepare os Y4M em outro terminal. A gravação original permanece fora do histórico e os Y4M são derivados para teste local.

~~~bash
m5_out=data/evidence/m5-fixtures
m5_raw=data/minds/raw
mkdir -p "$m5_out"
ffmpeg -threads 1 -filter_threads 1 -i "$m5_raw/10CincoSinalizador09-1.mp4" -an \
  -vf 'trim=duration=2.4,scale=640:-2,fps=30,tpad=start_duration=0.5:stop_mode=clone:stop_duration=4:color=lime' \
  -pix_fmt yuv420p "$m5_out/cinco-sustentado-s09-1.y4m"
ffmpeg -threads 1 -f lavfi -i 'color=c=black:size=640x360:rate=30:duration=2.5' \
  -pix_fmt yuv420p "$m5_out/sem-sinalizante.y4m"

m5_com_marca() {
  ffmpeg -threads 1 -filter_threads 1 -i "$m5_raw/$1.mp4" -an \
    -vf 'scale=640:-2,fps=30,tpad=start_duration=0.5:color=lime' \
    -pix_fmt yuv420p "$m5_out/$2.y4m"
}
m5_com_marca 10CincoSinalizador09-1 cinco-s09-1
m5_com_marca 20VontadeSinalizador09-4 vontade-s09-4
m5_com_marca 07BancoSinalizador12-2 banco-s12-2
m5_com_marca 12EspelhoSinalizador09-3 espelho-s09-3
ffmpeg -threads 1 -filter_threads 1 -i "$m5_raw/07BancoSinalizador12-2.mp4" -an \
  -vf 'setpts=0.5*PTS,scale=640:-2,fps=30,tpad=start_duration=0.5:color=lime' \
  -pix_fmt yuv420p "$m5_out/banco-s12-2-compacto.y4m"
~~~

Execute um ensaio de cada vez. As opções abaixo conservam o mesmo classificador e usam a câmera simulada do Chromium. Quando o roteiro seleciona uma tentativa inconclusiva, a asserção confere tanto o motivo quanto a preservação do texto.

~~~bash
m5_run() {
  LIBRASIA_TEST_URL=http://127.0.0.1:4193 LIBRASIA_TEST_RECOGNITION=1 \
    env "$@" node --test tests/e2e/recognition.test.mjs
}
m5_run LIBRASIA_TEST_SYNC=1 LIBRASIA_TEST_AUTO_FINISH=1 LIBRASIA_TEST_TRIALS=2 \
  LIBRASIA_EXPECT_TEXT=cinco "LIBRASIA_TEST_VIDEO=$m5_out/cinco-sustentado-s09-1.y4m"
m5_run LIBRASIA_TEST_SYNC=1 LIBRASIA_TEST_VOICE_MODE=error LIBRASIA_TEST_TRIALS=2 \
  LIBRASIA_EXPECT_TEXT=cinco "LIBRASIA_TEST_VIDEO=$m5_out/cinco-s09-1.y4m"
m5_run LIBRASIA_TEST_SYNC=1 LIBRASIA_TEST_VOICE_MODE=missing \
  LIBRASIA_EXPECT_TEXT=cinco "LIBRASIA_TEST_VIDEO=$m5_out/cinco-s09-1.y4m"
m5_run LIBRASIA_TEST_SYNC=1 LIBRASIA_TEST_TRIALS=2 LIBRASIA_EXPECT_REASON=out-of-catalog \
  'LIBRASIA_TEST_TRANSCRIPT_PREFIX=Texto conferido.' "LIBRASIA_TEST_VIDEO=$m5_out/vontade-s09-4.y4m"
m5_run LIBRASIA_EXPECT_REASON=no-hand \
  'LIBRASIA_TEST_TRANSCRIPT_PREFIX=Texto conferido.' "LIBRASIA_TEST_VIDEO=$m5_out/sem-sinalizante.y4m"
m5_run LIBRASIA_TEST_SYNC=1 LIBRASIA_TEST_TRIALS=2 LIBRASIA_EXPECT_REASON=low-confidence \
  'LIBRASIA_TEST_TRANSCRIPT_PREFIX=Texto conferido.' "LIBRASIA_TEST_VIDEO=$m5_out/banco-s12-2-compacto.y4m"
~~~

Para reproduzir a tentativa de baixa confiança com o arquivo de velocidade original, troque o Y4M do último comando por banco-s12-2.y4m. A aceitação observada faz falhar a asserção de rejeição. Troque por espelho-s09-3.y4m para investigar a variação de motivo no mesmo estado inconclusivo.

Os logs da execução de referência ficam em data/evidence. A audição por uma pessoa, a sinalização diretamente na webcam e os critérios de aceitação de sinais e rejeição continuam no protocolo da demonstração.
