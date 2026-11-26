# Roteiro de validação da demonstração

O revisor independente executa a instalação e a demonstração na versão candidata. Para cada cenário, anota o resultado observado, registros de erro e caminho da evidência. O [protocolo de reconhecimento](protocolo-aceite.md) define partições, métricas e metas. O [roteiro de publicação](publicacao.md) complementa os testes no Android e no iOS.

## Ambiente e preparação

A inspeção local de 26/11/2026 identificou Debian GNU/Linux 13.8, Intel Core i7-13650HX, NVIDIA GeForce RTX 4060 Laptop (8.188 MiB, driver 550.163.01), webcam ACER HD User Facing, Chromium 156.0.8078.79 e Firefox 153.7.0esr. O módulo eSpeak NG do Speech Dispatcher listou a voz local Portuguese (Brazil), em pt-BR. A inspeção confirma a disponibilidade dos recursos do PC. Os resultados de uso físico precisam ser preenchidos após o roteiro.

1. Instale o checkout limpo conforme o README, incluindo os ativos de visão e o modelo candidato. Registre o commit, o SHA-256 dos artefatos, a versão do catálogo e os resultados dos testes.
2. Execute npm ci, npm test, npm run build e npm run check:status. Abra a URL de npm run preview em Chromium. Registre navegador, sistema, resolução da janela, webcam, voz e configuração de aceleração.
3. Use um perfil de navegador limpo para começar sem permissões e sem progresso. Confira os logs do navegador e a aba de rede durante os testes de captura.
4. Se a síntese estiver indisponível no Chromium em Linux, confira o serviço com spd-say -o espeak-ng -L. Experimente um perfil separado iniciado com chromium --enable-speech-dispatcher e registre se a voz é exposta à aplicação. Confirme a língua e a reprodução com a audição do revisor.

## Sequência principal

| Ordem | Fluxo | Procedimento e resultado esperado | Resultado e evidência |
| --- | --- | --- | --- |
| 1 | Abrir uma letra | Acesse **Alfabeto** por teclado. Use Tab para entrar na grade, setas e Home/End. Selecione uma letra com movimento e teste reprodução, pausa, velocidade e repetição. O foco é visível. | Pendente |
| 2 | Frase catalogada | Em **Tradutor**, digite “Meu nome é Anna” e gere a demonstração. Observe a sequência NOME, MEU, pausa e A, N, N, A. | Pendente |
| 3 | Nome isolado | Ative **Soletrar como nome** e digite “Ânna Clara”. Observe a letra base, os dois N e a pausa entre os nomes. | Pendente |
| 4 | Lição | Em **Praticar**, resolva a atividade sem câmera, escolha **Praticar com ajuda** e faça o sinal esperado de **Cinco**. Em nova tentativa, mude a orientação da palma conforme a referência de teste. Confira o aceite e a dica específica. Repita sem avatar em **Tentar com menos ajuda** e confira a persistência do progresso ao recarregar. | Pendente |
| 5 | Área livre | Em **Área livre**, faça dois sinais do catálogo em tentativas distintas sem escolher classe. Confirme duas palavras, edite o texto e use **Ouvir**. A saída de voz usa o texto após a edição. | Pendente |
| 6 | Saiba mais | Sem perder o foco durante a navegação, abra um link externo e confira autoria e destino. Compare a declaração do rodapé com o README. | Pendente |

## Regressões e evidências específicas

| Área | Verificação | Evidência prevista |
| --- | --- | --- |
| Alfabeto e tradutor | Percorra A a Z, incluindo letras em movimento. Revise configuração, orientação, enquadramento, passagem entre letras e repetição. Teste uma palavra catalogada, uma frase fora do catálogo, texto vazio e troca de entrada durante a reprodução. | Resultado por letra, revisão linguística, captura da mensagem de cobertura e reset. |
| Permissão e interrupção | Negue a permissão e observe o erro. Revogue a negação, autorize, confira o vídeo e saia do fluxo. Repita ao trocar de aba. Interrompa a captura e retome por **Ativar câmera**. | Aviso de problema de captura, indicador de câmera e encerramento da trilha. |
| Qualidade e rejeição | Teste um sinal fora do catálogo, sem mãos no quadro, oclusão, pouca luz, gesto comum, repouso e baixa confiança. Use as classes habilitadas, com mão dominante e variantes registradas no protocolo. | Resultado por estrato, sem transcrição para tentativas inconclusivas. |
| Transcrição | Sustente um sinal durante uma única tentativa. Em seguida, repita-o em duas tentativas intencionais. Limpe a transcrição e confira foco e ausência de resíduo. | Uma entrada por tentativa aceita. |
| Voz | Teste texto vazio, voz indisponível e leitura do texto editado. | Texto preservado quando a voz falha, aviso compreensível e registro da audição quando funciona. |
| Privacidade | Observe requisições e armazenamento local antes, durante e depois da câmera. Desative a conexão após o carregamento dos arquivos e repita a inferência. | Requisições de arquivos estáticos, ausência de envio ou persistência dos quadros e progresso local. |
| Links | Abra cada destino de **Saiba mais** em sessão sem login. Verifique o título, autoria ou instituição e URL final. | Sete resultados com data e navegador. |
| Usabilidade | Repita uma vez usando apenas teclado e em janela estreita. | Foco visível, controles acessíveis e retorno após erro. |

Para validar o reconhecimento e as dicas, use pessoas fora do treino e os cenários da revisão de Libras. Registre horário, revisor, commit, versões dos ativos, cenário, resultado esperado, observado e pendências. Use notas da execução ou evidências que respeitem o consentimento das pessoas. A tag local deve apontar para o commit efetivamente validado depois de corrigir e repetir as falhas que bloqueiam o roteiro.

## Verificação automatizada no Chromium

Com Chromium e Node instalados, execute:

~~~bash
node --test tests/e2e/browser.test.mjs
LIBRASIA_TEST_URL=http://127.0.0.1:4173 node --test tests/e2e/browser.test.mjs
LIBRASIA_TEST_URL=http://127.0.0.1:4173 LIBRASIA_TEST_PHYSICAL=1 LIBRASIA_TEST_VOICE=1 node --test tests/e2e/browser.test.mjs
~~~

Se o executável tiver outro nome, informe o caminho em LIBRASIA_CHROMIUM. O teste usa um perfil temporário, servidor HTTP restrito ao loopback e a câmera simulada do navegador. A URL ativa as verificações contra a prévia da aplicação. Ajuste a porta conforme a saída do Vite. As opções PHYSICAL e VOICE ativam respectivamente a captura da webcam sem persistência e a reprodução audível de uma frase de teste. A validação das decisões do classificador e das dicas depende da execução com pessoas sinalizantes.

## Registro da prévia de 26/11/2026

Prévia do commit 51d9829 verificada pela frente independente de QA em um checkout limpo. O ambiente foi o PC acima, com Chromium 156.0.8078.79 em modo headless, Viewport 1280 × 900 e perfil temporário.

| Verificação | Observado |
| --- | --- |
| Instalação e compilação | npm ci, instalação do MediaPipe Holistic float16/1, 26 testes unitários, build de produção e verificação do painel concluídos. O Vite advertiu sobre o tamanho do pacote principal. |
| Navegação e avatar | As cinco rotas abriram, o foco voltou ao conteúdo e a grade A–Z respondeu a Tab, seta e End com foco visível. O canvas usou WebGL 2. Reproduzir, pausar, diminuir a velocidade e repetir responderam aos controles. |
| Tradutor e lição sem câmera | A frase catalogada e a soletração do nome composto criaram sequências. Entrada vazia e fora da cobertura exibiram estados distintos e a troca de texto limpou o player. A resposta correta na atividade sem câmera foi aceita. |
| Captura de mídia | A câmera simulada passou pelos casos de permissão concedida e negada. A webcam física ACER abriu em 640 × 480 na sonda WebRTC. O aplicativo mostrou o erro de negação, retomou após a concessão e liberou a trilha física ao sair da área livre. |
| Voz | A voz Portuguese (Brazil) eSpeak NG foi selecionada com o Speech Dispatcher, e o Chromium sinalizou conclusão ao sintetizar o texto editado na área livre. A edição, o botão de limpar e o retorno do foco à transcrição também passaram. A compreensão do áudio pelo revisor permanece pendente. |
| Largura estreita | A 390 CSS px, a navegação se reorganizou, não houve rolagem horizontal e os painéis de avatar e câmera ficaram em coluna. A captura sem imagem da webcam está em data/evidence/pratica-mobile.png no ambiente local. |
| Saiba mais | As sete URLs originais retornaram HTTP 200 sem redirecionamento em consultas com identificação do Chromium, e os títulos e a autoria ou instituição foram conferidos nas fontes. A aplicação exibiu os sete destinos e a declaração de autoria. |

O classificador e o catálogo ainda aguardavam validação quando essa prévia foi executada. As métricas de classificação e latência, o roteiro de sinais com participantes e a revisão das animações, traduções e dicas permanecem pendentes neste registro. A largura estreita foi testada no Chromium de PC por emulação. O teste em aparelhos Android e iOS permanece pendente.

## Reproduzir uma tentativa com o classificador

Com o manifesto e os pesos instalados, inicie a prévia compilada. O primeiro comando abaixo verifica a rejeição de um quadro sem sinalizante usando o vídeo de teste interno do Chromium. Para verificar uma decisão positiva com a câmera simulada, converta um clipe autorizado de teste em Y4M local. O exemplo usa a classe Espelho. A execução mede a latência do clique de conclusão até a resposta na área livre e verifica que as requisições da página se restringem a arquivos locais.

~~~bash
LIBRASIA_TEST_URL=http://127.0.0.1:4173 LIBRASIA_TEST_RECOGNITION=1 node --test tests/e2e/recognition.test.mjs
mkdir -p data/evidence/camera-fixtures
ffmpeg -i data/minds/raw/12EspelhoSinalizador11-1.mp4 -an -vf 'scale=640:-2,fps=30' -pix_fmt yuv420p data/evidence/camera-fixtures/espelho.y4m
LIBRASIA_TEST_URL=http://127.0.0.1:4173 LIBRASIA_TEST_RECOGNITION=1 LIBRASIA_TEST_VIDEO=data/evidence/camera-fixtures/espelho.y4m LIBRASIA_EXPECT_TEXT=espelho node --test tests/e2e/recognition.test.mjs
~~~

Guarde os clipes fora do Git. Registre a identificação do clipe, o resultado esperado, a decisão obtida e as versões. A latência desta tentativa mede a área livre. Repita a medição da lição com o avatar aberto para o aceite do protocolo.

### Sincronizar a captura e verificar a lição

Um marcador verde de meio segundo anterior à ação permite carregar o extrator antes de iniciar a tentativa medida. A captura continua lendo o clipe em tempo real. O modo de lição também exige que o avatar esteja disponível em WebGL 2.

~~~bash
ffmpeg -i data/minds/raw/10CincoSinalizador09-1.mp4 -an \
  -vf 'scale=640:-2,fps=30,tpad=start_duration=0.5:color=lime' -pix_fmt yuv420p \
  data/evidence/camera-fixtures/cinco-sincronizado.y4m
LIBRASIA_TEST_URL=http://127.0.0.1:4173 LIBRASIA_TEST_RECOGNITION=1 \
  LIBRASIA_TEST_SYNC=1 LIBRASIA_TEST_TARGET=signal-cinco LIBRASIA_EXPECT_TEXT=cinco \
  LIBRASIA_TEST_VIDEO=data/evidence/camera-fixtures/cinco-sincronizado.y4m \
  node --test tests/e2e/recognition.test.mjs
~~~

### Caso exploratório de dois sinais e uma pausa

O caso une dois clipes isolados da pessoa 11 da partição de teste, Cinco e Espelho, com 0,8 s de vídeo preto para representar a ausência de rastreamento. Um marcador verde no começo sincroniza a captura. O resultado esperado é “cinco espelhos”. A origem da mídia é o [MINDS-Libras, versão 1](https://zenodo.org/records/2667329).

~~~bash
ffmpeg -f lavfi -t 0.4 -i 'color=c=lime:size=640x360:rate=30' \
  -i data/minds/raw/10CincoSinalizador11-1.mp4 \
  -f lavfi -t 0.8 -i 'color=c=black:size=640x360:rate=30' \
  -i data/minds/raw/12EspelhoSinalizador11-1.mp4 \
  -filter_complex '[0:v]setsar=1[g];[1:v]scale=640:-2,fps=30,setsar=1[a];[2:v]setsar=1[p];[3:v]scale=640:-2,fps=30,setsar=1[b];[g][a][p][b]concat=n=4:v=1:a=0[out]' \
  -map '[out]' -an -pix_fmt yuv420p data/evidence/camera-fixtures/cinco-pausa-espelho.y4m
LIBRASIA_TEST_URL=http://127.0.0.1:4173 LIBRASIA_TEST_RECOGNITION=1 \
  LIBRASIA_TEST_SEQUENCE=1 LIBRASIA_EXPECT_TEXT='cinco espelhos' \
  LIBRASIA_TEST_VIDEO=data/evidence/camera-fixtures/cinco-pausa-espelho.y4m \
  node --test tests/e2e/recognition.test.mjs
~~~

O ensaio com clipes unidos mede um cenário controlado com pausa. A validação com sinalização contínua natural requer dados anotados para medir erros de segmentação e revisão humana do sentido traduzido.
