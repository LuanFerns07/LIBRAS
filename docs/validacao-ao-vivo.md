# Registro da validação ao vivo

Use o registro para acompanhar pessoas sinalizantes e reunir observações da demonstração no PC. A referência humana, o resultado exibido pelo aplicativo e a audição são campos separados. O registro deixa os critérios de aceite e as etapas pendentes para revisão da equipe. [Protocolo de aceite](protocolo-aceite.md) · [Roteiro da demonstração](roteiro-validacao.md)

## Abrir no Linux

1. Inicie o pacote local da demonstração e abra a Área livre em uma janela do Chromium. [Abrir Área livre](http://127.0.0.1:4177/#area-livre) · [Executar o pacote](previa-estavel.md#demonstração-atual-no-pc)
2. Abra a ficha de validação em uma segunda janela. Coloque as duas lado a lado para manter a aba do aplicativo visível, pois o LibrasIA encerra a captura quando a aba é ocultada. Use a webcam e o botão **Ouvir** na janela do LibrasIA. [Abrir a ficha local](http://127.0.0.1:4177/validacao/)
3. Na ficha, clique em **Preencher versão do pacote**. O código da compilação identifica também a revisão do avatar. O pacote preenche a versão do catálogo, as somas do modelo de sinais e a soma do conjunto de modelos do alfabeto quando ele estiver instalado. Informe o ambiente observado e o consentimento da pessoa participante.
4. Use códigos como S01, P01 e R01 para sessão, pessoa sinalizante e revisor. Conserve a correspondência de códigos com participantes separada do registro, quando necessária. Informe se a pessoa está fora do treino, o perfil em Libras de quem revisa e se a revisão é independente.

Para usar a ficha com um checkout de desenvolvimento ou pacote anterior, execute `python3 -m http.server 4174 --bind 127.0.0.1 --directory qa` na raiz e preencha os dados da compilação manualmente. As duas somas identificam mudanças de limiar que preservem os mesmos pesos. Ajuste a porta conforme a prévia.

~~~bash
curl -fsS http://127.0.0.1:4177/commit.txt
curl -fsS http://127.0.0.1:4177/models/isolated.onnx | sha256sum
curl -fsS http://127.0.0.1:4177/models/isolated.json | sha256sum
~~~

Para conferir a soma do alfabeto manualmente, entre na pasta `site/models` do pacote e execute o comando abaixo. Ele inclui os pesos ONNX, os complementos e os manifestos de leitura estática e em movimento. Se o pacote não tiver o alfabeto, deixe esse campo vazio.

~~~bash
LC_ALL=C find . -maxdepth 1 -type f -name 'alphabet*' -printf '%f\n' |
  LC_ALL=C awk '/^alphabet(-[a-z-]+)?\.(json|onnx)$/' |
  LC_ALL=C sort | xargs -r sha256sum -- | sha256sum
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

Depois que a tentativa mostrar sua resposta, use o comando abaixo no console da aba do LibrasIA para copiar a medição. Cole o conteúdo em **JSON da medição no Chromium** na ficha. Faça isso antes de iniciar a próxima tentativa.

~~~js
const measurement = document.querySelector('[data-capture-status]').dataset.timing
if (measurement) copy(measurement)
~~~

O JSON guarda três medidas. `decisionMs` mede o intervalo entre concluir e exibir a decisão. `initialLoadMs` mede o carregamento inicial do reconhecedor na primeira tentativa da captura. `extractionMs` contém uma duração por quadro processado. Para o critério de latência da lição, use as tentativas manuais com o avatar em reprodução. O resumo de latência usa as conclusões manuais. Carregamento e extração também são registrados em tentativas encerradas automaticamente.

O valor `classifierCalls` acompanha a medição. Zero indica que a tentativa terminou antes da classificação, como num quadro sem mãos. Um ou mais indica quantas vezes o classificador de sinais foi chamado, inclusive quando o resultado ficou inconclusivo. Nos modos de sequência, o valor soma as chamadas de todos os trechos analisados. A medição da última tentativa fica em memória até o próximo estado da captura.

Com o campo do JSON vazio, a ficha permite anotar manualmente as chamadas ao classificador, a latência e o método usado para obtê-la. Deixe em branco os campos de valores ausentes.

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

O resumo mostra a matriz de resultados na área livre, as rejeições por tipo de negativo, os pareceres das dicas guiadas e os tempos instrumentados por ambiente e fluxo. As fichas são agrupadas pelo commit, catálogo, avatar e, quando registrado, pelo conjunto do alfabeto. Em `classifierReachByCondition`, cada cenário da Área livre com referência definida tem contagens de tentativas que chegaram ao classificador (`reached`), pararam antes dele (`notReached`) e ficaram sem medição (`unobserved`). As fichas anteriores entram nesta última contagem. Entram nas métricas as fichas com consentimento, pessoa fora do treino e revisão independente por alguém fluente em Libras. Inspeções de permissão, interrupção de câmera e tentativas sem referência definida têm sua própria contagem. Sem amostras de todos os sinais do manifesto, o F1 macro fica vazio. A equipe ainda confere os resultados com o protocolo e o roteiro da demonstração.

Em `timingByEnvironment`, cada fluxo mostra contagem, mediana e p95 para o tempo de decisão, o carregamento inicial (`initialLoad`) e a extração (`extraction`). Cada tentativa contribui com no máximo uma medida de decisão e uma de carregamento. As contagens de extração correspondem aos quadros processados. Fichas com apenas latência continuam contribuindo para o resumo do tempo de decisão.

## Verificação das chamadas no Chromium

No pacote `38a8ef8`, os controles usaram gravações locais como câmera do Chromium e o classificador combinado de SHA-256 `a8e991d9cfedc23a2cf899ed68799c8006682f3306cf6fc0006eacdec1e62f63`. O campo da ficha preservou zero na exportação. O analisador separou tentativas com e sem classificação e aceitou fichas anteriores, nas quais a medição fica desconhecida.

| Controle | Chamadas | Decisão |
| --- | ---: | --- |
| Quadro preto | 0 | Inconclusiva por ausência de mãos |
| Vontade S09-4 | 1 | Inconclusiva por baixa confiança |
| Cinco S09-1 | 1 | Cinco acrescentado |
| Cinco e Espelho com pausa | 2 | “cinco espelhos” acrescentado |
| Espelho e Amarelo no modo contínuo | 8 | Sequência parcial, com a transcrição preservada |
| Amarelo com os quadros invertidos em Praticar | 1 | Dica sobre a trajetória do indicador |

Os relatórios individuais ficam em `data/evidence/demonstracao/classificador-38a8ef8-*.json`. O JSON da ficha foi conferido com dados de teste. A coleta dos cenários com pessoas independentes na webcam continua na checklist. [Origem dos controles gravados](regressao-area-livre.md#reproduzir-localmente) · [Par com pausa no modo contínuo](sinalizacao-continua.md#pares-de-sinais-do-catálogo-no-chromium) · [Controle de trajetória](roteiro-validacao.md#dica-de-trajetória-de-amarelo)

## Verificação da importação dos tempos

No pacote `04353d3`, o Chromium capturou um vídeo preto e registrou uma decisão manual, uma medição de carga inicial, 40 tempos de extração e zero chamadas ao classificador. A ficha local aceitou o JSON obtido da tentativa e exportou os valores. A execução do analisador com uma ficha de teste confirmou as contagens e a mediana e p95 por medida. Os registros locais são `tempos-04353d3-sem-maos.json`, `ficha-tempos-04353d3.log` e `fixture-resumo-tempos-04353d3.json`, em `data/evidence/demonstracao/`. [Teste no Chromium](../tests/e2e/validation.test.mjs) · [Teste do analisador](../ml/tests/test_live_review.py)

## Verificação da versão do alfabeto

No pacote `ff7969b`, o Chromium preencheu a soma `bb9dc0a25603249bfebb77ae5d1e2782a1772d213989d26a2e3d639c1357c6ef` e a preservou no JSON baixado. O teste recalculou a soma a partir dos dez arquivos servidos do alfabeto e verificou que as requisições da ficha ficaram no servidor local. O analisador manteve em grupos distintos as fichas com diferentes conjuntos de alfabeto e as fichas anteriores sem esse campo. O log fica em `data/evidence/demonstracao/ficha-alfabeto-ff7969b.log`. [Teste da ficha](../tests/e2e/validation.test.mjs) · [Teste do analisador](../ml/tests/test_live_review.py)

## Teste da lógica

~~~bash
node --test tests/validacao-ao-vivo.test.js
LIBRASIA_TEST_URL=http://127.0.0.1:4177 LIBRASIA_TEST_VALIDATION=1 \
  node --test tests/e2e/validation.test.mjs
PYTHONPATH=ml .venv/bin/python -m unittest discover -s ml/tests -p 'test_live_review.py'
~~~
