import { dayKey } from '../state/srs'
import type { SrsState } from '../state/types'

interface Props {
  learned: number
  inProgress: number
  remaining: number
  srsState: SrsState
}

const DAY_MS = 24 * 60 * 60 * 1000

// A card only enters srs.cards once graded (see gradeCard in state/srs.ts),
// so "today" not yet having a log entry doesn't mean the streak broke — it
// just means today hasn't happened yet. Walking backward from yesterday in
// that case (rather than always starting at today) is what keeps a streak
// alive across the gap between opening the app and reviewing the first
// word of the day.
function computeStreak(srsState: SrsState): number {
  const rolloverHour = srsState.settings.dayRolloverHour
  const reviewedOn = (date: Date) => (srsState.dailyLog[dayKey(date, rolloverHour)]?.reviewsDone ?? 0) > 0

  let cursor = new Date()
  if (!reviewedOn(cursor)) cursor = new Date(cursor.getTime() - DAY_MS)

  let streak = 0
  while (reviewedOn(cursor)) {
    streak++
    cursor = new Date(cursor.getTime() - DAY_MS)
  }
  return streak
}

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

// Sits in the same left-side real estate as .side-accent's decorative bamboo
// art (see app.css) — real numbers instead of pure atmosphere, but only
// where that atmosphere already lived, so it doesn't compete with the card
// for space on narrow viewports.
export function ProgressStats({ learned, inProgress, remaining, srsState }: Props) {
  const streak = computeStreak(srsState)

  return (
    <aside class="progress-stats" aria-label="Word learning progress">
      <StatCard
        variant="streak"
        value={streak}
        label="Streak"
        help="Consecutive days you've reviewed at least one word."
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
    </aside>
  )
}
