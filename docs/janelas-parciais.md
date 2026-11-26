# Janelas parciais negativas do MINDS-Libras

O protocolo usa os 42 vídeos fora do catálogo na partição original de treino do manifesto MINDS expandido. São seis vídeos de cada uma das sete pessoas. De cada gravação extraímos os primeiros e os últimos 60% da faixa de vídeo em velocidade original, sem áudio e com a resolução mantida. As duas janelas preservam o identificador da pessoa, a classe de origem e o SHA-256 da gravação. A extração pode classificar o rastreamento como inconclusivo. As janelas permanecem no denominador da avaliação de rejeição. [Manifesto expandido](../ml/manifests/minds-expanded-v1.json) · [MINDS-Libras, CC BY 4.0](https://doi.org/10.5281/zenodo.2667329)

Cada par compartilha a mesma origem. Qualquer partição por pessoa deve levar as duas janelas com a gravação original. Para medir falsas aceitações por gravação, conte cada origem uma vez quando qualquer uma de suas janelas for reconhecida indevidamente. Esse recorte usa apenas dados de desenvolvimento.

## Preparação local

Com os vídeos e o manifesto originais já presentes em `data/minds-expanded`, execute os comandos na raiz do projeto. O FFmpeg recodifica os recortes em H.264 sem redimensionar e confere o tempo de saída dentro da tolerância de um quadro. Os mesmos pesos do Holistic e o mesmo pré-processador web são usados pelo extrator.

```bash
python3 -m ml.partial_eval.prepare
node ml/extract.mjs --manifest data/minds-partial/manifest-negatives.json \
  --out data/minds-partial/features-negative --workers 2
python3 -m unittest ml.partial_eval.test_prepare
```

O manifesto contém o SHA-256 da fonte, o hash das janelas e seu intervalo de origem em milissegundos. Os vídeos, manifestos gerados e pontos corporais ficam em `data/minds-partial`.
