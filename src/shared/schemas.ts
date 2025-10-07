import { z } from 'zod';

import {
  AccoladeType,
  ClueClarityRating,
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
});

export const guessSchema = z.object({
  guessId: z.string().min(1),
  gameId: z.string().min(1),
  userId: z.string().min(1),
  username: z.string().min(1),
  value: z.number().int().min(MIN_GUESS_VALUE).max(MAX_GUESS_VALUE),
  justification: z.string().min(1),
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

export const scoreSummarySchema = z.object({
  host: hostScoreSummarySchema,
  players: z.array(playerScoreSummarySchema),
  targetValue: z.number().int().min(MIN_GUESS_VALUE).max(MAX_GUESS_VALUE),
  finalMedian: z.number().int().min(MIN_GUESS_VALUE).max(MAX_GUESS_VALUE),
  histogram: z.array(scoreHistogramBucketSchema),
});

export const gameResultsSchema = gameWithGuessesSchema.extend({
  scoreSummary: scoreSummarySchema,
});

export const draftRequestSchema = z.object({
  hostUserId: z.string().min(1),
});

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
  justification: z.string().min(1),
});

export const guessResponseSchema = z.object({
  guess: guessSchema,
  median: medianSnapshotSchema,
});

export const resultsResponseSchema = z.object({
  gameId: z.string().min(1),
  scores: scoreSummarySchema,
});

