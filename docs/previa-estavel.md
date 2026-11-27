# Prévias locais do LibrasIA

## Demonstração atual no PC

A tag `v1.0.0` identifica a versão local que conclui M1 e M2. O aceite técnico usou gravações para a lição de Amarelo e a webcam ACER para a recuperação de permissão no Chromium. A coleta de negativos com participantes, a conferência visual dos pontos na webcam e a revisão linguística das dicas ficam para depois da 1.0. [Aceite e próximos testes](../ROADMAP_LIBRASIA.md#prioridades-da-retomada) · [Roteiro verificado](roteiro-validacao.md#prática-guiada-mínima-m1-e-m2)

Abra [Área livre](http://127.0.0.1:4177/#area-livre) ou [Praticar](http://127.0.0.1:4177/#praticar) no Chromium. Na Área livre, selecione **Alfabeto** para ler letras ao vivo ao lado da câmera. Em **Sinais**, inicie e conclua cada tentativa para acrescentar uma palavra.

Se o servidor estiver encerrado, execute na raiz do projeto:

~~~bash
python3 data/releases/librasia-1.0.0/iniciar.py --porta 4177
~~~

A prévia usa os pesos locais verificados. Em **Praticar com ajuda**, a etapa atual de M2 verifica o enquadramento da mão e dos ombros. Abra **Amarelo** para seguir o roteiro curto com o avatar. [Prática guiada mínima](roteiro-validacao.md#prática-guiada-mínima-m1-e-m2) · [Enquadramento e oclusão](roteiro-validacao.md#enquadramento-e-oclusão-na-prática)

No pacote `dfb045b`, o recorte de queixo para teclado ficou inconclusivo e Aluno foi reconhecido em três gravações do MINDS. O modo com pausas aplicou a concordância em “cinco alunos”, “cinco espelhos” e “cinco espelhos amarelos”. [Verificação de Aluno](negativos.md#verificação-de-aluno-pela-posição-da-mão) · [Concordância com Cinco](regressao-area-livre.md#concordância-em-sequências-com-pausas)

No pacote anterior `2a80645`, o Chromium percorreu as seis etapas da demonstração e exportou a ficha de teste com a soma do conjunto do alfabeto. As tentativas usaram gravações e a voz local concluiu a leitura do texto editado. Os logs locais são `roteiro-2a80645.log` e `ficha-2a80645.log`, em `data/evidence/demonstracao/`. [Roteiro integrado](roteiro-validacao.md#roteiro-integrado-em-uma-sessão-do-chromium)

Abra a ficha em outra janela do Chromium para manter a captura visível. **Preencher versão do pacote** registra o commit, o catálogo, a revisão do avatar e as somas dos modelos de sinais e do conjunto do alfabeto. A ficha exporta o JSON localmente e aceita os tempos de decisão, carregamento e extração. [Abrir ficha](http://127.0.0.1:4177/validacao/) · [Verificação da versão e dos tempos](validacao-ao-vivo.md#verificação-da-versão-do-alfabeto)

No pacote `180711c`, o reteste no Chromium percorreu as seis etapas do roteiro com vídeos gravados e verificou o encaixe e a retomada dos pontos das duas mãos. Em ensaios separados, a webcam Acer foi aberta e liberada e a síntese local em pt-BR chegou ao fim. O aceite com participantes na webcam e a compreensão do áudio continuam pendentes. Os logs ficam em `data/evidence/demonstracao`, nos arquivos `roteiro-180711c-reteste.log`, `pontos-180711c.log`, `fisico-180711c.log` e `ficha-validacao-180711c.log`. [Roteiro integrado](roteiro-validacao.md#roteiro-integrado-em-uma-sessão-do-chromium) · [Teste dos pontos](teste-pontos-ao-vivo.md)

O pacote registra o código compilado em `site/commit.txt`. Se o Git detectar alterações locais ou mudança de revisão durante a compilação, o arquivo começa com `rascunho` seguido do hash de base. O rascunho abre normalmente para testes e a ficha sinaliza a origem ao tentar preencher a versão. Para registrar evidência vinculada a um commit, use um pacote gerado de um checkout limpo. A inicialização confere o arquivo `SHA256SUMS`. Para verificar a cópia sem abrir a porta, execute `python3 data/releases/librasia-demonstracao/iniciar.py --verificar`.

### Recompilar com os modelos verificados

Em um checkout da `main`, use os pesos locais em `data/models`. A opção `LIBRASIA_DEMONSTRACAO=1` seleciona `isolated-combined`, `alphabet-r-completo` e `alphabet-trajectory`. O empacotador confere os 12 arquivos de modelos e manifestos com as somas versionadas antes de compilar. Use um diretório de saída novo.

~~~bash
destino=data/releases/librasia-demonstracao-recompilada
LIBRASIA_DEMONSTRACAO=1 ./scripts/executar-local.sh --pacote "$destino" &&
python3 "$destino/iniciar.py" --verificar
~~~

Para abrir essa cópia ao lado da demonstração, execute `python3 "$destino/iniciar.py" --porta 4178` e abra a Área livre no Chromium. [Área livre da cópia recompilada](http://127.0.0.1:4178/#area-livre)

O empacotador instala as dependências e busca as versões fixadas do MediaPipe quando necessário. Para reutilizar arquivos dos extratores, informe os caminhos em `LIBRASIA_HOLISTIC_FILE` e `LIBRASIA_HAND_FILE`. Caso os pesos do LibrasIA estejam em outras pastas locais, defina `LIBRASIA_MODELO`, `LIBRASIA_ALFABETO_MODELO` e `LIBRASIA_ALFABETO_MOVIMENTO`. As somas versionadas cobrem os arquivos copiados dessas pastas. Os pesos ficam fora do Git. [Somas dos modelos](../ml/evidence/demonstracao-modelos.sha256) · [Treinamento e exportação do combinado](avaliacao.md#combinação-de-geometria-e-flexão) · [Pesos do alfabeto](dados-alfabeto.md#compilar-neste-linux)

Uma cópia existente do pacote também serve como origem dos pesos. Aponte as três variáveis dos modelos para a pasta `site/models` da cópia e mantenha `LIBRASIA_DEMONSTRACAO=1` para conferir os arquivos.

O checkout limpo de `7759cc7` instalou as dependências do lockfile, reutilizou os pesos e os extratores do pacote `cb3adf2` e verificou os 34 arquivos. A comparação encontrou os mesmos arquivos do aplicativo, da ficha e dos modelos. Mudaram o commit, os metadados de versão da ficha e o arquivo de somas. Um ensaio separado compilou o checkout com alterações locais e conferiu o aviso de rascunho na ficha do Chromium. Os registros ficam em `data/evidence/demonstracao/m1-m2-reproducao/`. [Teste da ficha](../tests/e2e/validation.test.mjs)

Em 27/11/2026, o pacote `599f341` foi gerado em checkout limpo, com instalação a partir do lockfile, pesos de `data/models` e extratores MediaPipe de cópias locais verificadas. A aplicação, a ficha e os modelos reproduziram os arquivos do pacote anterior byte a byte, com os identificadores de compilação atualizados. A verificação cobriu 34 arquivos. A tentativa com o classificador inicial divergente encerrou antes de criar o pacote.

Passaram os 69 testes JavaScript, os sete testes Python do aplicativo, a abertura e a liberação da webcam Acer, a síntese local em pt-BR, a exportação da ficha e o roteiro integrado com vídeos gravados. Os logs ficam em `data/evidence/demonstracao/`, com os nomes `reproducao-599f341.log`, `fisico-599f341.log`, `ficha-599f341.log` e `roteiro-599f341.log`. [Roteiro integrado](roteiro-validacao.md#roteiro-integrado-em-uma-sessão-do-chromium) · [Reexportação do classificador](avaliacao.md#combinação-de-geometria-e-flexão)

Em 27/11/2026, a compilação `aea5303` partiu de um checkout limpo. Os arquivos servidos da versão anterior foram reproduzidos byte a byte, com a atualização do identificador em `site/commit.txt`. O pacote verificou 29 arquivos, e uma cópia com o ONNX alterado recusou a inicialização. Os testes registraram a abertura e a liberação da webcam Acer e a conclusão da síntese local em pt-BR. O roteiro integrado usou um Y4M refeito dos MP4 de origem, com SHA-256 `88de13b1cd6e9c1135a43e5436740d238945ef0141230375a48d7c0a9412c808`. Os logs ficam em `data/evidence/demonstracao`, com os nomes `build-aea5303-limpo.log`, `fisico-aea5303-limpo.log` e `roteiro-aea5303-limpo.log`. [Roteiro integrado](roteiro-validacao.md#roteiro-integrado-em-uma-sessão-do-chromium)

## Pontos das mãos ao vivo

Na Área livre, clique em **Ativar câmera** e permita o acesso. **Mostrar pontos das mãos** começa marcado. Mexa os dedos e os pulsos das duas mãos. Tire uma mão do vídeo e traga-a de volta. Acompanhe os pontos antes, durante e depois de iniciar uma tentativa. Durante a captura, desmarque e marque a opção para verificar a sobreposição. [Abrir Área livre](http://127.0.0.1:4177/#area-livre)

O Hand Landmarker acompanha até duas mãos em um worker local. A sobreposição desenha 21 pontos e suas conexões em cada mão detectada. O vídeo e a sobreposição usam o mesmo espelhamento e encaixe. Quando uma mão deixa de ser detectada, o desenho dela é apagado na próxima atualização. A decisão de sinais usa o classificador combinado da prévia. [Modelo Hand Landmarker do MediaPipe](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md#hand-landmarker)

O Chromium abriu e liberou a webcam física do PC no teste automatizado. A confirmação visual do alinhamento com movimentos feitos na webcam integra o teste manual. [Resultados com vídeo gravado e webcam física](teste-pontos-ao-vivo.md#resultado-da-prévia-empacotada) · [Checklist de verificação](../ROADMAP_LIBRASIA.md#m2--primeiro-sinal-com-webcam-e-avatar-reais)

## Prévia de trabalho

Na porta 4203, Cinco, Espelho e Amarelo completaram a lição no Chromium usando vídeos gravados. A mesma prévia inclui as 27 letras do avatar e aceita hífens tipográficos ao soletrar nomes compostos. [Abrir Praticar](http://127.0.0.1:4203/#praticar) · [Evidências da lição](roteiro-validacao.md#lição-completa-dos-três-sinais-em-m3) · [Evidências do alfabeto](dados-alfabeto.md#aceite-técnico-de-m4)

A Área livre mostra o catálogo instalado antes de ativar a webcam e permite editar a transcrição antes de usar **Ouvir**. A tag `v1.1.0` fixa a demonstração técnica no Chromium. [Abrir Área livre](http://127.0.0.1:4203/#area-livre) · [Roteiro integrado e evidências](roteiro-validacao.md#aceite-técnico-de-m7)

~~~bash
python3 data/releases/librasia-1.1.0/iniciar.py --porta 4203
~~~

## Prévia da sequência atual

Na porta 4205, a prévia inclui a comparação de sinais na prática, a retomada de exercícios e a apresentação de nome com saudação no tradutor. [Abrir Praticar](http://127.0.0.1:4205/#praticar) · [Abrir Tradutor](http://127.0.0.1:4205/#tradutor)

~~~bash
python3 data/releases/librasia-m11/iniciar.py --porta 4205
~~~

## Prévia v0.1.0-preview.1

A prévia reúne a aplicação compilada, os ativos de visão e o ONNX combinado congelado com o limiar 0,525. O catálogo da área livre inclui Cinco, Espelho, Amarelo e Aluno. O modelo usa dados MINDS-Libras RGB v1 sob CC BY 4.0. Os pesos ficam no pacote local. [Procedência e atribuição](dados.md) · [Avaliação e pares de checkpoints](avaliacao.md#combinação-de-geometria-e-flexão)

### Abrir neste Linux

Abra **http://127.0.0.1:4173/** no Chromium. Entre em **Área livre**, clique em **Ativar câmera** e permita o acesso. **Mostrar pontos das mãos** fica marcado por padrão. O contorno desenha os pontos e as conexões detectados em cada mão. Use a opção para exibir ou ocultar a visualização durante o teste.

Clique em **Iniciar tentativa**, faça um sinal e clique em **Concluir tentativa**. Confira a palavra ou o aviso de tentativa inconclusiva. O texto é editável. Na lição, escolha **Praticar com ajuda** antes de ativar a câmera.

Se a prévia estiver encerrada, rode na raiz do projeto:

```bash
python3 data/releases/librasia-v0.1.0-preview.1/iniciar.py
```

O pacote usa Python 3 e serve somente o endereço de loopback. O arquivo `site/commit.txt` identifica o código compilado. A câmera e os pontos são processados na página. A imagem da webcam e os pontos individuais não são enviados pelo aplicativo.

### Reproduzir o pacote

No checkout da tag e com os pesos já exportados, use um diretório de saída novo. Se necessário, exporte a combinação com os dois checkpoints identificados na avaliação.

```bash
LIBRASIA_MODELO=data/models/isolated-combined ./scripts/executar-local.sh \
  --pacote data/releases/librasia-v0.1.0-preview.1
```

Esta é a versão de teste no PC. A validade dos sinais e das dicas em Libras com pessoas fora do treino permanece pendente. A demonstração externa de Amarelo do Cederj ficou inconclusiva com o modelo desta prévia. [Casos e limites do modelo](amarelo-espelho-externos.md)
