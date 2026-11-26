# Roadmap do LibrasIA

O projeto de Luan Fernandes e Wellington Sales é uma iniciativa educacional sem fins lucrativos. A primeira versão é uma aplicação web para demonstração em um PC com webcam, com prática guiada, alfabeto manual em 3D, tradução de textos suportados para Libras e reconhecimento em área livre com saída em texto e voz gratuita. O [prompt de implementação](PROMPT_LIBRASIA.md) reúne os requisitos do produto e os papéis dos agentes.

## Marcos e dependências

O coordenador integra as entregas e atualiza a coluna **Status**, que alimenta o painel do README. **A fazer** indica implementação pendente ou em curso. **A testar** indica implementação concluída com validação pendente. **Pronto** indica que os critérios de aceite foram cumpridos. O revisor independente confere as evidências antes da versão de demonstração.

Ao mudar um status, rode `python3 scripts/update_status.py` e inclua `assets/status.svg` no mesmo commit.

| Marco | Status | Entrega | Responsáveis principais | Quando avançar |
| --- | --- | --- | --- | --- |
| **M0 · Fundação** | A testar | Git local, aplicação inicial e ambiente definido | Git e ambiente, coordenador | Um segundo integrante consegue executar a base a partir do README. |
| **M1 · Dados e critérios** | A fazer | Fontes verificadas, primeiro catálogo de sinais, contrato entre componentes e plano de testes | Dados e ML, Libras e avatar, coordenador | Há base utilizável, sinais viáveis para o avatar e conjuntos de avaliação definidos antes do treino. |
| **M2 · Um sinal de ponta a ponta** | A fazer | Avatar 3D, webcam real e uma dica específica de prática | Integração, UX, Dados e ML, Libras e avatar | Uma execução esperada, uma correção e uma falha de captura têm respostas distintas no PC. |
| **M3 · Lição e reconhecimento** | A fazer | Lição com três a cinco sinais e modelo avaliado | Dados e ML, UX, Libras e avatar, integração | A lição funciona nos três estágios e cada sinal anunciado tem evidência de reconhecimento e feedback revisado. |
| **M4 · Alfabeto e texto para Libras** | A testar | Alfabeto completo, tradutor de textos suportados e soletração de nomes | Libras e avatar, UX, integração | Todas as letras são reproduzíveis e os exemplos de tradução e soletração passam pela revisão. |
| **M5 · Área livre e voz** | A fazer | Sinalização sem alvo pré-selecionado, transcrição editável e leitura gratuita | Integração, Dados e ML, UX | O texto vem de sinais reais, casos incertos ficam visíveis e o áudio usa o texto confirmado no PC. |
| **M6 · Saiba mais e créditos** | Pronto | Links externos, créditos e declaração sem fins lucrativos | UX, revisão independente | Os destinos conferem com os títulos e a mensagem aparece no app e no README. |
| **M7 · Demonstração validada** | A fazer | Versão marcada no Git, evidências, roteiro e memorial técnico | Revisão independente, Git e ambiente, coordenador | A equipe repete a demonstração seguindo o README e fecha os defeitos que impedem o uso. |

**Caminho principal** · M0 → M1 → M2 → M3 → M5 → M7. A preparação das animações de M4 pode começar junto com M1, e a integração de M4 pode avançar após o player de M2. M6 pode ser feito em paralelo com M3 a M5. M7 depende do aceite de M3, M4, M5 e M6.

## Implementação e aceite por marco

### M0 · Fundação e versionamento

- [x] Confirmar o PC de referência, o navegador, a webcam e a disponibilidade de uma voz gratuita em português brasileiro. Registrar o ambiente usado para os testes e o plano de síntese local se faltar uma voz compatível.
- [x] Inicializar o Git local, criar o primeiro commit e documentar como instalar, executar e testar a aplicação. Se a pasta principal estiver protegida, preservar os arquivos de origem e inicializar a pasta gravável da aplicação dentro do espaço de trabalho.
- [ ] Versionar código, documentação, configurações e manifestos de dados, modelos e animações. Manter vídeos brutos, segredos e artefatos pesados fora do histórico. Definir como recuperar a versão exata de cada artefato usado na demonstração.
- [x] Reservar a branch principal para entregas integradas. Usar branches ou worktrees dedicadas quando houver trabalho simultâneo em código. O coordenador arbitra alterações de contrato e integra os commits após a verificação do responsável.
- [ ] **Aceite.** Outro integrante inicia a base a partir do README e executa a verificação inicial. Git, voz e webcam têm um caminho de configuração documentado.

### M1 · Dados, vocabulário e protocolo de validação

- [ ] Levantar os conjuntos públicos candidatos e registrar origem, versão, licença, termos de uso, cobertura de sinais, qualidade dos rótulos e identificação de pessoas sinalizantes. Conferir separadamente as permissões para uso em treino, demonstração e distribuição dos pesos ou ativos.
- [ ] Escolher três a cinco sinais pela utilidade pedagógica, qualidade dos exemplos e viabilidade de animação. Começar por um sinal cujo parâmetro principal seja observável pela webcam. Incluir movimento se houver dados e referência suficientes.
- [ ] Definir o catálogo compartilhado com identificador de letra ou sinal, saída textual, referência, animação, versão e status da revisão. Para os exercícios, identificar o parâmetro avaliado, as variantes contempladas e as dicas permitidas.
- [ ] Fixar a separação por pessoa sinalizante entre treino, validação e teste quando houver identificadores. Registrar a limitação das fontes sem esse metadado, verificar duplicatas e manter amostras de repouso, movimentos comuns e sinais fora do catálogo para avaliar rejeição.
- [ ] Definir antes do teste final as metas de reconhecimento, rejeição e latência, com base no tamanho do conjunto e no PC de referência. Ajustar o limiar de confiança somente com a validação. Preservar o teste final para a versão escolhida.
- [ ] **Aceite.** Catálogo inicial, registro de licenças, protocolo de avaliação e interfaces do player e do modelo revisados. O protótipo pode avançar com uma amostra exploratória, com essa condição registrada nas evidências.

### M2 · Primeiro sinal com webcam e avatar reais

- [ ] Integrar um avatar que executa um sinal, a captura pela webcam, a inferência e a resposta do exercício. Manter avatar e câmera lado a lado. Usar reconhecimento real a partir de dados, com um alvo e exemplos negativos suficientes para esse primeiro teste.
- [ ] Implementar quatro estados visíveis: execução aceita, dica acionável sobre um parâmetro, tentativa inconclusiva e problema de captura. Pedir nova tentativa quando a imagem ou a estimativa não derem base para corrigir o estudante.
- [ ] Testar permissão de câmera concedida e negada, enquadramento, mão encoberta, entrada fora da cobertura e interrupção da câmera ao sair do fluxo. Verificar que a aplicação não transmite nem persiste quadros da webcam.
- [ ] **Aceite.** No PC, uma pessoa usa a câmera real para demonstrar o sinal, recebe uma dica adequada em uma tentativa com erro observável e vê um aviso distinto quando a captura falha. Registrar a versão e a evidência desse fluxo.

### M3 · Modelo avaliado e lição utilizável

- [ ] Treinar ou adaptar uma versão reproduzível do modelo. Registrar configuração, versões dos conjuntos, comandos, critérios de seleção e versão dos pesos. Avaliar em separado a classificação de sinais e a qualidade das orientações de prática.
- [ ] Completar a lição com observar, praticar com ajuda e tentar com menos ajuda. Incluir uma atividade de compreensão sem câmera, controles do avatar e registro local do progresso.
- [ ] Medir precisão, revocação e F1 por sinal e média macro no teste, com a contagem de exemplos. Registrar matriz de confusão, cobertura das decisões, falsas aceitações de entradas fora do catálogo e latência mediana e p95 no PC. Contar tentativas inconclusivas na análise de cobertura e na revocação dos sinais suportados.
- [ ] Comparar as dicas com avaliação humana nas amostras disponíveis. Verificar tanto a execução esperada quanto correções intencionais, variantes conhecidas, mão dominante, iluminação e enquadramento. Registrar quais dimensões foram testadas de fato e as que ficaram pendentes.
- [ ] **Aceite.** A lição funciona completa sem recorrer a inferência simulada. Cada item habilitado para correção tem dica revisada e resultados dentro dos critérios definidos em M1. Quando um sinal falhar, ele volta ao trabalho de dados, animação ou feedback antes de integrar o catálogo de prática.

### M4 · Alfabeto, palavras, frases e nomes

- [ ] Construir as animações de todas as letras do alfabeto manual, com referências adequadas à sua execução. Validar detalhes das mãos, orientação, movimento, visibilidade e transições conforme cada letra. Conferir o resultado com revisão em Libras.
- [x] Implementar a grade navegável por teclado, seleção de letra, pausa, repetição e velocidade. Reusar o player 3D no tradutor.
- [ ] Implementar a tradução das palavras e frases curtas catalogadas com sequências revisadas em Libras. Exibir mensagens de cobertura e indicar trechos que a plataforma não consegue apresentar. Soletrar nomes isolados e em frases suportadas, como “Meu nome é [nome]”, com uma opção manual para nomes ambíguos.
- [ ] Testar todas as letras, a diferença entre demonstração individual e sequência, letras repetidas, nomes compostos, acentos conforme a regra revisada, texto vazio, frase fora do catálogo e reinício do player ao trocar de entrada.
- [ ] **Aceite.** O revisor percorre o alfabeto completo, traduz palavras e uma frase suportada, soletra um nome isolado e um nome em frase. Uma entrada fora da cobertura recebe uma mensagem clara.

### M5 · Área livre de Libras para texto e voz

- [ ] Reaproveitar o modelo de M3 sem pedir ao usuário que selecione o sinal. Começar com sinais isolados e, se necessário, usar início e fim explícitos para delimitar cada tentativa. Processar as imagens no dispositivo.
- [ ] Adicionar uma entrada de texto por tentativa reconhecida. Permitir editar, limpar e ouvir o resultado em português brasileiro com síntese gratuita. Uma voz robótica atende à demonstração. Manter o texto editável e indicar o problema quando o áudio estiver indisponível.
- [ ] Testar dois sinais em sequência, sinal sustentado e repetição intencional. Verificar que cada tentativa acrescenta apenas o resultado esperado. Testar também sinal desconhecido, baixa confiança, ausência de mão e falha da voz. Confirmar que **Ouvir** reproduz o texto após a edição.
- [ ] **Aceite.** O revisor produz uma sequência de sinais suportados sem seleção prévia, edita o texto e ouve o resultado no PC. Uma tentativa incerta fica visível e não gera uma palavra incorreta na transcrição dos casos de teste.

### M6 · Saiba mais, autoria e caráter sem fins lucrativos

- [x] Implementar **Saiba mais** como lista de redirecionamentos para as fontes originais do prompt. Exibir título e autoria ou instituição. Esse fluxo consiste apenas em links externos.
- [x] Publicar no rodapé e no README a mensagem “O LibrasIA é uma iniciativa educacional sem fins lucrativos, desenvolvida por Luan Fernandes e Wellington Sales.” Manter o acesso gratuito, sem monetização ou afiliação comercial.
- [x] **Aceite.** O revisor abre cada link, confere título, autoria e destino e encontra a mesma declaração no aplicativo e no README.

### M7 · Validação independente e versão de demonstração

- [ ] Executar instalação limpa, compilação e testes automatizados. Em seguida, fazer a verificação manual no PC, com câmera e áudio reais, incluindo negação de permissão, navegação por teclado, indicador de foco, mensagens compreensíveis e retomada após erro.
- [ ] Rodar o roteiro principal na seguinte ordem: abrir uma letra, traduzir uma frase, soletrar um nome, aceitar e corrigir um exercício, produzir texto e voz pela área livre e abrir um link de Saiba mais. Registrar ambiente, resultado, limites e evidência de cada etapa.
- [ ] Fechar e retestar defeitos que bloqueiam os fluxos principais ou comprometem a privacidade, a correção em Libras ou a confiabilidade da demonstração. Registrar as limitações restantes no README e no memorial. Identificar o commit, o modelo e as animações usados nos testes.
- [ ] Criar a tag local da versão validada, por exemplo `v0.1.0`, e preparar roteiro, resultados medidos e memorial. Publicação, push e compartilhamento externo seguem a autorização dos responsáveis.
- [ ] **Aceite.** Um revisor consegue reproduzir o roteiro a partir da versão marcada. O memorial distingue o que foi medido, o que foi observado na demonstração e o que ainda está planejado.

## Ordem de validação e registro

1. **Dados e referências.** Validar licenças, identidade das amostras, separação dos conjuntos e catálogo antes de treinar ou distribuir ativos.
2. **Componentes.** Automatizar os testes da normalização de nomes, da fila de animações, dos estados de reconhecimento e da montagem de transcrição. Revisar as animações e dicas com pessoas surdas fluentes em Libras quando houver disponibilidade, registrando as pendências.
3. **Integração.** Testar primeiro um sinal no PC. Só depois aumentar o catálogo e exercitar os fluxos sem câmera, com webcam e com voz. Verificar o tratamento de entradas desconhecidas e a privacidade no navegador.
4. **Modelo e usabilidade.** Rodar o teste reservado da versão escolhida e comparar o feedback com a revisão humana. Se houver um piloto de aprendizagem, observar se a dica ajuda a melhorar a tentativa seguinte e relatar a amostra e as limitações. Tratar esse piloto como uma avaliação separada do reconhecimento.
5. **Regressão e demonstração.** Quando mudar dados, pesos, limiar ou animação, retestar os exercícios afetados. Preservar evidências e versões suficientes para reproduzir o teste no mesmo ambiente.

Para cada aceite, registrar data, responsável, commit, versões relevantes dos ativos, cenário testado, resultado esperado, resultado observado e pendências. O coordenador pode manter esses registros no formato que a equipe já usar. Com quatro vagas totais, iniciar com Git, Dados e ML e Libras e avatar. Depois de definir as interfaces, priorizar UX e integração e usar a vaga restante onde houver uma dependência aberta. Reservar uma rodada para a revisão independente e os retestes.

## Trilha da inscrição no prêmio

O prazo confirmado é **30 de novembro de 2026 às 23h59, horário de Brasília**. Trabalhar com **29 de novembro** como data interna para fechar a versão que será apresentada. Esse recorte curto depende de chegar a um protótipo funcional com evidências próprias. O restante do roadmap continua após a inscrição. [Comunicado da UFC sobre a prorrogação](https://ufcinforma.ufc.br/pt/noticias/premio-inteligencia-artificial-e-formacao-universitaria-prorroga-inscricoes-projetos-e-solucoes-em-ia-ate-3011) · [Edital oficial, itens 4 a 8](https://catedraldt.virtual.ufc.br/wp-content/uploads/2026/11/edital-premio-catedra-ia-2026.pdf)

| Janela proposta | Entrega para a inscrição |
| --- | --- |
| **26–27 de novembro** | Iniciar M0 e M1. Em paralelo, preparar os documentos da equipe, os anexos e o esqueleto do memorial técnico. |
| **28 de novembro** | Buscar o aceite funcional de M2, gravar apenas resultados reais e decidir quais funções adicionais já validadas entram na demonstração. |
| **29 de novembro** | Congelar a versão de inscrição, repetir a demonstração e revisar memorial, anexos, assinaturas, PDF único e acesso aos links opcionais. |

Para a **Categoria III**, apresentar a solução funcional acompanhada do memorial técnico. Usar os resultados disponíveis para explicar arquitetura, contribuições humanas, uso de IA, aplicabilidade e limitações. Se o fluxo funcional não passar pelos testes, registrar o bloqueio antes de tratar o material como protótipo pronto. Usar o [guia do prêmio](<Guia do Prêmio Cátedra IA.html>) para a conferência e o edital oficial para requisitos da inscrição.

## Depois da demonstração no PC

O marco de publicação na Vercel pode começar assim que M7 for aceito e o repositório estiver disponível no GitHub, em paralelo com os outros marcos de expansão.

| Próximo marco | Status | O que implementar e como validar |
| --- | --- | --- |
| **M8 · Aprendizagem e engajamento** | A testar | Adicionar pares de sinais parecidos, revisão baseada em tentativas e gamificação por progresso. Testar quais exercícios voltam na revisão, persistência do progresso e se as dicas ajudam na tentativa seguinte. |
| **M9 · Cobertura e variantes** | A fazer | Ampliar vocabulário e frases e apresentar variantes regionais contextualizadas com revisão em Libras. Repetir os testes por pessoa sinalizante, acompanhar confusões novas e rejeição de sinais desconhecidos e explicitar a cobertura na interface. |
| **M10 · Sinalização contínua** | A fazer | Usar dados de sequências com condições de uso verificadas. Desenvolver segmentação automática, reconhecimento de sinais em sequência e geração de texto em português. Medir segmentação, inserções, omissões, trocas e qualidade do sentido traduzido com revisão humana. |
| **M11 · Web móvel na Vercel** | A fazer | Adaptar a interface para toque e telas estreitas e publicar a mesma aplicação web via GitHub e Vercel. Aceitar após validar a URL HTTPS no PC, no Chrome para Android e no Safari para iOS em aparelhos reais. |

### M11 · Checklist de publicação e compatibilidade

- [ ] **Git e ambiente.** Configurar o build da Vercel, a prévia e a versão de produção. Verificar o carregamento do modelo, dos arquivos WebAssembly e do avatar no ambiente publicado. [Deploy a partir de Git na Vercel](https://vercel.com/docs/git)
- [ ] **UX e integração.** Adaptar o layout para toque e telas estreitas. Manter a câmera e a inferência no navegador e medir a latência com o avatar aberto. Verificar recuperação ao voltar para a aba e mensagens para câmera ou voz indisponível.
- [ ] **Revisão independente.** Testar a prévia no PC e em pelo menos um Android com Chrome e um iPhone com Safari. Confirmar permissão de câmera, reconhecimento, animação 3D, soletração, transcrição editável e voz gratuita em português brasileiro. Registrar aparelhos, navegadores e limitações.
- [ ] **Aceite.** Repetir os fluxos essenciais na URL de produção e acrescentar o link ao README. Manter a versão web como acesso comum entre desktop e celular.
