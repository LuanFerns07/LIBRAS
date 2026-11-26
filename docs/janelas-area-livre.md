# Capturas parciais na área livre

O teste reproduz a falsa aceitação observada em Banco S12-2 e verifica o efeito do início e da duração da captura. Usa uma câmera simulada no Chromium, os clipes conhecidos do MINDS em velocidade original e o classificador inicial. [Regressões anteriores e procedência dos clipes](regressao-area-livre.md)

## Protocolo

Cada cenário tem duas reproduções no mesmo navegador. As janelas foram fixadas antes da medição. O tempo zero é o primeiro quadro verde observado após a transição em um ciclo da mídia. O clique de abertura ocorre no primeiro quadro que atinge o deslocamento planejado, e o de conclusão ocorre no primeiro que atinge a duração planejada desde a abertura. O teste confere os tempos com tolerância de 300 ms para atraso de entrega de quadros e exige conclusão manual. O marcador ocupa cerca de 500 ms antes do início do vídeo de origem.

| Clipe | Início desde o marcador | Duração planejada | Desfecho esperado |
| --- | ---: | ---: | --- |
| Banco S12-2 | 0 ms | 1.750 ms | Inconclusivo e texto intacto |
| Banco S12-2 | 0 ms | 2.800 ms | Inconclusivo e texto intacto |
| Banco S12-2 | 0 ms | 3.850 ms | Inconclusivo e texto intacto |
| Banco S12-2 | 1.200 ms | 3.850 ms | Inconclusivo e texto intacto |
| Banco S12-2 | 2.400 ms | 3.800 ms | Inconclusivo e texto intacto |
| Espelho S11-1 | 0 ms | 3.850 ms | Uma palavra Espelho por tentativa |
| Cinco S09-1 | 0 ms | 3.850 ms | Uma palavra Cinco por tentativa |

A janela de 3.850 ms iniciada no marcador reproduz o cenário que motivou o ensaio. As janelas mais curtas e deslocadas ajudam a localizar o erro. Os dois controles verificam reconhecimento e suporte à inserção de palavras em texto preexistente. Uma divergência de estado ou de transcrição faz o teste falhar após registrar as duas tentativas. Uma falha de instrumentação fica identificada separadamente. O ensaio é uma regressão dirigida com três vídeos conhecidos. A revisão presencial continua no roteiro da demonstração.

## Resultado com o classificador inicial

O build local usou a árvore de aplicação de `c79333d`, o Chromium 156.0.8078.79 e o classificador inicial com SHA-256 `52bfe58f63fa1adda9815bb32fbb0e59be196e8bf24c3807eba9704cb45bdf6a` e limiar 0,495. As 14 medições respeitaram a tolerância dos limites e passaram nas verificações de captura e de rede.

| Clipe | Janelas reais desde o marcador, ms | Resultado das duas reproduções | Log local em data/evidence |
| --- | --- | --- | --- |
| Banco, 0 e 1.750 ms | 0–1.800 e 0–1.867 | Falsa aceitação como Espelho em 2/2 | qa-janelas-v1-banco-0-1750.log |
| Banco, 0 e 2.800 ms | 0–2.800 nas duas | Falsa aceitação como Espelho em 2/2 | qa-janelas-v1-banco-0-2800.log |
| Banco, 0 e 3.850 ms | 0–3.967 e 0–3.867 | Falsa aceitação como Espelho em 2/2 | qa-janelas-v1-banco-0-3850.log |
| Banco, 1.200 e 3.850 ms | 1.200–5.067 e 1.200–5.100 | Falsa aceitação como Espelho em 2/2 | qa-janelas-v1-banco-1200-3850.log |
| Banco, 2.400 e 3.800 ms | 2.400–6.200 e 2.400–6.233 | Falsa aceitação como Amarelo em 2/2 | qa-janelas-v1-banco-2400-3800.log |
| Espelho, 0 e 3.850 ms | 0–3.867 e 0–3.933 | Acerto em 2/2 | qa-janelas-v1-espelho-0-3850.log |
| Cinco, 0 e 3.850 ms | 0–3.933 e 0–3.900 | Acerto em 2/2 | qa-janelas-v1-cinco-0-3850.log |

As dez reproduções de Banco falharam no estado e na transcrição, sempre com um acréscimo por tentativa. Com início em 2.400 ms, a palavra exibida passou de Espelho para Amarelo. A ocorrência em cinco janelas do mesmo vídeo ajuda a caracterizar o erro e fica pendente de correção. Os controles conservaram o prefixo e acrescentaram a palavra esperada em cada uma das quatro reproduções.

## Reproduzir

Prepare os três Y4M a partir dos MP4 autorizados em `data/minds/raw`. O FFmpeg acrescenta o marcador inicial e ajusta escala e FPS, preservando a velocidade da mídia.

```bash
mkdir -p data/evidence/janelas-fixtures
fixture() {
  ffmpeg -threads 1 -filter_threads 1 -i "data/minds/raw/$1.mp4" -an \
    -vf 'scale=640:-2,fps=30,tpad=start_duration=0.5:color=lime' \
    -pix_fmt yuv420p "data/evidence/janelas-fixtures/$2.y4m"
}
fixture 07BancoSinalizador12-2 banco
fixture 12EspelhoSinalizador11-1 espelho
fixture 10CincoSinalizador09-1 cinco
```

Inicie a aplicação local com os pesos da versão inicial em um checkout reservado à verificação.

```bash
LIBRASIA_PORTA=4193 ./scripts/executar-local.sh
```

No terminal de teste, informe os caminhos locais dos três Y4M.

```bash
banco=data/evidence/janelas-fixtures/banco.y4m
espelho=data/evidence/janelas-fixtures/espelho.y4m
cinco=data/evidence/janelas-fixtures/cinco.y4m

captura() {
  env LIBRASIA_TEST_URL=http://127.0.0.1:4193 LIBRASIA_TEST_RECOGNITION=1 \
    LIBRASIA_TEST_SYNC=1 LIBRASIA_TEST_TRIALS=2 \
    "LIBRASIA_TEST_VIDEO=$1" "LIBRASIA_TEST_START_OFFSET_MS=$2" \
    "LIBRASIA_TEST_CAPTURE_MS=$3" "LIBRASIA_EXPECT_TEXT=${4-}" \
    'LIBRASIA_TEST_TRANSCRIPT_PREFIX=Texto conferido.' \
    node --test tests/e2e/recognition.test.mjs
}
captura "$banco" 0 1750
captura "$banco" 0 2800
captura "$banco" 0 3850
captura "$banco" 1200 3850
captura "$banco" 2400 3800
captura "$espelho" 0 3850 espelho
captura "$cinco" 0 3850 cinco
```

A saída mostra o intervalo entregue pelo navegador, a quantidade de quadros processados, a decisão e a transcrição. Execute uma janela por vez para evitar concorrência entre navegadores.
