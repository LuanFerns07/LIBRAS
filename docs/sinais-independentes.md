# Sinais positivos em videoaulas externas

Recorte exploratório em fontes institucionais que registraram material didático em Libras e declararam condições abertas de uso. As fontes, os intervalos, os rótulos e os três modelos foram congelados antes de extrair pontos ou consultar previsões. Os vídeos da UFSM e Fiocruz são externos ao MINDS-Libras, com apresentadores de materiais institucionais distintos. A comparação por pessoa limita-se aos apresentadores desse recorte e à proveniência dos materiais. Os IDs locais organizam a análise e os registros originais do MINDS usam IDs anônimos.

| Fonte | Apresentação | Rótulo e intervalo | Uso |
| --- | --- | --- | --- |
| [Números, Programa Libras ON e Núcleo de Acessibilidade, UFSM](https://ntetube.nte.ufsm.br/v/1527001532) | Libras ON. Câmera e edição Matheus Fighera. Produção Ronaldo Palma. | Cinco cardinal, 11,500–12,430 s. O vídeo identifica o numeral com legenda e corta a cabeça no enquadramento desse trecho. | CC BY-NC-SA 4.0 indicada pelo NTE Tube. |
| [Números Cardinais, Campus Virtual Fiocruz](https://mooc.campusvirtual.fiocruz.br/rea/acessibilidade-sus/modulo_6_video_3.html) | Professor Thiago Cardoso Alves. Curso Acessibilidade e os Princípios do SUS, Grupo de Trabalho sobre Acessibilidade do Icict/Fiocruz. | Cinco cardinal, 61,000–64,550 s. Algarismo 5 em tela e configuração manual estabilizada, sem os numerais adjacentes. Cabeça e ombros visíveis. | CC BY-NC-SA estampada diretamente na abertura e na página do curso. |
| [Cores, NTE/UFSM](https://ntetube.nte.ufsm.br/v/1536678082) | Grupo de Produção de Material Didático em Língua de Sinais. Câmera e edição Matheus Fighera. Câmera Julien Moretto. Produção Ronaldo Palma. | Amarelo, 36,000–38,350 s. Rótulo em tela. A articulação junto à bochecha e o movimento lateral registram a variante apresentada pelo grupo. | CC BY-NC-SA 4.0 indicada pelo NTE Tube. |

As predições usam os limiares fixados anteriormente. Cada tentativa vale um acerto somente se o modelo aceitar o rótulo esperado. Troca de rótulo, ausência de rastreamento, baixa confiança ou classe rejeitada contam no total de tentativas da glosa e ficam discriminadas. Uma glosa ausente do catálogo aparece como cobertura indisponível. A análise informa contagens por glosa e por apresentador, com três casos no total. Os recortes têm durações diferentes por causa das transições das aulas. O protocolo verifica SHA-256 dos vídeos originais e das três versões do modelo. [Protocolo fixado](../ml/fresh_eval/protocol.json)

O uso é local e não comercial. O preparo cria recortes temporais e remove o áudio. Vídeos e coordenadas permanecem em `data/fresh-sign`, fora do histórico. [Licença da UFSM](https://creativecommons.org/licenses/by-nc-sa/4.0/) · [Licença e política de reúso do curso Fiocruz](https://mooc.campusvirtual.fiocruz.br/rea/acessibilidade-sus/)

## Reprodução local

Com as dependências de [avaliação](avaliacao.md) instaladas:

```bash
python3 -m ml.fresh_eval.prepare
node ml/extract.mjs --manifest data/fresh-sign/manifest.json --out data/fresh-sign/features --workers 1
PYTHONPATH=ml .venv/bin/python -m ml.fresh_eval.evaluate
PYTHONPATH=ml .venv/bin/python -m unittest ml.fresh_eval.test_fresh_eval
```

A verificação TLS do portal Fiocruz pode exigir o certificado intermediário indicado na extensão AIA do emissor. Nesta execução, foi usado o [intermediário oficial RNP/GlobalSign](https://secure.globalsign.com/cacert/rnpicpedugr46ovtlsca2025.crt), convertido de DER para PEM, verificado pela cadeia de confiança do sistema e combinado ao bundle de CAs local. O parâmetro `--ca-file` aceita o bundle completo. O SHA-256 da mídia ainda deve corresponder à versão fixada.

O recorte não inclui Espelho ou Aluno. As páginas do V-Librasil têm Espelho e Amarelo em metadados, mas a licença de vídeo não pôde ser confirmada no acesso disponível e o índice inspecionado não oferece Cinco nem Aluno isolado. O acervo Apoema-Libras depende de autorização por orientador e o conjunto Captar-Libras usa acesso credenciado. A gravação em webcam com consentimento específico e revisão linguística é uma etapa distinta de validação. [V-Librasil](https://doi.org/10.21227/V589-HN68) · [Apoema-Libras](https://zenodo.org/records/20421823) · [Captar-Libras](https://verlab.github.io/captar-libras/)

## Resultado de 26 de novembro de 2026

Em inspeção visual, o Cinco dos dois materiais apresenta indicador e médio fletidos em V, com a palma frontal no exemplo Fiocruz e mais oblíqua no exemplo UFSM. Isso é compatível com a configuração dos dedos descrita para Cinco na Tabela 17 do MINDS-Libras. O Amarelo da UFSM usa a região da bochecha e o movimento lateral. A descrição do MINDS usa indicador da testa em direção ao nariz. A inspeção distingue essas formas para interpretar o resultado exploratório. [Tese MINDS-Libras, Apêndice B, Tabela 17, pp. 139–140](https://repositorio.ufmg.br/server/api/core/bitstreams/4307a8e9-f22e-4374-a900-0f42d88974a8/content)

A extração usou o Holistic Landmarker do aplicativo no Chromium 156.0.8078.79. A inferência foi executada em ONNX Runtime 1.23.2 CPU, com afinidade a dois cores. O recorte Fiocruz teve rastreamento utilizável e foi aceito como Cinco nos três modelos. A tentativa UFSM de Cinco teve rastreamento insuficiente. A variante de Amarelo teve rastreamento utilizável e os três modelos retornaram a classe de rejeição. As perdas entram no denominador.

| Modelo congelado | Cinco, acertos / tentativas | Confiança na tentativa Fiocruz aceita | Amarelo, acertos / tentativas |
| --- | ---: | ---: | ---: |
| Inicial `52bfe58f` | 1/2 | 0,667 | 0/1 |
| Expandido `fc50063c` | 1/2 | 0,901 | 0/1 |
| Geometria manual `f1bdefcc` | 1/2 | 0,997 | 0/1 |

Os três casos têm diferenças de enquadramento, duração e variante. O resultado registra um reconhecimento do cardinal em uma fonte externa e os dois motivos de perda nas outras tentativas. O número de casos permite documentar essas observações específicas, com revisão linguística e validação em webcam ainda pendentes. O resultado fica separado do teste reservado MINDS, e os modelos permaneceram congelados. [Manifesto executado](../ml/fresh_eval/evidence/manifest.json) · [Relatório por tentativa](../ml/fresh_eval/evidence/report.json)
