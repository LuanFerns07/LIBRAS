import { InferenceSession, Tensor } from 'onnxruntime-web/wasm'
import { recognitionCatalog } from '../catalog.js'
import { boundaryFeatureCount, boundaryFeatures, decodeBoundaries } from './boundaries.js'
import { createGlossTranslator, glossTranslatorSchema } from './gloss-text.js'

const directory = 'models/continuous/'
const labelById = new Map(recognitionCatalog.map(({ id, text }) => [id, text]))
const sha256 = /^[a-f0-9]{64}$/u

function boundaryManifest(data) {
  const { schemaVersion, preprocess, input, output, modelSha256, sampleMs, durationPriorMs, decoder } = data
  if (schemaVersion !== 1 || preprocess !== 'ufsc-hand-boundary-v1' || sampleMs !== 100 ||
      !sha256.test(modelSha256) || !Number.isFinite(durationPriorMs) || durationPriorMs <= 0 ||
      input?.name !== 'features' || input.dtype !== 'float32' ||
      JSON.stringify(input.shape) !== JSON.stringify(['T', boundaryFeatureCount]) ||
      output?.name !== 'probabilities' || output.dtype !== 'float32' ||
      JSON.stringify(output.shape) !== JSON.stringify(['T', 3]) ||
      JSON.stringify(output.channels) !== JSON.stringify(['activity', 'start', 'end']) ||
      ![1, 2].includes(decoder?.version)) {
    throw new TypeError('Manifesto do detector de fronteiras incompatível.')
  }
  return { modelSha256, sampleMs, durationPriorMs, decoder }
}

export function regularizeBoundaryFrames(frames, step) {
  if (!frames.length) return { frames: [], times: [] }
  const start = frames[0].timestamp
  const end = frames.at(-1).timestamp
  const length = 1 + Math.floor((end - start) / step)
  const times = Array.from({ length }, (_, index) => start + index * step)
  let current = 0
  return {
    times,
    frames: times.map(time => {
      const distance = index => Math.abs(frames[index].timestamp - time)
      while (current + 1 < frames.length && distance(current + 1) < distance(current)) current += 1
      return distance(current) <= step / 2 ? frames[current] : null
    }),
  }
}

export async function continuousResult(intervals, frames, recognize, translate) {
  if (!intervals.length) {
    return { state: 'inconclusive', reason: 'no-boundaries', glosses: [], intervals,
      message: 'Nenhum trecho de sinal foi detectado na tentativa.' }
  }
  const decisions = await Promise.all(intervals.map(({ startMs, endMs }) =>
    recognize(frames.filter(({ timestamp }) => timestamp >= startMs && timestamp < endMs))))
  const glosses = decisions.map(result => result.state === 'accepted' ? labelById.get(result.id) ?? null : null)
  if (glosses.includes(null)) {
    return { state: 'inconclusive', reason: 'partial-sequence', glosses, intervals,
      message: 'Alguns trechos ficaram inconclusivos. Repita a sequência com sinais do catálogo.' }
  }
  const text = translate(glosses).join(' ')
  if (!text) {
    return { state: 'inconclusive', reason: 'no-text', glosses, intervals,
      message: 'A sequência foi detectada, mas ficou sem sugestão de texto.' }
  }
  return { state: 'accepted', glosses, intervals, text,
    message: `“${text}” foi acrescentado como sugestão de texto. Revise antes de ouvir.` }
}

export async function openContinuous(localAsset, verifiedBytes, recognize) {
  async function readJson(file) {
    return (await localAsset(directory + file)).json()
  }
  const [model, gloss] = await Promise.all([
    readJson('boundary-model.json').then(boundaryManifest),
    readJson('monotone-web.manifest.json'),
  ])
  if (gloss.schema !== glossTranslatorSchema || gloss.artifact !== 'monotone-web.json' ||
      !sha256.test(gloss.sha256)) {
    throw new TypeError('Manifesto do tradutor de glosas incompatível.')
  }
  const [onnx, glossBytes] = await Promise.all([
    verifiedBytes(directory + 'boundary-model.onnx', model.modelSha256),
    verifiedBytes(directory + 'monotone-web.json', gloss.sha256),
  ])
  const translate = createGlossTranslator(JSON.parse(new TextDecoder().decode(glossBytes)))
  const session = await InferenceSession.create(onnx, { executionProviders: ['wasm'] })
  let working = Promise.resolve()

  async function analyze(frames) {
    const samples = regularizeBoundaryFrames(frames, model.sampleMs)
    const length = samples.times.length
    if (length < 2) return continuousResult([], frames, recognize, translate)

    const input = new Tensor('float32', boundaryFeatures(samples.frames), [length, boundaryFeatureCount])
    const { probabilities } = await session.run({ features: input })
    const intervals = decodeBoundaries(samples.times, probabilities.data, model.durationPriorMs, model.decoder)
    return continuousResult(intervals, frames, recognize, translate)
  }

  return {
    recognize(frames) {
      const run = working.then(() => analyze(frames))
      working = run.catch(() => {})
      return run
    },
    async close() {
      await working
      await session.release()
    },
  }
}
