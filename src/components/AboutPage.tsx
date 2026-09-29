// CC-CEDICT/hanziDB/etc.'s licenses require attribution — the hover-
// revealed icon below is that attribution's home. This page is a
// permanent nav destination rather than a standalone landing page
// specifically so it can't be lost the way an earlier attribution
// mention was when its original host page was deleted.
//
// No background image of its own — .side-accent (see index.css) is the
// one shared background for every tab, and this page's z-index:2 sits
// above it so it shows through here too.
export function AboutPage() {
  return (
    <div class="about-page">
      <div class="about-content">
        <span class="about-glyph chinese" aria-hidden="true">
          学
        </span>
        <h1 class="about-title">Chinese, one word at a time.</h1>
        <p class="about-tagline">
          5,000 useful words. A little practice each day.
          <br />
          Free, made for the joy of learning.
        </p>

        <div class="about-cards">
          <div class="about-card">
            <span class="about-card-icon chinese" aria-hidden="true">
              頻
            </span>
            <h3>Ordered by frequency</h3>
            <p>Learn common words first.</p>
          </div>
          <div class="about-card">
            <span class="about-card-icon chinese" aria-hidden="true">
              音
            </span>
            <h3>Audio</h3>
            <p>Hear each word.</p>
          </div>
          <div class="about-card">
            <span class="about-card-icon chinese" aria-hidden="true">
              憶
            </span>
            <h3>Spaced repetition</h3>
            <p>Review over time.</p>
          </div>
        </div>
      </div>

      <span class="about-credits-tip" tabIndex={0} aria-label="Data & sources">
        ⓘ
        <span class="about-credits-tip-bubble" role="tooltip">
          <span class="about-credits-tip-kicker">Data &amp; sources</span>
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
        </span>
      </span>
    </div>
  )
}
