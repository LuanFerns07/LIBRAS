# Registro da validação ao vivo

Use o registro para acompanhar pessoas sinalizantes e reunir observações da demonstração no PC. A referência humana, o resultado exibido pelo aplicativo e a audição são campos separados. O registro deixa os critérios de aceite e as etapas pendentes para revisão da equipe. [Protocolo de aceite](protocolo-aceite.md) · [Roteiro da demonstração](roteiro-validacao.md)

## Abrir no Linux

1. Inicie o pacote local da demonstração e abra a Área livre em uma janela do Chromium. [Abrir Área livre](http://127.0.0.1:4177/#area-livre) · [Executar o pacote](previa-estavel.md#demonstração-atual-no-pc)
2. Abra a ficha de validação em uma segunda janela. Coloque as duas lado a lado para manter a aba do aplicativo visível, pois o LibrasIA encerra a captura quando a aba é ocultada. Use a webcam e o botão **Ouvir** na janela do LibrasIA. [Abrir a ficha local](http://127.0.0.1:4177/validacao/)
3. Na ficha, clique em **Preencher versão do pacote**. O código da compilação identifica também a revisão do avatar. O pacote preenche a versão do catálogo e os hashes dos dois arquivos do modelo. Informe o ambiente observado e o consentimento da pessoa participante.
4. Use códigos como S01, P01 e R01 para sessão, pessoa sinalizante e revisor. Conserve a correspondência de códigos com participantes separada do registro, quando necessária. Informe se a pessoa está fora do treino, o perfil em Libras de quem revisa e se a revisão é independente.

Para usar a ficha com um checkout de desenvolvimento ou pacote anterior, execute `python3 -m http.server 4174 --bind 127.0.0.1 --directory qa` na raiz e preencha os dados da compilação manualmente. As duas somas identificam mudanças de limiar que preservem os mesmos pesos. Ajuste a porta conforme a prévia.

~~~bash
curl -fsS http://127.0.0.1:4177/commit.txt
curl -fsS http://127.0.0.1:4177/models/isolated.onnx | sha256sum
curl -fsS http://127.0.0.1:4177/models/isolated.json | sha256sum
~~~

Se iniciou a aplicação diretamente de um checkout, registre o resultado de `git rev-parse HEAD` na hora de compilar. A prévia empacotada serve o commit da compilação em `/commit.txt`.

Use a resolução da trilha observada e o intervalo de amostragem da versão instalada. No reconhecedor atual, o intervalo configurado é 100 ms. Para conferir a resolução, após a pessoa ligar a câmera, leia os valores width e height no console da aba do aplicativo.

~~~js
const { width, height } = document.querySelector('video').srcObject.getVideoTracks()[0].getSettings();
({ width, height })
~~~

## Observar e registrar

- **Execução e condições**. Registre uma linha por tentativa. Na lição, indique o alvo selecionado. Na área livre, faça dois sinais em tentativas distintas e compare cada palavra. Registre execução esperada e ajuste intencional. Inclua repouso, gesto comum, sinal fora do vocabulário, oclusão, mãos ausentes e perda de enquadramento. Repita com mãos dominantes, iluminação e variantes pertinentes.
- **Referência humana**. O revisor observa a glosa e indica o ajuste apropriado, quando houver. Em seguida, compara a dica exibida com essa referência. Se a imagem não sustentar uma correção, escolha o estado de referência correspondente e avalie a resposta segundo o protocolo.
- **Aplicativo**. Anote o estado literal e a palavra exibida quando o aplicativo reconhecer o sinal. Um erro de captura ou uma dica sem palavra ficam registrados com predição vazia. Para medir latência, use apenas valores efetivamente obtidos. A cronometragem manual fica identificada e não substitui a medição instrumentada a partir do clique de conclusão.
- **Voz**. Depois da transcrição, edite o texto e acione **Ouvir**. Registre o estado apresentado pelo aplicativo e, separadamente, se foi possível ouvir e compreender o texto. Confira a correspondência com a edição sem copiar a frase para a ficha. Uma mensagem de leitura concluída sozinha deixa a audição pendente.
- **Roteiro**. Marque as etapas confirmadas na sessão. Teste permissão negada e retomada. Verifique a rede e o armazenamento do aplicativo durante a captura antes de marcar privacidade. O resultado de um ensaio com clipe gravado continua no roteiro técnico.
- **Pontos e letra N**. Na Área livre, mova as duas mãos antes, durante e depois de uma tentativa. Retire uma mão e coloque-a de volta. Redimensione a janela e desmarque e marque **Mostrar pontos das mãos** durante a captura. Em **Praticar** e na **Área livre**, confira o N sustentado e a troca M → N → U. Marque cada resultado na ficha.

Para uma avaliação independente, mantenha a referência humana separada da decisão do app durante a observação. Use várias pessoas fora do treino e inclua, no relatório, quantas pessoas e tentativas sustentam cada cenário e medida. As contagens do formulário mostram os estratos registrados. A análise segue os critérios do protocolo.

### Medir no Chromium

Depois que a tentativa mostrar sua resposta, leia os tempos no console da aba do LibrasIA, antes de iniciar a próxima tentativa.

~~~js
JSON.parse(document.querySelector('[data-capture-status]').dataset.timing ?? 'null')
~~~

Quando `trigger` for `manual`, copie `decisionMs` para a ficha e selecione o método instrumentado. É o intervalo entre acionar **Concluir tentativa** e atualizar a decisão. Use as tentativas manuais com o avatar em reprodução para o critério de latência da lição. `initialLoadMs` mede o primeiro carregamento dos modelos após ativar a câmera e fica vazio nas tentativas seguintes. `extractionMs` contém as durações por quadro processado. Guarde esses tempos junto ao código da tentativa para a análise. A página mantém somente os tempos da última decisão em memória.

## Exportar

Ao terminar, use **Exportar sessão em JSON**. Salve a cópia de trabalho em data/evidence e confira seu conteúdo. Registre apenas os códigos de sessão e os metadados de observação. A página não solicita câmera nem microfone, não grava quadros, áudio, pontos corporais ou frases e não usa armazenamento persistente. O download é local. Após conferir a exportação, recarregue a página para iniciar outro registro.

O JSON identifica a origem como live-manual-observation e inclui versão, ambiente, tentativas, estados do roteiro e contagem por cenário. Mantenha sessões ao vivo separadas das evidências de câmera simulada, terminais automatizados e reproduções de clipes.

## Resumir as fichas

Use o manifesto exato da sessão e passe os JSONs exportados no mesmo comando. Use sempre o mesmo código para uma pessoa que participe de mais de uma sessão.

~~~bash
.venv/bin/python ml/live_review.py \
  --manifest data/releases/librasia-demonstracao/site/models/isolated.json \
  --out data/evidence/resumo-ao-vivo.json data/evidence/librasia-validacao-S*.json
~~~

O resumo mostra a matriz de resultados na área livre, as rejeições por tipo de negativo, os pareceres das dicas guiadas e os tempos instrumentados por ambiente e fluxo. Entram nas métricas as fichas com consentimento, pessoa fora do treino e revisão independente por alguém fluente em Libras. Inspeções de permissão, interrupção de câmera e tentativas sem referência definida têm sua própria contagem. Sem amostras de todos os sinais do manifesto, o F1 macro fica vazio. A equipe ainda confere os resultados com o protocolo e o roteiro da demonstração.

## Teste da lógica

~~~bash
node --test tests/validacao-ao-vivo.test.js
LIBRASIA_TEST_URL=http://127.0.0.1:4177 LIBRASIA_TEST_VALIDATION=1 \
  node --test tests/e2e/validation.test.mjs
~~~
