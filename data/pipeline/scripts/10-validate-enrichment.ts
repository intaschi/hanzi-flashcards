// Structural checks for the enrichment passes' output files (see
// 09-prepare-enrichment-inputs.ts). Each output must answer its input one
// to one, in order.
//
// Usage: npx tsx 10-validate-enrichment.ts <components|phrases> <path-to-output.json>
// The matching input is found by swapping ".output.json" for ".input.json".

import { readFileSync } from 'node:fs'

const ROLES = new Set(['semantic', 'phonetic', 'ideographic', 'pictographic'])
const SOURCES = new Set(['makemeahanzi', 'llm-fallback'])
const HAN = /[一-鿿]/

function main() {
  const [kind, file] = process.argv.slice(2)
  if ((kind !== 'components' && kind !== 'phrases') || !file) {
    console.error('Usage: 10-validate-enrichment.ts <components|phrases> <output.json>')
    process.exit(1)
  }
  const errors: string[] = []
  const output = JSON.parse(readFileSync(file, 'utf8')) as any[]
  const input = JSON.parse(readFileSync(file.replace('.output.json', '.input.json'), 'utf8')) as any[]

  if (output.length !== input.length) errors.push(`Expected ${input.length} entries, found ${output.length}`)

  input.forEach((inp, i) => {
    const out = output[i]
    if (!out) return
    if (kind === 'components') {
      if (out.char !== inp.char) errors.push(`#${i}: expected char ${inp.char}, got ${out.char}`)
      if (!Array.isArray(out.components)) return errors.push(`${inp.char}: components missing`)
      if (out.components.length > 3) errors.push(`${inp.char}: more than 3 components`)
      let radicals = 0
      for (const c of out.components) {
        if (!ROLES.has(c.role)) errors.push(`${inp.char}: bad role "${c.role}"`)
        if (!SOURCES.has(c.source)) errors.push(`${inp.char}: bad source "${c.source}"`)
        if (typeof c.note !== 'string' || c.note.trim().length < 10) errors.push(`${inp.char}: note missing/short`)
        else if (c.note.length > 260) errors.push(`${inp.char}: note longer than 260 chars`)
        if ('radical' in c && c.radical !== true) errors.push(`${inp.char}: radical must be true when present`)
        if (c.radical) radicals++
        if (c.char !== undefined && Array.from(c.char).length !== 1) errors.push(`${inp.char}: component char must be one glyph`)
      }
      if (radicals > 1) errors.push(`${inp.char}: more than one radical component`)
    } else {
      if (out.id !== inp.id || out.word !== inp.word) errors.push(`#${i}: id/word mismatch for ${inp.word}`)
      if (!Array.isArray(out.examples) || out.examples.length !== 2) return errors.push(`${inp.word}: need exactly 2 examples`)
      const seen = new Set<string>([inp.existingExample.hanzi])
      for (const ex of out.examples) {
        for (const f of ['hanzi', 'pinyin', 'english']) {
          if (typeof ex[f] !== 'string' || !ex[f].trim()) errors.push(`${inp.word}: example.${f} missing`)
        }
        if (typeof ex.hanzi === 'string') {
          if (!ex.hanzi.includes(inp.word)) errors.push(`${inp.word}: example does not contain the word: ${ex.hanzi}`)
          if (seen.has(ex.hanzi)) errors.push(`${inp.word}: duplicate sentence ${ex.hanzi}`)
          seen.add(ex.hanzi)
          const hanziLen = Array.from(ex.hanzi).filter((c) => HAN.test(c as string)).length
          if (hanziLen < 4 || hanziLen > 22) errors.push(`${inp.word}: sentence length ${hanziLen} out of range`)
          const tokens = typeof ex.pinyin === 'string' ? ex.pinyin.split(/\s+/).filter(Boolean).length : 0
          if (hanziLen > 0 && tokens >= hanziLen) errors.push(`${inp.word}: pinyin looks spaced per character: ${ex.pinyin}`)
        }
      }
    }
  })

  console.log(`Checked ${output.length} ${kind} entries from ${file}`)
  if (errors.length > 0) {
    console.error(`${errors.length} ERROR(S):`)
    errors.slice(0, 40).forEach((e) => console.error(`  - ${e}`))
    process.exit(1)
  }
  console.log('OK')
}

main()
