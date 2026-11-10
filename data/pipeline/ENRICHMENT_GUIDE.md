# Enrichment guide: character components and extra example phrases

Writing rules for the two passes prepared by `scripts/09-prepare-enrichment-inputs.ts`
and checked by `scripts/10-validate-enrichment.ts`. Output is merged into the word
cards by `scripts/11-apply-enrichment.ts`. Everything here serves a learner of
Mandarin who wants to understand and remember each character, not a linguist.

---

## A. Character components (`components-NNNN-MMMM.input.json` -> `.output.json`)

One entry per unique character. Components belong to the *character*, so the same
breakdown is shown on every word containing it. Write the output as a JSON array in
the same order as the input:

```json
[{ "char": "河", "components": [
  { "char": "氵", "role": "semantic", "radical": true, "source": "makemeahanzi",
    "note": "氵 (water radical, 三点水) — marks rivers, liquids and anything that flows, as in 海 sea, 汤 soup, 酒 liquor." },
  { "char": "可", "role": "phonetic", "source": "makemeahanzi",
    "note": "可 (kě) hints at the sound — 河 is hé, close enough to help; 可 also sounds out 歌 gē and 何 hé." }
] }]
```

### What to include — only what helps someone learn THIS character

1. **The radical, when it is a meaningful family.** If `dictionary.radical` (or an
   obvious component) is a semantic family — 氵 water/liquids, 讠 speech/language,
   忄 heart/feelings, 扌 hand/actions, 艹 plants, 木 wood/trees, 钅 metal, 饣 food,
   衤 clothing, 辶 movement/roads, 疒 illness, 口 mouth/speech, 日 sun/time, 女 women,
   纟 thread/silk, 土 earth, 火 fire, 心, 手, 足/⻊ foot, 雨 rain/weather, 门 gate,
   犭 animals, 宀 roof/house, 彳 walking — give it `"radical": true` and an *insight
   note*: its name, the kind of characters it usually appears in, and one or two other
   common characters that show it. This teaches patterns that carry over to hundreds of
   characters. Mention the traditional counterpart when it explains a simplified
   radical (讠 = 言, 钅 = 金, 饣 = 食, 纟 = 糸).
   If the character's radical is opaque or just a stroke grouping (e.g. 一, 丨, 丶, 乙, 亅),
   do not dwell on it; only mention it if it genuinely clarifies the character.
2. **A phonetic component, when it actually helps pronunciation.** Say how close it is
   (same sound / same sound different tone / only a loose hint) and, where useful, name
   one or two common characters that share it (the "sound series": 青 → 清 请 情 晴).
   If the sound has drifted so far that the phonetic is useless, either say so in a
   few words ("sound clue is only loose today") or leave it out.
3. **A visual / meaning story** for pictographic and ideographic characters — what the
   picture or combination shows, in a form that is easy to remember (e.g. 明 = sun 日 +
   moon 月 → bright). Only include stories that are well established. Never invent a
   folk etymology to fill space.
4. **Skip noise.** Obscure or purely structural parts that do not help (a stroke
   cluster nobody names, a part that is only there for balance) are left out. Fewer,
   better components beat a complete but useless decomposition. An empty list is allowed
   only if nothing reliable and useful can be said.

Limits: at most **3** components, most useful first (a meaningful radical first). At
most one component per entry may carry `"radical": true`. Each note is 1–2 sentences,
≤ 220 characters, starts with the part and a short gloss in the form `氵 (water) — …`,
is concrete and learner-oriented, and is accurate. If you are not sure, say less.

Fields: `char` (a single glyph — the part, using the simplified/radical form the learner
sees; omit it only for a whole-character picture story), `role` (one of `semantic`,
`phonetic`, `ideographic`, `pictographic`), optional `"radical": true`, `source`
(`makemeahanzi` when the part and its role come from the supplied `dictionary` data,
`llm-fallback` when you supplied it from your own knowledge) and `note`.

Review `currentComponents` critically: they were machine-assembled and are sometimes
wrong (semantic and phonetic swapped, a phonetic that is not really phonetic, a
vague note). Correct or replace them; do not just reword. Use `usedInWords` to pick the
sense of the character the learner actually meets.

Validate: `npx tsx data/pipeline/scripts/10-validate-enrichment.ts components <output.json>`

---

## B. Two extra example phrases per word (`phrases-?-NNNN-MMMM.input.json` -> `.output.json`)

The card already has one example sentence (`existingExample`). Add **two more** so a
learner sees how the word is really used. Output a JSON array in input order:

```json
[{ "id": "W+4E0B-5348", "word": "下午", "examples": [
  { "hanzi": "我们下午三点开会。", "pinyin": "Wǒmen xiàwǔ sān diǎn kāihuì.", "english": "We have a meeting at three this afternoon." },
  { "hanzi": "昨天下午你去哪儿了？", "pinyin": "Zuótiān xiàwǔ nǐ qù nǎr le?", "english": "Where did you go yesterday afternoon?" }
] }]
```

Rules:
- Each sentence **contains the word exactly as written** and differs from
  `existingExample` and from the other new sentence.
- Make them **show different usage**: a different sense or collocation, a different
  grammatical pattern (negative, question, with a measure word, after a verb, in a
  common fixed phrase), a different register (daily life, work, school, family). For
  words with several common meanings, cover the ones the existing example does not.
  For particles and function words, show their two most typical patterns.
- Natural, everyday Mandarin, beginner-friendly vocabulary around the target word,
  roughly 6–16 Chinese characters. No textbook-stiff or contrived sentences; no
  sensitive or controversial topics.
- `pinyin`: tone-marked, first letter capitalised, grouped into words the way pinyin
  orthography groups them (Wǒmen xiàwǔ sān diǎn kāihuì.), **not** one token per hanzi.
- `english`: natural translation, not word-for-word.
- Keep `id` and `word` exactly as in the input.

Validate: `npx tsx data/pipeline/scripts/10-validate-enrichment.ts phrases <output.json>`

---

## A2. Second pass: characters the first review left empty (`components-fix-NNNN-MMMM`)

The first pass returned an empty list for characters where it could say nothing
reliable. Many of these are among the most common characters (用 头 色 不 了 个 去),
so an empty card back is not acceptable. For every character in a `components-fix-*`
input, return **at least one** component, following section A, with these additions:

- **Show the visible parts.** If `dictionary.decomposition` has parts (e.g. 去 = 土 + 厶),
  list the meaningful ones with their `char`, role `ideographic`, source `makemeahanzi`.
  Say what each part is; if the old story for how they combine is disputed or unknown,
  say so honestly in a few words and offer a clearly labelled **memory aid**
  (`Memory aid: …`) instead of presenting it as history.
- **Pictographs** (用 头 色 午 业…): say what the picture is believed to show, only if it
  is well established; otherwise describe the shape and give a labelled memory aid.
- **Sound-borrowed and grammatical characters** (了 不 么 也 以 为): the shape does not
  explain the meaning today. Say that in one honest sentence, still list the visible
  parts, and — where it is a well-known family member (e.g. the sound series 青 → 清
  请 情) — name it. Never invent an etymology to fill the note.
- Keep to the limits in section A (≤ 3 components, notes ≤ 220 chars, valid roles and
  sources). Write the output to the matching `components-fix-NNNN-MMMM.output.json`.
