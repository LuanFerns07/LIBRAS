# Prévias locais do LibrasIA

## Pontos das mãos ao vivo

Abra **http://127.0.0.1:4175/#area-livre** no Chromium, clique em **Ativar câmera** e permita o acesso. **Mostrar pontos das mãos** começa marcado. Mexa os dedos e os pulsos das duas mãos. Tire uma mão do vídeo e traga-a de volta. Acompanhe os pontos antes, durante e depois de iniciar uma tentativa. Durante a captura, desmarque e marque a opção para verificar a sobreposição.

O Hand Landmarker acompanha até duas mãos em um worker local. A sobreposição desenha 21 pontos e suas conexões em cada mão detectada. O vídeo e a sobreposição usam o mesmo espelhamento e encaixe. Quando uma mão deixa de ser detectada, o desenho dela é apagado na próxima atualização. A decisão de sinais usa o classificador combinado da prévia. [Modelo Hand Landmarker do MediaPipe](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md#hand-landmarker)

Se a prévia estiver encerrada, execute na raiz do projeto.

```bash
python3 data/releases/librasia-pontos-ao-vivo/iniciar.py --porta 4175
```

Para gerar o pacote em outro diretório com o classificador local já exportado, execute na raiz.

```bash
LIBRASIA_MODELO=data/models/isolated-combined ./scripts/executar-local.sh \
  --pacote data/releases/librasia-pontos-ao-vivo
```

O pacote grava o commit da compilação em `site/commit.txt` e serve os modelos pelo endereço local. O Chromium abriu e liberou a webcam física do PC no teste automatizado. A confirmação visual do alinhamento com movimentos feitos na webcam integra o teste manual. [Resultados com vídeo gravado e webcam física](teste-pontos-ao-vivo.md#resultado-da-prévia-empacotada) · [Checklist de verificação](../ROADMAP_LIBRASIA.md#m2--primeiro-sinal-com-webcam-e-avatar-reais)

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
