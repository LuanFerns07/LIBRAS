import { openHolistic } from '/src/recognition/holistic.js'
import { preprocessFrames } from '/src/recognition/preprocess.js'

const server = '/__librasia_extract'
const video = document.querySelector('video')
const sampleMs = 100
const maximumWidth = 640
const decodeTimeoutMs = 20000

function waitForVideo(type, change) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error(`Tempo limite para ${type}.`)), decodeTimeoutMs)
    const success = () => finish()
    const failure = () => finish(new Error(`Não foi possível decodificar o vídeo (${video.error?.code}).`))

    function finish(error) {
      clearTimeout(timeout)
      video.removeEventListener(type, success)
      video.removeEventListener('error', failure)
      if (error) reject(error)
      else resolve()
    }

    video.addEventListener(type, success, { once: true })
    video.addEventListener('error', failure, { once: true })
    change()
  })
}

async function openVideo(index) {
  await waitForVideo('loadeddata', () => { video.src = `${server}/video/${index}` })
  if (!Number.isFinite(video.duration) || video.duration <= 0 || !video.videoWidth || !video.videoHeight) {
    throw new Error('Vídeo sem duração ou resolução utilizável.')
  }
}

async function extract(index, preprocess) {
  await openVideo(index)
  const extractor = await openHolistic()
  try {
    const frames = []
    const extractionMs = []
    const canvas = document.createElement('canvas')
    canvas.width = Math.min(video.videoWidth, maximumWidth)
    canvas.height = Math.round(video.videoHeight * canvas.width / video.videoWidth)
    const context = canvas.getContext('2d')
    const aspect = canvas.width / canvas.height
    for (let timestamp = 0; timestamp < video.duration * 1000; timestamp += sampleMs) {
      if (timestamp) await waitForVideo('seeked', () => { video.currentTime = timestamp / 1000 })
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const start = performance.now()
      const { pose, leftHand, rightHand } = extractor.detect(canvas, timestamp)
      extractionMs.push(performance.now() - start)
      frames.push({ timestamp, aspect, pose, leftHand, rightHand })
    }
    const result = preprocessFrames(frames, preprocess)
    return {
      state: result.state,
      values: result.values ? Array.from(result.values) : null,
      extractionMs,
      frameCount: frames.length,
      width: canvas.width,
      height: canvas.height,
      sourceWidth: video.videoWidth,
      sourceHeight: video.videoHeight,
      durationMs: video.duration * 1000,
    }
  } finally {
    extractor.close()
    video.removeAttribute('src')
    video.load()
  }
}

async function post(route, data) {
  const result = await fetch(`${server}/${route}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  })
  if (!result.ok) throw new Error(`Falha ao registrar ${route} (${result.status}).`)
}

let index
try {
  for (;;) {
    const response = await fetch(`${server}/work`, { cache: 'no-store' })
    if (response.status === 204) break
    if (!response.ok) throw new Error(`Falha ao obter o próximo vídeo (${response.status}).`)
    const work = await response.json()
    index = work.index
    await post(`result/${index}`, await extract(index, work.preprocess))
  }
} catch (error) {
  await post('failure', { index, message: String(error?.stack ?? error) })
}
