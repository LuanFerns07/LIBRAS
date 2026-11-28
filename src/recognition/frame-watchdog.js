const maxFrameGapMs = 1000

export function createFrameWatchdog(onTimeout) {
  let timer
  return {
    refresh(delay = maxFrameGapMs) {
      clearTimeout(timer)
      timer = setTimeout(onTimeout, delay)
    },
    stop() {
      clearTimeout(timer)
    },
  }
}
