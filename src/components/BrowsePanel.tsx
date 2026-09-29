import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { SrsState, WordCard } from '../state/types'

interface Props {
  cards: WordCard[]
  srsState: SrsState
}

const PAGE_SIZE = 60

export function BrowsePanel({ cards, srsState }: Props) {
  const [query, setQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

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

  // A fresh search should show its own first page immediately, not
  // whatever page depth the previous query had scrolled to.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [query])

  // Rendering all 5,000 rows on first paint (rather than the underlying
  // fetch, which is quick) was the actual source of the lag — growing the
  // list in pages as the sentinel scrolls into view keeps the DOM small
  // until the user actually scrolls down for more.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleCount((v) => Math.min(v + PAGE_SIZE, filtered.length))
      }
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [filtered.length])

  const visible = filtered.slice(0, visibleCount)

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
          {visible.map((c) => {
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

          {visibleCount < filtered.length && <div ref={sentinelRef} class="browse-load-sentinel" />}
        </div>
      </div>
    </div>
  )
}
