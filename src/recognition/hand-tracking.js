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
  let latest
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
    if (!ready || !visible || closed || pending !== undefined) return
    pending = videoCallback ? video.requestVideoFrameCallback(observe) : requestAnimationFrame(observe)
  }

  function observe(now, metadata) {
    pending = undefined
    if (!visible || closed) return
    const mediaTime = metadata?.mediaTime ?? video.currentTime
    const { videoWidth: width, videoHeight: height } = video
    if (video.readyState >= 2 && width && height && mediaTime !== lastMediaTime) {
      lastMediaTime = mediaTime
      latest = { generation, width, height, timestamp: now, mediaTime }
      void sendLatest()
    }
    schedule()
  }

  async function sendLatest() {
    if (closed || !visible || inFlight || !latest) return
    const request = latest
    latest = undefined
    inFlight = request
    let frame
    try {
      if (typeof VideoFrame === 'function') {
        frame = new VideoFrame(video, { timestamp: Math.round(request.timestamp * 1000) })
      } else {
        frame = await createImageBitmap(video)
      }
      if (closed || generation !== request.generation) {
        frame.close()
        inFlight = undefined
        void sendLatest()
        return
      }
      worker.postMessage({ frame, timestamp: request.timestamp }, [frame])
    } catch {
      frame?.close()
      if (closed) return
      inFlight = undefined
      if (generation === request.generation) fail()
      else void sendLatest()
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
        onFrame({ ...data.hands, timestamp: request.mediaTime * 1000, aspect: request.width / request.height })
      }
      void sendLatest()
    }
    schedule()
  }

  return {
    setVisible(next) {
      if (visible === next || closed) return
      visible = next
      generation += 1
      latest = undefined
      cancelPending()
      schedule()
    },
    close,
  }
}
