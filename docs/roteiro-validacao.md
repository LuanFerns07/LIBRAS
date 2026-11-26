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
| 2 | Frase catalogada | Em **Tradutor**, digite “Meu nome é Anna” e gere a demonstração. Observe a sequência MEU, NOME, pausa e A, N, N, A. | Pendente |
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
~~~

Se o executável tiver outro nome, informe o caminho em LIBRASIA_CHROMIUM. O teste usa um perfil temporário, servidor HTTP restrito ao loopback e a câmera simulada do navegador. Ele confere WebGL 2 e as respostas reais da API de permissão do Chromium. Para validar captura física, execução de sinais e reprodução audível, faça a sequência principal no PC.
