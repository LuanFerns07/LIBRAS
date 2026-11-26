import assert from 'node:assert/strict'
import test from 'node:test'
import { createCamera } from '../src/recognition/camera.js'

function setup(getStream = stream => Promise.resolve(stream)) {
  const video = { play: async () => {}, srcObject: null }
  const events = []
  const track = new EventTarget()
  track.stop = () => { track.stopped = true }
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] }
  const camera = createCamera(video, (...args) => events.push(args), {
    getUserMedia(options) {
      assert.equal(options.audio, false)
      return getStream(stream)
    },
  })
  return { camera, video, track, stream, events }
}

test('a câmera inicia apenas quando solicitada e libera a trilha ao sair', async () => {
  const { camera, video, track, stream, events } = setup()
  assert.equal(video.srcObject, null)
  assert.equal(await camera.start(), true)
  assert.equal(video.srcObject, stream)
  assert.equal(camera.active, true)
  camera.dispose()
  assert.equal(video.srcObject, null)
  assert.equal(track.stopped, true)
  assert.equal(camera.active, false)
  assert.deepEqual(events.map(([state]) => state), ['starting', 'ready'])
})

test('uma autorização que chega após a saída é liberada imediatamente', async () => {
  let grant
  const { camera, track, video, events } = setup(stream => new Promise(resolve => {
    grant = () => resolve(stream)
  }))
  const pending = camera.start()
  camera.dispose()
  grant()
  assert.equal(await pending, false)
  assert.equal(track.stopped, true)
  assert.equal(video.srcObject, null)
  assert.deepEqual(events.map(([state]) => state), ['starting'])
})

test('negação e desconexão aparecem como problemas de captura', async () => {
  const denied = setup(() => Promise.reject(new DOMException('denied', 'NotAllowedError')))
  assert.equal(await denied.camera.start(), false)
  assert.match(denied.events.at(-1)[1], /bloqueada/)
  const lost = setup()
  await lost.camera.start()
  lost.track.dispatchEvent(new Event('ended'))
  assert.equal(lost.camera.active, false)
  assert.equal(lost.events.at(-1)[0], 'error')
  assert.match(lost.events.at(-1)[1], /interrompida/)
})
