import { InferenceSession, Tensor } from 'onnxruntime-web/wasm'
import { decide, readModelManifest } from '/src/recognition/decision.js'
import { openHolistic } from '/src/recognition/holistic.js'
import { preprocessFrames } from '/src/recognition/preprocess.js'
import { closeVideo, stageVideo, waitForVideo } from '../browser-probe.js'

function selectFrames(frames, startMs, endMs) {
  return frames.filter(({ timestamp }) => timestamp >= startMs && timestamp < endMs)
}

function trackedSide({ pose }, { start, width }) {
  const shoulders = [pose[11], pose[12]]
  if (shoulders.some(point => !point || !Number.isFinite(point.x) ||
    (point.visibility ?? 1) < 0.5 || (point.presence ?? 1) < 0.5)) return 'unknown'
  const fullX = start + width * (shoulders[0].x + shoulders[1].x) / 2
  return fullX < 0.5 ? 'left' : 'right'
}

function cropCoordinates(frames, { start, width }) {
  const point = item => ({ ...item, x: (item.x - start) / width, z: item.z / width })
  return frames.map(frame => ({
    ...frame,
    aspect: frame.aspect * width,
    pose: frame.pose.map(point),
    leftHand: frame.leftHand.map(point),
    rightHand: frame.rightHand.map(point),
  }))
}

function maxTensorDifference(first, second) {
  if (first.state !== 'ready' || second.state !== 'ready') return null
  return first.values.reduce((maximum, value, index) => Math.max(maximum, Math.abs(value - second.values[index])), 0)
}

async function openScorer() {
  const manifest = readModelManifest(await (await fetch('/models/isolated.json')).json())
  const model = await (await fetch('/models/isolated.onnx')).arrayBuffer()
  const session = await InferenceSession.create(model, { executionProviders: ['wasm'] })
  const preprocess = frames => preprocessFrames(frames, manifest.preprocess)
  return {
    preprocess,
    async score(frames, framing, recognize) {
      const shouldersBySide = { left: 0, right: 0, unknown: 0 }
      for (const frame of frames) shouldersBySide[trackedSide(frame, framing)] += 1
      const window = {
        frames: frames.length,
        framesWithHands: frames.filter(frame => frame.leftHand.length || frame.rightHand.length).length,
        shouldersBySide,
      }
      const prepared = preprocess(frames)
      const production = await recognize(frames)
      const result = {
        ...window,
        preprocess: prepared.state,
        state: production.state,
        reason: production.reason ?? null,
        label: production.id?.replace('signal-', '') ?? null,
        confidence: production.confidence ?? null,
      }
      if (prepared.state !== 'ready') return result
      const input = new Tensor('float32', prepared.values, [1, manifest.frames, manifest.features])
      const { logits } = await session.run({ landmarks: input })
      const scored = decide(logits.data, manifest)
      if (scored.state !== production.state || scored.reason !== production.reason || scored.id !== production.id ||
          Math.abs(scored.confidence - production.confidence) > 1e-6) {
        throw new Error('O escore detalhado divergiu da decisão do aplicativo.')
      }
      const peak = Math.max(...logits.data)
      const exp = Array.from(logits.data, value => Math.exp(value - peak))
      const total = exp.reduce((sum, value) => sum + value, 0)
      return {
        ...result,
        probabilities: exp.map((value, index) => ({ label: manifest.labels[index], value: value / total })),
      }
    },
    close: () => session.release(),
  }
}

async function scoreControls(video, diagnosis, sampleMs, scorer, recognize) {
  const controls = []
  for (const control of diagnosis.controls) {
    const extractor = await openHolistic()
    try {
      await waitForVideo(video, 'loadeddata', () => { video.src = '/replay/' + control.id + '.mp4' })
      const { canvas, draw } = stageVideo(video)
      const frames = []
      for (let timestamp = 0; timestamp < control.endMs - control.startMs; timestamp += sampleMs) {
        if (timestamp) await waitForVideo(video, 'seeked', () => { video.currentTime = timestamp / 1000 })
        draw()
        frames.push({ ...extractor.detect(canvas, timestamp), aspect: canvas.width / canvas.height })
      }
      const score = await scorer.score(frames, diagnosis.framing[0], recognize)
      controls.push({ id: control.id, expected: control.expected, score })
    } finally {
      extractor.close()
      closeVideo(video)
    }
  }
  return controls
}

export async function openDialogueDiagnosis(diagnosis, sourceCanvas, draw) {
  const crops = []
  let scorer
  try {
    for (const framing of diagnosis.framing.slice(1)) {
      const canvas = document.createElement('canvas')
      canvas.width = sourceCanvas.width * framing.width
      canvas.height = sourceCanvas.height
      crops.push({
        framing,
        canvas,
        context: canvas.getContext('2d'),
        extractor: await openHolistic(),
        frames: [],
      })
    }
    scorer = await openScorer()
  } catch (error) {
    for (const crop of crops) crop.extractor.close()
    throw error
  }
  const full = diagnosis.framing[0]

  return {
    async assess(video, protocol, frames, automatic, recognize) {
      const { startMs, endMs, sampleMs } = protocol.clip
      for (let timestamp = 0; timestamp < endMs - startMs; timestamp += sampleMs) {
        await waitForVideo(video, 'seeked', () => { video.currentTime = timestamp / 1000 })
        draw()
        for (const { framing, canvas, context, extractor, frames: cropped } of crops) {
          context.drawImage(sourceCanvas, sourceCanvas.width * framing.start, 0, canvas.width, canvas.height,
            0, 0, canvas.width, canvas.height)
          cropped.push({ ...extractor.detect(canvas, timestamp), aspect: canvas.width / canvas.height })
        }
      }
      const take = (all, window) => selectFrames(all, window.startMs - startMs, window.endMs - startMs)
      const references = protocol.annotation.references.map(reference => ({
        id: reference.signer + '_amarelo',
        startMs: reference.startMs,
        endMs: reference.endMs,
        expected: reference.gloss,
        signer: reference.signer,
      }))
      const windows = []
      for (const window of [...references, ...diagnosis.contexts]) {
        const original = take(frames, window)
        const score = await scorer.score(original, full, recognize)
        const framings = [{ framing: full.id, ...score }]
        for (const { framing, frames: extracted } of crops) {
          framings.push({ framing: framing.id, ...await scorer.score(take(extracted, window), framing, recognize) })
        }
        const comparison = { ...window, framings }
        if (window.signer) {
          const framing = crops.find(crop => crop.framing.id === window.signer).framing
          const coordinates = cropCoordinates(original, framing)
          comparison.coordinateControl = {
            framing: framing.id,
            maxTensorDifference: maxTensorDifference(scorer.preprocess(original), scorer.preprocess(coordinates)),
            ...await scorer.score(coordinates, framing, recognize),
          }
        }
        windows.push(comparison)
      }

      const overlaps = []
      for (const reference of references) {
        const matching = new Map()
        for (const condition of automatic) {
          for (const proposal of condition.proposals) {
            if (proposal.startMs >= reference.endMs || proposal.endMs <= reference.startMs) continue
            const key = proposal.startMs + '-' + proposal.endMs
            if (!matching.has(key)) matching.set(key, { ...proposal, conditions: [] })
            matching.get(key).conditions.push(condition.id)
          }
        }
        const proposals = []
        for (const proposal of matching.values()) {
          const score = await scorer.score(take(frames, proposal), full, recognize)
          if (score.label !== proposal.gloss) throw new Error('Rótulo diferente no replay da mesma proposta.')
          proposals.push({ ...proposal, score })
        }
        overlaps.push({ id: reference.id, proposals })
      }
      const controls = await scoreControls(video, diagnosis, sampleMs, scorer, recognize)
      return { windows, overlaps, controls }
    },
    async close() {
      for (const crop of crops) crop.extractor.close()
      await scorer.close()
    },
  }
}
