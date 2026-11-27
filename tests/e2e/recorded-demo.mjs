import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import { beginAtMarker, finish } from './recorded-capture.mjs'

const colors = {
  green: [false, true, false],
  blue: [false, false, true],
  magenta: [true, false, true],
  red: [true, false, false],
}

export async function completeRecordedDemo(browser, { open, click, origin, report }) {
  const { page, evaluate, waitUntil, permission, listen } = browser
  const status = 'document.querySelector("[data-capture-status]")'
  const unexpectedRequests = []
  listen('Network.requestWillBeSent', ({ request }) => {
    const url = new URL(request.url)
    if (['blob:', 'data:'].includes(url.protocol)) return
    if (url.origin !== origin || request.method !== 'GET') unexpectedRequests.push(request.url)
  })
  await page('Network.enable')

  async function waitForCapture() {
    await waitUntil(`["recording", "unavailable", "capture-error"].includes(${status}.dataset.state)`, 20000)
    assert.equal(await evaluate(status + '.dataset.state'), 'recording', await evaluate(status + '.textContent'))
  }

  async function startCamera() {
    await click('[data-camera-toggle]')
    await waitUntil('document.querySelector("[data-camera-state]").textContent === "Ativa"')
    await click('[data-attempt]')
    await waitForCapture()
    await evaluate('(' + finish + ')()', true)
  }

  async function capture(color, state) {
    const args = [0, true, colors[color]]
    const { startMs } = await evaluate('(' + beginAtMarker + ')(...' + JSON.stringify(args) + ')', true, 28000)
    await waitForCapture()
    const result = await evaluate('(' + finish + ')(false,' + (startMs + 3850) + ')', true)
    assert.equal(result.state, state, result.message)
    return result.message
  }

  await open('praticar', 'Pratique Libras')
  await evaluate(`const picker = document.querySelector('[data-signal]');
    picker.value = 'signal-amarelo'; picker.dispatchEvent(new Event('change'))`)
  await click('[data-quiz] input[value="2"]')
  await click('.practice-activity [type="submit"]')
  assert.equal(await evaluate('document.querySelector("[data-quiz-status]").dataset.state'), 'accepted')
  await click('[data-stage="1"]')
  await permission(origin, 'granted')
  await startCamera()
  const accepted = await capture('green', 'accepted')
  assert.match(accepted, /Amarelo foi reconhecido/u)
  const hint = await capture('blue', 'hint')
  assert.match(hint, /Desloque o indicador da testa em direção ao nariz/u)
  await evaluate('window.lessonTrack = document.querySelector("video").srcObject.getVideoTracks()[0]')
  report('4. Prática de Amarelo · ' + accepted + ' ' + hint)

  await open('area-livre', 'Libras para texto e voz')
  assert.equal(await evaluate('window.lessonTrack.readyState'), 'ended')
  await startCamera()
  await capture('magenta', 'accepted')
  assert.equal(await evaluate('document.querySelector("#transcription").value'), 'cinco')
  await capture('red', 'accepted')
  assert.equal(await evaluate('document.querySelector("#transcription").value'), 'cinco espelho')
  await evaluate('window.freeTrack = document.querySelector("video").srcObject.getVideoTracks()[0]')
  await open('alfabeto', 'Alfabeto manual')
  assert.equal(await evaluate('window.freeTrack.readyState'), 'ended')
  await open('area-livre', 'Libras para texto e voz')
  assert.equal(await evaluate('document.querySelector("video").srcObject'), null)
  assert.equal(await evaluate('document.querySelector("#transcription").value'), 'cinco espelho')
  await waitUntil('speechSynthesis.getVoices().some(v => v.localService && v.lang.replaceAll("_", "-").toLowerCase() === "pt-br")')
  await evaluate(`const speak = speechSynthesis.speak.bind(speechSynthesis);
    speechSynthesis.speak = utterance => {
      window.demoUtterance = utterance.text;
      speak(utterance);
    };
    document.querySelector('#transcription').select()`)
  const edited = 'Cinco e espelho.'
  await page('Input.insertText', { text: edited })
  await click('[data-speak]')
  await waitUntil('document.querySelector("[data-voice-status]").dataset.state === "accepted"')
  assert.equal(await evaluate('window.demoUtterance'), edited)
  report('5. Área livre · cinco espelho após voltar do Alfabeto · voz local leu a edição em pt-BR.')

  await open('saiba-mais', 'Saiba mais')
  assert.deepEqual(unexpectedRequests, [], 'A câmera e a voz devem funcionar com requisições apenas de arquivos locais.')
  const dictionary = 'https://dicionario.ines.gov.br/'
  const link = 'a[href="' + dictionary + '"]'
  assert.match(await evaluate('document.querySelector(' + JSON.stringify(link) + ').closest("li").textContent'),
    /Guilherme de Azambuja Lira.*Tanya Amara Felipe de Souza.*INES/su)
  await click(link)
  for (let turn = 0; turn < 30; turn += 1) {
    const { targetInfos } = await page('Target.getTargets')
    const target = targetInfos.find(info => info.url === dictionary && /Dicionário Libras/iu.test(info.title))
    if (target) {
      report('6. Saiba mais · ' + target.title + ' · ' + target.url)
      return
    }
    await delay(500)
  }
  assert.fail('O link de Saiba mais deve abrir o Dicionário Libras do INES.')
}
