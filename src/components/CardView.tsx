import { useEffect, useRef, useState } from 'preact/hooks'
import { CharacterStage } from './CharacterStage'
import { AudioButton } from './AudioButton'
import { audioPath } from '../lib/audioPath'
import { animateScrollLeft } from '../lib/scroll'
import type { Card, Grade } from '../state/types'

type BackTab = 'meaning' | 'components' | 'example'

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
  const tabs: BackTab[] = ['meaning', ...(hasComponents ? (['components'] as const) : []), 'example']
  const [activeTab, setActiveTab] = useState<BackTab>('meaning')
  const pagerRef = useRef<HTMLDivElement>(null)

  // Meaning/Components/Example are equal-weight pages here, not a fixed
  // meanings header with a tabbed body underneath — on a narrow phone,
  // meanings could run long enough (的 alone has six senses) to leave next
  // to nothing on screen for the example/components. Desktop still renders
  // this as the old grid-stack (meaning showing by default, tab away from
  // it exactly like before); mobile turns .card-pager into a horizontally
  // swipeable, snap-to strip — the tab buttons and the swipe both move the
  // same underlying scroll position, so either works interchangeably.
  useEffect(() => {
    setActiveTab('meaning')
    if (pagerRef.current) pagerRef.current.scrollLeft = 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id])

  function goToTab(tab: BackTab) {
    setActiveTab(tab)
    const pager = pagerRef.current
    if (!pager) return
    const index = tabs.indexOf(tab)
    animateScrollLeft(pager, index * pager.clientWidth)
  }

  function handlePagerScroll(e: Event) {
    const pager = e.currentTarget as HTMLDivElement
    if (pager.clientWidth === 0) return
    const index = Math.round(pager.scrollLeft / pager.clientWidth)
    const tab = tabs[index]
    if (tab && tab !== activeTab) setActiveTab(tab)
  }

  // Lets either face flip on a plain tap without hijacking the controls that
  // already live on top of them (stroke-order canvas/replay link on the
  // front, tab/audio buttons on the back) — anything button-like handles its
  // own click and this just gets out of the way instead.
  function handleFaceClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('button, [role="button"], a')) return
    onToggleReveal()
  }

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

        <div class={`card-flip ${revealed ? 'is-revealed' : ''}`}>
          <div
            class="card-face card-surface"
            aria-hidden={revealed}
            inert={revealed || undefined}
            onClick={handleFaceClick}
          >
            <CharacterStage character={card.character} />
          </div>

          <div
            class="card-face card-face--back card-surface"
            onClick={handleFaceClick}
            aria-hidden={!revealed}
            inert={!revealed || undefined}
          >
            <div class="card-back">
              <div class="card-back-head">
                <span class="card-back-char chinese">{card.character}</span>
                <div class="pinyin">{card.pinyin}</div>
              </div>

              <div class="card-tabs" role="tablist">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    class={`card-tab-btn ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => goToTab(tab)}
                  >
                    {tab === 'meaning' ? 'Meaning' : tab === 'components' ? 'Components' : 'Example'}
                  </button>
                ))}
              </div>

              {/* Desktop: all pages render at once, grid-stacked in the same
                  cell, sized to whichever is tallest — switching tabs never
                  resizes the card. Mobile: this same markup becomes a
                  horizontally swipeable, snap-to strip instead (see the
                  max-width:480px rules for .card-pager/.card-page). */}
              <div class="card-pager" ref={pagerRef} onScroll={handlePagerScroll}>
                <div class="card-page" aria-hidden={activeTab !== 'meaning'}>
                  <div class="meanings">
                    <h3>Meanings</h3>
                    <p class="meaning-primary">{primaryMeaning}</p>
                    {secondaryMeanings.length > 0 && (
                      <p class="meaning-secondary">{secondaryMeanings.join(' · ')}</p>
                    )}
                  </div>
                </div>

                {hasComponents && (
                  <div class="card-page" aria-hidden={activeTab !== 'components'}>
                    <div class="components">
                      {card.components.map((c, i) => (
                        <div class="component" key={i}>
                          <span class="component-char">{c.char ?? '—'}</span>
                          <span class={`component-role role-${c.role}`}>{c.role}</span>
                          <p class="component-note">{c.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div class="card-page" aria-hidden={activeTab !== 'example'}>
                  <div class="example">
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
      </div>

      <div class="grade-row">
        <button
          type="button"
          class="grade-btn grade-again"
          onClick={() => onGrade('again')}
        >
          Again
        </button>
        <button
          type="button"
          class="grade-btn grade-hard"
          onClick={() => onGrade('hard')}
        >
          Hard
        </button>
        <button
          type="button"
          class="grade-btn grade-good"
          onClick={() => onGrade('good')}
        >
          Good
        </button>
        <button
          type="button"
          class="grade-btn grade-easy"
          onClick={() => onGrade('easy')}
        >
          Easy
        </button>
      </div>

      <div class="scroll-bottom-spacer" aria-hidden="true" />
    </div>
  )
}
