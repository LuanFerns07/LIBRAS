import { alphabetFeatureCount, alphabetPathGapMs, alphabetZDropoutMs, letterFeatures, oneHand } from './alphabet.js'

const steps = 12
const tips = [4, 8, 12, 16, 20]
const bases = [1, 5, 9, 13, 17]
const pairs = tips.flatMap((tip, index) => tips.slice(index + 1).map(other => [tip, other]))
const channels = [
  [alphabetFeatureCount, .20],
  [3, .01],
  [tips.length * 3, .08],
  [tips.length * 2, .50],
  [pairs.length, .15],
  [3, .06],
]
const width = channels.reduce((total, [count]) => total + count, 0)
export const trajectorySize = steps * width
const durations = [400, 550, 750, 1000, 1300, 1700]

function distance(points, from, to) {
  return Math.hypot(...points[from].map((value, axis) => value - points[to][axis]))
}

export function trajectorySample(frame) {
  const hand = oneHand(frame)
  const pose = letterFeatures(hand, frame.aspect)
  if (!pose || hand.filter(({ x, y }) => x >= 0 && x <= 1 && y >= 0 && y <= 1).length < 18) return null
  const points = hand.map(({ x, y, z }) => [x * frame.aspect, y, z * frame.aspect])
  const scale = Math.max(distance(points, 0, 9), distance(points, 5, 17))
  const lengths = tips.map((tip, index) => distance(points, bases[index], tip) / scale)
  const flexion = tips.map((tip, index) => {
    const base = bases[index]
    const length = distance(points, base, base + 1) + distance(points, base + 1, base + 2) +
      distance(points, base + 2, tip)
    return lengths[index] * scale / Math.max(.001, length)
  })
  const [ax, ay, az] = pose.subarray(15, 18)
  const [bx, by, bz] = pose.subarray(51, 54)
  const normal = [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx]
  const normalLength = Math.max(.001, Math.hypot(...normal))
  return {
    time: frame.timestamp, scale, pose, flexion, lengths, normal: normal.map(value => value / normalLength),
    positions: [points[0], ...tips.map(tip => points[tip])],
    gaps: pairs.map(([a, b]) => distance(points, a, b) / scale),
  }
}

function median(values) {
  values.sort((a, b) => a - b)
  return values[Math.floor(values.length / 2)]
}

function medianScale(samples) {
  return median(samples.map(sample => sample.scale))
}

function thumbProjection({ pose }) {
  const index = pose.subarray(15, 18)
  const little = pose.subarray(51, 54)
  const thumb = pose.subarray(12, 15)
  const axis = Array.from(index, (value, i) => value - little[i])
  const length = Math.hypot(...axis)
  if (length < 1e-4) return 0
  return axis.reduce((sum, value, i) => sum + value * (thumb[i] - index[i]), 0) / length
}

export function describeTrajectory(samples) {
  if (samples.length < 5 || samples.at(-1).time - samples[0].time < 250 ||
      samples.some((sample, index) => index && sample.time - samples[index - 1].time > 220)) return null
  const scale = medianScale(samples)
  const changes = samples.slice(1).map(({ positions }, index) => {
    const previous = samples[index].positions
    const change = positions.map((point, p) => Math.hypot(...point.map((value, axis) => value - previous[p][axis])))
    return (change[0] + change.slice(1).reduce((total, value) => total + value, 0) / tips.length) / (2 * scale)
  })
  const activity = [0]
  for (const [index, change] of changes.entries()) {
    activity.push(activity[index] + change * .5 + ((changes[index - 1] ?? 0) + (changes[index + 1] ?? 0)) * .25)
  }
  const path = activity.at(-1)
  // Preserve a preparação e o final próximos ao trecho com mais movimento.
  const start = Math.max(0, Math.min(samples.length - 5, activity.findIndex(value => value >= path * .17) - 1))
  const end = Math.min(samples.length - 1, Math.max(start + 4, activity.findIndex(value => value >= path * .83) + 1))
  const reference = samples[start].positions
  const values = samples.slice(start, end + 1).map(sample => [
    ...sample.pose.map((value, index) => index % 3 === 2 ? value * .65 : value),
    ...sample.positions.flatMap((point, p) =>
      point.map((value, axis) => (value - reference[p][axis]) / scale * (axis === 2 ? .65 : 1))),
    ...sample.flexion.map(value => value * 2.5),
    ...sample.lengths,
    ...sample.gaps,
    ...sample.normal.map(value => value * .65),
  ])
  const vector = new Float32Array(trajectorySize)
  let cursor = start
  for (let i = 0; i < steps; i += 1) {
    const time = samples[start].time + (samples[end].time - samples[start].time) * i / (steps - 1)
    while (cursor < end - 1 && samples[cursor + 1].time < time) cursor += 1
    const fraction = (time - samples[cursor].time) / (samples[cursor + 1].time - samples[cursor].time)
    const a = values[cursor - start]
    const b = values[cursor + 1 - start]
    for (let axis = 0; axis < width; axis += 1) {
      vector[i * width + axis] = a[axis] + fraction * (b[axis] - a[axis])
    }
  }
  const amount = Math.max(...samples.slice(start, end + 1).map(sample => {
    const change = sample.positions.map((point, p) =>
      Math.hypot(...point.map((value, axis) => (value - reference[p][axis]) / scale)))
    return .5 * (change[0] + change.slice(1).reduce((total, value) => total + value, 0) / tips.length)
  }))
  let indexTravel = 0
  for (let i = start + 1; i <= end; i += 1) {
    const tip = samples[i].positions[2]
    const prior = samples[i - 1].positions[2]
    indexTravel += Math.abs(tip[0] - prior[0]) + Math.abs(tip[1] - prior[1])
  }
  const indexEnd = samples[end].positions[2]
  const indexDisplacement = Math.abs(indexEnd[0] - reference[2][0]) + Math.abs(indexEnd[1] - reference[2][1])
  const indexTurn = (indexTravel - indexDisplacement) / scale
  const activeSamples = samples.slice(start, end + 1)
  const wristY = activeSamples.map(sample => sample.positions[0][1])
  const outerFingers = activeSamples.reduce((sum, sample) => sum + sample.flexion[3] + sample.flexion[4], 0) /
    (2 * activeSamples.length)
  const indexFlexion = activeSamples.map(sample => sample.flexion[1]).sort((a, b) => a - b)
  const indexSeparations = activeSamples.map(sample => Math.max(sample.gaps[0], sample.gaps[4]))
    .sort((a, b) => a - b)
  const indexY = activeSamples.map(sample => sample.positions[2][1])
  const indexX = activeSamples.map(sample => sample.positions[2][0])
  return {
    vector, path, amount, indexTurn,
    indexBend: indexFlexion[Math.floor(indexFlexion.length / 4)],
    indexGap: Math.max(...activeSamples.map(sample => sample.gaps[4])),
    indexSeparation: indexSeparations[Math.floor(indexSeparations.length / 2)],
    middleFinger: activeSamples.reduce((sum, sample) => sum + sample.flexion[2], 0) / activeSamples.length,
    meanIndexFlexion: activeSamples.reduce((sum, sample) => sum + sample.flexion[1], 0) / activeSamples.length,
    indexX: (Math.max(...indexX) - Math.min(...indexX)) / scale,
    indexY: (Math.max(...indexY) - Math.min(...indexY)) / scale,
    outerMotion: (Math.max(...wristY) - Math.min(...wristY)) / scale + outerFingers,
    wristRise: signedDrop(activeSamples.map(sample => [0, -sample.positions[0][1]])) / scale,
  }
}

const weights = channels.flatMap(([count, weight]) => Array(count).fill(weight / count))
const mirroredCoordinates = weights.map((_, index) => {
  // A normal é o produto vetorial de dois vetores da palma. Ao espelhar X, inverta Y e Z da normal.
  if (index >= width - 3) return index !== width - 3
  return index < alphabetFeatureCount + 3 + tips.length * 3 && index % 3 === 0
})

function mirrorTrajectory(vector) {
  return vector.map((value, index) => mirroredCoordinates[index % width] ? -value : value)
}

function trajectoryDistance(left, right) {
  let previous = new Float64Array(steps + 1).fill(Infinity)
  let current = new Float64Array(steps + 1)
  previous[0] = 0
  for (let i = 1; i <= steps; i += 1) {
    current.fill(Infinity)
    for (let j = Math.max(1, i - 2); j <= Math.min(steps, i + 2); j += 1) {
      const from = (i - 1) * width
      const to = (j - 1) * width
      let cost = 0
      for (let axis = 0; axis < width; axis += 1) {
        const change = left[from + axis] - right[to + axis]
        cost += change * change * weights[axis]
      }
      current[j] = cost + Math.min(previous[j - 1], current[j - 1] + .006, previous[j] + .006)
    }
    const row = previous
    previous = current
    current = row
  }
  return Math.sqrt(previous[steps] / steps)
}

function prepareTrajectories(templates) {
  return templates.map(({ label, vector }) => {
    const direct = Float32Array.from(vector)
    return { label, direct, reflected: mirrorTrajectory(direct) }
  })
}

function trajectoryScores(vector, templates) {
  const scores = new Map()
  for (const { label, direct, reflected } of templates) {
    const distance = Math.min(trajectoryDistance(vector, direct), trajectoryDistance(vector, reflected))
    scores.set(label, Math.min(distance, scores.get(label) ?? Infinity))
  }
  return [...scores].map(([label, distance]) => ({ label, distance })).sort((a, b) => a.distance - b.distance)
}

function trajectoryWindows(samples) {
  const last = samples.at(-1)?.time
  return durations.flatMap(duration => {
    const window = samples.filter(sample => sample.time >= last - duration)
    if (last - window[0]?.time < duration * .80) return []
    const description = describeTrajectory(window)
    return description && description.path >= .35 && description.amount >= .13 ? [description] : []
  })
}

function turnsInIndexPath(samples, scale) {
  const origin = samples[0]
  let extreme = origin
  let direction = 0
  const turns = [origin]
  for (const sample of samples.slice(1)) {
    const change = (sample.positions[2][0] - extreme.positions[2][0]) / scale
    if (change * direction > 0) {
      extreme = sample
    } else if (Math.abs(change) >= .50) {
      if (direction) turns.push(extreme)
      direction = Math.sign(change)
      extreme = sample
    }
  }
  turns.push(extreme)
  return turns
}

function continuesZStroke(active, first, second, end, dropout, scale) {
  const [start, finish] = dropout < second.time ? [first, second] : [second, end]
  if (start.time >= dropout || finish.time <= dropout) return false
  const before = active.findLast(sample => sample.time < dropout)
  const after = active.find(sample => sample.time > dropout)
  if (!before || !after || after.time - before.time > alphabetZDropoutMs) return false
  const approach = (before.positions[2][0] - start.positions[2][0]) / scale
  const continuation = (after.positions[2][0] - before.positions[2][0]) / scale
  return Math.abs(approach) >= .50 && Math.sign(approach) * continuation >= .50
}

function tracesZ(samples, dropout) {
  if (samples.length < 7 || samples.at(-1).time - samples[0].time < 370 ||
      samples.some((sample, index) => index && sample.time - samples[index - 1].time > alphabetPathGapMs)) return false
  const scale = medianScale(samples)
  if (samples.filter(sample => sample.flexion[1] >= .85).length < samples.length * .75) return false
  // O indicador percorre três traços alternados. O trecho intermediário desce na imagem.
  const turns = turnsInIndexPath(samples, scale)
  for (let i = 3; i < turns.length; i += 1) {
    const [start, first, second, end] = turns.slice(i - 3, i + 1)
    const descent = (end.positions[2][1] - start.positions[2][1]) / scale
    const diagonal = (second.positions[2][1] - first.positions[2][1]) / scale
    if (descent < .55 || diagonal < .28) continue
    const active = samples.filter(({ time }) => time >= start.time && time <= end.time)
    if (dropout !== null && start.time < dropout &&
        !continuesZStroke(active, first, second, end, dropout, scale)) continue
    // Azul pode ter o mesmo percurso do indicador com o polegar aberto.
    if (median(active.map(thumbProjection)) <= .20) return true
  }
  return false
}

function signedDrop(points) {
  let first = Infinity
  let drop = 0
  for (const point of points) {
    first = Math.min(first, point[1])
    drop = Math.max(drop, point[1] - first)
  }
  return drop
}

function tracesJ(samples) {
  if (samples.length < 6 || samples.at(-1).time - samples[0].time < 330 ||
      samples.some((sample, index) => index && sample.time - samples[index - 1].time > alphabetPathGapMs)) return false
  const scale = medianScale(samples)
  const little = samples.map(sample => sample.positions[5])
  const littleX = little.map(point => point[0])
  const drop = signedDrop(little)
  const indexDrop = signedDrop(samples.map(sample => sample.positions[2]))
  const looksLikeJ = samples.filter(sample =>
    sample.flexion[4] >= .82 && sample.flexion[1] <= .95 && sample.gaps[3] <= 1.65)
  return drop >= .63 * scale && drop >= 1.18 * indexDrop &&
    Math.max(...littleX) - Math.min(...littleX) >= .35 * scale && looksLikeJ.length >= samples.length * .65
}

function isCompatibleTrajectory(label, description) {
  if (label === 'Ç') return description.indexTurn >= .18 && description.path >= .82
  if (label === 'H') return description.outerMotion <= 1.13
  if (label === 'K') return description.outerMotion >= .93 && description.path >= .52 && description.wristRise >= .18
  if (label === 'X') return description.indexSeparation >= .55 && description.indexTurn <= 2.3 &&
    (description.indexX <= 1.25 || description.indexBend < .78) &&
    (description.meanIndexFlexion < .97 || description.indexY >= Math.max(.30, 1.5 * description.indexX)) &&
    ((description.indexBend <= .93 && description.indexGap >= .56) ||
      (description.meanIndexFlexion >= .72 && description.middleFinger <= .62))
  return false
}

export function createTrajectoryMatcher(model) {
  const templates = prepareTrajectories(model.templates)
  const pathDurations = [500, 750, 1050, 1350, 1700]
  const followsPath = (samples, trace, time) => pathDurations.some(duration =>
    trace(samples.filter(sample => sample.time >= time - duration)))
  return (frames, indexHistory = frames, zDropout = null) => {
    const path = indexHistory.map(trajectorySample).filter(Boolean)
    const time = frames.at(-1)?.timestamp
    if (!path.length || path.at(-1).time !== time) return null
    if (followsPath(path, samples => tracesZ(samples, zDropout), time)) return 'Z'
    const samples = frames === indexHistory ? path : path.filter(sample => sample.time >= frames[0].timestamp)
    if (followsPath(samples, tracesJ, time)) return 'J'
    let match = null
    for (const description of trajectoryWindows(samples)) {
      const scores = trajectoryScores(description.vector, templates)
      const [best, next] = scores
      const limit = model.limits[best.label]
      if (limit && best.distance <= limit && next.distance - best.distance >= .018 &&
          isCompatibleTrajectory(best.label, description) && (!match || best.distance < match.distance)) match = best
    }
    return match?.label ?? null
  }
}
