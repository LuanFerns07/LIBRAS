# Prévias locais do LibrasIA

## Demonstração atual no PC

Abra [Área livre](http://127.0.0.1:4177/#area-livre) ou [Praticar](http://127.0.0.1:4177/#praticar) no Chromium. Na Área livre, selecione **Alfabeto** para ler letras ao vivo ao lado da câmera. Em **Sinais**, inicie e conclua cada tentativa para acrescentar uma palavra.

Se o servidor estiver encerrado, execute na raiz do projeto:

~~~bash
python3 data/releases/librasia-demonstracao/iniciar.py --porta 4177
~~~

O pacote `04353d3` permite copiar os tempos de decisão, carregamento e extração para a ficha de validação. Abra a ficha em outra janela do Chromium para manter a captura visível. **Preencher versão do pacote** registra o commit, o catálogo, a revisão compilada do avatar e as somas dos arquivos do classificador. A ficha exporta o JSON localmente. [Abrir ficha](http://127.0.0.1:4177/validacao/) · [Reteste da importação](validacao-ao-vivo.md#verificação-da-importação-dos-tempos)

No pacote `180711c`, o reteste no Chromium percorreu as seis etapas do roteiro com vídeos gravados e verificou o encaixe e a retomada dos pontos das duas mãos. Em ensaios separados, a webcam Acer foi aberta e liberada e a síntese local em pt-BR chegou ao fim. O aceite com participantes na webcam e a compreensão do áudio continuam pendentes. Os logs ficam em `data/evidence/demonstracao`, nos arquivos `roteiro-180711c-reteste.log`, `pontos-180711c.log`, `fisico-180711c.log` e `ficha-validacao-180711c.log`. [Roteiro integrado](roteiro-validacao.md#roteiro-integrado-em-uma-sessão-do-chromium) · [Teste dos pontos](teste-pontos-ao-vivo.md)

O servidor local informa o código compilado em `site/commit.txt`. A inicialização confere o arquivo `SHA256SUMS`. Para verificar a cópia sem abrir a porta, execute `python3 data/releases/librasia-demonstracao/iniciar.py --verificar`.

### Recompilar com os modelos verificados

Em um checkout limpo da `main`, use a pasta `models` de uma cópia local da demonstração. As somas versionadas identificam o modelo combinado, o alfabeto, os complementos e os manifestos de decisão usados no roteiro. Ajuste `origem` se os arquivos estiverem fora do checkout.

~~~bash
projeto="$PWD"
origem="$projeto/data/releases/librasia-demonstracao/site"
destino="$projeto/data/releases/librasia-demonstracao-recompilada"
(
  cd "$origem/models"
  sha256sum --check --strict "$projeto/ml/evidence/demonstracao-modelos.sha256"
) &&
LIBRASIA_MODELO="$origem/models" LIBRASIA_ALFABETO_MODELO="$origem/models" \
  LIBRASIA_ALFABETO_MOVIMENTO="$origem/models" ./scripts/executar-local.sh --pacote "$destino" &&
python3 "$destino/iniciar.py" --verificar
~~~

O empacotador instala as dependências e busca as versões fixadas do MediaPipe quando necessário. Para reutilizar as cópias locais dos dois extratores, acrescente `LIBRASIA_HOLISTIC_FILE="$origem/runtime/holistic_landmarker.task"` e `LIBRASIA_HAND_FILE="$origem/runtime/hand_landmarker.task"` ao comando de compilação. Os pesos do classificador ficam na cópia local, e o Git guarda as somas. [Somas dos modelos](../ml/evidence/demonstracao-modelos.sha256) · [Treinamento e exportação](avaliacao.md)

Em 27/11/2026, a compilação `aea5303` partiu de um checkout limpo. Os arquivos servidos da versão anterior foram reproduzidos byte a byte, com a atualização do identificador em `site/commit.txt`. O pacote verificou 29 arquivos, e uma cópia com o ONNX alterado recusou a inicialização. Os testes registraram a abertura e a liberação da webcam Acer e a conclusão da síntese local em pt-BR. O roteiro integrado usou um Y4M refeito dos MP4 de origem, com SHA-256 `88de13b1cd6e9c1135a43e5436740d238945ef0141230375a48d7c0a9412c808`. Os logs ficam em `data/evidence/demonstracao`, com os nomes `build-aea5303-limpo.log`, `fisico-aea5303-limpo.log` e `roteiro-aea5303-limpo.log`. [Roteiro integrado](roteiro-validacao.md#roteiro-integrado-em-uma-sessão-do-chromium)

## Pontos das mãos ao vivo

Na Área livre, clique em **Ativar câmera** e permita o acesso. **Mostrar pontos das mãos** começa marcado. Mexa os dedos e os pulsos das duas mãos. Tire uma mão do vídeo e traga-a de volta. Acompanhe os pontos antes, durante e depois de iniciar uma tentativa. Durante a captura, desmarque e marque a opção para verificar a sobreposição. [Abrir Área livre](http://127.0.0.1:4177/#area-livre)

O Hand Landmarker acompanha até duas mãos em um worker local. A sobreposição desenha 21 pontos e suas conexões em cada mão detectada. O vídeo e a sobreposição usam o mesmo espelhamento e encaixe. Quando uma mão deixa de ser detectada, o desenho dela é apagado na próxima atualização. A decisão de sinais usa o classificador combinado da prévia. [Modelo Hand Landmarker do MediaPipe](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md#hand-landmarker)

O Chromium abriu e liberou a webcam física do PC no teste automatizado. A confirmação visual do alinhamento com movimentos feitos na webcam integra o teste manual. [Resultados com vídeo gravado e webcam física](teste-pontos-ao-vivo.md#resultado-da-prévia-empacotada) · [Checklist de verificação](../ROADMAP_LIBRASIA.md#m2--primeiro-sinal-com-webcam-e-avatar-reais)

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
