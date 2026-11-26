# Tomadas adicionais de Espelho e Amarelo

O diretório central dos sete ZIPs de treino do MINDS-Libras RGB v1 contém cinco tomadas Canon de Espelho e cinco de Amarelo por pessoa. Os 70 membros dessa seleção têm pares distintos de tamanho e CRC32. As tomadas 1 a 3 coincidem com o [manifesto expandido](../ml/manifests/minds-expanded-v1.json). As tomadas 4 e 5 haviam ficado fora desse recorte. O inventário cobriu somente as pessoas 01 a 07. [Depósito oficial do MINDS-Libras](https://doi.org/10.5281/zenodo.2667329)

Nos sete ZIPs, a única pasta com MP4s é Canon. O protocolo de coleta descreve o uso da Canon e do Kinect v2 durante as mesmas gravações. A divisão das rodadas continua sendo por pessoa. O número da tomada permite identificar a mesma execução entre sensores. [Tese do MINDS-Libras, capítulo 3](https://repositorio.ufmg.br/server/api/core/bitstreams/4307a8e9-f22e-4374-a900-0f42d88974a8/content)

Fixamos a quarta tomada de cada glosa para cada pessoa, totalizando 14 vídeos autênticos. As novas tomadas entram somente no treino, quando a pessoa pertence ao treino da rodada. A quinta tomada permanece fora da aquisição e do ajuste. O recorte amplia as repetições disponíveis das mesmas sete pessoas. [Inventário, CRCs e seleção fixada](../ml/minds_extra/inventory.json) · [Licença CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Reprodução local

O script lê os 512 KiB finais de cada ZIP com HTTP Range, verifica o tamanho informado no depósito e registra o SHA-256 da faixa recebida. O checksum publicado para o ZIP inteiro consta como metadado. Antes da aquisição, o inventário atual precisa coincidir com o inventário versionado. Para cada vídeo baixado, o leitor confere nome, tamanho, CRC32 e SHA-256 e rejeita conteúdo já presente no treino.

```bash
python3 -m ml.minds_extra.acquire inventory
cmp data/minds-extra/inventory.json ml/minds_extra/inventory.json
python3 -m ml.minds_extra.acquire download
node ml/extract.mjs --manifest data/minds-extra/manifest.json \
  --out data/minds-extra/features --workers 1
python3 -m unittest ml.minds_extra.test_acquire
```

O campo `recording: 4` identifica a tomada de cada clipe. Os vídeos e os pontos do Holistic ficam em `data/minds-extra`, fora do histórico do Git.

## Extração registrada

As 14 tomadas produziram vetores utilizáveis, sete de cada glosa. A extração usou a receita `15c372f09ab235e71d9634c2b8d9a8962d67b670d66743c360fa69e244a19391`, igual à do MINDS expandido. Cada tomada tem um SHA-256 distinto dos clipes já usados no treino.

- Inventário ZIP `99b41190827f328134176dfe7c2f0f0e1d2e284fe8d01fdca89c6f6c4d2ecb04`
- Manifesto dos 14 vídeos `5362676cdecf2d519f5a8f31ee924124940bd0a2fea4cd95e35877905249bc64`
- Índice dos vetores `18fb8a64a7778d893026f6ef40d5a2ac84b280e38828615d534e473101a3699d`
