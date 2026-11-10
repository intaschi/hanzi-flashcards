// Folds the reviewed character components and the extra example phrases into
// the word deck's chunk files (both data/ and public/data/).
//
//   components-*.output.json  keyed by character; replaces `components` on
//                             every card character that matches (so a
//                             character reads the same on every word)
//   phrases-*.output.json     keyed by card id; sets `examples` (2 phrases)
//
// Only content changes — ids, ranks and the main `example` are untouched, so
// saved progress is unaffected. Idempotent. Run AFTER 07-merge-single-char-words.ts
// (which rebuilds the chunks from the filled singles, without enrichment).
//
// Usage: npx tsx 11-apply-enrichment.ts

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DRAFTS_DIR = path.resolve(__dirname, '../drafts')
const DATA_DIR = path.resolve(__dirname, '../..')
const PUBLIC_DATA_DIR = path.resolve(DATA_DIR, '../public/data')

type Json = Record<string, any>

function readOutputs(prefix: string): Json[] {
  return readdirSync(DRAFTS_DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.output.json'))
    .sort()
    .flatMap((f) => JSON.parse(readFileSync(path.join(DRAFTS_DIR, f), 'utf8')) as Json[])
}

// Radical forms written differently from their dictionary-decomposition form.
const RADICAL_FORMS: Record<string, string> = {
  '⻊': '足', '纟': '糸', '辶': '辵', '讠': '言', '钅': '金', '饣': '食', '衤': '衣',
  '忄': '心', '氵': '水', '扌': '手', '犭': '犬', '艹': '艸', '礻': '示', '⺍': '𭕄', '罒': '网',
}

// character -> every glyph that really is one of its visible parts
function loadVisibleParts(): Map<string, string> {
  const parts = new Map<string, string>()
  for (const f of readdirSync(DRAFTS_DIR).filter((n) => /^components-\d{4}-\d{4}\.input\.json$/.test(n))) {
    for (const e of JSON.parse(readFileSync(path.join(DRAFTS_DIR, f), 'utf8')) as Json[]) {
      parts.set(e.char, `${e.dictionary?.decomposition ?? ''}${e.dictionary?.radical ?? ''}`)
    }
  }
  return parts
}

// A glyph that is not actually part of the character (a sound-series pointer
// such as 杯 under 不, or a traditional form) stays in the note but must not
// be shown as if it were one of the character's pieces.
function cleanComponent(c: Json, owner: string, visible: Map<string, string>): Json {
  const out: Json = {}
  const known = visible.get(owner)
  const isPart =
    c.char !== undefined &&
    (known === undefined || c.char === owner || known.includes(c.char) || known.includes(RADICAL_FORMS[c.char] ?? '\0'))
  if (isPart) out.char = c.char
  out.role = c.role
  if (c.radical === true) out.radical = true
  out.source = c.source
  out.note = c.note
  return out
}

function main() {
  const componentsByChar = new Map(readOutputs('components-').map((e) => [e.char as string, e.components as Json[]]))
  const examplesById = new Map(readOutputs('phrases-').map((e) => [e.id as string, e.examples as Json[]]))
  const visibleParts = loadVisibleParts()
  console.log(`${componentsByChar.size} reviewed characters, ${examplesById.size} words with extra phrases`)

  let charsUpdated = 0
  let cardsWithExamples = 0
  let cardsTotal = 0
  const missingComponents = new Set<string>()

  for (const root of [DATA_DIR, PUBLIC_DATA_DIR]) {
    const dir = path.join(root, 'word-cards')
    const countHere = root === DATA_DIR
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
      const cards = JSON.parse(readFileSync(path.join(dir, file), 'utf8')) as Json[]
      const updated = cards.map((card) => {
        const characters = card.characters.map((ch: Json) => {
          const reviewed = componentsByChar.get(ch.char)
          // An empty review means the reviewer found nothing reliable to say,
          // not that the character has no breakdown — keep what was there.
          if (!reviewed || reviewed.length === 0) {
            if (countHere) missingComponents.add(ch.char)
            return ch
          }
          if (countHere) charsUpdated++
          return { ...ch, components: reviewed.map((c) => cleanComponent(c, ch.char, visibleParts)) }
        })
        const examples = examplesById.get(card.id)
        const next: Json = {}
        for (const [key, value] of Object.entries(card)) {
          if (key === 'examples') continue
          next[key] = key === 'characters' ? characters : value
          if (key === 'example' && examples) next.examples = examples
        }
        if (examples && !('examples' in next)) next.examples = examples
        if (countHere) {
          cardsTotal++
          if (examples) cardsWithExamples++
        }
        return next
      })
      writeFileSync(path.join(dir, file), JSON.stringify(updated, null, 2))
    }
  }

  console.log(`${cardsWithExamples}/${cardsTotal} cards have extra phrases; ${charsUpdated} character entries refreshed`)
  if (missingComponents.size > 0) {
    console.log(`No reviewed components yet for ${missingComponents.size} characters (left as they were)`)
  }
}

main()
