import { useEffect, useState } from 'preact/hooks'
import { hasMandarinVoice, playAudio } from '../lib/speech'

interface Props {
  text: string
  label: string
  compact?: boolean
  src?: string
}

export function AudioButton({ text, label, compact, src }: Props) {
  // A pre-generated clip doesn't depend on the browser's speechSynthesis at
  // all, so it skips the async voice-availability check entirely — only
  // text-only cards (no src yet) need to wait on and gate on that check.
  const [available, setAvailable] = useState<boolean | null>(src ? true : null)

  useEffect(() => {
    if (src) return
    hasMandarinVoice().then(setAvailable)
  }, [src])

  if (available === false) {
    return (
      <span class="audio-unavailable" title="No Mandarin voice found on this device/browser">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path d="M11 5 6 9H2v6h4l5 4V5Z" fill="currentColor" stroke="none" />
          <path d="M15 9l6 6M21 9l-6 6" stroke-width="2" stroke-linecap="round" />
        </svg>
      </span>
    )
  }

  return (
    <button
      type="button"
      class={compact ? 'audio-btn audio-btn--compact' : 'audio-btn'}
      onClick={() => playAudio(src, text)}
      disabled={available === null}
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M11 5 6 9H2v6h4l5 4V5Z" fill="currentColor" stroke="none" />
        <path
          d="M15.5 8.5a5 5 0 0 1 0 7"
          stroke-width="2"
          stroke-linecap="round"
          fill="none"
        />
        <path
          d="M18 6a8 8 0 0 1 0 12"
          stroke-width="2"
          stroke-linecap="round"
          fill="none"
          opacity="0.6"
        />
      </svg>
    </button>
  )
}
