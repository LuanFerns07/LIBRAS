import { openHolistic } from '/src/recognition/holistic.js'

const video = document.querySelector('video')
const status = document.querySelector('#resultado')

function ready(event, start) {
  return new Promise((resolve, reject) => {
    const deadline = setTimeout(() => finish(new Error(`Tempo limite: ${event}`)), 20000)
    const pass = () => finish()
    const fail = () => finish(new Error(`Vídeo local indisponível (${video.error?.code}).`))

    function finish(error) {
      clearTimeout(deadline)
      video.removeEventListener(event, pass)
      video.removeEventListener('error', fail)
      if (error) reject(error)
      else resolve()
    }

    video.addEventListener(event, pass, { once: true })
    video.addEventListener('error', fail, { once: true })
    start()
  })
}

try {
  await ready('loadeddata', () => { video.src = '/data/eqt-v4/IMG_3311.mp4' })
  if (Math.abs(video.duration - 82 / 30) > 0.01) throw new Error('Duração do RGB de referência inesperada.')
  const canvas = document.createElement('canvas')
  canvas.width = Math.min(video.videoWidth, 640)
  canvas.height = Math.round(video.videoHeight * canvas.width / video.videoWidth)
  const context = canvas.getContext('2d')
  const extractor = await openHolistic()
  const frames = []
  try {
    for (let frame = 0; frame < 82; frame += 1) {
      if (frame) await ready('seeked', () => { video.currentTime = frame / 30 + .001 })
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const { leftHand, rightHand } = extractor.detect(canvas, Math.round(1000 * frame / 30))
      frames.push([leftHand, rightHand].map((hand) => hand.map(({ x, y, z }) => [x, y, z])))
    }
  } finally {
    extractor.close()
    video.removeAttribute('src')
    video.load()
  }
  window.segmentReport = { frames, width: canvas.width, height: canvas.height, fps: 30 }
  status.textContent = 'Extração concluída. Baixe os landmarks para comparação local.'
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([JSON.stringify(window.segmentReport)], { type: 'application/json' }))
  link.download = 'eqt-reference-holistic.json'
  link.textContent = 'Baixar landmarks'
  document.body.append(link)
} catch (error) {
  window.segmentError = error.stack ?? String(error)
  status.textContent = window.segmentError
}
