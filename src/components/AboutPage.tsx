// CC-CEDICT's CC BY-SA 4.0 license requires attribution — the credits strip
// at the bottom is that attribution's home. This page is a permanent nav
// destination rather than a standalone landing page specifically so it
// can't be lost the way an earlier attribution mention was when its
// original host page was deleted.
//
// Words-only now (the Hanzi deck has no nav tab of its own any more — see
// app.tsx), so this no longer advertises a second deck the app doesn't
// actually offer. Feature badges dropped their per-item accent/jade/
// porcelain/gold tints for a single neutral treatment — four different
// colors for four unrelated bullet points read as noise, not signal.
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
      </div>

      <p class="about-note">
        I built this for myself, to learn Hanzi and the most useful Mandarin words in an
        efficient order — and I'm sharing it in case it helps you too. It's free for anyone to
        use. The deck covers the 5,000 most frequent words, presented in order of frequency, so
        you always learn the word you're most likely to actually need next.
      </p>

      {/* A bento grid — one large tile carrying the headline stat, four
          smaller tiles for the supporting features — rather than a stat
          line + a flat uniform row. Varying tile weight gives the stat
          the visual priority it actually has, instead of every fact on
          the page reading as equally important. */}
      <div class="about-bento">
        <div class="about-tile about-tile-stat">
          <span class="about-tile-glyph chinese" aria-hidden="true">
            频
          </span>
          <p class="about-headline-stat">
            <strong>5,000</strong> words, ranked by real-world frequency
          </p>
        </div>

        <div class="about-tile about-tile-feature">
          <span class="about-feature-badge chinese" aria-hidden="true">
            筆
          </span>
          <span class="about-feature-label">Stroke order</span>
        </div>
        <div class="about-tile about-tile-feature">
          <span class="about-feature-badge chinese" aria-hidden="true">
            音
          </span>
          <span class="about-feature-label">Audio</span>
        </div>
        <div class="about-tile about-tile-feature">
          <span class="about-feature-badge chinese" aria-hidden="true">
            憶
          </span>
          <span class="about-feature-label">Spaced repetition</span>
        </div>
      </div>

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
      </div>
    </div>
  )
}
