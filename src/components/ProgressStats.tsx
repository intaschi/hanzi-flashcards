import { dayKey } from '../state/srs'
import type { SrsState } from '../state/types'

interface Props {
  learned: number
  inProgress: number
  remaining: number
  dueToday: number
  srsState: SrsState
}

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

interface StatCardProps {
  variant: string
  value: number
  label: string
  help: string
}

function StatCard({ variant, value, label, help }: StatCardProps) {
  return (
    <div class={`stat-card stat-${variant}`}>
      <span class="stat-help" tabIndex={0} aria-label={`What does "${label}" mean?`}>
        ?
        <span class="stat-help-tip" role="tooltip">
          {help}
        </span>
      </span>
      <span class="stat-value">{value.toLocaleString()}</span>
      <span class="stat-label">{label}</span>
    </div>
  )
}

// The 2x2 grid of squares plus the 7-day chart below it — positioning/
// visibility is handled by the .left-sidebar wrapper in app.tsx, which
// this fills entirely, rather than being its own fixed-position element.
export function ProgressStats({ learned, inProgress, remaining, dueToday, srsState }: Props) {
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
    <>
      <div class="stat-grid" aria-label="Word learning progress">
        <StatCard
          variant="due-today"
          value={dueToday}
          label="Due today"
          help="Words still waiting for a review right now, according to your daily new-card setting."
        />
        <StatCard
          variant="in-progress"
          value={inProgress}
          label="In progress"
          help="Words you've started but haven't locked into long-term review yet."
        />
        <StatCard
          variant="learned"
          value={learned}
          label="Learned"
          help="Words that have graduated to a stable, spaced-out review schedule."
        />
        <StatCard
          variant="remaining"
          value={remaining}
          label="Remaining"
          help="Words you haven't started studying yet."
        />
      </div>

      <div class="stat-card daily-chart">
        <span class="stat-help" tabIndex={0} aria-label='What does "Last 7 days" mean?'>
          ?
          <span class="stat-help-tip" role="tooltip">
            How many words you reviewed each day, most recent on the right.
          </span>
        </span>
        <span class="stat-label">Last 7 days</span>
        <div class="daily-chart-bars">
          {last7Days.map((d) => (
            <div
              class="daily-chart-col"
              key={d.key}
              title={`${d.reviews} review${d.reviews === 1 ? '' : 's'}`}
            >
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
    </>
  )
}
