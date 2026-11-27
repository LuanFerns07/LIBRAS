import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { matchMotion, motionScores, motionVector } from '../../src/recognition/alphabet-motion.js'

const [source = 'data/alphabet/motion-frames.json', output = 'data/models/alphabet-motion'] = process.argv.slice(2)
const raw = await readFile(source)
const { samples, manifestSha256, landmarkerSha256 } = JSON.parse(raw)
const training = samples.filter(row => row.split === 'train').map(row => ({
  label: row.label, vector: Array.from(motionVector(row.frames) ?? []),
}))
const validation = samples.filter(row => row.split === 'val').map(row => ({
  label: row.label, vector: Array.from(motionVector(row.frames) ?? []),
}))
if (training.length !== 7 || validation.length !== 7 || [...training, ...validation].some(row => !row.vector.length)) {
  throw new Error('As sete letras precisam de trajetórias de treino e validação.')
}
const limits = {}
for (const row of validation) {
  const [best, next] = motionScores(row.vector, training)
  if (best.label === row.label && next.distance - best.distance >= .028) {
    limits[row.label] = Math.min(.40, best.distance * 1.16 + .02)
  }
}
const candidate = { version: 1, limits, templates: [...training, ...validation],
  source: 'https://ntetube.nte.ufsm.br/', manifestSha256, landmarkerSha256 }
const tests = samples.filter(row => row.split === 'test').map(row => {
  const vector = motionVector(row.frames)
  const prediction = vector ? motionScores(vector, candidate.templates)[0].label : null
  const live = new Map()
  for (let index = 1; index <= row.frames.length; index += 1) {
    const label = matchMotion(row.frames.slice(0, index), candidate)
    if (label) live.set(label, (live.get(label) ?? 0) + 1)
  }
  return { label: row.label, prediction, live: Object.fromEntries(live) }
})
const released = Object.fromEntries(Object.entries(limits).filter(([label]) =>
  tests.some(row => row.label === label && row.live[label] >= 2) &&
  tests.every(row => row.label === label || !row.live[label])))
await mkdir(output, { recursive: true })
await writeFile(join(output, 'alphabet-motion.json'), JSON.stringify({ ...candidate, limits: released }))
await writeFile(join(output, 'motion-evaluation.json'), JSON.stringify({
  featuresSha256: createHash('sha256').update(raw).digest('hex'),
  manifestSha256, landmarkerSha256, limits, released, tests,
}, null, 2) + '\n')
console.log(JSON.stringify({ limits, released, tests }, null, 2))
