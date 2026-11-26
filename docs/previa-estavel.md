# Prévia local v0.1.0-preview.1

A prévia reúne a aplicação compilada, os ativos de visão e o ONNX combinado congelado com o limiar 0,525. O catálogo da área livre inclui Cinco, Espelho, Amarelo e Aluno. O modelo usa dados MINDS-Libras RGB v1 sob CC BY 4.0. Os pesos ficam no pacote local. [Procedência e atribuição](dados.md) · [Avaliação e pares de checkpoints](avaliacao.md#combinação-de-geometria-e-flexão)

## Abrir neste Linux

Abra **http://127.0.0.1:4173/** no Chromium. Entre em **Área livre**, clique em **Ativar câmera** e permita o acesso. **Mostrar pontos das mãos** fica marcado por padrão. O contorno desenha os pontos e as conexões detectados em cada mão. Use a opção para exibir ou ocultar a visualização durante o teste.

Clique em **Iniciar tentativa**, faça um sinal e clique em **Concluir tentativa**. Confira a palavra ou o aviso de tentativa inconclusiva. O texto é editável. Na lição, escolha **Praticar com ajuda** antes de ativar a câmera.

Se a prévia estiver encerrada, rode na raiz do projeto:

```bash
python3 data/releases/librasia-v0.1.0-preview.1/iniciar.py
```

O pacote usa Python 3 e serve somente o endereço de loopback. O arquivo `site/commit.txt` identifica o código compilado. A câmera e os pontos são processados na página. A imagem da webcam e os pontos individuais não são enviados pelo aplicativo.

## Reproduzir o pacote

No checkout da tag e com os pesos já exportados, use um diretório de saída novo. Se necessário, exporte a combinação com os dois checkpoints identificados na avaliação.

```bash
LIBRASIA_MODELO=data/models/isolated-combined ./scripts/executar-local.sh \
  --pacote data/releases/librasia-v0.1.0-preview.1
```

Esta é a versão de teste no PC. A validade dos sinais e das dicas em Libras com pessoas fora do treino permanece pendente. A demonstração externa de Amarelo do Cederj ficou inconclusiva com o modelo desta prévia. [Casos e limites do modelo](amarelo-espelho-externos.md)
