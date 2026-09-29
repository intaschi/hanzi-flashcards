import { useEffect, useMemo } from 'preact/hooks'
import { signal } from '@preact/signals'
import { loadAllCards } from './state/cardData'
import { loadAllWordCards } from './state/wordCardData'
import { loadState, WORD_STORAGE_KEY } from './state/srs'
import { useReviewDeck } from './state/useReviewDeck'
import type { Card, SrsState, WordCard } from './state/types'
import { WordCardView } from './components/WordCardView'
import { BrowsePanel } from './components/BrowsePanel'
import { SettingsPanel } from './components/SettingsPanel'
import { CharacterStrip } from './components/CharacterStrip'
import { CharacterSpotlight } from './components/CharacterSpotlight'
import { ProgressStats } from './components/ProgressStats'
import { AboutPage } from './components/AboutPage'
import { AppNavBar } from './components/AppNavBar'
import { initTheme } from './lib/theme'
import './app.css'

export type View = 'review-words' | 'browse' | 'settings' | 'about'

// Still loaded even with the Hanzi tab gone — word cards' per-character
// components reuse this deck's cards for meanings lookups (see
// WordCharacterRef's doc comment), so the data stays needed internally.
const hanziSignals = {
  cards: signal<Card[]>([]),
  srs: signal<SrsState>(loadState()),
  queue: signal<string[]>([]),
  revealed: signal(false),
  ready: signal(false),
}

const wordSignals = {
  cards: signal<WordCard[]>([]),
  srs: signal<SrsState>(loadState(WORD_STORAGE_KEY)),
  queue: signal<string[]>([]),
  revealed: signal(false),
  ready: signal(false),
}

const viewSignal = signal<View>('review-words')

initTheme()

// .left-sidebar/.right-sidebar are position:fixed and need a real top/
// height to line up with .card-scene, which itself moves: .review-view
// centers the char-strip+card group with auto margins, so on a tall
// viewport the card sits lower than a flat guess (see the CSS comment
// on .left-sidebar) — measuring the actual element is the only way to
// track that regardless of viewport size or which content (a real
// word card vs. the session-complete card) is currently filling it.
function useCardAlignmentVars() {
  useEffect(() => {
    function sync() {
      const card = document.querySelector('.card-scene')
      if (!card) return
      const rect = card.getBoundingClientRect()
      document.documentElement.style.setProperty('--card-top', `${rect.top}px`)
      document.documentElement.style.setProperty('--card-height', `${rect.height}px`)
    }

    sync()
    const card = document.querySelector('.card-scene')
    const resizeObserver = new ResizeObserver(sync)
    if (card) resizeObserver.observe(card)
    window.addEventListener('resize', sync)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', sync)
    }
  })
}

export function App() {
  const hanzi = useReviewDeck(hanziSignals, loadAllCards)
  const words = useReviewDeck(wordSignals, loadAllWordCards, WORD_STORAGE_KEY)

  const view = viewSignal.value

  if (!words.ready) {
    return (
      <div class="loading">
        <span class="seal loading-seal">字</span>
      </div>
    )
  }

  const upcomingWords = words.queue
    .slice(0, 6)
    .map((id) => words.cards.find((c) => c.id === id)?.word ?? '')
  const progressPct = words.totalCount > 0 ? (words.introducedCount / words.totalCount) * 100 : 0

  // Word cards' per-character components are pulled from the character
  // deck's own cards (see WordCharacterRef's doc comment) — reusing that
  // same already-loaded deck for meanings avoids duplicating every
  // character's meanings array into every word card that contains it.
  const characterMeanings = useMemo(
    () => new Map(hanzi.cards.map((c) => [c.character, c.meanings] as const)),
    [hanzi.cards],
  )

  // A card only enters srs.cards once it's been graded at least once (see
  // gradeCard in state/srs.ts) — 'review' means it graduated to a stable
  // spaced-repetition interval ("learned"), 'learning'/'relearning' means
  // it's still being actively drilled, and anything never graded at all
  // isn't in the map yet, hence the subtraction rather than a third state.
  const wordProgressCounts = useMemo(() => {
    let learned = 0
    let inProgress = 0
    for (const progress of Object.values(words.srs.cards)) {
      if (progress.state === 'review') learned++
      else inProgress++
    }
    const remaining = Math.max(0, words.totalCount - learned - inProgress)
    return { learned, inProgress, remaining }
  }, [words.srs.cards, words.totalCount])

  useCardAlignmentVars()

  const isReviewView = view === 'review-words'

  return (
    <div class="app">
      {/* Shown on every view, including mobile's own Settings tab — its
          fields now sit inside solid white .settings-card boxes (not bare
          on the page background), so the art behind them no longer bleeds
          across any text the way it did before those existed. */}
      <div class="side-accent" aria-hidden="true" />

      {/* Always mounted (CSS hides both below the width where there's no
          real "side" real estate — see .left-sidebar/.right-sidebar in
          app.css). Split across both sides rather than stacked on one:
          together they overflowed the available height next to the card. */}
      {isReviewView && (
        <aside class="left-sidebar" aria-label="Word learning progress">
          <ProgressStats
            learned={wordProgressCounts.learned}
            inProgress={wordProgressCounts.inProgress}
            remaining={wordProgressCounts.remaining}
            dueToday={words.queue.length}
            srsState={words.srs}
          />
        </aside>
      )}

      {/* Settings has no nav tab of its own at these widths (see
          .nav-settings-only) — this is its only home there, on the right,
          in front of the decorative bamboo art (z-index only, doesn't
          otherwise interact with it). Only shown alongside the flashcard
          view, matching the stats sidebar on the left. */}
      {isReviewView && (
        <aside class="right-sidebar" aria-label="Settings">
          <SettingsPanel
            wordsSettings={words.srs.settings}
            onWordsChange={(settings) => words.persist({ ...words.srs, settings })}
            srsState={words.srs}
            onImported={words.handleImported}
          />
        </aside>
      )}

      <div class="top-progress-bar">
        <div class="top-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div class="app-frame">
        <div class="app-content">
          <main class="app-main">
            {view === 'review-words' && (
              <div class="review-view">
                <CharacterStrip characters={upcomingWords} totalInQueue={words.queue.length} />
                {words.currentCard ? (
                  <WordCardView
                    card={words.currentCard}
                    revealed={words.revealed}
                    onToggleReveal={words.toggleReveal}
                    onGrade={words.handleGrade}
                    introducedCount={words.introducedCount}
                    totalCount={words.totalCount}
                    characterMeanings={characterMeanings}
                  />
                ) : (
                  // Same card-shaped frame as the real flashcard (not a
                  // completely different layout with its own icon/sound
                  // controls) — swapping to a differently-sized element
                  // here made the whole screen visibly jump/resize.
                  <div class="card-view">
                    <div class="card-scene">
                      <div class="card-surface session-complete">
                        <CharacterSpotlight character="词" pinyin="cí" />
                        <h2>All done for now</h2>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {view === 'browse' && <BrowsePanel cards={words.cards} srsState={words.srs} />}

            {view === 'settings' && (
              <SettingsPanel
                wordsSettings={words.srs.settings}
                onWordsChange={(settings) => words.persist({ ...words.srs, settings })}
                srsState={words.srs}
                onImported={words.handleImported}
              />
            )}

            {view === 'about' && <AboutPage />}
          </main>
        </div>

        <AppNavBar activeView={view} onNav={(v) => (viewSignal.value = v)} />
      </div>
    </div>
  )
}
