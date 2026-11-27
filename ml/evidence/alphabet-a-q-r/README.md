# Controles A, Q e R e duas vistas de A

O vídeo de Tel baixinha fornece A, Q e R com a mesma pessoa, a câmera fixa e os cartões das letras em tela. O polegar fica bem visível no A. Na aula explicativa da Unicentro, a professora Eliziane Streiechen mostra o A de frente e de um ângulo oblíquo. Na segunda vista, a unha fica mais voltada para a câmera, e a margem do polegar continua distinguível. A terceira aula da UFSM tem mais ocultação, com a ponta do polegar em evidência. [A de Tel baixinha](https://www.youtube.com/watch?v=chzje8VmC1I&t=70s), [A da Unicentro](https://www.youtube.com/watch?v=hxnpSXVWkGU&t=88s), [A da terceira aula da UFSM](https://ntetube.nte.ufsm.br/v/1535641159).

| Fonte | Letra | Início–fim, âncora em ms | Identificação |
| --- | --- | --- | --- |
| Tel baixinha | A | 70320–71420, 70880 | Cartão A de Abelha |
| Tel baixinha | Q | 110780–111880, 111340 | Cartão Q de Queijo |
| Tel baixinha | R | 112900–114000, 113420 | Cartão R de Rato |
| Nead/Unicentro | A | 88380–89480, 88900 | A frontal |
| Nead/Unicentro | A | 92280–93380, 92800 | A oblíquo enquanto explica a posição lateral do polegar |

As duas janelas da Unicentro pertencem à explicação do A. A legenda automática identifica a letra em 88350 ms e a posição do polegar entre 90180 e 92159 ms. A professora demonstra S depois, quando leva o polegar por cima dos dedos, identificado pela fala legendada a partir de 94890 ms. Essa demonstração posterior fica fora das janelas. [Vista oblíqua](https://www.youtube.com/watch?v=hxnpSXVWkGU&t=92s).

As gravações inteiras ficam reservadas à avaliação. A autora de *Alfabeto em libras* usa o nome Tel baixinha na publicação. A aula da Unicentro credita a professora em tela e foi publicada pelo Núcleo de Educação a Distância. O campo Licença de cada publicação indica Creative Commons de atribuição com reutilização permitida. O [manifesto](../../alphabet/independent-a-q-r-windows.json) registra o SHA-256 de cada MP4, a licença e a faixa de legendas usada como apoio. [Publicação de Tel baixinha](https://www.youtube.com/watch?v=chzje8VmC1I&hl=pt-BR), [publicação do Nead/Unicentro](https://www.youtube.com/watch?v=hxnpSXVWkGU&hl=pt-BR), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

## Replay basal `5b2d4c4`

O modo Letras exibiu A nos três recortes de A. Nos dois replays de Q e R, Q ficou sem leitura e R apareceu como U. O Chromium recebeu os recortes por câmera virtual, com um processo e aceleração por GPU desativada. O [relatório](replay-5b2d4c4.json) registra os hashes da compilação e dos modelos.

| Recorte | 1º replay | 2º replay | Quadros com mão no replay | Quadros selecionáveis na extração |
| --- | --- | --- | --- | --- |
| Tel baixinha A | A em 222 ms | — | 21 | 17/17 |
| Tel baixinha Q | Sem leitura | Sem leitura | 27 / 25 | 17/17 |
| Tel baixinha R | U em 297 ms | U em 283 ms | 23 / 25 | 16/17 |
| Unicentro A frontal | A em 212 ms | — | 25 | 17/17 |
| Unicentro A oblíquo | A em 276 ms | — | 26 | 17/17 |

Os tempos contam a partir do início de cada recorte. No Q, o indicador aponta para baixo e fica inteiro no enquadramento. No R, os dois dedos estendidos se sobrepõem na imagem. A vista lateral deixa a profundidade do cruzamento indeterminada em uma única câmera. A extração dos clipes originais encontrou pontos de 21 articulações nos 17 quadros amostrados de Q e de R. No R, houve uma segunda detecção próxima em um quadro e o seletor deixou esse quadro sem mão. As leituras repetidas mostram o comportamento nesses recortes de uma só sessão. A extração local também confirma o rastreamento dos três recortes de A, cuja posição do polegar ainda é distinguível. [Q de Tel baixinha](https://www.youtube.com/watch?v=chzje8VmC1I&t=110s), [R de Tel baixinha](https://www.youtube.com/watch?v=chzje8VmC1I&t=113s).

## Reprodução local

Na raiz do projeto, use os MP4 com os hashes registrados, a compilação `5b2d4c4` na porta 4177 e um executável `chromium-cpu` que invoque Chromium com `--disable-gpu`.

```sh
LIBRASIA_CHROMIUM=/caminho/chromium-cpu node ml/alphabet/replay-web.mjs \
  --url http://127.0.0.1:4177/ \
  --manifest ml/alphabet/independent-a-q-r-windows.json \
  --source tel-baixinha-chzje8vmc1i --source unicentro-hxnpsxvwkgu --workers 1
LIBRASIA_CHROMIUM=/caminho/chromium-cpu node ml/alphabet/replay-web.mjs \
  --url http://127.0.0.1:4177/ \
  --manifest ml/alphabet/independent-a-q-r-windows.json \
  --source tel-baixinha-chzje8vmc1i --letters QR --workers 1
OPENCV_FFMPEG_CAPTURE_OPTIONS='threads;1' .venv/bin/python -m ml.alphabet.extract_motion \
  --manifest ml/alphabet/independent-a-q-r-windows.json \
  --out data/evidence/alphabet-a-q-r/static-frames.json
```

## Ensaios de Q/N e R/U

Duas regressões logísticas foram treinadas nos quadros da primeira aula da UFSM. Para Q, os descritores usam a flexão de indicador, médio e anelar, a direção vertical das pontas e a separação entre indicador e médio, calculadas nas coordenadas 3D. O complemento só acrescenta Q quando a rede principal prefere N, o verificador confirma Q e o complemento anterior fica sem leitura. Para R, os descritores da imagem medem a projeção das pontas de indicador e médio no eixo das bases dos dedos, a distância entre as pontas e as flexões. A confirmação só pode substituir um U aceito pelas duas redes. Ambos usam limiar 0,95, com os recortes da UFSM de validação e os de Tel baixinha fora do treino.

Na avaliação offline em 74 recortes e 1.324 quadros selecionáveis, o complemento acrescentou Q nos 17 quadros de Q de Tel baixinha e recuperou R nos oito quadros em que as redes aceitavam U no recorte de R. Nenhum outro rótulo recebeu esses votos. A regra de Q ainda deixa o Q da Unicentro como P. A forma de U em perfil da mesma aula obteve pontuação alta no verificador experimental de R. Nesse recorte, as redes principais ficaram sem leitura, então a confirmação de R ficou inativa. Os ensaios dependem dos controles de U em perfil antes de uma integração. [Relatório de treino e avaliação](contrastes-q-r.json) · [Controle de U em perfil](../../../docs/dados-alfabeto.md#m-n-u-e-q-em-duas-gravações-reservadas)

Use a referência 3D do [ensaio de A](../alphabet-a-e-independent/README.md#ensaio-de-flexão-em-coordenadas-3d).

```sh
mkdir -p data/alphabet/q-r-diagnostico
OPENCV_FFMPEG_CAPTURE_OPTIONS='threads;1' .venv/bin/python -m ml.alphabet.extract_motion --world \
  --manifest ml/alphabet/independent-m-n-u-q-windows.json --out data/alphabet/q-r-diagnostico/mnuq-3d.json
.venv/bin/python -m ml.alphabet.probe_qr data/releases/librasia-n-confirmacao/site/models \
  data/alphabet/a-oculto/referencia-3d.json data/alphabet/q-r-diagnostico/mnuq-3d.json
```

## Compilação experimental no Chromium

A compilação experimental `c8193b8` exporta os dois complementos em ONNX e aplica a confirmação apenas às saídas elegíveis. O Chromium usou um recorte de Q e um de R da mesma gravação de Tel baixinha. Cada recorte foi reproduzido três vezes com câmera virtual e 28 quadros com mão em cada reprodução. O painel exibiu somente a letra esperada nos seis replays. Os testes automatizados também verificaram Q e R na Área livre e em Praticar, a troca M → N na Unesp e o movimento de duas mãos na sobreposição. [Manifesto das repetições](tel-qr-repetido.json) · [Replays e hashes](tel-qr-c8193b8.json)

O ensaio verifica esses dois recortes. A adoção na prévia local depende dos controles com outras pessoas e de U em perfil.

### Regressão com o pacote de Q e R

Nas mesmas 89 janelas rotuladas, a prévia `b7b8d21` e o candidato `c8193b8` exibiram a letra esperada em todos os recortes. Em alguns recortes, também apareceram outras letras. Nos 19 recortes fora do alfabeto, a prévia exibiu alguma letra em sete e o candidato em oito. No movimento do queixo para o teclado, o candidato acrescentou R aos 609 ms, além do M que já aparecia na prévia. No recorte Rosa → Marrom, o candidato exibiu J. Em três novas reproduções do recorte do queixo para o teclado, R apareceu em uma na compilação candidata e em nenhuma na prévia. O pacote conjunto segue experimental. [Reteste pareado](reteste-queixo.json) · [Positivos do candidato](positivos-c8193b8.json) · [Negativos do candidato](negativos-c8193b8.json) · [Negativos da prévia](../alphabet-a-e-independent/negativos-b7b8d21.json)

### Comparação com recortes adicionais

Os mesmos replays foram executados nas duas compilações com um processo Chromium. A comparação inclui 10 recortes de quatro gravações e três pessoas sinalizantes. A professora Eliziane Streiechen aparece nos dois vídeos da Unicentro. As seis janelas da sequência da Unicentro e da demonstração de Uéslei Paterno foram fixadas antes da inferência. [Novas janelas](../../alphabet/independent-q-r-u-controls.json) · [Janelas anteriores](../../alphabet/independent-m-n-u-q-windows.json)

| Gravação | Prévia `b7b8d21` | Candidato `c8193b8` |
| --- | --- | --- |
| IFSC, Q, R e U | Q · R · U | Q · R e H · U |
| Unicentro, sequência com cartões de Q, R e U | Q · R · U e H | Q · R · U |
| Tel baixinha, Q e U | Sem leitura · U e H | Q · U e H |
| Unicentro, aula explicativa com Q e U em perfil | P · Sem leitura | P · Sem leitura |

Nenhuma das quatro janelas de U exibiu R. No U em perfil da aula explicativa, houve 23 quadros com mão, com o painel vazio nas duas versões. Esse caso deixa em aberto a confirmação em outros recortes de perfil com U aceito. O Q lido como P permanece fora da regra treinada para Q/N. [Leituras da prévia](controles-b7b8d21.json) · [Leituras do candidato](controles-c8193b8.json)

### Teste do complemento de Q em separado

O manifesto da compilação `81e20b9` inclui `worldQ`. O complemento experimental de R ficou desabilitado. O Chromium exibiu Q em três replays do recorte de Tel baixinha. Os três testes de ponta a ponta passaram com gravações, incluindo a leitura de Q na Área livre e em Praticar e a troca de M para N na mesma captura. No recorte do queixo para o teclado, o painel exibiu somente M. A regressão completa ainda precisa passar para esse pacote substituir a prévia. [Repetições de Q](tel-q-81e20b9.json) · [Recorte do queixo para o teclado](queixo-81e20b9.json)
