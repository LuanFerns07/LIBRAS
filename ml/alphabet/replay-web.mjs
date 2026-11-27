import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseArgs, promisify } from 'node:util'
import { withChromium } from '../../tests/e2e/chromium.mjs'

const { values: options } = parseArgs({ options: {
  url: { type: 'string', default: 'http://127.0.0.1:4177/' },
  manifest: { type: 'string', multiple: true },
  source: { type: 'string', multiple: true },
  letters: { type: 'string' },
  workers: { type: 'string', default: '2' },
  timeline: { type: 'boolean' },
  trace: { type: 'boolean' },
} })
const url = new URL(options.url)
const workerCount = Number(options.workers)
if (!options.manifest?.length || !options.source?.length || ![1, 2, 3, 4].includes(workerCount) ||
    url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
  throw new Error('Informe manifestos, fontes, uma prévia HTTP local e de 1 a 4 processos Chromium.')
}

const ffmpeg = promisify(execFile)
const leadSeconds = 2
const outUrl = new URL('/#area-livre', url)
const selected = new Set(options.source)
const checkedFiles = new Map()
const windows = []
for (const path of options.manifest) {
  const { sources } = JSON.parse(await readFile(path, 'utf8'))
  for (const source of sources.filter(item => selected.has(item.id))) {
    if (!checkedFiles.has(source.file)) {
      const hash = createHash('sha256')
      for await (const chunk of createReadStream(source.file)) hash.update(chunk)
      checkedFiles.set(source.file, hash.digest('hex'))
    }
    if (checkedFiles.get(source.file) !== source.sha256) throw new Error('Vídeo divergente em ' + source.file)
    for (const { label, startMs, endMs } of source.windows) {
      if (!options.letters || options.letters.includes(label)) {
        windows.push({ source: source.id, label, startMs, endMs, file: source.file })
      }
    }
  }
}
if (windows.length === 0 || [...selected].some(id => !windows.some(window => window.source === id))) {
  throw new Error('As opções devem selecionar janelas de todas as fontes solicitadas.')
}

function startProbe(recordTimeline, recordTrace) {
  const mode = document.querySelector('[data-free-mode]')
  mode.value = 'letter'
  mode.dispatchEvent(new Event('change'))
  const output = document.querySelector('[data-live-character]')
  const video = document.querySelector('video')
  const observations = { changes: [], handVisibility: [], firstWorkerFrame: null, lastHand: null,
    workerFrames: 0, framesWithHand: 0 }
  window.replayObservations = observations
  const timing = new Map()
  if (recordTrace) {
    observations.frames = []
    const request = video.requestVideoFrameCallback.bind(video)
    video.requestVideoFrameCallback = callback => request((now, metadata) => {
      timing.set(now, { timestamp: metadata.mediaTime * 1000, aspect: video.videoWidth / video.videoHeight })
      if (timing.size > 8) timing.delete(timing.keys().next().value)
      callback(now, metadata)
    })
  }

  new MutationObserver(() => {
    observations.changes.push({ letter: output.textContent, time: video.currentTime })
  }).observe(output, { childList: true })
  const send = Worker.prototype.postMessage
  const sent = new WeakMap()
  Worker.prototype.postMessage = function (message, ...arguments_) {
    if (recordTrace && message?.frame) {
      if (!sent.has(this)) sent.set(this, [])
      sent.get(this).push(timing.get(message.timestamp))
    }
    if (message?.frame && !this.hasReplayProbe) {
      this.hasReplayProbe = true
      this.addEventListener('message', ({ data }) => {
        if (data.type !== 'frame') return
        if (recordTrace) {
          observations.frames.push({ timing: sent.get(this).shift(), hands: data.hands })
        }
        observations.workerFrames += 1
        observations.firstWorkerFrame ??= video.currentTime
        const visible = data.hands.leftHand?.length === 21 || data.hands.rightHand?.length === 21
        if (recordTimeline && observations.handVisibility.at(-1)?.visible !== visible) {
          observations.handVisibility.push({ visible, time: video.currentTime })
        }
        if (visible) {
          observations.lastHand = video.currentTime
          observations.framesWithHand += 1
        }
      })
    }
    return send.call(this, message, ...arguments_)
  }
  document.querySelector('[data-camera-toggle]').click()
}

async function replay(window, index, directory) {
  const { startMs, endMs, file, ...label } = window
  const duration = (endMs - startMs) / 1000
  const videoFile = join(directory, index + '.y4m')
  await ffmpeg('ffmpeg', ['-hide_banner', '-loglevel', 'error',
    '-ss', String(startMs / 1000), '-i', file, '-an', '-pix_fmt', 'yuv420p',
    '-vf', `trim=duration=${duration},scale=640:-2,fps=30,tpad=start_duration=${leadSeconds}:stop_duration=2:color=black`,
    videoFile])
  try {
    return await withChromium(async ({ navigate, evaluate, permission, waitUntil }) => {
      await navigate(outUrl.href)
      await permission(outUrl.origin, 'granted')
      await evaluate(`(${startProbe})(${!!options.timeline}, ${!!options.trace})`, true)
      await waitUntil('document.querySelector("[data-recognition-coverage]").textContent.startsWith("Leitura experimental")', 12000)
      await waitUntil(`document.querySelector('video').currentTime >= ${leadSeconds + duration + .55}`, 15000)
      const { changes, handVisibility, firstWorkerFrame, lastHand, workerFrames, framesWithHand, frames } =
        await evaluate('window.replayObservations')
      if (firstWorkerFrame === null || firstWorkerFrame >= leadSeconds) {
        throw new Error(`O rastreamento não iniciou antes da demonstração ${label.source}/${label.label}.`)
      }
      if (frames?.some(frame => !frame.timing)) {
        throw new Error(`O rastreamento gerou um quadro sem horário em ${label.source}/${label.label}.`)
      }
      return {
        ...label, startMs, endMs,
        readings: changes.filter(({ letter }) => letter !== '—')
          .map(({ letter, time }) => ({ letter, afterVideoMs: Math.round((time - leadSeconds) * 1000) })),
        ...(options.timeline ? {
          clearedAtMs: changes.filter(({ letter }) => letter === '—')
            .map(({ time }) => Math.round((time - leadSeconds) * 1000)),
          handVisibility: handVisibility.map(({ visible, time }) => ({
            visible, afterVideoMs: Math.round((time - leadSeconds) * 1000),
          })),
        } : {}),
        workerFrames, framesWithHand,
        lastHandAfterVideoMs: lastHand === null ? null : Math.round((lastHand - leadSeconds) * 1000),
        ...(frames ? { frames } : {}),
      }
    }, { videoFile })
  } finally {
    await rm(videoFile, { force: true })
  }
}

async function buildIdentity() {
  const [release, staticModel, temporalModel] = await Promise.all(
    ['commit.txt', 'models/alphabet.json', 'models/alphabet-motion.json']
      .map(path => fetch(new URL('/' + path, url))),
  )
  if (!release.ok || !staticModel.ok || !temporalModel.ok) {
    throw new Error('Use uma prévia empacotada com os modelos de alfabeto.')
  }
  const commit = (await release.text()).trim()
  if (!/^[a-f0-9]{40}$/u.test(commit)) throw new Error('O identificador da compilação é inválido.')
  const { modelSha256, agreementSha256, supplement, contrast, worldA, worldQ, imageR, imageY } = await staticModel.json()
  const motionSha256 = createHash('sha256').update(Buffer.from(await temporalModel.arrayBuffer())).digest('hex')
  return { commit, modelSha256, agreementSha256, supplementSha256: supplement?.modelSha256,
    contrastSha256: contrast?.modelSha256, worldASha256: worldA?.modelSha256,
    worldQSha256: worldQ?.modelSha256, imageRSha256: imageR?.modelSha256,
    imageYSha256: imageY?.modelSha256, motionSha256 }
}

const build = await buildIdentity()
const workspace = await mkdtemp(join(tmpdir(), 'librasia-replay-'))
const report = new Array(windows.length)
let cursor = 0
try {
  const runners = Array.from({ length: Math.min(windows.length, workerCount) }, async () => {
    while (cursor < windows.length) {
      const index = cursor++
      const window = windows[index]
      report[index] = await replay(window, index, workspace)
      process.stderr.write(`${window.source}/${window.label} concluído.\n`)
    }
  })
  const results = await Promise.allSettled(runners)
  const failures = results.filter(result => result.status === 'rejected').map(result => result.reason)
  if (failures.length) throw new AggregateError(failures, 'O replay não produziu um resultado completo.')
  if (JSON.stringify(await buildIdentity()) !== JSON.stringify(build)) {
    throw new Error('A compilação ou os modelos mudaram durante o replay.')
  }
  console.log(JSON.stringify({ build, manifests: options.manifest, results: report }, null, 2))
} finally {
  await rm(workspace, { recursive: true, force: true })
}
