# Dados para o ensaio com o nariz

O ensaio parte dos vídeos Canon do MINDS-Libras RGB v1, de Sílvia G. M. Almeida et al. (2019), DOI `10.5281/zenodo.2667329`. O LibrasIA seleciona clipes do recorte expandido e extrai os pontos no Linux. [Depósito no Zenodo](https://doi.org/10.5281/zenodo.2667329) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

Rode na raiz do repositório, com Python 3.11 ou mais recente e o recorte expandido disponível em `data/minds-expanded`. [Origem e composição do recorte expandido](dados.md)

```sh
python3 ml/prepare_face_pairs.py
```

O comando gera dois manifestos em `data/minds-expanded/`.

| Manifesto | Pessoas | Clipes |
| --- | --- | ---: |
| `face-train.json` | 01–07 | 120 |
| `face-validation.json` | 08 e 10 | 36 |

O script confere a partição por pessoa, as identidades e a unicidade dos registros, e calcula o SHA-256 de cada vídeo de treino e validação. As pessoas 09, 11 e 12 ficam reservadas para teste, com 51 registros conferidos apenas pelo manifesto. Cada saída mantém a ordem e os registros originais, com caminhos `raw/...` relativos à sua pasta e o campo `parentManifestSha256` vinculando os arquivos ao manifesto expandido de origem.
