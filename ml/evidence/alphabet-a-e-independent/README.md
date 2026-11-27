# Letra A da UFSM com a mão ampliada

Os dois classificadores da compilação `759a671` recusaram A nos 11 quadros da janela anotada em todos os oito cenários. O Hand Landmarker retornou pontos para a mão que sinaliza nos 11 quadros de todos os cenários. No quadro inteiro, detectou também a mão em repouso. A separação vertical entre as mãos permitiu aplicar a mesma regra de escolha da mão superior do leitor do app.

| Imagem do ensaio | Altura mediana da mão no quadro, 480 / 576 linhas | Top 1 principal | Votos em A aceitos |
| --- | ---: | --- | ---: |
| Quadro inteiro | 13,2% / 13,1% | R em 11/11 nas duas resoluções | 0/11 |
| Recorte com preenchimento, à escala original | 13,2% / 13,1% | R em 11/11 nas duas resoluções | 0/11 |
| Recorte ampliado | 29,4% / 29,2% | R em 11/11 nas duas resoluções | 0/11 |
| Recorte mais fechado | 46,7% / 46,4% | R em 11/11 nas duas resoluções | 0/11 |

O verificador dos recortes mais fechados classificou dez quadros como Q e um como R nas duas resoluções. Um quadro do controle a 480 linhas atingiu o limiar de concordância para R. O recorte ampliado e o arquivo de maior resolução testados não recuperaram A. Como o mesmo sinal foi filmado de um único ângulo, o ensaio distingue ausência de detecção de divergência na classificação dos pontos, sem medir a fidelidade anatômica dos pontos estimados.

## Reprodução

Janela reservada de 3660 a 4370 ms, com âncora em 4100 ms, do vídeo de Giovana Fracari Hautrive e UFSM. Os dois downloads oficiais têm 852 × 480 e 1024 × 576 pixels. O sufixo do segundo arquivo no servidor é `720p.mp4`. Os recortes foram escolhidos pelo enquadramento da mão na âncora, antes da inferência, e são fixos durante a janela. O controle com preenchimento exclui a mão em repouso e preserva o tamanho original da mão ativa em pixels. [Aula da UFSM](https://ntetube.nte.ufsm.br/v/1535641159), [arquivo 480p](https://ntetube.nte.ufsm.br/repositorio/b338729ecef4a7b5b4bbe96728aa7cb8/480p.mp4), [arquivo de maior resolução](https://ntetube.nte.ufsm.br/repositorio/b338729ecef4a7b5b4bbe96728aa7cb8/720p.mp4), [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

Para reproduzir, use a cópia dos arquivos `commit.txt`, `alphabet.json`, `alphabet.onnx`, `alphabet-check.onnx` e `hand_landmarker.task` da compilação indicada e os dois MP4 locais. O script verifica os hashes, usa o extrator a cada 65 ms e executa os ONNX com o provedor CPU. Os resultados são escores por quadro e não incluem a etapa de votos ao vivo, a trajetória ou a câmera virtual.

```bash
PYTHONPATH=. python ml/evidence/alphabet-a-e-independent/diagnose_crop.py \
  --videos data/alphabet/ufsm \
  --assets .cache/alphabet-a-e-independent \
  --out data/evidence/alphabet-a-e-independent
```

O arquivo [ufsm-a-crop.json](ufsm-a-crop.json) registra as versões, os hashes e os resultados agregados de `summary.json`. `diagnosis.json` e os vídeos derivados são saídas locais.
