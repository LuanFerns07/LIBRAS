# Dados para o ensaio com o nariz

O ensaio parte dos vídeos Canon do MINDS-Libras RGB v1, de Sílvia G. M. Almeida et al. (2019), DOI `10.5281/zenodo.2667329`. O LibrasIA seleciona clipes do recorte expandido e extrai os pontos no Linux. [Depósito no Zenodo](https://doi.org/10.5281/zenodo.2667329) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

Rode na raiz do repositório, com Python 3.11 ou mais recente e o recorte expandido disponível em `data/minds-expanded`. [Origem e composição do recorte expandido](dados.md)

```sh
python3 ml/prepare_face_pairs.py
```

O comando gera três manifestos em `data/minds-expanded/`.

| Manifesto | Pessoas | Clipes |
| --- | --- | ---: |
| `face-train.json` | 01–07 | 120 |
| `face-validation.json` | 08 e 10 | 36 |
| `face-development.json` | 01–08 e 10 | 156 |

O script confere a partição por pessoa, as identidades e a unicidade dos registros, e calcula o SHA-256 de cada vídeo de treino e validação. As pessoas 09, 11 e 12 ficam reservadas para teste, com 51 registros conferidos pelo manifesto. Cada saída mantém a ordem dentro de cada partição e os caminhos `raw/...` relativos à sua pasta. O campo `parentManifestSha256` vincula os arquivos ao manifesto expandido de origem.

Use o recorte de treino para a comparação por pessoa. Para exportar um modelo com o treino e a validação originais, rode a extração com o manifesto de desenvolvimento. Se os dois recortes já foram extraídos com a mesma receita, copie seus arquivos por SHA-256 para a pasta de saída. O extrator confere o cache e gera o índice de desenvolvimento.

```bash
node ml/extract.mjs --manifest data/minds-expanded/face-development.json \
  --out data/minds-expanded/features-nose-development --workers 4 \
  --preprocess holistic-shoulders-nose-v1
```
