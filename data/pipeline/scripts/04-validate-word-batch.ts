// Automated invariant checks for a filled word-batch file, run before it's merged
// into data/word-cards/ and locked in the manifest. Mirrors 03-validate-batch.ts's
// checks for the character deck, adapted for the WordCard shape.
//
// Usage: npx tsx 04-validate-word-batch.ts <path-to-filled.json> <expectedFromRank> <expectedToRank>

import { readFileSync } from 'node:fs'

function fail(errors: string[], msg: string) {
  errors.push(msg)
}

function main() {
  const [filePath, fromArg, toArg] = process.argv.slice(2)
  if (!filePath || !fromArg || !toArg) {
    console.error('Usage: npx tsx 04-validate-word-batch.ts <file> <fromRank> <toRank>')
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
  const seenWords = new Set<string>()
  let expectedRank = fromRank

  for (const card of cards) {
    const label = `${card.id ?? '?'} (${card.word ?? '?'}, rank ${card.frequencyRank ?? '?'})`

    if (card.frequencyRank !== expectedRank) {
      fail(errors, `${label}: expected frequencyRank ${expectedRank}, got ${card.frequencyRank}`)
    }
    expectedRank++

    if (seenIds.has(card.id)) fail(errors, `${label}: duplicate id`)
    seenIds.add(card.id)
    if (seenWords.has(card.word)) fail(errors, `${label}: duplicate word`)
    seenWords.add(card.word)

    if (!card.pinyin || typeof card.pinyin !== 'string') {
      fail(errors, `${label}: pinyin missing/empty`)
    }
    if (!Array.isArray(card.meanings) || card.meanings.length === 0) {
      fail(errors, `${label}: meanings missing/empty`)
    }

    // Bookkeeping fields from extraction (wcount, needsCedictFallback,
    // per-character needsComponentFallback) are extraction-time-only and
    // must not survive into the merged card, same convention as the
    // character deck's needsComponentFallback.
    if ('wcount' in card) fail(errors, `${label}: leftover extraction field "wcount" not stripped`)
    if ('needsCedictFallback' in card) {
      fail(errors, `${label}: leftover extraction field "needsCedictFallback" not stripped`)
    }

    if (!Array.isArray(card.characters) || card.characters.length !== Array.from(card.word ?? '').length) {
      fail(errors, `${label}: characters array doesn't match word length`)
    } else {
      const wordChars = Array.from(card.word as string)
      for (let i = 0; i < card.characters.length; i++) {
        const c = card.characters[i]
        if (c.char !== wordChars[i]) {
          fail(errors, `${label}: characters[${i}].char "${c.char}" doesn't match word position "${wordChars[i]}"`)
        }
        if ('needsComponentFallback' in c) {
          fail(errors, `${label}: characters[${i}] has leftover extraction field "needsComponentFallback"`)
        }
        if (!Array.isArray(c.components)) {
          fail(errors, `${label}: characters[${i}].components missing`)
        }
      }
    }

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
      // The example must actually use the target word, not just be a generic
      // sentence — otherwise "a phrase using the word" isn't being honored.
      if (typeof card.example.hanzi === 'string' && !card.example.hanzi.includes(card.word)) {
        fail(errors, `${label}: example.hanzi does not contain the target word "${card.word}"`)
      }
      const hanziLen = Array.from(card.example.hanzi ?? '').filter((ch) => /[一-鿿]/.test(ch as string)).length
      const pinyinTokens = (card.example.pinyin ?? '').split(/\s+/).filter(Boolean).length
      if (hanziLen > 0 && pinyinTokens >= hanziLen) {
        warnings.push(
          `${label}: pinyin has ${pinyinTokens} space-separated tokens for ${hanziLen} hanzi chars — check for per-character spacing instead of word-grouping`,
        )
      }
    }

    if (!card.batchId) fail(errors, `${label}: missing batchId`)
  }

  console.log(`Checked ${cards.length} word cards from ${filePath}`)
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
