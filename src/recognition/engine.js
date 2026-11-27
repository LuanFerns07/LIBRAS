import { env, InferenceSession, Tensor } from 'onnxruntime-web/wasm'
import ortWasm from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import ortModule from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url'
import { decide, readModelManifest } from './decision.js'
import { observePalm, observeVerticalTrajectory } from './feedback.js'
import { openHolistic } from './holistic.js'
import { preprocessFrames } from './preprocess.js'
import { segmentFrames } from './segmentation.js'

async function localAsset(path) {
  const response = await fetch(import.meta.env.BASE_URL + path)
  if (!response.ok) throw new Error('O arquivo local do modelo está indisponível.')
  return response
}

async function verifiedBytes(path, expected) {
  const bytes = await (await localAsset(path)).arrayBuffer()
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    byte => byte.toString(16).padStart(2, '0')).join('')
  if (digest !== expected) throw new Error('O SHA-256 do modelo diverge do manifesto.')
  return new Uint8Array(bytes)
}

export async function openEngine() {
  const manifest = readModelManifest(await (await localAsset('models/isolated.json')).json())
  const bytes = await verifiedBytes('models/isolated.onnx', manifest.modelSha256)

  env.wasm.numThreads = 1
  env.wasm.wasmPaths = {
    wasm: new URL(ortWasm, location.href).href,
    mjs: new URL(ortModule, location.href).href,
  }
  const session = await InferenceSession.create(bytes, { executionProviders: ['wasm'] })
  let extractor
  try {
    extractor = await openHolistic()
  } catch (error) {
    await session.release()
    throw error
  }
  let inference = Promise.resolve()
  let continuous

  function recognize(frames) {
    const processed = preprocessFrames(frames, manifest.preprocess)
    if (processed.state === 'no-hand') {
      return { state: 'inconclusive', reason: 'no-hand', message: 'Mostre a mão e os ombros no quadro para tentar de novo.' }
    }
    if (processed.state === 'insufficient') {
      return { state: 'inconclusive', reason: 'insufficient', message: 'Mostre a mão durante toda a tentativa e repita o sinal.' }
    }
    const palm = observePalm(frames)
    const trajectory = observeVerticalTrajectory(frames)
    const input = new Tensor('float32', processed.values, [1, manifest.frames, manifest.features])
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
    prepareContinuous: import.meta.env.VITE_LIBRASIA_CONTINUO === '1' ? () => {
      if (continuous) return continuous
      const opening = import('./continuous.js').then(({ openContinuous }) => openContinuous(localAsset, verifiedBytes, recognize))
      continuous = opening
      opening.catch(() => {
        if (continuous === opening) continuous = undefined
      })
      return opening
    } : undefined,
    recognizeSequence(frames) {
      return Promise.all(segmentFrames(frames).map(recognize)).then(segments => {
        if (segments.length === 0) return { state: 'inconclusive', message: 'Nenhum trecho com mãos enquadradas foi rastreado.' }
        return { state: 'sequence', segments }
      })
    },
    async close() {
      extractor.close()
      try {
        await continuous?.then(runtime => runtime.close(), () => {})
      } finally {
        await inference
        await session.release()
      }
    },
  }
}
