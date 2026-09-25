// Automated invariant checks for a filled batch file, run before it's merged into
// data/cards/ and locked in the manifest. Catches the class of issues found by hand
// during the pilot batch's QA pass so every later batch gets them checked for free.
//
// Usage: npx tsx 03-validate-batch.ts <path-to-filled.json> <expectedFromRank> <expectedToRank>

import { readFileSync } from 'node:fs'

const BANNED_PHONETIC_PHRASES = [
  'gives the sound',
  'lends its sound',
  'lends the sound',
  'provides the pronunciation',
  'gives the pronunciation',
  'contributes the sound',
]

function fail(errors: string[], msg: string) {
  errors.push(msg)
}

function main() {
  const [filePath, fromArg, toArg] = process.argv.slice(2)
  if (!filePath || !fromArg || !toArg) {
    console.error('Usage: npx tsx 03-validate-batch.ts <file> <fromRank> <toRank>')
    process.exit(1)
  }
  const fromRank = Number(fromArg)
  const toRank = Number(toArg)
  const expectedCount = toRank - fromRank + 1

  const errors: string[] = []
  const warnings: string[] = []

  let cards: any[]
  try {
    cards = JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (e) {
    console.error(`Not valid JSON: ${(e as Error).message}`)
    process.exit(1)
  }

  if (cards.length !== expectedCount) {
    fail(errors, `Expected ${expectedCount} cards, found ${cards.length}`)
  }

  const seenIds = new Set<string>()
  let expectedRank = fromRank

  for (const card of cards) {
    const label = `${card.id ?? '?'} (${card.character ?? '?'}, rank ${card.frequencyRank ?? '?'})`

    if (card.frequencyRank !== expectedRank) {
      fail(errors, `${label}: expected frequencyRank ${expectedRank}, got ${card.frequencyRank}`)
    }
    expectedRank++

    if (seenIds.has(card.id)) fail(errors, `${label}: duplicate id`)
    seenIds.add(card.id)

    if (!card.example || typeof card.example !== 'object') {
      fail(errors, `${label}: missing example`)
    } else {
      for (const field of ['hanzi', 'pinyin', 'english', 'fact']) {
        if (!card.example[field] || typeof card.example[field] !== 'string') {
          fail(errors, `${label}: example.${field} missing/empty`)
        }
      }
      if (card.example.source !== 'llm-generated') {
        warnings.push(`${label}: example.source is "${card.example.source}", expected "llm-generated"`)
      }
      if (card.example.reviewStatus !== 'needs-review' && card.example.reviewStatus !== 'reviewed') {
        warnings.push(`${label}: unexpected example.reviewStatus "${card.example.reviewStatus}"`)
      }
      // Heuristic: per-character pinyin spacing (word-by-word grouping should mean
      // roughly fewer space-separated tokens than hanzi characters).
      const hanziLen = Array.from(card.example.hanzi as string).filter(
        (ch) => /[一-鿿]/.test(ch as string),
      ).length
      const pinyinTokens = (card.example.pinyin as string).split(/\s+/).filter(Boolean).length
      if (hanziLen > 0 && pinyinTokens >= hanziLen) {
        warnings.push(
          `${label}: pinyin has ${pinyinTokens} space-separated tokens for ${hanziLen} hanzi chars — check for per-character spacing instead of word-grouping`,
        )
      }
    }

    const components = card.components ?? []
    if (components.length > 3) {
      fail(errors, `${label}: components has ${components.length} entries, max is 3`)
    }
    for (const comp of components) {
      const isRealPhonoSemantic =
        comp.source === 'makemeahanzi' && (comp.role === 'semantic' || comp.role === 'phonetic')
      if ((comp.role === 'semantic' || comp.role === 'phonetic') && comp.source !== 'makemeahanzi') {
        fail(
          errors,
          `${label}: component role "${comp.role}" used with source "${comp.source}" — semantic/phonetic reserved for makemeahanzi-sourced components`,
        )
      }
      if (!isRealPhonoSemantic) {
        const note = (comp.note ?? '').toLowerCase()
        for (const phrase of BANNED_PHONETIC_PHRASES) {
          if (note.includes(phrase)) {
            fail(
              errors,
              `${label}: fallback component note claims a sound-derivation ("${phrase}") despite role "${comp.role}"/source "${comp.source}"`,
            )
          }
        }
      }
      if (!comp.note) fail(errors, `${label}: component missing note`)
    }
  }

  console.log(`Checked ${cards.length} cards from ${filePath}`)
  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warning(s):`)
    warnings.slice(0, 30).forEach((w) => console.log(`  - ${w}`))
    if (warnings.length > 30) console.log(`  ... and ${warnings.length - 30} more`)
  }
  if (errors.length > 0) {
    console.log(`\n${errors.length} ERROR(s):`)
    errors.slice(0, 30).forEach((e) => console.log(`  - ${e}`))
    if (errors.length > 30) console.log(`  ... and ${errors.length - 30} more`)
    process.exit(1)
  }
  console.log('\nNo blocking errors.')
}

main()
