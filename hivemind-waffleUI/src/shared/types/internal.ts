
import type { GamePhase } from './game'

export type DraftRecord = {
  draftId: string
  spectrumLeft: string
  spectrumRight: string
  secretTarget: number
  hostUserId: string
  createdAt: number
}

export type GameRecord = {
  gameId: string
  hostUserId: string
  phase: GamePhase
  spectrumLeft: string
  spectrumRight: string
  clue: string
  secretTarget: number
  createdAt: number
  endTime: number
  finalizedAt?: number
  medianGuess?: number
}

export type GuessRecord = {
  userId: string
  guess: number
  justification?: string
  timestamp: number
}
