import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

const source = 'https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/1/holistic_landmarker.task'
const sha256 = 'e2dab61191e2dcd0a15f943d8e3ed1dce13c82dfa597b9dd39f562975a50c3f8'
const runtime = new URL('../public/runtime/', import.meta.url)
const destination = new URL('holistic_landmarker.task', runtime)
const localSource = process.env.LIBRASIA_HOLISTIC_FILE

function bytesMatch(bytes) {
  return createHash('sha256').update(bytes).digest('hex') === sha256
}

async function taskBytes() {
  if (localSource) return readFile(localSource)
  try {
    const existing = await readFile(destination)
    if (bytesMatch(existing)) return existing
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const response = await fetch(source, { signal: AbortSignal.timeout(90_000) })
  if (!response.ok) throw new Error(`Download do MediaPipe recusado (HTTP ${response.status}).`)
  return Buffer.from(await response.arrayBuffer())
}

const bytes = await taskBytes()
if (!bytesMatch(bytes)) throw new Error('O SHA-256 do modelo Holistic diverge da versão fixada.')
await mkdir(runtime, { recursive: true })
const temporary = new URL(`.${randomUUID()}.task`, runtime)
await writeFile(temporary, bytes, { flag: 'wx' })
await rename(temporary, destination)
await cp(
  new URL('../node_modules/@mediapipe/tasks-vision/wasm/', import.meta.url),
  new URL('mediapipe/', runtime),
  { recursive: true },
)
console.log('MediaPipe Holistic float16/1 e WebAssembly instalados em public/runtime.')
