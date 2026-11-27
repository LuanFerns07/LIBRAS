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

  self.onmessage = ({ data: { bitmap, timestamp } }) => {
    try {
      const result = task.detectForVideo(bitmap, timestamp)
      const hands = { leftHand: [], rightHand: [] }
      for (const [index, points] of result.landmarks.entries()) {
        if (points.length !== 21) continue
        const side = result.handedness[index]?.[0]?.categoryName
        const preferred = side === 'Right' ? 'rightHand' : 'leftHand'
        const other = preferred === 'leftHand' ? 'rightHand' : 'leftHand'
        const key = hands[preferred].length ? other : preferred
        hands[key] = points
      }
      self.postMessage({ type: 'frame', hands })
    } catch {
      self.postMessage({ type: 'error' })
    } finally {
      bitmap.close()
    }
  }
  self.postMessage({ type: 'ready' })
}

start().catch(() => self.postMessage({ type: 'error' }))
