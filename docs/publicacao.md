# Prévia e publicação web

A aplicação permanece local nesta rodada, conforme orientação dos responsáveis em 26/11/2026. O [README](../README.md) apresenta o comando de execução no Linux. Use este roteiro quando houver autorização para hospedar a aplicação.

O LibrasIA é uma aplicação Vite estática. O repositório inclui `vercel.json` para usar `npm ci`, preparar o extrator MediaPipe e servir `dist/`. A câmera só é solicitada depois de uma ação, sem microfone. O build configura o compartilhamento da câmera com a própria origem e restringe conexões à mesma origem.

A prévia local do Vite aplica os mesmos cabeçalhos da Vercel para testar o carregamento de WebAssembly e o acesso à câmera com a política de segurança de produção.

O MediaPipe usa o [Holistic Landmarker float16/1 indicado pelo exemplo do Google](https://github.com/google-ai-edge/mediapipe-samples-web/blob/main/src/tasks/holistic-landmarker.ts). O instalador verifica o SHA-256 `e2dab61191e2dcd0a15f943d8e3ed1dce13c82dfa597b9dd39f562975a50c3f8` e copia o runtime WebAssembly da versão fixada no lockfile. O site busca a cópia local do extrator ao iniciar o reconhecimento. Para usar um arquivo já baixado, defina `LIBRASIA_HOLISTIC_FILE` antes de `npm run setup:vision`.

## Prévia

1. Com a demonstração local validada e as autorizações dos responsáveis, conecte o repositório GitHub a um projeto Vercel usando Node 22. Use uma branch de prévia antes da promoção a produção. [Deploy a partir de Git na Vercel](https://vercel.com/docs/git)
2. Prepare também o classificador ONNX aprovado para distribuição e seu manifesto no build, conforme a documentação do modelo. Confirme no relatório de build que os artefatos necessários aparecem em `dist/`.
3. Teste a URL HTTPS de prévia no PC, no Chrome para Android e no Safari para iOS, em aparelhos reais. Anote versão do sistema, navegador, modelo, data, commit e URL para cada aparelho.
4. Em cada aparelho, confirme a animação 3D, alfabeto, soletração, etapas da lição e área livre. Conceda e negue a permissão de câmera. Mude de aba, retorne e reative a câmera. Confira se a tentativa incerta preserva a transcrição. Edite o texto e tente ler com uma voz local pt-BR.
5. Na aba Rede, confirme status HTTP e tipo dos arquivos `.task`, `.onnx` e `.wasm` e confirme que o site não envia imagens ou pontos da webcam. Meça mediana e p95 entre o fim da tentativa e a decisão, com o avatar em execução.
6. Depois do aceite da prévia, valide os mesmos fluxos essenciais na produção e inclua a URL no README.

## Registro por aparelho

| Plataforma | Aparelho e navegador | Câmera e retomada | Avatar e soletração | Reconhecimento e voz | Latência e evidência |
| --- | --- | --- | --- | --- | --- |
| PC | Pendente | Pendente | Pendente | Pendente | Pendente |
| Android | Pendente | Pendente | Pendente | Pendente | Pendente |
| iOS | Pendente | Pendente | Pendente | Pendente | Pendente |
