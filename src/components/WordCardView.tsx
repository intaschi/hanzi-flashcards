import { useEffect, useState } from 'preact/hooks'
import { AudioButton } from './AudioButton'
import { audioPath } from '../lib/audioPath'
import type { Grade, WordCard } from '../state/types'

type BackTab = 'characters' | 'example'

interface Props {
  card: WordCard
  revealed: boolean
  onToggleReveal: () => void
  onGrade: (grade: Grade) => void
  introducedCount: number
  totalCount: number
}

// Mirrors CardView's structure and CSS classes closely (same flip mechanic,
// same tab-panel height-stacking trick, same grade row) so the word deck
// feels like the same product as the character deck rather than a
// bolted-on second app. The front face just shows the word as plain text —
// stroke-order practice is a per-character concern the character deck
// already owns, not something a multi-character word card repeats.
export function WordCardView({
  card,
  revealed,
  onToggleReveal,
  onGrade,
  introducedCount,
  totalCount,
}: Props) {
  const [primaryMeaning, ...secondaryMeanings] = card.meanings

  const hasAnyComponents = card.characters.some((c) => c.components.length > 0)
  const tabs: BackTab[] = hasAnyComponents ? ['characters', 'example'] : ['example']
  const [activeTab, setActiveTab] = useState<BackTab>(tabs[0])

  // A word's Characters tab used to stack every character's components at
  // once, making it far taller than the Hanzi deck's Components tab (which
  // only ever shows ONE character) — that's what made the two decks' cards
  // different sizes. Sub-tabbing by character, with the same grid-stack
  // trick, bounds it to one character's worth at a time instead.
  const [activeCharIndex, setActiveCharIndex] = useState(0)

  useEffect(() => {
    setActiveTab(tabs[0])
    setActiveCharIndex(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id])

  return (
    <div class="card-view">
      <div class="card-scene">
        <span
          class="card-progress-badge progress-badge"
          title={`${introducedCount} of ${totalCount} words learned`}
        >
          <span class="progress-dot" />
          <strong>{introducedCount.toLocaleString()}</strong>
          <span class="progress-of">/ {totalCount.toLocaleString()}</span>
        </span>

        <div class="card-controls">
          <AudioButton
            text={card.word}
            label="Play word pronunciation"
            src={audioPath('words', card.id)}
          />
          <button
            type="button"
            class="flip-btn"
            onClick={onToggleReveal}
            aria-label={revealed ? 'Show question' : 'Show answer'}
            title={revealed ? 'Show question' : 'Show answer'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path
                d="M4 12a8 8 0 0 1 13.6-5.7M20 12a8 8 0 0 1-13.6 5.7"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M17 3v4h-4M7 21v-4h4"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>

        <div class={`card-flip ${revealed ? 'is-revealed' : ''}`}>
          <div class="card-face card-surface" aria-hidden={revealed} inert={revealed || undefined}>
            <span class="word-front-text chinese">{card.word}</span>
          </div>

          <div
            class="card-face card-face--back card-surface"
            aria-hidden={!revealed}
            inert={!revealed || undefined}
          >
            <div class="card-back">
              <div class="card-back-summary">
                <div class="card-back-head">
                  <span class="card-back-char chinese word-back-word">{card.word}</span>
                  <div class="pinyin">{card.pinyin}</div>
                </div>
                <div class="meanings">
                  <h3>Meanings</h3>
                  <p class="meaning-primary">{primaryMeaning}</p>
                  {secondaryMeanings.length > 0 && (
                    <p class="meaning-secondary">{secondaryMeanings.join(' · ')}</p>
                  )}
                </div>
              </div>

              {tabs.length > 1 && (
                <div class="card-tabs" role="tablist">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab}
                      class={`card-tab-btn ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab === 'characters' ? 'Characters' : 'Example'}
                    </button>
                  ))}
                </div>
              )}

              <div class="card-tab-panels">
                {hasAnyComponents && (
                  <div
                    class="word-characters"
                    aria-hidden={activeTab !== 'characters'}
                    inert={activeTab !== 'characters' || undefined}
                  >
                    <div class="word-char-tabs" role="tablist">
                      {card.characters.map((wc, i) => (
                        <button
                          key={i}
                          type="button"
                          role="tab"
                          aria-selected={activeCharIndex === i}
                          class={`word-char-tab-btn chinese ${activeCharIndex === i ? 'active' : ''}`}
                          onClick={() => setActiveCharIndex(i)}
                        >
                          {wc.char}
                        </button>
                      ))}
                    </div>

                    <div class="word-char-panels">
                      {card.characters.map((wc, i) => (
                        <div
                          class="word-char-block"
                          key={i}
                          aria-hidden={activeCharIndex !== i}
                          inert={activeCharIndex !== i || undefined}
                        >
                          {wc.components.length > 0 ? (
                            <div class="components word-char-components">
                              {wc.components.map((c, j) => (
                                <div class="component" key={j}>
                                  <span class="component-char">{c.char ?? '—'}</span>
                                  <span class={`component-role role-${c.role}`}>{c.role}</span>
                                  <p class="component-note">{c.note}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p class="word-char-empty">No further breakdown for this character.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  class="example"
                  aria-hidden={activeTab !== 'example'}
                  inert={activeTab !== 'example' || undefined}
                >
                  <p class="example-hanzi" lang="zh">
                    {card.example.hanzi}{' '}
                    <AudioButton
                      text={card.example.hanzi}
                      label="Play example sentence"
                      compact
                      src={audioPath('words-example', card.id)}
                    />
                  </p>
                  <p class="example-pinyin">{card.example.pinyin}</p>
                  <p class="example-english">{card.example.english}</p>
                  <p class="example-fact-label">Fun fact</p>
                  <p class="example-fact">{card.example.fact}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grade-row">
        <button
          type="button"
          class="grade-btn grade-again"
          disabled={!revealed}
          onClick={() => onGrade('again')}
        >
          Again
        </button>
        <button
          type="button"
          class="grade-btn grade-hard"
          disabled={!revealed}
          onClick={() => onGrade('hard')}
        >
          Hard
        </button>
        <button
          type="button"
          class="grade-btn grade-good"
          disabled={!revealed}
          onClick={() => onGrade('good')}
        >
          Good
        </button>
        <button
          type="button"
          class="grade-btn grade-easy"
          disabled={!revealed}
          onClick={() => onGrade('easy')}
        >
          Easy
        </button>
      </div>
    </div>
  )
}
