import { create } from 'zustand'
import { GAME_PHASES, GamePhase, SPECTRUMS, ROUND_DURATION_MS } from '../constants'
import { apiRequest } from './api'
import type { PublicGameData as SharedPublicGameData } from '../shared/types/game'

type PublicGameData = SharedPublicGameData

// User's guess state
export interface UserGuess {
  value: number
  justification: string
}

interface GameState {
  // Backend cache
  currentGame: PublicGameData | null
  myGuess: UserGuess | null
  hostSpectrum: [string, string] | null  // Spectrum for host before clue
  isLoading: boolean
  error: string | null

  // Internal linkage for host flow
  _draftId?: string
  
  // UI state
  userId: string
  
  // Host Flow Actions
  generateHostSpectrum: () => Promise<void>
  // Payload: none → Updates: hostSpectrum, isLoading, error
  
  createGameWithClue: (payload: { clue: string }) => Promise<void>
  // Payload: { clue: string } → Updates: currentGame, isLoading, error
  
  // Player Flow Actions  
  joinDailyGame: () => Promise<void>
  // Payload: none → Updates: currentGame, isLoading, error
  
  joinGameById: (payload: { gameId: string }) => Promise<void>
  // Payload: { gameId: string } → Updates: currentGame, isLoading, error
  
  submitGuess: (payload: { value: number, justification: string }) => Promise<void>
  // Payload: { value: number, justification: string } → Updates: myGuess, isLoading, error
  
  // Utility Actions
  clearError: () => void
  reset: () => void
}

const generateUserId = () => Math.random().toString(36).substr(2, 8)

export const useGameStore = create<GameState>((set, get) => ({
  currentGame: null,
  myGuess: null,
  hostSpectrum: null,
  isLoading: false,
  error: null,
  userId: (() => {
    try {
      const key = 'hm_user'
      const existing = localStorage.getItem(key)
      if (existing) return existing
      const id = generateUserId()
      localStorage.setItem(key, id)
      return id
    } catch {
      return generateUserId()
    }
  })(),

  // Host Flow: Step 1 - Generate spectrum for host to see
  generateHostSpectrum: async () => {
    set({ isLoading: true, error: null })
    try {
      // Call Devvit server: POST /api/drafts
      // Response shape per shared/types/api DraftResponse:
      // { draftId: string, spectrum: { left, right }, secretTarget: number }
      const data = await apiRequest<{ draftId: string; spectrum: { left: string; right: string } }>('/api/drafts', {
        method: 'POST',
      })
      set({
        _draftId: data.draftId,
        hostSpectrum: [data.spectrum.left, data.spectrum.right],
        isLoading: false,
      })
    } catch (err: any) {
      const message = err?.message || 'Failed to generate spectrum'
      set({
        error: message,
        isLoading: false,
      })
    }
  },

  // Host Flow: Step 2 - Create game with host's clue
  createGameWithClue: async (payload: { clue: string }) => {
    const { _draftId } = get()
    if (!_draftId) {
      set({ error: 'No spectrum generated yet' })
      return
    }
    const clue = payload.clue?.trim()
    if (!clue) {
      set({ error: 'Please enter a clue' })
      return
    }

    set({ isLoading: true, error: null })
    try {
      // POST /api/games with { draftId, clue } → returns PublicGameData
      const newGame = await apiRequest<PublicGameData>('/api/games', {
        method: 'POST',
        body: { draftId: _draftId, clue },
      })
      set({
        currentGame: newGame,
        hostSpectrum: null,
        myGuess: null,
        _draftId: undefined,
        isLoading: false,
      })
    } catch (err: any) {
      let message = 'Failed to create game'
      const code = err?.code as string | undefined
      if (code === 'CLUE_INVALID') message = 'Please enter a valid clue (max 200 chars).'
      if (code === 'DRAFT_NOT_FOUND') message = 'Your draft expired. Generate a new spectrum.'
      if (code === 'DRAFT_CONSUMED') message = 'This draft was already used. Generate a new spectrum.'
      if (code === 'DRAFT_OWNERSHIP_MISMATCH') message = 'You can only publish drafts you created.'
      set({
        error: err?.message || message,
        isLoading: false,
      })
    }
  },

  // Player Flow: Join daily community game
  joinDailyGame: async () => {
    set({ isLoading: true, error: null })
    try {
      // GET /api/daily → PublicGameData
      const dailyGame = await apiRequest<PublicGameData>('/api/daily')
      set({
        currentGame: dailyGame,
        myGuess: null,
        isLoading: false,
      })
    } catch (err: any) {
      const code = err?.code as string | undefined
      const message = code === 'GAME_NOT_FOUND' ? 'No daily game available right now.' : (err?.message || 'Failed to load daily game')
      set({
        error: message,
        isLoading: false,
      })
    }
  },

  // Player Flow: Join specific game by ID
  joinGameById: async (payload: { gameId: string }) => {
    set({ isLoading: true, error: null })
    try {
      // GET /api/games/{gameId} → PublicGameData
      const game = await apiRequest<PublicGameData>(`/api/games/${encodeURIComponent(payload.gameId)}`)
      set({
        currentGame: game,
        myGuess: null,
        isLoading: false,
      })
    } catch (err: any) {
      const message = err?.code === 'GAME_NOT_FOUND' ? 'Game not found.' : (err?.message || 'Failed to load game')
      set({
        error: message,
        isLoading: false,
      })
    }
  },

  // Player Action: Submit guess for current game
  submitGuess: async (payload: { value: number, justification: string }) => {
    const { currentGame } = get()
    if (!currentGame) {
      set({ error: 'No active game' })
      return
    }

    set({ isLoading: true, error: null })
    try {
      // POST /api/games/{gameId}/guesses
      await apiRequest(`/api/games/${encodeURIComponent(currentGame.gameId)}/guesses`, {
        method: 'POST',
        body: {
          value: payload.value,
          justification: payload.justification?.slice(0, 280) ?? '',
        },
      })

      const newGuess: UserGuess = {
        value: payload.value,
        justification: payload.justification?.slice(0, 280) ?? '',
      }
      set({
        myGuess: newGuess,
        isLoading: false,
      })
    } catch (err: any) {
      let message = 'Failed to submit guess'
      const code = err?.code as string | undefined
      if (code === 'GUESS_OUT_OF_RANGE') message = 'Guess must be between 0 and 100.'
      if (code === 'PHASE_INVALID') message = 'This game is not accepting guesses.'
      if (code === 'GAME_EXPIRED') message = 'This game has ended.'
      if (code === 'UNAUTHORIZED') message = 'Please sign in to play.'
      if (code === 'GAME_NOT_FOUND') message = 'Game not found.'
      set({
        error: err?.message || message,
        isLoading: false,
      })
    }
  },
  
  clearError: () => set({ error: null }),

  reset: () => set({
    currentGame: null,
    myGuess: null,
    hostSpectrum: null,
    isLoading: false,
    error: null,
    _draftId: undefined,
  })
}))