import { openContinuous } from '/src/recognition/continuous.js'
import { openEngine } from '/src/recognition/engine.js'
import { closeVideo, stageVideo, waitForVideo } from '../browser-probe.js'

const video = document.querySelector('video')

function iou(reference, proposal) {
  const overlap = Math.min(reference.endMs, proposal.endMs) - Math.max(reference.startMs, proposal.startMs)
  const union = Math.max(reference.endMs, proposal.endMs) - Math.min(reference.startMs, proposal.startMs)
  return Math.max(0, overlap) / union
}

function scoreReference(reference, proposals, minIoU) {
  const overlaps = proposals.map(proposal => [proposal.gloss, iou(reference, proposal)])
  const maxIoU = Math.max(0, ...overlaps.map(([, score]) => score))
  const maxLabeledIoU = Math.max(0, ...overlaps.filter(([gloss]) => gloss === reference.gloss).map(([, score]) => score))
  return {
    ...reference,
    maxIoU: Number(maxIoU.toFixed(3)),
    maxLabeledIoU: Number(maxLabeledIoU.toFixed(3)),
    aligned: maxIoU >= minIoU,
    recognized: maxLabeledIoU >= minIoU,
  }
}

async function compare(condition, frames, recognize, protocol) {
  const decoderModel = 'boundary-model.'
  async function localAsset(path) {
    const name = path.split('/').at(-1)
    const directory = name.startsWith(decoderModel) ? condition.id : 'translation'
    const response = await fetch('/replay/' + directory + '/' + name)
    if (!response.ok) throw new Error('Ativo local indisponível: ' + path)
    return response
  }

  async function verifiedBytes(path, expected) {
    const bytes = new Uint8Array(await (await localAsset(path)).arrayBuffer())
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
    const actual = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('')
    if (actual !== expected) throw new Error('SHA-256 divergente: ' + path)
    return bytes
  }

  const runtime = await openContinuous(localAsset, verifiedBytes, recognize)
  try {
    const result = await runtime.recognize(frames)
    const offset = protocol.clip.startMs
    const proposals = result.intervals.map(({ startMs, endMs }, index) => ({
      startMs: startMs + offset,
      endMs: endMs + offset,
      gloss: result.glosses[index],
    }))
    return {
      id: condition.id,
      state: result.state,
      reason: result.reason ?? null,
      suggestedText: result.text ?? null,
      proposals,
      references: protocol.annotation.references.map(reference =>
        scoreReference(reference, proposals, protocol.experiment.iou)),
    }
  } finally {
    await runtime.close()
  }
}

async function run(protocol, diagnosis) {
  const engine = await openEngine()
  let diagnostic
  try {
    const { startMs, endMs, sampleMs, canvasMaxWidth } = protocol.clip
    await waitForVideo(video, 'loadeddata', () => { video.src = '/replay/' + (protocol.clip.file ?? 'dialogue.mp4') })
    if (video.duration * 1000 < endMs - startMs) throw new Error('A mídia termina antes da última amostra.')
    const { canvas, draw } = stageVideo(video)
    if (canvas.width !== canvasMaxWidth) throw new Error('Largura da grade diferente do protocolo.')
    const frames = []
    for (let timestamp = 0; timestamp < endMs - startMs; timestamp += sampleMs) {
      if (timestamp) await waitForVideo(video, 'seeked', () => { video.currentTime = timestamp / 1000 })
      draw()
      frames.push({ ...engine.detect(canvas, timestamp), aspect: canvas.width / canvas.height })
    }
    const conditions = []
    for (const condition of protocol.experiment.conditions) {
      conditions.push(await compare(condition, frames, engine.recognize, protocol))
    }
    if (diagnosis) {
      const { openDialogueDiagnosis } = await import('./browser-dialogue-diagnosis.js')
      diagnostic = await openDialogueDiagnosis(diagnosis, canvas, draw)
    }
    const gl = document.createElement('canvas').getContext('webgl2')
    const rendererInfo = gl?.getExtension('WEBGL_debug_renderer_info')
    const diagnosisResult = diagnostic && await diagnostic.assess(video, protocol, frames, conditions, engine.recognize)
    let manualWindows
    if (protocol.manualWindows) {
      const { scoreDialogueWindows } = await import('./browser-dialogue-diagnosis.js')
      manualWindows = await scoreDialogueWindows(protocol, frames, engine.recognize)
    }
    return {
      browser: navigator.userAgent,
      renderer: rendererInfo ? gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL) : null,
      canvas: [canvas.width, canvas.height],
      frames: frames.length,
      framesWithHands: frames.filter(frame => frame.leftHand.length || frame.rightHand.length).length,
      conditions,
      ...(diagnosisResult ? { diagnosis: diagnosisResult } : {}),
      ...(manualWindows ? { manualWindows } : {}),
    }
  } finally {
    closeVideo(video)
    await Promise.all([engine.close(), diagnostic?.close()])
  }
}

window.runInstitutionalDialogue = (protocol, diagnosis) => {
  window.dialogueResult = null
  run(protocol, diagnosis).then(
    result => { window.dialogueResult = result },
    error => { window.dialogueResult = { error: error.stack ?? String(error) } },
  )
}
