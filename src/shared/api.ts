import type { Spectrum } from './types/Spectrum.js';
import type { GameMetadata, GameResults } from './types/Game.js';
import type { Guess, MedianSnapshot } from './types/Guess.js';
import type { ScoreSummary } from './types/ScoreSummary.js';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DraftRequest {}

export interface DraftResponse {
  draftId: string;
  spectrum: Spectrum;
  secretTarget: number;
  expiresAt: string;
}

export interface PublishGameRequest {
  draftId: string;
  clue: string;
  durationMinutes: number;
}

export type PublishGameResponse = GameMetadata;

export interface ActiveGamesResponse {
  games: GameMetadata[];
  pagination: {
    cursor?: string;
    hasMore: boolean;
    limit: number;
  };
}

export interface GuessRequest {
  value: number;
  justification?: string;
}

export interface GuessResponse {
  guess: Guess;
  median: MedianSnapshot;
}

export type GameDetailResponse = GameResults;

export interface ResultsResponse {
  gameId: string;
  scores: ScoreSummary;
  finalizedAt: string;
}

export interface RevealJobPayload {
  gameId: string;
  scheduledAt: string;
}

export interface GamePollingResponse {
  game: GameMetadata;
  median: MedianSnapshot;
}

export interface InitResponse {
  type: 'init';
  postId: string;
  count: number;
}

export interface IncrementResponse {
  type: 'increment';
  postId: string;
  count: number;
}

export interface DecrementResponse {
  type: 'decrement';
  postId: string;
  count: number;
}

// Context selection
export interface ContextSummary {
  context: string;
  totalCount: number;
  difficultyBreakdown: Record<string, number>;
}

export interface ContextsResponse {
  contexts: ContextSummary[];
}

// Enhanced draft request with filtering
export interface EnhancedDraftRequest {
  context?: string;
  difficulty?: string;
}

// Dev tools: simulate guesses
export interface SimulateGuessesRequest {
  count?: number;
  stdDev?: number;
}

export interface SimulateGuessesResponse {
  inserted: number;
  sample: number[];
}
