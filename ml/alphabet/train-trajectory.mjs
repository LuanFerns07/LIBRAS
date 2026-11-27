import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createLiveLetterReader } from '../../src/recognition/alphabet.js'
import { matchMotion } from '../../src/recognition/alphabet-motion.js'
import {
  createTrajectoryMatcher, describeTrajectory, trajectorySample,
} from '../../src/recognition/alphabet-trajectory.js'

const [
  ufsm = 'data/alphabet/motion-final.json',
  institutional = 'data/alphabet/institutional/motion-frames.json',
  staticClips = 'data/alphabet/static-video-final.json',
  previousModel = 'data/models/alphabet-motion/alphabet-motion.json',
  output = 'data/models/alphabet-trajectory',
] = process.argv.slice(2)
const limits = { Ç: .153, H: .229, K: .225, X: .378 }
const savedModel = JSON.parse(await readFile(previousModel))
const datasets = await Promise.all([ufsm, institutional, staticClips].map(async file => {
  const bytes = await readFile(file)
  return { ...JSON.parse(bytes), featuresSha256: createHash('sha256').update(bytes).digest('hex') }
}))
if (new Set([...datasets.map(dataset => dataset.landmarkerSha256), savedModel.landmarkerSha256]).size !== 1) {
  throw new Error('Os pontos precisam vir da mesma versão do Hand Landmarker.')
}
if (!savedModel.limits?.Y) throw new Error('O detector de Y precisa estar disponível no modelo anterior.')

const clips = datasets.flatMap(({ samples }) => samples)
const motionClips = datasets.slice(0, 2).flatMap(({ samples }) => samples)
const cuts = [[0, 1], [.15, 1], [0, .85], [.15, .85], [.28, 1]]
const templates = motionClips.filter(clip => clip.split !== 'test' && Object.hasOwn(limits, clip.label))
  .flatMap(clip => {
    const samples = clip.frames.map(trajectorySample).filter(Boolean)
    return cuts.flatMap(([start, end]) => {
      const window = samples.slice(Math.floor(start * samples.length), Math.ceil(end * samples.length))
      const description = describeTrajectory(window)
      return description && description.path > .30 ?
        [{ label: clip.label, vector: Array.from(description.vector) }] : []
    })
  })
if (Object.keys(limits).some(label => !templates.some(template => template.label === label))) {
  throw new Error('Faltam referências para alguma letra com movimento.')
}

const model = {
  ...savedModel,
  limits: { Y: savedModel.limits.Y },
  trajectory: { version: 1, limits, templates },
}
const recognize = createTrajectoryMatcher(model.trajectory)
const findMotion = frames => recognize(frames) ?? matchMotion(frames, model)
const results = []
for (const clip of clips.filter(clip => clip.split === 'test')) {
  const readings = []
  // A cadência abrange os quadros extraídos antes de limitar a frequência de inferência.
  const reader = createLiveLetterReader(async () => null, letter => {
    if (letter) readings.push(letter)
  }, findMotion)
  for (const frame of clip.frames) await reader.read(frame)
  results.push({ source: clip.source, label: clip.label, readings })
}
const evidence = {
  datasets: datasets.map(({ manifestSha256, landmarkerSha256, featuresSha256 }) =>
    ({ manifestSha256, landmarkerSha256, featuresSha256 })),
  limits,
  templateCount: templates.length,
  sourcesInTemplates: [...new Set(motionClips.filter(clip => clip.split !== 'test').map(clip => clip.source))],
  results,
}
await mkdir(output, { recursive: true })
await writeFile(join(output, 'alphabet-motion.json'), JSON.stringify(model))
await writeFile(join(output, 'trajectory-evaluation.json'), JSON.stringify(evidence, null, 2) + '\n')
console.log(JSON.stringify(evidence, null, 2))
