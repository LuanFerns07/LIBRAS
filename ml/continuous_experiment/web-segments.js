import { openHolistic } from '/src/recognition/holistic.js'
import { segmentFrames } from '/src/recognition/segmentation.js'

const filename = 'FLN_G1_D1_1entrevista_VIDEO'
const intervalMs = 100
const video = document.querySelector('video')
const status = document.querySelector('#resultado')

function waitForVideo(event, start) {
  return new Promise((resolve, reject) => {
    const deadline = setTimeout(() => finish(new Error(`Tempo limite: ${event}`)), 20000)
    const loaded = () => finish()
    const failed = () => finish(new Error(`Vídeo local indisponível (${video.error?.code}).`))

    function finish(error) {
      clearTimeout(deadline)
      video.removeEventListener(event, loaded)
      video.removeEventListener('error', failed)
      if (error) reject(error)
      else resolve()
    }

    video.addEventListener(event, loaded, { once: true })
    video.addEventListener('error', failed, { once: true })
    start()
  })
}

async function extract(camera, durationMs) {
  const videoName = filename + camera + '.mp4'
  await waitForVideo('loadeddata', () => { video.src = '/data/continuous-ufsc/' + videoName })
  if (!(video.duration * 1000 >= durationMs)) throw new Error('O clipe precisa cobrir a janela de avaliação.')
  const canvas = document.createElement('canvas')
  canvas.width = Math.min(video.videoWidth, 640)
  canvas.height = Math.round(video.videoHeight * canvas.width / video.videoWidth)
  const context = canvas.getContext('2d')
  const aspect = canvas.width / canvas.height
  const extractor = await openHolistic()
  const frames = []
  try {
    for (let timestamp = 0; timestamp < durationMs; timestamp += intervalMs) {
      if (timestamp) await waitForVideo('seeked', () => { video.currentTime = timestamp / 1000 })
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      frames.push({ aspect, ...extractor.detect(canvas, timestamp) })
      if (timestamp % 5000 === 0) status.textContent = `Câmera ${camera}: ${timestamp / 1000} s`
    }
  } finally {
    extractor.close()
    video.removeAttribute('src')
    video.load()
  }

  return {
    video: videoName,
    frames: frames.map(({ timestamp, leftHand, rightHand }) => ({
      timestamp,
      hands: [leftHand, rightHand].map((hand) => hand.map(({ x, y }) => [x, y])),
    })),
    intervals: segmentFrames(frames).map((segment) => ({
      start_ms: segment[0].timestamp,
      end_ms: Math.min(durationMs, segment.at(-1).timestamp + intervalMs),
    })),
  }
}

try {
  const seconds = Number(new URLSearchParams(location.search).get('seconds') ?? 60)
  if (!(Number.isInteger(seconds) && seconds > 0 && seconds <= 180)) throw new RangeError('Use 1 a 180 segundos.')
  window.segmentReport = {
    duration_ms: seconds * 1000,
    interval_ms: intervalMs,
    dev: await extract(2, seconds * 1000),
    test: await extract(3, seconds * 1000),
  }
  status.textContent = 'Extração concluída. Baixe os resultados locais.'
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([JSON.stringify(window.segmentReport)], { type: 'application/json' }))
  link.download = 'web-segments.json'
  link.textContent = 'Baixar intervalos e landmarks'
  document.body.append(link)
} catch (error) {
  window.segmentError = error.stack ?? String(error)
  status.textContent = window.segmentError
}
