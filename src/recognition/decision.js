import { recognitionCatalog } from '../catalog.js'
import { featureCount, preprocessId, sequenceLength } from './preprocess.js'

const signals = new Map(recognitionCatalog.map(({ text, id }) => [text, id]))

export function readModelManifest(data) {
  const { labels, threshold, frames, features, inputName, outputName, preprocess, modelSha256 } = data
  if (!Array.isArray(labels) || labels.length < 2 || labels[0] !== null ||
      new Set(labels).size !== labels.length || !labels.slice(1).every(label => signals.has(label)) ||
      typeof threshold !== 'number' || !(threshold > 0 && threshold <= 1) ||
      frames !== sequenceLength || features !== featureCount || preprocess !== preprocessId ||
      inputName !== 'landmarks' || outputName !== 'logits' || !/^[a-f0-9]{64}$/u.test(modelSha256)) {
    throw new TypeError('Manifesto do classificador incompatível.')
  }
  return { labels, threshold, modelSha256 }
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
