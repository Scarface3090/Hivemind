import { randomUUID } from 'node:crypto';
import { context } from '@devvit/web/server';
import { GuessSource, GamePhase, MedianFreshness } from '../../../shared/enums.js';
import type { Guess, MedianSnapshot } from '../../../shared/types/Guess.js';
import { timestampNow } from '../../../shared/utils/index.js';
import { guessRequestSchema, guessResponseSchema } from '../../../shared/schemas.js';
import type { GuessRequest, GuessResponse } from '../../../shared/api.js';
import { getGameById } from './game.lifecycle.js';
import { computeAndCacheMedian } from './median.service.js';
import {
  getGuessById,
  getMedianForGame,
  getUserGuessIdForGame,
  saveGuessRecord,
} from './game.repository.js';

const getEffectiveUser = (): { userId?: string; username?: string } => {
  const ctx = context as { userId?: string; username?: string };
  const isProd = process.env.NODE_ENV === 'production';
  if (ctx.userId && ctx.username) return ctx;
  if (!isProd) {
    return {
      userId: ctx.userId ?? 'local-dev-user',
      username: ctx.username ?? 'localdev',
    };
  }
  return ctx;
};

export const submitGuess = async (gameId: string, request: GuessRequest): Promise<GuessResponse> => {
  const { userId, username } = getEffectiveUser();
  if (!userId || !username) {
    throw new Error('User context missing');
  }

  // Validate request body (normalize blank justification to undefined)
  const normalizedJustification = typeof request.justification === 'string'
    ? (request.justification.trim().length > 0 ? request.justification.trim() : undefined)
    : undefined;
  const parsed = guessRequestSchema.parse({ ...request, justification: normalizedJustification });

  // Ensure game exists and is ACTIVE
  const metadata = await getGameById(gameId);
  if (!metadata || metadata.state !== GamePhase.Active) {
    throw new Error('Game not accepting guesses');
  }

  // Enforce one guess per user per game
  const existingId = await getUserGuessIdForGame(gameId, userId);
  if (existingId) {
    const existing = await getGuessById(existingId);
    // Build snapshot with current median
    const medianNow = await getMedianForGame(gameId);
    const snapshot: MedianSnapshot = {
      gameId,
      median: medianNow.median ?? metadata.medianGuess ?? metadata.secretTarget, // best-effort
      calculatedAt: timestampNow(),
      sampleSize: medianNow.sampleSize,
      freshness: MedianFreshness.Fresh,
    };

    const already: Guess = {
      guessId: existing.guessId ?? existingId,
      gameId,
      userId,
      username,
      value: Number(existing.value ?? '0'),
      justification: existing.justification || undefined,
      createdAt: existing.createdAt ?? timestampNow(),
      source: (existing.source as GuessSource) ?? GuessSource.Unknown,
      redditCommentId: existing.redditCommentId || undefined,
    };

    const response = guessResponseSchema.parse({ guess: already, median: snapshot });
    return response;
  }

  const guess: Guess = {
    guessId: `guess_${randomUUID()}`,
    gameId,
    userId,
    username,
    value: parsed.value,
    justification: parsed.justification,
    createdAt: timestampNow(),
    source: GuessSource.InApp,
  };

  await saveGuessRecord(guess);
  // Refresh median cache after new guess
  await computeAndCacheMedian(gameId);
  const median = await getMedianForGame(gameId);

  const snapshot: MedianSnapshot = {
    gameId,
    median: median.median ?? guess.value,
    calculatedAt: timestampNow(),
    sampleSize: median.sampleSize,
    freshness: MedianFreshness.Fresh,
  };

  return guessResponseSchema.parse({ guess, median: snapshot });
};


