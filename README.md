# LibrasIA

O LibrasIA é uma iniciativa educacional sem fins lucrativos, desenvolvida por Luan Fernandes e Wellington Sales.

O protótipo web reúne prática de Libras, alfabeto manual, demonstração de frases do catálogo, soletração de nomes e transcrição de sinais isolados. O roadmap registra a implementação e o aceite de cada fluxo. [Roadmap](ROADMAP_LIBRASIA.md)

![Painel de status dos marcos do LibrasIA. A versão em texto está no roadmap.](assets/status.svg)

[Roadmap e critérios de aceite](ROADMAP_LIBRASIA.md) · [Prioridades da retomada](ROADMAP_LIBRASIA.md#prioridades-da-retomada) · [Prompt de implementação](PROMPT_LIBRASIA.md)

[Checklist da inscrição no prêmio](ROADMAP_LIBRASIA.md#checklist-da-inscrição) · [Preparação do memorial e dos anexos](docs/inscricao.md)

## Executar neste Linux

Para testar a câmera e os pontos das mãos antes, durante e depois de uma tentativa, abra a [prévia local dos pontos ao vivo](docs/previa-estavel.md#pontos-das-mãos-ao-vivo).

Para ver a letra detectada ao lado da câmera em tempo real, abra a [prévia local do alfabeto](docs/dados-alfabeto.md#praticar-e-ler-letras-ao-vivo).

Use Node.js 22 LTS (ou Node.js 20.19+) e npm. No navegador desktop, recomenda-se Chromium com WebGL 2, câmera e voz local pt-BR.

```bash
./scripts/executar-local.sh
```

Abra **http://127.0.0.1:4173/**. O comando instala as dependências quando necessário, verifica o extrator de visão e compila com os pesos locais disponíveis. Use Ctrl+C no terminal para encerrar. Cada execução tem sua própria cópia dos arquivos compilados. Para comparar com o modelo expandido em uma segunda janela, execute `LIBRASIA_PORTA=4175 LIBRASIA_MODELO=data/models/isolated-expanded ./scripts/executar-local.sh`.

No Chromium, selecione **Praticar** para usar a atividade e a webcam, **Alfabeto** ou **Tradutor** para abrir o avatar, e **Área livre** para editar e ouvir o texto. Autorize a câmera ao usar **Ativar câmera**. O endereço de loopback permite o uso local da webcam.

A demonstração no PC de referência usa o modelo combinado de sinais e os pesos do alfabeto integrados. O servidor local abre a Área livre na porta 4177. Em **Conteúdo**, mantenha **Sinais** para transcrever tentativas ou selecione **Alfabeto** para a leitura de letras ao vivo. [Abrir a prévia no PC de referência](http://127.0.0.1:4177/#area-livre) · [Resultados e limites da demonstração](docs/roteiro-validacao.md#verificação-técnica-de-27-de-novembro-de-2026)

O pacote da demonstração inclui a compilação e os modelos. Ele pode ser verificado e executado localmente com Python 3. [Comandos de execução e recompilação](docs/previa-estavel.md#demonstração-atual-no-pc)

O modo de sinalização contínua tem ativação opcional com modelos locais e permanece em avaliação. [Executar o fluxo experimental](docs/sinalizacao-continua.md#fluxo-contínuo-experimental-na-câmera)

### Desenvolvimento

```bash
npm ci
npm run setup:vision
npm run dev
```

Abra a URL de localhost indicada pelo Vite. Conceda acesso à webcam apenas ao ativar a câmera dentro da prática ou da área livre. O navegador exige localhost ou HTTPS para capturar vídeo.

Para usar reconhecimento, instale um classificador depois de reproduzir o [treinamento e a avaliação](docs/avaliacao.md):

```bash
npm run setup:model -- data/models/isolated-v1
```

Os pontos da câmera são processados na própria página. Os sinais e as dicas da lição estão em revisão linguística. Na área livre, o modo experimental de sequência delimita os sinais quando a pessoa abaixa as mãos entre eles.

Na demonstração, o modelo combinado reconhece Cinco, Espelho, Amarelo e Aluno. Na partição reservada do MINDS-Libras, acertou 32 de 33 clipes dos sinais suportados e aceitou um de 18 negativos. Em 19 recortes externos, aceitou seis negativos. Entre eles estão uma transição entre numerais e um movimento cotidiano. A avaliação na webcam com participantes independentes e a revisão das dicas continuam pendentes. [Avaliação do modelo combinado](docs/avaliacao.md#modelo-combinado-na-partição-reservada) · [Recortes externos](docs/negativos.md#novas-posturas-transições-e-glosas-externas)

O estudo de sinalização contínua usa dados de frases e anotações temporais em experimentos locais de pesquisa. [Método e resultados](docs/sinalizacao-continua.md)

No PC de referência com Linux, Chromium e webcam Acer, o Speech Dispatcher lista a voz local pt-BR do eSpeak NG. Se o navegador não apresentar essa voz, abra um perfil dedicado com a integração do Speech Dispatcher:

```bash
chromium --enable-speech-dispatcher --user-data-dir="$PWD/.cache/chromium-librasia" http://127.0.0.1:4173/
```

A transcrição fica disponível para edição quando a voz falha. Se o texto mudar durante a leitura, a voz para. Use **Ouvir** para ler a versão atualizada.

## Verificar e compilar

```bash
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
npm run build
npm run check:status
npm run preview
```

O build gera `dist/`. Use `npm run preview` para verificar essa versão em localhost. O comando de painel requer Python 3.

Com Chromium instalado e a prévia em execução, rode `LIBRASIA_TEST_URL=http://127.0.0.1:4173 npm run test:e2e`. O roteiro de validação descreve as opções para câmera física, voz local e vídeos de teste.

O ensaio integrado percorre alfabeto, frase, nome, prática, transcrição com voz e Saiba mais na mesma sessão. [Preparação dos vídeos e comando do ensaio](docs/roteiro-validacao.md#roteiro-integrado-em-uma-sessão-do-chromium)

Os procedimentos e os resultados da revisão técnica estão no roteiro de validação. O pacote local da demonstração inclui a ficha para sessões com participantes. [Roteiro e resultados](docs/roteiro-validacao.md) · [Abrir ficha local](http://127.0.0.1:4177/validacao/) · [Instruções da ficha](docs/validacao-ao-vivo.md)

O desenvolvimento segue na `main`, com commits verificados e push no remoto do projeto. Vídeos, pesos pesados, documentos pessoais e credenciais ficam fora do Git.

## Atualizar o painel

Altere a coluna **Status** do roadmap para **A fazer**, **A testar** ou **Pronto**. Gere o SVG e inclua os dois arquivos no mesmo commit.

```bash
python3 scripts/update_status.py
```

O GitHub Actions verifica se o SVG corresponde ao roadmap. Para rodar a mesma verificação localmente, use `python3 scripts/update_status.py --check`.
