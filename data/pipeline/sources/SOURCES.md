# Vendored source snapshots

Fetched 2026-09-16. Re-run the curl commands in this repo's implementation history if a
refresh is ever needed — pin a new date here when you do.

| File | Origin | Fetched | License |
|---|---|---|---|
| `hanziDB.csv` | https://github.com/ruddfawcett/hanziDB.csv (raw, `master` branch), itself derived from Jun Da's Modern Chinese Character Frequency List | 2026-09-16 | MIT — see `LICENSES/hanziDB-LICENSE.txt` |
| `cedict.txt` | https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz — CC-CEDICT release dated 2026-09-15 per its own header (`#! date=2026-09-15T08:05:39Z`), 125067 entries | 2026-09-16 | CC BY-SA 4.0 — license notice is embedded in the file's own header comment block |
| `makemeahanzi/dictionary.txt` | https://github.com/skishore/makemeahanzi (raw, `master` branch) | 2026-09-16 | Arphic Public License — see `LICENSES/makemeahanzi-COPYING.txt` |
| `makemeahanzi/graphics.txt` | https://github.com/skishore/makemeahanzi (raw, `master` branch) | 2026-09-16 | Same repo, see COPYING for the graphics.txt-specific terms |
| `subtlex-ch-wf.tsv` | https://doi.org/10.1371/journal.pone.0010729.s002 (SUBTLEX-CH-WF file from the paper's supplementary zip), 99124 word entries, GBK-encoded in the original zip, converted to UTF-8 on vendoring | 2026-09-24 | No formal license; citation requested — see `LICENSES/SUBTLEX-CH-CITATION.txt` |

`hanzi-writer` itself (the npm package used at runtime for stroke-order animation,
not a vendored data file) is MIT-licensed — `LICENSES/hanzi-writer-LICENSE.txt`.

## Format notes (verified by direct inspection, not assumed)

- `hanziDB.csv` columns: `frequency_rank,character,pinyin,definition,radical,radical_code,stroke_count,hsk_level,general_standard_num`. ~9900 rows, strictly ordered by `frequency_rank`. Pinyin already carries tone diacritics (e.g. `yī`, not `yi1`).
- `cedict.txt`: `Traditional Simplified [numbered-tone pinyin] /def1/def2/.../` per line, plus a `#`-prefixed header block. Numbered-tone pinyin (e.g. `zhong1`), not diacritics.
- `makemeahanzi/dictionary.txt`: one JSON object per line, no whitespace after `:` — e.g. `{"character":"妈","definition":"mother, mama","pinyin":["mā"],"decomposition":"⿰女马","etymology":{"type":"pictophonetic","phonetic":"马","semantic":"女","hint":"woman"},"radical":"女","matches":[...]}`. Only `type:"pictophonetic"` entries carry `phonetic`/`semantic`; other types (`ideographic`, `pictographic`, `comprehensible`, ...) carry only `hint`, or no `etymology` key at all if unknown. 9574 lines.
- `makemeahanzi/graphics.txt`: one JSON object per line, `{"character":..., "strokes": [...SVG path data...], "medians": [...]}` — used to derive the trimmed per-character stroke files bundled at build time (not to be shipped in full).
- `subtlex-ch-wf.tsv`: tab-separated, two `"..."`-quoted header lines (total word count, context number) then a `Word\tWCount\tW/million\tlogW\tW-CD\tW-CD%\tlogW-CD` header row, then data. Strictly sorted descending by `WCount` (verified by direct scan, not assumed) — 99124 rows, mixing 1-character and multi-character entries (5321 single-char, 45871 two-char, 24683 three-char, 11495 four-char, rest longer). Being a film-subtitle corpus, includes proper nouns from dialogue (place names, character names like 杰克·鲍尔 "Jack Bauer") mixed into genuine vocabulary — not filtered out at the source, so downstream extraction filters to pure-Han multi-character entries.
