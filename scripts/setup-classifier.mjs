import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readModelManifest } from '../src/recognition/decision.js'

const source = resolve(process.argv[2] ?? 'data/models/isolated-v1')
const json = await readFile(resolve(source, 'isolated.json'))
const model = await readFile(resolve(source, 'isolated.onnx'))
const { modelSha256 } = readModelManifest(JSON.parse(json))
if (createHash('sha256').update(model).digest('hex') !== modelSha256) {
  throw new Error('O SHA-256 do modelo ONNX diverge do manifesto.')
}

const models = process.argv[3] ? resolve(process.argv[3]) : fileURLToPath(new URL('../public/models', import.meta.url))
if (models !== source) {
  await mkdir(models, { recursive: true })
  await writeFile(resolve(models, 'isolated.onnx'), model)
  await writeFile(resolve(models, 'isolated.json'), json)
}
console.log(`Classificador disponível em ${models}. SHA-256 ${modelSha256}`)
