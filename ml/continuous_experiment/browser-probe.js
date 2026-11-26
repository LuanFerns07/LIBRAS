export function waitForVideo(video, event, start) {
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

export function stageVideo(video) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.min(video.videoWidth, 640)
  canvas.height = Math.round(video.videoHeight * canvas.width / video.videoWidth)
  const context = canvas.getContext('2d')
  return { canvas, draw: () => context.drawImage(video, 0, 0, canvas.width, canvas.height) }
}

export function closeVideo(video) {
  video.removeAttribute('src')
  video.load()
}

export function offerReport(status, filename, result) {
  status.textContent = 'Extração concluída. Baixe os resultados locais.'
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([JSON.stringify(result)], { type: 'application/json' }))
  link.download = filename
  link.textContent = 'Baixar resultados'
  document.body.append(link)
}
