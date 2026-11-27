import { alphabetFeatureCount, letterFeatures, oneHand } from './alphabet.js'

const steps = 12
const width = alphabetFeatureCount + 2
export const motionVectorSize = steps * width
const wristWeight = .65
const durations = [550, 850, 1150, 1450, 1750]

export function motionVector(frames) {
  const samples = []
  for (const frame of frames) {
    const hand = oneHand(frame)
    const features = letterFeatures(hand, frame.aspect)
    if (!features) continue
    const start = hand[0]
    const middle = hand[9]
    const scale = Math.hypot((middle.x - start.x) * frame.aspect, middle.y - start.y,
      (middle.z - start.z) * frame.aspect)
    if (scale < 1e-4) continue
    samples.push({ features, x: start.x * frame.aspect, y: start.y, scale, time: frame.timestamp })
  }
  if (samples.length < 5 || samples.length < frames.length * .7) return null
  const first = samples[0]
  const duration = samples.at(-1).time - first.time
  if (duration < 300 || samples.some((sample, i) => i > 0 && sample.time - samples[i - 1].time > 240)) return null
  const scales = samples.map(sample => sample.scale).sort((a, b) => a - b)
  const scale = scales[Math.floor(scales.length / 2)]
  const vector = new Float32Array(motionVectorSize)
  let cursor = 0
  for (let i = 0; i < steps; i += 1) {
    const time = first.time + duration * i / (steps - 1)
    while (cursor + 1 < samples.length - 1 && samples[cursor + 1].time < time) cursor += 1
    const a = samples[cursor]
    const b = samples[cursor + 1]
    const fraction = (time - a.time) / (b.time - a.time)
    const offset = i * width
    for (let axis = 0; axis < alphabetFeatureCount; axis += 1) {
      vector[offset + axis] = a.features[axis] + fraction * (b.features[axis] - a.features[axis])
    }
    vector[offset + alphabetFeatureCount] = (a.x + fraction * (b.x - a.x) - first.x) / scale * wristWeight
    vector[offset + alphabetFeatureCount + 1] = (a.y + fraction * (b.y - a.y) - first.y) / scale * wristWeight
  }
  return vector
}

export function motionDistance(left, right) {
  let direct = 0
  let mirror = 0
  for (let index = 0; index < motionVectorSize; index += 1) {
    const axis = index % width
    const weight = axis % 3 === 2 ? .65 : 1
    direct += ((left[index] - right[index]) * weight) ** 2
    mirror += ((left[index] - (axis % 3 === 0 ? -right[index] : right[index])) * weight) ** 2
  }
  return Math.sqrt(Math.min(direct, mirror) / motionVectorSize)
}

export function motionScores(vector, templates) {
  const scores = new Map()
  for (const { label, vector: prototype } of templates) {
    const distance = motionDistance(vector, prototype)
    scores.set(label, Math.min(distance, scores.get(label) ?? Infinity))
  }
  return [...scores].map(([label, distance]) => ({ label, distance })).sort((a, b) => a.distance - b.distance)
}

export function motionAmount(vector) {
  let total = 0
  for (let i = 1; i < steps; i += 1) {
    for (let axis = 0; axis < width; axis += 1) total += (vector[i * width + axis] - vector[axis]) ** 2
  }
  return Math.sqrt(total / ((steps - 1) * width))
}

export function matchMotion(frames, model) {
  const last = frames.at(-1)?.timestamp
  let chosen = null
  for (const duration of durations) {
    const window = frames.filter(frame => frame.timestamp >= last - duration)
    if (last - window[0]?.timestamp < duration * .78) continue
    const vector = motionVector(window)
    if (!vector || motionAmount(vector) < .105) continue
    const [best, second] = motionScores(vector, model.templates)
    const limit = model.limits[best.label]
    if (limit && best.distance <= limit && second.distance - best.distance >= .028 &&
        (!chosen || best.distance < chosen.distance)) chosen = best
  }
  return chosen?.label ?? null
}
