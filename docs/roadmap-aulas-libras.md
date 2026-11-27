# Roadmap de aulas de Libras · Primeiro encontro

A trilha parte de um encontro entre colegas no primeiro dia de aula. Ao terminar, a pessoa deve conseguir cumprimentar, se apresentar soletrando o próprio nome, pedir que alguém repita e agradecer.

## O que os cursos fazem no início

- **Enap.** A Unidade 1 apresenta o alfabeto manual e a datilologia antes de trabalhar cumprimentos, cortesia e diálogos. Entre os exercícios, há prática de soletração, apresentação com o próprio nome e agradecimento. [Luciana Marques Vale, *Curso Básico de Língua Brasileira de Sinais*, Unidade 1, pp. 7–16](https://clubedelibras.ufc.br/wp-content/uploads/2022/10/cursobasicoenap-apostila-libras.pdf#page=7)
- **IFSC.** O Livro Estudo 1 começa pelo alfabeto manual e pelos números. Usa a soletração na apresentação pessoal, trabalha cumprimentos e depois propõe uma primeira conversa. Os exercícios incluem reconhecer letras e praticar diálogos. [IFSC, *Livro Estudo 1*, seções 1–3 e 5](https://moodle4.ifsc.edu.br/mod/book/tool/print/index.php?id=274178)

### Recorte para a primeira trilha

Em um diálogo da Unidade 1 da Enap, uma pessoa soletra seu nome. A outra pede educadamente que repita mais devagar. A primeira repete e, ao final do atendimento, agradece. A trilha adapta essa situação para uma conversa entre colegas no primeiro dia de aula. [Enap, *Pratique o diálogo*, p. 15](https://clubedelibras.ufc.br/wp-content/uploads/2022/10/cursobasicoenap-apostila-libras.pdf#page=15)

O roteiro em português para orientar o exercício é simples. Uma pessoa dá bom dia e se apresenta. A outra pede que repita o nome, por favor. A primeira soletra de novo e a segunda agradece. As falas em Libras terão demonstrações revisadas no contexto da conversa.

## Aulas a implementar

| Aula | O que a pessoa pratica | Atividade para concluir |
| --- | --- | --- |
| 1. Soletrar o próprio nome | Observar a datilologia de um nome curto e praticar as letras do nome que escolher. | Assistir à soletração de um nome de exemplo, identificar qual foi mostrado e reproduzir o próprio nome no seu ritmo. |
| 2. Dar bom dia e se apresentar | Usar “Bom dia” ao chegar e combinar a apresentação com a soletração do nome. | Reconhecer a saudação em um encontro pela manhã e ensaiar a apresentação com seu nome ou um nome fictício. |
| 3. Pedir que repitam, por favor | Usar “Por favor” em um pedido de repetição quando não se entende um nome. | Escolher a resposta para a situação, observar a demonstração e repetir o pedido. |
| 4. Agradecer | Usar “Obrigado” ou “Obrigada”, conforme a legenda em português, após receber ajuda. | Identificar o momento de agradecer e praticar o sinal em resposta à repetição do nome. |
| 5. Fazer uma primeira conversa | Juntar saudação, apresentação, soletração, pedido e agradecimento. | Observar o diálogo, escolher as respostas em cada momento e ensaiar um dos papéis. |

## Ordem de implementação e aceite

- [ ] **Primeira entrega.** Criar a entrada da trilha em **Praticar** e implementar as aulas 1 e 2. Reutilizar o avatar, a soletração e a sequência de apresentação com saudação que o LibrasIA já demonstra. Oferecer repetição e controle de velocidade nas demonstrações. [Catálogo atual](../src/catalog.js) · [Soletração e apresentação](../src/translate.js)
- [ ] **Cortesia.** Preparar as demonstrações para o pedido de repetição com “Por favor” e o agradecimento. Registrar as referências e revisar a adequação linguística dos exemplos com uma pessoa fluente em Libras antes de marcar as aulas 3 e 4 como prontas.
- [ ] **Conversa.** Implementar a aula 5 com o roteiro da trilha. Em cada aula, mostrar um exemplo em Libras, propor uma atividade de compreensão e permitir ensaiar. Nas respostas de compreensão, explicar a escolha e oferecer nova tentativa.
- [ ] **Aceite no Chromium.** Concluir as cinco aulas com a câmera desativada, testar uma resposta incorreta e sua repetição, recarregar a página e retomar a trilha com o progresso salvo localmente. A prática por webcam é opcional e pode usar a leitura de letras individuais nas atividades que já têm suporte. [Cobertura atual do modelo](../ROADMAP_LIBRASIA.md#m4--alfabeto-palavras-frases-e-nomes)
