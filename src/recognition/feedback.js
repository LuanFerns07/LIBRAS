import { recognitionCatalog } from '../catalog.js'

const signals = new Map(recognitionCatalog.map(signal => [signal.id, signal]))

function palmFacingCamera(hand, side) {
  const [wrist, index, pinky] = [hand[0], hand[5], hand[17]]
  if (!wrist || !index || !pinky) return null
  const a = [index.x - wrist.x, index.y - wrist.y, index.z - wrist.z]
  const b = [pinky.x - wrist.x, pinky.y - wrist.y, pinky.z - wrist.z]
  const normal = [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
  const length = Math.hypot(...normal)
  if (!Number.isFinite(length) || length < 0.0003) return null
  return (normal[2] / length) * (side === 'right' ? -1 : 1)
}

export function observePalm(frames) {
  const orientation = []
  for (const frame of frames) {
    const side = frame.rightHand.length === 21 && frame.leftHand.length === 0 ? 'right'
      : frame.leftHand.length === 21 && frame.rightHand.length === 0 ? 'left' : null
    if (!side) continue
    const value = palmFacingCamera(frame[`${side}Hand`], side)
    if (value !== null) orientation.push({ side, value })
  }
  if (orientation.length < 4 || orientation.length < frames.length * .65) return 'uncertain'
  // A primeira referência do exercício descreve apenas a execução destra.
  if (orientation.some(point => point.side !== 'right')) return 'uncertain'
  const away = orientation.filter(point => point.value < -.7).length
  const front = orientation.filter(point => point.value > .7).length
  if (away / orientation.length >= .85) return 'away'
  if (front / orientation.length >= .85) return 'front'
  return 'uncertain'
}

export function observeVerticalTrajectory(frames) {
  const heights = []
  for (const frame of frames) {
    const tip = frame.rightHand[8]
    const [nose, leftShoulder, rightShoulder] = [frame.pose[0], frame.pose[11], frame.pose[12]]
    if (!tip || !nose || !leftShoulder || !rightShoulder || frame.leftHand.length) continue
    if ([nose, leftShoulder, rightShoulder].some(point => (point.visibility ?? 1) < .6)) continue
    const aspect = frame.aspect
    const scale = Math.hypot((leftShoulder.x - rightShoulder.x) * aspect, leftShoulder.y - rightShoulder.y)
    if (!(scale >= .04)) continue
    const y = (tip.y - nose.y) / scale
    if (Math.abs(tip.x - nose.x) * aspect <= .5 * scale && y >= -.85 && y <= .45) heights.push(y)
  }
  if (heights.length < 5) return 'uncertain'
  const width = Math.max(2, Math.floor(heights.length / 4))
  const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]
  const displacement = median(heights.slice(-width)) - median(heights.slice(0, width))
  if (displacement < -.18) return 'upward'
  if (displacement > .18) return 'downward'
  return 'uncertain'
}

export function practiceFeedback(result, target, step) {
  if (result.state !== 'accepted') return result
  if (result.id !== target.id) {
    return { state: 'inconclusive', message: 'A tentativa ficou fora do alvo do exercício. Tente mais uma vez.' }
  }
  const adjustment = {
    'signal-cinco': result.palm === 'away',
    'signal-espelho': result.palm === 'front',
    'signal-amarelo': result.trajectory === 'upward',
  }[target.id]
  if (step === 1 && target.hint && adjustment) {
    return { state: 'hint', message: `${target.hint} Dica em revisão.` }
  }
  return { state: 'accepted', message: `${target.label} foi reconhecido.`, id: target.id }
}

export function freeFeedback(result) {
  if (result.state === 'sequence') {
    const words = result.segments.map(freeFeedback).filter(segment => segment.state === 'accepted').map(segment => segment.text)
    const omitted = result.segments.length - words.length
    if (words.length === 0) return { state: 'inconclusive', message: 'Os trechos gravados ficaram fora do catálogo ou com baixa confiança.' }
    const text = omitted === 0 && words.join(' ') === 'cinco espelho' ? 'cinco espelhos' : words.join(' ')
    return {
      state: 'accepted',
      text,
      message: omitted === 0 ? `“${text}” foi acrescentado ao texto.`
        : `“${text}” foi acrescentado ao texto. Trechos inconclusivos: ${omitted}.`,
    }
  }
  if (result.state !== 'accepted') return result
  const signal = signals.get(result.id)
  if (!signal) return { state: 'inconclusive', message: 'O sinal ficou fora do catálogo da área livre.' }
  return { state: 'accepted', id: signal.id, text: signal.text, message: `“${signal.text}” foi acrescentado ao texto.` }
}

export function appendTranscription(previous, result) {
  if (result.state !== 'accepted' || !result.text) return previous
  const separator = previous && !/\s$/u.test(previous) ? ' ' : ''
  return previous + separator + result.text
}
