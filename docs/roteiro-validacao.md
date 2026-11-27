# Roteiro de validação da demonstração

O revisor independente executa a instalação e a demonstração na versão candidata. Para cada cenário, anota o resultado observado, registros de erro e caminho da evidência. O [protocolo de reconhecimento](protocolo-aceite.md) define partições, métricas e metas. O [roteiro de publicação](publicacao.md) complementa os testes no Android e no iOS.

## Ambiente e preparação

A inspeção local de 26/11/2026 identificou Debian GNU/Linux 13.8, Intel Core i7-13650HX, NVIDIA GeForce RTX 4060 Laptop (8.188 MiB, driver 550.163.01), webcam ACER HD User Facing, Chromium 156.0.8078.79 e Firefox 153.7.0esr. O módulo eSpeak NG do Speech Dispatcher listou a voz local Portuguese (Brazil), em pt-BR. A inspeção confirma a disponibilidade dos recursos do PC. Os resultados de uso físico precisam ser preenchidos após o roteiro.

1. Instale o checkout limpo conforme o README, incluindo os ativos de visão e o modelo candidato. Registre o commit, o SHA-256 dos artefatos, a versão do catálogo e os resultados dos testes.
2. Execute npm ci, npm test, npm run build e npm run check:status. Abra a URL de npm run preview em Chromium. Registre navegador, sistema, resolução da janela, webcam, voz e configuração de aceleração.
3. Use um perfil de navegador limpo para começar sem permissões e sem progresso. Confira os logs do navegador e a aba de rede durante os testes de captura.
4. Se a síntese estiver indisponível no Chromium em Linux, confira o serviço com spd-say -o espeak-ng -L. Experimente um perfil separado iniciado com chromium --enable-speech-dispatcher e registre se a voz é exposta à aplicação. Confirme a língua e a reprodução com a audição do revisor.

## Prática guiada mínima (M1 e M2)

No Chromium, abra **Praticar**, escolha **Amarelo** e entre em **Praticar com ajuda**. Reproduza o avatar, ative a câmera e permita o acesso. Use **Iniciar tentativa** e **Concluir tentativa** para fazer um sinal por vez. [Abrir Praticar](http://127.0.0.1:4177/#praticar)

| Cenário | Resultado técnico no pacote `dfb045b` | Origem |
| --- | --- | --- |
| Execução esperada | **Sinal reconhecido** para Amarelo. Uma chamada ao classificador. | Gravação MINDS S01-1 |
| Trajetória contrária | **Ajuste sugerido** com a dica para deslocar o indicador da testa em direção ao nariz. Uma chamada ao classificador. | Mesma gravação com os quadros em ordem inversa |
| Ausência de mãos | **Tentativa inconclusiva** com orientação para mostrar a mão e os ombros. Zero chamadas ao classificador. | Vídeo de quadro preto |
| Permissão negada e captura interrompida | **Problema de captura** na negação e na revogação durante a tentativa. A nova permissão abriu outra trilha e a câmera foi liberada ao sair da prática. | Webcam ACER HD User Facing a 640 × 480 |

O avatar em WebGL e a webcam física ficaram lado a lado na janela de 1.280 × 900. A sessão de interrupção solicitou apenas arquivos estáticos do servidor local. Os logs estão em `data/evidence/demonstracao/m1-m2-dfb045b/`. [Reprodução da dica](#dica-de-trajetória-de-amarelo)

Para o aceite com pessoa sinalizante, registre a execução esperada e a correção intencional na webcam e peça a uma pessoa fluente em Libras que confira a dica. Na Área livre, registre a retirada e o retorno de uma mão, a oclusão e o alinhamento dos pontos ao redimensionar. Na coleta de M1, registre também repouso, movimento cotidiano e sinais fora do catálogo com pessoas independentes, incluindo chamadas ao classificador. [Ficha local](http://127.0.0.1:4177/validacao/) · [Como registrar](validacao-ao-vivo.md)

## Sequência principal

Os resultados da sessão com participantes ficam nesta tabela. A execução automatizada, com as mesmas telas na ordem do roteiro, está registrada abaixo. [Roteiro integrado](#roteiro-integrado-em-uma-sessão-do-chromium)

| Ordem | Fluxo | Procedimento e resultado esperado | Aceite manual |
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
| Transcrição | Sustente um sinal durante uma tentativa e repita-o em duas tentativas intencionais. Visite o Alfabeto, volte à Área livre e confira o texto e a câmera. Limpe a transcrição e confira o foco. | Uma entrada por tentativa aceita. O texto acompanha a navegação na mesma página, e a câmera é liberada ao sair da Área livre. |
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

## Verificação técnica de 27 de novembro de 2026

O teste usou a prévia `b95a5da` no Debian 13.8, em Chromium 156.0.8078.79 com perfil temporário e janela de 1280 × 900. Catálogo e animações `librasia-v0.1-draft`. Modelo combinado de sinais com SHA-256 `a8e991d9cfedc23a2cf899ed68799c8006682f3306cf6fc0006eacdec1e62f63`. Modelo principal do alfabeto com SHA-256 `39b34d3eba08435932701b2fc8be791e6896a2b1ea2d20c768a594d13f13f544`.

| Etapa | Resultado técnico | Evidência |
| --- | --- | --- |
| 1. Alfabeto | As 27 letras puderam ser selecionadas. A grade respondeu ao teclado e o avatar de Z respondeu a reproduzir, pausar, mudar velocidade e repetir. | `browser-roteiro.log` |
| 2. Frase | A reprodução de “Meu nome é Anna” exibiu Nome → Meu → Pausa → A → N → N → A. | `browser-roteiro.log` |
| 3. Nome isolado | A reprodução de “Ânna Clara” exibiu A → N → N → A → Pausa → C → L → A → R → A. | `browser-roteiro.log` |
| 4. Lição | O exercício sem câmera aceitou a resposta e recuperou a sugestão de revisão após recarregar. O clipe Cinco S09-1 foi reconhecido com o avatar aberto. A regra da dica de palma passou no teste unitário. Falta observar a dica durante uma tentativa com correção intencional. | `browser-roteiro.log`, `licao-cinco.log` e `tests/lesson.test.js` |
| 5. Área livre | Cinco e Espelho foram reconhecidos em tentativas isoladas. A transcrição gerada pôde ser editada e a voz local eSpeak NG em pt-BR sinalizou conclusão. Um ensaio adicional acrescentou “cinco espelhos” no modo com pausa. Banco S12-2 ficou inconclusivo em duas capturas e preservou o texto. A repetição de Cinco passou offline, com a mesma trilha ativa e sem novas requisições. | `dois-sinais-e-voz.log`, `area-livre-sequencia.log`, `area-livre-banco.log`, `area-livre-cinco.log` |
| 6. Saiba mais | O clique no Dicionário do INES abriu o destino. O Chromium mostrou o título “Dicionário Libras” e a lista do app exibiu a autoria. | `link-ines.log` e [Dicionário Libras](https://dicionario.ines.gov.br/) |

Os logs locais ficam em `data/evidence/demonstracao/`. O navegador abriu e liberou a webcam física Acer a 640 × 480 e retomou a captura após conceder a permissão. O classificador recebeu os clipes gravados do MINDS-Libras pelo dispositivo de teste do Chromium. A compreensão do áudio, o reconhecimento com sinalizantes ao vivo e a revisão linguística permanecem no aceite manual. [Origem dos clipes](https://zenodo.org/records/2667329) · [Testes de navegador](../tests/e2e/browser.test.mjs) · [Testes do reconhecimento](../tests/e2e/recognition.test.mjs)

Com gravação, os pontos acompanharam as duas mãos antes, durante e depois da tentativa. O teste verificou espelhamento, redimensionamento, perda e retorno da mão e o controle de exibição. O N e a passagem de M para N também passaram na Área livre e em Praticar com os clipes da Unesp. Logs locais `pontos.log` e `alfabeto-n.log`. [Sobreposição](teste-pontos-ao-vivo.md) · [Referência para o reteste de N](dados-alfabeto.md#confirmação-específica-de-n-na-prévia)

### Retomada após revogar a permissão da câmera

Na prévia `599f341`, o teste revogou a permissão pelo DevTools do Chromium durante uma tentativa na Área livre. A trilha da webcam ACER HD User Facing (640 × 480) terminou, o app exibiu **Problema de captura** e preservou o texto digitado. Com a permissão bloqueada, o botão de câmera exibiu o aviso correspondente. Após conceder a permissão novamente, o app abriu outra trilha, iniciou uma nova tentativa e liberou a câmera ao navegar para **Saiba mais**.

O mesmo teste, com o clipe Cinco S09-1 a 640 × 360, confirmou que o modelo reconheceu o sinal depois da retomada e acrescentou “cinco” uma vez ao texto preservado. A sessão com sinalizantes e a avaliação das dicas permanecem no roteiro manual. [Teste automatizado](../tests/e2e/camera-recovery.test.mjs) · [Preparação do clipe](#sincronizar-a-captura-e-verificar-a-lição)

Com a prévia local aberta, execute os dois cenários em sequência.

~~~bash
LIBRASIA_TEST_URL=http://127.0.0.1:4177 LIBRASIA_TEST_CAMERA_RECOVERY=1 \
  LIBRASIA_TEST_PHYSICAL=1 node --test tests/e2e/camera-recovery.test.mjs
LIBRASIA_TEST_URL=http://127.0.0.1:4177 LIBRASIA_TEST_CAMERA_RECOVERY=1 \
  LIBRASIA_TEST_VIDEO=data/evidence/camera-fixtures/cinco-sincronizado.y4m \
  node --test tests/e2e/camera-recovery.test.mjs
~~~

Os resultados ficam nos logs locais `camera-retomada-fisica-599f341.log` e `camera-retomada-cinco-599f341.log`, em `data/evidence/demonstracao/`.

### Lição completa de Cinco no Chromium

O teste voltou à atividade após uma resposta incorreta, aceitou a resposta esperada e abriu **Praticar com ajuda** pela revisão. A prévia reconheceu o clipe Cinco S09-1 nessa etapa e em **Tentar com menos ajuda**, com o painel do avatar oculto e a câmera ativa na passagem entre etapas. O contador mostrou um sinal concluído. Depois de recarregar, o progresso reapareceu e a câmera voltou desligada. O teste unitário também confirmou que a revisão abre a prática de memória quando a etapa guiada já foi concluída. A correção intencional por uma pessoa sinalizante e a revisão linguística da dica continuam pendentes.

Com o clipe preparado com o marcador verde, como na seção de sincronização abaixo, execute:

~~~bash
LIBRASIA_TEST_URL=http://127.0.0.1:4177 LIBRASIA_TEST_RECOGNITION=1 LIBRASIA_TEST_SYNC=1 \
  LIBRASIA_TEST_LESSON_FLOW=1 LIBRASIA_TEST_TRIALS=2 LIBRASIA_TEST_TARGET=signal-cinco LIBRASIA_EXPECT_TEXT=cinco \
  LIBRASIA_TEST_VIDEO=data/evidence/camera-fixtures/10CincoSinalizador09-1-sync.y4m \
  node --test tests/e2e/recognition.test.mjs
~~~

O modelo carregado foi o mesmo verificado na demonstração. O log da lição fica em `data/evidence/demonstracao/licao-completa.log`. [Clipe do MINDS-Libras](https://zenodo.org/records/2667329) · [Teste da lição](../tests/e2e/recognition.test.mjs)

### Dica de trajetória de Amarelo

Na prática guiada, o Chromium reconheceu Amarelo S01-1 em velocidade original. Ao receber o recorte com os quadros em ordem inversa, o mesmo modelo exibiu “Desloque o indicador da testa em direção ao nariz” nas três tentativas. O progresso registrou as dicas e manteve a prática guiada pendente. Em outro recorte invertido, S04-1, o aplicativo mostrou baixa confiança. São ensaios técnicos com gravações de treino e trajetória alterada. A adequação da dica a um erro intencional feito na webcam permanece no roteiro com sinalizantes.

Para reproduzir a dica, execute na raiz com os clipes locais do MINDS-Libras e a prévia na porta 4177.

~~~bash
mkdir -p data/evidence/demonstracao
ffmpeg -filter_threads 1 -ss 0.70 -i data/minds-expanded/raw/03AmareloSinalizador01-1.mp4 \
  -an -vf 'scale=640:-2,fps=30,trim=duration=3.45,reverse,tpad=start_duration=0.5:color=lime' \
  -pix_fmt yuv420p data/evidence/demonstracao/amarelo-01-invertido.y4m
LIBRASIA_TEST_URL=http://127.0.0.1:4177 LIBRASIA_TEST_RECOGNITION=1 LIBRASIA_TEST_SYNC=1 \
  LIBRASIA_TEST_TARGET=signal-amarelo LIBRASIA_TEST_TRIALS=3 \
  LIBRASIA_TEST_EXPECT_HINT='Desloque o indicador da testa em direção ao nariz.' \
  LIBRASIA_TEST_VIDEO=data/evidence/demonstracao/amarelo-01-invertido.y4m \
  node --test tests/e2e/recognition.test.mjs
~~~

Os logs ficam em `data/evidence/demonstracao`, nos arquivos `aceite-amarelo.log`, `dica-amarelo.log` e `amarelo-baixa-confianca.log`. [Recortes em velocidade original](sinais-com-movimento-browser.md) · [Origem dos clipes](https://zenodo.org/records/2667329)

### Roteiro integrado em uma sessão do Chromium

Em 27/11/2026, a compilação `8430fe0` passou as seis etapas na mesma aba e com um perfil limpo. O ambiente foi Debian 13.8, Chromium 156.0.8078.79, janela de 1.280 × 900 e voz local eSpeak NG em pt-BR. O catálogo e o avatar eram `librasia-v0.1-draft`. O SHA-256 do classificador combinado começa com `a8e991d9`. O manifesto começa com `036cfed2`, e o modelo principal do alfabeto, com `39b34d3e`.

| Ordem | Resultado |
| --- | --- |
| 1 | A grade respondeu ao teclado, selecionou Z e exibiu as 27 letras. Reprodução, pausa, velocidade e repetição funcionaram. |
| 2 | “Meu nome é Anna” exibiu Nome → Meu → Pausa → A → N → N → A. |
| 3 | “Ânna Clara” exibiu A → N → N → A → Pausa → C → L → A → R → A. |
| 4 | Após a atividade sem câmera, a prática guiada reconheceu Amarelo no recorte original e mostrou a dica de trajetória no recorte invertido. |
| 5 | Duas tentativas isoladas transcreveram “cinco espelho”. A voz local concluiu a leitura depois de editar o texto para “Cinco e espelho.” |
| 6 | O botão de navegação manteve o foco no conteúdo. O link abriu o Dicionário Libras do INES e a lista do app exibiu os autores. |

A passagem da prática para a Área livre encerrou a primeira trilha de câmera. A segunda foi encerrada ao abrir Saiba mais. Até o clique no link externo, o navegador solicitou apenas arquivos locais. Os sinais vieram de gravações e o Chromium informou a conclusão da voz. A compreensão do áudio e a adequação da dica com sinalizantes na webcam seguem na tabela de aceite manual. As duas execuções passaram, com logs em `data/evidence/demonstracao/roteiro-completo.log` e `data/evidence/demonstracao/roteiro-completo-reteste.log`. [Teste do navegador](../tests/e2e/browser.test.mjs) · [Dicionário Libras](https://dicionario.ines.gov.br/)

Para repetir, prepare o Amarelo original conforme o teste de movimento, o recorte invertido conforme a seção anterior, e os clipes Cinco S09-1 e Espelho S11-1 conforme a seção de sincronização. Os quatro arquivos começam com meio segundo de verde e têm 640 × 360 a 30 fps. No arquivo final, cada cor identifica o início de uma tentativa. A prévia precisa estar servindo o classificador combinado. O teste acessa o dicionário do INES na última etapa. [Preparação do recorte original](sinais-com-movimento-browser.md#reproduzir) · [Sincronização com marcador](#sincronizar-a-captura-e-verificar-a-lição)

~~~bash
fixtures=data/evidence
mkdir -p "$fixtures/camera-fixtures"
for clip in 10CincoSinalizador09-1 12EspelhoSinalizador11-1; do
  ffmpeg -i "data/minds/raw/$clip.mp4" -an \
    -vf 'scale=640:-2,fps=30,tpad=start_duration=0.5:color=lime' -pix_fmt yuv420p \
    "$fixtures/camera-fixtures/$clip-sync.y4m"
done
ffmpeg -filter_complex_threads 1 \
  -i "$fixtures/moving-sign-fixtures/amarelo-s01.y4m" \
  -i "$fixtures/demonstracao/amarelo-01-invertido.y4m" \
  -i "$fixtures/camera-fixtures/10CincoSinalizador09-1-sync.y4m" \
  -i "$fixtures/camera-fixtures/12EspelhoSinalizador11-1-sync.y4m" \
  -filter_complex "[0:v]setsar=1[g];[1:v]drawbox=color=blue:t=fill:enable='lt(t,0.5)',setsar=1[b];[2:v]drawbox=color=magenta:t=fill:enable='lt(t,0.5)',setsar=1[m];[3:v]drawbox=color=red:t=fill:enable='lt(t,0.5)',setsar=1[r];[g][b][m][r]concat=n=4:v=1:a=0[out]" \
  -map '[out]' -pix_fmt yuv420p "$fixtures/demonstracao/roteiro-completo.y4m"
LIBRASIA_TEST_URL=http://127.0.0.1:4177 LIBRASIA_TEST_DEMO_VIDEO="$fixtures/demonstracao/roteiro-completo.y4m" \
  node --test tests/e2e/browser.test.mjs
~~~

### Conferência dos sete links de Saiba mais

Em 27/11/2026, o Chromium 156.0.8078.79 abriu os sete destinos abaixo a partir do pacote local `d473dc4`, em um perfil sem login. Cada destino abriu em outra aba e respondeu com HTTP 200. A linha de autoria ou instituição do aplicativo foi conferida no conteúdo das páginas.

| Referência | Autoria ou instituição | Destino confirmado |
| --- | --- | --- |
| Perfil de Karin Strobel | Iphan, Inventário Nacional da Diversidade Linguística | [Karin Strobel](https://indl.iphan.gov.br/pessoas-de-referencia/karin-strobel/) |
| As imagens do outro sobre a cultura surda | Karin Strobel, Editora da UFSC | [Editora da UFSC](https://editora.ufsc.br/2016/10/10/lancamento-as-imagens-do-outro-sobre-a-cultura-surda/) |
| Língua de Sinais Brasileira | Ronice Müller de Quadros e Lodenir Becker Karnopp, Artmed | [Catálogo do Grupo A](https://m.grupoa.com.br/lingua-de-sinais-brasileira-estudos-9788536303086-p991033) |
| Dicionário da Língua Brasileira de Sinais | Guilherme de Azambuja Lira e Tanya Amara Felipe de Souza, no INES | [Dicionário Libras](https://dicionario.ines.gov.br/) |
| Manuário Acadêmico e Escolar | INES | [Manuário](https://manuario.ines.gov.br/) |
| Corpus de Libras | UFSC | [Publicações do Corpus Libras](https://corpuslibras.ufsc.br/publicacoes) |
| Clube de Libras | UFC, projeto de extensão | [Faculdade de Educação da UFC](https://faced.ufc.br/pt/extensao/programa-de-pos-graduacao-em-educacao/clube-de-libras-ufc/) |

Na compilação `bdbccc4`, o clique no Dicionário do INES substituía a aplicação na mesma aba. No reteste integrado de `d473dc4`, o Chromium verificou a abertura da segunda aba, voltou à Área livre e recuperou o texto editado “Cinco e espelho.”. Os registros locais são `data/evidence/demonstracao/saiba-mais-d473dc4.json` e `data/evidence/demonstracao/roteiro-d473dc4.log`. [Teste de navegação e abertura](../tests/e2e/recorded-demo.mjs)

### Reteste do atalho de conteúdo

Na compilação `aea5303`, pressionar Enter em **Ir para o conteúdo** movia o foco para o conteúdo da Área livre e mudava a URL para `#conteudo`. A recarga abria Praticar. Na compilação `aa32d96`, o atalho mantém `#area-livre`, preserva o histórico e deixa **Conteúdo** como próximo controle no Tab. A recarga manteve a Área livre e um único **Voltar** retornou para Praticar.

No mesmo pacote, o Chromium abriu e liberou a webcam Acer e concluiu a síntese local com eSpeak NG em pt-BR. O controle com a gravação de duas mãos conferiu espelhamento, redimensionamento e o retorno dos pontos após ocultar uma mão. Os logs locais ficam em `data/evidence/demonstracao`, nos arquivos `fisico-aa32d96.log`, `atalho-recarregar-aa32d96.log` e `pontos-aa32d96.log`. A revisão visual com sinalização na webcam e a audição por participantes seguem pendentes. [Teste de navegador](../tests/e2e/browser.test.mjs) · [Controle com gravação](teste-pontos-ao-vivo.md)

O roteiro integrado passou novamente com o Y4M de SHA-256 `88de13b1cd6e9c1135a43e5436740d238945ef0141230375a48d7c0a9412c808`. O Chromium reproduziu a frase e o nome, reconheceu Amarelo, exibiu a dica de trajetória no recorte invertido, acrescentou “cinco espelho” em duas tentativas e concluiu a leitura de “Cinco e espelho.”. O link do INES abriu o destino, e as duas trilhas de câmera foram liberadas ao trocar de tela. Log local `roteiro-aa32d96.log`.

### Latência da prática guiada no PC

A prévia `50ad447` usou o classificador combinado com limiar 0,525, no Chromium 156.0.8078.79 em Debian 13 com Intel Core i7-13650HX. A câmera de arquivo do Chromium entregou 640 × 360 a 30 fps. O avatar usou WebGL 2 com SwiftShader. Cada cenário abriu um perfil temporário e começou com uma tentativa de aquecimento. O teste reiniciou o avatar, aguardou dois quadros de animação e confirmou que ele estava em reprodução antes de acionar **Concluir tentativa**. [Tempos por tentativa e por quadro, com hashes do modelo e das mídias](../ml/evidence/latencia-licao/combinado-50ad447.json)

| Cenário | Resultado | Mediana conclusão → decisão | p95 | Mediana da extração por quadro |
| --- | --- | ---: | ---: | ---: |
| Cinco, S09-1 | 5/5 reconhecidas | 1,8 ms | 21,8 ms | 60,8 ms |
| Espelho, S11-1 | 5/5 reconhecidas | 2,1 ms | 22,8 ms | 60,6 ms |
| Amarelo, S01-1 | 5/5 reconhecidas | 1,8 ms | 22,4 ms | 61,5 ms |
| Amarelo, S01-1 com quadros invertidos | 3/3 exibiram a dica de trajetória | 3,0 ms | 22,0 ms | 61,6 ms |
| Vídeo preto, sem mão | 3/3 ficaram inconclusivas | 0,4 ms | 0,6 ms | 13,3 ms |

Nas 15 tentativas de reconhecimento, a mediana foi 1,9 ms e o p95 foi 22,8 ms. As duas medidas ficaram abaixo das metas de 250 e 600 ms. O primeiro carregamento do reconhecedor em cada perfil levou de 295,9 a 308,5 ms. A extração dos 606 quadros dessas 15 tentativas teve mediana de 61,0 ms e p95 de 65,4 ms. Os tempos de decisão começam no clique de conclusão. O p95 usa o posto mais próximo e, neste tamanho de amostra, coincide com o maior valor. [Metas do protocolo](protocolo-aceite.md#metas-de-aceite)

Cinco e Espelho vieram da partição reservada do MINDS-Libras. Amarelo veio do treino e o vídeo invertido deriva do mesmo clipe. As repetições medem a execução técnica sobre gravações. A latência com pessoas sinalizando na webcam, a adequação da dica e o comportamento em Android e iOS continuam no aceite manual. [Partições e origem](../ml/manifests/minds-expanded-v1.json) · [Medição ao vivo](validacao-ao-vivo.md#medir-no-chromium)

Para repetir, use os recortes sincronizados de Cinco e Espelho descritos neste roteiro e o recorte de 0,70 s em diante de Amarelo S01-1. O comando salva o carregamento inicial, os tempos de cada quadro e a decisão no JSON. Os logs locais desta rodada ficam em `data/evidence/latencia-licao-50ad447`. [Preparação de Amarelo](sinais-com-movimento-browser.md#reproduzir) · [Preparação do recorte invertido](#dica-de-trajetória-de-amarelo)

~~~bash
out=data/evidence/latencia-licao
mkdir -p "$out"
export LIBRASIA_TEST_URL=http://127.0.0.1:4177
export LIBRASIA_TEST_RECOGNITION=1 LIBRASIA_TEST_SYNC=1
medir() {
  LIBRASIA_TEST_TRIALS=5 LIBRASIA_TEST_TARGET="signal-$1" LIBRASIA_EXPECT_TEXT="$1" \
    LIBRASIA_TEST_VIDEO="$2" LIBRASIA_TEST_REPORT="$out/$1.json" \
    node --test tests/e2e/recognition.test.mjs
}
medir cinco data/evidence/camera-fixtures/10CincoSinalizador09-1-sync.y4m
medir espelho data/evidence/camera-fixtures/12EspelhoSinalizador11-1-sync.y4m
medir amarelo data/evidence/moving-sign-fixtures/amarelo-s01.y4m

LIBRASIA_TEST_TRIALS=3 LIBRASIA_TEST_TARGET=signal-amarelo \
  LIBRASIA_TEST_EXPECT_HINT='Desloque o indicador da testa em direção ao nariz.' \
  LIBRASIA_TEST_VIDEO=data/evidence/demonstracao/amarelo-01-invertido.y4m \
  LIBRASIA_TEST_REPORT="$out/dica.json" node --test tests/e2e/recognition.test.mjs

ffmpeg -nostdin -hide_banner -loglevel error -filter_threads 1 -f lavfi \
  -i 'color=c=black:size=640x360:rate=30:duration=4.2' \
  -vf 'tpad=start_duration=0.5:color=lime' -pix_fmt yuv420p "$out/sem-maos-sync.y4m"
LIBRASIA_TEST_TRIALS=3 LIBRASIA_TEST_TARGET=signal-cinco LIBRASIA_EXPECT_REASON=no-hand \
  LIBRASIA_TEST_VIDEO="$out/sem-maos-sync.y4m" LIBRASIA_TEST_REPORT="$out/sem-maos.json" \
  node --test tests/e2e/recognition.test.mjs
~~~

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

## Reteste integrado de 26/11/2026

O checkout limpo de 78fa4b9 concluiu npm ci, a instalação do MediaPipe, 31 testes unitários, o build e a verificação do painel. No Chromium do PC, quatro testes de ponta a ponta passaram com a webcam física e a voz local habilitadas. O reteste cobriu ainda a cedilha, a comparação de letras, a revisão adaptativa após recarga, a saudação Bom dia e a forma histórica de ALUNO. A corrida ao remover perfis temporários foi corrigida no executor de teste antes do reteste. A inspeção dos sete destinos também foi repetida por cliques na página Saiba mais em um perfil temporário.

## Ensaios com o classificador v1 em 26/11/2026

A prévia local de e722978 foi compilada com o ONNX de SHA-256 52bfe58f63fa1adda9815bb32fbb0e59be196e8bf24c3807eba9704cb45bdf6a e o limiar de validação 0,495. Os testes usam Chromium no PC de referência, cabeçalhos da prévia de produção e clipes do teste reservado como câmera simulada em 640 × 360 a 30 fps. O marcador verde sincroniza as janelas. A sonda sem sinalizante usa a câmera simulada interna do Chromium.

| Cenário | Resultado | Mediana | p95 |
| --- | --- | ---: | ---: |
| Sem sinalizante | 3/3 inconclusivas por ausência de rastreamento e sem acréscimo de texto | 0,3 ms | 0,8 ms |
| Vontade S09-4, fora do catálogo | 3/3 inconclusivas por classe de rejeição e sem acréscimo de texto | 1,6 ms | 12,3 ms |
| Cinco S09-1 na lição com avatar em reprodução | 5/5 reconhecidas como Cinco | 1,4 ms | 13,0 ms |
| Cinco S09-1 repetido na área livre | 2/2 reconhecidas e uma palavra por tentativa. O resultado foi “cinco cinco”. | 4,7 ms | 8,4 ms |
| Cinco S11-1 isolado | 0/2 corretas. O modelo classificou como Espelho nas duas. | 6,6 ms | 12,0 ms |
| Cinco S11-1 seguido de Espelho S11-1 | 0/2 sequências corretas. O texto foi “espelho espelho” nas duas. | 6,2 ms | 9,0 ms |
| Cinco S09-1 seguido de Espelho S11-1 | 2/2 com “cinco espelhos”. Caso adicional após diagnosticar o par S11. | 6,3 ms | 9,2 ms |

Os tempos abrangem o clique de conclusão até a decisão, com os ativos já carregados. O p95 por posto mais próximo tem amostra pequena. As repetições reutilizam os mesmos clipes e não ampliam a quantidade de pessoas avaliadas. A instrumentação observou apenas solicitações GET locais e confirmou a carga do ONNX, WASM e Holistic. Após dois reconhecimentos na área livre, o texto editado foi enviado à voz local em pt-BR e a síntese informou conclusão.

No tensor da extração offline, Cinco S11-1 também foi classificado como Espelho, com confiança 0,5637. Espelho S11-1 teve confiança 0,9525 na classe correta. A substituição da sequência ocorreu igualmente na classificação isolada. Vontade S09-4 foi falsamente aceito como Amarelo no tensor offline, com confiança 0,4987, logo acima do limiar 0,495. As janelas capturadas tiveram decisão diferente do clipe completo nessa entrada limítrofe. Nenhum limiar foi revisto com base nesses replays.

Os registros ficam no diretório local data/evidence, nos logs qa-oficial. A avaliação independente reproduziu as métricas da versão oficial. Uma rodada exploratória anterior com limiar 0,48 consta dos logs qa-modelo e do relatório de avaliação. A correção intencional de uma execução e a interpretação do áudio ainda requerem verificação por pessoas no PC.

O mesmo build oficial passou quatro testes de navegador com a webcam física e a voz local habilitadas. A captura abriu em 640 × 480 e a trilha encerrou ao ocultar a aba ou deixar a área. O teste também percorreu as 27 demonstrações selecionáveis, retomada da captura, navegação por teclado e toque emulado. A webcam física foi verificada quanto à captura e ao ciclo de vida. Os ensaios de classificação usaram a reprodução de clipes na câmera simulada.

## Verificação do modelo expandido

Em uma prévia separada, o classificador expandido com SHA-256 fc50063cb217efbb71cff5758df723ccc643a59b1673ffc54e0e0815c5233e27 e limiar 0,475 foi carregado sob a mesma política de conteúdo. Três repetições do clipe reservado Aluno S11-1 acrescentaram uma palavra por tentativa. A mediana foi 2,3 ms e o p95 foi 8,2 ms, com três medições do clique de conclusão à decisão. O resultado do navegador cobre esse clipe. O teste reservado do modelo expandido continua com pendências de revocação de Cinco e rejeição.

A prévia oficial continuou com o modelo de três palavras. O log da expansão está no arquivo local data/evidence/qa-expandido-aluno.log.

## Reteste da medição e do candidato com geometria

O Chromium verificou os tempos registrados em memória pela aplicação. A tentativa sem mãos mediu o carregamento inicial e os quadros processados. A lição com avatar em reprodução reconheceu Cinco S09-1 e registrou o tempo da decisão com o modelo carregado. Uma prévia local separada, com o modelo experimental de geometria e limiar 0,640, reconheceu Cinco S11-1 em duas reproduções do mesmo clipe. Esse clipe havia sido confundido com Espelho pelo modelo inicial. Os logs ficam em data/evidence com os nomes qa-medicao-browser.log, qa-medicao-cinco.log e qa-geometria-cinco11.log.

O reteste do caso conhecido serve para verificar a integração no navegador. A sessão ao vivo e a avaliação de pessoas independentes permanecem pendentes. [Ficha local e instruções de medição](validacao-ao-vivo.md)

As regressões da área livre com sustentação, repetição, casos inconclusivos e falhas de voz estão documentadas em um roteiro técnico próprio. [Regressões da área livre](regressao-area-livre.md)

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

O caso une dois clipes isolados da pessoa 11 da partição de teste, Cinco e Espelho, com 0,8 s de vídeo preto para representar a ausência de rastreamento. Um marcador verde no começo sincroniza a captura. O esperado é “cinco espelhos”. A versão v1 trocou Cinco por Espelho neste caso e acertou o ensaio adicional com 10CincoSinalizador09-1.mp4 no primeiro trecho. A origem da mídia é o [MINDS-Libras, versão 1](https://zenodo.org/records/2667329).

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

Para repetir um caso no mesmo navegador, defina LIBRASIA_TEST_TRIALS de 1 a 30. Em clipes rotulados, use o marcador verde para delimitar cada repetição. O relatório lista a decisão e latência de cada tentativa, quantidade medida, mediana e p95 pelo posto mais próximo. Na lição, o avatar volta a reproduzir antes da medição. Na área livre, o teste compara a transcrição cumulativa após cada tentativa.

### Dois sinais em tentativas isoladas com voz local

Prepare Cinco S09-1 e Espelho S11-1 com meio segundo de marcador verde em cada arquivo, como no exemplo acima. Substitua o segundo marcador por azul na junção. O teste abre duas tentativas independentes e espera “cinco” na primeira e “cinco espelho” depois da segunda. No fim, verifica a leitura da edição com voz local em pt-BR.

~~~bash
fixtures=data/evidence/camera-fixtures
ffmpeg -i "$fixtures/10CincoSinalizador09-1-sync.y4m" -i "$fixtures/12EspelhoSinalizador11-1-sync.y4m" \
  -filter_complex "[1:v]drawbox=color=blue:t=fill:enable='lt(t,0.5)'[blue];[0:v][blue]concat=n=2:v=1:a=0[out]" \
  -map '[out]' -an -pix_fmt yuv420p "$fixtures/cinco-e-espelho.y4m"
LIBRASIA_TEST_URL=http://127.0.0.1:4177 LIBRASIA_TEST_RECOGNITION=1 LIBRASIA_TEST_SYNC=1 \
  LIBRASIA_TEST_VOICE=1 LIBRASIA_TEST_TRIALS=2 LIBRASIA_EXPECT_TEXT=cinco LIBRASIA_TEST_SECOND_TEXT=espelho \
  LIBRASIA_TEST_VIDEO="$fixtures/cinco-e-espelho.y4m" node --test tests/e2e/recognition.test.mjs
~~~

O ensaio com clipes unidos mede um cenário controlado com pausa. A validação com sinalização contínua natural requer dados anotados para medir erros de segmentação e revisão humana do sentido traduzido.
