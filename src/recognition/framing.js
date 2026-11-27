function outsideImage(point) {
  return point && (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1)
}

export function frameForRecognition(frames) {
  let handWithShouldersOutside = false
  const framed = frames.map(frame => {
    if (!outsideImage(frame.pose[11]) && !outsideImage(frame.pose[12])) return frame
    handWithShouldersOutside ||= frame.leftHand.length === 21 || frame.rightHand.length === 21
    // Preserve o instante da amostra para que a oclusão conte como perda de evidência.
    return { ...frame, pose: [], leftHand: [], rightHand: [] }
  })
  return { frames: framed, handWithShouldersOutside }
}
