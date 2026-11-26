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
previa=$(mktemp -d "$PWD/.cache/previa.XXXXXX")
trap 'rm -rf -- "$previa"' EXIT
mkdir -p "$previa/public"
(
  flock 9
  if [[ ! -x node_modules/.bin/vite ||
        ! -f node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm ||
        ! -f node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm ]] ||
      ! sha256sum --check --status node_modules/.librasia-lock.sha256 2>/dev/null; then
    npm ci --prefer-offline --no-fund
    sha256sum package-lock.json > node_modules/.librasia-lock.sha256
  fi
  npm run setup:vision
  cp -aL --reflink=auto public/. "$previa/public/"
) 9> .cache/librasia-deps.lock

modelo="${LIBRASIA_MODELO:-data/models/isolated-v1}"
if [[ -n "${LIBRASIA_MODELO:-}" || -f "$modelo/isolated.onnx" || -f "$modelo/isolated.json" ]]; then
  npm run setup:model -- "$modelo" "$previa/public/models"
elif [[ -f "$previa/public/models/isolated.onnx" && -f "$previa/public/models/isolated.json" ]]; then
  npm run setup:model -- "$previa/public/models" "$previa/public/models"
else
  printf '%s\n' 'O avatar e as atividades sem câmera estão disponíveis. Para reconhecer sinais, instale os pesos descritos em docs/avaliacao.md.'
fi

node --input-type=module - "$previa" <<'JS'
import { join } from 'node:path'
import { build } from 'vite'

const directory = process.argv[2]
await build({ publicDir: join(directory, 'public'), build: { outDir: join(directory, 'dist') } })
JS
porta="${LIBRASIA_PORTA:-4173}"
printf 'Abra http://127.0.0.1:%s/ no Chromium. Use Ctrl+C para encerrar.\n' "$porta"
npm run preview -- --host 127.0.0.1 --port "$porta" --strictPort --outDir "$previa/dist"
