import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import * as ort from 'onnxruntime-web/wasm'

const directory = resolve(process.argv[2] ?? 'data/eqt-v4/onnx')
const path = (basename) => resolve(directory, basename)
ort.env.wasm.numThreads = 1
const encoder = await ort.InferenceSession.create(
  new Uint8Array(await readFile(path('encoder.onnx'))), { executionProviders: ['wasm'] },
)
const decoder = await ort.InferenceSession.create(
  new Uint8Array(await readFile(path('decoder.onnx'))), { executionProviders: ['wasm'] },
)
const reference = JSON.parse(await readFile(path('parity-fixture.json')))
const { bos, eos, maximum } = JSON.parse(await readFile(path('vocabulary.json')))
let steps = 0
try {
  for (const sample of reference) {
    const features = new ort.Tensor('float32', Float32Array.from(sample.features), [1, 126, 64])
    const { memory, keys, hidden } = await encoder.run({ features })
    const observed = []
    let state = hidden
    let current = bos
    for (let index = 0; index < maximum; index += 1) {
      const token = new ort.Tensor('int64', BigInt64Array.of(BigInt(current)), [1, 1])
      const { logits, next_hidden: next } = await decoder.run({ token, memory, keys, hidden: state })
      current = 2
      for (let i = 3; i < logits.data.length; i += 1) {
        if (logits.data[i] > logits.data[current]) current = i
      }
      observed.push(current)
      state = next
      if (current === eos) break
    }
    assert.deepEqual(observed, sample.tokens)
    steps += observed.length
  }
} finally {
  await decoder.release()
  await encoder.release()
}
console.log(JSON.stringify({ runtime: ort.env.versions.web, provider: 'wasm', clips: reference.length, steps }))
