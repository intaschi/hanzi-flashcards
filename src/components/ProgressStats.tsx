import { dayKey } from '../state/srs'
import type { SrsState } from '../state/types'

interface Props {
  learned: number
  inProgress: number
  remaining: number
  srsState: SrsState
}

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_MS = 24 * 60 * 60 * 1000

// Sits in the same left-side real estate as .side-accent's decorative bamboo
// art (see app.css) — real numbers instead of pure atmosphere, but only
// where that atmosphere already lived, so it doesn't compete with the card
// for space on narrow viewports.
export function ProgressStats({ learned, inProgress, remaining, srsState }: Props) {
  const rolloverHour = srsState.settings.dayRolloverHour
  const today = new Date()
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today.getTime() - (6 - i) * DAY_MS)
    const key = dayKey(date, rolloverHour)
    const reviews = srsState.dailyLog[key]?.reviewsDone ?? 0
    return { key, weekday: WEEKDAY_LETTERS[date.getDay()], reviews }
  })
  const maxReviews = Math.max(1, ...last7Days.map((d) => d.reviews))

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

      <div class="stat-card daily-chart">
        <span class="stat-label">Last 7 days</span>
        <div class="daily-chart-bars">
          {last7Days.map((d) => (
            <div class="daily-chart-col" key={d.key} title={`${d.reviews} review${d.reviews === 1 ? '' : 's'}`}>
              <div class="daily-chart-track">
                <div
                  class="daily-chart-bar"
                  style={{ height: `${Math.max(2, (d.reviews / maxReviews) * 100)}%` }}
                />
              </div>
              <span class="daily-chart-day">{d.weekday}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
