import type { GuessSource, MedianFreshness } from '../enums.js';

export interface Guess {
  guessId: string;
  gameId: string;
  userId: string;
  username: string;
  value: number;
  justification: string;
  createdAt: string;
  source: GuessSource;
  redditCommentId?: string;
}

export interface MedianSnapshot {
  gameId: string;
  median: number;
  calculatedAt: string;
  sampleSize: number;
  freshness: MedianFreshness;
}
