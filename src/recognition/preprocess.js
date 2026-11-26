export const preprocessId = 'holistic-shoulders-v1'
export const sequenceLength = 24
export const featureCount = 192

const validPoint = point => point && [point.x, point.y, point.z].every(Number.isFinite)
const validPose = point => validPoint(point) && (point.visibility ?? 1) >= .5 && (point.presence ?? 1) >= .5
const poseIndexes = [11, 12, 13, 14, 15, 16]

function shoulderReference(pose, aspect) {
  const left = pose[11]
  const right = pose[12]
  if (!validPose(left) || !validPose(right)) return null
  const scale = Math.hypot((right.x - left.x) * aspect, right.y - left.y)
  if (scale < .04) return null
  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
    z: (left.z + right.z) / 2,
    scale,
  }
}

function writeFrame(values, offset, frame, reference) {
  if (!reference) return
  const aspect = frame.aspect
  const { x, y, z, scale } = reference

  function write(point, depth) {
    if (point) {
      values[offset] = (point.x - x) * aspect / scale
      values[offset + 1] = (point.y - y) / scale
      values[offset + 2] = depth * aspect / scale
      values[offset + 3] = 1
    }
    offset += 4
  }

  for (const index of poseIndexes) {
    const point = frame.pose[index]
    if (validPose(point)) write(point, point.z - z)
    else write(null)
  }
  for (const [hand, wristIndex] of [[frame.leftHand, 15], [frame.rightHand, 16]]) {
    const wrist = hand[0]
    const poseWrist = frame.pose[wristIndex]
    const wristDepth = validPose(poseWrist) ? poseWrist.z - z : 0
    for (let index = 0; index < 21; index += 1) {
      const point = hand[index]
      if (validPoint(point) && validPoint(wrist)) write(point, point.z - wrist.z + wristDepth)
      else write(null)
    }
  }
}

export function preprocessFrames(frames) {
  let previous = -Infinity
  const withReference = frames.map(frame => {
    if (!Number.isFinite(frame.timestamp) || frame.timestamp <= previous ||
        !Number.isFinite(frame.aspect) || frame.aspect <= 0) {
      throw new TypeError('Quadro inválido para o pré-processamento Holistic.')
    }
    previous = frame.timestamp
    const reference = shoulderReference(frame.pose, frame.aspect)
    const hasHand = [frame.leftHand, frame.rightHand].some(hand => hand.length === 21 && validPoint(hand[0]))
    return { frame, reference, valid: !!reference && hasHand }
  })
  const start = withReference.findIndex(point => point.valid)
  const end = withReference.findLastIndex(point => point.valid)
  if (start < 0) return { state: 'no-hand' }

  const window = withReference.slice(start, end + 1)
  const valid = window.filter(point => point.valid).length
  if (valid < 5 || valid / window.length < .55) return { state: 'insufficient' }

  const startTime = window[0].frame.timestamp
  const duration = window.at(-1).frame.timestamp - startTime
  const values = new Float32Array(sequenceLength * featureCount)
  let cursor = 0
  for (let index = 0; index < sequenceLength; index += 1) {
    const time = startTime + duration * index / (sequenceLength - 1)
    const distance = ({ frame }) => Math.abs(frame.timestamp - time)
    while (cursor < window.length - 1 && distance(window[cursor + 1]) < distance(window[cursor])) cursor += 1
    const entry = window[cursor]
    if (distance(entry) <= 150) writeFrame(values, index * featureCount, entry.frame, entry.reference)
  }
  return { state: 'ready', values }
}
