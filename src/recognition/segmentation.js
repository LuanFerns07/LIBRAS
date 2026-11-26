function inSigningSpace(frame) {
  const left = frame.pose[11]
  const right = frame.pose[12]
  if (!left || !right || [left, right].some(point => (point.visibility ?? 1) < .5)) return false
  const scale = Math.hypot((left.x - right.x) * frame.aspect, left.y - right.y)
  if (!(scale >= .04)) return false
  const belowShoulders = (left.y + right.y) / 2 + 1.15 * scale
  return [frame.leftHand, frame.rightHand].some(hand => hand.length === 21 && hand[0].y < belowShoulders)
}

export function segmentFrames(frames) {
  const segments = []
  let start
  let lastActive
  let count = 0

  function finish() {
    if (count >= 5) segments.push(frames.slice(start, lastActive + 1))
    start = undefined
    lastActive = undefined
    count = 0
  }

  for (const [index, frame] of frames.entries()) {
    if (lastActive !== undefined && frame.timestamp - frames[lastActive].timestamp >= 400) finish()
    if (inSigningSpace(frame)) {
      start ??= index
      lastActive = index
      count += 1
    }
  }
  finish()
  return segments
}
