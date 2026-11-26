# Segmentação supervisionada de fronteiras em Libras

Este ensaio técnico local avalia se anotações temporais existentes ajudam a separar sinais contíguos. Ele usa gravações de entrevistas contínuas e mantém os dois vídeos já avaliados da dupla G1 D1 fora de todas as partições. Os modelos ficam no ambiente local de desenvolvimento.

## Proveniência e condições de uso

Quadros, Schmitt, Lohn e Leite, *Corpus de Libras*, UFSC, 2020. Os recortes correspondem à câmera individual 3 de nove entrevistas do Inventário Nacional de Libras da Grande Florianópolis. Usamos a trilha `2SinaisD`, mão direita da segunda pessoa, de acordo com a convenção de posicionamento e transcrição. Os arquivos ELAN públicos customizados apontam para o nome da câmera de cada recorte. O manifesto de aquisição guarda os identificadores do acervo, as URLs e os hashes da versão EAF e do recorte inicial de vídeo sem áudio. [Acervo e entrevistas](https://corpuslibras.ufsc.br/dados/dado/porprojeto/Invent%C3%A1rio%20Libras) · [Citação do acervo](https://corpuslibras.ufsc.br/espacointerativo/perguntas/view/9) · [Manual de transcrição da UFSC](https://corpuslibras.ufsc.br/publicacoes/download?link=2019+TUTORIAL_CORPUS+transcric%CC%A7a%CC%83o-15835183035e62925f439b03.92987599.pdf) · [Documentação das câmeras](https://uplopen.com/chapters/4860/files/3d9b9750-29db-4a0a-ae97-ebe106dd3d59.pdf)

O portal publica o termo de consentimento para participação no Inventário e permite baixar os materiais públicos. Para uso em pesquisa, a orientação do Corpus é encaminhar o projeto ao comitê de ética informando a origem pública. A equipe deve conferir essa condição antes de usar formalmente estes resultados em pesquisa ou submissão. Os MP4, arquivos ELAN, landmarks e pesos permanecem no diretório local `data/`. [Consentimento do Inventário](https://corpuslibras.ufsc.br/informacoesdoprojeto?lang=ptbr) · [Orientação de uso do Corpus](https://corpuslibras.ufsc.br/espacointerativo/perguntas/view/6) · [Acesso às gravações e às transcrições](https://corpuslibras.ufsc.br/espacointerativo/perguntas/view/7)

## Protocolo

O recorte corresponde aos primeiros 60 s a partir do início de cada vídeo. As entrevistas de uma mesma dupla ficam na mesma partição. Os identificadores públicos atribuídos às pessoas não aparecem em duas partições. O corte foi fixado no manifesto antes de extrair as coordenadas ou ajustar o modelo.

| Partição | Duplas | Entradas do acervo |
| --- | --- | --- |
| Treino | G1 D2 e G1 D3 | 415, 414, 330, 331 |
| Validação | G1 D4 | 361, 362 |
| Teste | G1 D5 e G1 D6 | 460, 459, 462 |

O MediaPipe Hand Landmarker v1 lê um quadro a cada 100 ms, com largura máxima de 480 px e uso de CPU. A rede recebe posições relativas da mão e do pulso, variações entre quadros e presença de cada mão. Uma Conv1D estima atividade, início e fim do sinal. A decodificação escolhe intervalos disjuntos combinando atividade no trecho, evidência nas duas bordas e uma penalidade de duração. Essa penalidade usa a mediana das anotações do treino.

O treinamento usa BCE ponderada, AdamW e seleção de episódio pelo menor erro de validação. A regra de decodificação e o método de comparação por movimento são ajustados nas duas gravações de validação, com critério F1 para IoU ≥ 0,50. Ambos recebem a mesma extração no teste. A medição associa cada proposta a no máximo um intervalo de referência. A comparação atual mede fronteiras da trilha de mão direita. As glosas servem de referência temporal.

## Reprodução

No ambiente que já executa o treino do LibrasIA, instale `mediapipe==0.10.32` e `opencv-contrib-python==4.12.0.88` para a extração CPU. Tenha `ffmpeg` e `ffprobe` disponíveis. O modelo Hand Landmarker float16 v1 é o mesmo usado na avaliação temporal anterior. [Hand Landmarker v1](https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task)

```bash
python -m ml.continuous_experiment.boundaries.acquire data/ufsc-boundaries
python -m ml.continuous_experiment.boundaries.extract data/ufsc-boundaries data/continuous-ufsc/hand_landmarker.task
python -m ml.continuous_experiment.boundaries.train data/ufsc-boundaries
python -m unittest discover -s ml/continuous_experiment/boundaries/tests -v
```

Se o servidor de vídeo estiver omitindo intermediários HTTPS, a opção `--ca-bundle` aceita uma cadeia local de emissão verificada. Para esta execução, a cadeia acrescentou YR2 e Root YR assinado por X1, obtidos na Let's Encrypt, à lista de certificados do sistema. A verificação HTTPS ficou ativa. [Cadeias de confiança Let's Encrypt](https://letsencrypt.org/certificates/)
