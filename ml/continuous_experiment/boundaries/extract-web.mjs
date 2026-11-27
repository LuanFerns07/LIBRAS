import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { withChromium } from '../../../tests/e2e/chromium.mjs'

const { values: options } = parseArgs({ options: {
  project: { type: 'string', default: '.' },
  dir: { type: 'string', default: 'data/ufsc-boundaries' },
  split: { type: 'string', default: 'development' },
  workers: { type: 'string', default: '2' },
  help: { type: 'boolean' },
} })
if (options.help) {
  console.log('node ml/continuous_experiment/boundaries/extract-web.mjs [--dir data/ufsc-boundaries] [--split development|test] [--workers 1|2]')
  process.exit(0)
}

const project = resolve(options.project)
const directory = resolve(options.dir)
if (!['development', 'test'].includes(options.split)) throw new Error('Selecione development ou test.')
const reserved = options.split === 'test'
const output = resolve(directory, 'holistic', reserved ? 'test' : '')
const workers = Number(options.workers)
if (![1, 2].includes(workers)) throw new Error('Escolha um ou dois processos Chromium.')

const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
async function sha256(path) {
  const hash = createHash('sha256')
  for await (const bytes of createReadStream(path)) hash.update(bytes)
  return hash.digest('hex')
}

const workerModule = fileURLToPath(new URL('./browser-extract-web.js', import.meta.url))
const scope = '/__librasia_boundary_extract'
const sampleMs = 100
const handOrder = ['left', 'right']
const visionPackage = resolve(project, 'node_modules/@mediapipe/tasks-vision/package.json')
const [source, media, modelSha256, sourceDigests, { version: mediapipe }] = await Promise.all([
  readJson(new URL('./sources.json', import.meta.url)),
  readJson(resolve(directory, 'media.json')),
  sha256(resolve(project, 'public/runtime/holistic_landmarker.task')),
  Promise.all([
    fileURLToPath(import.meta.url),
    workerModule,
    fileURLToPath(new URL('../browser-probe.js', import.meta.url)),
    resolve(project, 'src/recognition/holistic.js'),
  ].map(sha256)),
  readJson(visionPackage),
])
const extractorSha256 = createHash('sha256').update(JSON.stringify({ sourceDigests, mediapipe })).digest('hex')
const included = row => reserved ? row.split === 'test' : row.split === 'train' || row.split === 'dev'
const expected = source.cases.filter(included)
const rows = media.filter(included)
if (expected.length !== (reserved ? 3 : 6) || rows.length !== expected.length ||
    new Set(rows.map(row => row.id)).size !== rows.length) {
  throw new Error('O manifesto deve cobrir todas as gravações da partição selecionada.')
}
const times = Array.from({ length: source.seconds * 1000 / sampleMs }, (_, index) => index * sampleMs)

function validPoints(points) {
  return Array.isArray(points) && points.length === times.length && points.every(frame =>
    Array.isArray(frame) && frame.length === handOrder.length && frame.every(hand => hand === null ||
      (Array.isArray(hand) && hand.length === 21 && hand.every(point =>
        Array.isArray(point) && point.length === 3 && point.every(Number.isFinite)))))
}

async function isCached(path, identity) {
  try {
    const cached = await readJson(path)
    return cached && Object.entries(identity).every(([key, value]) => cached[key] === value)
      && JSON.stringify(cached.handOrder) === JSON.stringify(handOrder)
      && JSON.stringify(cached.times) === JSON.stringify(times) && validPoints(cached.points)
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return false
    throw error
  }
}

await mkdir(output, { recursive: true })
const clips = new Map()
const digests = new Set()
for (const entry of expected) {
  const row = rows.find(item => item.id === entry.id)
  const video = `FLN_G1_D${entry.dyad}_${entry.interview}entrevista_VIDEO${source.camera}.mp4`
  if (!row || row.split !== entry.split || row.dyad !== entry.dyad || row.interview !== entry.interview
    || row.video !== video || row.seconds !== source.seconds || row.tier !== source.tier) {
    throw new Error(`O manifesto diverge do recorte ${entry.id}.`)
  }
  const file = resolve(directory, video)
  const [videoSha256, { size }] = await Promise.all([sha256(file), stat(file)])
  if (videoSha256 !== row.video_prefix_sha256 || size !== row.bytes_video || digests.has(videoSha256)) {
    throw new Error(`O vídeo local ${video} tem tamanho ou SHA-256 incompatível.`)
  }
  digests.add(videoSha256)
  const identity = { schemaVersion: 1, id: row.id, split: row.split, videoSha256, modelSha256, extractorSha256, sampleMs, mediapipe }
  const path = resolve(output, `${row.id}.json`)
  if (await isCached(path, identity)) console.log(`[${row.split}] ${row.id} reaproveitado.`)
  else clips.set(`${scope}/video/${row.id}`, { file, size, path, identity })
}

function serveVideo(req, res, { file, size }) {
  const range = /^bytes=(\d+)-(\d*)$/u.exec(req.headers.range ?? '')
  const start = range ? Number(range[1]) : 0
  const end = range?.[2] ? Math.min(Number(range[2]), size - 1) : size - 1
  if (start > end || start >= size) {
    res.writeHead(416, { 'Content-Range': `bytes */${size}` })
    res.end()
    return
  }
  res.writeHead(range ? 206 : 200, {
    'Content-Type': 'video/mp4',
    'Content-Length': end - start + 1,
    'Accept-Ranges': 'bytes',
    ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}),
  })
  const stream = createReadStream(file, { start, end })
  stream.on('error', error => res.destroy(error))
  res.on('close', () => stream.destroy())
  stream.pipe(res)
}

if (clips.size) {
  const { createServer } = await import(pathToFileURL(resolve(project, 'node_modules/vite/dist/node/index.js')))
  const server = await createServer({
    root: project,
    configFile: false,
    clearScreen: false,
    cacheDir: resolve(project, '.cache/vite-boundary-extract'),
    optimizeDeps: { noDiscovery: true, include: ['@mediapipe/tasks-vision'] },
    server: { host: '127.0.0.1', port: 0, hmr: false, watch: null },
    plugins: [{
      name: 'librasia-boundary-extract',
      resolveId(id) {
        if (id === `${scope}/worker.js`) return workerModule
      },
      configureServer({ middlewares }) {
        middlewares.use((req, res, next) => {
          const path = new URL(req.url ?? '/', 'http://localhost').pathname
          if (path === scope) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(`<!doctype html><meta charset="utf-8"><video muted preload="auto"></video>
              <script type="module" src="${scope}/worker.js"></script>`)
            return
          }
          const clip = clips.get(path)
          if (clip && req.method === 'GET') return serveVideo(req, res, clip)
          return next()
        })
      },
    }],
  })
  try {
    await server.listen()
    const url = `http://127.0.0.1:${server.httpServer.address().port}${scope}`
    const queue = [...clips]
    const extract = () => withChromium(async ({ navigate, evaluate, waitUntil }) => {
      await navigate(url)
      await waitUntil('typeof window.startBoundaryExtraction === "function"', 30000)
      for (let item = queue.shift(); item; item = queue.shift()) {
        const [video, { path, identity }] = item
        const label = `[${identity.split}] ${identity.id}`
        console.log(`${label} extraindo ${times.length} quadros no Chromium.`)
        try {
          await evaluate(`window.startBoundaryExtraction(${JSON.stringify(video)}, ${JSON.stringify(times)})`)
          await waitUntil('window.boundaryExtraction !== null', 300000)
          const { points, browser, error } = await evaluate('window.boundaryExtraction')
          if (error || !validPoints(points)) throw new Error(error ?? 'Landmarks fora do esquema.')
          const temporary = `${path}.${process.pid}.tmp`
          try {
            await writeFile(temporary, JSON.stringify({ ...identity, browser, handOrder, times, points }) + '\n')
            await rename(temporary, path)
          } finally {
            await rm(temporary, { force: true })
          }
          const visible = points.filter(frame => frame.some(Boolean)).length
          console.log(`${label} concluído com mãos em ${visible}/${points.length} quadros.`)
        } catch (error) {
          throw new Error(`Falha na extração ${label}.`, { cause: error })
        }
      }
    }, { fakeCamera: false })
    const outcomes = await Promise.allSettled(Array.from({ length: Math.min(workers, clips.size) }, extract))
    const failures = outcomes.filter(result => result.status === 'rejected')
    if (failures.length) throw new AggregateError(failures.map(result => result.reason), 'Extração incompleta.')
  } finally {
    await server.close()
  }
}
console.log(`Extração de ${reserved ? 'teste' : 'treino e validação'} registrada em ${output}.`)
