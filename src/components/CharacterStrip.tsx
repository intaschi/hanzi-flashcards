interface Props {
  characters: string[]
  totalInQueue: number
}

// The dot row mirrors today's actual due queue (capped, so it doesn't
// become a wall of tiny dots on a big catch-up day), not just the handful
// of words previewed above it — those are two different counts once the
// queue is longer than the preview.
const MAX_DOTS = 12

export function CharacterStrip({ characters, totalInQueue }: Props) {
  if (characters.length === 0) return null

  const hasMore = totalInQueue > characters.length
  const dotCount = Math.min(totalInQueue, MAX_DOTS)
  const overflow = totalInQueue - MAX_DOTS

  return (
    <div class="char-strip-wrap">
      <div class="char-strip chinese">
        {characters.map((c, i) => (
          <span class={i === 0 ? 'on' : ''} key={i}>
            {c}
          </span>
        ))}
        {hasMore && <span class="char-strip-more">···</span>}
      </div>
      <div class="strip-dots">
        {Array.from({ length: dotCount }, (_, i) => (
          <span class={i === 0 ? 'on' : ''} key={i} />
        ))}
        {overflow > 0 && <span class="strip-dots-overflow">+{overflow}</span>}
      </div>
    </div>
  )
}
