export function brazilianVoice(voices) {
  return voices.find(voice => voice.localService && voice.lang.replaceAll('_', '-').toLowerCase() === 'pt-br')
}

export function mountSpeech(status, synthesis = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance) {
  let current

  function show(message, state) {
    status.hidden = false
    status.textContent = message
    status.dataset.state = state
  }

  function stop() {
    if (!current) return
    current = undefined
    synthesis.cancel()
  }

  function speak(text) {
    const message = text.trim()
    if (!message) {
      show('Digite ou sinalize algo antes de ouvir.', 'inconclusive')
      return
    }
    const voice = brazilianVoice(synthesis?.getVoices() ?? [])
    if (!Utterance || !voice) {
      show('A voz local em português brasileiro está indisponível. O texto continua disponível para edição.', 'unavailable')
      return
    }
    stop()
    const utterance = new Utterance(message)
    current = utterance
    utterance.lang = 'pt-BR'
    utterance.voice = voice
    utterance.onend = () => {
      if (current !== utterance) return
      current = undefined
      show('Leitura concluída.', 'accepted')
    }
    utterance.onerror = () => {
      if (current !== utterance) return
      current = undefined
      show('A leitura falhou. O texto continua disponível para edição.', 'unavailable')
    }
    try {
      synthesis.speak(utterance)
      show('Lendo o texto editado.', 'busy')
    } catch {
      utterance.onerror()
    }
  }
  return { speak, stop }
}
