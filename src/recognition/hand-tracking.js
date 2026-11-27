export function trackHands(video, { onFrame, onError }) {
  // O carregador WASM do MediaPipe usa importScripts em um worker clássico.
  const url = new URL(`${import.meta.env.BASE_URL}hand-tracker.worker.js`, location.href)
  const worker = new Worker(url)
  const videoCallback = typeof video.requestVideoFrameCallback === 'function'
  let ready = false
  let visible = true
  let closed = false
  let generation = 0
  let pending
  let inFlight
  let lastMediaTime = -Infinity

  function cancelPending() {
    if (pending === undefined) return
    if (videoCallback) video.cancelVideoFrameCallback(pending)
    else cancelAnimationFrame(pending)
    pending = undefined
  }

  function close() {
    if (closed) return
    closed = true
    cancelPending()
    worker.terminate()
  }

  function fail() {
    if (closed) return
    close()
    onError()
  }

  function schedule() {
    if (!ready || !visible || closed || inFlight || pending !== undefined) return
    pending = videoCallback ? video.requestVideoFrameCallback(sample) : requestAnimationFrame(sample)
  }

  async function sample(now, metadata) {
    pending = undefined
    if (!visible || closed) return
    const mediaTime = metadata?.mediaTime ?? video.currentTime
    const { videoWidth: width, videoHeight: height } = video
    if (video.readyState < 2 || !width || !height || mediaTime === lastMediaTime) {
      schedule()
      return
    }
    lastMediaTime = mediaTime
    const request = { generation, width, height }
    inFlight = request
    let bitmap
    try {
      const scale = Math.min(1, 640 / Math.max(width, height))
      bitmap = scale === 1 ? await createImageBitmap(video) : await createImageBitmap(video, {
        resizeWidth: Math.round(width * scale), resizeHeight: Math.round(height * scale), resizeQuality: 'low',
      })
      if (closed || generation !== request.generation) {
        bitmap.close()
        inFlight = undefined
        schedule()
        return
      }
      worker.postMessage({ bitmap, timestamp: now }, [bitmap])
    } catch {
      bitmap?.close()
      if (closed) return
      inFlight = undefined
      if (generation === request.generation) fail()
      else schedule()
    }
  }

  worker.onerror = fail
  worker.onmessageerror = fail
  worker.onmessage = ({ data }) => {
    if (closed) return
    if (data.type === 'error') {
      fail()
      return
    }
    if (data.type === 'ready') {
      ready = true
    } else if (data.type === 'frame') {
      const request = inFlight
      inFlight = undefined
      if (visible && request?.generation === generation &&
          request.width === video.videoWidth && request.height === video.videoHeight) {
        onFrame(data.hands)
      }
    }
    schedule()
  }

  return {
    setVisible(next) {
      if (visible === next || closed) return
      visible = next
      generation += 1
      cancelPending()
      schedule()
    },
    close,
  }
}
