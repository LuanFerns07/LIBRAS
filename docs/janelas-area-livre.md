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

## Reproduzir

Prepare os Y4M de Banco S12-2, Espelho S11-1 e Cinco S09-1 conforme o [roteiro de regressões](regressao-area-livre.md). Use a mesma transformação de marcador inicial, escala e FPS para cada clipe, sem acelerar a mídia. Inicie a aplicação local com os pesos da versão inicial em um checkout reservado à verificação.

```bash
LIBRASIA_PORTA=4193 ./scripts/executar-local.sh
```

No terminal de teste, informe os caminhos locais dos três Y4M.

```bash
banco=data/evidence/m5-fixtures/banco-s12-2.y4m
espelho=data/evidence/camera-fixtures/12EspelhoSinalizador11-1-sync.y4m
cinco=data/evidence/camera-fixtures/10CincoSinalizador09-1-sync.y4m

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
