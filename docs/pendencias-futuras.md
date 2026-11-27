# Pendências para próximas versões do LibrasIA

Esta lista reúne o que foi adiado por depender de participantes, dados adicionais, equipamentos ou autorização. Use o roadmap para acompanhar a implementação e o painel verde para identificar os aceites técnicos já verificados. [Roadmap](../ROADMAP_LIBRASIA.md)

## M1 a M3 · Webcam e revisão das dicas

- [ ] **M1.** Coletar repouso, movimentos cotidianos e sinais fora do catálogo na webcam com pessoas independentes. Contar quantas tentativas chegaram ao classificador.
- [ ] **M2.** Na Área livre, registrar a retirada e o retorno de uma mão na webcam física e conferir o alinhamento ao redimensionar. Na prática, repetir oclusão, enquadramento e sinais fora da cobertura.
- [ ] **M2 e M3.** Registrar execuções esperadas e correções intencionais na webcam. Pedir a uma pessoa fluente em Libras que revise as dicas de Cinco, Espelho e Amarelo em diferentes variantes, mãos dominantes, iluminações e enquadramentos.
- [ ] **M3.** Com participantes fora do treino, medir reconhecimento, rejeição, cobertura, latência, extração e carregamento. O conjunto exploratório de 19 recortes externos teve 5 falsos aceites no Chromium. [Protocolo](protocolo-aceite.md) · [Ficha local](validacao-ao-vivo.md) · [Recortes externos](negativos.md#os-19-recortes-na-área-livre-do-chromium)

## M4 e M5 · Alfabeto, sinais, área livre e voz

- [ ] **M4.** Revisar as poses, as transições e as sequências catalogadas com uma pessoa fluente em Libras. Conferir especialmente a pose frontal de N ao lado de M e U, letras repetidas, nomes compostos e soletração dentro de frases.
- [ ] **M4.** Repetir na webcam M → N → U e N sustentado em Praticar e na Área livre. Com novas pessoas e ângulos, medir os pares S/A e E/O e as letras com movimento, incluindo Y. Ampliar a avaliação independente do alfabeto. Na gravação reservada da UFF, D e T ficaram sem leitura e R apareceu como X em uma condição. A vista dupla da Unicentro ainda produziu M na janela de N. [Limites observados](dados-alfabeto.md#alfabeto-com-a-mesma-trilha-de-câmera)
- [ ] **M5.** Gravar ou obter novos exemplos independentes de Cinco e das transições de numerais em condições comparáveis. Fixar as partições por pessoa antes de ajustar a rejeição dos falsos aceites de transições e sinais fora do catálogo. O veto candidato resolveu o erro de Sete → Oito na Fiocruz, mas reduziu os acertos de Cinco de 8/9 para 3/9 no MINDS reservado. [Plano de coleta e ensaio reservado](transicao-sete-oito.md)
- [ ] **M5.** Com participantes fora do treino, testar sinais suportados, entradas desconhecidas, sustentação e repetição. Uma pessoa deve confirmar que o áudio em pt-BR corresponde ao texto editado. [Roteiro de validação](roteiro-validacao.md)

## M7 · Demonstração independente e inscrição

- [ ] Repetir a demonstração com revisor independente, webcam e áudio reais. Conferir a compreensão das mensagens e da voz, retestar os problemas de correção em Libras e registrar as limitações com a versão dos ativos usados.
- [ ] Finalizar o memorial quando a equipe retomar essa etapa. Validar a autoria, as contribuições humanas, os dados e documentos pessoais, as assinaturas e o envio com os integrantes responsáveis. [Checklist da inscrição](../ROADMAP_LIBRASIA.md#checklist-da-inscrição) · [Edital e anexos](inscricao.md)

## M8 a M11 · Piloto, cobertura, dados contínuos e publicação

- [ ] **M8 e M9.** Revisar comparações, frases e variantes regionais com pessoas fluentes e observar o efeito das dicas e da revisão adaptativa em um piloto.
- [ ] **M9.** Retestar a expansão com novas pessoas fora do treino e com sinais desconhecidos. Usar as respostas para atualizar a cobertura de reconhecimento anunciada na interface. [Cobertura atual](animacoes.md#cobertura-e-reteste-de-m9)
- [ ] **M10.** Confirmar as condições do Corpus de Libras para o uso formal em pesquisa. Obter exemplos anotados com cobertura do catálogo para medir glosas e tradução, com revisão humana do sentido e teste na webcam. [Procedência e ensaios](sinalizacao-continua.md)
- [ ] **M11.** Obter autorização para publicar na Vercel. Repetir os fluxos essenciais em um Android com Chrome e um iPhone com Safari reais, incluindo permissão, recuperação de câmera, áudio e latência. [Roteiro de publicação](publicacao.md)
