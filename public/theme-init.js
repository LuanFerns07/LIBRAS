// Aplica o tema antes da primeira pintura: escolha salva ou tema do sistema.
// Arquivo próprio (e não script inline) por causa da Content-Security-Policy do vercel.json.
try {
  const saved = localStorage.getItem('librasia-tema')
  document.documentElement.dataset.theme = saved === 'dark' || saved === 'light' ? saved
    : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
} catch {}
