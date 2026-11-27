async function start() {
  const { FilesetResolver, HandLandmarker } = await import('./runtime/vision_bundle.mjs')
  const runtime = new URL('./runtime/', self.location.href)
  const files = await FilesetResolver.forVisionTasks(new URL('mediapipe', runtime).href)
  const task = await HandLandmarker.createFromOptions(files, {
    baseOptions: {
      delegate: 'CPU',
      modelAssetPath: new URL('hand_landmarker.task', runtime).href,
    },
    runningMode: 'VIDEO',
    numHands: 2,
  })
  const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(1, 1) : null
  const context = canvas?.getContext('2d', { alpha: false })
  let mirrored = false
  let orientationVotes = 0

  self.onmessage = ({ data: { frame, timestamp } }) => {
    try {
      const inputMirrored = mirrored
      if (inputMirrored) {
        const width = frame.displayWidth ?? frame.width
        const height = frame.displayHeight ?? frame.height
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width
          canvas.height = height
        }
        context.setTransform(-1, 0, 0, 1, width, 0)
        context.drawImage(frame, 0, 0, width, height)
      }
      const result = task.detectForVideo(inputMirrored ? canvas : frame, timestamp)
      const category = result.landmarks.length === 1 ? result.handedness[0]?.[0] : null
      // Use a mesma orientação durante a inferência para a mão que está sinalizando.
      const desired = category?.categoryName === (inputMirrored ? 'Left' : 'Right')
      orientationVotes = context && category?.score >= .8 && desired !== inputMirrored ? orientationVotes + 1 : 0
      if (orientationVotes >= 2) {
        mirrored = desired
        orientationVotes = 0
      }
      const hands = { leftHand: [], rightHand: [] }
      for (const [index, points] of result.landmarks.entries()) {
        if (points.length !== 21) continue
        const side = result.handedness[index]?.[0]?.categoryName
        const preferred = side === (inputMirrored ? 'Left' : 'Right') ? 'rightHand' : 'leftHand'
        const other = preferred === 'leftHand' ? 'rightHand' : 'leftHand'
        const key = hands[preferred].length ? other : preferred
        hands[key] = inputMirrored ? points.map(point => ({ ...point, x: 1 - point.x })) : points
      }
      self.postMessage({ type: 'frame', hands })
    } catch {
      self.postMessage({ type: 'error' })
    } finally {
      frame.close()
    }
  }
  self.postMessage({ type: 'ready' })
}

start().catch(() => self.postMessage({ type: 'error' }))
