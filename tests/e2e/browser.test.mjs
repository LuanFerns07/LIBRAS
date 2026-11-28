import assert from 'node:assert/strict'
import { once } from 'node:events'
import { access } from 'node:fs/promises'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { withChromium } from './chromium.mjs'
import { completeRecordedDemo } from './recorded-demo.mjs'

const captureAndStop = (async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  const [track] = stream.getVideoTracks()
  const captured = track.readyState === 'live' && track.getSettings().width > 0
  const label = track.label
  const width = track.getSettings().width
  const height = track.getSettings().height
  stream.getTracks().forEach(item => item.stop())
  return { captured, stopped: track.readyState === 'ended', label, width, height }
}).toString()

async function withTestOrigin(check) {
  const server = createServer((_, response) => {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end('<!doctype html><html lang="pt-BR"><title>Teste de mídia</title>')
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    return await check('http://127.0.0.1:' + server.address().port)
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
}

test('Chromium abre WebGL 2 e respeita permissões de captura com câmera de teste', async () => {
  await withTestOrigin(origin => withChromium(async ({ permission, evaluate, navigate }) => {
    await navigate(origin + '/')
    assert.equal(await evaluate('isSecureContext && !!document.createElement("canvas").getContext("webgl2")'), true)
    await permission(origin, 'granted')
    const { captured, stopped } = await evaluate('(' + captureAndStop + ')()')
    assert.deepEqual({ captured, stopped }, { captured: true, stopped: true })

    await permission(origin, 'denied')
    assert.equal(await evaluate('navigator.mediaDevices.getUserMedia({ video: true }).then(() => "aceita", error => error.name)'), 'NotAllowedError')
  }))
})

test('Chromium abre e libera a webcam física quando habilitado explicitamente', {
  skip: process.env.LIBRASIA_TEST_PHYSICAL !== '1',
}, async context => {
  await withTestOrigin(origin => withChromium(async ({ permission, evaluate, navigate }) => {
    await navigate(origin + '/')
    await permission(origin, 'granted')
    const result = await evaluate('(' + captureAndStop + ')()')
    assert.equal(result.captured, true)
    assert.equal(result.stopped, true)
    context.diagnostic(result.label + ' · ' + result.width + '×' + result.height)
  }, { fakeCamera: false }))
})

test('Chromium conclui a síntese local em pt-BR quando habilitada explicitamente', {
  skip: process.env.LIBRASIA_TEST_VOICE !== '1',
}, async context => {
  await withTestOrigin(origin => withChromium(async ({ evaluate, waitUntil, navigate }) => {
    await navigate(origin + '/')
    const voice = await waitUntil('speechSynthesis.getVoices().find(v => v.localService && v.lang.replaceAll("_", "-").toLowerCase() === "pt-br")?.name')
    context.diagnostic(voice)
    const speak = (() => new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance('Teste de voz do LibrasIA.')
      utterance.lang = 'pt-BR'
      utterance.voice = speechSynthesis.getVoices().find(v => v.localService && v.lang.replaceAll('_', '-').toLowerCase() === 'pt-br')
      utterance.onend = () => resolve('end')
      utterance.onerror = event => reject(new Error(event.error))
      speechSynthesis.speak(utterance)
    })).toString()
    assert.equal(await evaluate('(' + speak + ')()', true), 'end')
  }, { fakeCamera: false }))
})

const appUrl = process.env.LIBRASIA_TEST_URL
const demoVideo = process.env.LIBRASIA_TEST_DEMO_VIDEO

test('aplicação compilada navega, reproduz o avatar, traduz e controla a câmera', {
  skip: !appUrl,
}, async context => {
  const url = new URL('/', appUrl)
  const base = url.href
  const origin = url.origin
  const physical = process.env.LIBRASIA_TEST_PHYSICAL === '1'
  const voiceEnabled = process.env.LIBRASIA_TEST_VOICE === '1'
  if (physical || demoVideo) assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Use a prévia local para testar a câmera.')
  if (demoVideo) {
    assert.ok(!physical, 'Execute a demonstração gravada em uma rodada separada do teste da câmera física.')
    await access(demoVideo)
  }
  await withChromium(async browser => {
    const { page, navigate, evaluate, waitUntil, permission, key } = browser
    const report = message => { if (demoVideo) context.diagnostic(message) }
    const click = selector => evaluate('document.querySelector(' + JSON.stringify(selector) + ').click()', true)
    const text = selector => evaluate('document.querySelector(' + JSON.stringify(selector) + ').textContent.trim()')
    const open = async (route, heading) => {
      await click('[data-page="' + route + '"]')
      await waitUntil('document.querySelector("main h1")?.textContent === ' + JSON.stringify(heading))
      assert.equal(await evaluate('document.querySelector("[aria-current=page]").dataset.page'), route)
      assert.equal(await evaluate('document.activeElement.id'), 'conteudo')
    }

    await page('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
    await navigate(base)
    assert.equal(await text('h1'), 'Pratique Libras')
    assert.equal(await evaluate('document.querySelector("video").srcObject'), null)
    assert.equal(await evaluate('document.querySelector("[data-camera-toggle]").disabled'), true)
    assert.equal(await evaluate('document.querySelectorAll(".media-layout > section")[0].getBoundingClientRect().top === document.querySelectorAll(".media-layout > section")[1].getBoundingClientRect().top'), true)

    await page('Page.navigate', { url: base + '#alfabeto' })
    await waitUntil('location.hash === "#area-livre" && document.querySelector("main h1")?.textContent === "Área livre"')
    assert.equal(await evaluate('document.querySelector("[data-page=alfabeto]")'), null)
    assert.equal(await evaluate('document.querySelector("[aria-current=page]").dataset.page'), 'area-livre')
    assert.equal(await evaluate('!!document.querySelector("[data-avatar] canvas").getContext("webgl2")'), true)
    assert.equal(await evaluate('Array.from(document.querySelectorAll(".letter-grid button"), el => el.textContent).join("")'), 'ABCDEFGHIJKLMNOPQRSTUVWXYZÇ')
    await evaluate('document.querySelector("[data-hand-points]").focus()')
    await key('Tab', 9)
    assert.equal(await evaluate('document.activeElement.textContent'), 'A')
    assert.equal(await evaluate('document.activeElement.matches(":focus-visible") && getComputedStyle(document.activeElement).outlineStyle !== "none"'), true)
    await key('ArrowRight', 39)
    assert.equal(await text('[aria-pressed="true"]'), 'B')
    await key('End', 35)
    assert.equal(await text('[aria-pressed="true"]'), 'Ç')
    await key('ArrowLeft', 37)
    assert.equal(await text('[aria-pressed="true"]'), 'Z')
    await click('[data-play]')
    assert.equal(await text('[data-play]'), 'Pausar')
    await click('[data-play]')
    assert.equal(await text('[data-play]'), 'Reproduzir')
    await evaluate('document.querySelector("[data-speed]").value = ".65"; document.querySelector("[data-speed]").dispatchEvent(new Event("change"))')
    await click('[data-restart]')
    assert.equal(await text('[data-play]'), 'Pausar')
    await click('[data-comparison="0"]')
    assert.match(await text('[data-comparison-status]'), /Em A.*Em S/)
    assert.equal(await text('[data-player-step]'), 'A')
    await click('[data-comparison="2"]')
    assert.match(await text('[data-comparison-status]'), /Em M.*Em N/)
    assert.equal(await text('[data-player-step]'), 'M')
    await waitUntil('document.querySelector("[data-player-step]").textContent.trim() === "N"')
    await click('[data-comparison="3"]')
    assert.match(await text('[data-comparison-status]'), /Em N.*Em U/)
    assert.equal(await text('[data-player-step]'), 'N')
    await waitUntil('document.querySelector("[data-player-step]").textContent.trim() === "U"')
    const selectLetters = (() => Array.from(document.querySelectorAll('.letter-grid button'), button => {
      button.click()
      return {
        letter: document.querySelector('[data-player-step]').textContent.trim(),
        playable: !document.querySelector('[data-play]').disabled,
      }
    })).toString()
    assert.deepEqual(await evaluate('(' + selectLetters + ')()', true),
      Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZÇ', letter => ({ letter, playable: true })))
    report('1. Alfabeto · 27 letras acessíveis e reprodução de Z controlada pelo navegador.')

    await open('tradutor', 'Português para Libras')
    const fill = value => evaluate('document.querySelector("#translate-input").value = ' + JSON.stringify(value) +
      '; document.querySelector("#translate-input").dispatchEvent(new Event("input"))')
    const submit = () => click('form [type="submit"]')
    const checkPlayback = async expected => {
      const record = (() => {
        const step = document.querySelector('[data-player-step]')
        const steps = []
        const observer = new MutationObserver(() => steps.push(step.textContent.trim()))
        observer.observe(step, { childList: true })
        window.recordedSteps = () => {
          observer.disconnect()
          return steps
        }
      }).toString()
      if (await text('[data-play]') === 'Pausar') await click('[data-play]')
      await evaluate('(' + record + ')()')
      await click('[data-restart]')
      await waitUntil('document.querySelector("[data-play]").textContent === "Reproduzir"', 15000)
      assert.deepEqual(await evaluate('window.recordedSteps()'), expected)
    }
    await fill('')
    await submit()
    assert.equal(await evaluate('document.querySelector("[data-translation-status]").dataset.state'), 'empty')
    await fill('Meu nome é Anna')
    await submit()
    assert.equal(await evaluate('document.querySelector("[data-translation-status]").dataset.state'), 'ready')
    assert.equal(await text('[data-player-step]'), 'Nome')
    await checkPlayback(['Nome', 'Meu', 'Pausa', 'A', 'N', 'N', 'A'])
    report('2. Frase · Nome → Meu → Pausa → A → N → N → A.')
    await fill('Bom dia')
    await submit()
    assert.match(await text('[data-translation-status]'), /BOM DIA/)
    assert.equal(await text('[data-player-step]'), 'Bom')
    await fill('Bom dia! Meu nome é Ivo.')
    await submit()
    assert.match(await text('[data-translation-status]'), /BOM DIA.*NOME MEU/u)
    await checkPlayback(['Bom', 'Dia', 'Pausa', 'Nome', 'Meu', 'Pausa', 'I', 'V', 'O'])
    await click('[data-student="minds"]')
    assert.equal(await text('[data-player-step]'), 'Aluno')
    await click('[data-student="fortaleza"]')
    assert.match(await text('[data-player-step]'), /Aluno · Forma histórica/)
    await fill('Entrada fora do catálogo')
    assert.equal(await evaluate('document.querySelector("[data-play]").disabled'), true)
    await submit()
    assert.equal(await evaluate('document.querySelector("[data-translation-status]").dataset.state'), 'unsupported')
    await click('input[name="modo"]')
    await fill('Ânna Clara')
    await submit()
    assert.equal(await text('[data-player-step]'), 'A')
    await checkPlayback(['A', 'N', 'N', 'A', 'Pausa', 'C', 'L', 'A', 'R', 'A'])
    report('3. Nome · A → N → N → A → Pausa → C → L → A → R → A.')
    await fill('Ânna‑Graça')
    await submit()
    assert.equal(await evaluate('document.querySelector("[data-translation-status]").dataset.state'), 'ready')
    await checkPlayback(['A', 'N', 'N', 'A', 'Pausa', 'G', 'R', 'A', 'Ç', 'A'])

    if (demoVideo) {
      await completeRecordedDemo(browser, { open, click, origin, report })
      return
    }

    await open('praticar', 'Pratique Libras')
    assert.equal(await text('[data-practice-compare]'), 'Comparar com Espelho')
    await click('[data-practice-compare]')
    assert.match(await text('#practice-contrast'), /Espelho.*rotação do punho/u)
    await checkPlayback(['Cinco', 'Espelho'])
    assert.equal(await evaluate('document.querySelector("[data-signal]").value'), 'signal-cinco')
    assert.equal(await evaluate('document.querySelector("video").srcObject'), null)
    await click('[data-practice-compare]')
    assert.equal(await evaluate('document.querySelector("#practice-contrast").hidden'), true)
    await checkPlayback(['Cinco'])
    await click('[data-quiz] input[value="0"]')
    await click('.practice-activity [type="submit"]')
    assert.match(await text('[data-quiz-status]'), /Resposta correta/)
    await click('[data-review]')
    assert.match(await text('[data-stage-title]'), /Cinco · Praticar com ajuda/)
    assert.equal(await evaluate('document.activeElement.dataset.stage'), '1')
    assert.equal(await evaluate('document.querySelector("[data-practice-compare]").hidden'), true)
    await evaluate('window.oldDocument = true')
    await page('Page.reload')
    await waitUntil('!window.oldDocument && document.readyState === "complete" && !!document.querySelector("[data-review]")')
    await click('[data-review]')
    assert.match(await text('[data-stage-title]'), /Cinco · Praticar com ajuda/)

    if (!voiceEnabled) await evaluate('Object.defineProperty(window, "speechSynthesis", { value: undefined, configurable: true }); true')
    await open('area-livre', 'Área livre')
    const historyBeforeSkip = await evaluate('history.length')
    await evaluate('document.querySelector(".skip-link").focus()')
    await key('Enter', 13)
    await waitUntil('document.activeElement.id === "conteudo"')
    assert.equal(await evaluate('location.hash'), '#area-livre')
    assert.equal(await evaluate('history.length'), historyBeforeSkip)
    await key('Tab', 9)
    assert.equal(await evaluate('document.activeElement.matches("[data-camera-toggle]")'), true)

    await permission(origin, 'denied')
    await click('[data-camera-toggle]')
    await waitUntil('document.querySelector("[data-capture-status]").dataset.state === "capture-error"')
    assert.match(await text('[data-capture-status]'), /bloqueada|permissão/i)
    await permission(origin, 'granted')
    await click('[data-camera-toggle]')
    await waitUntil('document.querySelector("[data-camera-state]").textContent === "Ativa"')
    await evaluate('window.hiddenCameraTrack = document.querySelector("video").srcObject.getVideoTracks()[0]')
    const blank = await page('Target.createTarget', { url: 'about:blank', background: false })
    await page('Target.activateTarget', { targetId: blank.targetId })
    await waitUntil('document.hidden && window.hiddenCameraTrack.readyState === "ended"')
    assert.match(await text('[data-capture-status]'), /Câmera desativada ao sair da aba/)
    await page('Page.bringToFront')
    await waitUntil('!document.hidden')
    await page('Target.closeTarget', { targetId: blank.targetId })
    await click('[data-camera-toggle]')
    await waitUntil('document.querySelector("[data-camera-state]").textContent === "Ativa"')
    await evaluate('window.previousCameraTrack = document.querySelector("video").srcObject.getVideoTracks()[0]')
    await evaluate('document.querySelector("#transcription").value = "Texto editado do LibrasIA."')
    if (voiceEnabled) {
      await waitUntil('speechSynthesis.getVoices().some(v => v.localService && v.lang.replaceAll("_", "-").toLowerCase() === "pt-br")')
      await evaluate(`const speak = speechSynthesis.speak.bind(speechSynthesis)
        speechSynthesis.speak = utterance => {
          window.lastUtterance = utterance.text
          speak(utterance)
        }
        document.querySelector('#transcription').value = 'Transcrição anterior do LibrasIA. '.repeat(14)`)
      await click('[data-speak]')
      await waitUntil('speechSynthesis.speaking')
      await evaluate('document.querySelector("#transcription").select()')
      const edited = 'Transcrição atualizada.'
      await page('Input.insertText', { text: edited })
      assert.equal(await evaluate('document.querySelector("#transcription").value'), edited)
      assert.equal(await evaluate('document.querySelector("[data-voice-status]").dataset.state'), 'interrupted')
      await waitUntil('!speechSynthesis.speaking && !speechSynthesis.pending')
      await click('[data-speak]')
      await waitUntil('document.querySelector("[data-voice-status]").dataset.state === "accepted"')
      assert.equal(await evaluate('window.lastUtterance'), edited)
      assert.equal(await text('[data-voice-status]'), 'Leitura concluída.')
      context.diagnostic('A edição interrompeu a leitura da versão anterior e a voz local leu a versão atualizada.')
    } else {
      await click('[data-speak]')
      assert.equal(await evaluate('document.querySelector("[data-voice-status]").dataset.state'), 'unavailable')
      assert.equal(await evaluate('document.querySelector("#transcription").value'), 'Texto editado do LibrasIA.')
    }
    const transcription = 'document.querySelector("#transcription")'
    const draft = await evaluate(transcription + '.value')
    const storage = 'JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)])'
    const storageBefore = await evaluate(storage)
    await open('tradutor', 'Português para Libras')
    assert.equal(await evaluate('window.previousCameraTrack.readyState'), 'ended')
    await open('area-livre', 'Área livre')
    assert.equal(await evaluate(transcription + '.value'), draft)
    assert.equal(await evaluate('document.querySelector("video").srcObject'), null)
    assert.equal(await evaluate(storage), storageBefore)
    await click('[data-clear]')
    assert.equal(await evaluate('document.activeElement.id'), 'transcription')
    assert.equal(await evaluate(transcription + '.value'), '')

    await open('saiba-mais', 'Saiba mais')
    assert.deepEqual(await evaluate('Array.from(document.querySelectorAll("main li a"), a => new URL(a.href).hostname)'), [
      'indl.iphan.gov.br', 'editora.ufsc.br', 'm.grupoa.com.br', 'dicionario.ines.gov.br',
      'manuario.ines.gov.br', 'corpuslibras.ufsc.br', 'faced.ufc.br',
    ])
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('.reference-list a')).every(link =>
      link.target === '_blank' && link.relList.contains('noopener') && link.relList.contains('noreferrer'))`), true)
    assert.match(await text('footer'), /sem fins lucrativos, desenvolvida por Luan Fernandes e Wellington Sales/u)

    await open('area-livre', 'Área livre')
    assert.equal(await evaluate(transcription + '.value'), '')
    await evaluate(transcription + '.focus()')
    const temporaryText = 'Mensagem temporária.\nSegunda linha.'
    await page('Input.insertText', { text: temporaryText })
    await open('saiba-mais', 'Saiba mais')
    await open('area-livre', 'Área livre')
    assert.equal(await evaluate(transcription + '.value'), temporaryText)
    await evaluate('window.previousDocument = true')
    await page('Page.reload')
    await waitUntil('!window.previousDocument && !!' + transcription)
    assert.equal(await evaluate(transcription + '.value'), '')

    await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 840, deviceScaleFactor: 1, mobile: true })
    await open('praticar', 'Pratique Libras')
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true)
    assert.equal(await evaluate('document.querySelectorAll(".media-layout > section")[0].getBoundingClientRect().bottom <= document.querySelectorAll(".media-layout > section")[1].getBoundingClientRect().top'), true)

    if (process.env.LIBRASIA_TEST_SCREENSHOT) {
      const { data } = await page('Page.captureScreenshot', { format: 'png' })
      const { writeFile } = await import('node:fs/promises')
      await writeFile(process.env.LIBRASIA_TEST_SCREENSHOT, Buffer.from(data, 'base64'))
    }

    await page('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
    const tap = async selector => {
      const point = await evaluate(`(() => {
        const control = document.querySelector(${JSON.stringify(selector)})
        control.scrollIntoView({ block: 'center' })
        const rect = control.getBoundingClientRect()
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
      })()`)
      await page('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
      await page('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    const fit = width => evaluate(`document.documentElement.clientWidth === ${width} && document.documentElement.scrollWidth <= ${width}`)
    await tap('[data-page="area-livre"]')
    await waitUntil('document.querySelector("main h1")?.textContent === "Área livre"')
    assert.equal(await fit(390), true)
    assert.equal(await evaluate(`(() => {
      const camera = document.querySelector('video').closest('.media-card').getBoundingClientRect()
      const alphabet = document.querySelector('[data-alphabet-reference]').getBoundingClientRect()
      const transcription = document.querySelector('.free-transcription').getBoundingClientRect()
      return camera.bottom <= alphabet.top && alphabet.bottom <= transcription.top
    })()`), true)
    await tap('.letter-grid button:last-child')
    assert.equal(await text('[data-player-step]'), 'Ç')

    await page('Emulation.setDeviceMetricsOverride', { width: 320, height: 680, deviceScaleFactor: 1, mobile: true })
    for (const route of ['praticar', 'tradutor', 'saiba-mais', 'area-livre']) {
      await tap(`[data-page="${route}"]`)
      await waitUntil('document.querySelector("[aria-current=page]")?.dataset.page === ' + JSON.stringify(route))
      assert.equal(await fit(320), true, route)
    }
    await tap('[data-camera-toggle]')
    await waitUntil('document.querySelector("[data-camera-state]").textContent === "Ativa"')
    await evaluate('window.touchTrack = document.querySelector("video").srcObject.getVideoTracks()[0]')
    await page('Emulation.setDeviceMetricsOverride', {
      width: 840, height: 390, deviceScaleFactor: 1, mobile: true,
      screenOrientation: { type: 'landscapePrimary', angle: 90 },
    })
    assert.equal(await fit(840), true)
    assert.equal(await evaluate(`(() => {
      const [track] = document.querySelector('video').srcObject.getVideoTracks()
      return track === window.touchTrack && track.readyState === 'live'
    })()`), true)
    await tap('[data-page="saiba-mais"]')
    await waitUntil('window.touchTrack.readyState === "ended"')
    context.diagnostic('Toque em 390 e 320 px, rotação com a câmera ativa e liberação da trilha passaram.')
  }, { fakeCamera: !physical, videoFile: demoVideo })
})
