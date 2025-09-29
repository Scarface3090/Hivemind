
import type { Spectrum } from './game'

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'DRAFT_NOT_FOUND'
  | 'DRAFT_CONSUMED'
  | 'DRAFT_OWNERSHIP_MISMATCH'
  | 'CLUE_INVALID'
  | 'GAME_NOT_FOUND'
  | 'GAME_EXPIRED'
  | 'PHASE_INVALID'
  | 'GUESS_OUT_OF_RANGE'
  | 'DUPLICATE_GUESS'
  | 'UNKNOWN_ERROR'

export type ApiErrorEnvelope = { ok: false; code: ErrorCode; message: string }

export type DraftResponse = {
  draftId: string
  spectrum: Spectrum
  secretTarget: number
}

export type CreateGameRequest = {
  draftId: string
  clue: string
}

export type SubmitGuessRequest = {
  value: number
  justification: string
}
