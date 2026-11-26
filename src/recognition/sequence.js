export function captureSequence(video, extractor, {
  intervalMs = 90, limitMs = 4500, limitFrames = 64, onFinish, onError,
}) {
  const hasVideoCallback = typeof video.requestVideoFrameCallback === 'function'
  const frames = []
  const extractionMs = []
  let pending
  let timer
  let lastMediaTime = -Infinity
  let running = true

  function clear() {
    clearTimeout(timer)
    if (pending === undefined) return
    if (hasVideoCallback) video.cancelVideoFrameCallback(pending)
    else cancelAnimationFrame(pending)
  }

  function finish(trigger) {
    if (!running) return
    const finishedAt = performance.now()
    running = false
    clear()
    onFinish(frames.splice(0), { trigger, finishedAt, extractionMs })
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
        extractionMs.push(performance.now() - startedAt)
        frames.push({ ...landmarks, timestamp: mediaTime, aspect: video.videoWidth / video.videoHeight })
      } catch (error) {
        abort()
        onError(error)
        return
      }
      if (frames.length >= limitFrames) {
        finish('frame-limit')
        return
      }
    }
    schedule()
  }

  function schedule() {
    pending = hasVideoCallback ? video.requestVideoFrameCallback(sample) : requestAnimationFrame(sample)
  }

  function abort() {
    running = false
    frames.length = 0
    clear()
  }

  timer = setTimeout(() => finish('time-limit'), limitMs)
  schedule()
  return { finish() { finish('manual') }, abort }
}
