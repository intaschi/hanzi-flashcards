// Builds the frequency-ordered word-card draft list: filters the vendored
// SUBTLEX-CH word-frequency corpus down to pure-Han, 2+ character words (the
// corpus mixes in single characters and proper nouns from film dialogue —
// e.g. 杰克·鲍尔 "Jack Bauer" — neither of which belong in a word-vocabulary
// deck), takes the top N by real frequency count, and cross-references
// CC-CEDICT for pinyin/meanings and our own already-generated character
// cards for each word's constituent characters (reusing their components
// rather than regenerating them).
//
// Usage: npx tsx 00-extract-word-frequency.ts <count>

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SOURCES_DIR = path.resolve(__dirname, '../sources')
const DRAFTS_DIR = path.resolve(__dirname, '../drafts')
const CARDS_DIR = path.resolve(__dirname, '../../cards')

const HAN_ONLY_RE = /^[一-鿿]+$/

interface CedictEntry {
  pinyinSyllables: string[]
  meanings: string[]
}

const TONE_MARKS: Record<string, string[]> = {
  a: ['a', 'ā', 'á', 'ǎ', 'à'],
  e: ['e', 'ē', 'é', 'ě', 'è'],
  i: ['i', 'ī', 'í', 'ǐ', 'ì'],
  o: ['o', 'ō', 'ó', 'ǒ', 'ò'],
  u: ['u', 'ū', 'ú', 'ǔ', 'ù'],
  v: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'], // CC-CEDICT spells ü as v in numbered pinyin
}

// Standard tone-placement rule: a/e always take the mark; else the o in "ou";
// else the SECOND vowel in any other two-vowel run (covers iu -> u, ui -> i);
// else the syllable's only vowel.
function applyToneMark(syllable: string, tone: number): string {
  if (tone === 5 || tone === 0) return syllable.replace('v', 'ü')
  const lower = syllable.toLowerCase()
  let vowelIndex = -1
  if (lower.includes('a')) vowelIndex = lower.indexOf('a')
  else if (lower.includes('e')) vowelIndex = lower.indexOf('e')
  else if (lower.includes('ou')) vowelIndex = lower.indexOf('o')
  else {
    const vowelPositions = [...lower].reduce<number[]>((acc, ch, i) => {
      if ('iouv'.includes(ch)) acc.push(i)
      return acc
    }, [])
    vowelIndex = vowelPositions.length > 0 ? vowelPositions[vowelPositions.length - 1] : -1
  }
  if (vowelIndex === -1) return syllable.replace('v', 'ü')
  const vowel = lower[vowelIndex]
  const marked = TONE_MARKS[vowel]?.[tone]
  if (!marked) return syllable.replace('v', 'ü')
  return syllable.slice(0, vowelIndex).replace('v', 'ü') + marked + syllable.slice(vowelIndex + 1).replace('v', 'ü')
}

function numberedPinyinToDiacritic(syllable: string): string {
  const m = /^([a-zA-Z:]+)([0-5])$/.exec(syllable)
  if (!m) return syllable
  const [, base, toneStr] = m
  return applyToneMark(base, Number(toneStr))
}

function loadCedictAllLengths(): Map<string, CedictEntry> {
  const raw = readFileSync(path.join(SOURCES_DIR, 'cedict.txt'), 'utf8')
  // CC-CEDICT lists the same headword on multiple lines when it has more than
  // one reading/sense (e.g. 大学 appears as "Da4 xue2" / "the Great Learning"
  // — a rare Confucian-text sense — BEFORE "da4 xue2" / "university; college"
  // — the common sense). Keeping only the first line per word (as an earlier
  // version of this loader did) silently threw away the common sense for
  // words that happen to have a rarer sense listed first. Collect every
  // line per word instead, then pick in a second pass.
  const rawEntries = new Map<string, CedictEntry[]>()
  const lineRe = /^(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+\/(.*)\/\s*$/
  for (const line of raw.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue
    const m = lineRe.exec(line)
    if (!m) continue
    const simplified = m[2]
    const pinyinSyllables = m[3].split(/\s+/).map(numberedPinyinToDiacritic)
    // Each /slash-delimited/ CEDICT segment can itself bundle multiple senses
    // separated by ';' (e.g. "to happen; to occur; to take place; to arise
    // (e.g. ...)") — split those out too, or a single long bundled segment
    // gets dropped whole by the length filter downstream, leaving common
    // words like 发生 with zero meanings despite CEDICT actually covering them.
    const meanings = m[4]
      .split('/')
      .flatMap((seg) => seg.split(';'))
      .map((d) => d.trim())
      .filter(Boolean)
    const existing = rawEntries.get(simplified) ?? []
    existing.push({ pinyinSyllables, meanings })
    rawEntries.set(simplified, existing)
  }

  const map = new Map<string, CedictEntry>()
  for (const [word, entries] of rawEntries) {
    // Different lines for the same word can be genuinely different readings
    // with unrelated senses (高中 is "gāo zhōng" senior-high-school AND,
    // separately, "gāo zhòng" to-pass-brilliantly) — merging meanings across
    // readings mixes the wrong gloss into the chosen pronunciation. Group by
    // exact reading first, so each group's meanings only ever come from that
    // same reading.
    const groups = new Map<string, CedictEntry[]>()
    for (const e of entries) {
      const key = e.pinyinSyllables.join(' ')
      const g = groups.get(key) ?? []
      g.push(e)
      groups.set(key, g)
    }
    // A capitalized pinyin syllable is CC-CEDICT's own convention for marking
    // a proper-noun reading — prefer whichever reading is ordinary vocabulary
    // (all-lowercase) over a proper-noun sense listed earlier for the same word.
    const isProperNoun = (key: string) => /[A-Z]/.test(key)
    const chosenKey =
      Array.from(groups.keys()).find((k) => !isProperNoun(k)) ?? entries[0].pinyinSyllables.join(' ')
    const chosenGroup = groups.get(chosenKey)!
    const meanings = Array.from(new Set(chosenGroup.flatMap((e) => e.meanings)))
    map.set(word, { pinyinSyllables: chosenGroup[0].pinyinSyllables, meanings })
  }
  return map
}

interface ExistingComponent {
  char: string
  role: string
  note?: string
  source: string
}

function loadExistingCharacterComponents(): Map<string, ExistingComponent[]> {
  const map = new Map<string, ExistingComponent[]>()
  for (const file of readdirSync(CARDS_DIR)) {
    if (!file.endsWith('.json')) continue
    const cards = JSON.parse(readFileSync(path.join(CARDS_DIR, file), 'utf8'))
    for (const card of cards) {
      map.set(card.character, card.components ?? [])
    }
  }
  return map
}

// SUBTLEX-CH is a film/TV subtitle corpus, so transliterated character
// names and a couple of pure corpus artifacts (a laughter transcription, a
// truncated show-title fragment) surface at surprisingly high rank — none
// of it is vocabulary worth studying. Identified by inspection of every
// no-CEDICT-match entry in the top 5000, cross-checked against known
// English-name transliteration conventions (not guessed from pattern-match
// alone). Excluding these means the Nth-ranked word is a real word, not a
// character name that happened to be spoken often on screen.
const EXCLUDED_PROPER_NOUNS_AND_ARTIFACTS = new Set([
  '查理', '乔伊', '福尔摩斯', '威尔', '皮特', '鲍勃', '汤米', '迈克', '比利',
  '克里斯', '西蒙', '维加斯', '吉姆', '华生', '安迪', '鲍尔', '麦克斯', '沃尔特',
  '珍妮', '凯尔', '戴夫', '鲍比', '克鲁', '莉莉', '斯坦', '亚历克斯', '克罗伊',
  '艾米', '泰德', '琳达', '萨拉', '雷斯', '沃恩', '扎克', '艾伦', '迈尔斯',
  '斯科特', '里斯', '韦恩', '莫里斯', '吉尔', '凯伦', '马特', '瑞秋', '哈维',
  '萨姆', '查克', '伊恩', '埃迪', '艾玛', '尼尔', '费耶德', '吉娜', '艾美',
  '贝丝', '劳拉', '罗伊', '贝蒂', '菲尔', '沃特', '马修', '包里克', '马蒂',
  '全美超', '哈哈哈', '巴迪',
])

function parseSubtlexWords(): Array<{ word: string; wcount: number }> {
  const raw = readFileSync(path.join(SOURCES_DIR, 'subtlex-ch-wf.tsv'), 'utf8')
  const lines = raw.split('\n')
  const out: Array<{ word: string; wcount: number }> = []
  for (const line of lines.slice(3)) {
    if (!line.trim()) continue
    const [word, wcountStr] = line.split('\t')
    if (!word || !HAN_ONLY_RE.test(word)) continue
    if (Array.from(word).length < 2) continue
    if (EXCLUDED_PROPER_NOUNS_AND_ARTIFACTS.has(word)) continue
    out.push({ word, wcount: Number(wcountStr) })
  }
  return out
}

// A meaning that runs long is often a short gloss plus a parenthetical aside
// (an abbreviation expansion, a classifier note, an example) — truncating at
// the aside keeps the actual gloss instead of dropping the whole meaning for
// being too long, which for a word whose only CEDICT sense reads long left
// it with zero meanings (e.g. 高中's only sense is "senior high school
// (abbr. for 高級中學|高级中学[gao1 ji2 zhong1 xue2])").
function shortenMeaning(meaning: string): string {
  const parenIdx = meaning.indexOf('(')
  if (parenIdx > 10) {
    const truncated = meaning.slice(0, parenIdx).trim()
    if (truncated.length > 0) return truncated
  }
  return meaning
}

function toId(word: string): string {
  return (
    'W+' +
    Array.from(word)
      .map((c) => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0'))
      .join('-')
  )
}

function main() {
  const count = Number(process.argv[2])
  if (!count || count <= 0) {
    console.error('Usage: npx tsx 00-extract-word-frequency.ts <count>')
    process.exit(1)
  }

  const words = parseSubtlexWords().slice(0, count)
  const cedict = loadCedictAllLengths()
  const charComponents = loadExistingCharacterComponents()

  let needsCedictFallback = 0
  let charsNeedingFreshComponents = 0

  const draftWords = words.map((row, i) => {
    const rank = i + 1
    const cedictEntry = cedict.get(row.word)
    // Explicit null (not undefined) so the field survives JSON.stringify —
    // an omitted key here previously made "missing pinyin" indistinguishable
    // from "the property was never checked."
    const pinyin = cedictEntry?.pinyinSyllables.join(' ') ?? null
    const meanings = (cedictEntry?.meanings ?? [])
      .map(shortenMeaning)
      .filter((d) => d.length <= 60)
      .slice(0, 6)
    if (!cedictEntry || meanings.length === 0) needsCedictFallback++

    const characters = Array.from(row.word).map((char) => {
      const existing = charComponents.get(char)
      if (existing === undefined) charsNeedingFreshComponents++
      return {
        char,
        components: existing ?? [],
        needsComponentFallback: existing === undefined || existing.length === 0,
      }
    })

    return {
      id: toId(row.word),
      word: row.word,
      frequencyRank: rank,
      wcount: row.wcount,
      pinyin,
      meanings,
      needsCedictFallback: !cedictEntry || meanings.length === 0,
      characters,
      example: null,
    }
  })

  mkdirSync(DRAFTS_DIR, { recursive: true })
  const outPath = path.join(DRAFTS_DIR, `words-0001-${String(count).padStart(4, '0')}.draft.json`)
  writeFileSync(outPath, JSON.stringify(draftWords, null, 2))
  console.log(`Wrote ${draftWords.length} draft word cards to ${outPath}`)
  console.log(`  ${needsCedictFallback} need LLM-authored pinyin + meanings (no/empty CEDICT entry)`)
  console.log(`  ${charsNeedingFreshComponents} character occurrences need fresh component generation (not in our existing character cards)`)
}

main()
