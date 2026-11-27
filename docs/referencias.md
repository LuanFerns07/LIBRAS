# Referências, bases de dados e consultas do LibrasIA

Este índice reúne as fontes registradas no Git para uso em citações posteriores. Os manifestos guardam os detalhes de versão, recorte, licença e SHA-256 disponíveis. Para uma citação, use o depósito, o artigo ou a página de origem. Complete os dados bibliográficos e a data de acesso conforme a consulta que sustenta o texto.

## Dados utilizados e fontes avaliadas

| Fonte | Uso ou situação registrada | Registro no projeto |
| --- | --- | --- |
| Almeida et al. *MINDS-Libras Dataset* (2019). DOI `10.5281/zenodo.2667329`. [Depósito](https://zenodo.org/records/2667329) · [Registro DataCite](https://api.datacite.org/dois/10.5281/zenodo.2667329) | RGB Canon para os sinais da lição. O DataCite registra CC BY 4.0. | [Dados e partições](dados.md) · [Manifesto inicial](../ml/manifests/minds-v1.json) |
| MINDS-Libras MediaPipe. [Revisão bfe5a6b](https://huggingface.co/datasets/danielelvs/minds_mediapipe/tree/bfe5a6b85cdbef135e28fad045f02963e5416c81) | Derivado avaliado quanto ao formato, às condições de uso e à compatibilidade do extrator. | [Comparação com o RGB](dados.md#fontes-e-condições-de-uso) |
| Tayyub, Hawasly e Cohn. *Complex and Long Activities Dataset* (2017). DOI `10.5518/249`. [Depósito](https://archive.researchdata.leeds.ac.uk/254/) | Controles de repouso e atividades cotidianas. CC BY 4.0. | [Recortes e resultados](negativos.md) · [Protocolo CLAD](../ml/external_eval/clad.json) |
| Moraes et al. *LIBRAS-EQT-UECE*, v4. [Depósito e arquivos](https://zenodo.org/records/21398895) · [Artigo](https://doi.org/10.1109/ACCESS.2026.3715086) | Ensaios de frases e de rejeição. O depósito registra CC BY-NC 4.0. | [Triagem e limitações](dados-glosas.md) · [Ensaio](sinalizacao-continua.md) |
| Heitor Câmara Costa Fernandes. *Libras Landmark Dataset (A-Z)*, v1. [Kaggle](https://www.kaggle.com/datasets/heitorccf/librasign/versions/1) | Pontos de mão para o ensaio do alfabeto. O depósito declara GPL 3. | [Partições e outras fontes do alfabeto](dados-alfabeto.md) · [Manifestos de vídeo](../ml/alphabet/) |
| UFPB. *VLibrasBD*, v2. DOI `10.17632/ryj88ckjww.2`. [Mendeley](https://data.mendeley.com/datasets/ryj88ckjww/2) | Pares de glosas e português escrito. CC BY-SA 4.0. | [Fonte, leitura e partição](glosas-texto.md) |
| Quadros, Schmitt, Lohn e Leite. *Corpus de Libras* (UFSC, 2020). [Acervo](https://corpuslibras.ufsc.br/publicacoes) · [Orientação para citação](https://corpuslibras.ufsc.br/espacointerativo/perguntas/view/9) | Ensaio local de fronteiras. As condições para uso formal em pesquisa estão no registro do acervo. | [Proveniência e condições](fronteiras.md#proveniência-e-condições-de-uso) |
| [Captar-Libras](https://verlab.github.io/captar-libras/), [Libras-UFPel Corpus](https://aclanthology.org/2026.propor-1.112.pdf), [Skelibras](https://github.com/luqsthunder/Skelibras) e outras fontes com glosas | Triagem de cobertura e acesso. | [Tabela de fontes e condições](dados-glosas.md) |

## Consultas e materiais de apoio

- As referências de poses, movimentos e variantes estão reunidas com as páginas ou seções consultadas. Incluem a tese de Tamires Martins Rezende sobre o MINDS-Libras, o material de Anderson Duarte, o artigo de Heloise Gripp Diniz e o alfabeto do INES. [Animações e referências](animacoes.md)
- A sequência da primeira trilha de aulas usa a Unidade 1 do curso básico da Enap e as seções iniciais do Livro Estudo 1 do IFSC. [Comparação e recorte didático](roadmap-aulas-libras.md#o-que-os-cursos-fazem-no-início)
- Os vídeos de instituições e as aulas usadas no alfabeto ou como controles externos têm origem, intervalo, crédito e condições no protocolo de cada ensaio. [Vídeos do alfabeto](dados-alfabeto.md) · [Sinais independentes](sinais-independentes.md) · [Controles de movimento](amarelo-espelho-externos.md) · [Transições entre numerais](transicao-sete-oito.md) · [Protocolos de avaliação externa](../ml/fresh_eval/)
- As consultas técnicas abrangem MediaPipe, ONNX Runtime Web, PyTorch, captura no navegador, Web Speech e implantação web. [Implementação](../PROMPT_LIBRASIA.md) · [Avaliação e paridade](avaliacao.md) · [Publicação](publicacao.md)
- Os sete materiais de **Saiba mais** têm autoria e título no catálogo de referências da aplicação. [Fontes exibidas](../src/references.js) · [Conferência dos destinos](roteiro-validacao.md#conferência-dos-sete-links-de-saiba-mais)
- Os documentos da inscrição e as consultas oficiais estão vinculados ao roteiro da equipe. [Guia local](../Guia%20do%20Pr%C3%AAmio%20C%C3%A1tedra%20IA.html) · [Escopo do projeto](../Competi%C3%A7%C3%A3o%20de%20IA-1.pdf) · [Edital e aditivo](inscricao.md)

## Inventário de endereços registrados

Cada endereço abaixo aponta para uma fonte externa com pelo menos um registro interno de onde foi citado. Versões, minutagens e endereços de download foram preservados quando têm registros distintos. A lista inclui bases avaliadas que ficaram de fora dos experimentos. As condições de uso de cada material estão nos registros indicados.

### acervodigital.unesp.br

- [bitstream/unesp/222981/8/unesp-nead_libras_graduacao_aula1.flv](<https://acervodigital.unesp.br/bitstream/unesp/222981/8/unesp-nead_libras_graduacao_aula1.flv>) · [institutional-p-q-training.json](../ml/alphabet/institutional-p-q-training.json) · [institutional-r-u-training.json](../ml/alphabet/institutional-r-u-training.json)
- [Unesp](<https://acervodigital.unesp.br/handle/unesp/222981>) · [animacoes.md](../docs/animacoes.md) · [dados-alfabeto.md](../docs/dados-alfabeto.md)

### aclanthology.org

- [Artigo, seções 3–5](<https://aclanthology.org/2026.propor-1.112.pdf>) · [dados-glosas.md](../docs/dados-glosas.md)

### api.datacite.org

- [Metadados do MINDS-Libras](<https://api.datacite.org/dois/10.5281/zenodo.2667329>) · [dados.md](../docs/dados.md)

### archive.researchdata.leeds.ac.uk

- [Depósito e licença](<https://archive.researchdata.leeds.ac.uk/254/>) · [negativos.md](../docs/negativos.md) · [manifest.json](../ml/evidence/isolated-clad/manifest.json)
- [254/1/annotations.zip](<https://archive.researchdata.leeds.ac.uk/254/1/annotations.zip>) · [manifest.json](../ml/evidence/isolated-clad/manifest.json) · [clad-variants.json](../ml/external_eval/clad-variants.json)
- [254/2/videos.zip](<https://archive.researchdata.leeds.ac.uk/254/2/videos.zip>) · [manifest.json](../ml/evidence/isolated-clad/manifest.json) · [clad-variants.json](../ml/external_eval/clad-variants.json)

### arxiv.org

- [Artigo de concatenação](<https://arxiv.org/abs/2409.01506>) · [dados-glosas.md](../docs/dados-glosas.md)
- [Método dos autores](<https://arxiv.org/html/1709.03456>) · [negativos.md](../docs/negativos.md)
- [Artigo, seções 5–7](<https://arxiv.org/html/2607.11341v1>) · [dados-glosas.md](../docs/dados-glosas.md)

### bdtd.ibict.br

- [Registro da dissertação](<https://bdtd.ibict.br/vufind/Record/UFPE_31d9fe04d736d94a77ba46882449f348/Details>) · [dados-glosas.md](../docs/dados-glosas.md)

### blog.youtube

- [Versão da licença adotada pelo YouTube](<https://blog.youtube/news-and-events/youtube-and-creative-commons-raising/>) · [README.md](../ml/evidence/alphabet-a-e-independent/README.md) · [README.md](../ml/evidence/alphabet-e-o-independent/README.md)

### canal.cecierj.edu.br

- [012016/8f96e3c6238f88dd167ee2b5a8818e80.mp4](<https://canal.cecierj.edu.br/012016/8f96e3c6238f88dd167ee2b5a8818e80.mp4>) · [cederj-dialogue-protocol.json](../ml/evidence/ufsc-boundaries/cederj-dialogue-protocol.json) · [protocol-moving.json](../ml/fresh_eval/protocol-moving.json)
- [012016/e40fae9a5d9e7ac99388b2a3eec950ef.mp4](<https://canal.cecierj.edu.br/012016/e40fae9a5d9e7ac99388b2a3eec950ef.mp4>) · [institutional-p-q-training.json](../ml/alphabet/institutional-p-q-training.json) · [institutional-r-u-training.json](../ml/alphabet/institutional-r-u-training.json)
- [Aula e download oficial](<https://canal.cecierj.edu.br/recurso/13757>) · [animacoes.md](../docs/animacoes.md) · [dados-alfabeto.md](../docs/dados-alfabeto.md)
- [Aula 9](<https://canal.cecierj.edu.br/recurso/13763>) · [sinalizacao-continua.md](../docs/sinalizacao-continua.md)
- [Aula 5 no portal](<https://canal.cecierj.edu.br/recurso/13764>) · [amarelo-espelho-externos.md](../docs/amarelo-espelho-externos.md) · [sinalizacao-continua.md](../docs/sinalizacao-continua.md)
- [Aula e créditos no portal da Fundação Cecierj](<https://canal.cecierj.edu.br/recurso/13766>) · [amarelo-espelho-externos.md](../docs/amarelo-espelho-externos.md) · [sinalizacao-continua.md](../docs/sinalizacao-continua.md)

### catedraldt.virtual.ufc.br

- [Edital oficial, itens 4 a 8](<https://catedraldt.virtual.ufc.br/wp-content/uploads/2026/11/edital-premio-catedra-ia-2026.pdf>) · [inscricao.md](../docs/inscricao.md) · [ROADMAP_LIBRASIA.md](../ROADMAP_LIBRASIA.md)

### chromedevtools.github.io

- [Protocolo DevTools para as regras e o estado de rede](<https://chromedevtools.github.io/devtools-protocol/tot/Network/>) · [janelas-area-livre.md](../docs/janelas-area-livre.md)

### clubedelibras.ufc.br

- [Luciana Marques Vale, Curso Básico de Libras, Unidade 1, pp. 7–16, acervo do Clube de Libras da UFC](<https://clubedelibras.ufc.br/wp-content/uploads/2022/10/cursobasicoenap-apostila-libras.pdf#page=7>) · [roadmap-aulas-libras.md](roadmap-aulas-libras.md)
- [Exercício de diálogo, p. 15](<https://clubedelibras.ufc.br/wp-content/uploads/2022/10/cursobasicoenap-apostila-libras.pdf#page=15>) · [roadmap-aulas-libras.md](roadmap-aulas-libras.md#recorte-para-a-primeira-trilha)
- [wp-content/uploads/2021/04/livro-librasparaacademicos-basico1-profandersonduarte.pdf](<https://clubedelibras.ufc.br/wp-content/uploads/2021/04/livro-librasparaacademicos-basico1-profandersonduarte.pdf>) · [catalog.js](../src/catalog.js)
- [Acervo do Clube de Libras da UFC](<https://clubedelibras.ufc.br/wp-content/uploads/2021/04/livro-librasparaacademicos-basico1-profandersonduarte.pdf#page=14>) · [animacoes.md](../docs/animacoes.md)
- [Duarte, Libras para Acadêmicos, pp. 24–25, acervo do Clube de Libras da UFC](<https://clubedelibras.ufc.br/wp-content/uploads/2021/04/livro-librasparaacademicos-basico1-profandersonduarte.pdf#page=22>) · [animacoes.md](../docs/animacoes.md)
- [Libras para Acadêmicos, p. 25, acervo do Clube de Libras da UFC](<https://clubedelibras.ufc.br/wp-content/uploads/2021/04/livro-librasparaacademicos-basico1-profandersonduarte.pdf#page=23>) · [animacoes.md](../docs/animacoes.md)

### corpuslibras.ufsc.br

- [dados/dado/download](<https://corpuslibras.ufsc.br/dados/dado/download>) · [acquire.py](../ml/continuous_experiment/boundaries/acquire.py)
- [Anotação temporal](<https://corpuslibras.ufsc.br/dados/dado/download/321/FLN_G1_D1_1entrevista_VIDEOS123-5?custom=1>) · [sinalizacao-continua.md](../docs/sinalizacao-continua.md)
- [Acervo e transcrição da entrevista](<https://corpuslibras.ufsc.br/dados/dado/porprojeto/Invent%C3%A1rio%20Libras>) · [fronteiras.md](../docs/fronteiras.md) · [sinalizacao-continua.md](../docs/sinalizacao-continua.md)
- [Orientação de uso do Corpus](<https://corpuslibras.ufsc.br/espacointerativo/perguntas/view/6>) · [dados-glosas.md](../docs/dados-glosas.md) · [fronteiras.md](../docs/fronteiras.md)
- [Acesso às gravações e às transcrições](<https://corpuslibras.ufsc.br/espacointerativo/perguntas/view/7>) · [dados-glosas.md](../docs/dados-glosas.md) · [fronteiras.md](../docs/fronteiras.md)
- [Citação do acervo](<https://corpuslibras.ufsc.br/espacointerativo/perguntas/view/9>) · [fronteiras.md](../docs/fronteiras.md) · [sinalizacao-continua.md](../docs/sinalizacao-continua.md)
- [Consentimento do Inventário](<https://corpuslibras.ufsc.br/informacoesdoprojeto?lang=ptbr>) · [fronteiras.md](../docs/fronteiras.md)
- [Corpus de Libras — publicações da UFSC](<https://corpuslibras.ufsc.br/publicacoes>) · [roteiro-validacao.md](../docs/roteiro-validacao.md) · [PROMPT_LIBRASIA.md](../PROMPT_LIBRASIA.md)
- [Manual de transcrição da UFSC](<https://corpuslibras.ufsc.br/publicacoes/download?link=2019+TUTORIAL_CORPUS+transcric%CC%A7a%CC%83o-15835183035e62925f439b03.92987599.pdf>) · [fronteiras.md](../docs/fronteiras.md)

### creativecommons.org

- [licenses/by-nc-sa/3.0/br/](<https://creativecommons.org/licenses/by-nc-sa/3.0/br/>) · [protocol-numerais-ifpa.json](../ml/fresh_eval/protocol-numerais-ifpa.json)
- [Licença CC BY-NC-SA 4.0 da UFSM](<https://creativecommons.org/licenses/by-nc-sa/4.0/>) · [dados-alfabeto.md](../docs/dados-alfabeto.md) · [sinais-independentes.md](../docs/sinais-independentes.md)
- [licenses/by-sa/4.0/](<https://creativecommons.org/licenses/by-sa/4.0/>) · [export_web.py](../ml/continuous_experiment/gloss_text/export_web.py)
- [Licença CC BY 3.0](<https://creativecommons.org/licenses/by/3.0/>) · [amarelo-espelho-externos.md](../docs/amarelo-espelho-externos.md) · [README.md](../ml/evidence/alphabet-a-e-independent/README.md)
- [Licença CC BY 4.0](<https://creativecommons.org/licenses/by/4.0/>) · [dados.md](../docs/dados.md) · [negativos.md](../docs/negativos.md)

### data.mendeley.com

- [Depósito Mendeley v5](<https://data.mendeley.com/datasets/k4gs3bmx5k/5>) · [dados-alfabeto.md](../docs/dados-alfabeto.md)
- [Mendeley `ryj88ckjww` v2](<https://data.mendeley.com/datasets/ryj88ckjww/2>) · [dados-glosas.md](../docs/dados-glosas.md) · [glosas-texto.md](../docs/glosas-texto.md)
- [Mendeley `v7gyc4fvrc` v1](<https://data.mendeley.com/datasets/v7gyc4fvrc/1>) · [dados-glosas.md](../docs/dados-glosas.md)
- [Metadados do arquivo](<https://data.mendeley.com/public-api/datasets/ryj88ckjww/files?folder_id=root&version=2>) · [glosas-texto.md](../docs/glosas-texto.md)
- [public-files/datasets/ryj88ckjww/](<https://data.mendeley.com/public-files/datasets/ryj88ckjww/>) · [corpus.py](../ml/continuous_experiment/gloss_text/corpus.py)

### datapopalliance.org

- [Responsável pela coleta](<https://datapopalliance.org/projects/dataset-brazilian-sign-language-libras-health/>) · [dados-glosas.md](../docs/dados-glosas.md)

### developers.google.com

- [MediaPipe Hand Landmarker](<https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker?tab=Python>) · [sinalizacao-continua.md](../docs/sinalizacao-continua.md)
- [MediaPipe Holistic Landmarker](<https://developers.google.com/edge/mediapipe/solutions/vision/holistic_landmarker>) · [avaliacao.md](../docs/avaliacao.md)

### dicionario.ines.gov.br

- [Dicionário Libras](<https://dicionario.ines.gov.br/>) · [roteiro-validacao.md](../docs/roteiro-validacao.md) · [PROMPT_LIBRASIA.md](../PROMPT_LIBRASIA.md)

### docs.google.com

- [Formulário da UFC](<https://docs.google.com/forms/d/e/1FAIpQLSem93yeY1QOBkT1mt5tSGcnIkrqwwj30tpPGj3fGmCO6xYlGQ/viewform?usp=header>) · [inscricao.md](../docs/inscricao.md)

### doi.org

- [Artigo, IEEE Access](<https://doi.org/10.1109/ACCESS.2026.3715086>) · [sinalizacao-continua.md](../docs/sinalizacao-continua.md)
- [V-Librasil](<https://doi.org/10.21227/V589-HN68>) · [sinais-independentes.md](../docs/sinais-independentes.md)
- [Depósito oficial do MINDS-Libras](<https://doi.org/10.5281/zenodo.2667329>) · [dados.md](../docs/dados.md) · [janelas-parciais.md](../docs/janelas-parciais.md)
- [Dataset](<https://doi.org/10.5518/249>) · [negativos.md](../docs/negativos.md) · [teste-pontos-ao-vivo.md](../docs/teste-pontos-ao-vivo.md)

### download.pytorch.org

- [whl/cu124](<https://download.pytorch.org/whl/cu124>) · [avaliacao.md](../docs/avaliacao.md)

### downloads.sourceforge.net

- [corefonts/times32.exe](<https://downloads.sourceforge.net/corefonts/times32.exe>) · [inscricao.md](../docs/inscricao.md)

### eaulas.usp.br

- [Aula de cores da USP](<https://eaulas.usp.br/portal/Category/video.action?idItem=6547&idVideoVersion=9123>) · [amarelo-espelho-externos.md](../docs/amarelo-espelho-externos.md)

### editora.ufsc.br

- [As imagens do outro sobre a cultura surda — Karin Strobel, Editora da UFSC](<https://editora.ufsc.br/2016/10/10/lancamento-as-imagens-do-outro-sobre-a-cultura-surda/>) · [roteiro-validacao.md](../docs/roteiro-validacao.md) · [PROMPT_LIBRASIA.md](../PROMPT_LIBRASIA.md)

### educapes.capes.gov.br

- [bitstream/capes/431171/2/Unidade%2002%20-%20Bioci%C3%AAncias%20em%20sinais%3A%20Biodegrada%C3%A7%C3%A3o](<https://educapes.capes.gov.br/bitstream/capes/431171/2/Unidade%2002%20-%20Bioci%C3%AAncias%20em%20sinais%3A%20Biodegrada%C3%A7%C3%A3o>) · [single-signer-amarelo-protocol.json](../ml/evidence/ufsc-boundaries/single-signer-amarelo-protocol.json)
- [bitstream/capes/431171/4/Unidade%2004%20-%20Bioci%C3%AAncias%20em%20sinais%3A%20Materiais%20polim%C3%A9ricos](<https://educapes.capes.gov.br/bitstream/capes/431171/4/Unidade%2004%20-%20Bioci%C3%AAncias%20em%20sinais%3A%20Materiais%20polim%C3%A9ricos>) · [single-signer-amarelo-protocol.json](../ml/evidence/ufsc-boundaries/single-signer-amarelo-protocol.json)
- [Referência no material do IFAC](<https://educapes.capes.gov.br/bitstream/capes/600517/1/chegou%20um%20aluno%20surdo%20e%20agora.pdf>) · [transicao-sete-oito.md](../docs/transicao-sete-oito.md) · [protocol-numerais-confirmacao-externa.json](../ml/fresh_eval/protocol-numerais-confirmacao-externa.json)
- [Livro no eduCAPES, pp. 107–108](<https://educapes.capes.gov.br/handle/capes/176804>) · [amarelo-espelho-externos.md](../docs/amarelo-espelho-externos.md)
- [handle/capes/430666?mode=full](<https://educapes.capes.gov.br/handle/capes/430666?mode=full>) · [report.json](../ml/evidence/alphabet-n-m-u/report.json)
- [Vídeos e metadados BioCiNAIS](<https://educapes.capes.gov.br/handle/capes/431171?mode=full>) · [sinalizacao-continua.md](../docs/sinalizacao-continua.md) · [single-signer-amarelo-protocol.json](../ml/evidence/ufsc-boundaries/single-signer-amarelo-protocol.json)
- [Registro UFV no eduCAPES](<https://educapes.capes.gov.br/handle/capes/432035?mode=full>) · [amarelo-espelho-externos.md](../docs/amarelo-espelho-externos.md)
- [Ficha e licença no eduCAPES](<https://educapes.capes.gov.br/handle/capes/586563?mode=full>) · [transicao-sete-oito.md](../docs/transicao-sete-oito.md) · [protocol-numerais-ifpa.json](../ml/fresh_eval/protocol-numerais-ifpa.json)

### faced.ufc.br

- [Clube de Libras — projeto de extensão da UFC](<https://faced.ufc.br/pt/extensao/programa-de-pos-graduacao-em-educacao/clube-de-libras-ufc/>) · [roteiro-validacao.md](../docs/roteiro-validacao.md) · [PROMPT_LIBRASIA.md](../PROMPT_LIBRASIA.md)

### github.com

- [Metodologia, seção 4.1](<https://github.com/Heitorccf/librasign/blob/36468650171e260282103ef411eb49fbe156ba35/HeitorFernandes-TCC_BSI.pdf>) · [dados-alfabeto.md](../docs/dados-alfabeto.md)
- [Código de captura, revisão de agosto de 2025](<https://github.com/Heitorccf/librasign/blob/c89e5153d7f89f275737887b90e6cbf464bfdc6e/src/capture.py>) · [dados-alfabeto.md](../docs/dados-alfabeto.md)
- [Código da sonda](<https://github.com/LuanFerns07/LIBRAS/blob/4a309c6/ml/alphabet/diagnose_r.py>) · [README.md](../ml/evidence/alphabet-a-q-r/README.md)
- [Código do treino](<https://github.com/LuanFerns07/LIBRAS/blob/59c47db/ml/alphabet/probe_y.py>) · [dados-alfabeto.md](../docs/dados-alfabeto.md)
- [Código da sonda](<https://github.com/LuanFerns07/LIBRAS/blob/a101693/ml/alphabet/probe_pq.py>) · [README.md](../ml/evidence/alphabet-a-q-r/README.md)
- [Código da sonda](<https://github.com/LuanFerns07/LIBRAS/blob/f60058b/ml/alphabet/probe_u.py>) · [README.md](../ml/evidence/alphabet-a-q-r/README.md)
- [Candidato com replays](<https://github.com/LuanFerns07/LIBRAS/tree/9d5d6fe>) · [dados-alfabeto.md](../docs/dados-alfabeto.md)
- [Descrição dos autores](<https://github.com/biankatpas/Brazilian-Sign-Language-Alphabet-Dataset>) · [dados-alfabeto.md](../docs/dados-alfabeto.md)
- [Código associado](<https://github.com/danielelvs/islr-subset/blob/main/src/extraction/mediapipe_extractor.py>) · [dados.md](../docs/dados.md)
- [Holistic Landmarker float16/1 indicado pelo exemplo do Google](<https://github.com/google-ai-edge/mediapipe-samples-web/blob/main/src/tasks/holistic-landmarker.ts>) · [publicacao.md](../docs/publicacao.md)
- [Exemplo oficial do MediaPipe Holistic para web](<https://github.com/google-ai-edge/mediapipe-samples-web/blob/main/src/workers/holistic-landmarker.worker.ts>) · [PROMPT_LIBRASIA.md](../PROMPT_LIBRASIA.md)
- [Modelo Hand Landmarker do MediaPipe](<https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md#hand-landmarker>) · [previa-estavel.md](../docs/previa-estavel.md)
- [Distribuição](<https://github.com/luqsthunder/Skelibras>) · [dados-glosas.md](../docs/dados-glosas.md)

### goiaslibras.educacao.go.gov.br

- [NOME, GoiásLibras](<https://goiaslibras.educacao.go.gov.br/sinal/nome>) · [animacoes.md](../docs/animacoes.md) · [catalog.js](../src/catalog.js)

### homologacao-omeka.icict.fiocruz.br

- [s/fiocruzimagens/busca?q=sinais](<https://homologacao-omeka.icict.fiocruz.br/s/fiocruzimagens/busca?q=sinais>) · [report.json](../ml/evidence/alphabet-n-m-u/report.json)

### huggingface.co

- [Distribuição parte 1](<https://huggingface.co/datasets/cauamp/captarlibras>) · [dados-glosas.md](../docs/dados-glosas.md)
- [MINDS-Libras MediaPipe, revisão bfe5a6b](<https://huggingface.co/datasets/danielelvs/minds_mediapipe/tree/bfe5a6b85cdbef135e28fad045f02963e5416c81>) · [dados.md](../docs/dados.md)
- [MINDS-Libras processado](<https://huggingface.co/datasets/danielelvs/minds_mediapipe/tree/main>) · [PROMPT_LIBRASIA.md](../PROMPT_LIBRASIA.md)
- [conjunto harmonizado](<https://huggingface.co/datasets/danielelvs/multilingual-islr-mediapipe>) · [dados.md](../docs/dados.md)
- [Distribuição parte 2](<https://huggingface.co/datasets/ericksonrn/captarlibras>) · [dados-glosas.md](../docs/dados-glosas.md)

### indl.iphan.gov.br

- [Karin Strobel — perfil no Inventário Nacional da Diversidade Linguística (Iphan)](<https://indl.iphan.gov.br/pessoas-de-referencia/karin-strobel/>) · [roteiro-validacao.md](../docs/roteiro-validacao.md) · [PROMPT_LIBRASIA.md](../PROMPT_LIBRASIA.md)

### institucional.ufpel.edu.br

- [Projeto UFPel](<https://institucional.ufpel.edu.br/projetos/id/11247>) · [dados-glosas.md](../docs/dados-glosas.md)

### letsencrypt.org

- [Cadeias de confiança Let's Encrypt](<https://letsencrypt.org/certificates/>) · [fronteiras.md](../docs/fronteiras.md)

### libras.cin.ufpe.br

- [Portal original](<https://libras.cin.ufpe.br/>) · [dados-glosas.md](../docs/dados-glosas.md)

### m.grupoa.com.br

- [Língua de Sinais Brasileira — Ronice Müller de Quadros e Lodenir Becker Karnopp, Artmed](<https://m.grupoa.com.br/lingua-de-sinais-brasileira-estudos-9788536303086-p991033>) · [roteiro-validacao.md](../docs/roteiro-validacao.md) · [PROMPT_LIBRASIA.md](../PROMPT_LIBRASIA.md)

### manuario.ines.gov.br

- [Manuário Acadêmico e Escolar — INES](<https://manuario.ines.gov.br/>) · [roteiro-validacao.md](../docs/roteiro-validacao.md) · [PROMPT_LIBRASIA.md](../PROMPT_LIBRASIA.md)

### mooc.campusvirtual.fiocruz.br

- [Licença e política de reúso do curso Fiocruz](<https://mooc.campusvirtual.fiocruz.br/rea/acessibilidade-sus/>) · [sinais-independentes.md](../docs/sinais-independentes.md) · [protocol-negatives.json](../ml/fresh_eval/protocol-negatives.json)
- [rea/acessibilidade-sus/downloads/modulo_6/004-Numeros-cardinais.mp4](<https://mooc.campusvirtual.fiocruz.br/rea/acessibilidade-sus/downloads/modulo_6/004-Numeros-cardinais.mp4>) · [protocol-negatives.json](../ml/fresh_eval/protocol-negatives.json) · [protocol.json](../ml/fresh_eval/protocol.json)
- [Números Cardinais, Campus Virtual Fiocruz](<https://mooc.campusvirtual.fiocruz.br/rea/acessibilidade-sus/modulo_6_video_3.html>) · [sinais-independentes.md](../docs/sinais-independentes.md) · [protocol-negatives.json](../ml/fresh_eval/protocol-negatives.json)

### moodle4-homol.ifsc.edu.br

- [IFSC](<https://moodle4-homol.ifsc.edu.br/mod/glossary/showentry.php?eid=836>) · [amarelo-espelho-externos.md](../docs/amarelo-espelho-externos.md)

### moodle4.ifsc.edu.br

- [Livro Estudo 1 do IFSC](<https://moodle4.ifsc.edu.br/mod/book/tool/print/index.php?id=274178>) · [roadmap-aulas-libras.md](roadmap-aulas-libras.md) · [transicao-sete-oito.md](../docs/transicao-sete-oito.md) · [protocol-numerais-ifsc.json](../ml/fresh_eval/protocol-numerais-ifsc.json)
- [Unidade didática do IFSC](<https://moodle4.ifsc.edu.br/mod/book/tool/print/index.php?id=274178#ch50538>) · [README.md](../ml/evidence/alphabet-o-s-independent/README.md) · [independent-p-q-windows.json](../ml/alphabet/independent-p-q-windows.json)

### mozilladatacollective.com

- [Ficha, restrições e metodologia](<https://mozilladatacollective.com/datasets/cmq16k8qa01bvnr07i2x92yry>) · [dados-glosas.md](../docs/dados-glosas.md)

### ntetube.nte.ufsm.br

- [ntetube.nte.ufsm.br](<https://ntetube.nte.ufsm.br/>) · [train-motion.mjs](../ml/alphabet/train-motion.mjs)
- [repositorio/04882a9067a5d9df9ca4172f2de7bf51/480p.mp4](<https://ntetube.nte.ufsm.br/repositorio/04882a9067a5d9df9ca4172f2de7bf51/480p.mp4>) · [ufsm-static-windows.json](../ml/alphabet/ufsm-static-windows.json) · [ufsm-temporal-windows.json](../ml/alphabet/ufsm-temporal-windows.json)
- [repositorio/11b999f96d7b60ba26f2942df892728f/480p.mp4](<https://ntetube.nte.ufsm.br/repositorio/11b999f96d7b60ba26f2942df892728f/480p.mp4>) · [protocol.json](../ml/fresh_eval/protocol.json)
- [repositorio/1f20d80b2f6ed5c8b42d83891d1eeaf7/480p.mp4](<https://ntetube.nte.ufsm.br/repositorio/1f20d80b2f6ed5c8b42d83891d1eeaf7/480p.mp4>) · [ufsm-static-windows.json](../ml/alphabet/ufsm-static-windows.json) · [ufsm-temporal-windows.json](../ml/alphabet/ufsm-temporal-windows.json)
- [arquivo 480p](<https://ntetube.nte.ufsm.br/repositorio/b338729ecef4a7b5b4bbe96728aa7cb8/480p.mp4>) · [README.md](../ml/evidence/alphabet-a-e-independent/README.md) · [ufsm-static-windows.json](../ml/alphabet/ufsm-static-windows.json)
- [arquivo de maior resolução](<https://ntetube.nte.ufsm.br/repositorio/b338729ecef4a7b5b4bbe96728aa7cb8/720p.mp4>) · [README.md](../ml/evidence/alphabet-a-e-independent/README.md)
- [repositorio/b803553b06fe9d3affc2a30614598f71/480p.mp4](<https://ntetube.nte.ufsm.br/repositorio/b803553b06fe9d3affc2a30614598f71/480p.mp4>) · [protocol-negatives.json](../ml/fresh_eval/protocol-negatives.json) · [protocol.json](../ml/fresh_eval/protocol.json)
- [repositorio/e3a43fcb460aa8c6b074e5a6318ed526/480p.mp4](<https://ntetube.nte.ufsm.br/repositorio/e3a43fcb460aa8c6b074e5a6318ed526/480p.mp4>) · [protocol-numerais-desenvolvimento.json](../ml/fresh_eval/protocol-numerais-desenvolvimento.json)
- [repositorio/e7c191129dbc284af964433f1b874d5c/720p.mp4](<https://ntetube.nte.ufsm.br/repositorio/e7c191129dbc284af964433f1b874d5c/720p.mp4>) · [single-signer-amarelo-protocol.json](../ml/evidence/ufsc-boundaries/single-signer-amarelo-protocol.json)
- [repositorio/f9aa723c957019c7d768a0eb3e7e6fa5/480p.mp4](<https://ntetube.nte.ufsm.br/repositorio/f9aa723c957019c7d768a0eb3e7e6fa5/480p.mp4>) · [protocol-numerais-desenvolvimento.json](../ml/fresh_eval/protocol-numerais-desenvolvimento.json)
- [Aula Libras ON, UFSM](<https://ntetube.nte.ufsm.br/v/1527000916>) · [animacoes.md](../docs/animacoes.md) · [dados-alfabeto.md](../docs/dados-alfabeto.md)
- [Números, Programa Libras ON e Núcleo de Acessibilidade, UFSM](<https://ntetube.nte.ufsm.br/v/1527001532>) · [sinais-independentes.md](../docs/sinais-independentes.md) · [protocol.json](../ml/fresh_eval/protocol.json)
- [A da terceira aula da UFSM](<https://ntetube.nte.ufsm.br/v/1535641159>) · [dados-alfabeto.md](../docs/dados-alfabeto.md) · [README.md](../ml/evidence/alphabet-a-e-independent/README.md)
- [Alfabeto na UFSM](<https://ntetube.nte.ufsm.br/v/1536677587>) · [animacoes.md](../docs/animacoes.md) · [dados-alfabeto.md](../docs/dados-alfabeto.md)
- [Cores, NTE/UFSM](<https://ntetube.nte.ufsm.br/v/1536678082>) · [sinais-independentes.md](../docs/sinais-independentes.md) · [protocol-negatives.json](../ml/fresh_eval/protocol-negatives.json)
- [Grupo de Produção de Material Didático em Língua de Sinais](<https://ntetube.nte.ufsm.br/v/1536688636>) · [transicao-sete-oito.md](../docs/transicao-sete-oito.md) · [protocol-numerais-desenvolvimento.json](../ml/fresh_eval/protocol-numerais-desenvolvimento.json)
- [Aula Cores da UFSM, CC BY-NC-SA 4.0](<https://ntetube.nte.ufsm.br/v/1543949237>) · [sinalizacao-continua.md](../docs/sinalizacao-continua.md) · [single-signer-amarelo-protocol.json](../ml/evidence/ufsc-boundaries/single-signer-amarelo-protocol.json)
- [Caderno Didático Libras D, roteiro e apresentação de Giovana Fracari Hautrive](<https://ntetube.nte.ufsm.br/v/1543950577>) · [transicao-sete-oito.md](../docs/transicao-sete-oito.md) · [protocol-numerais-desenvolvimento.json](../ml/fresh_eval/protocol-numerais-desenvolvimento.json)

### onnxruntime.ai

- [Compatibilidade do ONNX Runtime Web](<https://onnxruntime.ai/docs/get-started/with-javascript/web.html#supported-versions>) · [PROMPT_LIBRASIA.md](../PROMPT_LIBRASIA.md)
- [Exportação de modelos PyTorch para ONNX](<https://onnxruntime.ai/docs/tutorials/export-pytorch-model.html>) · [PROMPT_LIBRASIA.md](../PROMPT_LIBRASIA.md)
- [Inferência no navegador com ONNX Runtime Web](<https://onnxruntime.ai/docs/tutorials/web/>) · [PROMPT_LIBRASIA.md](../PROMPT_LIBRASIA.md)

### packages.debian.org

- [Instalador Debian](<https://packages.debian.org/trixie/ttf-mscorefonts-installer>) · [inscricao.md](../docs/inscricao.md)

### pmc.ncbi.nlm.nih.gov

- [Artigo, seções 4.3 e 4.4](<https://pmc.ncbi.nlm.nih.gov/articles/PMC12341731/#sec4>) · [glosas-texto.md](../docs/glosas-texto.md)

### proceedings.iclr.cc

- [Artigo, nota 1 e Tabela 1](<https://proceedings.iclr.cc/paper_files/paper/2025/file/cbbb65dc108e8ac2f82cba25bc5992fc-Paper-Conference.pdf>) · [dados-glosas.md](../docs/dados-glosas.md)

### proceedings.science

- [Descrição da anotação ELAN](<https://proceedings.science/permanencia-2019/trabalhos/construcao-de-um-corpus-paralelo-portugues-libras-anotacao-linguistica-de-videos?lang=pt-br>) · [dados-glosas.md](../docs/dados-glosas.md)

### pypi.org

- [MediaPipe 0.10.32 no PyPI](<https://pypi.org/project/mediapipe/0.10.32/>) · [avaliacao.md](../docs/avaliacao.md)

### raw.githubusercontent.com

- [Licença](<https://raw.githubusercontent.com/luqsthunder/Skelibras/master/LICENSE>) · [dados-glosas.md](../docs/dados-glosas.md)

### repositorio.enap.gov.br

- [Luciana Marques Vale, Curso Básico de Libras, p. 12, repositório Enap](<https://repositorio.enap.gov.br/items/367214fd-f325-49e6-8f9b-af29fa258be3>) · [animacoes.md](../docs/animacoes.md)

### repositorio.ifac.edu.br

- [Referência institucional do IFAC, p. 19](<https://repositorio.ifac.edu.br/jspui/bitstream/123456789/34/3/Chegou%20um%20aluno%20Surdo%2C%20e%20agora.%20Um%20roteiro%20de%20aprendizagem%20para%20professores%20do%20ensino%20de%20administra%C3%A7%C3%A3o%20para%20Surdos.pdf>) · [README.md](../ml/evidence/alphabet-a-e-independent/README.md) · [independent-motion-expanded-windows.json](../ml/alphabet/independent-motion-expanded-windows.json)

### repositorio.ufmg.br

- [Documentação original do MINDS-Libras na UFMG](<https://repositorio.ufmg.br/items/b4a21355-8b2d-445f-a610-d95f07e28b2a>) · [PROMPT_LIBRASIA.md](../PROMPT_LIBRASIA.md) · [catalog.js](../src/catalog.js)
- [Tese de Tamires Martins Rezende, Apêndice B, Tabela 17](<https://repositorio.ufmg.br/server/api/core/bitstreams/4307a8e9-f22e-4374-a900-0f42d88974a8/content>) · [amarelo-espelho-externos.md](../docs/amarelo-espelho-externos.md) · [animacoes.md](../docs/animacoes.md)

### repositorio.ufpb.br

- [Dissertação UFPB, seção 4.2](<https://repositorio.ufpb.br/jspui/bitstream/123456789/20261/1/LuanaSilvaReis_Dissert.pdf#page=53>) · [dados-glosas.md](../docs/dados-glosas.md)

### repositorio.ufsc.br

- [Rodrigo Nogueira Machado, 2016, tabela 5 e explicação nas pp. 79–81, repositório UFSC](<https://repositorio.ufsc.br/bitstream/123456789/173253/1/343702.pdf#page=81>) · [animacoes.md](../docs/animacoes.md) · [catalog.js](../src/catalog.js)
- [Registro da câmera 2](<https://repositorio.ufsc.br/handle/123456789/159521?show=full>) · [sinalizacao-continua.md](../docs/sinalizacao-continua.md)
- [Registro da câmera 3](<https://repositorio.ufsc.br/handle/123456789/159522?show=full>) · [sinalizacao-continua.md](../docs/sinalizacao-continua.md)

### repositorio.utfpr.edu.br

- [Pronomes possessivos, p. 153, repositório da UTFPR](<https://repositorio.utfpr.edu.br/jspui/bitstream/1/1598/2/libras.pdf>) · [animacoes.md](../docs/animacoes.md)

### revistas.ufrj.br

- [Revista Linguística da UFRJ](<https://revistas.ufrj.br/index.php/rl/article/download/37488/22633/114954>) · [animacoes.md](../docs/animacoes.md)
- [Diniz, 2020, p. 455](<https://revistas.ufrj.br/index.php/rl/article/download/37488/22633/114954#page=4>) · [animacoes.md](../docs/animacoes.md) · [dados-alfabeto.md](../docs/dados-alfabeto.md)

### secure.globalsign.com

- [intermediário oficial RNP/GlobalSign](<https://secure.globalsign.com/cacert/rnpicpedugr46ovtlsca2025.crt>) · [sinais-independentes.md](../docs/sinais-independentes.md)

### sistemas.cead.ufv.br

- [Verbete UFV](<https://sistemas.cead.ufv.br/capes/dicionario/?cadastros=amarelo>) · [amarelo-espelho-externos.md](../docs/amarelo-espelho-externos.md)

### sources.debian.org

- [Código-fonte do instalador](<https://sources.debian.org/src/msttcorefonts/3.8.1/update-ms-fonts/>) · [inscricao.md](../docs/inscricao.md)

### storage.googleapis.com

- [mediapipe-models/](<https://storage.googleapis.com/mediapipe-models/>) · [setup-vision.mjs](../scripts/setup-vision.mjs)
- [Modelo Hand Landmarker](<https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task>) · [fronteiras.md](../docs/fronteiras.md) · [sinalizacao-continua.md](../docs/sinalizacao-continua.md)

### support.google.com

- [Licença de atribuição no YouTube](<https://support.google.com/youtube/answer/2797468?hl=pt-BR>) · [transicao-sete-oito.md](../docs/transicao-sete-oito.md) · [protocol-numerais-confirmacao-externa.json](../ml/fresh_eval/protocol-numerais-confirmacao-externa.json)

### tede.unioeste.br

- [Apêndices da tese](<https://tede.unioeste.br/bitstream/tede/4170/5/Leidiani_Reis2019.pdf>) · [dados-glosas.md](../docs/dados-glosas.md)
- [Registro e arquivos da Unioeste](<https://tede.unioeste.br/handle/tede/4170>) · [dados-glosas.md](../docs/dados-glosas.md)

### ufcinforma.ufc.br

- [Comunicado da UFC sobre a prorrogação](<https://ufcinforma.ufc.br/pt/noticias/premio-inteligencia-artificial-e-formacao-universitaria-prorroga-inscricoes-projetos-e-solucoes-em-ia-ate-3011>) · [ROADMAP_LIBRASIA.md](../ROADMAP_LIBRASIA.md)
- [Aditivo nº 1 e cronograma atualizado](<https://ufcinforma.ufc.br/storage/ufc-media/docs/doc-261105-aditivo-premio-catedra-luiza-teodoro.pdf>) · [inscricao.md](../docs/inscricao.md) · [ROADMAP_LIBRASIA.md](../ROADMAP_LIBRASIA.md)

### universe.roboflow.com

- [Ficha no Roboflow Universe](<https://universe.roboflow.com/elainesilva/alfabeto-em-libras-qrvnw>) · [dados-alfabeto.md](../docs/dados-alfabeto.md)

### uplopen.com

- [Documentação das câmeras do Corpus](<https://uplopen.com/chapters/4860/files/3d9b9750-29db-4a0a-ae97-ebe106dd3d59.pdf>) · [fronteiras.md](../docs/fronteiras.md) · [sinalizacao-continua.md](../docs/sinalizacao-continua.md)

### vercel.com

- [Deploy a partir de Git na Vercel](<https://vercel.com/docs/git>) · [publicacao.md](../docs/publicacao.md) · [PROMPT_LIBRASIA.md](../PROMPT_LIBRASIA.md)

### verlab.github.io

- [Protocolo e modalidades oficiais](<https://verlab.github.io/captar-libras/>) · [dados-glosas.md](../docs/dados-glosas.md) · [sinais-independentes.md](../docs/sinais-independentes.md)

### videos.nals.cce.ufsc.br

- [Corpus](<https://videos.nals.cce.ufsc.br/Corpus>) · [acquire.py](../ml/continuous_experiment/boundaries/acquire.py)
- [Arquivos oficiais de vídeo no NALS/UFSC](<https://videos.nals.cce.ufsc.br/Corpus%20Libras/Projeto%20Inventario%20de%20Libras%20-%20Regi%C3%A3o%20Metropolitana%20de%20Florianopolis-sc/Produ%C3%A7%C3%A3o/Grupo%201/Dupla%201/1.%20Entrevista/>) · [sinalizacao-continua.md](../docs/sinalizacao-continua.md)

### web.inf.ufpr.br

- [Ficha e condições de uso da UFPR](<https://web.inf.ufpr.br/vri/databases/brazilian-sign-language-libras-hand-configurations-database/>) · [dados-alfabeto.md](../docs/dados-alfabeto.md)

### webaudio.github.io

- [Especificação da síntese de voz para a web](<https://webaudio.github.io/web-speech-api/#tts-section>) · [PROMPT_LIBRASIA.md](../PROMPT_LIBRASIA.md)

### www.di.fc.ul.pt

- [Artigo dos autores, seções 2–4, pp. 55–63](<https://www.di.fc.ul.pt/~ahb/pubs/2016FontesBranco.pdf#page=57>) · [dados-glosas.md](../docs/dados-glosas.md)

### www.gov.br

- [Alfabeto de Libras e configuração de mãos](<https://www.gov.br/ines/pt-br/central-de-conteudos/publicacoes-1/todas-as-publicacoes/alfabeto-manual-e-configuracao-de-maos>) · [animacoes.md](../docs/animacoes.md)

### www.ifbaiano.edu.br

- [Referência do IF Baiano para a forma em O](<https://www.ifbaiano.edu.br/unidades/bonfim/files/2022/07/Alfabeto-manual-em-Libras-1.pdf>) · [animacoes.md](../docs/animacoes.md) · [dados-alfabeto.md](../docs/dados-alfabeto.md)

### www.kaggle.com

- [api/v1/datasets/download/heitorccf/librasign?datasetVersionNumber=1](<https://www.kaggle.com/api/v1/datasets/download/heitorccf/librasign?datasetVersionNumber=1>) · [dados-alfabeto.md](../docs/dados-alfabeto.md)
- [Metadados oficiais](<https://www.kaggle.com/api/v1/datasets/view/heitorccf/librasign>) · [dados-alfabeto.md](../docs/dados-alfabeto.md)
- [Dataset](<https://www.kaggle.com/datasets/heitorccf/librasign/versions/1>) · [dados-alfabeto.md](../docs/dados-alfabeto.md) · [prepare_static.py](../ml/alphabet/prepare_static.py)

### www.repositorio.ufal.br

- [Dissertação UFAL](<https://www.repositorio.ufal.br/jspui/handle/123456789/12315>) · [dados-glosas.md](../docs/dados-glosas.md)
- [Dissertação UFAL sobre a transcrição](<https://www.repositorio.ufal.br/jspui/handle/123456789/12613?mode=full>) · [dados-glosas.md](../docs/dados-glosas.md)

### www.singlibras.com

- [Sing Libras](<https://www.singlibras.com/dicionario/espelho>) · [amarelo-espelho-externos.md](../docs/amarelo-espelho-externos.md)

### www.w3.org

- [Captura de mídia no navegador](<https://www.w3.org/TR/mediacapture-streams/#dom-mediadevices-getusermedia>) · [PROMPT_LIBRASIA.md](../PROMPT_LIBRASIA.md)

### www.youtube.com

- [Aula e licença declarada](<https://www.youtube.com/watch?v=1i_v2a4xAhY>) · [transicao-sete-oito.md](../docs/transicao-sete-oito.md) · [protocol-numerais-confirmacao-externa.json](../ml/fresh_eval/protocol-numerais-confirmacao-externa.json)
- [Publicação com licença da Fundação Cecierj](<https://www.youtube.com/watch?v=4NVpij6RvGg>) · [amarelo-espelho-externos.md](../docs/amarelo-espelho-externos.md) · [sinalizacao-continua.md](../docs/sinalizacao-continua.md)
- [Videoaula de Uéslei Paterno](<https://www.youtube.com/watch?v=4_xeQ-U8bPI>) · [transicao-sete-oito.md](../docs/transicao-sete-oito.md) · [protocol-numerais-ifsc.json](../ml/fresh_eval/protocol-numerais-ifsc.json)
- [watch?v=74EMOUejwz4](<https://www.youtube.com/watch?v=74EMOUejwz4>) · [protocol-numerais-ifpa.json](../ml/fresh_eval/protocol-numerais-ifpa.json)
- [Ed Libras](<https://www.youtube.com/watch?v=8p9zau2pb-E>) · [amarelo-espelho-externos.md](../docs/amarelo-espelho-externos.md)
- [Aula da Unicentro](<https://www.youtube.com/watch?v=AnIqxVEqGNs>) · [dados-alfabeto.md](../docs/dados-alfabeto.md) · [README.md](../ml/evidence/alphabet-o-s-independent/README.md)
- [Licença na publicação da Unicentro](<https://www.youtube.com/watch?v=AnIqxVEqGNs&hl=pt-BR>) · [README.md](../ml/evidence/alphabet-o-s-independent/README.md) · [independent-motion-expanded-windows.json](../ml/alphabet/independent-motion-expanded-windows.json)
- [Aula de alfabeto da Unicentro](<https://www.youtube.com/watch?v=AnIqxVEqGNs&t=68s>) · [README.md](../ml/evidence/alphabet-o-s-independent/README.md)
- [Aula da UFAC](<https://www.youtube.com/watch?v=B2U7c6OXgBg>) · [dados-alfabeto.md](../docs/dados-alfabeto.md) · [README.md](../ml/evidence/alphabet-a-e-independent/README.md)
- [Aula da UFAC](<https://www.youtube.com/watch?v=B2U7c6OXgBg&hl=pt-BR>) · [README.md](../ml/evidence/alphabet-a-e-independent/README.md) · [independent-motion-expanded-windows.json](../ml/alphabet/independent-motion-expanded-windows.json)
- [demonstração da UFAC](<https://www.youtube.com/watch?v=B2U7c6OXgBg&t=198s>) · [README.md](../ml/evidence/alphabet-o-compact/README.md)
- [watch?v=IoFwSOxQ2ag](<https://www.youtube.com/watch?v=IoFwSOxQ2ag>) · [kelly-r-u-holdout.json](../ml/alphabet/kelly-r-u-holdout.json)
- [watch?v=IoFwSOxQ2ag&hl=pt-BR](<https://www.youtube.com/watch?v=IoFwSOxQ2ag&hl=pt-BR>) · [kelly-r-u-holdout.json](../ml/alphabet/kelly-r-u-holdout.json)
- [Edição curta do Ifes](<https://www.youtube.com/watch?v=JpFOhTsxyQE>) · [README.md](../ml/evidence/alphabet-o-independent/README.md)
- [watch?v=MFL8R4t36fE](<https://www.youtube.com/watch?v=MFL8R4t36fE>) · [README.md](../ml/evidence/alphabet-o-independent/README.md) · [ifes-static-windows.json](../ml/alphabet/ifes-static-windows.json)
- [Publicação do Ifes](<https://www.youtube.com/watch?v=MFL8R4t36fE&hl=pt-BR>) · [README.md](../ml/evidence/alphabet-o-independent/README.md) · [ifes-static-windows.json](../ml/alphabet/ifes-static-windows.json)
- [Demonstração do Ifes](<https://www.youtube.com/watch?v=MFL8R4t36fE&t=283s>) · [README.md](../ml/evidence/alphabet-o-compact/README.md) · [README.md](../ml/evidence/alphabet-o-independent/README.md)
- [O do Ifes](<https://www.youtube.com/watch?v=MFL8R4t36fE&t=285s>) · [README.md](../ml/evidence/alphabet-o-s-independent/README.md)
- [Aula e licença declarada](<https://www.youtube.com/watch?v=RIhEs2U8XxM>) · [transicao-sete-oito.md](../docs/transicao-sete-oito.md) · [protocol-numerais-ufac-quantidade.json](../ml/fresh_eval/protocol-numerais-ufac-quantidade.json)
- [watch?v=SdCVqodwH0o](<https://www.youtube.com/watch?v=SdCVqodwH0o>) · [independent-r-u-obliquo.json](../ml/alphabet/independent-r-u-obliquo.json) · [pq-angular-2026.json](../ml/alphabet/pq-angular-2026.json)
- [watch?v=SdCVqodwH0o&hl=pt-BR](<https://www.youtube.com/watch?v=SdCVqodwH0o&hl=pt-BR>) · [independent-r-u-obliquo.json](../ml/alphabet/independent-r-u-obliquo.json) · [pq-angular-2026.json](../ml/alphabet/pq-angular-2026.json)
- [Vídeo de Uéslei Paterno](<https://www.youtube.com/watch?v=__fMtXL8knA>) · [README.md](../ml/evidence/alphabet-o-independent/README.md) · [README.md](../ml/evidence/alphabet-o-s-independent/README.md)
- [Licença na publicação de Paterno](<https://www.youtube.com/watch?v=__fMtXL8knA&hl=pt-BR>) · [README.md](../ml/evidence/alphabet-o-s-independent/README.md) · [README.md](../ml/evidence/alphabet-paterno-o-e/README.md)
- [Aula de Uéslei Paterno](<https://www.youtube.com/watch?v=__fMtXL8knA&t=147s>) · [README.md](../ml/evidence/alphabet-o-s-independent/README.md)
- [primeira sequência de Paterno](<https://www.youtube.com/watch?v=__fMtXL8knA&t=65s>) · [README.md](../ml/evidence/alphabet-o-s-independent/README.md)
- [Publicação com a licença declarada](<https://www.youtube.com/watch?v=cT3l6iP7NXY>) · [transicao-sete-oito.md](../docs/transicao-sete-oito.md) · [institutional-p-q-training.json](../ml/alphabet/institutional-p-q-training.json)
- [watch?v=chzje8VmC1I](<https://www.youtube.com/watch?v=chzje8VmC1I>) · [README.md](../ml/evidence/alphabet-e-o-independent/README.md) · [independent-a-q-r-windows.json](../ml/alphabet/independent-a-q-r-windows.json)
- [Publicação de Tel baixinha](<https://www.youtube.com/watch?v=chzje8VmC1I&hl=pt-BR>) · [README.md](../ml/evidence/alphabet-a-q-r/README.md) · [README.md](../ml/evidence/alphabet-e-o-independent/README.md)
- [Tel baixinha](<https://www.youtube.com/watch?v=chzje8VmC1I&t=100s>) · [dados-alfabeto.md](../docs/dados-alfabeto.md)
- [trecho de O](<https://www.youtube.com/watch?v=chzje8VmC1I&t=105s>) · [README.md](../ml/evidence/alphabet-e-o-independent/README.md)
- [Q de Tel baixinha](<https://www.youtube.com/watch?v=chzje8VmC1I&t=110s>) · [README.md](../ml/evidence/alphabet-a-q-r/README.md)
- [R de Tel baixinha](<https://www.youtube.com/watch?v=chzje8VmC1I&t=113s>) · [README.md](../ml/evidence/alphabet-a-q-r/README.md)
- [A de Tel baixinha](<https://www.youtube.com/watch?v=chzje8VmC1I&t=70s>) · [README.md](../ml/evidence/alphabet-a-q-r/README.md)
- [Trecho de E](<https://www.youtube.com/watch?v=chzje8VmC1I&t=79s>) · [README.md](../ml/evidence/alphabet-e-o-independent/README.md)
- [Aula do NUEDIS/UFF](<https://www.youtube.com/watch?v=ffJZgofrtSg>) · [dados-alfabeto.md](../docs/dados-alfabeto.md) · [uff-alfabeto-continuo.json](../ml/alphabet/uff-alfabeto-continuo.json)
- [watch?v=ffJZgofrtSg&hl=pt-BR](<https://www.youtube.com/watch?v=ffJZgofrtSg&hl=pt-BR>) · [uff-alfabeto-continuo.json](../ml/alphabet/uff-alfabeto-continuo.json)
- [Aula da Unicentro](<https://www.youtube.com/watch?v=hxnpSXVWkGU>) · [README.md](../ml/evidence/alphabet-o-independent/README.md) · [independent-a-q-r-windows.json](../ml/alphabet/independent-a-q-r-windows.json)
- [publicação do Nead/Unicentro](<https://www.youtube.com/watch?v=hxnpSXVWkGU&hl=pt-BR>) · [README.md](../ml/evidence/alphabet-a-q-r/README.md) · [independent-a-q-r-windows.json](../ml/alphabet/independent-a-q-r-windows.json)
- [Aula explicativa com a identificação da professora em tela](<https://www.youtube.com/watch?v=hxnpSXVWkGU&t=14s>) · [README.md](../ml/evidence/alphabet-o-s-independent/README.md)
- [A da Unicentro](<https://www.youtube.com/watch?v=hxnpSXVWkGU&t=88s>) · [README.md](../ml/evidence/alphabet-a-q-r/README.md)
- [Vista oblíqua](<https://www.youtube.com/watch?v=hxnpSXVWkGU&t=92s>) · [README.md](../ml/evidence/alphabet-a-q-r/README.md)
- [Alfabeto Explicativo da Unicentro](<https://www.youtube.com/watch?v=hxnpSXVWkgu&t=165s>) · [dados-alfabeto.md](../docs/dados-alfabeto.md)
- [Gravação da Unicentro](<https://www.youtube.com/watch?v=hxnpSXVWkgu&t=168s>) · [dados-alfabeto.md](../docs/dados-alfabeto.md)
- [Publicação com licença](<https://www.youtube.com/watch?v=l4Ltki8yxcQ>) · [amarelo-espelho-externos.md](../docs/amarelo-espelho-externos.md)
- [watch?v=nCFjW-0-mro](<https://www.youtube.com/watch?v=nCFjW-0-mro>) · [README.md](../ml/evidence/alphabet-o-compact/README.md) · [independent-r-u-obliquo.json](../ml/alphabet/independent-r-u-obliquo.json)
- [Publicação da Uníntese](<https://www.youtube.com/watch?v=nCFjW-0-mro&hl=pt-BR>) · [README.md](../ml/evidence/alphabet-o-compact/README.md) · [independent-r-u-obliquo.json](../ml/alphabet/independent-r-u-obliquo.json)
- [A da Uníntese](<https://www.youtube.com/watch?v=nCFjW-0-mro&t=40s>) · [README.md](../ml/evidence/alphabet-o-compact/README.md)
- [Vídeo no trecho anotado](<https://www.youtube.com/watch?v=nCFjW-0-mro&t=75s>) · [README.md](../ml/evidence/alphabet-o-compact/README.md)
- [Além das Palavras](<https://www.youtube.com/watch?v=nkHL1MGzatU&t=95s>) · [amarelo-espelho-externos.md](../docs/amarelo-espelho-externos.md)

### zenodo.org

- [api/records/21398895/files](<https://zenodo.org/api/records/21398895/files>) · [acquire_eqt.py](../ml/continuous_experiment/acquire_eqt.py)
- [Metadados do depósito](<https://zenodo.org/api/records/2667329>) · [dados.md](../docs/dados.md) · [acquire.py](../ml/minds_extra/acquire.py)
- [api/records/2667329/files/](<https://zenodo.org/api/records/2667329/files/>) · [download_minds.py](../scripts/download_minds.py)
- [Notação de glosas](<https://zenodo.org/records/15399589>) · [glosas-texto.md](../docs/glosas-texto.md)
- [Apoema-Libras](<https://zenodo.org/records/20421823>) · [sinais-independentes.md](../docs/sinais-independentes.md)
- [Release v4, CC BY-NC 4.0](<https://zenodo.org/records/21398895>) · [dados-glosas.md](../docs/dados-glosas.md) · [dados.md](../docs/dados.md)
- [Licença CC BY-NC 4.0](<https://zenodo.org/records/21398895/files/LICENSE.txt?download=1>) · [dados-glosas.md](../docs/dados-glosas.md) · [dados.md](../docs/dados.md)
- [README dos autores](<https://zenodo.org/records/21398895/files/README.md?download=1>) · [dados.md](../docs/dados.md)
- [Versão MINDS-Libras e licença CC BY 4.0](<https://zenodo.org/records/2667329>) · [dados.md](../docs/dados.md) · [roteiro-validacao.md](../docs/roteiro-validacao.md)
