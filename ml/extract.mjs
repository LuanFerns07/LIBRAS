import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const { values: options } = parseArgs({ options: {
  project: { type: 'string', default: '.' },
  manifest: { type: 'string', default: 'data/minds/manifest.json' },
  out: { type: 'string', default: 'data/minds/features' },
  browser: { type: 'string', default: 'chromium' },
  workers: { type: 'string', default: '2' },
} })
const project = resolve(options.project)
const manifestPath = resolve(options.manifest)
const manifest = JSON.parse(await readFile(manifestPath))
const featureDir = resolve(options.out)
const workers = Number(options.workers)
if (!Number.isInteger(workers) || workers < 1 || workers > 6) throw new Error('Escolha de 1 a 6 navegadores.')

const workerModule = fileURLToPath(new URL('./browser-extract.js', import.meta.url))
const scope = '/__librasia_extract'
const featuresPath = resolve(featureDir, 'index.json')
const modelPath = resolve(project, 'public/runtime/holistic_landmarker.task')
const text = (data) => JSON.stringify(data) + '\n'
const fileDigest = async (path) => {
  const hash = createHash('sha256')
  const stream = createReadStream(path)
  for await (const chunk of stream) hash.update(chunk)
  return hash.digest('hex')
}
const identity = {
  preprocess: 'holistic-shoulders-v1',
  preprocessSha256: await fileDigest(resolve(project, 'src/recognition/preprocess.js')),
  extractorSha256: await fileDigest(resolve(project, 'src/recognition/holistic.js')),
  workerSha256: await fileDigest(workerModule),
  mediapipe: JSON.parse(await readFile(resolve(project, 'node_modules/@mediapipe/tasks-vision/package.json'))).version,
  modelSha256: await fileDigest(modelPath),
  intervalMs: 100,
  sourceManifestSha256: await fileDigest(manifestPath),
}
const { sourceManifestSha256, ...extractionIdentity } = identity
const recipe = createHash('sha256').update(text(extractionIdentity)).digest('hex')

const records = []
const queue = []
const seen = new Set()
const signers = new Map()
const samples = new Set()
const dataPath = dirname(manifestPath)
await mkdir(featureDir, { recursive: true })
for (const [index, clip] of manifest.clips.entries()) {
  const path = resolve(dataPath, clip.file)
  const relativePath = relative(dataPath, path)
  if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) throw new Error('Caminho inesperado no manifesto.')
  if (!['train', 'val', 'test'].includes(clip.partition) || !Number.isSafeInteger(clip.signer)) throw new Error('Partição ou sinalizante inválido.')
  if (signers.has(clip.signer) && signers.get(clip.signer) !== clip.partition) throw new Error(`Pessoa ${clip.signer} em duas partições.`)
  if (seen.has(clip.sha256) || samples.has(clip.file)) throw new Error(`Vídeo duplicado em ${clip.file}.`)
  seen.add(clip.sha256)
  signers.set(clip.signer, clip.partition)
  samples.add(clip.file)
  const name = `${clip.sha256}.json`
  if (!/^[a-f0-9]{64}\.json$/u.test(name)) throw new Error('SHA-256 inválido no manifesto.')
  const featurePath = resolve(featureDir, name)
  const sha256 = await fileDigest(path)
  if (sha256 !== clip.sha256) throw new Error(`O SHA-256 não confere em ${clip.file}.`)
  const clipStat = await stat(path)
  if (clipStat.size <= 0) throw new Error(`Vídeo vazio em ${clip.file}.`)
  const item = { ...clip, path, featurePath, index, size: clipStat.size }
  records.push({ ...clip, features: name })
  try {
    const cached = JSON.parse(await readFile(featurePath))
    if (cached.recipe === recipe && cached.clipSha256 === sha256) continue
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error
  }
  queue.push(item)
}

function send(res, status, content = '', type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' })
  res.end(content)
}

function streamVideo(req, res, item) {
  const { path, size } = item
  const range = /^bytes=(\d+)-(\d*)$/u.exec(req.headers.range ?? '')
  let start = 0
  let end = size - 1
  if (range) {
    start = Number(range[1])
    end = range[2] ? Math.min(Number(range[2]), end) : end
    if (start > end || start >= size) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}` })
      res.end()
      return
    }
  }
  res.writeHead(range ? 206 : 200, {
    'Content-Type': 'video/mp4',
    'Content-Length': end - start + 1,
    'Accept-Ranges': 'bytes',
    ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}),
  })
  const stream = createReadStream(path, { start, end })
  stream.on('error', (error) => res.destroy(error))
  res.on('close', () => stream.destroy())
  stream.pipe(res)
}

async function body(req) {
  const chunks = []
  let length = 0
  for await (const chunk of req) {
    length += chunk.length
    if (length > 1_000_000) throw new Error('Resultado maior que o limite.')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks))
}

function verifyResult(data) {
  if (!['ready', 'no-hand', 'insufficient'].includes(data.state)
      || !Array.isArray(data.extractionMs) || !data.extractionMs.length
      || !data.extractionMs.every((elapsed) => Number.isFinite(elapsed) && elapsed >= 0)
      || (data.state === 'ready' && (!Array.isArray(data.values) || data.values.length !== 24 * 192
        || !data.values.every(Number.isFinite))) || (data.state !== 'ready' && data.values !== null)) {
    throw new Error('Representação de extração inválida.')
  }
}

const pending = queue.length
if (pending) {
  const byIndex = new Map(queue.map((record) => [record.index, record]))
  const claimed = new Set()
  const count = pending
  let elapsed = 0
  const children = []
  let finish
  let fail
  let idleTimer
  const done = new Promise((resolve, reject) => { finish = resolve; fail = reject })
  function resetIdleTimer() {
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => fail(new Error('Chromium sem progresso de extração por 120 segundos.')), 120000)
  }
  const profile = await mkdtemp(resolve(tmpdir(), 'librasia-extract-'))
  const { createServer } = await import(pathToFileURL(resolve(project, 'node_modules/vite/dist/node/index.js')))
  const server = await createServer({
    root: project,
    configFile: false,
    clearScreen: false,
    server: { host: '127.0.0.1', port: 0, hmr: false },
    plugins: [{
      name: 'librasia-extract',
      resolveId(id) {
        if (id === `${scope}/worker.js`) return workerModule
      },
      configureServer({ middlewares }) {
        middlewares.use(async (req, res, next) => {
          const path = new URL(req.url ?? '/', 'http://localhost').pathname
          if (!path.startsWith(scope) || path === `${scope}/worker.js`) return next()
          try {
            if (req.method === 'GET' && path === scope) {
              return send(res, 200, `<!doctype html><meta charset="utf-8"><video muted playsinline preload="auto"></video><script type="module" src="${scope}/worker.js"></script>`, 'text/html; charset=utf-8')
            }
            if (req.method === 'GET' && path === `${scope}/work`) {
              const item = queue.shift()
              if (!item) return send(res, 204)
              claimed.add(item.index)
              return send(res, 200, text({ index: item.index }))
            }
            const match = new RegExp(`^${scope}/(video|result)/(\\d+)$`, 'u').exec(path)
            if (match) {
              const [, kind, rawIndex] = match
              const index = Number(rawIndex)
              const item = byIndex.get(index)
              if (!item || !claimed.has(index)) return send(res, 404)
              if (req.method === 'GET' && kind === 'video') return streamVideo(req, res, item)
              if (req.method === 'POST' && kind === 'result') {
                const data = await body(req)
                verifyResult(data)
                const temporary = `${item.featurePath}.tmp`
                await writeFile(temporary, text({ recipe, clipSha256: item.sha256, ...data }))
                await rename(temporary, item.featurePath)
                claimed.delete(index)
                elapsed += 1
                console.log(`[${elapsed}/${count}] ${item.partition} ${item.signer} ${basename(item.file)} ${data.state}`)
                send(res, 200, '{}')
                if (elapsed === count) finish()
                else resetIdleTimer()
                return
              }
            }
            if (req.method === 'POST' && path === `${scope}/failure`) {
              const error = await body(req)
              send(res, 200, '{}')
              fail(new Error(`Erro em ${byIndex.get(error.index)?.file ?? 'Chromium'}: ${error.message}`))
              return
            }
            return send(res, 404)
          } catch (error) {
            send(res, 500)
            fail(error)
          }
        })
      },
    }],
  })

  try {
    await server.listen()
    const { port } = server.httpServer.address()
    resetIdleTimer()
    try {
      for (let index = 0; index < Math.min(workers, count); index += 1) {
        const child = spawn(options.browser, [
          '--headless=new', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling',
          '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
          `--user-data-dir=${resolve(profile, String(index))}`, `http://127.0.0.1:${port}${scope}`,
        ], { stdio: ['ignore', 'ignore', 'pipe'] })
        let errors = ''
        child.stderr.setEncoding('utf-8')
        child.stderr.on('data', (chunk) => { errors = (errors + chunk).slice(-3000) })
        child.once('error', fail)
        child.once('exit', (code, signal) => {
          if (elapsed < count) fail(new Error(`Chromium encerrado (${code ?? signal}): ${errors}`))
        })
        const closed = new Promise((complete) => child.once('close', complete))
        children.push({ child, closed })
      }
      await done
    } finally {
      clearTimeout(idleTimer)
    }
  } finally {
    await Promise.all(children.map(({ child, closed }) => {
      if (child.exitCode === null && child.signalCode === null) child.kill()
      return closed
    }))
    await server.close()
    await rm(profile, { recursive: true, force: true, maxRetries: 2 })
  }
}

const temporary = `${featuresPath}.tmp`
await writeFile(temporary, text({ ...identity, recipe, clips: records }))
await rename(temporary, featuresPath)
console.log(`Extração registrada em ${featuresPath} (${records.length} clipes, ${records.length - pending} reaproveitados).`)
