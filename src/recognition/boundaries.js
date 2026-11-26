const handSides = ['leftHand', 'rightHand']
const axes = ['x', 'y', 'z']
const landmarkCount = 21
const handSize = landmarkCount * axes.length
const motionOffset = handSize * handSides.length
const wristOffset = motionOffset * 2
const presenceOffset = wristOffset + axes.length * handSides.length
export const boundaryFeatureCount = presenceOffset + handSides.length

function readHand(hand) {
  if (hand?.length !== landmarkCount) return null
  const coordinates = new Float32Array(handSize)
  for (const [index, point] of hand.entries()) {
    for (const [axis, name] of axes.entries()) {
      const value = point?.[name]
      if (!Number.isFinite(value)) return null
      coordinates[index * axes.length + axis] = value
    }
  }
  return coordinates.every(Number.isFinite) ? coordinates : null
}

function median(values) {
  values.sort((left, right) => left - right)
  const middle = Math.floor(values.length / 2)
  return values.length % 2 === 1
    ? values[middle]
    : Math.fround(Math.fround(values[middle - 1] + values[middle]) / 2)
}

function palmWidth(hand) {
  // O NumPy calcula a norma das coordenadas da mão em float32.
  const x = Math.fround(hand[5 * axes.length] - hand[17 * axes.length])
  const y = Math.fround(hand[5 * axes.length + 1] - hand[17 * axes.length + 1])
  const squaredLength = Math.fround(Math.fround(x * x) + Math.fround(y * y))
  return Math.max(Math.fround(.015), Math.fround(Math.sqrt(squaredLength)))
}

// Vetor [T, 260]. Cada grupo guarda primeiro a mão esquerda e depois a direita.
export function boundaryFeatures(frames) {
  const features = new Float32Array(frames.length * boundaryFeatureCount)
  for (const [side, name] of handSides.entries()) {
    const series = frames.map(frame => readHand(frame?.[name]))
    const detected = series.filter(Boolean)
    if (!detected.length) continue
    const center = axes.map((_, axis) => median(detected.map(hand => hand[axis])))
    for (const [index, hand] of series.entries()) {
      if (!hand) continue
      const offset = index * boundaryFeatureCount
      const handOffset = side * handSize
      const previous = series[index - 1]
      const width = palmWidth(hand)
      for (let coordinate = 0; coordinate < handSize; coordinate += 1) {
        const wrist = hand[coordinate % axes.length]
        features[offset + handOffset + coordinate] = Math.fround(hand[coordinate] - wrist) / width
        if (previous) {
          features[offset + motionOffset + handOffset + coordinate] =
            Math.fround(hand[coordinate] - previous[coordinate]) / width
        }
      }
      for (let axis = 0; axis < axes.length; axis += 1) {
        features[offset + wristOffset + side * axes.length + axis] = Math.fround(hand[axis] - center[axis]) * 4
      }
      features[offset + presenceOffset + side] = 1
    }
  }
  return features
}

function roundHalfEven(value) {
  const lower = Math.floor(value)
  return value - lower === .5 ? lower + lower % 2 : Math.round(value)
}

// Probabilidades em Float32Array [T, 3], na ordem de atividade, início e fim. Tempos em milissegundos.
export function decodeBoundaries(times, probabilities, durationPrior, config) {
  const count = times.length
  if (count < 2 || probabilities.length !== count * 3 || !probabilities.every(Number.isFinite)) {
    throw new TypeError('Cada quadro precisa de probabilidades finitas de atividade, início e fim.')
  }
  const { version, maxDurationMs, activityFloor, boundaryWeight, proposalPenalty, durationWeight } = config
  if (version !== 1 || ![maxDurationMs, durationPrior, activityFloor, boundaryWeight, proposalPenalty, durationWeight]
    .every(Number.isFinite) || maxDurationMs <= 0 || durationPrior <= 0) {
    throw new TypeError('Configuração inválida para decodificar fronteiras.')
  }
  const step = times[1] - times[0]
  const endTime = times[count - 1] + step
  if (!(step > 0) || !Number.isFinite(endTime)) throw new TypeError('Grade temporal inválida para fronteiras.')
  for (let index = 1; index < count; index += 1) {
    const gap = times[index] - times[index - 1]
    if (!Number.isFinite(gap) || Math.abs(gap - step) > step * 1e-6) {
      throw new TypeError('Grade temporal irregular para fronteiras.')
    }
  }

  const occupancy = new Float64Array(count + 1)
  const best = new Float64Array(count + 1)
  const starts = new Int32Array(count + 1).fill(-1)
  const maxLength = Math.min(count, Math.max(3, roundHalfEven(maxDurationMs / step)))
  const durationCosts = new Float64Array(maxLength + 1)
  for (let length = 1; length <= maxLength; length += 1) {
    durationCosts[length] = durationWeight * Math.abs(Math.log(length * step / durationPrior))
  }
  for (let end = 1; end <= count; end += 1) {
    occupancy[end] = occupancy[end - 1] + probabilities[(end - 1) * 3]
    best[end] = best[end - 1]
    const endProbability = probabilities[Math.min(end, count - 1) * 3 + 2]
    for (let length = 1; length <= Math.min(end, maxLength); length += 1) {
      const start = end - length
      // A combinação das fronteiras usa float32 antes da soma com a atividade em float64.
      const edges = Math.fround(probabilities[start * 3 + 1] + endProbability)
      const edgeScore = Math.fround(Math.fround(boundaryWeight) * edges)
      const activity = (occupancy[end] - occupancy[start]) / length
      const weight = activity - activityFloor + edgeScore - proposalPenalty - durationCosts[length]
      const score = best[start] + weight
      if (score > best[end]) {
        best[end] = score
        starts[end] = start
      }
    }
  }

  const intervals = []
  let end = count
  while (end > 0) {
    const start = starts[end]
    if (start < 0) {
      end -= 1
      continue
    }
    intervals.push({ startMs: times[start], endMs: end === count ? endTime : times[end] })
    end = start
  }
  return intervals.reverse()
}
