import { recognitionCatalog } from '../catalog.js'
import { featureCount, preprocessFeatureCounts, preprocessId, sequenceLength } from './preprocess.js'

const signals = new Map(recognitionCatalog.map(({ text, id }) => [text, id]))
const combinedModelSha256 = 'a8e991d9cfedc23a2cf899ed68799c8006682f3306cf6fc0006eacdec1e62f63'
const alunoMinAbsX = Math.fround(.23)
const alunoMinY = Math.fround(-.30)
const alunoMaxY = .50
const alunoMinFrames = 8

export function readModelManifest(data) {
  const { labels, threshold, frames, features, inputName, outputName, preprocess, modelSha256 } = data
  if (!Array.isArray(labels) || labels.length < 2 || labels[0] !== null ||
      new Set(labels).size !== labels.length || !labels.slice(1).every(label => signals.has(label)) ||
      typeof threshold !== 'number' || !(threshold > 0 && threshold <= 1) ||
      frames !== sequenceLength || typeof preprocess !== 'string' || !Object.hasOwn(preprocessFeatureCounts, preprocess) ||
      features !== preprocessFeatureCounts[preprocess] ||
      inputName !== 'landmarks' || outputName !== 'logits' || !/^[a-f0-9]{64}$/u.test(modelSha256)) {
    throw new TypeError('Manifesto do classificador incompatível.')
  }
  return { labels, threshold, frames, features, preprocess, modelSha256 }
}

export function decide(logits, manifest) {
  if (logits.length !== manifest.labels.length || !logits.every(Number.isFinite)) {
    throw new TypeError('Saída do classificador incompatível.')
  }
  let best = 0
  for (let index = 1; index < logits.length; index += 1) {
    if (logits[index] > logits[best]) best = index
  }
  const confidence = 1 / logits.reduce((sum, logit) => sum + Math.exp(logit - logits[best]), 0)
  const label = manifest.labels[best]
  if (confidence < manifest.threshold) {
    return { state: 'inconclusive', reason: 'low-confidence', confidence, message: 'A confiança foi baixa. Centralize a mão e tente de novo.' }
  }
  if (label === null) {
    return { state: 'inconclusive', reason: 'out-of-catalog', confidence, message: 'O sinal parece estar fora do catálogo. Tente um dos sinais disponíveis.' }
  }
  return { state: 'accepted', id: signals.get(label), confidence }
}

export function checkAlunoPosition(result, landmarks, manifest) {
  if (result.id !== 'signal-aluno' || manifest.modelSha256 !== combinedModelSha256 ||
      manifest.preprocess !== preprocessId || manifest.threshold !== .525) return result

  // Cada mão começa no pulso e o ponto 9 é a base do dedo médio.
  const nearShoulder = wrist => landmarks[wrist + 3] === 1 && landmarks[wrist + 9 * 4 + 3] === 1 &&
    Math.abs(landmarks[wrist]) >= alunoMinAbsX &&
    landmarks[wrist + 1] >= alunoMinY && landmarks[wrist + 1] <= alunoMaxY
  let visible = 0
  for (let offset = 0; offset < landmarks.length; offset += featureCount) {
    if ((nearShoulder(offset + 6 * 4) || nearShoulder(offset + 27 * 4)) && ++visible >= alunoMinFrames) return result
  }
  return { state: 'inconclusive', reason: 'uncertain-aluno', confidence: result.confidence,
    message: 'Repita o sinal com a mão e os ombros visíveis.' }
}
