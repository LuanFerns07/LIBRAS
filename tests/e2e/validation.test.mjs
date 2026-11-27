import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { catalogVersion } from '../../src/catalog.js'
import { withChromium } from './chromium.mjs'

const appUrl = process.env.LIBRASIA_TEST_URL
const testValidation = process.env.LIBRASIA_TEST_VALIDATION === '1'

test('a ficha local abre no pacote e exporta observações com a versão servida', {
  skip: !appUrl || !testValidation,
  timeout: 25000,
}, async context => {
  const url = new URL('/validacao/', appUrl)
  const files = ['/commit.txt', '/models/isolated.onnx', '/models/isolated.json']
  const [commitFile, model, manifest] = await Promise.all(files.map(async file => {
    const response = await fetch(new URL(file, url))
    assert.ok(response.ok, file)
    return Buffer.from(await response.arrayBuffer())
  }))
  const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
  const commit = commitFile.toString().trim()
  const version = { commit, catalog: catalogVersion, avatar: commit, modelSha256: sha256(model), manifestSha256: sha256(manifest) }
  const downloads = await mkdtemp(join(tmpdir(), 'librasia-validacao-'))
  context.after(() => rm(downloads, { recursive: true, force: true }))

  await withChromium(async ({ navigate, evaluate, waitUntil, page, listen }) => {
    const requests = []
    listen('Network.requestWillBeSent', ({ request }) => requests.push(request))
    await page('Network.enable')
    await page('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads })
    await navigate(url.href)
    await evaluate('document.querySelector("#load-version").click()')
    await waitUntil('document.querySelector("#version-status").textContent === "Versão do pacote preenchida."')
    assert.deepEqual(await evaluate(`(() => {
      const fields = document.querySelector('#session-form').elements
      return Object.fromEntries(${JSON.stringify(Object.keys(version))}.map(name => [name, fields[name].value]))
    })()`), version)

    await evaluate(`(() => {
      const form = document.querySelector('#session-form')
      for (const [name, value] of Object.entries({
        sessionId: 'S01', participantId: 'P01', reviewerId: 'R01', outsideTraining: 'unknown',
        reviewerProfile: 'other', reviewerIndependent: 'no', system: 'Linux de teste',
        browser: 'Chromium', cpu: 'CPU de teste', gpu: 'GPU de teste', camera: 'Câmera de teste',
        cameraWidth: 640, cameraHeight: 480, sampleIntervalMs: 100,
      })) form.elements[name].value = value
      form.elements.consent.checked = true
      form.requestSubmit()
    })()`)
    await waitUntil('!document.querySelector("#workflow").hidden')

    await evaluate(`(() => {
      const form = document.querySelector('#attempt-form')
      for (const [name, value] of Object.entries({
        flow: 'free', condition: 'no-hand', lighting: 'regular', framing: 'adequate',
        referenceLabel: 'none', decision: 'inconclusive',
        classifierCalls: 0,
      })) form.elements[name].value = value
      form.requestSubmit()

      const checkpoint = document.querySelector('select[name="hands-return"]')
      checkpoint.value = 'inconclusive'
      checkpoint.dispatchEvent(new Event('change', { bubbles: true }))
    })()`)
    assert.equal(await evaluate('document.querySelector("#count").textContent'), '1 tentativa registrada.')
    await evaluate('document.querySelector("#download").click()', true)
    await waitUntil('document.querySelector("#download-status").textContent.startsWith("Download solicitado.")')

    const path = join(downloads, 'librasia-validacao-S01.json')
    let exported
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        exported = JSON.parse(await readFile(path, 'utf8'))
        break
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
        await delay(50)
      }
    }
    assert.ok(exported, 'O Chromium deve salvar o JSON da sessão.')
    assert.deepEqual(exported.version, version)
    assert.equal(exported.checkpoints['hands-return'], 'inconclusive')
    assert.equal(exported.checkpoints['alphabet-n'], 'pending')
    assert.equal(exported.attempts[0].application.decision, 'inconclusive')
    assert.equal(exported.attempts[0].application.classifierCalls, 0)
    assert.equal(exported.summary.byCondition['no-hand'], 1)
    assert.ok(requests.some(({ url: requested }) => requested === new URL('versao.json', url).href))
    assert.ok(requests.every(request => new URL(request.url).origin === url.origin && request.method === 'GET'))
    assert.deepEqual(await evaluate('[localStorage.length, sessionStorage.length]'), [0, 0])
  })
})
