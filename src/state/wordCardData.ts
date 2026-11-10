import type { WordCard } from './types'

interface ManifestChunk {
  file: string
  fromRank: number
  toRank: number
  cardCount: number
}

interface Manifest {
  // Changes whenever chunk contents are regenerated (e.g. a re-rank), so a
  // browser holding an older chunk file under the same name never mixes it
  // with a newer manifest.
  version?: string
  chunks: ManifestChunk[]
  totalCards: number
}

let cachedPromise: Promise<WordCard[]> | null = null

// Mirrors cardData.ts's manifest-first loading exactly, pointed at the word
// deck's own manifest/chunk files — new locked word batches land the same
// way, by editing public/data/word-manifest.json and dropping in a chunk.
export function loadAllWordCards(): Promise<WordCard[]> {
  if (!cachedPromise) {
    cachedPromise = fetchAllWordCards()
  }
  return cachedPromise
}

async function fetchAllWordCards(): Promise<WordCard[]> {
  const base = import.meta.env.BASE_URL
  // Always revalidated: the manifest is what decides which chunk URLs to ask for.
  const manifestRes = await fetch(`${base}data/word-manifest.json`, { cache: 'no-cache' })
  const manifest: Manifest = await manifestRes.json()
  const versionQuery = manifest.version ? `?v=${encodeURIComponent(manifest.version)}` : ''
  const chunkArrays = await Promise.all(
    manifest.chunks.map(async (chunk) => {
      const res = await fetch(`${base}data/${chunk.file}${versionQuery}`)
      return (await res.json()) as WordCard[]
    }),
  )
  return chunkArrays.flat().sort((a, b) => a.frequencyRank - b.frequencyRank)
}
