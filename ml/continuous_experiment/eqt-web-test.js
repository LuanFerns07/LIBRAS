import { env, InferenceSession, Tensor } from 'onnxruntime-web/wasm'
import ortWasm from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import ortModule from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url'
import { openHolistic } from '/src/recognition/holistic.js'
import { closeVideo, offerReport, stageVideo, waitForVideo } from './browser-probe.js'

const base = '/data/eqt-v4/'
const samplesPath = base + 'web-test/'
const graphs = base + 'onnx/'
const strideMs = 100
const framesPerClip = 64
const dimensions = 126
const status = document.querySelector('#resultado')
const video = document.querySelector('video')

async function fetchJson(path) {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`Arquivo local indisponível: ${path}`)
  return response.json()
}

function flattenHands(leftHand, rightHand) {
  const coords = new Float32Array(dimensions)
  for (const [side, hand] of [leftHand, rightHand].entries()) {
    for (const [joint, { x, y, z }] of hand.entries()) {
      coords.set([x, y, z], side * 63 + joint * 3)
    }
  }
  return coords
}

async function extract(filename) {
  if (!/^\d{2}\.mp4$/.test(filename)) throw new Error('Nome esperado no manifesto local.')
  await waitForVideo(video, 'loadeddata', () => { video.src = samplesPath + filename })
  if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('Duração do clipe inválida.')
  const { canvas, draw } = stageVideo(video)
  const extractor = await openHolistic()
  const frames = []
  let detected = 0
  try {
    for (let timestamp = 0; timestamp < video.duration * 1000; timestamp += strideMs) {
      if (timestamp) await waitForVideo(video, 'seeked', () => { video.currentTime = timestamp / 1000 })
      draw()
      const { leftHand, rightHand } = extractor.detect(canvas, timestamp)
      if (leftHand.length || rightHand.length) detected += 1
      frames.push(flattenHands(leftHand, rightHand))
    }
  } finally {
    extractor.close()
    closeVideo(video)
  }
  const data = new Float32Array(dimensions * framesPerClip)
  for (let index = 0; index < framesPerClip; index += 1) {
    const src = index * (frames.length - 1) / (framesPerClip - 1)
    const floor = Math.floor(src)
    const nearest = src - floor === 0.5 ? floor + floor % 2 : Math.round(src)
    for (let channel = 0; channel < dimensions; channel += 1) {
      data[channel * framesPerClip + index] = frames[nearest][channel]
    }
  }
  return { features: data, sampled: frames.length, detected }
}

async function predict(encoder, decoder, vocabulary, features) {
  const input = new Tensor('float32', features, [1, dimensions, framesPerClip])
  const { memory, keys, hidden } = await encoder.run({ features: input })
  let tokenId = vocabulary.bos
  let state = hidden
  const generated = []
  for (let step = 0; step < vocabulary.maximum; step += 1) {
    const token = new Tensor('int64', BigInt64Array.of(BigInt(tokenId)), [1, 1])
    const { logits, next_hidden: next } = await decoder.run({ token, memory, keys, hidden: state })
    tokenId = 2
    for (let index = 3; index < logits.data.length; index += 1) {
      if (logits.data[index] > logits.data[tokenId]) tokenId = index
    }
    generated.push(tokenId)
    if (tokenId === vocabulary.eos) break
    state = next
  }
  return generated
}

try {
  env.wasm.numThreads = 1
  env.wasm.wasmPaths = {
    wasm: new URL(ortWasm, location.href).href,
    mjs: new URL(ortModule, location.href).href,
  }
  const [samples, original, vocabulary] = await Promise.all([
    fetchJson(samplesPath + 'samples.json'),
    fetchJson(graphs + 'parity-fixture.json'),
    fetchJson(graphs + 'vocabulary.json'),
  ])
  if (samples.length !== original.length || samples.length !== 12) throw new Error('Recorte divergente.')
  const options = { executionProviders: ['wasm'] }
  const encoder = await InferenceSession.create(graphs + 'encoder.onnx', options)
  let decoder
  try {
    decoder = await InferenceSession.create(graphs + 'decoder.onnx', options)
    const results = []
    for (const [index, { video: filename, landmark_sha256: digest }] of samples.entries()) {
      if (digest !== original[index].landmark_sha256) throw new Error('Landmark de referência divergente.')
      status.textContent = `Extraindo gravação ${index + 1} de ${samples.length}…`
      const { features, sampled, detected } = await extract(filename)
      const reference = await predict(encoder, decoder, vocabulary, Float32Array.from(original[index].features))
      if (JSON.stringify(reference) !== JSON.stringify(original[index].tokens)) {
        throw new Error('A predição com landmarks originais divergiu do teste de paridade.')
      }
      const browser = await predict(encoder, decoder, vocabulary, features)
      results.push({ digest, filename, sampled, detected, original_tokens: reference, holistic_tokens: browser })
    }
    window.segmentReport = {
      interval_ms: strideMs,
      runtime: env.versions.web,
      browser: navigator.userAgent,
      samples: results,
    }
    offerReport(status, 'eqt-web-predictions.json', window.segmentReport)
  } finally {
    await decoder?.release()
    await encoder.release()
  }
} catch (error) {
  window.segmentError = error.stack ?? String(error)
  status.textContent = window.segmentError
}
