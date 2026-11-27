const maxFrameGapMs = 1000

export function createFrameWatchdog(onTimeout) {
  let timer
  return {
    refresh() {
      clearTimeout(timer)
      timer = setTimeout(onTimeout, maxFrameGapMs)
    },
    stop() {
      clearTimeout(timer)
    },
  }
}
