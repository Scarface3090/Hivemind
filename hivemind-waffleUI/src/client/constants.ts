
export const GAME_TITLE = "Hivemind"
export const GAME_BG = "#0b141c"
export const ACCENT = "#ff4500" // Reddit orange
export const TEXT_PRIMARY = "#e6edf3"
export const TEXT_SECONDARY = "#9fb0c0"

// Spectrum pairs for the game (curated, short labels for mobile)
export const SPECTRUMS: Array<[string, string]> = [
  ["Comedy", "Drama"],
  ["Spicy", "Mild"],
  ["Casual", "Formal"],
  ["Optimistic", "Pessimistic"],
  ["Classic", "Modern"],
  ["Simple", "Complex"],
  ["Cozy", "Epic"],
  ["Serious", "Silly"],
]

// Game phases
export const GAME_PHASES = {
  HOST_SETUP: 'HOST_SETUP',
  GUESSING: 'GUESSING',
  REVEAL: 'REVEAL'
} as const

export type GamePhase = typeof GAME_PHASES[keyof typeof GAME_PHASES]

// Round duration 
export const ROUND_DURATION_MS = 24 * 60 * 60 * 1000

// Slider tuning
export const SLIDER_MIN = 0
export const SLIDER_MAX = 100
export const SLIDER_STEP = 1

// Scoring constants
export const MAX_POINTS_ACCURACY = 100
export const MAX_POINTS_DISCUSSION = 50
