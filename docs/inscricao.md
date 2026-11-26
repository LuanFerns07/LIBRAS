# Inscrição no Prêmio Inteligência Artificial e Formação Universitária

- **Título** · LibrasIA — Inteligência Artificial para a Democratização do Ensino da Língua Brasileira de Sinais
- **Categoria III** · Soluções Tecnológicas
- **Eixo III** · IA e Inovação Pedagógica
- **Área 5** · Linguagens, Artes e Multidisciplinar
- **Fechamento interno** · 29 de novembro de 2026
- **Prazo do edital** · 30 de novembro de 2026 às 23h59, horário de Brasília. O item 5.2.1 fixa o horário e o Aditivo nº 1 prorroga a data. [Edital](https://catedraldt.virtual.ufc.br/wp-content/uploads/2026/11/edital-premio-catedra-ia-2026.pdf) · [Aditivo](https://ufcinforma.ufc.br/storage/ufc-media/docs/doc-261105-aditivo-premio-catedra-luiza-teodoro.pdf)

## Resumo preliminar para o documento 3

**Integrantes** · Luan Fernandes e Wellington Sales. A equipe deve conferir os nomes completos, o título e a classificação antes da inscrição.

O LibrasIA é uma iniciativa educacional sem fins lucrativos que propõe prática guiada de Língua Brasileira de Sinais em computadores com webcam. Um avatar tridimensional apresenta o alfabeto manual e sinais de um vocabulário limitado. A prática usa pontos corporais extraídos das imagens no dispositivo para reconhecer tentativas isoladas. A saída em texto permanece editável antes da leitura em português brasileiro. O mesmo avatar apresenta sequências catalogadas e soletra nomes. A avaliação distingue o reconhecimento de sinais da qualidade das dicas pedagógicas e prevê partições por pessoa sinalizante, teste de entradas fora da cobertura e medidas de latência. O memorial registra as versões, os resultados efetivamente observados e as limitações da demonstração.

Atualize o resumo depois do aceite. Conte os caracteres de todo o documento 3, incluindo suas identificações. O limite é 1.500 sem espaços.

## Conferência do arquivo único

Use a [checklist da inscrição no roadmap](../ROADMAP_LIBRASIA.md#checklist-da-inscrição) para acompanhar os documentos obrigatórios e a verificação do PDF final. A lista foi conferida no [guia HTML da pasta](<../Guia do Prêmio Cátedra IA.html>), no item 6.1 do edital e no Anexo I. Na Categoria III, a peça obrigatória é o **memorial técnico descritivo**. Use os relatórios de treinamento e testes para preencher os resultados e limitações na [minuta do memorial](memorial.tex).

- Confirmar a instituição ou unidade acadêmica da capa e a pessoa responsável no formulário. Usar os mesmos título, categoria, eixo e área no resumo, anexos e formulário.
- Conferir o memorial de até 20 laudas com a fonte Times New Roman 12, entrelinhas 1,5, margens de 3 cm e texto justificado. Preservar a avaliação cega no memorial quando possível e manter a identificação no documento 3.
- Descrever o uso de IA e registrar as contribuições intelectuais humanas comprováveis, inclusive decisões, análises, revisões e validações que a equipe tiver executado.
- Reunir os documentos legíveis em um PDF de até 40 MB. Se a ferramenta de fusão invalidar assinaturas, reúna primeiro os documentos e assine os campos dos anexos no PDF combinado, preservando as assinaturas anteriores. Confira todas as assinaturas no arquivo final. Documentos pessoais e PDFs assinados devem ficar fora do Git.
- Enviar pelo formulário oficial somente após a conferência do arquivo. O edital não prevê complementação após o envio. [Formulário da UFC](https://docs.google.com/forms/d/e/1FAIpQLSem93yeY1QOBkT1mt5tSGcnIkrqwwj30tpPGj3fGmCO6xYlGQ/viewform?usp=header)

## Separar os modelos oficiais dos anexos

Em Linux, use o PDF original do edital e o utilitário `pdfseparate` do Poppler. O comando preserva as páginas oficiais 16, 17 e 18 como os modelos dos Anexos II, III e IV. Prepare os arquivos em `private/inscricao`, que está fora do Git.

~~~bash
mkdir -p private/inscricao
curl -fLsS 'https://catedraldt.virtual.ufc.br/wp-content/uploads/2026/11/edital-premio-catedra-ia-2026.pdf' \
  -o private/inscricao/edital-1-2026.pdf
pdfseparate -f 16 -l 18 private/inscricao/edital-1-2026.pdf private/inscricao/anexo-pagina-%d.pdf
~~~

## Gerar uma prévia do memorial

Com XeLaTeX e os pacotes indicados no arquivo, execute na raiz:

~~~bash
mkdir -p /tmp/librasia-memorial
xelatex -halt-on-error -output-directory=/tmp/librasia-memorial docs/memorial.tex
pdfinfo /tmp/librasia-memorial/memorial.pdf
pdffonts /tmp/librasia-memorial/memorial.pdf
~~~

A compilação usa Tinos como substituta quando Times New Roman não está instalada. Nesse caso o próprio documento sinaliza que o PDF serve apenas para revisão. Gere o arquivo de inscrição em um ambiente com Times New Roman e confirme a fonte com pdffonts.

## Compilar com Times New Roman no Debian

Se a fonte estiver disponível no Fontconfig, XeLaTeX a escolhe automaticamente. Em um Debian sem a família, o procedimento abaixo usa a distribuição Microsoft TrueType Core Fonts for the Web referenciada pelo instalador Debian. A soma publicada pelo Debian confirma o arquivo antes da extração. O binário funciona como arquivo de origem e não é executado. [Instalador Debian](https://packages.debian.org/trixie/ttf-mscorefonts-installer) · [Código-fonte do instalador](https://sources.debian.org/src/msttcorefonts/3.8.1/update-ms-fonts/)

~~~bash
(
set -eu
librasia_font_dir=$(mktemp -d)
curl -fL https://downloads.sourceforge.net/corefonts/times32.exe -o "$librasia_font_dir/times32.exe"
printf '%s  %s\n' db56595ec6ef5d3de5c24994f001f03b2a13e37cee27bc25c58f6f43e8f807ab "$librasia_font_dir/times32.exe" | sha256sum -c -
7z e -o"$librasia_font_dir/ttf" "$librasia_font_dir/times32.exe" '*.TTF'
cat > "$librasia_font_dir/fonts.conf" <<EOF
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <include>/etc/fonts/fonts.conf</include>
  <dir>$librasia_font_dir/ttf</dir>
</fontconfig>
EOF
mkdir -p /tmp/librasia-memorial
FONTCONFIG_FILE="$librasia_font_dir/fonts.conf" xelatex -halt-on-error -output-directory=/tmp/librasia-memorial docs/memorial.tex
pdffonts /tmp/librasia-memorial/memorial.pdf
)
~~~

Confira a presença de TimesNewRomanPSMT e das variantes usadas. A configuração temporária aplica-se a essa compilação e os arquivos das fontes ficam fora do repositório.
