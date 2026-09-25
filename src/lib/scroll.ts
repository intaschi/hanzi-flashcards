// Native scrollTo({behavior:'smooth'}) turned out unreliable inside a
// scroll-snap container — direct scrollLeft assignment always sticks, but
// the native smooth animation intermittently reverted to its start position
// (with or without scroll-snap-type suspended around it). Tweening
// scrollLeft by hand with requestAnimationFrame sidesteps the native
// implementation entirely and behaves the same everywhere.
export function animateScrollLeft(el: HTMLElement, to: number, duration = 280): void {
  const from = el.scrollLeft
  const delta = to - from
  if (delta === 0) return
  const start = performance.now()

  function ease(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }

  function step(now: number) {
    const t = Math.min(1, (now - start) / duration)
    el.scrollLeft = from + delta * ease(t)
    if (t < 1) requestAnimationFrame(step)
  }

  requestAnimationFrame(step)
}
