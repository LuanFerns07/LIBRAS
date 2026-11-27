import { openHolistic } from '/src/recognition/holistic.js'
import { closeVideo, stageVideo, waitForVideo } from '../browser-probe.js'

const video = document.querySelector('video')

function coordinates(hand) {
  if (hand.length !== 21) return null
  const xyz = hand.map(({ x, y, z }) => [x, y, z])
  return xyz.every(point => point.every(Number.isFinite)) ? xyz : null
}

async function extractHands(path, times) {
  let extractor
  try {
    await waitForVideo(video, 'loadeddata', () => { video.src = path })
    if (!Number.isFinite(video.duration) || video.duration * 1000 <= times.at(-1)) {
      throw new Error('O vídeo termina antes do último quadro da grade.')
    }
    const { canvas, draw } = stageVideo(video)
    extractor = await openHolistic()
    const points = []
    for (const timestamp of times) {
      if (timestamp > 0) await waitForVideo(video, 'seeked', () => { video.currentTime = timestamp / 1000 })
      draw()
      const { leftHand, rightHand } = extractor.detect(canvas, timestamp)
      points.push([coordinates(leftHand), coordinates(rightHand)])
    }
    return points
  } finally {
    extractor?.close()
    closeVideo(video)
  }
}

window.startBoundaryExtraction = (path, times) => {
  window.boundaryExtraction = null
  extractHands(path, times).then(
    points => { window.boundaryExtraction = { points, browser: navigator.userAgent } },
    error => { window.boundaryExtraction = { error: error.stack ?? String(error) } },
  )
}
