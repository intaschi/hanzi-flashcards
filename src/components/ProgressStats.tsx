interface Props {
  learned: number
  inProgress: number
  remaining: number
}

// Sits in the same left-side real estate as .side-accent's decorative bamboo
// art (see app.css) — real numbers instead of pure atmosphere, but only
// where that atmosphere already lived, so it doesn't compete with the card
// for space on narrow viewports.
export function ProgressStats({ learned, inProgress, remaining }: Props) {
  return (
    <aside class="progress-stats" aria-label="Word learning progress">
      <div class="stat-card stat-learned">
        <span class="stat-value">{learned.toLocaleString()}</span>
        <span class="stat-label">Learned</span>
      </div>
      <div class="stat-card stat-in-progress">
        <span class="stat-value">{inProgress.toLocaleString()}</span>
        <span class="stat-label">In progress</span>
      </div>
      <div class="stat-card stat-remaining">
        <span class="stat-value">{remaining.toLocaleString()}</span>
        <span class="stat-label">Remaining</span>
      </div>
    </aside>
  )
}
