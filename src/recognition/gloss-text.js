export const glossTranslatorSchema = 'vlibrasbd-monotone-v1'

const punctuation = /\[(?:ponto|[iİı]nterrogação|exclamação)\]/giu
const wordPattern = /[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu
const lookup = (map, key) => Object.hasOwn(map, key) ? map[key] : undefined
const emptyCounts = { total: 0, entries: [], counts: new Map() }

function normalizeGlosses(glosses, caseFolding) {
  if (!Array.isArray(glosses) || [...glosses].some(gloss => typeof gloss !== 'string')) {
    throw new TypeError('Forneça uma lista de glosas em texto.')
  }
  const input = glosses.join(' ').replace(punctuation, ' ').normalize('NFC')
  const folded = Array.from(input, char => lookup(caseFolding, char) ?? char.toLowerCase()).join('')
  return folded.match(wordPattern) ?? []
}

function countsFrom(table) {
  const index = new Map()
  return key => {
    const row = lookup(table, key)
    if (!row) return emptyCounts
    if (!index.has(key)) {
      const [total, entries] = row
      index.set(key, { total, entries, counts: new Map(entries) })
    }
    return index.get(key)
  }
}

function compareTokens(left, right) {
  for (let i = 0; i < Math.min(left.length, right.length); i += 1) {
    const a = left[i]
    const b = right[i]
    if (a === b) continue
    // O desempate do Python segue pontos de código Unicode.
    for (let j = 0; j < Math.min(a.length, b.length);) {
      const code = a.codePointAt(j)
      const difference = code - b.codePointAt(j)
      if (difference) return difference
      j += code > 0xffff ? 2 : 1
    }
    return a.length - b.length
  }
  return left.length - right.length
}

const rank = (a, b) => b.score - a.score || compareTokens(a.tokens, b.tokens)
const outputTokens = key => key ? key.split(' ') : []
const isRecord = value => value && typeof value === 'object' && !Array.isArray(value)

export function createGlossTranslator(artifact) {
  const { schema, parameters, beam, maxPhrase, start, end, tables, caseFolding } = artifact ?? {}
  if (schema !== glossTranslatorSchema || beam !== 6 || maxPhrase !== 3 || start !== '<início>' || end !== '<fim>'
      || !isRecord(parameters) || ![parameters.language, parameters.length, parameters.copy].every(Number.isFinite)
      || parameters.copy <= 0 || !isRecord(caseFolding) || !isRecord(tables)
      || !Number.isSafeInteger(tables.totalWords) || tables.totalWords < 0
      || !['phrases', 'left', 'right', 'bigrams', 'trigrams', 'words'].every(name => isRecord(tables[name]))) {
    throw new TypeError('Artefato do tradutor monotônico inválido.')
  }

  const phrases = countsFrom(tables.phrases)
  const leftContext = countsFrom(tables.left)
  const rightContext = countsFrom(tables.right)
  const bigrams = countsFrom(tables.bigrams)
  const trigrams = countsFrom(tables.trigrams)
  const wordPriorDenominator = tables.totalWords + 0.2 * (Object.keys(tables.words).length + 1)

  function candidates(source, position, width) {
    const word = source[position]
    const phrase = phrases(source.slice(position, position + width).join(' '))
    if (width > 1) {
      return phrase.entries.slice(0, 4).filter(([, count]) => count >= 2).map(([output, count]) => ({
        tokens: outputTokens(output),
        score: width * Math.log(count / phrase.total) - 0.20 * (width - 1),
      }))
    }

    const left = leftContext(`${source[position - 1] ?? start} ${word}`)
    const right = rightContext(`${word} ${source[position + 1] ?? end}`)
    const outputs = new Set([
      word,
      ...phrase.entries.slice(0, 5).map(([output]) => output),
      ...left.entries.slice(0, 3).map(([output]) => output),
      ...right.entries.slice(0, 3).map(([output]) => output),
    ])

    return Array.from(outputs, output => {
      const prior = ((phrase.counts.get(output) ?? 0) + parameters.copy * Number(output === word))
        / (phrase.total + parameters.copy)
      const probability = (prior + ((left.counts.get(output) ?? 0) + 3 * prior) / (left.total + 3)
        + ((right.counts.get(output) ?? 0) + 3 * prior) / (right.total + 3)) / 3
      return { tokens: outputTokens(output), score: Math.log(probability) }
    }).sort(rank).slice(0, beam)
  }

  return glosses => {
    const source = normalizeGlosses(glosses, caseFolding)
    if (!source.length) return []

    const languageScores = new Map()
    function logWord(first, second, word) {
      const context = `${first} ${second}`
      const cacheKey = `${context} ${word}`
      if (!languageScores.has(cacheKey)) {
        const prior = ((lookup(tables.words, word) ?? 0) + 0.2) / wordPriorDenominator
        const previous = bigrams(second)
        const bigram = ((previous.counts.get(word) ?? 0) + 8 * prior) / (previous.total + 8)
        const history = trigrams(context)
        const trigram = ((history.counts.get(word) ?? 0) + 5 * bigram) / (history.total + 5)
        languageScores.set(cacheKey, Math.log(trigram))
      }
      return languageScores.get(cacheKey)
    }

    const states = Array.from({ length: source.length + 1 }, () => new Map())
    states[0].set('', { tokens: [], score: 0 })
    for (let position = 0; position < source.length; position += 1) {
      const prefixes = [...states[position].values()].sort(rank).slice(0, beam)
      for (let width = 1; width <= Math.min(maxPhrase, source.length - position); width += 1) {
        const destination = states[position + width]
        for (const { tokens: emitted, score: translation } of candidates(source, position, width)) {
          for (const { tokens: prefix, score } of prefixes) {
            const history = [start, start, ...prefix.slice(-2), ...emitted]
            let language = 0
            if (parameters.language) {
              for (let i = history.length - emitted.length; i < history.length; i += 1) {
                language += logWord(history[i - 2], history[i - 1], history[i])
              }
            }
            const tokens = [...prefix, ...emitted]
            const key = tokens.join(' ')
            const proposal = score + translation + parameters.language * language + parameters.length * emitted.length
            if (proposal > (destination.get(key)?.score ?? -Infinity)) destination.set(key, { tokens, score: proposal })
          }
        }
      }
    }

    const final = Array.from(states[source.length].values(), ({ tokens, score }) => {
      const [first, second] = [start, start, ...tokens.slice(-2)].slice(-2)
      return { tokens, score: score + parameters.language * logWord(first, second, end) }
    })
    return final.sort(rank)[0].tokens
  }
}
