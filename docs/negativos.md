# Negativos reais fora do MINDS-Libras

Este teste exploratório usa trechos de atividades do *Complex and Long Activities Dataset* (CLAD), depositado pela University of Leeds. A licença CC BY 4.0 está explícita no depósito para os vídeos e as anotações. Os autores gravaram atores executando tarefas com uma câmera Kinect 2 estática. O registro vincula cada tomada aos IDs de ator. [Depósito e licença](https://archive.researchdata.leeds.ac.uk/254/) · [Método dos autores](https://arxiv.org/html/1709.03456)

Os doze recortes e a identificação das três pessoas de teste foram definidos antes da inferência. As duas pessoas restantes ficam reservadas para eventual desenvolvimento. As tomadas de teste têm um único ID nas anotações oficiais. Cenas futuras de desenvolvimento precisam conter apenas os IDs 4 ou 5. Cada pessoa de teste contribui com dois clipes de repouso e dois de movimentos cotidianos. Repouso corresponde a pausas sentadas com mãos apoiadas, juntas ou mantendo um objeto em posição aproximadamente estável. Os clipes em movimento incluem manusear um pote, escrever, servir cereal, beber e digitar. A triagem visual conferiu a postura e o contexto do intervalo de 4 segundos. As marcações temporais referem-se aos MP4s compactados da fonte depositada. [Protocolo e proveniência por clipe](../ml/external_eval/clad.json)

O pré-processamento recorta espacialmente para 416 × 352 em região comum às tomadas, mantém a ordem temporal e remove o áudio. O protocolo exige clipes sem sobreposição, checa duração e SHA-256, e rejeita tomadas com IDs diferentes do manifestado. Os arquivos recortados e os pontos inferidos ficam em `data/external-negative`. A inferência usa o extrator e pré-processamento compartilhados com o aplicativo e os arquivos ONNX congelados. As métricas registram tanto os totais de clipes como as tentativas com rastreamento utilizável.

## Reprodução

Execute após instalar o aplicativo e as dependências de avaliação descritas no [treinamento](avaliacao.md). O preparo usa FFmpeg e FFprobe.

```bash
python3 -m ml.external_eval.prepare
node ml/extract.mjs --manifest data/external-negative/manifest.json \
  --out data/external-negative/features --workers 2
PYTHONPATH=ml .venv/bin/python -m ml.external_eval.evaluate
PYTHONPATH=ml .venv/bin/python -m unittest ml.external_eval.test_external_eval
```

A amostra é agrupada por ator e foi produzida em um único tipo de ambiente e câmera. A taxa de falsas aceitações nestes clipes descreve o recorte. O aceite da demonstração exige também entradas negativas de pessoas independentes em webcam, com controle de enquadramento, oclusão e iluminação, além do teste de sinais suportados.

TAYYUB, Jawad; HAWASLY, Majd; COHN, Anthony G. *Complex and Long Activities Dataset*. University of Leeds, 2017. Foram feitos recortes espaciais e temporais dos MP4s e removidas as trilhas de áudio. [Dataset](https://doi.org/10.5518/249) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
