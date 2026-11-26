const cameraMessages = {
  NotAllowedError: 'A câmera foi bloqueada. Permita o acesso nas configurações do navegador e tente novamente.',
  NotFoundError: 'A câmera não foi encontrada. Conecte uma câmera e tente novamente.',
  NotReadableError: 'A câmera está indisponível. Feche outros aplicativos que possam estar usando a câmera.',
}

export function cameraErrorMessage(error) {
  return cameraMessages[error?.name] ?? 'A captura foi interrompida. Ative a câmera novamente.'
}

export function createCamera(video, onStatus, mediaDevices = globalThis.navigator?.mediaDevices) {
  let generation = 0
  let stream = null
  let pending = false
  let disposed = false
  let ended

  function stop() {
    generation += 1
    pending = false
    for (const track of stream?.getTracks() ?? []) {
      track.removeEventListener('ended', ended)
      track.stop()
    }
    stream = null
    video.srcObject = null
  }

  async function start() {
    if (disposed || pending || stream) return false
    if (!mediaDevices?.getUserMedia) {
      onStatus('error', 'A câmera requer um navegador compatível e um endereço HTTPS ou localhost.')
      return false
    }
    const ticket = ++generation
    pending = true
    onStatus('starting', 'Aguardando permissão da câmera.')
    try {
      const next = await mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 30 },
        },
      })
      if (ticket !== generation) {
        for (const track of next.getTracks()) track.stop()
        return false
      }
      stream = next
      ended = () => {
        stop()
        onStatus('error', cameraErrorMessage())
      }
      for (const track of stream.getVideoTracks()) track.addEventListener('ended', ended)
      video.srcObject = stream
      await video.play()
      if (ticket !== generation) return false
      pending = false
      onStatus('ready', 'Câmera ativa.')
      return true
    } catch (error) {
      if (ticket !== generation) return false
      stop()
      onStatus('error', cameraErrorMessage(error))
      return false
    }
  }

  return {
    start,
    stop,
    get active() { return !!stream && !pending },
    dispose() {
      disposed = true
      stop()
    },
  }
}
