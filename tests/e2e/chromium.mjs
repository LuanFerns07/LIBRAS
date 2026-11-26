import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve as resolvePath } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

export async function withChromium(check, { fakeCamera = true, videoFile } = {}) {
  const profile = await mkdtemp(join(tmpdir(), 'librasia-chromium-'))
  const flags = [
    '--headless',
    '--no-first-run',
    '--disable-background-networking',
    '--no-default-browser-check',
    '--remote-debugging-pipe',
    '--enable-speech-dispatcher',
    '--enable-unsafe-swiftshader',
    '--user-data-dir=' + profile,
  ]
  if (fakeCamera || videoFile) flags.push('--use-fake-device-for-media-stream')
  if (videoFile) flags.push('--use-file-for-fake-video-capture=' + resolvePath(videoFile))

  const child = spawn(process.env.LIBRASIA_CHROMIUM || 'chromium', flags, {
    stdio: ['ignore', 'ignore', 'inherit', 'pipe', 'pipe'],
  })
  const [requests, responses] = child.stdio.slice(3)
  const pending = new Map()
  const listeners = new Map()
  const closed = once(child, 'close').catch(() => {})
  let nextId = 0
  let buffered = ''

  function failPending(error) {
    for (const request of pending.values()) request.reject(error)
  }
  child.on('error', failPending)
  child.on('exit', (code, signal) => failPending(new Error('O Chromium encerrou (' + (signal ?? code) + ').')))
  requests.on('error', failPending)
  responses.on('error', failPending)
  responses.setEncoding('utf8')
  responses.on('data', chunk => {
    const messages = (buffered + chunk).split('\0')
    buffered = messages.pop()
    for (const message of messages) {
      const response = JSON.parse(message)
      if (response.method) {
        listeners.get(response.method)?.(response.params)
        continue
      }
      const request = pending.get(response.id)
      if (!request) continue
      if (response.error) request.reject(new Error(response.error.message))
      else request.resolve(response.result)
    }
  })

  function command(method, params = {}, sessionId) {
    const id = ++nextId
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Tempo esgotado em ' + method + '.')), 12000)
      pending.set(id, {
        resolve: value => {
          clearTimeout(timeout)
          resolve(value)
        },
        reject: error => {
          clearTimeout(timeout)
          reject(error)
        },
      })
      requests.write(JSON.stringify({ id, method, params, sessionId }) + '\0')
    }).finally(() => pending.delete(id))
  }

  try {
    const { targetId } = await command('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await command('Target.attachToTarget', { targetId, flatten: true })
    const page = (method, params) => command(method, params, sessionId)
    const evaluate = async (expression, userGesture = false) => {
      const { result, exceptionDetails } = await page('Runtime.evaluate', {
        expression, userGesture, awaitPromise: true, returnByValue: true,
      })
      if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text)
      return result.value
    }
    const waitUntil = async (expression, timeout = 8000) => {
      const deadline = Date.now() + timeout
      while (Date.now() < deadline) {
        const value = await evaluate(expression).catch(error => {
          // A navegação pode substituir o contexto em que a expressão foi enviada.
          if (!/cannot find context|execution context was destroyed|inspected target/i.test(error.message)) throw error
        })
        if (value) return value
        await delay(50)
      }
      throw new Error('A condição não apareceu no navegador: ' + expression)
    }
    const navigate = async url => {
      const { errorText } = await page('Page.navigate', { url })
      if (errorText) throw new Error(errorText + ' ao abrir ' + url)
      await waitUntil('location.href === ' + JSON.stringify(url) + ' && document.readyState === "complete"')
    }
    const permission = (origin, setting) => command('Browser.setPermission', {
      permission: { name: 'camera' }, setting, origin,
    })
    const key = async (keyName, code) => {
      await page('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: keyName, code: keyName, windowsVirtualKeyCode: code })
      await page('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code: keyName, windowsVirtualKeyCode: code })
    }
    const listen = (method, handler) => listeners.set(method, handler)
    return await check({ page, evaluate, waitUntil, navigate, permission, key, listen })
  } finally {
    child.kill()
    await closed
    await rm(profile, { recursive: true, force: true })
  }
}
