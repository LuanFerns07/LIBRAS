export const finish = ((automatic, endAtMediaMs) => new Promise(resolve => {
  const status = document.querySelector('[data-capture-status]')
  const video = document.querySelector('video')
  let start
  let endMs
  let pending
  const observer = new MutationObserver(() => {
    if (['busy', 'recording'].includes(status.dataset.state)) return
    observer.disconnect()
    if (pending !== undefined) video.cancelVideoFrameCallback(pending)
    const timing = JSON.parse(status.dataset.timing ?? 'null')
    resolve({
      state: status.dataset.state, reason: status.dataset.reason, message: status.textContent, timing, endMs,
      elapsedMs: automatic ? timing?.decisionMs : start === undefined ? null : performance.now() - start,
    })
  })
  observer.observe(status, { attributes: true, attributeFilter: ['data-state'] })
  if (status.dataset.state !== 'recording') {
    observer.disconnect()
    resolve({ state: status.dataset.state, elapsedMs: null, message: status.textContent })
    return
  }
  if (automatic) return
  function conclude(mediaTime) {
    endMs = Math.round(mediaTime * 1000)
    start = performance.now()
    document.querySelector('[data-attempt]').click()
  }
  function checkEnd(_, { mediaTime }) {
    pending = undefined
    if (Math.round(mediaTime * 1000) >= endAtMediaMs) conclude(mediaTime)
    else pending = video.requestVideoFrameCallback(checkEnd)
  }
  if (endAtMediaMs == null) conclude(video.currentTime)
  else pending = video.requestVideoFrameCallback(checkEnd)
})).toString()

export const beginAtMarker = ((offsetMs, waitForMarkerEdge, activeChannels) => new Promise(resolve => {
  const video = document.querySelector('video')
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 2
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  let markerMs
  let seenOutsideMarker = !waitForMarkerEdge
  function checkFrame(_, { mediaTime }) {
    const startMs = Math.round(mediaTime * 1000)
    if (markerMs === undefined) {
      ctx.drawImage(video, 0, 0, 2, 2)
      const [red, green, blue] = ctx.getImageData(0, 0, 1, 1).data
      const isMarker = [red, green, blue].every((value, channel) =>
        activeChannels[channel] ? value > 170 : value < 35)
      if (isMarker && seenOutsideMarker) markerMs = startMs
      if (!isMarker) seenOutsideMarker = true
    }
    if (markerMs !== undefined && startMs - markerMs >= offsetMs) {
      document.querySelector('[data-attempt]').click()
      resolve({ markerMs, startMs })
    } else video.requestVideoFrameCallback(checkFrame)
  }
  video.requestVideoFrameCallback(checkFrame)
})).toString()
