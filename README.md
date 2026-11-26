# LibrasIA

O LibrasIA é uma iniciativa educacional sem fins lucrativos, desenvolvida por Luan Fernandes e Wellington Sales.

O protótipo web reúne prática de Libras, alfabeto manual e tradução nos dois sentidos. O [roadmap](ROADMAP_LIBRASIA.md) registra a implementação e o aceite de cada fluxo.

![Painel de status dos marcos do LibrasIA. A versão em texto está no roadmap.](assets/status.svg)

[Roadmap e critérios de aceite](ROADMAP_LIBRASIA.md) · [Prompt de implementação](PROMPT_LIBRASIA.md)

## Executar no PC

Use Node.js 22 LTS (ou Node.js 20.19+) e npm. No navegador desktop, recomenda-se Chromium com WebGL 2, câmera e voz local pt-BR.

```bash
npm ci
npm run dev
```

Abra a URL de localhost indicada pelo Vite. Conceda acesso à webcam apenas ao ativar a câmera dentro da prática ou da área livre. O navegador exige localhost ou HTTPS para capturar vídeo.

No PC de referência com Linux, Chromium e webcam Acer, o Speech Dispatcher lista a voz local pt-BR do eSpeak NG. Se a lista de vozes do navegador estiver vazia, confira o Speech Dispatcher e o módulo eSpeak NG, reinicie o navegador e reabra a área livre. A transcrição fica disponível para edição quando a voz falha.

## Verificar e compilar

```bash
npm test
npm run build
npm run check:status
npm run preview
```

O build gera `dist/`. Use `npm run preview` para verificar essa versão em localhost. O comando de painel requer Python 3.

O desenvolvimento é integrado localmente na branch `main`. As frentes de implementação simultânea usam worktrees de branches dedicadas. Vídeos, pesos pesados, documentos pessoais e credenciais ficam fora do Git.

## Atualizar o painel

Altere a coluna **Status** do roadmap para **A fazer**, **A testar** ou **Pronto**. Gere o SVG e inclua os dois arquivos no mesmo commit.

```bash
python3 scripts/update_status.py
```

O GitHub Actions verifica se o SVG corresponde ao roadmap. Para rodar a mesma verificação localmente, use `python3 scripts/update_status.py --check`.
