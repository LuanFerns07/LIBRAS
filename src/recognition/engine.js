import { env, InferenceSession, Tensor } from 'onnxruntime-web/wasm'
import ortWasm from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import ortModule from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url'
import { decide, readModelManifest } from './decision.js'
import { observePalm, observeVerticalTrajectory } from './feedback.js'
import { openHolistic } from './holistic.js'
import { featureCount, preprocessFrames, sequenceLength } from './preprocess.js'
import { segmentFrames } from './segmentation.js'

async function localAsset(path) {
  const response = await fetch(import.meta.env.BASE_URL + path)
  if (!response.ok) throw new Error('O arquivo local do modelo está indisponível.')
  return response
}

export async function openEngine() {
  const manifest = readModelManifest(await (await localAsset('models/isolated.json')).json())
  const bytes = await (await localAsset('models/isolated.onnx')).arrayBuffer()
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    byte => byte.toString(16).padStart(2, '0')).join('')
  if (digest !== manifest.modelSha256) throw new Error('O SHA-256 do classificador diverge do manifesto.')

  env.wasm.numThreads = 1
  env.wasm.wasmPaths = {
    wasm: new URL(ortWasm, location.href).href,
    mjs: new URL(ortModule, location.href).href,
  }
  const session = await InferenceSession.create(new Uint8Array(bytes), { executionProviders: ['wasm'] })
  let extractor
  try {
    extractor = await openHolistic()
  } catch (error) {
    await session.release()
    throw error
  }
  let inference = Promise.resolve()

  function recognize(frames) {
    const processed = preprocessFrames(frames)
    if (processed.state === 'no-hand') {
      return { state: 'inconclusive', message: 'Nenhuma mão com os ombros enquadrados foi rastreada.' }
    }
    if (processed.state === 'insufficient') {
      return { state: 'inconclusive', message: 'Mostre a mão durante toda a tentativa e repita o sinal.' }
    }
    const palm = observePalm(frames)
    const trajectory = observeVerticalTrajectory(frames)
    const input = new Tensor('float32', processed.values, [1, sequenceLength, featureCount])
    const run = inference.then(async () => {
      const { logits } = await session.run({ landmarks: input })
      return { ...decide(logits.data, manifest), palm, trajectory }
    })
    inference = run.catch(() => {})
    return run
  }

  return {
    catalog: manifest.labels.slice(1),
    captureOptions: { intervalMs: 100, limitMs: 4500 },
    detect: extractor.detect,
    recognize,
    recognizeSequence(frames) {
      return Promise.all(segmentFrames(frames).map(recognize)).then(segments => {
        if (segments.length === 0) return { state: 'inconclusive', message: 'Nenhum trecho com mãos enquadradas foi rastreado.' }
        return { state: 'sequence', segments }
      })
    },
    async close() {
      extractor.close()
      await inference
      await session.release()
    },
  }
}
