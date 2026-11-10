// Drafts the single-character words the original word deck skipped (see the
// 2+ character filter in 00-extract-word-frequency.ts). Takes every pure-Han
// single-character SUBTLEX-CH entry at least as frequent as the rarest word
// already in data/word-cards, so the merged deck has no frequency gap, and
// writes them in 50-card draft batches for the content-generation step.
//
// Existing cards are never touched here — 07-merge-single-char-words.ts is
// what interleaves the finished cards into the deck by frequency.
//
// Each draft's `reference` block (decomposition, etymology, the character
// deck's old breakdown) is grounding for whoever writes the new components
// and is stripped again at merge time.
//
// Usage: npx tsx 06-extract-single-char-words.ts

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  HAN_ONLY_RE,
  loadCedictAllLengths,
  loadExistingCharacterComponents,
  parseSubtlexEntries,
  shortenMeaning,
  toId,
} from './00-extract-word-frequency.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SOURCES_DIR = path.resolve(__dirname, '../sources')
const DRAFTS_DIR = path.resolve(__dirname, '../drafts')
const WORD_CARDS_DIR = path.resolve(__dirname, '../../word-cards')
const BATCH_SIZE = 50

interface MmhEntry {
  definition?: string
  decomposition?: string
  radical?: string
  etymology?: { type?: string; hint?: string; phonetic?: string; semantic?: string }
}

function loadMakeMeAHanzi(): Map<string, MmhEntry> {
  const map = new Map<string, MmhEntry>()
  const raw = readFileSync(path.join(SOURCES_DIR, 'makemeahanzi/dictionary.txt'), 'utf8')
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    const entry = JSON.parse(line)
    map.set(entry.character, entry)
  }
  return map
}

function loadExistingWords(): Set<string> {
  const words = new Set<string>()
  for (const file of readdirSync(WORD_CARDS_DIR)) {
    if (!file.endsWith('.json')) continue
    for (const card of JSON.parse(readFileSync(path.join(WORD_CARDS_DIR, file), 'utf8'))) {
      words.add(card.word)
    }
  }
  return words
}

function main() {
  const existingWords = loadExistingWords()
  const allEntries = parseSubtlexEntries((word) => HAN_ONLY_RE.test(word))
  const wcountByWord = new Map(allEntries.map((e) => [e.word, e.wcount]))

  // The deck's rarest word sets the bar: any single character at least this
  // frequent belongs in the deck's frequency range.
  let cutoff = Infinity
  for (const word of existingWords) {
    const wcount = wcountByWord.get(word)
    if (wcount === undefined) throw new Error(`Existing word ${word} not found in SUBTLEX`)
    cutoff = Math.min(cutoff, wcount)
  }

  const singles = allEntries.filter(
    (e) => Array.from(e.word).length === 1 && e.wcount >= cutoff && !existingWords.has(e.word),
  )

  const cedict = loadCedictAllLengths()
  const charComponents = loadExistingCharacterComponents()
  const mmh = loadMakeMeAHanzi()

  const drafts = singles.map((row, i) => {
    const cedictEntry = cedict.get(row.word)
    const meanings = (cedictEntry?.meanings ?? [])
      .map(shortenMeaning)
      .filter((d) => d.length <= 60)
      .slice(0, 6)
    const mm = mmh.get(row.word)
    return {
      id: toId(row.word),
      word: row.word,
      frequencyRank: i + 1,
      wcount: row.wcount,
      pinyin: cedictEntry?.pinyinSyllables.join(' ') ?? null,
      meanings,
      needsCedictFallback: !cedictEntry || meanings.length === 0,
      characters: [{ char: row.word, components: [] }],
      reference: {
        makemeahanzi: mm
          ? {
              definition: mm.definition,
              decomposition: mm.decomposition,
              radical: mm.radical,
              etymology: mm.etymology,
            }
          : null,
        characterDeckComponents: charComponents.get(row.word) ?? null,
      },
      example: null,
    }
  })

  mkdirSync(DRAFTS_DIR, { recursive: true })
  for (let start = 0; start < drafts.length; start += BATCH_SIZE) {
    const batch = drafts.slice(start, start + BATCH_SIZE)
    const from = String(start + 1).padStart(4, '0')
    const to = String(start + batch.length).padStart(4, '0')
    const batchId = `singles-${from}-${to}`
    const outPath = path.join(DRAFTS_DIR, `${batchId}.draft.json`)
    writeFileSync(outPath, JSON.stringify(batch.map((d) => ({ ...d, batchId })), null, 2))
  }

  console.log(`Cutoff wcount (rarest existing word): ${cutoff}`)
  console.log(`${drafts.length} single-character words in ${Math.ceil(drafts.length / BATCH_SIZE)} draft batches`)
  console.log(`${drafts.filter((d) => d.needsCedictFallback).length} need LLM-authored pinyin + meanings`)
}

main()
