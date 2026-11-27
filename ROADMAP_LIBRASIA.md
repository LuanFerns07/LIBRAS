# Roadmap do LibrasIA

O projeto de Luan Fernandes e Wellington Sales é uma iniciativa educacional sem fins lucrativos. A primeira versão é uma aplicação web para demonstração em um PC com webcam, com prática guiada, alfabeto manual em 3D, tradução de textos suportados para Libras e reconhecimento em área livre com saída em texto e voz gratuita. O [prompt de implementação](PROMPT_LIBRASIA.md) reúne os requisitos do produto e os papéis dos agentes.

## Marcos e dependências

O coordenador integra as entregas e atualiza a coluna **Status**, que alimenta o painel do README. **A fazer** indica implementação pendente ou em curso. **A testar** indica implementação concluída com validação pendente. **Pronto** indica que os critérios de aceite da entrega foram cumpridos. As validações reservadas para depois da 1.0 estão na checklist pós-1.0.

Ao mudar um status, rode `python3 scripts/update_status.py` e inclua `assets/status.svg` no mesmo commit.

| Marco | Status | Entrega | Responsáveis principais | Quando avançar |
| --- | --- | --- | --- | --- |
| **M0 · Fundação** | Pronto | Git local, aplicação inicial e ambiente definido | Git e ambiente, coordenador | Um segundo integrante consegue executar a base a partir do README. |
| **M1 · Dados e critérios** | Pronto | Fontes verificadas, primeiro catálogo de sinais, contrato entre componentes e plano de testes | Dados e ML, Libras e avatar, coordenador | O aceite técnico confirma a base, o catálogo e as partições para a versão exploratória local. |
| **M2 · Um sinal de ponta a ponta** | Pronto | Avatar 3D, webcam real e uma dica específica de prática | Integração, UX, Dados e ML, Libras e avatar | Os ensaios da 1.0 confirmam quatro respostas distintas para Amarelo e a recuperação da webcam no Chromium. |
| **M3 · Lição e reconhecimento** | Pronto | Lição com três a cinco sinais e modelo avaliado | Dados e ML, UX, Libras e avatar, integração | Os três sinais completam a lição com vídeo gravado e inferência real. A revisão das dicas com participantes fica nas pendências. |
| **M4 · Alfabeto e texto para Libras** | Pronto | A–Z e Ç no avatar e na leitura ao vivo, tradutor de textos suportados e soletração de nomes | Libras e avatar, UX, integração | A navegação pelas 27 letras, a leitura ao vivo e a soletração passaram no Chromium. A revisão linguística e a coleta na webcam ficam nas pendências. |
| **M5 · Área livre e voz** | Pronto | Sinalização sem alvo pré-selecionado, transcrição editável e leitura gratuita | Integração, Dados e ML, UX | A transcrição, a rejeição nos controles e a síntese local passaram no Chromium. A confirmação com participantes fica nas pendências. |
| **M6 · Saiba mais e créditos** | Pronto | Links externos, créditos e declaração sem fins lucrativos | UX, revisão independente | Os destinos conferem com os títulos e a mensagem aparece no app e no README. |
| **M7 · Demonstração local** | Pronto | Pacote Linux reproduzível, roteiro técnico e versão marcada no Git | Git e ambiente, coordenador | O roteiro integrado e os controles de exportação, câmera, integridade e inferência offline passaram. A revisão com participantes e o memorial ficam nas pendências. |

**Caminho principal** · M0 → M1 → M2 → M3 → M5 → M7. A preparação das animações de M4 pode começar junto com M1, e a integração de M4 pode avançar após o player de M2. M6 pode ser feito em paralelo com M3 a M5. M7 depende do aceite de M3, M4, M5 e M6.

## Prioridades da retomada

A versão 1.0 local conclui M1 e M2 com uma prática guiada funcional no PC com webcam. [Abrir Praticar](http://127.0.0.1:4177/#praticar)

1. **M1.** Catálogo, licenças, partições e contrato entre o modelo e o avatar conferidos para o uso exploratório. [Revisão técnica](docs/dados.md#aceite-técnico-de-m1) · [Referências e bases](docs/referencias.md)
2. **M2.** A prática de Amarelo distingue reconhecimento, ajuste, tentativa inconclusiva e falha de captura. Os ensaios de sinalização usaram gravações. A recuperação de permissão foi conferida na webcam física. [Roteiro curto](docs/roteiro-validacao.md#prática-guiada-mínima-m1-e-m2) · [Ficha de validação](docs/validacao-ao-vivo.md)

Após a 1.0, a implementação segue em ordem a partir de M3. Validações que dependem de terceiros, dados ou autorização ficam no arquivo de pendências e os ensaios técnicos continuam nos marcos seguintes. [Validações pós-1.0](#validações-pós-10)

## Implementação e aceite por marco

### M0 · Fundação e versionamento

- [x] Confirmar o PC de referência, o navegador, a webcam e a disponibilidade de uma voz gratuita em português brasileiro. Registrar o ambiente usado para os testes e o plano de síntese local se faltar uma voz compatível.
- [x] Inicializar o Git local, criar o primeiro commit e documentar como instalar, executar e testar a aplicação. Se a pasta principal estiver protegida, preservar os arquivos de origem e inicializar a pasta gravável da aplicação dentro do espaço de trabalho.
- [x] Versionar código, documentação, configurações e manifestos de dados, modelos e animações. Manter vídeos brutos, segredos e artefatos pesados fora do histórico. Definir como recuperar a versão exata de cada artefato usado na demonstração.
- [x] Concentrar a implementação, os testes e a atualização do roadmap na `main`, agrupando os commits por marco ou meia etapa verificada e enviando cada grupo ao remoto do projeto.
- [x] **Aceite.** A revisão técnica independente iniciou a base em um checkout limpo e executou a verificação inicial. Git, voz e webcam têm um caminho de configuração documentado.

### M1 · Dados, vocabulário e protocolo de validação

- [x] Levantar os conjuntos públicos candidatos e registrar origem, versão, licença, termos de uso, cobertura de sinais, qualidade dos rótulos e identificação de pessoas sinalizantes. Conferir separadamente as permissões para uso em treino, demonstração e distribuição dos pesos ou ativos.
- [x] Escolher três a cinco sinais pela utilidade pedagógica, qualidade dos exemplos e viabilidade de animação. Começar por um sinal cujo parâmetro principal seja observável pela webcam. Incluir movimento se houver dados e referência suficientes.
- [x] Definir o catálogo compartilhado com identificador de letra ou sinal, saída textual, referência, animação, versão e status da revisão. Para os exercícios, identificar o parâmetro avaliado, as variantes contempladas e as dicas permitidas.
- [x] Fixar a separação por pessoa sinalizante entre treino, validação e teste quando houver identificadores. Registrar a limitação das fontes sem esse metadado e verificar duplicatas.
- [x] Medir a rejeição dos modelos congelados em gravações externas de repouso e movimentos cotidianos. [Teste com 12 trechos do CLAD](docs/negativos.md#resultado-de-26-de-novembro-de-2026)
- [x] Verificar os modelos congelados em amostras de sinais de videoaulas licenciadas. Registrar variantes, falhas de rastreamento e tamanho da amostra. [Verificação externa de Cinco e Amarelo](docs/sinais-independentes.md)
- [x] Medir a rejeição em 19 novos recortes externos de repouso, atividade cotidiana, transições e glosas fora do catálogo. Reproduzir três decisões na Área livre usando as gravações como câmera. [Resultados por estrato](docs/negativos.md#novas-posturas-transições-e-glosas-externas)
- [x] Reproduzir os 19 recortes na Área livre do Chromium e verificar a transcrição e as chamadas ao classificador. Registrar os cinco falsos aceites e as duas tentativas que terminaram antes da classificação. [Resultados no Chromium](docs/negativos.md#os-19-recortes-na-área-livre-do-chromium)
- [x] Medir chamadas ao classificador por tentativa. Verificar no Chromium a diferença entre ausência de mãos e rejeição após classificação, guardar o valor na ficha e resumir a cobertura por cenário. [Verificação com gravações](docs/validacao-ao-vivo.md#verificação-das-chamadas-no-chromium)
- [x] Conferir a resolução da câmera e a cópia da medição pelo aplicativo. Exportar os valores na ficha local e verificar o caminho de cópia manual quando o Chromium bloqueia a área de transferência. [Medição na ficha](docs/validacao-ao-vivo.md#medir-no-chromium)
- [x] Recompilar a prévia a partir de um checkout limpo, conferir os modelos e validar no Chromium o preenchimento da versão pela ficha. Sinalizar como rascunho a compilação com alterações locais. [Reprodução da prévia local](docs/previa-estavel.md#recompilar-com-os-modelos-verificados)
- [x] Definir antes do teste final as metas de reconhecimento, rejeição e latência, com base no tamanho do conjunto e no PC de referência. Ajustar o limiar de confiança somente com a validação. Preservar o teste final para a versão escolhida.
- [x] Conferir os três sinais iniciais no catálogo, no player 3D e no manifesto da prévia. Verificar partições, atribuição da base e paridade WebAssembly. Reunir as fontes e bases em um índice para citação. [Revisão técnica de M1](docs/dados.md#contrato-e-revisão-técnica-de-m1) · [Referências](docs/referencias.md)
- [x] **Aceite.** Catálogo inicial, registro de licenças, protocolo de avaliação e interfaces do player e do modelo revisados. O protótipo pode avançar com a amostra exploratória registrada. [Aceite técnico de M1](docs/dados.md#aceite-técnico-de-m1)

### M2 · Primeiro sinal com webcam e avatar reais

- [x] Integrar o avatar lado a lado com a captura pela webcam, inferência e resposta do exercício. Usar o modelo treinado e verificar o caminho em navegador com vídeos rotulados e exemplos fora do catálogo.
- [x] Implementar quatro estados visíveis: execução aceita, dica acionável sobre um parâmetro, tentativa inconclusiva e problema de captura. Pedir nova tentativa quando a imagem ou a estimativa não derem base para corrigir o estudante.
- [x] Testar concessão e negação de câmera, saída do fluxo, troca de aba e reativação. Verificar que a aplicação processa os quadros localmente, sem transmitir ou persistir as imagens.
- [x] **Webcam física no Chromium.** Abrir a câmera ACER HD User Facing, conferir a trilha ativa e liberar a câmera ao sair da aba e da Área livre. [Prévia local dos pontos](docs/previa-estavel.md#pontos-das-mãos-ao-vivo)
- [x] Revogar a permissão durante uma tentativa no Chromium. Conferir o aviso de captura, a retomada da webcam física e o reconhecimento de Cinco com vídeo gravado depois de conceder a permissão novamente. [Reteste da captura](docs/roteiro-validacao.md#retomada-após-revogar-a-permissão-da-câmera)
- [x] Conferir os quatro estados com Amarelo em **Praticar com ajuda**. Usar gravações para reconhecimento, dica de trajetória e ausência de mãos. Usar a webcam física para a falha nativa de permissão durante a tentativa e a retomada. [Roteiro curto e resultados](docs/roteiro-validacao.md#prática-guiada-mínima-m1-e-m2)
- [x] Percorrer a lição de Amarelo em uma sessão do Chromium, da dica à conclusão sem o avatar. Conferir a retomada após revogar a permissão e a persistência do progresso após recarregar. [Reprodução com gravações](docs/roteiro-validacao.md#da-dica-à-conclusão-da-lição-de-amarelo)
- [x] Corrigir o aceite de Amarelo quando a extração projeta os ombros fora da imagem. Retestar a oclusão da mão, o recorte dos ombros, o reconhecimento e a dica no Chromium com gravações. [Enquadramento e oclusão](docs/roteiro-validacao.md#enquadramento-e-oclusão-na-prática)
- [x] Exigir evidência da trajetória para concluir a lição de Amarelo. Retestar Laranja e Vermelho da UFSM, duas execuções esperadas e o controle de ajuste no Chromium. [Trajetória de Amarelo](docs/roteiro-validacao.md#confirmação-da-trajetória-na-lição-de-amarelo)
- [x] Interromper a tentativa se o vídeo parar de chegar com a trilha ativa. Verificar no Chromium a mensagem, a limpeza dos pontos, a liberação da câmera e a retomada. [Interrupção do vídeo](docs/roteiro-validacao.md#interrupção-do-vídeo-durante-a-prática)
- [x] **Vídeo gravado no Chromium.** Verificar 21 pontos por mão, movimento das duas mãos antes, durante e depois de uma tentativa, oclusão e retorno de uma mão, opção ligada por padrão e alternância durante a captura. Conferir o encaixe e o espelhamento em 1.280 e 390 px e a liberação da trilha ao navegar. [Vídeo e cenário](docs/teste-pontos-ao-vivo.md) · [Teste automatizado](tests/e2e/hand-overlay-live.test.mjs)
- [x] **Relato de uso na webcam.** A pessoa usuária confirmou que a sobreposição acompanhou bem os movimentos em tempo real.
- [x] **Aceite da 1.0 local.** Reconhecimento de Amarelo, dica de trajetória e ausência de mãos verificados com gravações. Falha de permissão e retomada verificadas na webcam física. [Evidências da prática guiada](docs/roteiro-validacao.md#prática-guiada-mínima-m1-e-m2)

### Validações pós-1.0

As validações com participantes e os demais impedimentos da sequência estão reunidos no [arquivo de pendências futuras](docs/pendencias-futuras.md).

### M3 · Modelo avaliado e lição utilizável

- [x] Treinar uma versão reproduzível e medir a classificação em teste reservado. Registrar configuração, versões dos conjuntos, comandos, critérios de seleção e versão dos pesos.
- [x] Completar a lição com observar, praticar com ajuda e tentar com menos ajuda. Incluir uma atividade de compreensão sem câmera, controles do avatar e registro local do progresso.
- [x] Completar as três etapas de Cinco no Chromium com vídeo gravado e inferência real. Verificar resposta incorreta e correta na atividade, reconhecimento com e sem avatar e progresso após recarregar. Abrir a etapa pendente ao usar a revisão. [Resultado e comandos](docs/roteiro-validacao.md#lição-completa-de-cinco-no-chromium)
- [x] Exercitar a dica de trajetória de Amarelo no Chromium. Reproduzir a gravação original para verificar o reconhecimento e inverter a ordem dos quadros de um recorte para testar a resposta à trajetória contrária. Confirmar que a dica mantém a etapa pendente. [Teste controlado de trajetória](docs/roteiro-validacao.md#dica-de-trajetória-de-amarelo)
- [x] Medir precisão, revocação e F1 por sinal e média macro no teste reservado. Registrar matriz de confusão, cobertura, falsas aceitações e latência mediana e p95 no PC com clipes de teste. Contar tentativas inconclusivas na análise de cobertura e na revocação dos sinais suportados.
- [x] Medir o modelo combinado congelado nos 51 clipes reservados do MINDS. Observar 32/33 acertos no catálogo, 1/18 falso aceite e F1 macro de 0,972. [Avaliação do combinado](docs/avaliacao.md#modelo-combinado-na-partição-reservada)
- [x] Importar o tempo de decisão, a carga inicial e os tempos de extração do Chromium na ficha de aceite. Conferir a exportação e as contagens, medianas e p95 por fluxo e ambiente. [Verificação da importação](docs/validacao-ao-vivo.md#verificação-da-importação-dos-tempos)
- [x] Avançar da atividade para a prática com ajuda mantendo o sinal selecionado. Tratar a orientação contrária da palma em Cinco e Espelho como tentativa inconclusiva na etapa de memória. [Reteste da lição completa](docs/roteiro-validacao.md#lição-completa-dos-três-sinais-em-m3)
- [x] **Aceite técnico.** Cinco, Espelho e Amarelo passaram pelas três etapas com vídeos gravados e inferência no Chromium. O modelo combinado atingiu os critérios numéricos no MINDS reservado. As métricas de webcam com participantes e a revisão humana das dicas seguem no [arquivo de pendências futuras](docs/pendencias-futuras.md#m1-a-m3--webcam-e-revisão-das-dicas).

O primeiro teste reservado obteve F1 macro de 0,612 e 5 falsas aceitações em 18 entradas fora do catálogo. O protocolo exige F1 macro de pelo menos 0,75 e falsas aceitações de até 10%. A versão local fica disponível para exploração. Para avançar no aceite, corrigir a confusão de Cinco e as falsas aceitações em Amarelo e repetir a avaliação com participantes independentes. [Resultados do teste e matriz de confusão](docs/avaliacao.md#execução-do-catálogo-inicial-em-26-de-novembro-de-2026)

O experimento com geometria da mão aumentou os acertos de Cinco de 3 para 13 em 18 clipes na comparação interna por pessoa. As falsas aceitações subiram de 5 para 8 em 42. Em 12 trechos externos de repouso e movimentos cotidianos, a geometria produziu uma falsa aceitação e cada modelo anterior produziu cinco. A avaliação de sinais válidos com novo grupo reservado e com webcam continua pendente. [Comparação interna](docs/avaliacao.md#experimento-com-geometria-das-mãos) · [Negativos externos](docs/negativos.md)

O candidato com ângulos dos dedos elevou os acertos de Cinco a 15/18 e reduziu as falsas aceitações a 5/42 na comparação interna. A cobertura caiu para 52/78 e a confusão com Banco permaneceu no navegador. [Flexão dos dedos, métricas e paridade](docs/avaliacao.md#experimento-com-flexão-dos-dedos)

A combinação de geometria e flexão chegou a F1 macro de 0,761 e 3/42 falsas aceitações. Espelho e Amarelo ainda ficaram abaixo da revocação mínima por sinal. [Combinação e paridade](docs/avaliacao.md#combinação-de-geometria-e-flexão)

A média de geometria e movimento com treino suplementar elevou Espelho a 16/21. Amarelo acertou 12/21 e oito das nove perdas já tinham outra classe em primeiro lugar antes do limiar. A combinação registrou 6/42 falsos aceites. [Diagnóstico por sinal](docs/avaliacao.md#geometria-combinada-com-o-treino-suplementar)

O ensaio com a posição da mão em relação ao nariz chegou a 14/21 acertos em Amarelo, contra 13/21 no controle, e baixou de 5/42 para 3/42 os falsos aceites. A precisão de Amarelo ficou em 73,7%, abaixo da meta de 75%. A validação com participantes segue pendente. [Comparação por pessoa](docs/avaliacao.md#posição-da-mão-em-relação-ao-nariz)

### M4 · Alfabeto, palavras, frases e nomes

- [x] Oferecer A–Z e Ç no seletor de Prática, com demonstração no avatar e progresso separado. [Modo alfabeto](docs/dados-alfabeto.md#praticar-e-ler-letras-ao-vivo)
- [x] Exibir a letra detectada ao lado da webcam na Prática e na Área livre, sem iniciar tentativa. Verificar B, Ç e Y com gravação rotulada no Chromium. [Cobertura e verificação](docs/dados-alfabeto.md#cobertura-e-verificação)
- [x] Adicionar H, J, K, X e Z ao reconhecimento ao vivo e revisar a leitura de Ç. Testar essas seis letras no Chromium com vídeos rotulados. [Cobertura e verificação](docs/dados-alfabeto.md#cobertura-e-verificação)
- [x] Triar a dificuldade relatada com N. Reproduzir N, M e U com os recortes da UFSM e comparar as poses do avatar com a referência. [Triagem do N](docs/animacoes.md#triagem-da-letra-n)
- [x] Melhorar a legibilidade de M e N no avatar. Conferir dois dedos para baixo em N, três em M e dois para cima em U. Testar a vista frontal no Chromium e a soletração de “Anna”. [Revisão da pose](docs/animacoes.md#triagem-da-letra-n)
- [x] Reproduzir a rejeição de N em duas aulas adicionais, retreinar os classificadores estáticos com os recortes de M/N/U do Cecierj e retestar N na Unesp, reservada para o ensaio do classificador estático. [Retreino](docs/dados-alfabeto.md#retreino-de-n-m-e-u)
- [x] Comparar a pose de N com referências de Libras e ajustar o braço e a flexão dos dedos em M e N. Verificar as comparações M/N e N/U no avatar e retestar os dois Ns de “Meu nome é Anna” no Chromium. [Revisão técnica da pose](docs/animacoes.md#triagem-da-letra-n)
- [x] Verificar a transição gravada de M para N com a mesma trilha de câmera ativa na Área livre e em Praticar. Registrar a limpeza do painel e o retorno da letra ao vivo. [Reteste no Chromium](docs/dados-alfabeto.md#reteste-com-a-pose-revisada-de-n)
- [x] Testar M → N → U na mesma trilha em Área livre e em Praticar com gravações da UFF. Medir o tempo de N no painel e verificar a limpeza do painel entre as leituras. [Teste e reprodução](docs/dados-alfabeto.md#m--n--u-nos-dois-modos-de-câmera)
- [x] Retestar M, N e U na prévia `5b2d4c4` com nove janelas gravadas do Cecierj, da Unesp e da UFAC. Confirmar N como única leitura nos três recortes de N e registrar a leitura adicional de H em um U. [Leituras e hashes](ml/evidence/alphabet-n-m-u/replay-5b2d4c4-mnu.json)
- [x] Avaliar M, N, U e Q com duas pessoas fora do ajuste. O Chromium exibiu N nas duas fontes. A leitura de N sumiu com a mão ainda rastreada nas três repetições da Unicentro. Os dois Q ficaram sem a letra esperada, e o U em perfil ficou sem leitura. [Replays e votos por quadro](docs/dados-alfabeto.md#m-n-u-e-q-em-duas-gravações-reservadas)
- [x] Investigar a instabilidade de N da Unicentro. Avaliar descritores geométricos e medir o efeito de espelhar a entrada do extrator. A extração orientada recuperou dez quadros de N sem mudar os pesos. [Diagnóstico e extração](docs/dados-alfabeto.md#orientação-da-imagem-e-estabilidade-de-n)
- [x] Testar a orientação da entrada no Chromium com os dois lados da imagem e com Tel baixinha como controle. O candidato manteve N até perder a mão nas nove repetições. [Linhas do tempo](ml/evidence/alphabet-m-n-u-q/n-lados-a1b5766.json)
- [x] Medir a cadência da sobreposição, comparar 89 recortes rotulados e 19 fora do alfabeto e retestar M e Q. A orientação global preservou os 88 acertos anteriores e reproduziu um falso P de repouso em três de três repetições. A orientação global fica no candidato experimental. [Comparação de A–Z e Ç](docs/dados-alfabeto.md#orientação-da-imagem-e-estabilidade-de-n)
- [x] Integrar a segunda extração como confirmação específica de N. Manter N até perder a mão nos nove replays e ficar sem leitura nas três repetições de repouso que exibiam P com a orientação global. Verificar a sobreposição e retestar M, Q, U e Rosa → Marrom. [Confirmação adotada](docs/dados-alfabeto.md#confirmação-específica-de-n-na-prévia)
- [x] Distinguir A de X nos recortes testados. Repetir no Chromium cinco exemplos de cada letra com a nova exigência de separação do indicador em X. [Verificação](docs/dados-alfabeto.md#distinção-entre-a-e-x-e-ensaio-de-e)
- [x] Recuperar E com um complemento do classificador estático. Reproduzir no Chromium as 27 janelas da terceira aula da UFSM e os 14 recortes institucionais. Confirmar E nas três aulas e preservar R e N no recorte da UFSM. [Resultado por janela](docs/dados-alfabeto.md#resultado-da-prévia-com-o-complemento-de-e)
- [x] Repetir o teste em seis janelas de uma aula da UFAC reservada. Verificar A, E, M, N e U e registrar a ausência de leitura de O. Verificar por recorte que ampliar a mão na imagem da UFSM é insuficiente para recuperar A. [Testes independentes](ml/evidence/alphabet-a-e-independent/README.md)
- [x] Recuperar O nos recortes da Unesp e da UFAC com um complemento geométrico. Conferir os controles C, E e S, as 53 janelas rotuladas e os 19 recortes fora do alfabeto no Chromium. [Resultado de O](docs/dados-alfabeto.md#recuperação-de-o-com-geometria-da-mão)
- [x] Verificar O com configuração mais fechada em uma pessoa fora do ajuste do complemento. A amostra da Uníntese reproduziu a ausência de leitura já observada no Ifes. [Replays comparados](ml/evidence/alphabet-o-compact/README.md)
- [x] Retreinar O compacto com as referências do Ifes e retestar no Chromium a Uníntese, as fontes já avaliadas e os negativos. Medir O e S de duas pessoas fora do ajuste. [Resultado do retreino](docs/dados-alfabeto.md#o-compacto-com-referências-do-ifes)
- [x] Comparar duas representações da articulação do polegar para distinguir S de A nos pontos gravados e verificar interferência em Z. [Sonda de A e S](ml/evidence/alphabet-o-s-independent/README.md#distinção-de-a-e-s-nos-pontos)
- [x] Recuperar S da Uníntese com o verificador geométrico e distinguir E de O nos dois ângulos observados de Uéslei Paterno. Verificar o par E/O de Tel baixinha, reservado fora do treino. [Replays](docs/dados-alfabeto.md#distinção-de-s-e-e-o-e-leitura-do-traçado-de-z)
- [x] Recuperar o traçado de Z que podia ser interrompido por uma leitura de X e verificar o caso do Cecierj em três replays e nos controles fora do alfabeto. [Repetições de Z](ml/evidence/alphabet-o-s-independent/z-controls.json)
- [x] Rodar o controle independente de A, Q e R na prévia local. O Chromium mostrou A nos três recortes anotados, deixou Q sem leitura e exibiu U no recorte de R nas duas repetições. [Replays da Unicentro e de Tel baixinha](ml/evidence/alphabet-a-q-r/README.md)
- [x] Treinar e avaliar a confirmação de A pela flexão em coordenadas 3D. O ensaio offline recuperou nove de onze quadros no A da UFSM e acrescentou zero votos de A nos 57 recortes de outras letras. [Ensaio de flexão 3D](ml/evidence/alphabet-a-e-independent/README.md#ensaio-de-flexão-em-coordenadas-3d)
- [x] Treinar e medir os contrastes Q/N e R/U. Os complementos offline recuperaram os 17 quadros selecionáveis de Q de Tel baixinha e corrigiram os oito quadros em que o R era aceito como U. [Contagens e limites](ml/evidence/alphabet-a-q-r/README.md#ensaios-de-qn-e-ru)
- [x] Compilar os complementos experimentais de Q e R em ONNX e testá-los no Chromium. O candidato `c8193b8` exibiu Q e R em três replays de cada recorte de Tel baixinha. Os testes em Praticar e na Área livre, na troca M → N e na sobreposição de duas mãos passaram com vídeos gravados. [Replays e versão](ml/evidence/alphabet-a-q-r/README.md#compilação-experimental-no-chromium)
- [x] Repetir a bateria do alfabeto no Chromium com os complementos de Q e R. A letra esperada apareceu nos 89 recortes rotulados. Entre 19 controles fora do alfabeto, surgiu um R quando a mão foi do queixo para o teclado. [Comparação com a prévia](ml/evidence/alphabet-a-q-r/README.md#regressão-com-o-pacote-de-q-e-r)
- [x] Comparar 10 recortes de quatro gravações, incluindo U oblíquo e em perfil. O candidato preservou os aceites de Q, R e U nas demonstrações de Paterno e da segunda aula da Unicentro. Recuperou o Q de Tel baixinha. Na aula explicativa da Unicentro, Q continuou como P e U em perfil ficou sem leitura nas duas versões. [Comparação com recortes adicionais](ml/evidence/alphabet-a-q-r/README.md#comparação-com-recortes-adicionais)
- [x] Compilar o complemento de Q em um pacote separado. O Chromium exibiu Q nas três repetições do recorte de Tel baixinha, passou os testes nos dois modos e exibiu somente M no recorte do queixo para o teclado. [Teste do complemento isolado](ml/evidence/alphabet-a-q-r/README.md#teste-do-complemento-de-q-em-separado)
- [x] Rodar a bateria do pacote com Q no Chromium. A letra esperada apareceu em 88 de 89 recortes. O Z do Cecierj reapareceu nas três repetições do candidato e em duas da prévia. Os 19 negativos ficaram sem Q, com diferenças de outras letras a retestar. [Regressão de Q](ml/evidence/alphabet-a-q-r/README.md#bateria-do-pacote-com-q)
- [x] Diagnosticar o Q da aula explicativa da Unicentro aceito como P. As redes concordaram em P em 14 de 18 quadros. Dois modelos treinados para P/Q, o espelhamento e a ampliação deixaram esse Q sem confirmação sustentada. [Ensaio de P/Q](ml/evidence/alphabet-a-q-r/README.md#diagnóstico-de-q-aceito-como-p)
- [x] Retestar os três negativos que variaram e disponibilizar Q na porta 4177. O falso R do movimento do queixo ao teclado apareceu em duas de três repetições da base e em nenhuma do pacote com Q. Os testes de Q em Praticar e na Área livre e da troca M → N passaram na prévia. [Comparação e versão local](ml/evidence/alphabet-a-q-r/README.md#reteste-pareado-e-adoção-de-q)
- [x] Coletar P e Q em outros ângulos, treinar a confirmação com seis pessoas e verificar a Unicentro e o Ifes reservados. A prévia exibiu Q na segunda vista da aula explicativa da Unicentro. A primeira vista continuou como P, inclusive na comparação offline dos novos modelos. [Treino e replays](ml/evidence/alphabet-a-q-r/README.md#pares-de-p-e-q-em-outros-ângulos)
- [x] Reproduzir o R indevido no movimento do queixo para o teclado com o classificador estático. As duas redes aceitaram R em sete quadros. A confirmação de forma separou esses quadros dos 49 votos de R válidos no ensaio offline, 35 em fontes fora do treino. [Diagnóstico do R aceito pelas redes](ml/evidence/alphabet-a-q-r/README.md#r-indevido-aceito-pelas-duas-redes)
- [x] Comparar no Chromium o veto de R e a recuperação de R aceito como U. O falso R do queixo ao teclado caiu de uma em cinco capturas a zero em cinco nas duas configurações. A configuração com recuperação exibiu R nas três repetições de Tel baixinha. Preservou os dez U já reconhecidos, incluindo o da UFF em vista oblíqua. [Replays e versões](ml/evidence/alphabet-a-q-r/README.md#confirmação-de-r-no-chromium)
- [x] Adotar a confirmação de R na prévia local após a regressão. A letra esperada apareceu em 88 de 89 recortes. O Z do Cecierj apareceu em três das cinco repetições adicionais em cada versão. Nenhum dos 19 negativos exibiu R. Os testes de R e da troca M → N passaram na porta 4177. [Bateria no Chromium](ml/evidence/alphabet-a-q-r/README.md#adoção-da-confirmação-de-r)
- [x] Treinar duas confirmações de U para os quadros em que a forma rejeita R. A versão 3D recuperou 22 dos 23 quadros do U da Uníntese amostrados no Chromium e zero quadros do movimento do queixo para o teclado. O ensaio também confirmou a forma de R nos quadros da UFF em que as redes divergiram. [Ensaio exploratório](ml/evidence/alphabet-a-q-r/README.md#casos-restantes-de-u-e-r)
- [x] Compilar a confirmação 3D de U e a rota de R na divergência entre as redes. Em 12 replays do Chromium, U e R da Uníntese e da UFF apareceram nas três repetições de cada recorte. Os dois casos recuperados passaram em Praticar e na Área livre. [Recuperação de R e U](ml/evidence/alphabet-a-q-r/README.md#recuperação-de-r-e-u-na-divergência)
- [x] Conferir a regressão do candidato e os quatro recortes de Kelly Canuto. A letra esperada apareceu nos 89 recortes positivos. Houve letras adicionais em oito positivos e alguma leitura em oito dos 19 negativos. O candidato recuperou o U frontal de Kelly e o U em rotação continuou como H. [Resultados por recorte e versões](ml/evidence/alphabet-a-q-r/regressao-f0122fa.json)
- [x] Investigar o U em perfil da aula explicativa da Unicentro e o R da UFAC. No Chromium, a mão foi rastreada nos dois recortes. As redes preferiram outras letras no U em perfil e divergiram no R da UFAC, inclusive com a imagem ampliada. [Votos e replays por recorte](ml/evidence/alphabet-a-q-r/README.md#diagnóstico-do-u-em-perfil-e-do-r-da-ufac)
- [x] Integrar a confirmação de A no Chromium. Reproduzir A nas três repetições do recorte da UFSM e nos dois modos, repetir os 89 recortes rotulados e conferir que A apareça nos mesmos controles entre os 19 recortes fora do alfabeto. [Teste e compilação adotada](docs/dados-alfabeto.md#confirmação-3d-de-a-na-prévia-local)
- [x] Reproduzir o falso Z no sinal Azul da UFSM em uma de três capturas e comparar o candidato na mesma sequência de pontos. No replay pareado, o falso Z caiu para zero em três capturas e os quatro Z já reconhecidos permaneceram nas cinco janelas rotuladas. O candidato está na branch local `diagnostico-z-azul`, commit `605cacc`.
- [x] Rodar o pacote experimental para Azul de ponta a ponta no Chromium. O candidato exibiu os mesmos quatro Z em cinco janelas, preservou as letras esperadas nos controles C/Ç/H/J/K/X/Y e registrou zero Z nas três repetições de Azul e nos 19 controles fora do alfabeto. [Ensaios do candidato](docs/dados-alfabeto.md#ensaio-do-candidato-de-z-em-azul)
- [x] Comparar as duas versões nas dez janelas adicionais. Preservar Ç e U e reproduzir o Z do Cecierj em uma de duas repetições com cada versão. Integrar a regra de Z à prévia 4177 e testar Z, a troca M → N e a sobreposição de duas mãos no Chromium. [Comparação e compilação adotada](docs/dados-alfabeto.md#ensaio-do-candidato-de-z-em-azul)
- [x] Diagnosticar o Z curto da aula `1536677587` da UFSM. Em seis capturas sem Z no painel, duas detecções de mão sobrepostas interrompiam um traço. O candidato recuperou Z no replay dos mesmos pontos com os pesos da prévia. [Diagnóstico e replays pareados](docs/dados-alfabeto.md#retomada-do-z-curto-da-ufsm)
- [x] Confirmar o Z curto nas três novas capturas do candidato no Chromium, em Praticar e na Área livre. Comparar os mesmos pontos de 19 negativos, três repetições de Azul e os outros quatro Z já reconhecidos. [Ensaios do candidato](docs/dados-alfabeto.md#retomada-do-z-curto-da-ufsm)
- [x] Comparar três Z e três Y de outras pessoas no Chromium. Os três Z apareceram nas duas versões. O Y de Tel baixinha apareceu nas duas versões e os dois outros Y ficaram sem leitura. [Gravações independentes](docs/dados-alfabeto.md#retomada-do-z-curto-da-ufsm)
- [x] Retestar Azul, X, as demais letras de movimento e os negativos no Chromium e adotar a retomada de Z na porta 4177. A letra esperada apareceu nos 16 controles rotulados, incluindo os cinco Z. Z ficou ausente nos 19 negativos e nas três repetições de Azul. [Pacote e evidências](docs/dados-alfabeto.md#retomada-do-z-curto-da-ufsm)
- [x] Treinar e testar um complemento de Y pelas posições dos dedos. A base exibiu Y em quatro de nove repetições e o candidato exibiu Y nas nove repetições de três pessoas e passou em Praticar e na Área livre com os vídeos de Uéslei Paterno e da Unicentro. O par W/Y da UFAC preservou as duas leituras. [Treino e replays](docs/dados-alfabeto.md#confirmação-de-y-pela-forma-da-mão)
- [x] Verificar a regressão de Y no Chromium e colocar a confirmação na prévia local. A letra esperada apareceu nos 89 recortes rotulados, o Z curto apareceu nas três repetições e nenhum dos 19 negativos exibiu Y. Confirmar a sobreposição e repetir Y, Q e M → N na porta 4177. [Resultados do pacote](docs/dados-alfabeto.md#confirmação-de-y-pela-forma-da-mão)
- [x] Medir as trocas de letras em recortes com movimento na prévia. A letra esperada apareceu nos 12 novos recortes da UFAC e da Unicentro, com leituras adicionais em seis. O Z variou em replays da mesma versão. Z e Ç passaram em Praticar e na Área livre com gravações. [Replays e tempos](docs/dados-alfabeto.md#reteste-de-letras-com-movimento-na-prévia-local)
- [x] Verificar 79 janelas do alfabeto no Chromium com uma trilha por aula e com recortes separados. Incluir 26 letras de uma fonte reservada da UFF, o Ç na sequência da UFSM e o reteste de N da Unicentro com a vista principal isolada. [Resultados e reprodução](docs/dados-alfabeto.md#alfabeto-com-a-mesma-trilha-de-câmera)

- [x] Construir as animações de A a Z e da cedilha, registrar as referências e verificar enquadramento, articulações e reprodução no navegador. [Animações e referências](docs/animacoes.md)
- [x] Implementar a grade navegável por teclado, seleção de letra, pausa, repetição e velocidade. Reusar o player 3D no tradutor.
- [x] Implementar as sequências de palavras e frases do catálogo, as mensagens de cobertura e a soletração de nomes isolados ou em frases suportadas.
- [x] Aceitar hífens tipográficos em nomes compostos, preservando a pausa entre nomes, as letras repetidas e a cedilha. Verificar a soletração isolada e dentro de frase. [Reteste de M4](docs/dados-alfabeto.md#aceite-técnico-de-m4)
- [x] **Aceite técnico.** O Chromium percorreu as 27 letras do avatar, traduziu itens do catálogo, soletrou nomes isolados e dentro de frase, e exibiu uma mensagem para entrada fora da cobertura. Na câmera com gravações, H, J, K, X, Z e Ç apareceram em Praticar e na Área livre, assim como a sequência M → N → U. [Evidências](docs/dados-alfabeto.md#aceite-técnico-de-m4) · [Pendências de revisão](docs/pendencias-futuras.md#m4-e-m5--alfabeto-sinais-área-livre-e-voz)

### M5 · Área livre de Libras para texto e voz

- [x] Reaproveitar o modelo de M3 sem pedir ao usuário que selecione o sinal. Começar com sinais isolados e, se necessário, usar início e fim explícitos para delimitar cada tentativa. Processar as imagens no dispositivo.
- [x] Adicionar uma entrada de texto por tentativa reconhecida. Permitir editar, limpar e ouvir o resultado em português brasileiro com síntese gratuita. Uma voz robótica atende à demonstração. Manter o texto editável e indicar o problema quando o áudio estiver indisponível.
- [x] Verificar no Chromium que uma sustentação acrescenta uma palavra, duas tentativas intencionais acrescentam duas e o texto continua editável após falha ou ausência de voz. Verificar a preservação do texto em tentativas inconclusivas. [Resultados com clipes de teste](docs/regressao-area-livre.md)
- [x] Interromper a leitura quando a transcrição mudar. No Chromium, verificar que **Ouvir** lê a versão atualizada e que o texto permanece editável após uma falha de voz. [Reteste de edição e voz](docs/regressao-area-livre.md#edição-durante-a-leitura)
- [x] Conservar a transcrição ao visitar outras telas na mesma página. Conferir no Chromium a liberação da webcam ao sair, a restauração do texto ao voltar e o descarte ao limpar ou recarregar. [Reteste de navegação](docs/regressao-area-livre.md#transcrição-ao-navegar)
- [x] Aplicar a concordância de Cinco no modo com pausas. Repetir Cinco + Aluno no Chromium e verificar que Cinco + Espelho continua correto. [Reteste com gravações](docs/regressao-area-livre.md#concordância-em-sequências-com-pausas)
- [x] Medir o treino com janelas de sinais fora do catálogo. Nas rodadas por pessoa, a falsa aceitação em pelo menos um recorte passou de 15/42 para 3/42 gravações. [Treino e resultados por gravação](docs/avaliacao.md#treino-com-janelas-parciais-de-negativos)
- [x] Corrigir a regressão de Banco em um candidato local e verificar o controle com Cinco e Espelho. O combinado rejeitou 10/10 janelas de Banco e acertou 4/4 controles. [Reteste de regressão no Chromium](docs/janelas-area-livre.md)
- [x] Verificar a transcrição do combinado com movimentos de Espelho e Amarelo em velocidade original. As oito reproduções de clipes de treino acertaram a glosa e preservaram o texto anterior. [Controles de movimento no Chromium](docs/sinais-com-movimento-browser.md)
- [x] Adquirir 14 tomadas adicionais de treino e medir o efeito sem mudar as pessoas da validação e da medição. [Comparação por sinal](docs/avaliacao.md#gravações-adicionais-de-espelho-e-amarelo)
- [x] Medir regras de rejeição para Cinco e Aluno e testar a posição e a direção da mão em 27 janelas de desenvolvimento da UFSM. As regras avaliadas perderam acertos de Cinco na validação. [Comparação geométrica e critérios de coleta](docs/transicao-sete-oito.md)
- [x] Reproduzir um falso Cinco em Oito→Nove em uma gravação de desenvolvimento com Cinco isolado da mesma pessoa e do mesmo enquadramento. Medir a confirmação temporal no par e nos controles do MINDS e congelar a regra para outra pessoa. [Numerais pareados e confirmação temporal](docs/transicao-sete-oito.md)
- [x] Obter um segundo par independente de Cinco correto e transição falsamente aceita como Cinco. A confirmação temporal conservou os dois Cinco corretos e deixou passar os nove falsos aceites da aula do Cecierj. [Segundo par](docs/transicao-sete-oito.md#segundo-par-independente-na-aula-da-cecierj)
- [x] Ajustar vetos de forma e movimento com validação cruzada por gravação. Os perfis separadamente rejeitaram as transições difíceis e perderam um Cinco correto em rodadas diferentes. A combinação pós-hoc preservou os corretos e rejeitou as dez janelas difíceis nesta comparação. [Validação cruzada e pesos congelados](docs/transicao-sete-oito.md)
- [x] Verificar a retenção dos Cinco válidos na primeira gravação externa. No ensaio offline da UFAC, o veto preservou as três janelas de Cinco. Todas as 16 janelas de transição já foram rejeitadas pelo controle. [Protocolo e resultados](docs/transicao-sete-oito.md)
- [x] Avaliar a sessão de Uéslei Paterno indicada pelo IFSC com os mesmos pesos congelados. O combinado deixou quatro Cinco inconclusivos e aceitou três janelas da mesma transição como Espelho. Nenhuma transição exibiu Cinco. [Segunda avaliação externa](docs/transicao-sete-oito.md#segunda-avaliação-externa-com-videoaula-do-ifsc)
- [x] Avaliar numerais em vídeo do IFPA com os pesos congelados. O rastreamento perdeu as duas janelas de Cinco e o combinado aceitou duas janelas de Nove→Zero como Espelho. [Ensaio do IFPA](docs/transicao-sete-oito.md#ensaios-com-ifpa-e-ufac)
- [x] Confirmar a redução de falsos Cinco numa gravação externa que contenha Cinco válido e um movimento confundido com Cinco. Na aula de quantidades da UFAC, o veto preservou os dois Cinco e rejeitou as três janelas sobrepostas de Seis→Sete→Oito. [Confirmação externa](docs/transicao-sete-oito.md#ensaios-com-ifpa-e-ufac)
- [x] Avaliar os vetos congelados na reserva Fiocruz, CLAD e MINDS. O veto preservou Cinco e rejeitou Sete→Oito na Fiocruz, mas reduziu os acertos de Cinco de 8/9 para 3/9 no MINDS teste. O resultado impede a promoção para a demonstração. [Comparação na reserva](docs/transicao-sete-oito.md#avaliação-na-reserva)
- [x] Rejeitar o falso Aluno de queixo → teclado e preservar o reconhecimento de Aluno nos testes do MINDS e no Chromium. [Verificação e reteste](docs/negativos.md#verificação-de-aluno-pela-posição-da-mão)
- [x] Mostrar a cobertura do modelo instalado na Área livre antes de ativar a câmera. Avisar se o catálogo local estiver indisponível. [Reteste da Área livre](docs/regressao-area-livre.md#aceite-técnico-de-m5)
- [x] **Aceite técnico.** Em duas tentativas, Cinco e Espelho entraram no texto sem seleção prévia. O Chromium concluiu a síntese local em pt-BR após a edição. No controle sem mãos, o texto foi preservado. O ensaio de participantes, a audição humana e os casos restantes de falsos aceites seguem no [arquivo de pendências futuras](docs/pendencias-futuras.md#m4-e-m5--alfabeto-sinais-área-livre-e-voz).

### M6 · Saiba mais, autoria e caráter sem fins lucrativos

- [x] Implementar **Saiba mais** como lista de redirecionamentos para as fontes originais do prompt. Exibir título e autoria ou instituição. Esse fluxo consiste apenas em links externos.
- [x] Abrir os links de **Saiba mais** em outra aba e conferir os sete destinos no Chromium. Retestar a volta à Área livre com o texto editado disponível. [Resultado por destino](docs/roteiro-validacao.md#conferência-dos-sete-links-de-saiba-mais)
- [x] Publicar no rodapé e no README a mensagem “O LibrasIA é uma iniciativa educacional sem fins lucrativos, desenvolvida por Luan Fernandes e Wellington Sales.” Manter o acesso gratuito, sem monetização ou afiliação comercial.
- [x] **Aceite.** O revisor abre cada link, confere título, autoria e destino e encontra a mesma declaração no aplicativo e no README.

### M7 · Validação independente e versão de demonstração

- [x] Executar instalação limpa, compilação e testes automatizados, incluindo navegação por teclado, foco, mensagens, liberação da câmera e retomada após erro.
- [x] Verificar uma tentativa no Chromium após desconectar a rede, com os modelos carregados e a mesma trilha de vídeo ativa. [Ensaio técnico e sonda de rede](docs/janelas-area-livre.md#reconhecimento-após-desconectar)
- [x] Preparar o formulário local com versão dos ativos, observação humana, decisão do app, dicas, latência e audição. Calcular métricas a partir das fichas elegíveis, separadas por versão. [Ficha e instruções](docs/validacao-ao-vivo.md)
- [x] Incluir a ficha no pacote local e verificar no Chromium o preenchimento da versão e das somas do modelo, o registro de uma tentativa de teste e a exportação em JSON. Incluir verificações para os pontos das mãos e o N antes das sessões com participantes. [Ficha empacotada](docs/validacao-ao-vivo.md#abrir-no-linux)
- [x] Identificar os pesos e manifestos do alfabeto na ficha e no resumo das sessões. Conferir a soma e a exportação no Chromium após recompilar a demonstração. [Verificação da versão](docs/validacao-ao-vivo.md#verificação-da-versão-do-alfabeto)
- [x] Empacotar uma prévia local versionada para testar a webcam, os pontos das mãos e a classificação do modelo combinado. [Prévia v0.1.0-preview.1](docs/previa-estavel.md)
- [x] Recompilar a demonstração em checkout limpo com os pesos e manifestos fixados. Conferir a integridade da cópia, a rejeição de um arquivo alterado e o funcionamento no Chromium. [Pacote e reteste](docs/previa-estavel.md#recompilar-com-os-modelos-verificados)
- [x] Montar a demonstração em checkout limpo a partir dos pesos locais, verificar as somas antes de compilar e repetir o roteiro no Chromium. Reexportar o combinado a partir dos checkpoints e conferir a paridade no WASM. [Reprodução e teste do pacote](docs/previa-estavel.md#recompilar-com-os-modelos-verificados)
- [x] Executar a verificação técnica da demonstração no Chromium. Conferir as sequências completas do tradutor, a lição com Cinco gravado, a rejeição de Banco, a transcrição com Cinco e Espelho, a voz local a partir do texto editado e a abertura de um destino de Saiba mais. [Resultados e limites](docs/roteiro-validacao.md#verificação-técnica-de-27-de-novembro-de-2026)
- [x] Rodar o roteiro técnico em uma sessão do Chromium, na ordem prevista. Abrir uma letra, traduzir uma frase, soletrar um nome, aceitar uma execução e exibir uma dica, produzir texto e voz na Área livre e abrir um link de Saiba mais. Usar vídeos gravados nas tentativas e registrar ambiente, resultados e limites. [Roteiro integrado](docs/roteiro-validacao.md#roteiro-integrado-em-uma-sessão-do-chromium)
- [x] Corrigir o atalho **Ir para o conteúdo** para preservar a tela, o foco e o histórico. No pacote `aa32d96`, confirmar recarga e retorno pelo navegador, repetir o roteiro com gravações e retestar a captura física e a voz local. [Reteste no Chromium](docs/roteiro-validacao.md#reteste-do-atalho-de-conteúdo)
- [x] Preparar roteiro, registrar resultados medidos e compilar a minuta do memorial com as limitações e evidências disponíveis.
- [x] Identificar a demonstração local com a tag `v1.1.0` e documentar a recompilação com os pesos e manifestos fixados. [Pacote e execução](docs/previa-estavel.md#prévia-de-trabalho)
- [x] **Aceite técnico.** Um checkout limpo reproduziu o pacote e o roteiro integrado passou no Chromium com gravações. Os controles de integridade, exportação da ficha, retomada da webcam física e reconhecimento após desconectar também passaram. [Evidências de M7](docs/roteiro-validacao.md#aceite-técnico-de-m7) · [Pendências de revisão e memorial](docs/pendencias-futuras.md#m7--demonstração-independente-e-inscrição)

## Ordem de validação e registro

1. **Dados e referências.** Validar licenças, identidade das amostras, separação dos conjuntos e catálogo antes de treinar ou distribuir ativos.
2. **Componentes.** Automatizar os testes da normalização de nomes, da fila de animações, dos estados de reconhecimento e da montagem de transcrição. Revisar as animações e dicas com pessoas surdas fluentes em Libras quando houver disponibilidade, registrando as pendências.
3. **Integração.** Testar primeiro um sinal no PC. Só depois aumentar o catálogo e exercitar os fluxos sem câmera, com webcam e com voz. Verificar o tratamento de entradas desconhecidas e a privacidade no navegador.
4. **Modelo e usabilidade.** Rodar o teste reservado da versão escolhida e comparar o feedback com a revisão humana. Se houver um piloto de aprendizagem, observar se a dica ajuda a melhorar a tentativa seguinte e relatar a amostra e as limitações. Tratar esse piloto como uma avaliação separada do reconhecimento.
5. **Regressão e demonstração.** Quando mudar dados, pesos, limiar ou animação, retestar os exercícios afetados. Preservar evidências e versões suficientes para reproduzir o teste no mesmo ambiente.

Para cada aceite, registrar data, responsável, commit, versões relevantes dos ativos, cenário testado, resultado esperado, resultado observado e pendências. A equipe pode usar o formato que já adota para a revisão independente e os retestes.

## Trilha da inscrição no prêmio

O checklist reúne os requisitos da inscrição. A finalização do memorial fica pendente para quando a equipe orientar a retomada dessa entrega.

O prazo confirmado é **30 de novembro de 2026 às 23h59, horário de Brasília**. Trabalhar com **29 de novembro** como data interna para fechar a versão que será apresentada. Esse recorte curto depende de chegar a um protótipo funcional com evidências próprias. O restante do roadmap continua após a inscrição. [Comunicado da UFC sobre a prorrogação](https://ufcinforma.ufc.br/pt/noticias/premio-inteligencia-artificial-e-formacao-universitaria-prorroga-inscricoes-projetos-e-solucoes-em-ia-ate-3011) · [Edital oficial, itens 4 a 8](https://catedraldt.virtual.ufc.br/wp-content/uploads/2026/11/edital-premio-catedra-ia-2026.pdf)

| Janela proposta | Entrega para a inscrição |
| --- | --- |
| **26–27 de novembro** | Base local compilada e verificada no Chromium. Registrar a ressalva sobre N e as tarefas de validação que seguem abertas. |
| **28 de novembro** | Buscar o aceite funcional de M2, gravar apenas resultados reais e decidir quais funções adicionais já validadas entram na demonstração. |
| **29 de novembro** | Data interna proposta para repetir a demonstração e decidir o que pode entrar na inscrição. A equipe confirma o andamento da documentação antes de fechar o pacote. |

Para a **Categoria III**, apresentar a solução funcional acompanhada do memorial técnico. Usar os resultados disponíveis para explicar arquitetura, contribuições humanas, uso de IA, aplicabilidade e limitações. Se o fluxo funcional não passar pelos testes, registrar o bloqueio antes de tratar o material como protótipo pronto. Usar o [guia do prêmio](<Guia do Prêmio Cátedra IA.html>) para a conferência e o edital oficial para requisitos da inscrição.

### Checklist da inscrição

- [x] Confirmar Categoria III, Eixo III, Área 5 e o prazo pelo edital e pelo aditivo.
- [x] Preparar a minuta do resumo identificado e do memorial técnico. Separar as páginas oficiais dos Anexos II, III e IV.
- [ ] Designar a pessoa responsável pela inscrição e pelas comunicações com a comissão. Conferir nome completo, e-mail institucional, tipo de vínculo e unidade acadêmica de cada integrante. Confirmar vínculo ativo e regular com a UFC na data da inscrição, ausência de impedimentos e anuência ao edital (itens 3.2 a 3.4 e Aditivo nº 1).
- [ ] Confirmar que a equipe fará uma única inscrição na Categoria III e que o mesmo material será apresentado por uma só equipe e em uma só categoria (itens 4.3 e 5.2.2).
- [ ] **Documento 1.** Reunir a identificação oficial com foto de cada integrante.
- [ ] **Documento 2.** Reunir os comprovantes de vínculo com a UFC. Usar declaração ou atestado de matrícula para discentes e declaração funcional ou portaria para docentes e pesquisadores. O edital dá preferência ao SIGAA.
- [ ] **Documento 3.** Fechar o resumo identificado com título, categoria, eixo temático e integrantes. Conferir o limite de 1.500 caracteres sem contar espaços.
- [ ] **Documento 4.** Finalizar o **memorial técnico descritivo** da solução funcional. Informar a versão demonstrada, o método, os testes, os resultados medidos, as limitações, o uso de IA generativa e as contribuições intelectuais humanas verificáveis. Revisar a capa, o resumo de até 1.500 caracteres sem espaços, a introdução, o desenvolvimento, a conclusão e as referências. Conferir o Anexo I com até 20 laudas, Times New Roman 12, entrelinhas 1,5, margens de 3 cm e texto justificado.
- [ ] Revisar o memorial pelos critérios do item 8.3. Explicar a contribuição original, o vínculo com a formação universitária, a funcionalidade demonstrada e a viabilidade de uso. Conferir os dados com os registros de teste, citar as fontes e validar a declaração de uso de IA e as contribuições humanas com os autores.
- [ ] **Documento 5.** Preencher o Anexo II de originalidade e autoria. Coletar assinatura digital ou eletrônica de todos os integrantes.
- [ ] **Documento 6.** Preencher o Anexo III de uso de IA generativa, marcando **Sim** pelo uso do Codex. Coletar assinatura digital ou eletrônica de todos os integrantes. Conferir também a declaração explícita no corpo do memorial.
- [ ] **Documento 7.** Preencher o Anexo IV de ciência e concordância. Coletar assinatura digital ou eletrônica do responsável e/ou dos demais integrantes, conforme o item 6.1.
- [ ] Reunir os documentos obrigatórios em um único PDF legível, sem rasuras e de até **40 MB**. Verificar assinaturas, ordem dos documentos e consistência do título e da classificação com o formulário oficial.
- [ ] Com o PDF conferido pelos responsáveis, enviar pelo formulário oficial dentro do prazo e guardar a confirmação. O envio é definitivo conforme o item 5.3.1.
- [ ] Após o envio, acompanhar o e-mail institucional e o portal da UFC. Responder a pedidos da comissão em até **três dias úteis**. O cronograma prevê resultados parciais em **15/01/2027** e **15/03/2027**, com os dois dias corridos seguintes para eventual recurso.

O item 6.1 exige o memorial como documento principal da Categoria III. Os relatórios do modelo e dos testes servem de evidência para o memorial. **Documento 8, opcional.** Caso a equipe inclua vídeo, fotos, protótipo navegável ou repositório, conferir a autoria e testar o acesso público de cada link. A versão web segue local conforme orientação da equipe. [Edital](https://catedraldt.virtual.ufc.br/wp-content/uploads/2026/11/edital-premio-catedra-ia-2026.pdf) · [Aditivo nº 1 e cronograma atualizado](https://ufcinforma.ufc.br/storage/ufc-media/docs/doc-261105-aditivo-premio-catedra-luiza-teodoro.pdf) · [Como preparar os documentos](docs/inscricao.md)

## Depois da demonstração no PC

O marco de publicação na Vercel depende do aceite de M7 e da autorização dos responsáveis. A execução permanece local nesta rodada.

| Próximo marco | Status | O que implementar e como validar |
| --- | --- | --- |
| **M8 · Aprendizagem e engajamento** | Pronto | Comparações no avatar, revisão por tentativas e retomada do sinal já estudado. A ordem da revisão e a persistência passaram nos testes. O piloto com pessoas fica nas pendências. |
| **M9 · Cobertura e variantes** | Pronto | Aluno no catálogo avaliado, comparação da forma histórica de Fortaleza no avatar e apresentação com saudação. A revisão com pessoas e o reteste de variantes ficam nas pendências. |
| **M10 · Sinalização contínua** | A testar | Modo experimental local com fronteiras, glosas, tradução e confirmação. Os controles com gravações passaram. Faltam dados naturais anotados com cobertura para medir o reconhecimento e revisar o sentido. |
| **M11 · Web móvel na Vercel** | A testar | Toque, telas estreitas e rotação testados no Chromium local. A publicação HTTPS e os testes em Android e iPhone reais dependem de acesso e autorização. |

### Trilha de aulas · Primeiro encontro

- [ ] Implementar a trilha inicial de soletração do nome, saudação, apresentação, pedido de repetição e agradecimento. Começar pelas duas primeiras aulas com o avatar e a apresentação de M9. [Roadmap das aulas, fontes e critérios de aceite](docs/roadmap-aulas-libras.md)

### M8 e M9 · Checklist de conteúdo e aprendizagem

- [x] Disponibilizar a comparação de itens no avatar, o progresso da lição e a revisão local que prioriza tentativas pendentes. Verificar a ordem depois de um acerto e a persistência após recarga.
- [x] Ampliar o catálogo experimental da área livre com Aluno e incluir a referência histórica de Fortaleza no avatar. Registrar a cobertura de frases e as métricas do modelo expandido. [Escopo das animações](docs/animacoes.md) · [Avaliação expandida](docs/avaliacao.md)
- [x] **Aceite técnico de M8.** Comparar sinais da lição sem câmera e voltar à demonstração individual. Conferir a retomada de um sinal já estudado, a prioridade de tentativas pendentes e a persistência do progresso. [Reteste de M8](docs/roteiro-validacao.md#comparação-e-revisão-em-m8) · [Piloto](docs/pendencias-futuras.md#m8-a-m11--piloto-cobertura-dados-contínuos-e-publicação)
- [x] **Aceite técnico de M9.** Reproduzir a apresentação com saudação e nome. Distinguir na interface a forma de Aluno usada na avaliação da forma histórica disponível no avatar. Retestar Aluno e um movimento fora do catálogo com gravações. [Cobertura e reteste de M9](docs/animacoes.md#cobertura-e-reteste-de-m9)

### M10 · Checklist de sinalização contínua

- [x] Treinar e medir geração experimental de texto em gravações de frases, com partição reservada. Registrar erros de inserção, omissão e troca e reproduzir a inferência no Chromium. [Avaliação de geração](docs/sinalizacao-continua.md)
- [x] Treinar e comparar segmentação supervisionada de fronteiras com uma regra de movimento, usando duplas diferentes em treino, validação e teste. [Protocolo e condições de uso](docs/fronteiras.md)
- [x] Verificar quais fontes de vídeo oferecem glosas, texto em português, identificação de sinalizantes e condições de acesso. [Triagem e fontes candidatas](docs/dados-glosas.md)
- [x] Treinar o componente glosas para português com pares textuais e medir WER e frases exatas em uma partição reservada. [Resultado em 1.800 pares do VLibrasBD](docs/glosas-texto.md)
- [x] Comparar o gerador congelado com um tradutor monotônico em outras 1.800 frases, sem chaves normalizadas do primeiro ensaio. O WER passou de 61,57% para 50,66%. [Comparação e erros por método](docs/comparacao-glosas.md)
- [x] Integrar a detecção de fronteiras, o reconhecimento de glosas e a geração de texto em um fluxo experimental local com webcam. [Execução e ensaio no Chromium](docs/sinalizacao-continua.md#fluxo-contínuo-experimental-na-câmera)
- [x] Permitir revisar os sinais detectados e confirmar a sugestão antes de acrescentar texto na sinalização contínua. Verificar uma sequência parcial com vídeo gravado e validar a captura em repouso na webcam física. [Revisão de sinais no Chromium](docs/sinalizacao-continua.md#revisão-dos-sinais-detectados)
- [x] Preservar o numeral Cinco na sugestão do modo contínuo. Comparar o tradutor congelado e o candidato em 84 sequências do catálogo e nas partições textuais reservadas. Confirmar a sugestão no Chromium e registrar os casos em que a captura ficou inconclusiva. [Comparação e teste da prévia](docs/sinalizacao-continua.md#preservação-do-numeral-cinco)
- [x] Comparar o detector original, a recalibração e o retreino com pontos do Holistic na validação. [Comparação de fronteiras](docs/fronteiras.md#comparação-com-pontos-do-holistic-web)
- [x] Medir o controle de fragmentação do Holistic em três gravações reservadas. Com penalidade e piso de cinco posições, as referências fragmentadas caíram de 31 para 19 e os pareamentos de 71 para 64. [Teste reservado](docs/fronteiras.md#resultado-na-partição-reservada)
- [x] Integrar o controle de fragmentação como opção no Chromium e verificar a paridade com Python. Reproduzir a sequência de Amarelo e Espelho e o repouso sem alterar a transcrição em tentativas inconclusivas. [Resultado no navegador](docs/sinalizacao-continua.md#controle-de-fragmentação-no-navegador)
- [x] Comparar quatro configurações de fronteiras no diálogo didático contínuo do Cederj com dois intervalos aproximados de Amarelo. Verificar a redução das propostas com penalidade de corte e registrar a ausência de acerto de Amarelo e de sugestão de texto. [Piloto com vídeo em Chromium](docs/sinalizacao-continua.md#diálogo-didático-do-cederj)
- [x] Separar a perda de rastreamento da pessoa e a rejeição do classificador nas duas janelas de Amarelo. Conferir os escores nas janelas manuais, nas propostas automáticas e nos recortes laterais. [Diagnóstico de Amarelo](docs/sinalizacao-continua.md#diagnóstico-do-classificador-de-amarelo)
- [x] Comparar Amarelo em três recortes de uma pessoa no quadro. Medir separadamente o acerto na janela anotada e nas propostas automáticas. [Resultado no BioCiNAIS e na UFSM](docs/sinalizacao-continua.md#amarelo-com-uma-pessoa-no-quadro)
- [x] Medir saídas fora do vocabulário em 12 frases do teste oficial do EQT-UECE. Os quatro detectores mantiveram as tentativas inconclusivas, embora tenham atribuído rótulos a alguns trechos. Repetir dois vídeos pela captura da Área livre e verificar a preservação do texto. [Ensaio no Chromium](docs/sinalizacao-continua.md#frases-do-eqt-fora-do-vocabulário)
- [x] Medir glosas e texto em 12 sequências controladas de dois sinais do MINDS-Libras. As 24 janelas anotadas foram reconhecidas quando fornecidas isoladamente ao classificador. A segmentação automática fragmentou os sinais e nenhuma sequência foi reconhecida por inteiro. [Sequências montadas e resultados](docs/sinalizacao-continua.md#pares-de-sinais-do-catálogo-no-chromium)
- [x] Aplicar a concordância em “cinco alunos”, “cinco espelhos” e “cinco espelhos amarelos”. Conferir a revisão após uma captura de vídeo gravado e medir a tradução das glosas de referência nos 12 pares do MINDS. [Concordância e ensaio no Chromium](docs/sinalizacao-continua.md#concordância-com-cinco)
- [x] Usar as pausas quando formam dois ou mais trechos com ao menos uma glosa reconhecida no modo contínuo. Medir glosas e texto nos 12 pares montados do MINDS e conferir a confirmação na Área livre, a revisão parcial e a preservação da transcrição no controle do EQT. [Avaliação e captura no Chromium](docs/sinalizacao-continua.md#pausas-no-modo-contínuo)
- [x] Exibir os tempos dos trechos na revisão. Conferir as marcações em sequências completas e parciais e removê-las após confirmar o texto. [Reteste do modo experimental](docs/sinalizacao-continua.md#tempos-dos-trechos-na-revisão)

A medição em sequências naturais anotadas, a validação na webcam e as condições de uso formal da fonte estão no [arquivo de pendências futuras](docs/pendencias-futuras.md#m8-a-m11--piloto-cobertura-dados-contínuos-e-publicação).

### M11 · Checklist de publicação e compatibilidade

- [x] Adaptar o layout para toque e telas estreitas. Verificar o encaixe em 390 px, a recuperação após voltar à aba e os avisos de câmera e voz na prévia local do Chromium.
- [x] Medir no Chromium do PC o tempo da conclusão à decisão, da extração por quadro e do primeiro carregamento, com o avatar em reprodução nas tentativas gravadas. Conferir as mensagens e a recuperação de câmera e voz no PC. [Latência da prática guiada](docs/roteiro-validacao.md#latência-da-prática-guiada-no-pc) · [Câmera e voz no pacote](docs/previa-estavel.md#demonstração-atual-no-pc)
- [x] Percorrer as cinco telas por toque em 320 px no Chromium. Ativar a câmera, girar a tela com a trilha em andamento e liberar a captura ao sair. Conferir os tipos de conteúdo e os cabeçalhos dos ativos na prévia local. [Reteste local de M11](docs/publicacao.md#verificação-local-de-m11)

As etapas de publicação e aceite em aparelhos reais estão no [arquivo de pendências futuras](docs/pendencias-futuras.md#m8-a-m11--piloto-cobertura-dados-contínuos-e-publicação).
