import { FilesetResolver, HolisticLandmarker } from '@mediapipe/tasks-vision'

export async function openHolistic() {
  const base = import.meta.env.BASE_URL
  const files = await FilesetResolver.forVisionTasks(`${base}runtime/mediapipe`)
  const task = await HolisticLandmarker.createFromOptions(files, {
    baseOptions: {
      delegate: 'CPU',
      modelAssetPath: `${base}runtime/holistic_landmarker.task`,
    },
    runningMode: 'VIDEO',
    outputFaceBlendshapes: false,
    outputPoseSegmentationMasks: false,
  })
  return {
    detect(video, timestamp) {
      const result = task.detectForVideo(video, timestamp)
      return {
        timestamp,
        leftHand: result.leftHandLandmarks[0] ?? [],
        rightHand: result.rightHandLandmarks[0] ?? [],
        pose: result.poseLandmarks[0] ?? [],
        face: result.faceLandmarks[0] ?? [],
      }
    },
    close() { task.close() },
  }
}
