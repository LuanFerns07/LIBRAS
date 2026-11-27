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
| **M3 · Lição e reconhecimento** | A fazer | Lição com três a cinco sinais e modelo avaliado | Dados e ML, UX, Libras e avatar, integração | A lição funciona nos três estágios e cada sinal anunciado tem evidência de reconhecimento e feedback revisado. |
| **M4 · Alfabeto e texto para Libras** | A testar | A–Z e Ç no avatar e na leitura ao vivo, tradutor de textos suportados e soletração de nomes | Libras e avatar, UX, integração | As poses, a leitura pela webcam e os exemplos de tradução e soletração passam pela revisão. |
| **M5 · Área livre e voz** | A fazer | Sinalização sem alvo pré-selecionado, transcrição editável e leitura gratuita | Integração, Dados e ML, UX | O texto vem de sinais reais, casos incertos ficam visíveis e o áudio usa o texto confirmado no PC. |
| **M6 · Saiba mais e créditos** | Pronto | Links externos, créditos e declaração sem fins lucrativos | UX, revisão independente | Os destinos conferem com os títulos e a mensagem aparece no app e no README. |
| **M7 · Demonstração validada** | A fazer | Versão marcada no Git, evidências, roteiro e memorial técnico | Revisão independente, Git e ambiente, coordenador | A equipe repete a demonstração seguindo o README e fecha os defeitos que impedem o uso. |

**Caminho principal** · M0 → M1 → M2 → M3 → M5 → M7. A preparação das animações de M4 pode começar junto com M1, e a integração de M4 pode avançar após o player de M2. M6 pode ser feito em paralelo com M3 a M5. M7 depende do aceite de M3, M4, M5 e M6.

## Prioridades da retomada

A referência é a [prévia local do alfabeto](http://127.0.0.1:4177/#area-livre), compilada no commit `0a36425`. Em 27 de novembro de 2026, a pessoa usuária confirmou que os pontos acompanharam bem o movimento das mãos e que a atualização do reconhecimento funcionou bem no seu teste. O N ficou como ressalva. Os resultados dos testes com gravações estão nos registros de verificação. [Resultados do alfabeto](docs/dados-alfabeto.md#cobertura-e-verificação) · [Resultados dos pontos](docs/teste-pontos-ao-vivo.md)

1. **Revisar N, M e U (M4).** Conferir a pose no avatar, tornar visível a diferença entre os dedos estendidos de N e M e comparar a orientação de N e U. Retestar a leitura em Praticar e na Área livre e usar a evidência para decidir sobre ajustes no modelo. [Triagem do N](docs/animacoes.md#triagem-da-letra-n)
2. **Validar o alfabeto e a webcam no PC (M2 e M4).** Repetir o roteiro com A–Z e Ç e preservar a leitura ao vivo e a sobreposição. Registrar a letra esperada, a letra exibida ou a ausência de leitura, a mão dominante, o enquadramento e a versão. Usar gravações adicionais fora do ajuste enquanto a revisão com pessoas sinalizantes aguarda disponibilidade.
3. **Fechar o roteiro da demonstração local (M3, M5 e M7).** Verificar sinais isolados, dicas, rejeição de entradas desconhecidas, transcrição e voz. Registrar quais resultados foram reproduzidos com vídeo ou webcam física. Manter a sinalização contínua em avaliação.

A prévia permanece no Linux local. A publicação na Vercel e a finalização do memorial estão adiadas por orientação da equipe.

## Implementação e aceite por marco

### M0 · Fundação e versionamento

- [x] Confirmar o PC de referência, o navegador, a webcam e a disponibilidade de uma voz gratuita em português brasileiro. Registrar o ambiente usado para os testes e o plano de síntese local se faltar uma voz compatível.
- [x] Inicializar o Git local, criar o primeiro commit e documentar como instalar, executar e testar a aplicação. Se a pasta principal estiver protegida, preservar os arquivos de origem e inicializar a pasta gravável da aplicação dentro do espaço de trabalho.
- [x] Versionar código, documentação, configurações e manifestos de dados, modelos e animações. Manter vídeos brutos, segredos e artefatos pesados fora do histórico. Definir como recuperar a versão exata de cada artefato usado na demonstração.
- [x] Reservar a branch principal para entregas integradas. Usar branches ou worktrees dedicadas quando houver trabalho simultâneo em código. O coordenador arbitra alterações de contrato e integra os commits após a verificação do responsável.
- [x] **Aceite.** A revisão técnica independente iniciou a base em um checkout limpo e executou a verificação inicial. Git, voz e webcam têm um caminho de configuração documentado.

### M1 · Dados, vocabulário e protocolo de validação

- [x] Levantar os conjuntos públicos candidatos e registrar origem, versão, licença, termos de uso, cobertura de sinais, qualidade dos rótulos e identificação de pessoas sinalizantes. Conferir separadamente as permissões para uso em treino, demonstração e distribuição dos pesos ou ativos.
- [x] Escolher três a cinco sinais pela utilidade pedagógica, qualidade dos exemplos e viabilidade de animação. Começar por um sinal cujo parâmetro principal seja observável pela webcam. Incluir movimento se houver dados e referência suficientes.
- [x] Definir o catálogo compartilhado com identificador de letra ou sinal, saída textual, referência, animação, versão e status da revisão. Para os exercícios, identificar o parâmetro avaliado, as variantes contempladas e as dicas permitidas.
- [x] Fixar a separação por pessoa sinalizante entre treino, validação e teste quando houver identificadores. Registrar a limitação das fontes sem esse metadado e verificar duplicatas.
- [x] Medir a rejeição dos modelos congelados em gravações externas de repouso e movimentos cotidianos. [Teste com 12 trechos do CLAD](docs/negativos.md#resultado-de-26-de-novembro-de-2026)
- [x] Verificar os modelos congelados em amostras de sinais de videoaulas licenciadas. Registrar variantes, falhas de rastreamento e tamanho da amostra. [Verificação externa de Cinco e Amarelo](docs/sinais-independentes.md)
- [ ] Completar as amostras de repouso, movimentos comuns e sinais fora do catálogo para avaliar rejeição durante o uso da webcam.
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
- [x] Medir precisão, revocação e F1 por sinal e média macro no teste reservado. Registrar matriz de confusão, cobertura, falsas aceitações e latência mediana e p95 no PC com clipes de teste. Contar tentativas inconclusivas na análise de cobertura e na revocação dos sinais suportados.
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
- [ ] Melhorar a legibilidade do N no avatar e preservar as diferenças em relação a M e U. Conferir indicador e médio voltados para baixo e a distinção visual em vista frontal. Retestar a letra isolada, um nome com N repetido e a leitura ao vivo de N/M/U em gravações adicionais e na webcam.
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

Para cada aceite, registrar data, responsável, commit, versões relevantes dos ativos, cenário testado, resultado esperado, resultado observado e pendências. O coordenador pode manter esses registros no formato que a equipe já usar. Com quatro vagas totais, iniciar com Git, Dados e ML e Libras e avatar. Depois de definir as interfaces, priorizar UX e integração e usar a vaga restante onde houver uma dependência aberta. Reservar uma rodada para a revisão independente e os retestes.

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
- [ ] Reduzir a fragmentação do detector com o Holistic, medir o erro na sequência de glosas e na tradução em novos dados com cobertura adequada e incluir validação com webcam física.
- [ ] Conferir com a equipe as condições do Corpus de Libras para uso formal em pesquisa e fazer a revisão humana do sentido da tradução.

### M11 · Checklist de publicação e compatibilidade

- [ ] **Git e ambiente.** Configurar o build da Vercel, a prévia e a versão de produção. Verificar o carregamento do modelo, dos arquivos WebAssembly e do avatar no ambiente publicado. [Deploy a partir de Git na Vercel](https://vercel.com/docs/git)
- [x] Adaptar o layout para toque e telas estreitas. Verificar o encaixe em 390 px, a recuperação após voltar à aba e os avisos de câmera e voz na prévia local do Chromium.
- [ ] Medir a latência da câmera à decisão com o avatar aberto nos aparelhos de referência e conferir as mensagens e a recuperação de câmera e voz nesses aparelhos.
- [ ] **Revisão independente.** Testar a prévia no PC e em pelo menos um Android com Chrome e um iPhone com Safari. Confirmar permissão de câmera, reconhecimento, animação 3D, soletração, transcrição editável e voz gratuita em português brasileiro. Registrar aparelhos, navegadores e limitações.
- [ ] **Aceite.** Repetir os fluxos essenciais na URL de produção e acrescentar o link ao README. Manter a versão web como acesso comum entre desktop e celular.
