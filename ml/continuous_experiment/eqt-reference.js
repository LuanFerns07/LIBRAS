import { openHolistic } from '/src/recognition/holistic.js'
import { closeVideo, offerReport, stageVideo, waitForVideo } from './browser-probe.js'

const video = document.querySelector('video')
const status = document.querySelector('#resultado')

try {
  await waitForVideo(video, 'loadeddata', () => { video.src = '/data/eqt-v4/IMG_3311.mp4' })
  if (Math.abs(video.duration - 82 / 30) > 0.01) throw new Error('Duração do RGB de referência inesperada.')
  const { canvas, draw } = stageVideo(video)
  const extractor = await openHolistic()
  const frames = []
  try {
    for (let frame = 0; frame < 82; frame += 1) {
      if (frame) await waitForVideo(video, 'seeked', () => { video.currentTime = frame / 30 + .001 })
      draw()
      const { leftHand, rightHand } = extractor.detect(canvas, Math.round(1000 * frame / 30))
      frames.push([leftHand, rightHand].map((hand) => hand.map(({ x, y, z }) => [x, y, z])))
    }
  } finally {
    extractor.close()
    closeVideo(video)
  }
  window.segmentReport = { frames, width: canvas.width, height: canvas.height, fps: 30 }
  offerReport(status, 'eqt-reference-holistic.json', window.segmentReport)
} catch (error) {
  window.segmentError = error.stack ?? String(error)
  status.textContent = window.segmentError
}
