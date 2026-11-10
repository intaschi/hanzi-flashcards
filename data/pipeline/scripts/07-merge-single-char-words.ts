// Interleaves the finished single-character word cards (06's drafts, filled
// by the content-generation step) into the existing word deck by real
// SUBTLEX-CH frequency, re-ranks everything, and rewrites the 50-card chunk
// files and both manifests.
//
// Backwards compatibility is the point of this script's shape: learners'
// progress is keyed by card id (W+<hex of the word>), never by rank or chunk,
// so existing cards keep their id and content byte-for-byte — only
// frequencyRank and batchId change. Ties in frequency keep existing cards
// ahead of new ones, and existing cards keep their relative order.
//
// Idempotent: cards already merged in a previous run are recognised by id
// and replaced, never duplicated, so it can be re-run after editing a
// filled batch.
//
// Usage: npx tsx 07-merge-single-char-words.ts

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HAN_ONLY_RE, parseSubtlexEntries } from './00-extract-word-frequency.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DRAFTS_DIR = path.resolve(__dirname, '../drafts')
const DATA_DIR = path.resolve(__dirname, '../..')
const PUBLIC_DATA_DIR = path.resolve(DATA_DIR, '../public/data')
const CHUNK_SIZE = 50
// Bump when chunk contents change so browsers holding the previous deck's
// chunk files never mix them with the new manifest (see wordCardData.ts).
const MANIFEST_VERSION = '2'

interface Card {
  id: string
  word: string
  frequencyRank: number
  batchId: string
  [key: string]: unknown
}

function readCards(dir: string): Card[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .flatMap((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as Card[])
}

function loadFilledSingles(): Card[] {
  return readdirSync(DRAFTS_DIR)
    .filter((f) => /^singles-\d{4}-\d{4}\.filled\.json$/.test(f))
    .sort()
    .flatMap((f) => JSON.parse(readFileSync(path.join(DRAFTS_DIR, f), 'utf8')) as Card[])
}

function loadExcluded(): Set<string> {
  const file = path.join(DRAFTS_DIR, 'singles-excluded.json')
  if (!existsSync(file)) return new Set()
  return new Set((JSON.parse(readFileSync(file, 'utf8')) as Array<{ word: string }>).map((e) => e.word))
}

const BOOKKEEPING_FIELDS = ['wcount', 'reference', 'needsCedictFallback', 'excludeSuggestion']

function main() {
  const singles = loadFilledSingles()
  if (singles.length === 0) throw new Error('No singles-*.filled.json files found')
  const excluded = loadExcluded()
  const singleIds = new Set(singles.map((c) => c.id))

  const existing = readCards(path.join(DATA_DIR, 'word-cards')).filter((c) => !singleIds.has(c.id))
  const added = singles.filter((c) => !excluded.has(c.word))

  const wcountByWord = new Map(parseSubtlexEntries((w) => HAN_ONLY_RE.test(w)).map((e) => [e.word, e.wcount]))
  const sortable = [
    ...existing.map((card) => ({ card, order: card.frequencyRank })),
    ...added.map((card) => ({ card, order: 1_000_000 + card.frequencyRank })),
  ].map((entry) => {
    const wcount = wcountByWord.get(entry.card.word)
    if (wcount === undefined) throw new Error(`${entry.card.word} not found in SUBTLEX`)
    return { ...entry, wcount }
  })
  sortable.sort((a, b) => b.wcount - a.wcount || a.order - b.order)

  const merged = sortable.map(({ card }, i) => {
    const clean: Record<string, unknown> = { ...card }
    for (const field of BOOKKEEPING_FIELDS) delete clean[field]
    const rank = i + 1
    const from = rank - ((rank - 1) % CHUNK_SIZE)
    const to = from + CHUNK_SIZE - 1
    return {
      ...clean,
      frequencyRank: rank,
      batchId: `${String(from).padStart(4, '0')}-${String(to).padStart(4, '0')}`,
    } as Card
  })

  const chunks: Array<{ id: string; fromRank: number; toRank: number; cards: Card[] }> = []
  for (let start = 0; start < merged.length; start += CHUNK_SIZE) {
    const cards = merged.slice(start, start + CHUNK_SIZE)
    chunks.push({
      id: cards[0].batchId,
      fromRank: start + 1,
      toRank: start + cards.length,
      cards,
    })
  }

  const publicManifest = {
    version: MANIFEST_VERSION,
    totalCards: merged.length,
    chunks: chunks.map((c) => ({
      file: `word-cards/${c.id}.json`,
      fromRank: c.fromRank,
      toRank: c.toRank,
      cardCount: c.cards.length,
    })),
  }
  const pipelineManifest = {
    batches: chunks.map((c) => ({
      id: c.id,
      fromRank: c.fromRank,
      toRank: c.toRank,
      cardCount: c.cards.length,
      status: 'validated',
    })),
  }

  for (const root of [DATA_DIR, PUBLIC_DATA_DIR]) {
    const dir = path.join(root, 'word-cards')
    mkdirSync(dir, { recursive: true })
    for (const f of readdirSync(dir)) if (f.endsWith('.json')) rmSync(path.join(dir, f))
    for (const c of chunks) writeFileSync(path.join(dir, `${c.id}.json`), JSON.stringify(c.cards, null, 2))
  }
  writeFileSync(path.join(PUBLIC_DATA_DIR, 'word-manifest.json'), JSON.stringify(publicManifest, null, 2))
  writeFileSync(path.join(DATA_DIR, 'word-manifest.json'), JSON.stringify(pipelineManifest, null, 2))

  console.log(`${existing.length} existing + ${added.length} new = ${merged.length} cards in ${chunks.length} chunks`)
  if (excluded.size > 0) console.log(`Excluded ${singles.length - added.length}: ${[...excluded].join(' ')}`)
}

main()
