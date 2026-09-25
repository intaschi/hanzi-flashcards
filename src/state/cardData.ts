import type { Card } from './types'

interface ManifestChunk {
  file: string
  fromRank: number
  toRank: number
  cardCount: number
}

interface Manifest {
  chunks: ManifestChunk[]
  totalCards: number
}

let cachedPromise: Promise<Card[]> | null = null

// Loaded manifest-first so new locked batches can be added later just by editing
// public/data/manifest.json + dropping in a new chunk file, no code change needed.
export function loadAllCards(): Promise<Card[]> {
  if (!cachedPromise) {
    cachedPromise = fetchAllCards()
  }
  return cachedPromise
}

async function fetchAllCards(): Promise<Card[]> {
  const base = import.meta.env.BASE_URL
  const manifestRes = await fetch(`${base}data/manifest.json`)
  const manifest: Manifest = await manifestRes.json()
  const chunkArrays = await Promise.all(
    manifest.chunks.map(async (chunk) => {
      const res = await fetch(`${base}data/${chunk.file}`)
      return (await res.json()) as Card[]
    }),
  )
  return chunkArrays.flat().sort((a, b) => a.frequencyRank - b.frequencyRank)
}
