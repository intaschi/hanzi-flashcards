import { useEffect, useRef } from 'preact/hooks'
import HanziWriter from 'hanzi-writer'

interface Props {
  character: string
}

function inkColor(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--text-h').trim()
  return v || '#17140f'
}

// hanzi-writer is an imperative library: it mounts a writer instance against a DOM
// node and has no framework binding of its own. We own the mount/dispose lifecycle
// here so a rapid card-to-card transition never leaks a stale writer instance.
// Rendered bold/dark (not the library's default muted gray) so it reads as a
// confident character, not a faint sketch — the animation is a secondary action,
// triggered by clicking the character itself, not a competing bordered button.
export function CharacterStage({ character }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const writerRef = useRef<ReturnType<typeof HanziWriter.create> | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const el: HTMLDivElement = container

    function mount() {
      el.innerHTML = ''
      writerRef.current = HanziWriter.create(el, character, {
        width: 180,
        height: 180,
        padding: 4,
        showCharacter: false,
        strokeColor: inkColor(),
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 180,
      })
      writerRef.current.animateCharacter()
    }

    mount()

    // The stroke color is baked in as a literal SVG fill at creation time, so a
    // theme toggle (light/dark) mid-session needs an explicit re-mount to pick up
    // the new ink color — it won't follow a CSS variable on its own.
    const observer = new MutationObserver(mount)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => {
      observer.disconnect()
      writerRef.current = null
      container.innerHTML = ''
    }
  }, [character])

  return (
    <div class="character-stage">
      <div
        ref={containerRef}
        class="character-canvas"
        role="button"
        tabIndex={0}
        title="Click to see stroke order"
        onClick={() => writerRef.current?.animateCharacter()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') writerRef.current?.animateCharacter()
        }}
      />
      <button
        type="button"
        class="stroke-replay-link"
        onClick={() => writerRef.current?.animateCharacter()}
      >
        ↻ stroke order
      </button>
    </div>
  )
}
