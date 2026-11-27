import { readModelManifest } from './decision.js'

export async function localAsset(path) {
  const response = await fetch(import.meta.env.BASE_URL + path)
  if (!response.ok) throw new Error('O arquivo local do modelo está indisponível.')
  return response
}

export async function readSignalManifest() {
  const response = await localAsset('models/isolated.json')
  return readModelManifest(await response.json())
}
