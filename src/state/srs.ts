import type { CardProgress, DailyLogEntry, Grade, Settings, SrsState } from './types'

const STORAGE_KEY = 'hanzi-srs.state'
export const WORD_STORAGE_KEY = 'hanzi-srs.words.state'
const CURRENT_SCHEMA_VERSION = 1

// Every function below already takes state/card-ids as plain arguments, so
// the same scheduling logic works for either deck — only load/save need to
// know WHICH deck's storage key to use, hence the parameter (defaulting to
// the character deck's key so existing call sites don't need to change).
function corruptBackupKey(storageKey: string): string {
  return `${storageKey}.corrupt-backup`
}

const DEFAULT_SETTINGS: Settings = {
  newCardsPerDay: 10,
  dayRolloverHour: 4,
  maxIntervalDays: 365,
}

function nowIso(): string {
  return new Date().toISOString()
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

// A day "ends" at dayRolloverHour local time, not literal midnight, so a review
// just before/after midnight isn't split across two different SRS "days."
export function dayKey(date: Date, rolloverHour: number): string {
  const shifted = new Date(date.getTime() - rolloverHour * 60 * 60 * 1000)
  return shifted.toISOString().slice(0, 10)
}

function emptyState(): SrsState {
  const now = nowIso()
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    settings: { ...DEFAULT_SETTINGS },
    cards: {},
    dailyLog: {},
  }
}

// Ordered pure migrations, keyed by the version they migrate FROM. Add v1: (s) => {...}
// when schemaVersion 2 is introduced — never rename STORAGE_KEY itself.
const migrations: Record<number, (state: any) => any> = {}

function migrate(state: any): SrsState {
  let s = state
  while (typeof s.schemaVersion === 'number' && s.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const step = migrations[s.schemaVersion]
    if (!step) break
    s = step(s)
  }
  return s as SrsState
}

export function loadState(storageKey: string = STORAGE_KEY): SrsState {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return emptyState()
  try {
    const parsed = JSON.parse(raw)
    return migrate(parsed)
  } catch {
    // Don't brick the app on a corrupted blob — preserve it for manual recovery
    // and start fresh instead of crashing.
    localStorage.setItem(corruptBackupKey(storageKey), raw)
    return emptyState()
  }
}

export function saveState(state: SrsState, storageKey: string = STORAGE_KEY): void {
  const toSave: SrsState = { ...state, updatedAt: nowIso() }
  localStorage.setItem(storageKey, JSON.stringify(toSave))
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    try {
      return await navigator.storage.persist()
    } catch {
      return false
    }
  }
  return false
}

function fuzzed(days: number): number {
  const factor = 1 + (Math.random() * 0.2 - 0.1) // +/-10%
  return Math.max(1, Math.round(days * factor))
}

function freshProgress(): CardProgress {
  return {
    state: 'new',
    easeFactor: 2.5,
    intervalDays: 0,
    dueAt: nowIso(),
    lastReviewedAt: null,
    reps: 0,
    lapses: 0,
  }
}

// Simplified SM-2. New cards graduate straight to `review` on Good/Easy; Again/Hard
// keep them in `learning` for later in the same in-memory session (the caller is
// responsible for re-queuing — this function only updates persisted state).
export function gradeCard(state: SrsState, cardId: string, grade: Grade): SrsState {
  const settings = state.settings
  const existing = state.cards[cardId]
  const wasNew = !existing || existing.state === 'new'
  const progress: CardProgress = existing ? { ...existing } : freshProgress()

  if (wasNew) {
    switch (grade) {
      case 'again':
      case 'hard':
        progress.state = 'learning'
        progress.intervalDays = 0
        break
      case 'good':
        progress.state = 'review'
        progress.intervalDays = 1
        progress.dueAt = addDays(new Date(), 1).toISOString()
        break
      case 'easy':
        progress.state = 'review'
        progress.intervalDays = 4
        progress.dueAt = addDays(new Date(), 4).toISOString()
        break
    }
  } else {
    switch (grade) {
      case 'again':
        progress.lapses += 1
        progress.easeFactor = Math.max(1.3, progress.easeFactor - 0.2)
        progress.intervalDays = 1
        progress.state = 'relearning'
        progress.dueAt = addDays(new Date(), 1).toISOString()
        break
      case 'hard':
        progress.easeFactor = Math.max(1.3, progress.easeFactor - 0.15)
        progress.intervalDays = fuzzed(Math.round(Math.max(1, progress.intervalDays) * 1.2))
        progress.state = 'review'
        progress.dueAt = addDays(new Date(), progress.intervalDays).toISOString()
        break
      case 'good':
        progress.intervalDays = fuzzed(
          Math.round(Math.max(1, progress.intervalDays) * progress.easeFactor),
        )
        progress.state = 'review'
        progress.dueAt = addDays(new Date(), progress.intervalDays).toISOString()
        break
      case 'easy':
        progress.easeFactor += 0.15
        progress.intervalDays = fuzzed(
          Math.round(Math.max(1, progress.intervalDays) * progress.easeFactor * 1.3),
        )
        progress.state = 'review'
        progress.dueAt = addDays(new Date(), progress.intervalDays).toISOString()
        break
    }
    progress.intervalDays = Math.min(progress.intervalDays, settings.maxIntervalDays)
  }

  progress.reps += 1
  progress.lastReviewedAt = nowIso()

  const today = dayKey(new Date(), settings.dayRolloverHour)
  const existingLog: DailyLogEntry = state.dailyLog[today] ?? { newIntroduced: 0, reviewsDone: 0 }
  const updatedLog: DailyLogEntry = {
    newIntroduced: existingLog.newIntroduced + (wasNew ? 1 : 0),
    reviewsDone: existingLog.reviewsDone + 1,
  }

  return {
    ...state,
    cards: { ...state.cards, [cardId]: progress },
    dailyLog: { ...state.dailyLog, [today]: updatedLog },
  }
}

export function getDueCardIds(state: SrsState, allCardIdsInFrequencyOrder: string[]): string[] {
  const now = Date.now()
  return allCardIdsInFrequencyOrder.filter((id) => {
    const p = state.cards[id]
    if (!p || p.state === 'new') return false
    return new Date(p.dueAt).getTime() <= now
  })
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// The "next new card" is simply the first character in the frequency-ordered master
// list with no progress entry yet — no separate cursor to drift out of sync.
export function getUnintroducedCardIds(
  state: SrsState,
  allCardIdsInFrequencyOrder: string[],
): string[] {
  return allCardIdsInFrequencyOrder.filter((id) => !state.cards[id])
}

export function remainingNewSlotsToday(state: SrsState): number {
  const today = dayKey(new Date(), state.settings.dayRolloverHour)
  const introducedToday = state.dailyLog[today]?.newIntroduced ?? 0
  return Math.max(0, state.settings.newCardsPerDay - introducedToday)
}

// Builds today's session queue: all due reviews (shuffled) plus today's new-card
// allotment, interleaved roughly evenly rather than front- or back-loaded.
export function buildSessionQueue(state: SrsState, allCardIdsInFrequencyOrder: string[]): string[] {
  const due = shuffle(getDueCardIds(state, allCardIdsInFrequencyOrder))
  const newIds = getUnintroducedCardIds(state, allCardIdsInFrequencyOrder).slice(
    0,
    remainingNewSlotsToday(state),
  )

  if (newIds.length === 0) return due
  if (due.length === 0) return newIds

  const ratio = Math.max(1, Math.floor(due.length / newIds.length))
  const result: string[] = []
  let newIdx = 0
  for (let i = 0; i < due.length; i++) {
    result.push(due[i])
    if ((i + 1) % ratio === 0 && newIdx < newIds.length) {
      result.push(newIds[newIdx++])
    }
  }
  while (newIdx < newIds.length) result.push(newIds[newIdx++])
  return result
}

export interface ImportSummary {
  updated: number
  skipped: number
}

export function exportStateJson(state: SrsState): string {
  return JSON.stringify(state, null, 2)
}

// Imported per-card progress only overwrites local progress when it's strictly
// newer (by lastReviewedAt) — importing a stale backup can never regress progress.
export function mergeImportedState(
  current: SrsState,
  imported: SrsState,
): { merged: SrsState; summary: ImportSummary } {
  let updated = 0
  let skipped = 0
  const mergedCards = { ...current.cards }

  for (const [id, incoming] of Object.entries(imported.cards)) {
    const existing = mergedCards[id]
    const incomingTime = incoming.lastReviewedAt ? new Date(incoming.lastReviewedAt).getTime() : 0
    const existingTime = existing?.lastReviewedAt ? new Date(existing.lastReviewedAt).getTime() : -1
    if (!existing || incomingTime > existingTime) {
      mergedCards[id] = incoming
      updated++
    } else {
      skipped++
    }
  }

  const merged: SrsState = {
    ...current,
    cards: mergedCards,
    dailyLog: { ...imported.dailyLog, ...current.dailyLog },
  }
  return { merged, summary: { updated, skipped } }
}
