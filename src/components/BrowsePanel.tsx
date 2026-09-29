import { useMemo, useState } from 'preact/hooks'
import type { SrsState, WordCard } from '../state/types'

interface Props {
  cards: WordCard[]
  srsState: SrsState
}

export function BrowsePanel({ cards, srsState }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cards
    return cards.filter(
      (c) =>
        c.word.includes(q) ||
        c.pinyin.toLowerCase().includes(q) ||
        c.meanings.some((m) => m.toLowerCase().includes(q)),
    )
  }, [cards, query])

  return (
    <div class="browse-panel">
      <div class="browse-head">
        <h2>All words</h2>
        <p class="browse-count">
          {filtered.length.toLocaleString()} of {cards.length.toLocaleString()}
        </p>
      </div>

      {/* A solid card behind the search box and list — against the
          full-bleed background art, plain text/rows had nowhere near
          enough contrast to stay legible. */}
      <div class="browse-content">
        <input
          type="search"
          class="browse-search"
          placeholder="Search by word, pinyin, or meaning…"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        />

        <div class="browse-list">
          {filtered.map((c) => {
            const learned = Boolean(srsState.cards[c.id])
            return (
              <div class={`browse-row ${learned ? 'is-learned' : ''}`} key={c.id}>
                <span class="browse-rank">#{c.frequencyRank}</span>
                <span class="browse-char chinese">{c.word}</span>
                <span class="browse-pinyin">{c.pinyin}</span>
                <span class="browse-meanings">{c.meanings.join(' · ')}</span>
                {learned && <span class="browse-badge">learned</span>}
              </div>
            )
          })}

          {filtered.length === 0 && <p class="browse-empty">No words match "{query}".</p>}
        </div>
      </div>
    </div>
  )
}
