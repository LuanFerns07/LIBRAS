function fingersPointDown(points, aspect) {
  const [wrist, index, middle, little] = [0, 5, 9, 17].map(joint => points[joint])
  const distance = (first, second) => Math.hypot(
    (first.x - second.x) * aspect, first.y - second.y, (first.z - second.z) * aspect)
  const palm = Math.max(distance(wrist, middle), distance(index, little))
  return Math.min(points[8].y - index.y, points[12].y - middle.y) > .7 * palm
}

async function start() {
  const { FilesetResolver, HandLandmarker } = await import('./runtime/vision_bundle.mjs')
  const runtime = new URL('./runtime/', self.location.href)
  const files = await FilesetResolver.forVisionTasks(new URL('mediapipe', runtime).href)
  const openTask = numHands => HandLandmarker.createFromOptions(files, {
    baseOptions: {
      delegate: 'CPU',
      modelAssetPath: new URL('hand_landmarker.task', runtime).href,
    },
    runningMode: 'VIDEO',
    numHands,
  })
  const task = await openTask(2)
  const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(1, 1) : null
  const context = canvas?.getContext('2d', { alpha: false })
  let alternateTask
  let alternateRequested = false

  function confirmN(frame, timestamp, result) {
    if (!context) return
    if (!alternateRequested) {
      alternateRequested = true
      openTask(1).then(loaded => { alternateTask = loaded }, () => {})
    }
    const category = result.handedness[0]?.[0]
    const points = result.landmarks[0]
    const width = frame.displayWidth ?? frame.width
    const height = frame.displayHeight ?? frame.height
    if (!alternateTask || result.landmarks.length !== 1 || category?.categoryName !== 'Right' ||
        points?.length !== 21 || !fingersPointDown(points, width / height)) return

    try {
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      context.setTransform(-1, 0, 0, 1, width, 0)
      context.drawImage(frame, 0, 0, width, height)
      const { landmarks: [alternate] } = alternateTask.detectForVideo(canvas, timestamp)
      if (alternate?.length === 21 && Math.hypot(1 - alternate[0].x - points[0].x, alternate[0].y - points[0].y) < .1) {
        return alternate.map(point => ({ ...point, x: 1 - point.x }))
      }
    } catch {
      alternateTask = undefined
    }
  }

  self.onmessage = ({ data: { frame, timestamp, readLetters } }) => {
    try {
      const result = task.detectForVideo(frame, timestamp)
      const hands = { leftHand: [], rightHand: [] }
      for (const [index, points] of result.landmarks.entries()) {
        if (points.length !== 21) continue
        const side = result.handedness[index]?.[0]?.categoryName
        const preferred = side === 'Right' ? 'rightHand' : 'leftHand'
        const other = preferred === 'leftHand' ? 'rightHand' : 'leftHand'
        const key = hands[preferred].length ? other : preferred
        hands[key] = points
      }
      const alternateHand = readLetters ? confirmN(frame, timestamp, result) : undefined
      self.postMessage({ type: 'frame', hands, alternateHand })
    } catch {
      self.postMessage({ type: 'error' })
    } finally {
      frame.close()
    }
  }
  self.postMessage({ type: 'ready' })
}

start().catch(() => self.postMessage({ type: 'error' }))
