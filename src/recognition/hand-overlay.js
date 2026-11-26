const fingers = [
  [0, 1, 2, 3, 4],
  [0, 5, 6, 7, 8],
  [5, 9, 10, 11, 12],
  [9, 13, 14, 15, 16],
  [13, 17, 18, 19, 20],
  [17, 0],
]
const joins = fingers.flatMap(finger => finger.slice(1).map((point, index) => [finger[index], point]))
const validPoint = point => Number.isFinite(point?.x) && Number.isFinite(point?.y)

export function handOverlay(canvas, video) {
  const context = canvas.getContext('2d')
  const clear = () => context?.clearRect(0, 0, canvas.width, canvas.height)

  function draw(hand, color) {
    if (hand.length !== 21) return
    const width = canvas.width
    const height = canvas.height
    const line = Math.max(2, width / 280)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    for (const [from, to] of joins) {
      const a = hand[from]
      const b = hand[to]
      if (!validPoint(a) || !validPoint(b)) continue
      context.moveTo(a.x * width, a.y * height)
      context.lineTo(b.x * width, b.y * height)
    }
    context.strokeStyle = '#201733'
    context.lineWidth = line * 2.3
    context.stroke()
    context.strokeStyle = color
    context.lineWidth = line
    context.stroke()
    for (const point of hand) {
      if (!validPoint(point)) continue
      context.beginPath()
      context.arc(point.x * width, point.y * height, line * 1.7, 0, 2 * Math.PI)
      context.strokeStyle = '#201733'
      context.lineWidth = line * 0.8
      context.stroke()
      context.fillStyle = color
      context.fill()
    }
  }

  return {
    clear,
    paint(frame) {
      if (!context || canvas.hidden || !video.videoWidth || !video.videoHeight) return
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }
      clear()
      draw(frame.leftHand, '#d9b8ff')
      draw(frame.rightHand, '#75f0ce')
    },
  }
}
