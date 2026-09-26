import { useEffect, useMemo } from 'preact/hooks'
import type { Signal } from '@preact/signals'
import {
  buildSessionQueue,
  gradeCard,
  requestPersistentStorage,
  saveState,
} from './srs'
import type { Grade, SrsState } from './types'

interface Identifiable {
  id: string
}

export interface DeckSignals<T> {
  cards: Signal<T[]>
  srs: Signal<SrsState>
  queue: Signal<string[]>
  revealed: Signal<boolean>
  ready: Signal<boolean>
}

// The character deck and the word deck need the exact same queue-building,
// grading, and persistence logic — only WHICH cards and WHICH localStorage
// key differ. Rather than duplicate app.tsx's review-session logic per deck,
// this hook is called once per deck (each with its own module-level signal
// set and storage key) and returns everything a review view needs.
export function useReviewDeck<T extends Identifiable & { frequencyRank: number }>(
  signals: DeckSignals<T>,
  loadCards: () => Promise<T[]>,
  storageKey?: string,
) {
  useEffect(() => {
    requestPersistentStorage()
    loadCards().then((loaded) => {
      signals.cards.value = loaded
      const ids = loaded.map((c) => c.id)
      signals.queue.value = buildSessionQueue(signals.srs.value, ids)
      signals.ready.value = true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cardMap = useMemo(
    () => new Map(signals.cards.value.map((c) => [c.id, c] as const)),
    [signals.cards.value],
  )

  function persist(next: SrsState) {
    signals.srs.value = next
    saveState(next, storageKey)
  }

  // .card-flip's rotate-back transition (550ms, see app.css) takes the old
  // card from showing its back face to its front — but both faces are
  // always in the DOM, so if the queue advances to the next card in the
  // same tick as un-revealing, the still-rotating back face very briefly
  // shows the NEXT card's answer instead of the one just graded. Holding
  // the queue advance until the animation finishes means the old card is
  // always what's rotating away, never the new one. Grading is also
  // allowed straight from the front face (no flip required) — there's no
  // flip-back animation to protect in that case, so advance immediately
  // rather than adding a pointless wait.
  function handleGrade(grade: Grade) {
    const currentId = signals.queue.value[0]
    if (!currentId) return
    const wasRevealed = signals.revealed.value
    persist(gradeCard(signals.srs.value, currentId, grade))
    signals.revealed.value = false
    if (wasRevealed) {
      setTimeout(() => {
        signals.queue.value = signals.queue.value.slice(1)
      }, 550)
    } else {
      signals.queue.value = signals.queue.value.slice(1)
    }
  }

  function handleImported(next: SrsState) {
    persist(next)
    const ids = signals.cards.value.map((c) => c.id)
    signals.queue.value = buildSessionQueue(next, ids)
  }

  const currentId = signals.queue.value[0]
  const currentCard = currentId ? cardMap.get(currentId) : undefined
  const introducedCount = Object.keys(signals.srs.value.cards).length
  const totalCount = signals.cards.value.length

  return {
    ready: signals.ready.value,
    cards: signals.cards.value,
    srs: signals.srs.value,
    queue: signals.queue.value,
    currentCard,
    introducedCount,
    totalCount,
    revealed: signals.revealed.value,
    toggleReveal: () => (signals.revealed.value = !signals.revealed.value),
    handleGrade,
    handleImported,
    persist,
  }
}
