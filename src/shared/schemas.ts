import { z } from 'zod';

import {
  AccoladeType,
  ClueClarityRating,
  ConsensusLabelType,
  GamePhase,
  GuessSource,
  MedianFreshness,
  SpectrumCategory,
  SpectrumDifficulty,
} from './enums.js';
import { DEFAULT_PAGINATION_LIMIT, MAX_GUESS_VALUE, MIN_GUESS_VALUE } from './constants.js';

export const spectrumSchema = z.object({
  id: z.string().min(1),
  leftLabel: z.string().min(1),
  rightLabel: z.string().min(1),
  difficulty: z.nativeEnum(SpectrumDifficulty).optional(),
  category: z.nativeEnum(SpectrumCategory).optional(),
});

export const gameTimingSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  revealAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export const gameMetadataSchema = z.object({
  gameId: z.string().min(1),
  hostUserId: z.string().min(1),
  hostUsername: z.string().min(1),
  clue: z.string().min(1),
  state: z.nativeEnum(GamePhase),
  spectrum: spectrumSchema,
  secretTarget: z.number().int().min(MIN_GUESS_VALUE).max(MAX_GUESS_VALUE),
  timing: gameTimingSchema,
  totalParticipants: z.number().int().nonnegative(),
  medianGuess: z.number().int().min(MIN_GUESS_VALUE).max(MAX_GUESS_VALUE).nullable(),
  publishedAt: z.string().datetime().optional(),
  redditPost: z
    .object({
      postId: z.string().min(1),
      permalink: z.string().min(1),
      url: z.string().min(1),
    })
    .optional(),
});

export const guessSchema = z.object({
  guessId: z.string().min(1),
  gameId: z.string().min(1),
  userId: z.string().min(1),
  username: z.string().min(1),
  value: z.number().int().min(MIN_GUESS_VALUE).max(MAX_GUESS_VALUE),
  justification: z.string().min(1).optional(),
  createdAt: z.string().datetime(),
  source: z.nativeEnum(GuessSource),
  redditCommentId: z.string().optional(),
});

export const medianSnapshotSchema = z.object({
  gameId: z.string().min(1),
  median: z.number().int().min(MIN_GUESS_VALUE).max(MAX_GUESS_VALUE),
  calculatedAt: z.string().datetime(),
  sampleSize: z.number().int().nonnegative(),
  freshness: z.nativeEnum(MedianFreshness),
});

export const gameWithGuessesSchema = gameMetadataSchema.extend({
  guesses: z.array(guessSchema),
});

export const scoreBreakdownSchema = z.object({
  guessingScore: z.number(),
  persuasionScore: z.number(),
  totalScore: z.number(),
});

export const playerScoreSummarySchema = z.object({
  userId: z.string().min(1),
  username: z.string().min(1),
  guessValue: z.number().int().min(MIN_GUESS_VALUE).max(MAX_GUESS_VALUE),
  guessRank: z.number().int().nonnegative(),
  breakdown: scoreBreakdownSchema,
  accolades: z.array(z.nativeEnum(AccoladeType)),
});

export const hostScoreSummarySchema = z.object({
  hostUserId: z.string().min(1),
  hostUsername: z.string().min(1),
  breakdown: scoreBreakdownSchema,
  participantCount: z.number().int().nonnegative(),
  clueClarityRating: z.nativeEnum(ClueClarityRating),
});

export const scoreHistogramBucketSchema = z.object({
  rangeStart: z.number().int().min(MIN_GUESS_VALUE).max(MAX_GUESS_VALUE),
  rangeEnd: z.number().int().min(MIN_GUESS_VALUE).max(MAX_GUESS_VALUE),
  count: z.number().int().nonnegative(),
});

export const consensusLabelSchema = z.object({
  label: z.nativeEnum(ConsensusLabelType),
  standardDeviation: z.number().min(0),
  description: z.string().min(1),
});

export const scoreSummarySchema = z.object({
  host: hostScoreSummarySchema,
  players: z.array(playerScoreSummarySchema),
  targetValue: z.number().int().min(MIN_GUESS_VALUE).max(MAX_GUESS_VALUE),
  finalMedian: z.number().int().min(MIN_GUESS_VALUE).max(MAX_GUESS_VALUE),
  histogram: z.array(scoreHistogramBucketSchema),
  accolades: z.object({
    bestAccuracy: z.string().optional(),
    topPersuasion: z.string().optional(),
    mostContrarian: z.string().optional(),
  }),
  consensus: consensusLabelSchema,
});

export const gameResultsViewerSchema = z.object({
  isHost: z.boolean(),
  guessValue: z.number().int().min(MIN_GUESS_VALUE).max(MAX_GUESS_VALUE).optional(),
  score: z.union([playerScoreSummarySchema, hostScoreSummarySchema]).optional(),
});

export const gameResultsSchema = gameWithGuessesSchema.extend({
  scoreSummary: scoreSummarySchema,
  finalizedAt: z.string().datetime(),
  viewer: gameResultsViewerSchema.optional(),
});

export const draftRequestSchema = z.object({}).optional().default({});

export const draftResponseSchema = z.object({
  draftId: z.string().min(1),
  spectrum: spectrumSchema,
  secretTarget: z.number().int().min(MIN_GUESS_VALUE).max(MAX_GUESS_VALUE),
  expiresAt: z.string().datetime(),
});

export const publishGameRequestSchema = z.object({
  draftId: z.string().min(1),
  clue: z.string().min(1),
  durationMinutes: z.number().int().positive(),
});

export const publishGameResponseSchema = gameMetadataSchema;

export const activeGamesResponseSchema = z.object({
  games: z.array(gameMetadataSchema),
  pagination: z.object({
    cursor: z.string().optional(),
    hasMore: z.boolean(),
    limit: z.number().int().positive().default(DEFAULT_PAGINATION_LIMIT),
  }),
});

export const guessRequestSchema = z.object({
  value: z.number().int().min(MIN_GUESS_VALUE).max(MAX_GUESS_VALUE),
  justification: z.string().optional(),
});

export const guessResponseSchema = z.object({
  guess: guessSchema,
  median: medianSnapshotSchema,
});

export const resultsResponseSchema = z.object({
  gameId: z.string().min(1),
  scores: scoreSummarySchema,
});

export const gamePollingResponseSchema = z.object({
  game: gameMetadataSchema,
  median: medianSnapshotSchema,
});

// Dev tools: simulate guesses
export const simulateGuessesRequestSchema = z
  .object({
    count: z.number().int().min(1).max(5000).optional(),
    stdDev: z.number().min(1).max(50).optional(),
  })
  .optional()
  .default({});

export const simulateGuessesResponseSchema = z.object({
  inserted: z.number().int().nonnegative(),
  sample: z
    .array(z.number().int().min(MIN_GUESS_VALUE).max(MAX_GUESS_VALUE))
    .max(10),
});

export const revealJobPayloadSchema = z.object({
  gameId: z.string().min(1),
  scheduledAt: z.string().datetime(),
});

