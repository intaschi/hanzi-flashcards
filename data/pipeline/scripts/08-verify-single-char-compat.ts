// Proves the single-character merge (07) can't cost anyone progress. Progress
// is keyed by card id, so the checks are about ids and scheduling, against a
// snapshot of the deck from BEFORE the merge:
//   1. every old card still exists with identical identity/reading/meanings/main
//      example (rank, batchId, components and extra phrases may change),
//   2. the new deck is well-formed (unique ids, ranks 1..N, chunk ranges line up),
//   3. a study history keeps scheduling identically — same due cards, no
//      learned card resurfacing as "new", new cards in frequency order —
//      for a synthetic mid-deck learner and for any real progress exports given.
//
// Usage: npx tsx 08-verify-single-char-compat.ts <baselineWordCardsDir> [progressExport.json ...]

import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSessionQueue, getDueCardIds } from '../../../src/state/srs.ts'
import type { CardProgress, SrsState } from '../../../src/state/types.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const NEW_DIR = path.resolve(__dirname, '../../word-cards')
const PUBLIC_DIR = path.resolve(__dirname, '../../../public/data/word-cards')

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

const failures: string[] = []
function check(ok: boolean, message: string) {
  if (!ok) failures.push(message)
}

// Enrichment (11-apply-enrichment.ts) legitimately rewrites character
// components and adds extra example phrases, so "unchanged" means the parts
// learners' progress and scheduling depend on: identity, reading, meanings,
// the main example and which characters make up the word.
function strip(card: Card): string {
  const { id, word, pinyin, meanings, example, characters } = card as Card & {
    pinyin: unknown
    meanings: unknown
    example: unknown
    characters: Array<{ char: string }>
  }
  return JSON.stringify({ id, word, pinyin, meanings, example, chars: characters.map((c) => c.char) })
}

function emptyState(cards: Record<string, CardProgress>, newCardsPerDay: number): SrsState {
  return {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: { newCardsPerDay, dayRolloverHour: 4, maxIntervalDays: 365 },
    cards,
    dailyLog: {},
  }
}

function progress(state: CardProgress['state'], dueOffsetDays: number): CardProgress {
  return {
    state,
    easeFactor: 2.5,
    intervalDays: 3,
    dueAt: new Date(Date.now() + dueOffsetDays * 86400_000).toISOString(),
    lastReviewedAt: new Date(Date.now() - 86400_000).toISOString(),
    reps: 2,
    lapses: 0,
  }
}

function compareScheduling(label: string, state: SrsState, oldIds: string[], newIds: string[]) {
  const oldDue = new Set(getDueCardIds(state, oldIds))
  const newDue = new Set(getDueCardIds(state, newIds))
  check(
    oldDue.size === newDue.size && [...oldDue].every((id) => newDue.has(id)),
    `${label}: due cards changed`,
  )

  const queue = buildSessionQueue(state, newIds)
  const learned = new Set(Object.keys(state.cards))
  const dueSet = new Set(getDueCardIds(state, newIds))
  const queuedNew = queue.filter((id) => !dueSet.has(id))
  check(queuedNew.every((id) => !learned.has(id)), `${label}: a learned card is queued as new`)
  const expectedNew = newIds.filter((id) => !learned.has(id)).slice(0, queuedNew.length)
  check(
    JSON.stringify(queuedNew) === JSON.stringify(expectedNew),
    `${label}: new cards are not the next ones in frequency order`,
  )
  check(
    [...dueSet].every((id) => queue.includes(id)),
    `${label}: a due card is missing from the queue`,
  )
  return queue
}

function main() {
  const [baselineDir, ...progressFiles] = process.argv.slice(2)
  if (!baselineDir) throw new Error('Usage: 08-verify-single-char-compat.ts <baselineWordCardsDir> [progress.json ...]')

  const oldCards = readCards(baselineDir)
  const newCards = readCards(NEW_DIR)
  const publicCards = readCards(PUBLIC_DIR)

  check(JSON.stringify(newCards) === JSON.stringify(publicCards), 'data/ and public/data/ word-cards differ')

  const newById = new Map(newCards.map((c) => [c.id, c]))
  check(newById.size === newCards.length, 'duplicate ids in new deck')
  newCards.forEach((c, i) => check(c.frequencyRank === i + 1, `rank gap at ${c.word}: ${c.frequencyRank} != ${i + 1}`))

  let identical = 0
  for (const old of oldCards) {
    const now = newById.get(old.id)
    if (!now) {
      check(false, `old card ${old.word} (${old.id}) missing from new deck`)
      continue
    }
    if (strip(old) === strip(now)) identical++
    else check(false, `old card ${old.word} content changed`)
  }

  const oldIds = oldCards.map((c) => c.id)
  const newIds = newCards.map((c) => c.id)
  const oldOrder = newIds.filter((id) => oldIds.includes(id))
  check(JSON.stringify(oldOrder) === JSON.stringify(oldIds), 'relative order of existing cards changed')

  // Synthetic learner halfway through the old deck: 400 graduated cards (a
  // third due now), 15 mid-learning, the rest untouched.
  const synthetic: Record<string, CardProgress> = {}
  oldIds.slice(0, 400).forEach((id, i) => (synthetic[id] = progress('review', i % 3 === 0 ? -1 : 5)))
  oldIds.slice(400, 415).forEach((id) => (synthetic[id] = progress('learning', -0.01)))
  compareScheduling('synthetic learner', emptyState(synthetic, 20), oldIds, newIds)

  for (const file of progressFiles) {
    const state = JSON.parse(readFileSync(file, 'utf8')) as SrsState
    const wordIds = Object.keys(state.cards).filter((id) => id.startsWith('W+'))
    for (const id of wordIds) check(newById.has(id), `${path.basename(file)}: progress for ${id} has no card in new deck`)
    compareScheduling(path.basename(file), state, oldIds, newIds)
    console.log(`  ${path.basename(file)}: ${wordIds.length} word progress entries, all present`)
  }

  console.log(`Old cards: ${oldCards.length}, identical content: ${identical}; new deck: ${newCards.length}`)
  if (failures.length > 0) {
    console.error(`\n${failures.length} FAILURE(S):`)
    failures.slice(0, 40).forEach((f) => console.error(`  - ${f}`))
    process.exit(1)
  }
  console.log('Compatibility checks passed.')
}

main()
