import { createFrameWatchdog } from './frame-watchdog.js'

export function watchLandmarks(video, extractor, { intervalMs = 90, onFrame, onError }) {
  const hasVideoCallback = typeof video.requestVideoFrameCallback === 'function'
  let pending
  let lastMediaTime = -Infinity
  let running = true
  const watchdog = createFrameWatchdog(() => {
    stop()
    onError(new Error('A câmera parou de enviar quadros.'))
  })

  function stop() {
    running = false
    watchdog.stop()
    if (pending === undefined) return
    if (hasVideoCallback) video.cancelVideoFrameCallback(pending)
    else cancelAnimationFrame(pending)
  }

  function sample(now, metadata) {
    pending = undefined
    if (!running) return
    const mediaTime = (metadata?.mediaTime ?? video.currentTime) * 1000
    if (video.readyState >= 2 && mediaTime - lastMediaTime >= intervalMs - 0.5) {
      lastMediaTime = mediaTime
      try {
        const startedAt = performance.now()
        const landmarks = extractor.detect(video, now)
        const elapsed = performance.now() - startedAt
        onFrame({ ...landmarks, timestamp: mediaTime, aspect: video.videoWidth / video.videoHeight }, elapsed)
        if (running) watchdog.refresh()
      } catch (error) {
        stop()
        onError(error)
        return
      }
    }
    if (running) schedule()
  }

  function schedule() {
    pending = hasVideoCallback ? video.requestVideoFrameCallback(sample) : requestAnimationFrame(sample)
  }

  watchdog.refresh()
  schedule()
  return stop
}

export function captureSequence(video, extractor, {
  intervalMs = 90, limitMs = 4500, limitFrames = 64, onFinish, onError,
}) {
  const frames = []
  const extractionMs = []
  let running = true
  function clear() {
    running = false
    clearTimeout(timer)
    stop()
  }
  function finish(trigger) {
    if (!running) return
    const finishedAt = performance.now()
    clear()
    onFinish(frames.splice(0), { trigger, finishedAt, extractionMs })
  }
  function abort() {
    clear()
    frames.length = 0
  }
  const stop = watchLandmarks(video, extractor, {
    intervalMs,
    onFrame(frame, elapsed) {
      extractionMs.push(elapsed)
      frames.push(frame)
      if (frames.length >= limitFrames) finish('frame-limit')
    },
    onError(error) { abort(); onError(error) },
  })
  const timer = setTimeout(() => finish('time-limit'), limitMs)
  return { finish() { finish('manual') }, abort }
}
