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

O candidato com flexão dos dedos, de SHA-256 `8e38930e3fb1ef7cbc308cd736f70a49a6882941bb9cbbd424c06d598b1b980c`, também aceitou incorretamente a captura parcial de Banco como Espelho em duas reproduções. Esse reteste usou uma prévia separada da aplicação e ficou registrado no log local qa-flexao-banco.log.

Uma reprodução posterior, com tempo de mídia observado e cinco janelas predefinidas, registrou dez falsas aceitações com o modelo inicial. Os controles de Cinco e Espelho passaram nas duas tentativas de cada sinal. [Protocolo e resultados por janela](janelas-area-livre.md)

## Edição durante a leitura

Na prévia `aa32d96`, editar o campo durante a fala mantinha a síntese da versão anterior. Com `50ad447`, a edição interrompeu a síntese e mostrou o aviso de interrupção. Um novo clique em **Ouvir** enviou à voz local eSpeak NG em pt-BR o texto “Transcrição atualizada.”, e o Chromium informou a conclusão. O teste unitário verificou que o evento atrasado da fala cancelada não altera o estado da nova leitura.

No mesmo pacote, o vídeo de Cinco S09-1 foi reconhecido e um erro simulado da voz preservou o texto para nova edição. O quadro preto resultou em **Tentativa inconclusiva** e preservou “Texto conferido.”. Os logs locais ficam em `data/evidence/demonstracao`, com os nomes `fisico-50ad447.log`, `cinco-erro-voz-50ad447.log` e `sem-maos-50ad447.log`. [Teste de voz no Chromium](../tests/e2e/browser.test.mjs) · [Teste de reconhecimento](../tests/e2e/recognition.test.mjs)

Para retestar a edição com a voz local na prévia do Linux, execute:

~~~bash
LIBRASIA_TEST_URL=http://127.0.0.1:4177 LIBRASIA_TEST_VOICE=1 node --test tests/e2e/browser.test.mjs
~~~

## Transcrição ao navegar

No pacote `180711c`, visitar o Alfabeto e voltar para a Área livre deixava o campo de transcrição vazio. No pacote `bdbccc4`, a navegação interna conserva o texto na memória da página. Ao sair da Área livre, a câmera é liberada. Ao voltar, a câmera fica desligada e o texto volta disponível para editar e ouvir. **Limpar texto** e recarregar a página descartam a transcrição.

No Chromium, o teste com a webcam Acer confirmou que a trilha terminou ao sair. O texto editado reapareceu ao voltar, inclusive com quebra de linha. O armazenamento local e o de sessão permaneceram iguais. O teste conferiu também o botão de limpar e o campo vazio após recarregar. O log fica em `data/evidence/demonstracao/transcricao-navegacao-bdbccc4.log`. [Teste de navegador](../tests/e2e/browser.test.mjs)

No roteiro com gravações, duas tentativas reconheceram Cinco e Espelho. “cinco espelho” reapareceu depois de visitar o Alfabeto. A voz local em pt-BR concluiu a leitura da versão editada. Na prévia experimental, o controle Espelho + Amarelo ainda ficou inconclusivo e preservou o texto até a confirmação da sugestão revisada. Os logs da mesma compilação são `roteiro-bdbccc4.log` e `revisao-glosas-bdbccc4.log`. [Roteiro integrado](roteiro-validacao.md#roteiro-integrado-em-uma-sessão-do-chromium) · [Controle da sinalização contínua](sinalizacao-continua.md#concordância-com-cinco)

## Concordância em sequências com pausas

O mesmo vídeo de Cinco e Aluno de S11, com 800 ms de quadro preto entre as tomadas, acrescentou “cinco aluno” no pacote `ff7969b` e “cinco alunos” no pacote `2a80645`. As duas execuções fizeram duas chamadas ao classificador na mesma janela de 7,1 s e preservaram o texto anterior. O controle Cinco + Espelho voltou a acrescentar “cinco espelhos”. O teste unitário também cobre “cinco espelhos amarelos” e mantém a saída das sequências incompletas. [Recortes do MINDS-Libras](../ml/evidence/ufsc-boundaries/minds-pairs-protocol.json) · [Teste no navegador](../tests/e2e/recognition.test.mjs)

Com os clipes em `data/minds-expanded/raw`, prepare a câmera de arquivo e rode a tentativa no Chromium.

~~~bash
saida=data/continuous-natural-eval/pauses
mkdir -p "$saida"
ffmpeg -nostdin -threads 1 -ss 0.300 -t 2.900 -i data/minds-expanded/raw/10CincoSinalizador11-1.mp4 \
  -threads 1 -ss 0.600 -t 3 -i data/minds-expanded/raw/02AlunoSinalizador11-1.mp4 \
  -filter_complex_threads 1 \
  -filter_complex '[0:v]scale=640:360,setsar=1,fps=30,tpad=start_duration=0.5:start_mode=add:stop_duration=0.8:stop_mode=add:color=black[a];[1:v]scale=640:360,setsar=1,fps=30,tpad=stop_duration=1.2:color=black[b];[a][b]concat=n=2:v=1:a=0,drawbox=x=0:y=0:w=iw:h=ih:color=lime:t=fill:enable=lt(t\,0.5)[out]' \
  -map '[out]' -pix_fmt yuv420p "$saida/s11-cinco-aluno-800-sync.y4m"
LIBRASIA_TEST_URL=http://127.0.0.1:4177 LIBRASIA_TEST_RECOGNITION=1 LIBRASIA_TEST_SEQUENCE=1 \
  LIBRASIA_TEST_CAPTURE_MS=7100 LIBRASIA_EXPECT_CLASSIFIER_CALLS=2 \
  LIBRASIA_EXPECT_TEXT='cinco alunos' LIBRASIA_TEST_TRANSCRIPT_PREFIX='Texto conferido.' \
  LIBRASIA_TEST_VIDEO="$saida/s11-cinco-aluno-800-sync.y4m" node --test tests/e2e/recognition.test.mjs
~~~

O SHA-256 do Y4M é `064460862a54f6f3920068f240f79df30e0afa7b57d84cbcd78091cca047f568`. Os logs e relatórios das duas versões ficam em `data/continuous-natural-eval/pauses/`. O ensaio usou clipes gravados.

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

## Aceite técnico de M5

A Área livre passou a ler o manifesto antes de ativar a câmera. O teste confirmou Cinco, Espelho, Amarelo e Aluno na lista, com a câmera desligada e sem carregar os pesos ONNX. Ao simular a falta do manifesto, o navegador mostrou que o modelo local estava indisponível e manteve o texto editável. [Teste no Chromium](../tests/e2e/recognition.test.mjs)

Com gravações, duas tentativas distintas produziram “cinco espelho” e a voz local em pt-BR concluiu a leitura da edição. A sequência com pausa produziu “cinco alunos”. Duas tentativas de Cinco sustentado acrescentaram uma palavra cada, a ausência de mãos preservou a transcrição e a ausência simulada de voz preservou a edição. Os logs ficam em `data/evidence/demonstracao/m5-area-livre/`. O teste confirmou o término da síntese pelo navegador. A audição por pessoas e a coleta de transições adicionais ficam nas pendências. [Preparar Cinco e Espelho](roteiro-validacao.md#dois-sinais-em-tentativas-isoladas-com-voz-local) · [Pendências de M5](pendencias-futuras.md#m4-e-m5--alfabeto-sinais-área-livre-e-voz)
