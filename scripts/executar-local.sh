#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  printf '%s\n' 'Para executar o LibrasIA, instale Node.js 22 e npm.' >&2
  exit 1
fi
node --input-type=module -e '
  const [major, minor] = process.versions.node.split(".").map(Number)
  if (!(major === 20 && minor >= 19 || major === 22 && minor >= 12 || major > 22)) {
    console.error("Use Node.js 20.19 ou 22.12 em diante.")
    process.exit(1)
  }
'

mkdir -p .cache
(
  flock 9
  if [[ ! -x node_modules/.bin/vite ||
        ! -f node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm ||
        ! -f node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm ]] ||
      ! sha256sum --check --status node_modules/.librasia-lock.sha256 2>/dev/null; then
    npm ci --prefer-offline --no-fund
    sha256sum package-lock.json > node_modules/.librasia-lock.sha256
  fi
) 9> .cache/librasia-deps.lock

npm run setup:vision
modelo="${LIBRASIA_MODELO:-data/models/isolated-v1}"
if [[ -n "${LIBRASIA_MODELO:-}" || -f "$modelo/isolated.onnx" || -f "$modelo/isolated.json" ]]; then
  npm run setup:model -- "$modelo"
elif [[ ! -f public/models/isolated.onnx || ! -f public/models/isolated.json ]]; then
  printf '%s\n' 'O avatar e as atividades sem câmera estão disponíveis. Para reconhecer sinais, instale os pesos descritos em docs/avaliacao.md.'
fi

npm run build
porta="${LIBRASIA_PORTA:-4173}"
printf 'Abra http://127.0.0.1:%s/ no Chromium. Use Ctrl+C para encerrar.\n' "$porta"
exec npm run preview -- --host 127.0.0.1 --port "$porta" --strictPort
