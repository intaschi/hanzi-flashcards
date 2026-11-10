export interface CardComponent {
  char?: string
  role: string
  // True when this part is the character's dictionary radical and carries a
  // meaningful family (氵 water, 讠 speech...), so the UI can flag it.
  radical?: boolean
  note: string
  source: string
}

export interface CardExample {
  hanzi: string
  pinyin: string
  english: string
  fact: string
  source: string
  reviewStatus: string
}

export interface Card {
  id: string
  character: string
  frequencyRank: number
  pinyin: string
  meanings: string[]
  strokeCount?: number
  hskLevel?: number
  radical: string
  decomposition?: string
  etymologyType?: string
  etymologyHint?: string
  components: CardComponent[]
  example: CardExample
  batchId: string
}

// A word card's per-character breakdown reuses CardComponent directly —
// most of these components are pulled straight from the character deck's
// own already-generated cards rather than regenerated, since a word's
// characters are themselves individually already in that deck.
export interface WordCharacterRef {
  char: string
  components: CardComponent[]
}

// Extra context sentences beyond the card's main `example`; no fact, since
// the main example already carries the card's "interesting" note.
export interface WordExtraExample {
  hanzi: string
  pinyin: string
  english: string
}

export interface WordCard {
  id: string
  word: string
  frequencyRank: number
  pinyin: string
  meanings: string[]
  characters: WordCharacterRef[]
  example: CardExample
  // Optional so a deck chunk saved before this field existed still loads.
  examples?: WordExtraExample[]
  batchId: string
}

export type CardState = 'new' | 'learning' | 'review' | 'relearning'
export type Grade = 'again' | 'hard' | 'good' | 'easy'

export interface CardProgress {
  state: CardState
  easeFactor: number
  intervalDays: number
  dueAt: string
  lastReviewedAt: string | null
  reps: number
  lapses: number
}

export interface Settings {
  newCardsPerDay: number
  dayRolloverHour: number
  maxIntervalDays: number
}

export interface DailyLogEntry {
  newIntroduced: number
  reviewsDone: number
}

export interface SrsState {
  schemaVersion: number
  createdAt: string
  updatedAt: string
  settings: Settings
  cards: Record<string, CardProgress>
  dailyLog: Record<string, DailyLogEntry>
  // Words the user chose to learn ahead of their frequency-order turn. Optional
  // so state saved before this field existed loads unchanged.
  promotedIds?: string[]
}
