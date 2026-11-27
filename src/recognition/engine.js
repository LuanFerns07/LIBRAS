import { env, InferenceSession, Tensor } from 'onnxruntime-web/wasm'
import ortWasm from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import ortModule from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url'
import { decide, readModelManifest } from './decision.js'
import { observePalm, observeVerticalTrajectory } from './feedback.js'
import { openHolistic } from './holistic.js'
import { preprocessFrames } from './preprocess.js'
import { segmentFrames } from './segmentation.js'
import { alphabetFeatureCount, letterFeatures } from './alphabet.js'
import { matchMotion, motionVectorSize } from './alphabet-motion.js'
import { createTrajectoryMatcher, trajectorySize } from './alphabet-trajectory.js'

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
  const { version, preprocess, labels, features, threshold, modelSha256, agreementSha256,
    supplement, contrast, worldA, worldQ, imageR, imageY } = await response.json()
  if (version !== 1 || preprocess !== 'hand-wrist-palm-v1' || features !== alphabetFeatureCount ||
      !Array.isArray(labels) || labels.length < 2 || labels.some(label => !/^[A-ZÇ]$/u.test(label)) ||
      new Set(labels).size !== labels.length || !(threshold >= .5 && threshold <= 1) ||
      !/^[a-f0-9]{64}$/u.test(modelSha256) ||
      (agreementSha256 !== undefined && !/^[a-f0-9]{64}$/u.test(agreementSha256))) {
    throw new TypeError('Manifesto do alfabeto incompatível.')
  }
  if (supplement !== undefined && (!supplement || !Array.isArray(supplement.labels) || !supplement.labels.length ||
      new Set(supplement.labels).size !== supplement.labels.length ||
      supplement.labels.some(label => !labels.includes(label)) || !Number.isFinite(supplement.threshold) ||
      !(supplement.threshold > .5 && supplement.threshold <= 1) ||
      !/^[a-f0-9]{64}$/u.test(supplement.modelSha256))) {
    throw new TypeError('Manifesto do complemento de alfabeto incompatível.')
  }
  if (contrast !== undefined && (!contrast || !labels.includes(contrast.from) || !labels.includes(contrast.to) ||
      contrast.from === contrast.to || !Number.isFinite(contrast.threshold) ||
      !(contrast.threshold > .5 && contrast.threshold <= 1) || !/^[a-f0-9]{64}$/u.test(contrast.modelSha256))) {
    throw new TypeError('Manifesto da distinção de letras incompatível.')
  }
  const worldCandidates = ['A', 'Q', 'R']
  const shapes = [
    [worldA, worldCandidates, 'hand-world-wrist-palm-v1', 'alphabet-a-world.onnx'],
    [worldQ, ['Q', 'N'], 'hand-world-wrist-palm-v1', 'alphabet-q-shape.onnx'],
    [imageR, ['U', 'R'], 'hand-wrist-palm-v1', 'alphabet-r-shape.onnx'],
    [imageY, [], 'hand-wrist-palm-v1', 'alphabet-y-shape.onnx'],
  ]
  for (const [shape, letters, reference] of shapes) {
    if (shape !== undefined && (!shape || !agreementSha256 || letters.some(label => !labels.includes(label)) ||
        shape.preprocess !== reference || !Number.isFinite(shape.threshold) ||
        !(shape.threshold >= .5 && shape.threshold <= 1) || !/^[a-f0-9]{64}$/u.test(shape.modelSha256))) {
      throw new TypeError('Manifesto da confirmação de forma do alfabeto incompatível.')
    }
  }
  if (imageR && ((imageR.vetoThreshold !== undefined &&
      (!Number.isFinite(imageR.vetoThreshold) || !(imageR.vetoThreshold > 0 && imageR.vetoThreshold < imageR.threshold))) ||
      (imageR.allowU !== undefined && typeof imageR.allowU !== 'boolean') ||
      (imageR.allowU === false && imageR.vetoThreshold === undefined))) {
    throw new TypeError('Manifesto da confirmação de R incompatível.')
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
  const trajectory = motion?.trajectory
  const trajectoryLabels = ['Ç', 'H', 'K', 'X']
  if (trajectory && (trajectory.version !== 1 || !Array.isArray(trajectory.templates) || !trajectory.limits ||
      Object.keys(trajectory.limits).length !== trajectoryLabels.length ||
      trajectoryLabels.some(label => !trajectory.templates.some(item => item?.label === label) ||
        !Number.isFinite(trajectory.limits[label]) || !(trajectory.limits[label] > 0 && trajectory.limits[label] <= .5)) ||
      trajectory.templates.some(item => !trajectoryLabels.includes(item?.label) ||
        !Array.isArray(item.vector) || item.vector.length !== trajectorySize || !item.vector.every(Number.isFinite)))) {
    throw new TypeError('O modelo de trajetórias do alfabeto está incompatível.')
  }
  const recognizeTrajectory = trajectory ? createTrajectoryMatcher(trajectory) : null
  const legacyLetters = Object.keys(motion?.limits ?? {})
  const motionLetters = trajectory ? [...trajectoryLabels, 'J', 'Z', ...legacyLetters] : legacyLetters
  const [bytes, checkBytes, supplementBytes, contrastBytes, ...shapeBytes] = await Promise.all([
    verifiedBytes('models/alphabet.onnx', modelSha256),
    agreementSha256 ? verifiedBytes('models/alphabet-check.onnx', agreementSha256) : null,
    supplement ? verifiedBytes('models/alphabet-supplement.onnx', supplement.modelSha256) : null,
    contrast ? verifiedBytes('models/alphabet-contrast.onnx', contrast.modelSha256) : null,
    ...shapes.map(([shape, , , filename]) => shape ? verifiedBytes('models/' + filename, shape.modelSha256) : null),
  ])
  const session = await InferenceSession.create(bytes, { executionProviders: ['wasm'] })
  let verifier
  let refiner
  let contrastModel
  const shapeModels = []
  try {
    if (checkBytes) verifier = await InferenceSession.create(checkBytes, { executionProviders: ['wasm'] })
    if (supplementBytes) refiner = await InferenceSession.create(supplementBytes, { executionProviders: ['wasm'] })
    if (contrastBytes) contrastModel = await InferenceSession.create(contrastBytes, { executionProviders: ['wasm'] })
    for (const asset of shapeBytes) {
      shapeModels.push(asset ? await InferenceSession.create(asset, { executionProviders: ['wasm'] }) : null)
    }
  } catch (error) {
    await Promise.allSettled([session.release(), verifier?.release(), refiner?.release(), contrastModel?.release(),
      ...shapeModels.map(model => model?.release())])
    throw error
  }
  const [aModel, qModel, rModel, yModel] = shapeModels
  let pending = Promise.resolve()

  async function letterVote(model, input) {
    const { logits } = await model.run({ hand: input })
    if (logits.data.length !== labels.length || !logits.data.every(Number.isFinite)) {
      throw new TypeError('Saída do modelo de alfabeto incompatível.')
    }
    const best = logits.data.indexOf(Math.max(...logits.data))
    const probability = 1 / logits.data.reduce((sum, value) => sum + Math.exp(value - logits.data[best]), 0)
    return { label: labels[best], accepted: probability >= threshold }
  }

  async function confirmsShape(model, inputs, threshold) {
    const { scores } = await model.run(inputs)
    if (scores?.data.length !== 1 || !scores.data.every(value => value >= 0 && value <= 1)) {
      throw new TypeError('Saída da confirmação de forma incompatível.')
    }
    return scores.data[0] >= threshold
  }

  async function refinedLetter(letter, input) {
    if (contrastModel && letter === contrast.from &&
        await confirmsShape(contrastModel, { hand: input }, contrast.threshold)) return contrast.to
    return letter
  }

  async function confirmsAlternateN(input) {
    for (const model of [session, verifier]) {
      const vote = await letterVote(model, input)
      if (!vote.accepted || vote.label !== 'N') return false
    }
    return true
  }

  return {
    alphabetCatalog: [...new Set([...labels, ...motionLetters, ...(yModel ? ['Y'] : [])])].sort(),
    findMotion: motionLetters.length ? (frames, indexHistory, zDropout) =>
      recognizeTrajectory?.(frames, indexHistory, zDropout) ?? (legacyLetters.length ? matchMotion(frames, motion) : null) : undefined,
    predictLetter(values, alternateValues, worldHand) {
      const input = new Tensor('float32', values, [1, features])
      const run = pending.then(async () => {
        const first = await letterVote(session, input)
        const hasWorld = worldHand?.length === 21
        const checkA = aModel && hasWorld && worldCandidates.includes(first.label)
        const checkQ = qModel && hasWorld && first.label === 'N'
        const second = verifier && (first.accepted || checkA || checkQ) ? await letterVote(verifier, input) : null
        if (first.accepted && (!verifier || second.accepted && second.label === first.label)) {
          if (rModel && first.label === 'R' && imageR.vetoThreshold !== undefined &&
              !await confirmsShape(rModel, { hand: input }, imageR.vetoThreshold)) return null
          if (rModel && first.label === 'U' && imageR.allowU !== false &&
              await confirmsShape(rModel, { hand: input }, imageR.threshold)) return 'R'
          return refinedLetter(first.label, input)
        }
        if (refiner) {
          const { scores } = await refiner.run({ hand: input })
          if (!scores || scores.data.length !== supplement.labels.length ||
              !scores.data.every(value => value >= 0 && value <= 1)) {
            throw new TypeError('Saída do complemento de alfabeto incompatível.')
          }
          const best = scores.data.indexOf(Math.max(...scores.data))
          if (scores.data[best] >= supplement.threshold) return refinedLetter(supplement.labels[best], input)
        }
        const maybeA = checkA && worldCandidates.includes(second.label)
        const maybeQ = checkQ && second.accepted && second.label === 'Q'
        if (maybeA || maybeQ) {
          const world = letterFeatures(worldHand, 1)
          if (world) {
            const inputWorld = { world: new Tensor('float32', world, [1, features]) }
            const confirmed = await confirmsShape(maybeA ? aModel : qModel, inputWorld,
              maybeA ? worldA.threshold : worldQ.threshold)
            if (confirmed) return maybeA ? 'A' : 'Q'
          }
        }
        if (alternateValues && first.accepted && second && first.label === 'N' &&
            ['M', 'N'].includes(second.label)) {
          const alternate = new Tensor('float32', alternateValues, [1, features])
          if (await confirmsAlternateN(alternate)) return 'N'
        }
        return yModel && await confirmsShape(yModel, { hand: input }, imageY.threshold) ? 'Y' : null
      })
      pending = run.catch(() => {})
      return run
    },
    async close() {
      await pending
      await Promise.all([session.release(), verifier?.release(), refiner?.release(), contrastModel?.release(),
        ...shapeModels.map(model => model?.release())])
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
      const opening = import('./continuous.js').then(({ openContinuous }) =>
        openContinuous(localAsset, verifiedBytes, recognize, manifest.labels.slice(1)))
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
