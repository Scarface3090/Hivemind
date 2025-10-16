import type { AccoladeType, ClueClarityRating, ConsensusLabelType } from '../enums.js';

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
  consensus: ConsensusLabel;
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

export interface ConsensusLabel {
  label: ConsensusLabelType;
  standardDeviation: number;
  description: string;
}

export interface GameResultsViewer {
  isHost: boolean;
  guessValue?: number;
  score?: PlayerScoreSummary | HostScoreSummary;
}

