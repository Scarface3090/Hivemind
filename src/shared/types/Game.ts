import type { Spectrum } from './Spectrum.js';
import type { Guess } from './Guess.js';
import type { ScoreSummary, GameResultsViewer } from './ScoreSummary.js';
import type { GamePhase } from '../enums.js';

export interface GameTiming {
  startTime: string;
  endTime: string;
  revealAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GameMetadata {
  gameId: string;
  hostUserId: string;
  hostUsername: string;
  clue: string;
  state: GamePhase;
  spectrum: Spectrum;
  secretTarget: number;
  timing: GameTiming;
  totalParticipants: number;
  medianGuess: number | null;
  publishedAt?: string;
  redditPost?: {
    postId: `t3_${string}`;
    permalink: string;
    url: string;
  };
}

export interface GameWithGuesses extends GameMetadata {
  guesses: Guess[];
}

export interface GameResults extends GameWithGuesses {
  scoreSummary: ScoreSummary;
  finalizedAt: string;
  viewer?: GameResultsViewer;
}

