import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const { values: options } = parseArgs({ options: {
  project: { type: 'string', default: '.' },
  run: { type: 'string', default: 'data/models/isolated-v1' },
} })
const project = resolve(options.project)
const run = resolve(options.run)
const web = pathToFileURL(resolve(project, 'node_modules/onnxruntime-web/dist/ort.wasm.min.mjs'))
const { env, InferenceSession, Tensor } = await import(web)
const { decide, readModelManifest } = await import(pathToFileURL(resolve(project, 'src/recognition/decision.js')))

env.wasm.numThreads = 1
const manifest = readModelManifest(JSON.parse(await readFile(resolve(run, 'isolated.json'), 'utf8')))
const { tolerance, samples } = JSON.parse(await readFile(resolve(run, 'parity-web.json'), 'utf8'))
const session = await InferenceSession.create(new Uint8Array(await readFile(resolve(run, 'isolated.onnx'))), {
  executionProviders: ['wasm'],
})
const signalText = new Map((await import(pathToFileURL(resolve(project, 'src/catalog.js')))).lesson.map((signal) => [signal.id, signal.text]))
let worst = 0
try {
  for (const sample of samples) {
    const input = new Tensor('float32', Float32Array.from(sample.values), [1, 24, 192])
    const { logits } = await session.run({ landmarks: input })
    const result = decide(logits.data, manifest)
    const actual = result.state === 'accepted' ? signalText.get(result.id) : null
    if (actual !== sample.expectedLabel || Math.abs(result.confidence - sample.confidence) > tolerance) {
      throw new Error(`Divergência da decisão em ${sample.clipSha256}: ${actual} / ${sample.expectedLabel}`)
    }
    for (let index = 0; index < sample.logits.length; index += 1) {
      worst = Math.max(worst, Math.abs(logits.data[index] - sample.logits[index]))
    }
  }
} finally {
  await session.release()
}
if (!samples.length || worst > tolerance) throw new Error(`Paridade WASM inválida: ${worst}.`)
console.log(JSON.stringify({ samples: samples.length, maxAbsLogitError: worst, tolerance, differencesInDecision: 0 }))
