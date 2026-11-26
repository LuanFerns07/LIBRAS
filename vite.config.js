import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'))
const headers = Object.fromEntries(vercel.headers[0].headers.map(({ key, value }) => [key, value]))

export default defineConfig({
  server: {
    watch: { ignored: ['**/.venv/**', '**/.worktrees/**', '**/.cache/**', '**/data/**', '**/runs/**', '**/private/**'] },
  },
  preview: { headers },
})
