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
