import { env, InferenceSession, Tensor } from 'onnxruntime-web/wasm'
import ortWasm from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import ortModule from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url'
import { decide, readModelManifest } from './decision.js'
import { observePalm, observeVerticalTrajectory } from './feedback.js'
import { openHolistic } from './holistic.js'
import { preprocessFrames } from './preprocess.js'
import { segmentFrames } from './segmentation.js'
import { alphabetFeatureCount } from './alphabet.js'
import { matchMotion, motionVectorSize } from './alphabet-motion.js'

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

function configureWasm() {
  env.wasm.numThreads = 1
  env.wasm.wasmPaths = {
    wasm: new URL(ortWasm, location.href).href,
    mjs: new URL(ortModule, location.href).href,
  }
}

export async function openAlphabetEngine() {
  const response = await fetch(import.meta.env.BASE_URL + 'models/alphabet.json')
  if (response.status === 404) return { alphabetCatalog: [], close() {} }
  if (!response.ok) throw new Error('O modelo de alfabeto está indisponível.')
  const { version, preprocess, labels, features, threshold, modelSha256, agreementSha256 } = await response.json()
  if (version !== 1 || preprocess !== 'hand-wrist-palm-v1' || features !== alphabetFeatureCount ||
      !Array.isArray(labels) || labels.length < 2 || labels.some(label => !/^[A-ZÇ]$/u.test(label)) ||
      new Set(labels).size !== labels.length || !(threshold >= .5 && threshold <= 1) ||
      !/^[a-f0-9]{64}$/u.test(modelSha256) ||
      (agreementSha256 !== undefined && !/^[a-f0-9]{64}$/u.test(agreementSha256))) {
    throw new TypeError('Manifesto do alfabeto incompatível.')
  }
  configureWasm()
  const motionResponse = await fetch(import.meta.env.BASE_URL + 'models/alphabet-motion.json')
  const motion = motionResponse.ok ? await motionResponse.json() : null
  if (motion && (motion.version !== 1 || !Array.isArray(motion.templates) || motion.templates.length < 2 ||
      new Set(motion.templates.map(item => item.label)).size < 2 ||
      !motion.templates.every(item => typeof item.label === 'string' && item.vector?.length === motionVectorSize &&
        item.vector.every(Number.isFinite)) || !motion.limits ||
      Object.entries(motion.limits).some(([label, limit]) => !/^[A-ZÇ]$/u.test(label) ||
        !Number.isFinite(limit) || limit <= 0 || limit > .4))) {
    throw new TypeError('O modelo de letras com movimento está incompatível.')
  }
  const bytes = await verifiedBytes('models/alphabet.onnx', modelSha256)
  const checkBytes = agreementSha256 ? await verifiedBytes('models/alphabet-check.onnx', agreementSha256) : null
  const session = await InferenceSession.create(bytes, { executionProviders: ['wasm'] })
  let verifier
  try {
    if (checkBytes) verifier = await InferenceSession.create(checkBytes, { executionProviders: ['wasm'] })
  } catch (error) {
    await session.release()
    throw error
  }
  let pending = Promise.resolve()

  async function predictedLetter(model, input) {
    const { logits } = await model.run({ hand: input })
    if (logits.data.length !== labels.length || !logits.data.every(Number.isFinite)) {
      throw new TypeError('Saída do modelo de alfabeto incompatível.')
    }
    const best = logits.data.indexOf(Math.max(...logits.data))
    const probability = 1 / logits.data.reduce((sum, value) => sum + Math.exp(value - logits.data[best]), 0)
    return probability >= threshold ? labels[best] : null
  }

  return {
    alphabetCatalog: [...new Set([...labels, ...Object.keys(motion?.limits ?? {})])].sort(),
    findMotion: motion && Object.keys(motion.limits).length ? frames => matchMotion(frames, motion) : undefined,
    predictLetter(values) {
      const input = new Tensor('float32', values, [1, features])
      const run = pending.then(async () => {
        const letter = await predictedLetter(session, input)
        return letter && verifier && await predictedLetter(verifier, input) !== letter ? null : letter
      })
      pending = run.catch(() => {})
      return run
    },
    async close() {
      await pending
      await verifier?.release()
      await session.release()
    },
  }
}

export async function openEngine() {
  const manifest = readModelManifest(await (await localAsset('models/isolated.json')).json())
  const bytes = await verifiedBytes('models/isolated.onnx', manifest.modelSha256)

  configureWasm()
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
