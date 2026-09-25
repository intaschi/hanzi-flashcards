import { useEffect, useState } from 'preact/hooks'
import { CharacterStage } from './CharacterStage'
import { AudioButton } from './AudioButton'
import { audioPath } from '../lib/audioPath'
import type { Card, Grade } from '../state/types'

type BackTab = 'components' | 'example'

interface Props {
  card: Card
  revealed: boolean
  onToggleReveal: () => void
  onGrade: (grade: Grade) => void
  introducedCount: number
  totalCount: number
}

// A real dual-face flip: the whole card — not just its text — is one
// rotating object. Both faces carry the full card-surface styling (bg,
// border, shadow) and are stacked in the same grid cell so the object never
// resizes between states; only .card-flip itself rotates 180° in 3D. The
// audio/flip controls live OUTSIDE .card-flip (a sibling in .card-scene) so
// they never rotate away and stay clickable — and usable — on either face.
export function CardView({
  card,
  revealed,
  onToggleReveal,
  onGrade,
  introducedCount,
  totalCount,
}: Props) {
  // First sense carries the primary gloss; the rest (near-synonyms, rare
  // alt-readings, abbreviations) are demoted a step so they don't compete
  // with it for attention.
  const [primaryMeaning, ...secondaryMeanings] = card.meanings

  const hasComponents = card.components.length > 0
  const tabs: BackTab[] = hasComponents ? ['components', 'example'] : ['example']
  const [activeTab, setActiveTab] = useState<BackTab>(tabs[0])

  // Meanings + the head (character/pinyin) stay always visible — that's the
  // actual answer to the card. Components and Example are tabbed instead of
  // stacked, so the card's height is bounded by whichever ONE section is
  // showing rather than the sum of all of them — that sum is what made the
  // card balloon on content-heavy characters and force a scroll.
  useEffect(() => {
    setActiveTab(tabs[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id])

  return (
    <div class="card-view">
      <div class="card-scene">
        <span
          class="card-progress-badge progress-badge"
          title={`${introducedCount} of ${totalCount} characters learned`}
        >
          <span class="progress-dot" />
          <strong>{introducedCount.toLocaleString()}</strong>
          <span class="progress-of">/ {totalCount.toLocaleString()}</span>
        </span>

        <div class="card-controls">
          <AudioButton
            text={card.character}
            label="Play character pronunciation"
            src={audioPath('hanzi', card.id)}
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
            <CharacterStage character={card.character} />
          </div>

          <div
            class="card-face card-face--back card-surface"
            aria-hidden={!revealed}
            inert={!revealed || undefined}
          >
            <div class="card-back">
              <div class="card-back-summary">
                <div class="card-back-head">
                  <span class="card-back-char chinese">{card.character}</span>
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
                      {tab === 'components' ? 'Components' : 'Example'}
                    </button>
                  ))}
                </div>
              )}

              {/* Both panels render at once, grid-stacked in the same cell
                  (see .card-tab-panels), so the card sizes to whichever tab
                  is TALLER, not whichever is active — switching tabs would
                  otherwise resize the card exactly the way flipping used to
                  before that was fixed the same way. */}
              <div class="card-tab-panels">
                {hasComponents && (
                  <div
                    class="components"
                    aria-hidden={activeTab !== 'components'}
                    inert={activeTab !== 'components' || undefined}
                  >
                    {card.components.map((c, i) => (
                      <div class="component" key={i}>
                        <span class="component-char">{c.char ?? '—'}</span>
                        <span class={`component-role role-${c.role}`}>{c.role}</span>
                        <p class="component-note">{c.note}</p>
                      </div>
                    ))}
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
                      src={audioPath('hanzi-example', card.id)}
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
