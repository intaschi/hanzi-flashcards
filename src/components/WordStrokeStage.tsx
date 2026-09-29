import { useEffect, useRef } from 'preact/hooks'
import HanziWriter from 'hanzi-writer'
import { recenterGlyph, watchForGlyphAndCenter } from '../lib/hanziWriterCanvas'

interface Props {
  characters: string[]
  // Gates the intro sequence rather than always auto-playing on mount —
  // this stage lives on the back face now, mounted (though hidden) the
  // whole time the card shows its front, so it needs to wait for the
  // flip instead of animating before anyone's looking.
  play: boolean
}

const CANVAS_SIZE = 48

type Writer = ReturnType<typeof HanziWriter.create>

// hanzi-writer only ever draws one character per instance, so a multi-
// character word gets one small canvas per character, laid out in a tight
// row (no gap — see .word-stroke-stage — so they read as one word, not a
// spaced-out list). Each canvas only builds its writer here; the parent
// (WordStrokeStage) owns playing them back in order.
function CharCanvas({ character, onReady }: { character: string; onReady: (writer: Writer) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const writerRef = useRef<Writer | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const el: HTMLDivElement = container

    el.innerHTML = ''
    const writer = HanziWriter.create(el, character, {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      padding: 2,
      showCharacter: false,
      strokeColor: getComputedStyle(document.documentElement).getPropertyValue('--text-h').trim() || '#17140f',
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 150,
    })
    writerRef.current = writer
    const stopWatchingGlyph = watchForGlyphAndCenter(el)
    onReady(writer)

    const resizeObserver = new ResizeObserver(() => recenterGlyph(el))
    resizeObserver.observe(el)

    return () => {
      stopWatchingGlyph()
      resizeObserver.disconnect()
      writerRef.current = null
      container.innerHTML = ''
    }
  }, [character])

  return (
    <div
      ref={containerRef}
      class="word-stroke-canvas"
      role="button"
      tabIndex={0}
      title="Click to replay stroke order"
      onClick={() => writerRef.current?.animateCharacter()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') writerRef.current?.animateCharacter()
      }}
    />
  )
}

export function WordStrokeStage({ characters, play }: Props) {
  const writersRef = useRef<Writer[]>([])

  useEffect(() => {
    if (!play) return
    // Children's own effects (which populate writersRef via onReady) run
    // before this one on both mount and update, so by the time this runs
    // every writer for the CURRENT characters is already in place —
    // except right after the word gets shorter, when a stale trailing
    // entry from the previous, longer word could still be sitting past
    // the new end; every() only reads the indices this word actually
    // has, so that leftover never blocks it.
    const allReady = characters.every((_, i) => writersRef.current[i])
    if (!allReady) return
    let cancelled = false

    function playFrom(index: number) {
      if (cancelled || index >= characters.length) return
      writersRef.current[index]?.animateCharacter({
        onComplete: () => playFrom(index + 1),
      })
    }
    playFrom(0)

    return () => {
      cancelled = true
    }
  }, [characters.join(''), play])

  return (
    <div class="word-stroke-stage">
      {characters.map((c, i) => (
        <CharCanvas
          character={c}
          key={`${c}-${i}`}
          onReady={(writer) => {
            writersRef.current[i] = writer
          }}
        />
      ))}
    </div>
  )
}
