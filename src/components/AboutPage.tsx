// CC-CEDICT's CC BY-SA 4.0 license requires attribution — the credits strip
// at the bottom is that attribution's home. This page is a permanent nav
// destination rather than a standalone landing page specifically so it
// can't be lost the way an earlier attribution mention was when its
// original host page was deleted.
export function AboutPage() {
  return (
    <div class="about-page">
      <div class="about-hero">
        <div class="about-hero-glyph-wrap">
          <span class="about-hero-glyph chinese" aria-hidden="true">
            学
          </span>
        </div>
        <h1 class="about-hero-title">
          <span class="about-hero-title-accent">Hanzi</span> Flashcards
        </h1>
        <p class="about-hero-tagline">Mandarin, in the order you'll actually need it.</p>
      </div>

      {/* Decks and features share one panel so they read as a single
          composition rather than three stacked blocks. */}
      <div class="about-panel">
        <div class="about-decks">
          <div class="about-deck-card about-deck-accent">
            <span class="about-deck-glyph chinese" aria-hidden="true">
              字
            </span>
            <h3>Hanzi</h3>
            <p class="about-deck-stat">
              <strong>5,000</strong> characters &middot; by frequency
            </p>
          </div>
          <div class="about-deck-card about-deck-jade">
            <span class="about-deck-glyph chinese" aria-hidden="true">
              词
            </span>
            <h3>Words</h3>
            <p class="about-deck-stat">
              <strong>5,000</strong> words &middot; by frequency
            </p>
          </div>
        </div>

        <div class="about-panel-divider" />

        <div class="about-features">
          <div class="about-feature about-feature-accent">
            <span class="about-feature-badge chinese" aria-hidden="true">
              頻
            </span>
            <span class="about-feature-label">Real frequency data</span>
          </div>
          <div class="about-feature about-feature-jade">
            <span class="about-feature-badge chinese" aria-hidden="true">
              筆
            </span>
            <span class="about-feature-label">Stroke order</span>
          </div>
          <div class="about-feature about-feature-porcelain">
            <span class="about-feature-badge chinese" aria-hidden="true">
              音
            </span>
            <span class="about-feature-label">Audio</span>
          </div>
          <div class="about-feature about-feature-gold">
            <span class="about-feature-badge chinese" aria-hidden="true">
              憶
            </span>
            <span class="about-feature-label">Spaced repetition</span>
          </div>
        </div>
      </div>

      <p class="about-privacy">Your progress stays on this device — nothing is sent anywhere.</p>

      <div class="about-footer">
        <div class="about-credits-head">
          <span class="seal about-credits-seal" aria-hidden="true">
            印
          </span>
          <span class="about-credits-kicker">Data &amp; sources</span>
        </div>
        <div class="about-credits">
          <a href="https://github.com/ruddfawcett/hanziDB.csv" target="_blank" rel="noreferrer">
            hanziDB
          </a>
          <a
            href="https://doi.org/10.1371/journal.pone.0010729"
            target="_blank"
            rel="noreferrer"
          >
            SUBTLEX-CH
          </a>
          <a href="https://cc-cedict.org/" target="_blank" rel="noreferrer">
            CC-CEDICT
          </a>
          <a href="https://github.com/skishore/makemeahanzi" target="_blank" rel="noreferrer">
            Make Me a Hanzi
          </a>
          <a href="https://github.com/chanind/hanzi-writer" target="_blank" rel="noreferrer">
            hanzi-writer
          </a>
        </div>
        <p class="about-fine-print">
          Example sentences and facts are AI-generated and marked as such in each card's data.
        </p>
      </div>
    </div>
  )
}
