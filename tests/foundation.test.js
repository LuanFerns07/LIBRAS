import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { references } from '../src/references.js'
import { credits, pages } from '../src/shell.js'

test('a navegação tem endereços distintos e inclui as cinco áreas', () => {
  assert.deepEqual(pages.map(page => page.id), [
    'praticar', 'alfabeto', 'tradutor', 'area-livre', 'saiba-mais',
  ])
})

test('as referências têm título, autoria e endereços HTTPS distintos', () => {
  assert.equal(references.length, 7)
  const urls = references.map(([title, author, url]) => {
    assert.ok(title.length && author.length)
    assert.equal(new URL(url).protocol, 'https:')
    return url
  })
  assert.equal(new Set(urls).size, urls.length)
})

test('o aplicativo e o README usam a mesma declaração de créditos', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8')
  assert.ok(readme.includes(credits))
})
