import { createReadStream } from 'node:fs'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const { values: options } = parseArgs({ options: {
  project: { type: 'string', default: '.' },
  run: { type: 'string', default: 'data/models/isolated-v1' },
} })
const project = resolve(options.project)
const run = resolve(options.run)
const dist = resolve(project, 'node_modules/onnxruntime-web/dist')
const { withChromium } = await import(pathToFileURL(resolve(project, 'tests/e2e/chromium.mjs')))
const javascript = 'text/javascript; charset=utf-8'
const binary = 'application/octet-stream'
const json = 'application/json; charset=utf-8'
const files = new Map([
  ['/ort.wasm.min.mjs', [resolve(dist, 'ort.wasm.min.mjs'), javascript]],
  ['/ort-wasm-simd-threaded.mjs', [resolve(dist, 'ort-wasm-simd-threaded.mjs'), javascript]],
  ['/ort-wasm-simd-threaded.wasm', [resolve(dist, 'ort-wasm-simd-threaded.wasm'), 'application/wasm']],
  ['/src/recognition/decision.js', [resolve(project, 'src/recognition/decision.js'), javascript]],
  ['/src/recognition/preprocess.js', [resolve(project, 'src/recognition/preprocess.js'), javascript]],
  ['/src/catalog.js', [resolve(project, 'src/catalog.js'), javascript]],
  ['/isolated.json', [resolve(run, 'isolated.json'), json]],
  ['/parity-web.json', [resolve(run, 'parity-web.json'), json]],
  ['/isolated.onnx', [resolve(run, 'isolated.onnx'), binary]],
])
const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  if (path === '/') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    response.end('<!doctype html><meta charset="utf-8"><title>Paridade de inferência</title>')
    return
  }
  const file = files.get(path)
  if (!file || request.method !== 'GET') {
    response.writeHead(404).end()
    return
  }
  const [source, type] = file
  const stream = createReadStream(source)
  stream.once('error', () => response.destroy())
  response.writeHead(200, { 'Content-Type': type })
  stream.pipe(response)
})

async function inBrowser() {
  const { env, InferenceSession, Tensor } = await import('/ort.wasm.min.mjs')
  const { decide, readModelManifest } = await import('/src/recognition/decision.js')
  const { recognitionCatalog } = await import('/src/catalog.js')
  const signalText = new Map(recognitionCatalog.map((signal) => [signal.id, signal.text]))
  const localAsset = async (path) => {
    const response = await fetch(path)
    if (!response.ok) throw new Error(`Arquivo local indisponível: ${path}.`)
    return response
  }
  const manifest = readModelManifest(await (await localAsset('/isolated.json')).json())
  const { tolerance, samples } = await (await localAsset('/parity-web.json')).json()
  const model = await (await localAsset('/isolated.onnx')).arrayBuffer()
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', model)),
    (byte) => byte.toString(16).padStart(2, '0')).join('')
  if (manifest.modelSha256 !== hash) throw new Error('SHA-256 do modelo não confere.')
  env.wasm.numThreads = 1
  const session = await InferenceSession.create(new Uint8Array(model), { executionProviders: ['wasm'] })
  let worst = 0
  try {
    for (const sample of samples) {
      const input = new Tensor('float32', Float32Array.from(sample.values), [1, manifest.frames, manifest.features])
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
  return { samples: samples.length, maxAbsLogitError: worst, tolerance,
    differencesInDecision: 0, runtime: navigator.userAgent, modelSha256: hash }
}

server.listen(0, '127.0.0.1')
await once(server, 'listening')
try {
  const report = await withChromium(async ({ navigate, evaluate }) => {
    await navigate(`http://127.0.0.1:${server.address().port}/`)
    return await evaluate(`(${inBrowser.toString()})()`)
  }, { fakeCamera: false })
  console.log(JSON.stringify(report))
} finally {
  const closed = once(server, 'close')
  server.close()
  server.closeAllConnections()
  await closed
}
