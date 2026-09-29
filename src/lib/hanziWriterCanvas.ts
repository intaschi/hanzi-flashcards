// hanzi-writer scales every character into the same fixed 1024x1024 glyph
// grid, but individual characters' strokes rarely fill that grid evenly —
// most sit off-center within their own box (e.g. toward the top-left),
// which is only visible once real ink is on screen, not from the grid math.
// Measuring the rendered stroke paths' actual on-screen bounds and nudging
// the whole svg to re-center THAT within the canvas works for every
// character, unlike a single fixed offset tuned for one glyph.
export function recenterGlyph(container: HTMLDivElement): boolean {
  const svg = container.querySelector('svg')
  if (!svg) return false
  const paths = Array.from(svg.querySelectorAll('path')).filter((p) => !p.closest('defs'))
  const rects = paths
    .map((p) => p.getBoundingClientRect())
    .filter((r) => r.width > 0 || r.height > 0)
  if (!rects.length) return false
  const inkLeft = Math.min(...rects.map((r) => r.left))
  const inkRight = Math.max(...rects.map((r) => r.right))
  const inkTop = Math.min(...rects.map((r) => r.top))
  const inkBottom = Math.max(...rects.map((r) => r.bottom))
  const canvasRect = container.getBoundingClientRect()
  const dx = (canvasRect.left + canvasRect.right) / 2 - (inkLeft + inkRight) / 2
  const dy = (canvasRect.top + canvasRect.bottom) / 2 - (inkTop + inkBottom) / 2
  svg.style.transform = `translate(${dx}px, ${dy}px)`
  return true
}

// hanzi-writer caches loaded character data, so a re-mount for a character
// it's already fetched this session resolves onLoadCharDataSuccess far
// faster than a fresh network fetch would — faster than even one
// requestAnimationFrame, in practice, which raced ahead of the <path>
// elements actually landing in the DOM and left recenterGlyph measuring
// nothing. Watching for the real DOM mutation instead of guessing a frame
// count makes this correct regardless of whether the data was cached or
// freshly fetched.
export function watchForGlyphAndCenter(container: HTMLDivElement): () => void {
  if (recenterGlyph(container)) return () => {}
  const observer = new MutationObserver(() => {
    if (recenterGlyph(container)) observer.disconnect()
  })
  observer.observe(container, { childList: true, subtree: true })
  return () => observer.disconnect()
}
