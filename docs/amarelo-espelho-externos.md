# Amarelo e Espelho em fontes didáticas externas

## Recorte para Amarelo

A aula 12 do Curso de Libras da UFF e do Consórcio Cederj apresenta as cores em sequência, com o nome de cada sinal na tela. O roteiro é creditado a Mariana da Cunha Teixeira de Souza e a atuação a Vanessa Rodrigues Ildefonso e Cíntia Ingrid Macedo Ribeiro. A publicação no canal oficial da Fundação Cecierj declara licença de atribuição Creative Commons no campo **Licença** do vídeo. O arquivo analisado é a versão MP4 publicada no portal da Fundação para a mesma aula. O protocolo guarda seu SHA-256 e usa a licença CC BY 3.0 indicada para os vídeos publicados com essa opção na data de publicação. [Aula e MP4 no portal oficial](https://canal.cecierj.edu.br/recurso/13766) · [Publicação com licença da Fundação Cecierj](https://www.youtube.com/watch?v=4NVpij6RvGg) · [Licença CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)

A janela de **118,000 a 119,750 s** contém a apresentação isolada identificada pela legenda *Amarelo*. A mão dominante sobe à região entre a testa e o nariz, com descida visível até perto da boca. Começa após a apresentação de *Cores* e termina antes da transição para *Laranja*. O rosto, os ombros e as mãos estão no quadro. O vídeo original está a 1024 × 576. O recorte temporal mantém a velocidade e remove o áudio. A seleção, os rótulos, os hashes e os limiares dos candidatos foram fixados antes de extrair pontos ou consultar previsões. [Protocolo](../ml/fresh_eval/protocol-moving.json)

A apresentação frontal permite observar um exemplo que se aproxima da descrição de Amarelo no MINDS-Libras. Trata-se de um único exemplo didático, sem atribuição individual a uma das duas atrizes a partir da imagem. O recorte permite registrar a decisão de cada modelo nesse caso, sem estimar revocação ou substituir a avaliação com participantes. [Descrição do sinal no MINDS-Libras, Apêndice B](https://repositorio.ufmg.br/server/api/core/bitstreams/4307a8e9-f22e-4374-a900-0f42d88974a8/content) · [Protocolo de aceite](protocolo-aceite.md)

## Buscas por Espelho

- A aula 5 da mesma Fundação também declara licença de atribuição Creative Commons. O segmento de ambientes da casa apresenta rótulos como *Casa*, *Banheiro*, *Quarto*, *Cozinha*, *Sala*, *Sofá*, *Escada*, *Mesa* e *Cadeira*. A inspeção desse segmento não encontrou uma demonstração rotulada de Espelho. [Aula 5 no portal](https://canal.cecierj.edu.br/recurso/13764) · [Publicação com licença](https://www.youtube.com/watch?v=l4Ltki8yxcQ)
- A aula 25 de Além das Palavras traz o sinal de Espelho em 1:35 e Ed Libras publicou uma demonstração dedicada. As publicações consultadas não exibiram o campo de licença de atribuição Creative Commons. [Além das Palavras](https://www.youtube.com/watch?v=nkHL1MGzatU&t=95s) · [Ed Libras](https://www.youtube.com/watch?v=8p9zau2pb-E)
- O glossário do IFSC e o dicionário Sing Libras têm o verbete. A consulta às páginas públicas não confirmou uma licença para extrair e reutilizar o vídeo desses verbetes. [IFSC](https://moodle4-homol.ifsc.edu.br/mod/glossary/showentry.php?eid=836) · [Sing Libras](https://www.singlibras.com/dicionario/espelho)
- O livro *Língua Brasileira de Sinais (LIBRAS)* inclui Espelho em exercícios. O depósito oferece a edição impressa em PDF, sob CC BY-SA, e não identifica ali uma gravação correspondente com licença verificável. [Livro no eduCAPES, pp. 107–108](https://educapes.capes.gov.br/handle/capes/176804)

## Outros registros de Amarelo

O eduCAPES cataloga o dicionário bilíngue da UFV, incluindo vídeo, sob CC0. O verbete Amarelo aparece indexado com um exemplo em frase, mas a página da UFV retornou HTTP 500 nesta execução e a mídia não pôde ser conferida. Já a aula de cores da USP identifica Amarelo e credita Sylvia Lia, com restrição explícita de download. [Registro UFV no eduCAPES](https://educapes.capes.gov.br/handle/capes/432035?mode=full) · [Verbete UFV](https://sistemas.cead.ufv.br/capes/dicionario/?cadastros=amarelo) · [Aula de cores da USP](https://eaulas.usp.br/portal/Category/video.action?idItem=6547&idVideoVersion=9123)

## Reprodução

Execute na raiz, com FFmpeg, Chromium e as dependências já usadas na avaliação local. Os vídeos, os quadros de conferência e os pontos extraídos ficam sob `data/external-moving-signs`.

```bash
protocolo=ml/fresh_eval/protocol-moving.json
ensaio=data/external-moving-signs
python3 -m ml.fresh_eval.prepare --protocol "$protocolo" --out "$ensaio"
node ml/extract.mjs --manifest "$ensaio/manifest.json" --out "$ensaio/features" --workers 1
PYTHONPATH=ml .venv/bin/python -m ml.fresh_eval.evaluate \
  --protocol "$protocolo" --manifest "$ensaio/manifest.json" \
  --features "$ensaio/features/index.json" --out "$ensaio/report.json"
```

## Resultado de 27 de novembro de 2026

O extrator Holistic no Chromium 156.0.8078.79 amostrou 18 quadros e aceitou a extração. A avaliação usou os modelos ONNX congelados em CPU. A maior probabilidade excedeu o limiar em ambos os casos e correspondeu à classe de rejeição.

| Modelo | Limiar | Confiança da classe de rejeição | Decisão para o recorte |
| --- | ---: | ---: | --- |
| Combinado `a8e991d9` | 0,525 | 0,5901 | Inconclusiva |
| Janelas parciais `0aae75ca` | 0,600 | 0,9557 | Inconclusiva |

O recorte de Amarelo do Cederj permaneceu inconclusivo nos dois modelos, mesmo com rastreamento disponível e uma trajetória visualmente próxima da referência do MINDS. A consulta não confirmou uma gravação de Espelho com licença e trecho verificáveis para esta avaliação. As decisões registram o comportamento nesse recorte. [Manifesto](../ml/fresh_eval/evidence-moving/manifest.json) · [Resultado por tentativa](../ml/fresh_eval/evidence-moving/report.json)
