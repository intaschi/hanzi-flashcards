// Prepares the compact input files for the two enrichment passes over the
// word deck, so content writers never have to read full card JSON:
//
//   components      one entry per UNIQUE character across the whole deck
//                   (existing words + the single-character drafts). Components
//                   are a property of the character, so each is reviewed once
//                   and applied everywhere it appears (10-apply-enrichment.ts).
//   phrases-words   existing multi-character words, for two extra example phrases
//   phrases-singles single-character words (run after the singles are filled)
//
// Inputs are read from a frozen baseline copy of data/word-cards when given,
// so a concurrent re-merge can't shift ranks under a running writer.
//
// Usage: npx tsx 09-prepare-enrichment-inputs.ts <components|phrases-words|phrases-singles> [baselineWordCardsDir]

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SOURCES_DIR = path.resolve(__dirname, '../sources')
const DRAFTS_DIR = path.resolve(__dirname, '../drafts')
const DATA_DIR = path.resolve(__dirname, '../..')
const BATCH_SIZE = 50

interface Card {
  id: string
  word: string
  pinyin: string
  meanings: string[]
  characters: Array<{ char: string; components: unknown[] }>
  example: { hanzi: string; english: string }
  [key: string]: unknown
}

function readJsonDir(dir: string, filter: (f: string) => boolean): any[] {
  return readdirSync(dir)
    .filter(filter)
    .sort()
    .flatMap((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')))
}

function writeBatches(prefix: string, items: unknown[]) {
  mkdirSync(DRAFTS_DIR, { recursive: true })
  for (let start = 0; start < items.length; start += BATCH_SIZE) {
    const slice = items.slice(start, start + BATCH_SIZE)
    const from = String(start + 1).padStart(4, '0')
    const to = String(start + slice.length).padStart(4, '0')
    writeFileSync(path.join(DRAFTS_DIR, `${prefix}-${from}-${to}.input.json`), JSON.stringify(slice, null, 1))
  }
  console.log(`${items.length} items -> ${Math.ceil(items.length / BATCH_SIZE)} ${prefix} input batches`)
}

function loadMakeMeAHanzi(): Map<string, any> {
  const map = new Map<string, any>()
  const raw = readFileSync(path.join(SOURCES_DIR, 'makemeahanzi/dictionary.txt'), 'utf8')
  for (const line of raw.split('\n')) {
    if (line.trim()) {
      const e = JSON.parse(line)
      map.set(e.character, e)
    }
  }
  return map
}

function main() {
  const [mode, baselineArg] = process.argv.slice(2)
  const wordsDir = baselineArg ?? path.join(DATA_DIR, 'word-cards')
  const existing: Card[] = readJsonDir(wordsDir, (f) => f.endsWith('.json'))

  if (mode === 'phrases-words') {
    writeBatches(
      'phrases-w',
      existing.map((c) => ({
        id: c.id,
        word: c.word,
        pinyin: c.pinyin,
        meanings: c.meanings,
        existingExample: { hanzi: c.example.hanzi, english: c.example.english },
      })),
    )
    return
  }

  const singles: Card[] = readJsonDir(DRAFTS_DIR, (f) => /^singles-\d{4}-\d{4}\.filled\.json$/.test(f))

  if (mode === 'phrases-singles') {
    if (singles.length === 0) throw new Error('No filled singles yet')
    // Words dropped at merge time (07) don't need phrases.
    const excludedFile = path.join(DRAFTS_DIR, 'singles-excluded.json')
    const excluded = new Set(
      existsSync(excludedFile) ? (JSON.parse(readFileSync(excludedFile, 'utf8')) as Array<{ word: string }>).map((e) => e.word) : [],
    )
    writeBatches(
      'phrases-s',
      singles.filter((c) => !excluded.has(c.word)).map((c) => ({
        id: c.id,
        word: c.word,
        pinyin: c.pinyin,
        meanings: c.meanings,
        existingExample: { hanzi: c.example.hanzi, english: c.example.english },
      })),
    )
    return
  }

  if (mode !== 'components') throw new Error('Mode must be components | phrases-words | phrases-singles')

  // Singles' own drafts supply the characters even before they are filled.
  const singleDrafts: Card[] = readJsonDir(DRAFTS_DIR, (f) => /^singles-\d{4}-\d{4}\.draft\.json$/.test(f))
  const allWords = [...existing, ...singleDrafts]
  const mmh = loadMakeMeAHanzi()
  const hanziDb = new Map<string, { definition: string; strokeCount: string; hsk: string }>()
  for (const line of readFileSync(path.join(SOURCES_DIR, 'hanziDB.csv'), 'utf8').split('\n').slice(1)) {
    const m = /^\d+,(.),[^,]*,("[^"]*"|[^,]*),(.*)$/.exec(line)
    if (m) hanziDb.set(m[1], { definition: m[2].replace(/"/g, ''), strokeCount: '', hsk: '' })
  }

  const order: string[] = []
  const currentByChar = new Map<string, unknown>()
  const wordsByChar = new Map<string, Card[]>()
  for (const w of allWords) {
    for (const ch of Array.from(w.word)) {
      if (!wordsByChar.has(ch)) {
        order.push(ch)
        wordsByChar.set(ch, [])
      }
      wordsByChar.get(ch)!.push(w)
    }
    for (const c of w.characters ?? []) {
      if (c.components.length > 0 && !currentByChar.has(c.char)) currentByChar.set(c.char, c.components)
    }
  }

  writeBatches(
    'components',
    order.map((char) => {
      const mm = mmh.get(char)
      const sample = wordsByChar.get(char)!.slice(0, 4)
      return {
        char,
        dictionary: {
          definition: mm?.definition ?? hanziDb.get(char)?.definition ?? null,
          radical: mm?.radical ?? null,
          decomposition: mm?.decomposition ?? null,
          etymology: mm?.etymology ?? null,
        },
        usedInWords: sample.map((w) => ({ word: w.word, pinyin: w.pinyin, meaning: w.meanings?.[0] ?? null })),
        currentComponents: currentByChar.get(char) ?? [],
      }
    }),
  )
}

main()
