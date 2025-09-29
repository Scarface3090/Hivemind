
export type GamePhase = 'GUESSING' | 'REVEAL'

export type Spectrum = { left: string; right: string }

export type GuessPublic = {
  userId: string
  guess: number
  justification?: string
  timestamp: number
}

export interface PublicGameData {
  gameId: string
  hostUserId: string
  phase: GamePhase
  spectrum: Spectrum
  clue: string
  guesses: GuessPublic[] // empty during GUESSING; full list during REVEAL
  createdAt: number
  endTime: number
  secretTarget?: number // present in REVEAL
  medianGuess?: number // present in REVEAL
}
