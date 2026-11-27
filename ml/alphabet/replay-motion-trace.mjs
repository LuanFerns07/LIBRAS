import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const [tracePath, modelPath, readerSource = 'src/recognition'] = process.argv.slice(2)
if (!tracePath || !modelPath || process.argv.length > 5) {
  throw new Error('Uso: node ml/alphabet/replay-motion-trace.mjs CAPTURA.json MODELO.json [DIRETÓRIO DO LEITOR]')
}
const [traceBytes, modelBytes] = await Promise.all([readFile(tracePath), readFile(modelPath)])
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const trace = JSON.parse(traceBytes)
const model = JSON.parse(modelBytes)
if (trace.build.motionSha256 !== sha256(modelBytes) || !model.trajectory) {
  throw new Error('O modelo de trajetória deve corresponder ao que foi usado na gravação dos pontos.')
}
const [{ createLiveLetterReader, oneHand }, { createTrajectoryMatcher }, { matchMotion }] = await Promise.all(
  ['alphabet.js', 'alphabet-trajectory.js', 'alphabet-motion.js']
    .map(name => import(pathToFileURL(resolve(readerSource, name)))),
)
const matchTrajectory = createTrajectoryMatcher(model.trajectory)
const findings = []
for (const { frames, source, label, startMs, endMs, readings } of trace.results) {
  if (!frames?.length || frames.some(row => !Number.isFinite(row.timing?.timestamp))) {
    throw new Error(`Faltam os quadros e horários de ${source}/${label}. Use replay-web.mjs --trace.`)
  }
  let now
  const motionEvents = []
  const overlapMs = []
  // O classificador estático fica fora da comparação entre as regras de movimento.
  const reader = createLiveLetterReader(async () => null, letter => motionEvents.push({ letter, afterVideoMs: now }),
    (recent, history, zDropout) => matchTrajectory(recent, history, zDropout) ?? matchMotion(recent, model))
  for (const { timing, hands } of frames) {
    now = Math.round(timing.timestamp - 2000)
    if (hands.leftHand.length === 21 && hands.rightHand.length === 21 && !oneHand(hands)) overlapMs.push(now)
    await reader.read({ ...timing, ...hands })
  }
  findings.push({ source, label, startMs, endMs, readings, motionEvents, overlapMs })
}
console.log(JSON.stringify({ captureSha256: sha256(traceBytes), build: trace.build, findings }, null, 2))
