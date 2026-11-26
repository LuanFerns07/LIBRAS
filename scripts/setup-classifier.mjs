import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { readModelManifest } from '../src/recognition/decision.js'

const source = resolve(process.argv[2] ?? 'data/models/isolated-v1')
const json = await readFile(resolve(source, 'isolated.json'))
const model = await readFile(resolve(source, 'isolated.onnx'))
const { modelSha256 } = readModelManifest(JSON.parse(json))
if (createHash('sha256').update(model).digest('hex') !== modelSha256) {
  throw new Error('O SHA-256 do modelo ONNX diverge do manifesto.')
}

const models = new URL('../public/models/', import.meta.url)
await mkdir(models, { recursive: true })
await writeFile(new URL('isolated.onnx', models), model)
await writeFile(new URL('isolated.json', models), json)
console.log(`Classificador instalado em public/models. SHA-256 ${modelSha256}`)
