import aboutHeroTest from '../assets/about-hero-test.png'

// CC-CEDICT/hanziDB/etc.'s licenses require attribution — the hover-
// revealed icon below is that attribution's home now that the rest of
// this page is just the banner image. This page is a permanent nav
// destination rather than a standalone landing page specifically so it
// can't be lost the way an earlier attribution mention was when its
// original host page was deleted.
export function AboutPage() {
  return (
    <div class="about-page">
      <img src={aboutHeroTest} alt="Hanzi Flashcards — Chinese, one word at a time" class="about-hero-test-image" />

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
