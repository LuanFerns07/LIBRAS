#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

pacote=
if [[ $# -ne 0 ]]; then
  if [[ $# -ne 2 || "$1" != --pacote || -z "$2" ]]; then
    printf '%s\n' 'Uso: ./scripts/executar-local.sh [--pacote DIRETORIO]' >&2
    exit 2
  fi
  pacote=$(realpath -m -- "$2")
fi

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

if [[ -n "$pacote" ]]; then
  revisao=$(git rev-parse --verify HEAD)
  alteracoes=$(git status --porcelain=v1 --untracked-files=normal)
fi

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

demonstracao="${LIBRASIA_DEMONSTRACAO:-0}"
modelo_padrao=data/models/isolated-v1
alfabeto_padrao=data/models/alphabet-live
if [[ "$demonstracao" == 1 ]]; then
  modelo_padrao=data/models/isolated-combined
  alfabeto_padrao=data/models/alphabet-r-completo
fi

modelo="${LIBRASIA_MODELO:-$modelo_padrao}"
if [[ "$demonstracao" == 1 || -n "${LIBRASIA_MODELO:-}" || -f "$modelo/isolated.onnx" || -f "$modelo/isolated.json" ]]; then
  npm run setup:model -- "$modelo" "$previa/public/models"
elif [[ -f "$previa/public/models/isolated.onnx" && -f "$previa/public/models/isolated.json" ]]; then
  npm run setup:model -- "$previa/public/models" "$previa/public/models"
else
  printf '%s\n' 'O avatar e as atividades sem câmera estão disponíveis. Para reconhecer sinais, instale os pesos descritos em docs/avaliacao.md.'
fi

alfabeto="${LIBRASIA_ALFABETO_MODELO:-$alfabeto_padrao}"
if [[ "$demonstracao" == 1 || -n "${LIBRASIA_ALFABETO_MODELO:-}" || -f "$alfabeto/alphabet.json" ]]; then
  mkdir -p "$previa/public/models"
  cp "$alfabeto/"{alphabet.json,alphabet.onnx} "$previa/public/models/"
  for arquivo in alphabet-check.onnx alphabet-supplement.onnx alphabet-contrast.onnx alphabet-a-world.onnx \
    alphabet-q-shape.onnx alphabet-r-shape.onnx alphabet-y-shape.onnx; do
    if [[ -f "$alfabeto/$arquivo" ]]; then
      cp "$alfabeto/$arquivo" "$previa/public/models/"
    fi
  done
  movimento_padrao=data/models/alphabet-motion
  if [[ "$demonstracao" == 1 || -f data/models/alphabet-trajectory/alphabet-motion.json ]]; then
    movimento_padrao=data/models/alphabet-trajectory
  fi
  movimento="${LIBRASIA_ALFABETO_MOVIMENTO:-$movimento_padrao}"
  if [[ "$demonstracao" == 1 || -n "${LIBRASIA_ALFABETO_MOVIMENTO:-}" || -f "$movimento/alphabet-motion.json" ]]; then
    cp "$movimento/alphabet-motion.json" "$previa/public/models/"
  fi
fi
if [[ "$demonstracao" == 1 ]]; then
  somas="$PWD/ml/evidence/demonstracao-modelos.sha256"
  if ! (cd "$previa/public/models" && sha256sum --check --strict "$somas"); then
    printf '%s\n' 'Os modelos da demonstração divergem da versão verificada. Consulte docs/previa-estavel.md.' >&2
    exit 1
  fi
fi

export VITE_LIBRASIA_CONTINUO=0
if [[ "${LIBRASIA_CONTINUO:-}" == 1 ]]; then
  if [[ ! -f "$previa/public/models/isolated.onnx" ]]; then
    printf '%s\n' 'A sinalização contínua precisa do classificador local de glosas. Informe LIBRASIA_MODELO.' >&2
    exit 1
  fi
  fronteiras="${LIBRASIA_FRONTEIRAS:-data/ufsc-boundaries/web}"
  glosas="${LIBRASIA_GLOSAS:-data/vlibrasbd-holdout}"
  destino="$previa/public/models/continuous"
  mkdir -p "$destino"
  cp "$fronteiras/"{boundary-model.onnx,boundary-model.json} "$destino/"
  cp "$glosas/"{monotone-web.json,monotone-web.manifest.json} "$destino/"
  export VITE_LIBRASIA_CONTINUO=1
fi

node --input-type=module - "$previa" <<'JS'
import { join } from 'node:path'
import { build } from 'vite'

const directory = process.argv[2]
await build({ publicDir: join(directory, 'public'), build: { outDir: join(directory, 'dist') } })
JS

if [[ -n "$pacote" ]]; then
  test -f "$previa/dist/models/isolated.json"
  mkdir -- "$previa/dist/validacao"
  cp qa/{index.html,interface.js,registro.css,registro.js} "$previa/dist/validacao/"
  cp scripts/servir-previa.py "$previa/iniciar.py"
  cp vercel.json "$previa/vercel.json"
  node --input-type=module - "$previa/dist" "$revisao" "${alteracoes:+rascunho}" <<'JS'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { catalogVersion } from './src/catalog.js'

const [, , directory, revision, initialState] = process.argv
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const finalRevision = git('rev-parse', '--verify', 'HEAD')
const finalChanges = git('status', '--porcelain=v1', '--untracked-files=normal')
const draft = initialState === 'rascunho' || finalChanges.length > 0 || revision !== finalRevision
const commit = draft ? `rascunho ${revision}` : revision
if (draft) console.log('Pacote de rascunho. A ficha de validação sinalizará as alterações locais.')
const [model, manifest] = await Promise.all([
  readFile(join(directory, 'models/isolated.onnx')),
  readFile(join(directory, 'models/isolated.json')),
])
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const version = {
  commit,
  catalog: catalogVersion,
  avatar: commit,
  modelSha256: sha256(model),
  manifestSha256: sha256(manifest),
}
const models = join(directory, 'models')
const alphabetFiles = (await readdir(models)).filter(name => /^alphabet(?:-[a-z-]+)?\.(?:json|onnx)$/u.test(name)).sort()
if (alphabetFiles.includes('alphabet.json')) {
  const checksums = await Promise.all(alphabetFiles.map(async name => {
    return sha256(await readFile(join(models, name))) + '  ' + name + '\n'
  }))
  version.alphabetSha256 = sha256(checksums.join(''))
}
await writeFile(join(directory, 'commit.txt'), commit + '\n')
await writeFile(join(directory, 'validacao/versao.json'), JSON.stringify(version, null, 2) + '\n')
JS
  mkdir -p -- "$(dirname -- "$pacote")"
  mkdir -- "$pacote"
  trap 'rm -rf -- "$previa" "$pacote"' EXIT
  cp -a "$previa/dist" "$pacote/site"
  cp "$previa/"{iniciar.py,vercel.json} "$pacote/"
  (
    cd -- "$pacote"
    { printf '%s\0' iniciar.py vercel.json; find site -type f -print0; } |
      LC_ALL=C sort -z | xargs -0 sha256sum -- > SHA256SUMS
  )
  trap 'rm -rf -- "$previa"' EXIT
  printf 'Pacote pronto em %s. Abra com python3 %s/iniciar.py.\n' "$pacote" "$pacote"
  exit
fi

porta="${LIBRASIA_PORTA:-4173}"
printf 'Abra http://127.0.0.1:%s/ no Chromium. Use Ctrl+C para encerrar.\n' "$porta"
npm run preview -- --host 127.0.0.1 --port "$porta" --strictPort --outDir "$previa/dist"
