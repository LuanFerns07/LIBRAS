# Roadmap do LibrasIA

O projeto de Luan Fernandes e Wellington Sales é uma iniciativa educacional sem fins lucrativos. A primeira versão é uma aplicação web para demonstração em um PC com webcam, com prática guiada, alfabeto manual em 3D, tradução de textos suportados para Libras e reconhecimento em área livre com saída em texto e voz gratuita. O [prompt de implementação](PROMPT_LIBRASIA.md) reúne os requisitos do produto e os papéis dos agentes.

## Marcos e dependências

O coordenador integra as entregas e atualiza a coluna **Status**, que alimenta o painel do README. **A fazer** indica implementação pendente ou em curso. **A testar** indica implementação concluída com validação pendente. **Pronto** indica que os critérios de aceite foram cumpridos. O revisor independente confere as evidências antes da versão de demonstração.

Ao mudar um status, rode `python3 scripts/update_status.py` e inclua `assets/status.svg` no mesmo commit.

| Marco | Status | Entrega | Responsáveis principais | Quando avançar |
| --- | --- | --- | --- | --- |
| **M0 · Fundação** | Pronto | Git local, aplicação inicial e ambiente definido | Git e ambiente, coordenador | Um segundo integrante consegue executar a base a partir do README. |
| **M1 · Dados e critérios** | A testar | Fontes verificadas, primeiro catálogo de sinais, contrato entre componentes e plano de testes | Dados e ML, Libras e avatar, coordenador | Há base utilizável, sinais viáveis para o avatar e conjuntos de avaliação definidos antes do treino. |
| **M2 · Um sinal de ponta a ponta** | A testar | Avatar 3D, webcam real e uma dica específica de prática | Integração, UX, Dados e ML, Libras e avatar | Uma execução esperada, uma correção e uma falha de captura têm respostas distintas no PC. |
| **M3 · Lição e reconhecimento** | A testar | Lição com três a cinco sinais e modelo avaliado | Dados e ML, UX, Libras e avatar, integração | A lição funciona nos três estágios e cada sinal anunciado tem evidência de reconhecimento e feedback revisado. |
| **M4 · Alfabeto e texto para Libras** | A testar | A–Z e Ç no avatar e na leitura ao vivo, tradutor de textos suportados e soletração de nomes | Libras e avatar, UX, integração | As poses, a leitura pela webcam e os exemplos de tradução e soletração passam pela revisão. |
| **M5 · Área livre e voz** | A testar | Sinalização sem alvo pré-selecionado, transcrição editável e leitura gratuita | Integração, Dados e ML, UX | O texto vem de sinais reais, casos incertos ficam visíveis e o áudio usa o texto confirmado no PC. |
| **M6 · Saiba mais e créditos** | Pronto | Links externos, créditos e declaração sem fins lucrativos | UX, revisão independente | Os destinos conferem com os títulos e a mensagem aparece no app e no README. |
| **M7 · Demonstração validada** | A testar | Versão marcada no Git, evidências, roteiro e memorial técnico | Revisão independente, Git e ambiente, coordenador | A equipe repete a demonstração seguindo o README e fecha os defeitos que impedem o uso. |

**Caminho principal** · M0 → M1 → M2 → M3 → M5 → M7. A preparação das animações de M4 pode começar junto com M1, e a integração de M4 pode avançar após o player de M2. M6 pode ser feito em paralelo com M3 a M5. M7 depende do aceite de M3, M4, M5 e M6.

## Prioridades da retomada

A prévia integrada reúne alfabeto e leitura de letras ao vivo, tradutor, prática e transcrição com voz. No PC de referência, ficam disponíveis as telas de [Praticar](http://127.0.0.1:4177/#praticar) e [Área livre](http://127.0.0.1:4177/#area-livre). [Roteiro e resultados no Chromium](docs/roteiro-validacao.md#verificação-técnica-de-27-de-novembro-de-2026)

1. **Fechar a demonstração local (M2 a M7).** Rodar alfabeto, frase, nome, lição, transcrição e voz, e conferir um destino de Saiba mais. Corrigir falhas de implementação que impeçam o roteiro. Registrar por etapa o que funcionou com vídeo gravado e o que foi verificado com webcam e voz locais.
2. **Concluir os aceites com participantes quando houver disponibilidade.** Rever as dicas de prática, o sinal N ao lado de M e U, as poses e sequências do avatar, a perda e a retomada de uma mão, e a compreensão do texto falado. [Referências da pose N](docs/animacoes.md#triagem-da-letra-n) · [Ficha de validação](docs/validacao-ao-vivo.md)
3. **Retomar a otimização após a demonstração.** Usar os controles reservados de A, Q, R, U, Y e Z, e os falsos aceites de transições, como conjunto de regressão. [Controles do alfabeto](ml/evidence/alphabet-a-q-r/README.md) · [Avaliação externa de Cinco](docs/transicao-sete-oito.md)

A prévia permanece no Linux local. A publicação na Vercel e a finalização do memorial estão adiadas por orientação da equipe.

## Implementação e aceite por marco

### M0 · Fundação e versionamento

- [x] Confirmar o PC de referência, o navegador, a webcam e a disponibilidade de uma voz gratuita em português brasileiro. Registrar o ambiente usado para os testes e o plano de síntese local se faltar uma voz compatível.
- [x] Inicializar o Git local, criar o primeiro commit e documentar como instalar, executar e testar a aplicação. Se a pasta principal estiver protegida, preservar os arquivos de origem e inicializar a pasta gravável da aplicação dentro do espaço de trabalho.
- [x] Versionar código, documentação, configurações e manifestos de dados, modelos e animações. Manter vídeos brutos, segredos e artefatos pesados fora do histórico. Definir como recuperar a versão exata de cada artefato usado na demonstração.
- [x] Concentrar a implementação, os testes e a atualização do roadmap na `main`, com commits verificados e push no remoto do projeto.
- [x] **Aceite.** A revisão técnica independente iniciou a base em um checkout limpo e executou a verificação inicial. Git, voz e webcam têm um caminho de configuração documentado.

### M1 · Dados, vocabulário e protocolo de validação

- [x] Levantar os conjuntos públicos candidatos e registrar origem, versão, licença, termos de uso, cobertura de sinais, qualidade dos rótulos e identificação de pessoas sinalizantes. Conferir separadamente as permissões para uso em treino, demonstração e distribuição dos pesos ou ativos.
- [x] Escolher três a cinco sinais pela utilidade pedagógica, qualidade dos exemplos e viabilidade de animação. Começar por um sinal cujo parâmetro principal seja observável pela webcam. Incluir movimento se houver dados e referência suficientes.
- [x] Definir o catálogo compartilhado com identificador de letra ou sinal, saída textual, referência, animação, versão e status da revisão. Para os exercícios, identificar o parâmetro avaliado, as variantes contempladas e as dicas permitidas.
- [x] Fixar a separação por pessoa sinalizante entre treino, validação e teste quando houver identificadores. Registrar a limitação das fontes sem esse metadado e verificar duplicatas.
- [x] Medir a rejeição dos modelos congelados em gravações externas de repouso e movimentos cotidianos. [Teste com 12 trechos do CLAD](docs/negativos.md#resultado-de-26-de-novembro-de-2026)
- [x] Verificar os modelos congelados em amostras de sinais de videoaulas licenciadas. Registrar variantes, falhas de rastreamento e tamanho da amostra. [Verificação externa de Cinco e Amarelo](docs/sinais-independentes.md)
- [x] Medir a rejeição em 19 novos recortes externos de repouso, atividade cotidiana, transições e glosas fora do catálogo. Reproduzir três decisões na Área livre usando as gravações como câmera. [Resultados por estrato](docs/negativos.md#novas-posturas-transições-e-glosas-externas)
- [ ] Completar as amostras de repouso, movimentos comuns e sinais fora do catálogo com pessoas independentes na webcam. Registrar quantos casos chegaram ao classificador.
- [x] Definir antes do teste final as metas de reconhecimento, rejeição e latência, com base no tamanho do conjunto e no PC de referência. Ajustar o limiar de confiança somente com a validação. Preservar o teste final para a versão escolhida.
- [ ] **Aceite.** Catálogo inicial, registro de licenças, protocolo de avaliação e interfaces do player e do modelo revisados. O protótipo pode avançar com uma amostra exploratória, com essa condição registrada nas evidências.

### M2 · Primeiro sinal com webcam e avatar reais

- [x] Integrar o avatar lado a lado com a captura pela webcam, inferência e resposta do exercício. Usar o modelo treinado e verificar o caminho em navegador com vídeos rotulados e exemplos fora do catálogo.
- [x] Implementar quatro estados visíveis: execução aceita, dica acionável sobre um parâmetro, tentativa inconclusiva e problema de captura. Pedir nova tentativa quando a imagem ou a estimativa não derem base para corrigir o estudante.
- [x] Testar concessão e negação de câmera, saída do fluxo, troca de aba e reativação. Verificar que a aplicação processa os quadros localmente, sem transmitir ou persistir as imagens.
- [x] **Webcam física no Chromium.** Abrir a câmera ACER HD User Facing, conferir a trilha ativa e liberar a câmera ao sair da aba e da Área livre. [Prévia local dos pontos](docs/previa-estavel.md#pontos-das-mãos-ao-vivo)
- [x] **Vídeo gravado no Chromium.** Verificar 21 pontos por mão, movimento das duas mãos antes, durante e depois de uma tentativa, oclusão e retorno de uma mão, opção ligada por padrão e alternância durante a captura. Conferir o encaixe e o espelhamento em 1.280 e 390 px e a liberação da trilha ao navegar. [Vídeo e cenário](docs/teste-pontos-ao-vivo.md) · [Teste automatizado](tests/e2e/hand-overlay-live.test.mjs)
- [x] **Relato de uso na webcam.** A pessoa usuária confirmou que a sobreposição acompanhou bem os movimentos em tempo real.
- [ ] **Aceite visual na webcam física.** Na Área livre, registrar a retirada e o retorno de uma mão e conferir o alinhamento ao redimensionar a janela.
- [ ] Retestar enquadramento, mão encoberta, entrada fora da cobertura e correções intencionais em webcam com participantes. O teste reservado registrou falsas aceitações.
- [ ] **Aceite.** No PC, uma pessoa usa a câmera real para demonstrar o sinal, recebe uma dica adequada em uma tentativa com erro observável e vê um aviso distinto quando a captura falha. Registrar a versão e a evidência desse fluxo.

### M3 · Modelo avaliado e lição utilizável

- [x] Treinar uma versão reproduzível e medir a classificação em teste reservado. Registrar configuração, versões dos conjuntos, comandos, critérios de seleção e versão dos pesos.
- [x] Completar a lição com observar, praticar com ajuda e tentar com menos ajuda. Incluir uma atividade de compreensão sem câmera, controles do avatar e registro local do progresso.
- [x] Completar as três etapas de Cinco no Chromium com vídeo gravado e inferência real. Verificar resposta incorreta e correta na atividade, reconhecimento com e sem avatar e progresso após recarregar. Abrir a etapa pendente ao usar a revisão. [Resultado e comandos](docs/roteiro-validacao.md#lição-completa-de-cinco-no-chromium)
- [x] Exercitar a dica de trajetória de Amarelo no Chromium. Reproduzir a gravação original para verificar o reconhecimento e inverter a ordem dos quadros de um recorte para testar a resposta à trajetória contrária. Confirmar que a dica mantém a etapa pendente. [Teste controlado de trajetória](docs/roteiro-validacao.md#dica-de-trajetória-de-amarelo)
- [x] Medir precisão, revocação e F1 por sinal e média macro no teste reservado. Registrar matriz de confusão, cobertura, falsas aceitações e latência mediana e p95 no PC com clipes de teste. Contar tentativas inconclusivas na análise de cobertura e na revocação dos sinais suportados.
- [x] Medir o modelo combinado congelado nos 51 clipes reservados do MINDS. Observar 32/33 acertos no catálogo, 1/18 falso aceite e F1 macro de 0,972. [Avaliação do combinado](docs/avaliacao.md#modelo-combinado-na-partição-reservada)
- [ ] Medir as mesmas métricas com participantes independentes usando a webcam no PC, incluindo tempo de extração e carregamento.
- [ ] Comparar as dicas com avaliação humana nas amostras disponíveis. Verificar tanto a execução esperada quanto correções intencionais, variantes conhecidas, mão dominante, iluminação e enquadramento. Registrar quais dimensões foram testadas de fato e as que ficaram pendentes.
- [ ] **Aceite.** A lição funciona completa sem recorrer a inferência simulada. Cada item habilitado para correção tem dica revisada e resultados dentro dos critérios definidos em M1. Quando um sinal falhar, ele volta ao trabalho de dados, animação ou feedback antes de integrar o catálogo de prática.

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
- [x] Retestar M, N e U na prévia `5b2d4c4` com nove janelas gravadas do Cecierj, da Unesp e da UFAC. Confirmar N como única leitura nos três recortes de N e registrar a leitura adicional de H em um U. [Leituras e hashes](ml/evidence/alphabet-n-m-u/replay-5b2d4c4-mnu.json)
- [ ] Revisar com uma pessoa fluente a leitura visual do N no avatar em vista frontal, isolado e na soletração, ao lado de M e U. Registrar os ajustes de orientação ou flexão que a revisão confirmar.
- [ ] Reproduzir a dificuldade relatada com N na webcam física em Área livre e em Praticar. Registrar o rastreamento, a letra exibida, as trocas breves e a ausência de leitura durante o gesto sustentado e a sequência M → N → U. Usar o mesmo roteiro no reteste de qualquer ajuste.
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
- [ ] Coletar Q em outros ângulos pareado com P, treinar com diversidade de pessoas e verificar a aula explicativa da Unicentro e gravações reservadas.
- [x] Reproduzir o R indevido no movimento do queixo para o teclado com o classificador estático. As duas redes aceitaram R em sete quadros. A confirmação de forma separou esses quadros dos 49 votos de R válidos no ensaio offline, 35 em fontes fora do treino. [Diagnóstico do R aceito pelas redes](ml/evidence/alphabet-a-q-r/README.md#r-indevido-aceito-pelas-duas-redes)
- [x] Comparar no Chromium o veto de R e a recuperação de R aceito como U. O falso R do queixo ao teclado caiu de uma em cinco capturas a zero em cinco nas duas configurações. A configuração com recuperação exibiu R nas três repetições de Tel baixinha. Preservou os dez U já reconhecidos, incluindo o da UFF em vista oblíqua. [Replays e versões](ml/evidence/alphabet-a-q-r/README.md#confirmação-de-r-no-chromium)
- [x] Adotar a confirmação de R na prévia local após a regressão. A letra esperada apareceu em 88 de 89 recortes. O Z do Cecierj apareceu em três das cinco repetições adicionais em cada versão. Nenhum dos 19 negativos exibiu R. Os testes de R e da troca M → N passaram na porta 4177. [Bateria no Chromium](ml/evidence/alphabet-a-q-r/README.md#adoção-da-confirmação-de-r)
- [x] Treinar duas confirmações de U para os quadros em que a forma rejeita R. A versão 3D recuperou 22 dos 23 quadros do U da Uníntese amostrados no Chromium e zero quadros do movimento do queixo para o teclado. O ensaio também confirmou a forma de R nos quadros da UFF em que as redes divergiram. [Ensaio exploratório](ml/evidence/alphabet-a-q-r/README.md#casos-restantes-de-u-e-r)
- [x] Compilar a confirmação 3D de U e a rota de R na divergência entre as redes. Em 12 replays do Chromium, U e R da Uníntese e da UFF apareceram nas três repetições de cada recorte. Os dois casos recuperados passaram em Praticar e na Área livre. [Recuperação de R e U](ml/evidence/alphabet-a-q-r/README.md#recuperação-de-r-e-u-na-divergência)
- [ ] Concluir a regressão do candidato e verificar os recortes em novas orientações de Kelly Canuto.
- [ ] Investigar o U em perfil da aula explicativa da Unicentro e o R da UFAC, sem leitura na base e no candidato.
- [x] Integrar a confirmação de A no Chromium. Reproduzir A nas três repetições do recorte da UFSM e nos dois modos, repetir os 89 recortes rotulados e conferir que A apareça nos mesmos controles entre os 19 recortes fora do alfabeto. [Teste e compilação adotada](docs/dados-alfabeto.md#confirmação-3d-de-a-na-prévia-local)
- [ ] Retestar A com outras pessoas e vistas na webcam. Acompanhar as trocas de S/A e E/O em gravações reservadas.
- [x] Reproduzir o falso Z no sinal Azul da UFSM em uma de três capturas e comparar o candidato na mesma sequência de pontos. No replay pareado, o falso Z caiu para zero em três capturas e os quatro Z já reconhecidos permaneceram nas cinco janelas rotuladas. O candidato está na branch local `diagnostico-z-azul`, commit `605cacc`.
- [x] Rodar o pacote experimental para Azul de ponta a ponta no Chromium. O candidato exibiu os mesmos quatro Z em cinco janelas, preservou as letras esperadas nos controles C/Ç/H/J/K/X/Y e registrou zero Z nas três repetições de Azul e nos 19 controles fora do alfabeto. [Ensaios do candidato](docs/dados-alfabeto.md#ensaio-do-candidato-de-z-em-azul)
- [x] Comparar as duas versões nas dez janelas adicionais. Preservar Ç e U e reproduzir o Z do Cecierj em uma de duas repetições com cada versão. Integrar a regra de Z à prévia 4177 e testar Z, a troca M → N e a sobreposição de duas mãos no Chromium. [Comparação e compilação adotada](docs/dados-alfabeto.md#ensaio-do-candidato-de-z-em-azul)
- [x] Diagnosticar o Z curto da aula `1536677587` da UFSM. Em seis capturas sem Z no painel, duas detecções de mão sobrepostas interrompiam um traço. O candidato recuperou Z no replay dos mesmos pontos com os pesos da prévia. [Diagnóstico e replays pareados](docs/dados-alfabeto.md#retomada-do-z-curto-da-ufsm)
- [x] Confirmar o Z curto nas três novas capturas do candidato no Chromium, em Praticar e na Área livre. Comparar os mesmos pontos de 19 negativos, três repetições de Azul e os outros quatro Z já reconhecidos. [Ensaios do candidato](docs/dados-alfabeto.md#retomada-do-z-curto-da-ufsm)
- [x] Comparar três Z e três Y de outras pessoas no Chromium. Os três Z apareceram nas duas versões. O Y de Tel baixinha apareceu nas duas versões e os dois outros Y ficaram sem leitura. [Gravações independentes](docs/dados-alfabeto.md#retomada-do-z-curto-da-ufsm)
- [x] Retestar Azul, X, as demais letras de movimento e os negativos no Chromium e adotar a retomada de Z na porta 4177. A letra esperada apareceu nos 16 controles rotulados, incluindo os cinco Z. Z ficou ausente nos 19 negativos e nas três repetições de Azul. [Pacote e evidências](docs/dados-alfabeto.md#retomada-do-z-curto-da-ufsm)
- [x] Treinar e testar um complemento de Y pelas posições dos dedos. A base exibiu Y em quatro de nove repetições e o candidato exibiu Y nas nove repetições de três pessoas e passou em Praticar e na Área livre com os vídeos de Uéslei Paterno e da Unicentro. O par W/Y da UFAC preservou as duas leituras. [Treino e replays](docs/dados-alfabeto.md#confirmação-de-y-pela-forma-da-mão)
- [x] Verificar a regressão de Y no Chromium e colocar a confirmação na prévia local. A letra esperada apareceu nos 89 recortes rotulados, o Z curto apareceu nas três repetições e nenhum dos 19 negativos exibiu Y. Confirmar a sobreposição e repetir Y, Q e M → N na porta 4177. [Resultados do pacote](docs/dados-alfabeto.md#confirmação-de-y-pela-forma-da-mão)
- [ ] Verificar as trocas breves que permanecem nos recortes de movimento e retestar Y com pessoas na webcam física.
- [ ] Validar a leitura das 27 letras com pessoas sinalizantes na webcam e ampliar a avaliação com gravações fora do ajuste.

- [x] Construir as animações de A a Z e da cedilha, registrar as referências e verificar enquadramento, articulações e reprodução no navegador. [Animações e referências](docs/animacoes.md)
- [x] Implementar a grade navegável por teclado, seleção de letra, pausa, repetição e velocidade. Reusar o player 3D no tradutor.
- [x] Implementar as sequências de palavras e frases do catálogo, as mensagens de cobertura e a soletração de nomes isolados ou em frases suportadas.
- [ ] Revisar em Libras configuração, orientação, movimento e transição de cada letra e das sequências catalogadas. Conferir também letras repetidas, nomes compostos, tratamento de acentos e soletração em frase.
- [ ] **Aceite.** O revisor percorre o alfabeto completo, traduz palavras e uma frase suportada, soletra um nome isolado e um nome em frase. Uma entrada fora da cobertura recebe uma mensagem clara.

### M5 · Área livre de Libras para texto e voz

- [x] Reaproveitar o modelo de M3 sem pedir ao usuário que selecione o sinal. Começar com sinais isolados e, se necessário, usar início e fim explícitos para delimitar cada tentativa. Processar as imagens no dispositivo.
- [x] Adicionar uma entrada de texto por tentativa reconhecida. Permitir editar, limpar e ouvir o resultado em português brasileiro com síntese gratuita. Uma voz robótica atende à demonstração. Manter o texto editável e indicar o problema quando o áudio estiver indisponível.
- [x] Verificar no Chromium que uma sustentação acrescenta uma palavra, duas tentativas intencionais acrescentam duas e o texto continua editável após falha ou ausência de voz. Verificar a preservação do texto em tentativas inconclusivas. [Resultados com clipes de teste](docs/regressao-area-livre.md)
- [x] Medir o treino com janelas de sinais fora do catálogo. Nas rodadas por pessoa, a falsa aceitação em pelo menos um recorte passou de 15/42 para 3/42 gravações. [Treino e resultados por gravação](docs/avaliacao.md#treino-com-janelas-parciais-de-negativos)
- [x] Corrigir a regressão de Banco em um candidato local e verificar o controle com Cinco e Espelho. O combinado rejeitou 10/10 janelas de Banco e acertou 4/4 controles. [Reteste de regressão no Chromium](docs/janelas-area-livre.md)
- [x] Verificar a transcrição do combinado com movimentos de Espelho e Amarelo em velocidade original. As oito reproduções de clipes de treino acertaram a glosa e preservaram o texto anterior. [Controles de movimento no Chromium](docs/sinais-com-movimento-browser.md)
- [x] Adquirir 14 tomadas adicionais de treino e medir o efeito sem mudar as pessoas da validação e da medição. [Comparação por sinal](docs/avaliacao.md#gravações-adicionais-de-espelho-e-amarelo)
- [ ] Qualificar o candidato para substituir o modelo inicial com participantes fora do treino. Testar entradas desconhecidas, dois sinais suportados, sustentação, repetição e audição do texto editado em webcam real.
- [x] Medir regras de rejeição para Cinco e Aluno e testar a posição e a direção da mão em 27 janelas de desenvolvimento da UFSM. As regras avaliadas perderam acertos de Cinco na validação. [Comparação geométrica e critérios de coleta](docs/transicao-sete-oito.md)
- [x] Reproduzir um falso Cinco em Oito→Nove em uma gravação de desenvolvimento com Cinco isolado da mesma pessoa e do mesmo enquadramento. Medir a confirmação temporal no par e nos controles do MINDS e congelar a regra para outra pessoa. [Numerais pareados e confirmação temporal](docs/transicao-sete-oito.md)
- [x] Obter um segundo par independente de Cinco correto e transição falsamente aceita como Cinco. A confirmação temporal conservou os dois Cinco corretos e deixou passar os nove falsos aceites da aula do Cecierj. [Segundo par](docs/transicao-sete-oito.md#segundo-par-independente-na-aula-da-cecierj)
- [x] Ajustar vetos de forma e movimento com validação cruzada por gravação. Os perfis separadamente rejeitaram as transições difíceis e perderam um Cinco correto em rodadas diferentes. A combinação pós-hoc preservou os corretos e rejeitou as dez janelas difíceis nesta comparação. [Validação cruzada e pesos congelados](docs/transicao-sete-oito.md)
- [x] Verificar a retenção dos Cinco válidos na primeira gravação externa. No ensaio offline da UFAC, o veto preservou as três janelas de Cinco. Todas as 16 janelas de transição já foram rejeitadas pelo controle. [Protocolo e resultados](docs/transicao-sete-oito.md)
- [x] Avaliar a sessão de Uéslei Paterno indicada pelo IFSC com os mesmos pesos congelados. O combinado deixou quatro Cinco inconclusivos e aceitou três janelas da mesma transição como Espelho. Nenhuma transição exibiu Cinco. [Segunda avaliação externa](docs/transicao-sete-oito.md#segunda-avaliação-externa-com-videoaula-do-ifsc)
- [ ] Confirmar a redução de falsos Cinco numa gravação externa com Cinco válido e transições que o controle aceite como Cinco. Avaliar a reserva após a confirmação externa.
- [ ] Reduzir as falsas aceitações de transições e de atividades cotidianas. No Chromium, os recortes Sete→Oito e queixo→teclado acrescentaram Cinco e Aluno. Retestar os sinais suportados junto com a rejeição após qualquer ajuste. [Recortes e reprodução](docs/negativos.md#novas-posturas-transições-e-glosas-externas)
- [ ] **Aceite.** O revisor produz uma sequência de sinais suportados sem seleção prévia, edita o texto e ouve o resultado no PC. Uma tentativa incerta fica visível e não gera uma palavra incorreta na transcrição dos casos de teste.

### M6 · Saiba mais, autoria e caráter sem fins lucrativos

- [x] Implementar **Saiba mais** como lista de redirecionamentos para as fontes originais do prompt. Exibir título e autoria ou instituição. Esse fluxo consiste apenas em links externos.
- [x] Publicar no rodapé e no README a mensagem “O LibrasIA é uma iniciativa educacional sem fins lucrativos, desenvolvida por Luan Fernandes e Wellington Sales.” Manter o acesso gratuito, sem monetização ou afiliação comercial.
- [x] **Aceite.** O revisor abre cada link, confere título, autoria e destino e encontra a mesma declaração no aplicativo e no README.

### M7 · Validação independente e versão de demonstração

- [x] Executar instalação limpa, compilação e testes automatizados, incluindo navegação por teclado, foco, mensagens, liberação da câmera e retomada após erro.
- [x] Verificar uma tentativa no Chromium após desconectar a rede, com os modelos carregados e a mesma trilha de vídeo ativa. [Ensaio técnico e sonda de rede](docs/janelas-area-livre.md#reconhecimento-após-desconectar)
- [x] Preparar o formulário local com versão dos ativos, observação humana, decisão do app, dicas, latência e audição. Calcular métricas a partir das fichas elegíveis, separadas por versão. [Ficha e instruções](docs/validacao-ao-vivo.md)
- [x] Empacotar uma prévia local versionada para testar a webcam, os pontos das mãos e a classificação do modelo combinado. [Prévia v0.1.0-preview.1](docs/previa-estavel.md)
- [ ] Fazer a verificação manual no PC com participantes, câmera e áudio reais. Verificar a compreensão das mensagens, a sinalização e a audição do texto editado.
- [x] Executar a verificação técnica da demonstração no Chromium. Conferir as sequências completas do tradutor, a lição com Cinco gravado, a rejeição de Banco, a transcrição com Cinco e Espelho, a voz local a partir do texto editado e a abertura de um destino de Saiba mais. [Resultados e limites](docs/roteiro-validacao.md#verificação-técnica-de-27-de-novembro-de-2026)
- [ ] Rodar o roteiro principal na seguinte ordem: abrir uma letra, traduzir uma frase, soletrar um nome, aceitar e corrigir um exercício, produzir texto e voz pela área livre e abrir um link de Saiba mais. Registrar ambiente, resultado, limites e evidência de cada etapa.
- [ ] Fechar e retestar defeitos que bloqueiam os fluxos principais ou comprometem a privacidade, a correção em Libras ou a confiabilidade da demonstração. Registrar as limitações restantes no README e no memorial. Identificar o commit, o modelo e as animações usados nos testes.
- [x] Preparar roteiro, registrar resultados medidos e compilar a minuta do memorial com as limitações e evidências disponíveis.
- [ ] Criar a tag local da versão validada, por exemplo `v0.1.0`, depois de cumprir os aceites. Publicação e compartilhamento externo seguem a autorização dos responsáveis.
- [ ] **Aceite.** Um revisor consegue reproduzir o roteiro a partir da versão marcada. O memorial distingue o que foi medido, o que foi observado na demonstração e o que ainda está planejado.

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
| **M8 · Aprendizagem e engajamento** | A testar | Adicionar pares de sinais parecidos, revisão baseada em tentativas e gamificação por progresso. Testar quais exercícios voltam na revisão, persistência do progresso e se as dicas ajudam na tentativa seguinte. |
| **M9 · Cobertura e variantes** | A testar | Ampliar vocabulário e frases e apresentar variantes regionais contextualizadas com revisão em Libras. Repetir os testes por pessoa sinalizante, acompanhar confusões novas e rejeição de sinais desconhecidos e explicitar a cobertura na interface. |
| **M10 · Sinalização contínua** | A fazer | Usar dados de sequências com condições de uso verificadas. Desenvolver segmentação automática, reconhecimento de sinais em sequência e geração de texto em português. Medir segmentação, inserções, omissões, trocas e qualidade do sentido traduzido com revisão humana. |
| **M11 · Web móvel na Vercel** | A fazer | Adaptar a interface para toque e telas estreitas e publicar a mesma aplicação web via GitHub e Vercel. Aceitar após validar a URL HTTPS no PC, no Chrome para Android e no Safari para iOS em aparelhos reais. |

### M8 e M9 · Checklist de conteúdo e aprendizagem

- [x] Disponibilizar a comparação de itens no avatar, o progresso da lição e a revisão local que prioriza tentativas pendentes. Verificar a ordem depois de um acerto e a persistência após recarga.
- [x] Ampliar o catálogo experimental da área livre com Aluno e incluir a referência histórica de Fortaleza no avatar. Registrar a cobertura de frases e as métricas do modelo expandido. [Escopo das animações](docs/animacoes.md) · [Avaliação expandida](docs/avaliacao.md)
- [ ] Revisar com pessoas fluentes a adequação das comparações, frases e variantes regionais. Em piloto, observar se as dicas ajudam na tentativa seguinte e verificar o uso da revisão adaptativa.
- [ ] Retestar a expansão com pessoas fora do treino, incluindo sinais desconhecidos. Revisar a cobertura anunciada a partir dos resultados.

### M10 · Checklist de sinalização contínua

- [x] Treinar e medir geração experimental de texto em gravações de frases, com partição reservada. Registrar erros de inserção, omissão e troca e reproduzir a inferência no Chromium. [Avaliação de geração](docs/sinalizacao-continua.md)
- [x] Treinar e comparar segmentação supervisionada de fronteiras com uma regra de movimento, usando duplas diferentes em treino, validação e teste. [Protocolo e condições de uso](docs/fronteiras.md)
- [x] Verificar quais fontes de vídeo oferecem glosas, texto em português, identificação de sinalizantes e condições de acesso. [Triagem e fontes candidatas](docs/dados-glosas.md)
- [x] Treinar o componente glosas para português com pares textuais e medir WER e frases exatas em uma partição reservada. [Resultado em 1.800 pares do VLibrasBD](docs/glosas-texto.md)
- [x] Comparar o gerador congelado com um tradutor monotônico em outras 1.800 frases, sem chaves normalizadas do primeiro ensaio. O WER passou de 61,57% para 50,66%. [Comparação e erros por método](docs/comparacao-glosas.md)
- [x] Integrar a detecção de fronteiras, o reconhecimento de glosas e a geração de texto em um fluxo experimental local com webcam. [Execução e ensaio no Chromium](docs/sinalizacao-continua.md#fluxo-contínuo-experimental-na-câmera)
- [x] Comparar o detector original, a recalibração e o retreino com pontos do Holistic na validação. [Comparação de fronteiras](docs/fronteiras.md#comparação-com-pontos-do-holistic-web)
- [x] Medir o controle de fragmentação do Holistic em três gravações reservadas. Com penalidade e piso de cinco posições, as referências fragmentadas caíram de 31 para 19 e os pareamentos de 71 para 64. [Teste reservado](docs/fronteiras.md#resultado-na-partição-reservada)
- [x] Integrar o controle de fragmentação como opção no Chromium e verificar a paridade com Python. Reproduzir a sequência de Amarelo e Espelho e o repouso sem alterar a transcrição em tentativas inconclusivas. [Resultado no navegador](docs/sinalizacao-continua.md#controle-de-fragmentação-no-navegador)
- [x] Comparar quatro configurações de fronteiras no diálogo didático contínuo do Cederj com dois intervalos aproximados de Amarelo. Verificar a redução das propostas com penalidade de corte e registrar a ausência de acerto de Amarelo e de sugestão de texto. [Piloto com vídeo em Chromium](docs/sinalizacao-continua.md#diálogo-didático-do-cederj)
- [x] Separar a perda de rastreamento da pessoa e a rejeição do classificador nas duas janelas de Amarelo. Conferir os escores nas janelas manuais, nas propostas automáticas e nos recortes laterais. [Diagnóstico de Amarelo](docs/sinalizacao-continua.md#diagnóstico-do-classificador-de-amarelo)
- [x] Comparar Amarelo em três recortes de uma pessoa no quadro. Medir separadamente o acerto na janela anotada e nas propostas automáticas. [Resultado no BioCiNAIS e na UFSM](docs/sinalizacao-continua.md#amarelo-com-uma-pessoa-no-quadro)
- [ ] Medir a sequência de glosas e a tradução em gravações anotadas com cobertura do catálogo. Incluir validação com webcam física.
- [ ] Conferir com a equipe as condições do Corpus de Libras para uso formal em pesquisa e fazer a revisão humana do sentido da tradução.

### M11 · Checklist de publicação e compatibilidade

- [ ] **Git e ambiente.** Configurar o build da Vercel, a prévia e a versão de produção. Verificar o carregamento do modelo, dos arquivos WebAssembly e do avatar no ambiente publicado. [Deploy a partir de Git na Vercel](https://vercel.com/docs/git)
- [x] Adaptar o layout para toque e telas estreitas. Verificar o encaixe em 390 px, a recuperação após voltar à aba e os avisos de câmera e voz na prévia local do Chromium.
- [ ] Medir a latência da câmera à decisão com o avatar aberto nos aparelhos de referência e conferir as mensagens e a recuperação de câmera e voz nesses aparelhos.
- [ ] **Revisão independente.** Testar a prévia no PC e em pelo menos um Android com Chrome e um iPhone com Safari. Confirmar permissão de câmera, reconhecimento, animação 3D, soletração, transcrição editável e voz gratuita em português brasileiro. Registrar aparelhos, navegadores e limitações.
- [ ] **Aceite.** Repetir os fluxos essenciais na URL de produção e acrescentar o link ao README. Manter a versão web como acesso comum entre desktop e celular.
