import { signal } from '@preact/signals'
import { loadAllCards } from './state/cardData'
import { loadAllWordCards } from './state/wordCardData'
import { loadState, WORD_STORAGE_KEY } from './state/srs'
import { useReviewDeck } from './state/useReviewDeck'
import type { Card, SrsState, WordCard } from './state/types'
import { CardView } from './components/CardView'
import { WordCardView } from './components/WordCardView'
import { BrowsePanel } from './components/BrowsePanel'
import { SettingsPanel } from './components/SettingsPanel'
import { CharacterStrip } from './components/CharacterStrip'
import { CharacterSpotlight } from './components/CharacterSpotlight'
import { AboutPage } from './components/AboutPage'
import { AppNavBar } from './components/AppNavBar'
import { initTheme } from './lib/theme'
import './app.css'

export type View = 'review-hanzi' | 'review-words' | 'browse' | 'settings' | 'about'

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

const viewSignal = signal<View>('review-hanzi')

initTheme()

export function App() {
  const hanzi = useReviewDeck(hanziSignals, loadAllCards)
  const words = useReviewDeck(wordSignals, loadAllWordCards, WORD_STORAGE_KEY)

  const view = viewSignal.value

  if (view === 'review-hanzi' && !hanzi.ready) {
    return (
      <div class="loading">
        <span class="seal loading-seal">字</span>
      </div>
    )
  }

  const upcomingChars = hanzi.queue
    .slice(0, 6)
    .map((id) => hanzi.cards.find((c) => c.id === id)?.character ?? '')
  const hanziProgressPct = hanzi.totalCount > 0 ? (hanzi.introducedCount / hanzi.totalCount) * 100 : 0

  const upcomingWords = words.queue
    .slice(0, 6)
    .map((id) => words.cards.find((c) => c.id === id)?.word ?? '')
  const wordsProgressPct = words.totalCount > 0 ? (words.introducedCount / words.totalCount) * 100 : 0

  const progressPct = view === 'review-words' ? wordsProgressPct : hanziProgressPct

  const isReviewView = view === 'review-hanzi' || view === 'review-words'

  return (
    <div class="app">
      {/* Only shown on the review views — the card's opaque background
          covers it there, but text-heavy views (Browse, About) have no
          such backing and the bold ink would sit directly under body
          text, hurting legibility rather than just providing atmosphere. */}
      {isReviewView && <div class="side-accent" aria-hidden="true" />}

      <div class="top-progress-bar">
        <div class="top-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div class="app-frame">
        <div class="app-content">
          <main class="app-main">
            {view === 'review-hanzi' && (
              <div class="review-view">
                <CharacterStrip characters={upcomingChars} />
                {hanzi.currentCard ? (
                  <CardView
                    card={hanzi.currentCard}
                    revealed={hanzi.revealed}
                    onToggleReveal={hanzi.toggleReveal}
                    onGrade={hanzi.handleGrade}
                    introducedCount={hanzi.introducedCount}
                    totalCount={hanzi.totalCount}
                  />
                ) : (
                  <div class="session-complete">
                    <CharacterSpotlight character="好" pinyin="hǎo" />
                    <h2>All done for now</h2>
                    <p>
                      No cards due right now. Come back later, or check Settings to adjust your
                      daily new-card limit.
                    </p>
                  </div>
                )}
              </div>
            )}

            {view === 'review-words' && (
              <div class="review-view">
                <CharacterStrip characters={upcomingWords} />
                {!words.ready ? (
                  <div class="session-complete">
                    <p>Loading words&hellip;</p>
                  </div>
                ) : words.currentCard ? (
                  <WordCardView
                    card={words.currentCard}
                    revealed={words.revealed}
                    onToggleReveal={words.toggleReveal}
                    onGrade={words.handleGrade}
                    introducedCount={words.introducedCount}
                    totalCount={words.totalCount}
                  />
                ) : (
                  <div class="session-complete">
                    <CharacterSpotlight character="词" pinyin="cí" />
                    <h2>All done for now</h2>
                    <p>
                      No words due right now. Come back later, or check Settings to adjust your
                      daily new-card limit.
                    </p>
                  </div>
                )}
              </div>
            )}

            {view === 'browse' && (
              <BrowsePanel cards={hanzi.cards} srsState={hanzi.srs} />
            )}

            {view === 'settings' && (
              <SettingsPanel
                settings={hanzi.srs.settings}
                onChange={(settings) => hanzi.persist({ ...hanzi.srs, settings })}
                srsState={hanzi.srs}
                onImported={hanzi.handleImported}
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
