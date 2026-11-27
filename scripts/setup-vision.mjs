import { createHash, randomUUID } from 'node:crypto'
import { cp, mkdir, readFile, rename, writeFile } from 'node:fs/promises'

const runtime = new URL('../public/runtime/', import.meta.url)
const taskBase = 'https://storage.googleapis.com/mediapipe-models/'
const tasks = [
  ['holistic_landmarker', 'e2dab61191e2dcd0a15f943d8e3ed1dce13c82dfa597b9dd39f562975a50c3f8', process.env.LIBRASIA_HOLISTIC_FILE],
  ['hand_landmarker', 'fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1', process.env.LIBRASIA_HAND_FILE],
]

function bytesMatch(bytes, sha256) {
  return createHash('sha256').update(bytes).digest('hex') === sha256
}

async function taskBytes(name, destination, sha256, localSource) {
  if (localSource) return readFile(localSource)
  try {
    const existing = await readFile(destination)
    if (bytesMatch(existing, sha256)) return existing
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const source = new URL(`${name}/${name}/float16/1/${name}.task`, taskBase)
  const response = await fetch(source, { signal: AbortSignal.timeout(90_000) })
  if (!response.ok) throw new Error(`Download do MediaPipe recusado (HTTP ${response.status}).`)
  return Buffer.from(await response.arrayBuffer())
}

await mkdir(runtime, { recursive: true })
for (const [name, sha256, localSource] of tasks) {
  const destination = new URL(`${name}.task`, runtime)
  const bytes = await taskBytes(name, destination, sha256, localSource)
  if (!bytesMatch(bytes, sha256)) throw new Error(`O SHA-256 de ${name} diverge da versão fixada.`)
  const temporary = new URL(`.${randomUUID()}.task`, runtime)
  await writeFile(temporary, bytes, { flag: 'wx' })
  await rename(temporary, destination)
}
await cp(
  new URL('../node_modules/@mediapipe/tasks-vision/wasm/', import.meta.url),
  new URL('mediapipe/', runtime),
  { recursive: true },
)
await cp(
  new URL('../node_modules/@mediapipe/tasks-vision/vision_bundle.mjs', import.meta.url),
  new URL('vision_bundle.mjs', runtime),
)
console.log('MediaPipe Holistic, Hand Landmarker e WebAssembly instalados em public/runtime.')
