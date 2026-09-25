// Joins hanziDB.csv + CC-CEDICT + makemeahanzi/dictionary.txt for a frequency-rank
// range and writes a draft card JSON. Draft cards have every dataset-sourced field
// filled in; `example` is left null and `components` is left empty whenever
// makemeahanzi has no pictophonetic breakdown — both are the content-generation
// step's job (02-generate-llm-content.ts), never invented here.
//
// Usage: npx tsx 01-extract-frequency-slice.ts <fromRank> <toRank>

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SOURCES_DIR = path.resolve(__dirname, '../sources')
const DRAFTS_DIR = path.resolve(__dirname, '../drafts')

interface HanziDbRow {
  frequencyRank: number
  character: string
  pinyin: string
  definition: string
  radical: string
  strokeCount: number | undefined
  hskLevel: number | undefined
}

interface MmhEntry {
  definition?: string
  pinyin: string[]
  decomposition?: string
  radical?: string
  etymology?: {
    type: string
    hint?: string
    phonetic?: string
    semantic?: string
  }
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      fields.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  fields.push(cur)
  return fields
}

function loadHanziDB(): HanziDbRow[] {
  const raw = readFileSync(path.join(SOURCES_DIR, 'hanziDB.csv'), 'utf8')
  const lines = raw.split('\n').filter((l) => l.trim().length > 0)
  const [header, ...rows] = lines
  const cols = parseCsvLine(header)
  const idx = (name: string) => cols.indexOf(name)
  return rows.map((line) => {
    const f = parseCsvLine(line)
    return {
      frequencyRank: Number(f[idx('frequency_rank')]),
      character: f[idx('character')],
      pinyin: f[idx('pinyin')],
      definition: f[idx('definition')],
      radical: f[idx('radical')],
      strokeCount: f[idx('stroke_count')] ? Number(f[idx('stroke_count')]) : undefined,
      hskLevel: f[idx('hsk_level')] ? Number(f[idx('hsk_level')]) : undefined,
    }
  })
}

function loadMakeMeAHanzi(): Map<string, MmhEntry> {
  const raw = readFileSync(path.join(SOURCES_DIR, 'makemeahanzi/dictionary.txt'), 'utf8')
  const map = new Map<string, MmhEntry>()
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    const obj = JSON.parse(line)
    map.set(obj.character, obj)
  }
  return map
}

function loadCedict(): Map<string, string[]> {
  const raw = readFileSync(path.join(SOURCES_DIR, 'cedict.txt'), 'utf8')
  const map = new Map<string, string[]>()
  const lineRe = /^(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+\/(.*)\/\s*$/
  for (const line of raw.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue
    const m = lineRe.exec(line)
    if (!m) continue
    const simplified = m[2]
    if (Array.from(simplified).length !== 1) continue // only single-character entries
    const defs = m[4].split('/').map((d) => d.trim()).filter(Boolean)
    const existing = map.get(simplified) ?? []
    map.set(simplified, existing.concat(defs))
  }
  return map
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    const key = item.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      out.push(item)
    }
  }
  return out
}

// hanziDB and makemeahanzi both carry a first-tone "luō" for 罗, but CC-CEDICT (and
// standard modern Mandarin — 罗马 Luómǎ, the surname 罗 Luó, 罗盘 luópán) uses second
// tone "luó" for every sense. Caught during batch 0281-0460's review; override here
// rather than editing the vendored snapshot, so future re-extractions stay correct.
const PINYIN_OVERRIDES: Record<string, string> = {
  罗: 'luó',
}

function toId(character: string): string {
  const cp = character.codePointAt(0)!
  return 'U+' + cp.toString(16).toUpperCase().padStart(4, '0')
}

function pad(n: number): string {
  return String(n).padStart(4, '0')
}

function main() {
  const [fromArg, toArg] = process.argv.slice(2)
  const from = Number(fromArg)
  const to = Number(toArg)
  if (!from || !to || from > to) {
    console.error('Usage: npx tsx 01-extract-frequency-slice.ts <fromRank> <toRank>')
    process.exit(1)
  }

  const hanziRows = loadHanziDB().filter(
    (r) => r.frequencyRank >= from && r.frequencyRank <= to,
  )
  const mmh = loadMakeMeAHanzi()
  const cedict = loadCedict()

  const draftCards = hanziRows.map((row) => {
    const mmhEntry = mmh.get(row.character)
    const cedictDefs = cedict.get(row.character) ?? []
    const hanziDbMeanings = row.definition
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
    // CC-CEDICT entries for common function words often include long discursive
    // usage notes (embedded example words + pinyin) rather than a concise gloss —
    // fine for a dictionary, too noisy for a flashcard, so cap definition length.
    const shortCedictDefs = cedictDefs.filter((d) => d.length <= 50)
    const meanings = dedupe([...hanziDbMeanings, ...shortCedictDefs]).slice(0, 6)

    const components: Array<{ char: string; role: string; source: string }> = []
    let etymologyType: string | undefined
    let etymologyHint: string | undefined
    if (mmhEntry?.etymology) {
      etymologyType = mmhEntry.etymology.type
      etymologyHint = mmhEntry.etymology.hint
      if (mmhEntry.etymology.type === 'pictophonetic') {
        if (mmhEntry.etymology.semantic) {
          components.push({ char: mmhEntry.etymology.semantic, role: 'semantic', source: 'makemeahanzi' })
        }
        if (mmhEntry.etymology.phonetic) {
          components.push({ char: mmhEntry.etymology.phonetic, role: 'phonetic', source: 'makemeahanzi' })
        }
      }
    }

    return {
      id: toId(row.character),
      character: row.character,
      frequencyRank: row.frequencyRank,
      pinyin: PINYIN_OVERRIDES[row.character] ?? row.pinyin,
      meanings,
      strokeCount: row.strokeCount,
      hskLevel: row.hskLevel,
      radical: row.radical,
      decomposition: mmhEntry?.decomposition,
      etymologyType,
      etymologyHint,
      components,
      needsComponentFallback: components.length === 0,
      example: null,
    }
  })

  mkdirSync(DRAFTS_DIR, { recursive: true })
  const outPath = path.join(DRAFTS_DIR, `${pad(from)}-${pad(to)}.draft.json`)
  writeFileSync(outPath, JSON.stringify(draftCards, null, 2))
  console.log(`Wrote ${draftCards.length} draft cards to ${outPath}`)
  console.log(
    `  ${draftCards.filter((c) => c.needsComponentFallback).length} need an LLM-authored component fallback`,
  )
}

main()
