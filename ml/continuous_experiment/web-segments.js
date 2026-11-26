import { openHolistic } from '/src/recognition/holistic.js'
import { closeVideo, offerReport, stageVideo, waitForVideo } from './browser-probe.js'
import { segmentFrames } from '/src/recognition/segmentation.js'

const filename = 'FLN_G1_D1_1entrevista_VIDEO'
const intervalMs = 100
const video = document.querySelector('video')
const status = document.querySelector('#resultado')

async function extract(camera, durationMs) {
  const videoName = filename + camera + '.mp4'
  await waitForVideo(video, 'loadeddata', () => { video.src = '/data/continuous-ufsc/' + videoName })
  if (!(video.duration * 1000 >= durationMs)) throw new Error('O clipe precisa cobrir a janela de avaliação.')
  const { canvas, draw } = stageVideo(video)
  const aspect = canvas.width / canvas.height
  const extractor = await openHolistic()
  const frames = []
  try {
    for (let timestamp = 0; timestamp < durationMs; timestamp += intervalMs) {
      if (timestamp) await waitForVideo(video, 'seeked', () => { video.currentTime = timestamp / 1000 })
      draw()
      frames.push({ aspect, ...extractor.detect(canvas, timestamp) })
      if (timestamp % 5000 === 0) status.textContent = `Câmera ${camera}: ${timestamp / 1000} s`
    }
  } finally {
    extractor.close()
    closeVideo(video)
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
  offerReport(status, 'web-segments.json', window.segmentReport)
} catch (error) {
  window.segmentError = error.stack ?? String(error)
  status.textContent = window.segmentError
}
