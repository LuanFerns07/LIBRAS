export const options = {
  outsideTraining: [
    ['yes', 'Sim'], ['no', 'Não'], ['unknown', 'Ainda não confirmado'],
  ],
  reviewerProfile: [
    ['deaf-fluent', 'Pessoa surda fluente em Libras'],
    ['fluent', 'Pessoa fluente em Libras'],
    ['other', 'Outro perfil'],
  ],
  condition: [
    ['expected', 'Execução esperada'],
    ['intentional-adjustment', 'Ajuste intencional'],
    ['variant', 'Variante de Libras'],
    ['out-of-catalog', 'Sinal fora do catálogo'],
    ['rest', 'Repouso'],
    ['common-gesture', 'Gesto comum'],
    ['no-hand', 'Mãos ausentes'],
    ['outside-frame', 'Perda de enquadramento'],
    ['occlusion', 'Oclusão'],
    ['capture-denied', 'Permissão negada'],
    ['capture-interrupted', 'Captura interrompida'],
  ],
  hand: [
    ['right', 'Direita'], ['left', 'Esquerda'], ['both', 'Ambidestra'],
    ['not-observed', 'Sem observação'],
  ],
  lighting: [
    ['regular', 'Regular'], ['dim', 'Pouca luz'], ['backlit', 'Contraluz'],
  ],
  framing: [
    ['adequate', 'Adequado'], ['partial', 'Parcial'], ['outside', 'Fora do quadro'],
    ['not-observed', 'Sem observação'],
  ],
  flow: [
    ['guided', 'Praticar com ajuda'], ['independent', 'Tentar com menos ajuda'],
    ['free', 'Área livre'],
  ],
  label: [
    ['cinco', 'Cinco'], ['espelho', 'Espelho'], ['amarelo', 'Amarelo'], ['aluno', 'Aluno'],
  ],
  referenceLabel: [
    ['cinco', 'Cinco'], ['espelho', 'Espelho'], ['amarelo', 'Amarelo'], ['aluno', 'Aluno'],
    ['other', 'Sinal fora do catálogo'], ['none', 'Sem sinal observável'],
    ['uncertain', 'Referência incerta'], ['not-observed', 'Sem observação'],
  ],
  referenceParameter: [
    ['palm', 'Orientação da palma'],
    ['trajectory', 'Trajetória do indicador'],
    ['other', 'Outro parâmetro'],
    ['none', 'Execução sem ajuste necessário'],
    ['insufficient', 'Quadro insuficiente para orientar'],
    ['not-observed', 'Sem avaliação da dica'],
  ],
  decision: [
    ['accepted', 'Sinal reconhecido'], ['hint', 'Ajuste sugerido'],
    ['inconclusive', 'Tentativa inconclusiva'], ['capture-error', 'Problema de captura'],
    ['unavailable', 'Reconhecimento indisponível'],
  ],
  shownParameter: [
    ['palm', 'Orientação da palma'], ['trajectory', 'Trajetória do indicador'],
    ['other', 'Outra dica'], ['none', 'Nenhuma dica'],
  ],
  feedbackVerdict: [
    ['appropriate', 'Adequada'], ['inappropriate', 'Inadequada'],
    ['uncertain', 'Incerta'], ['not-assessed', 'Sem avaliação humana'],
  ],
  latencyMethod: [
    ['instrumented', 'Instrumentação do navegador'],
    ['stopwatch', 'Cronometragem manual'],
  ],
  voiceStatus: [
    ['completed', 'Leitura concluída'], ['failed', 'Falha exibida'],
    ['unavailable', 'Voz indisponível'], ['not-run', 'Ouvir ainda não acionado'],
  ],
  audibility: [
    ['intelligible', 'Áudio audível e inteligível'],
    ['unintelligible', 'Áudio audível e ininteligível'],
    ['inaudible', 'Áudio inaudível'],
    ['not-checked', 'Audição não conferida'],
  ],
  editedTextMatch: [
    ['matches', 'Leitura correspondeu ao texto editado'],
    ['differs', 'Leitura divergiu do texto editado'],
    ['uncertain', 'Correspondência incerta'],
    ['not-checked', 'Correspondência não conferida'],
  ],
  checkpointResult: [
    ['pending', 'Pendente'], ['passed', 'Passou na observação'],
    ['failed', 'Falhou na observação'], ['inconclusive', 'Inconclusivo'],
  ],
}

export const checkpoints = [
  ['letter', '1 · Abrir uma letra por teclado e usar os controles do avatar'],
  ['phrase', '2 · Apresentar a frase catalogada'],
  ['name', '3 · Soletrar um nome isolado'],
  ['exercise', '4 · Aceitar um sinal e avaliar uma correção intencional'],
  ['free-voice', '5 · Transcrever dois sinais, editar e ouvir o texto'],
  ['reference', '6 · Abrir um link de Saiba mais e conferir o destino'],
  ['hands-movement', 'Pontos das duas mãos antes, durante e depois de uma tentativa'],
  ['hands-return', 'Retirada e retorno de uma mão no vídeo'],
  ['hands-alignment', 'Alinhamento espelhado ao redimensionar e alternar os pontos'],
  ['alphabet-n', 'N sustentado e sequência M → N → U em Praticar e na Área livre'],
  ['camera-resume', 'Permissão negada, retomada e encerramento da câmera'],
  ['data', 'Privacidade durante o uso da câmera'],
]

const labels = new Set(options.label.map(([id]) => id))
const checkpointIds = new Set(checkpoints.map(([id]) => id))

function choose(value, field, label) {
  if (!options[field].some(([id]) => id === value)) {
    throw new TypeError('Selecione ' + label + '.')
  }
  return value
}

function readText(value, label, maximum = 100) {
  const result = typeof value === 'string' ? value.trim() : ''
  if (!result || result.length > maximum) throw new TypeError('Confira ' + label + '.')
  return result
}

function readMatch(value, rule, label) {
  const result = readText(value, label)
  if (!rule.test(result)) throw new TypeError('Confira ' + label + '.')
  return result
}

function numberInRange(value, minimum, maximum, label, integer = true) {
  if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') {
    throw new TypeError('Preencha ' + label + '.')
  }
  const number = Number(value)
  if (!Number.isFinite(number) || number < minimum || number > maximum || (integer && !Number.isInteger(number))) {
    throw new TypeError('Confira ' + label + '.')
  }
  return number
}

export function createSession(input, now = new Date()) {
  if (input.consent !== true) throw new TypeError('Confirme o consentimento para registrar a sessão.')
  return {
    schema: 'librasia-live-review/v1',
    source: 'live-manual-observation',
    startedAt: now.toISOString(),
    sessionId: readMatch(input.sessionId, /^S\d{2,6}$/u, 'o identificador S seguido de números'),
    participant: {
      id: readMatch(input.participantId, /^P\d{2,6}$/u, 'o identificador P seguido de números'),
      outsideTraining: choose(input.outsideTraining, 'outsideTraining', 'a situação da pessoa em relação ao treino'),
      consent: true,
    },
    reviewer: {
      id: readMatch(input.reviewerId, /^R\d{2,6}$/u, 'o identificador R seguido de números'),
      profile: choose(input.reviewerProfile, 'reviewerProfile', 'o perfil do revisor'),
      independent: choose(input.reviewerIndependent, 'outsideTraining', 'a independência da revisão'),
    },
    version: {
      commit: readMatch(input.commit, /^[a-f0-9]{7,40}$/u, 'o hash do commit'),
      modelSha256: readMatch(input.modelSha256, /^[a-f0-9]{64}$/u, 'o SHA-256 do ONNX'),
      manifestSha256: readMatch(input.manifestSha256, /^[a-f0-9]{64}$/u, 'o SHA-256 do manifesto do modelo'),
      catalog: readText(input.catalog, 'a versão do catálogo'),
      avatar: readText(input.avatar, 'a versão do avatar'),
    },
    environment: {
      system: readText(input.system, 'o sistema'),
      browser: readText(input.browser, 'o navegador e a versão'),
      cpu: readText(input.cpu, 'o processador'),
      gpu: readText(input.gpu, 'a GPU'),
      camera: readText(input.camera, 'o modelo da câmera'),
      cameraWidth: numberInRange(input.cameraWidth, 1, 10000, 'a largura da captura'),
      cameraHeight: numberInRange(input.cameraHeight, 1, 10000, 'a altura da captura'),
      sampleIntervalMs: numberInRange(input.sampleIntervalMs, 1, 10000, 'o intervalo de amostragem'),
    },
    checkpoints: Object.fromEntries(checkpoints.map(([id]) => [id, 'pending'])),
    attempts: [],
  }
}

export function addAttempt(session, input, now = new Date()) {
  const flow = choose(input.flow, 'flow', 'o fluxo')
  const condition = choose(input.condition, 'condition', 'o cenário')
  const decision = choose(input.decision, 'decision', 'o estado exibido pela aplicação')
  const prediction = input.prediction || null
  if ((prediction && !labels.has(prediction)) || (decision === 'accepted') !== Boolean(prediction)) {
    throw new TypeError('Informe a palavra exibida quando o estado for “Sinal reconhecido”.')
  }
  const target = input.target || null
  if (flow === 'free' ? target !== null : !labels.has(target)) {
    throw new TypeError('Informe o sinal escolhido na lição. A área livre não tem sinal escolhido.')
  }
  const shownParameter = choose(input.shownParameter, 'shownParameter', 'o assunto da dica exibida')
  if ((decision === 'hint') !== (shownParameter !== 'none')) {
    throw new TypeError('Confira se o assunto corresponde ao estado de dica exibido.')
  }
  const latency = input.latencyMs == null || input.latencyMs === '' ? null : {
    milliseconds: numberInRange(input.latencyMs, 0, 120000, 'a latência', false),
    method: choose(input.latencyMethod, 'latencyMethod', 'o método de medição de latência'),
  }
  if (!latency && input.latencyMethod) throw new TypeError('Informe o valor medido da latência.')
  const referenceParameter = choose(input.referenceParameter, 'referenceParameter', 'o parâmetro apontado pelo revisor')
  const feedbackVerdict = choose(input.feedbackVerdict, 'feedbackVerdict', 'a avaliação humana da dica')
  if (['appropriate', 'inappropriate'].includes(feedbackVerdict) && referenceParameter === 'not-observed') {
    throw new TypeError('Registre a referência humana antes de avaliar a dica.')
  }
  const voiceStatus = choose(input.voiceStatus, 'voiceStatus', 'o estado de voz exibido')
  const audibility = choose(input.audibility, 'audibility', 'a audibilidade percebida')
  const editedTextMatch = choose(input.editedTextMatch, 'editedTextMatch', 'a correspondência com o texto após edição')
  if (voiceStatus === 'not-run' && audibility !== 'not-checked') {
    throw new TypeError('Confira o estado de voz exibido antes de registrar a audição.')
  }
  if (audibility === 'not-checked' && editedTextMatch !== 'not-checked') {
    throw new TypeError('Confira a audição antes de registrar a correspondência com o texto.')
  }
  if (['matches', 'differs'].includes(editedTextMatch) && audibility !== 'intelligible') {
    throw new TypeError('Registre correspondência ou divergência apenas quando o texto puder ser ouvido e compreendido.')
  }

  const attempt = {
    number: session.attempts.length + 1,
    observedAt: now.toISOString(),
    flow,
    target,
    condition,
    context: {
      dominantHand: choose(input.hand, 'hand', 'a mão dominante'),
      lighting: choose(input.lighting, 'lighting', 'a iluminação'),
      framing: choose(input.framing, 'framing', 'o enquadramento'),
    },
    reference: {
      label: choose(input.referenceLabel, 'referenceLabel', 'a glosa observada pelo revisor'),
      parameter: referenceParameter,
      feedbackVerdict,
    },
    application: { decision, prediction, shownParameter, latency },
    voice: { applicationStatus: voiceStatus, humanAudibility: audibility, editedTextMatch },
  }
  session.attempts.push(attempt)
  return attempt
}

export function setCheckpoint(session, id, value) {
  if (!checkpointIds.has(id)) throw new TypeError('Etapa do roteiro inválida.')
  session.checkpoints[id] = choose(value, 'checkpointResult', 'o resultado da etapa')
}

export function summarize(session) {
  const byCondition = Object.fromEntries(options.condition.map(([id]) => [id, 0]))
  for (const { condition } of session.attempts) byCondition[condition] += 1
  return { attempts: session.attempts.length, byCondition }
}

export function exportMetadata(session, now = new Date()) {
  return JSON.stringify({ ...session, exportedAt: now.toISOString(), summary: summarize(session) }, null, 2) + '\n'
}
