import { useEffect, useRef } from 'preact/hooks'
import HanziWriter from 'hanzi-writer'

interface Props {
  character: string
}

function inkColor(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--text-h').trim()
  return v || '#17140f'
}

// hanzi-writer scales every character into the same fixed 1024x1024 glyph
// grid, but individual characters' strokes rarely fill that grid evenly —
// most sit off-center within their own box (e.g. toward the top-left),
// which is only visible once real ink is on screen, not from the grid math.
// Measuring the rendered stroke paths' actual on-screen bounds and nudging
// the whole svg to re-center THAT within the canvas works for every
// character, unlike a single fixed offset tuned for one glyph.
function recenterGlyph(container: HTMLDivElement) {
  const svg = container.querySelector('svg')
  if (!svg) return
  const paths = Array.from(svg.querySelectorAll('path')).filter((p) => !p.closest('defs'))
  const rects = paths
    .map((p) => p.getBoundingClientRect())
    .filter((r) => r.width > 0 || r.height > 0)
  if (!rects.length) return
  const inkLeft = Math.min(...rects.map((r) => r.left))
  const inkRight = Math.max(...rects.map((r) => r.right))
  const inkTop = Math.min(...rects.map((r) => r.top))
  const inkBottom = Math.max(...rects.map((r) => r.bottom))
  const canvasRect = container.getBoundingClientRect()
  const dx = (canvasRect.left + canvasRect.right) / 2 - (inkLeft + inkRight) / 2
  const dy = (canvasRect.top + canvasRect.bottom) / 2 - (inkTop + inkBottom) / 2
  svg.style.transform = `translate(${dx}px, ${dy}px)`
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
        // Stroke data loads async (fetched per-character from a CDN), so the
        // svg has no <path>s to measure yet at the moment create() returns —
        // recentering has to wait for this callback instead. The callback
        // itself still fires a tick before hanzi-writer turns that data into
        // actual <path> elements, so wait one more frame past it too.
        onLoadCharDataSuccess: () => requestAnimationFrame(() => recenterGlyph(el)),
      })
      writerRef.current.animateCharacter()
    }

    mount()

    // The stroke color is baked in as a literal SVG fill at creation time, so a
    // theme toggle (light/dark) mid-session needs an explicit re-mount to pick up
    // the new ink color — it won't follow a CSS variable on its own.
    const observer = new MutationObserver(mount)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    // The recentering offset is measured in pixels against the canvas's
    // current size, so a resize (rotation, breakpoint change) that doesn't
    // remount the writer would otherwise leave the old, now-mismatched
    // offset in place.
    const resizeObserver = new ResizeObserver(() => recenterGlyph(el))
    resizeObserver.observe(el)

    return () => {
      resizeObserver.disconnect()
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
