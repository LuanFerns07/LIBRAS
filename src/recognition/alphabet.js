export const alphabetFeatureCount = 63

export function oneHand(frame) {
  const hands = [frame.leftHand, frame.rightHand].filter(hand => hand?.length === 21)
  if (hands.length < 2) return hands[0] ?? null
  const [first, second] = hands
  const separation = first[9].y - second[9].y
  return Math.abs(separation) >= .18 ? hands[separation > 0 ? 1 : 0] : null
}

export function letterFeatures(hand, aspect) {
  if (!hand || !Number.isFinite(aspect) || aspect <= 0) return null
  const values = new Float32Array(alphabetFeatureCount)
  const wrist = hand[0]
  for (const [index, { x, y, z }] of hand.entries()) {
    values.set([(x - wrist.x) * aspect, y - wrist.y, (z - wrist.z) * aspect], index * 3)
  }
  const middle = Math.hypot(...values.slice(27, 30))
  const across = Math.hypot(...values.slice(15, 18).map((value, axis) => value - values[51 + axis]))
  const scale = Math.max(middle, across)
  if (!values.every(Number.isFinite) || scale < 1e-4) return null
  return values.map(value => value / scale)
}

export function createLiveLetterReader(predict, onReading, findMotion) {
  let generation = 0
  let pending = false
  let lastSample = -Infinity
  let lastMotionSample = -Infinity
  let candidate = null
  let votes = 0
  let shown = null
  let movingUntil = -Infinity
  let movingCandidate = null
  let lastFrame = -Infinity
  let history = []

  function show(value) {
    if (shown === value) return
    shown = value
    onReading(value)
  }

  function clear() {
    generation += 1
    candidate = null
    votes = 0
    lastSample = -Infinity
    lastMotionSample = -Infinity
    lastFrame = -Infinity
    movingCandidate = null
    movingUntil = -Infinity
    history = []
    show(null)
  }

  return {
    clear,
    async read(frame) {
      const hand = oneHand(frame)
      if (!hand) {
        clear()
        return
      }
      if (frame.timestamp - lastFrame > 350) clear()
      if (frame.timestamp <= lastFrame) return
      lastFrame = frame.timestamp
      if (findMotion) {
        history = history.filter(previous => previous.timestamp >= frame.timestamp - 1850)
        history.push(frame)
      }
      if (findMotion && frame.timestamp - lastMotionSample >= 60) {
        lastMotionSample = frame.timestamp
        const motion = findMotion(history)
        const confirmed = motion && (motion === movingCandidate || motion === 'J' || motion === 'Z')
        movingCandidate = motion
        if (confirmed) {
          generation += 1
          movingCandidate = null
          candidate = null
          votes = 0
          movingUntil = frame.timestamp + 600
          history = [frame]
          show(motion)
          return
        }
      }
      if (movingCandidate || frame.timestamp < movingUntil || pending || frame.timestamp - lastSample < 75) return
      lastSample = frame.timestamp
      const values = letterFeatures(hand, frame.aspect)
      if (!values) {
        clear()
        return
      }
      const current = generation
      pending = true
      try {
        const label = await predict(values)
        if (current !== generation) return
        if (label !== candidate) {
          candidate = label
          votes = 0
          show(null)
        }
        if (label && ++votes >= 3) show(label)
      } catch {
        if (current === generation) clear()
      } finally {
        pending = false
      }
    },
  }
}
