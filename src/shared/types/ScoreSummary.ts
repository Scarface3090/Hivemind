/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AccoladeType, ClueClarityRating } from '../enums.js';

export interface ScoreBreakdown {
  guessingScore: number;
  persuasionScore: number;
  totalScore: number;
}

export interface PlayerScoreSummary {
  userId: string;
  username: string;
  guessValue: number;
  guessRank: number;
  breakdown: ScoreBreakdown;
  accolades: AccoladeType[];
}

export interface HostScoreSummary {
  hostUserId: string;
  hostUsername: string;
  breakdown: ScoreBreakdown;
  participantCount: number;
  clueClarityRating: ClueClarityRating;
}

export interface ScoreSummary {
  host: HostScoreSummary;
  players: PlayerScoreSummary[];
  targetValue: number;
  finalMedian: number;
  histogram: ScoreHistogramBucket[];
  accolades: AccoladeSummary;
}

export interface ScoreHistogramBucket {
  rangeStart: number;
  rangeEnd: number;
  count: number;
}

export interface AccoladeSummary {
  bestAccuracy?: PlayerScoreSummary['userId'];
  topPersuasion?: PlayerScoreSummary['userId'];
  mostContrarian?: PlayerScoreSummary['userId'];
}

