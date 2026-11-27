import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { createServer } from 'vite'
import { withChromium } from '../../../tests/e2e/chromium.mjs'

const [dataRoot, reportFile, option] = process.argv.slice(2)
if (!dataRoot || !reportFile || ![undefined, '--diagnose', '--single-signer', '--eqt'].includes(option) || process.argv.length > 5) {
  throw new Error('Uso: node ml/continuous_experiment/boundaries/replay-dialogue.mjs RAIZ_DOS_DADOS RESULTADO.json [--diagnose|--single-signer|--eqt]')
}

const project = fileURLToPath(new URL('../../../', import.meta.url))
const protocolPath = new URL('../../evidence/ufsc-boundaries/cederj-dialogue-protocol.json', import.meta.url)
const diagnosisPath = new URL('../../evidence/ufsc-boundaries/cederj-diagnosis-protocol.json', import.meta.url)
const baselinePath = new URL('../../evidence/ufsc-boundaries/cederj-dialogue-browser.json', import.meta.url)
const singleSignerPath = new URL('../../evidence/ufsc-boundaries/single-signer-amarelo-protocol.json', import.meta.url)
const eqtPath = new URL('../../evidence/ufsc-boundaries/eqt-outside-catalog-protocol.json', import.meta.url)
const cederjDiagnosisPath = new URL('../../evidence/ufsc-boundaries/cederj-dialogue-diagnosis.json', import.meta.url)
const protocol = JSON.parse(await readFile(protocolPath, 'utf8'))
const diagnosis = option === '--diagnose' ? JSON.parse(await readFile(diagnosisPath, 'utf8')) : undefined
const singleSigner = option === '--single-signer' ? JSON.parse(await readFile(singleSignerPath, 'utf8')) : undefined
const eqt = option === '--eqt' ? JSON.parse(await readFile(eqtPath, 'utf8')) : undefined
const exec = promisify(execFile)

async function sha256(file) {
  const digest = createHash('sha256')
  for await (const chunk of createReadStream(file)) digest.update(chunk)
  return digest.digest('hex')
}

async function verified(file, expected) {
  const actual = await sha256(file)
  if (actual !== expected) throw new Error('SHA-256 divergente: ' + file)
  return file
}

async function renderVideo(video, { startMs, endMs }, destination) {
  await exec('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-threads', '1',
    '-ss', (startMs / 1000).toFixed(3), '-i', video,
    '-t', ((endMs - startMs) / 1000).toFixed(3),
    '-map', '0:v:0', '-an', '-c:v', 'libx264', '-crf', '18', '-threads', '1',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', destination,
  ])
}

const staging = await mkdtemp(resolve(tmpdir(), 'librasia-dialogue-'))
const clip = resolve(staging, 'replay/dialogue.mp4')
try {
  async function stageModel(files, spec, destination) {
    const directory = resolve(staging, destination)
    await mkdir(directory, { recursive: true })
    for (const [filename, digest] of files) {
      const source = await verified(resolve(dataRoot, spec.directory, filename), digest)
      await symlink(source, resolve(directory, filename))
    }
  }

  const { assets, source } = protocol
  const runtimeDir = resolve(dataRoot, 'public/runtime')
  await verified(resolve(runtimeDir, 'holistic_landmarker.task'), assets.holisticSha256)
  await symlink(runtimeDir, resolve(staging, 'runtime'))
  await stageModel([
    ['isolated.json', assets.isolated.manifestSha256],
    ['isolated.onnx', assets.isolated.modelSha256],
  ], assets.isolated, 'models')
  await stageModel([
    ['monotone-web.manifest.json', assets.translation.manifestSha256],
    ['monotone-web.json', assets.translation.modelSha256],
  ], assets.translation, 'replay/translation')
  for (const condition of protocol.experiment.conditions) {
    await stageModel([
      ['boundary-model.json', condition.manifestSha256],
      ['boundary-model.onnx', condition.modelSha256],
    ], condition, 'replay/' + condition.id)
  }
  const stagedCases = []
  if (singleSigner) {
    await verified(protocolPath, singleSigner.cederjProtocolSha256)
    await verified(cederjDiagnosisPath, singleSigner.cederjDiagnosisSha256)
    for (const item of singleSigner.cases) {
      const file = item.id + '.mp4'
      const output = resolve(staging, 'replay', file)
      const input = await verified(resolve(dataRoot, item.source.mediaPath), item.source.mediaSha256)
      await renderVideo(input, item.clip, output)
      stagedCases.push({
        id: item.id,
        clipSha256: await sha256(output),
        protocol: {
          clip: { ...protocol.clip, ...item.clip, file },
          annotation: { references: item.references },
          experiment: protocol.experiment,
          manualWindows: [...item.references, ...item.context],
        },
      })
    }
  }
  if (eqt) {
    await verified(resolve(dataRoot, 'data/eqt-v4/web-test/samples.json'), eqt.samplesSha256)
    for (const item of eqt.cases) {
      const file = 'eqt-' + item.id + '.mp4'
      const input = await verified(resolve(dataRoot, item.mediaPath), item.mediaSha256)
      await symlink(input, resolve(staging, 'replay', file))
      stagedCases.push({
        id: item.id,
        item: item.item,
        referenceUnits: item.referenceUnits,
        clipSha256: item.mediaSha256,
        protocol: {
          clip: { ...item.clip, file },
          annotation: { references: [] },
          experiment: protocol.experiment,
        },
      })
    }
  }
  let video
  if (!singleSigner && !eqt) {
    video = await verified(resolve(dataRoot, source.mediaPath), source.mediaSha256)
    await renderVideo(video, protocol.clip, clip)
  }
  let diagnosisProvenance
  if (diagnosis) {
    await verified(protocolPath, diagnosis.protocolSha256)
    await verified(baselinePath, diagnosis.baselineReportSha256)
    const controls = []
    for (const control of diagnosis.controls) {
      const input = control.mediaPath ? await verified(resolve(dataRoot, control.mediaPath), control.mediaSha256) : video
      const output = resolve(staging, 'replay', control.id + '.mp4')
      await renderVideo(input, control, output)
      controls.push({ id: control.id, clipSha256: await sha256(output) })
    }
    diagnosisProvenance = { protocolSha256: await sha256(diagnosisPath), controls }
  }

  const server = await createServer({
    root: project,
    publicDir: staging,
    configFile: false,
    clearScreen: false,
    cacheDir: resolve(project, '.cache/vite-dialogue'),
    optimizeDeps: { noDiscovery: true, include: ['onnxruntime-web/wasm', '@mediapipe/tasks-vision'] },
    server: { host: '127.0.0.1', port: 0, hmr: false, watch: null },
    plugins: [{
      name: 'librasia-institutional-dialogue',
      configureServer({ middlewares }) {
        middlewares.use('/__librasia_dialogue', (_, response) => {
          response.setHeader('Content-Type', 'text/html; charset=utf-8')
          response.end('<!doctype html><meta charset="utf-8"><video muted preload="auto"></video>' +
            '<script type="module" src="/ml/continuous_experiment/boundaries/browser-replay-dialogue.js"></script>')
        })
      },
    }],
  })
  try {
    await server.listen()
    const url = 'http://127.0.0.1:' + server.httpServer.address().port + '/__librasia_dialogue'
    const result = await withChromium(async ({ navigate, evaluate, waitUntil }) => {
      await navigate(url)
      await waitUntil('typeof window.runInstitutionalDialogue === "function"', 30000)
      async function replay(replayProtocol, replayDiagnosis) {
        await evaluate('window.runInstitutionalDialogue(...' + JSON.stringify([replayProtocol, replayDiagnosis]) + ')')
        await waitUntil('window.dialogueResult !== null', replayDiagnosis ? 300000 : 180000)
        const row = await evaluate('window.dialogueResult')
        if (row.error) throw new Error(row.error)
        return row
      }
      if (!singleSigner && !eqt) return replay(protocol, diagnosis)
      const cases = []
      for (const { protocol: replayProtocol, ...item } of stagedCases) {
        const row = await replay(replayProtocol)
        cases.push({ ...item, ...row })
      }
      return { cases }
    }, { fakeCamera: false })
    const [{ stdout: chromium }, { stdout: ffmpeg }, protocolSha256] = await Promise.all([
      exec(process.env.LIBRASIA_CHROMIUM || 'chromium', ['--version']),
      exec('ffmpeg', ['-version']),
      sha256(protocolPath),
    ])
    const clipSha256 = singleSigner || eqt ? undefined : await sha256(clip)
    if (diagnosisProvenance) {
      const baseline = JSON.parse(await readFile(baselinePath, 'utf8'))
      diagnosisProvenance.automaticMatchesBaseline = baseline.clipSha256 === clipSha256 &&
        JSON.stringify(baseline.conditions) === JSON.stringify(result.conditions)
    }
    await writeFile(reportFile, JSON.stringify({
      protocolSha256, clipSha256, chromium: chromium.trim(), ffmpeg: ffmpeg.split('\n')[0], ...result,
      ...(diagnosisProvenance ? { diagnosisProvenance } : {}),
      ...(singleSigner ? { singleSignerProtocolSha256: await sha256(singleSignerPath) } : {}),
      ...(eqt ? { eqtProtocolSha256: await sha256(eqtPath) } : {}),
    }, null, 2) + '\n')
  } finally {
    await server.close()
  }
} finally {
  await rm(staging, { recursive: true, force: true })
}
