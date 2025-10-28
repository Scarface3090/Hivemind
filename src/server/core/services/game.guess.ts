import { randomUUID } from 'node:crypto';
import { context, reddit } from '@devvit/web/server';
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
  
  console.log(`[DEBUG] getEffectiveUser - context:`, { 
    userId: ctx.userId, 
    username: ctx.username, 
    isProd,
    nodeEnv: process.env.NODE_ENV 
  });
  
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
      createdAt: existing.createdAt ?? timestampNow(),
      source: (existing.source as GuessSource) ?? GuessSource.Unknown,
      ...(existing.justification && existing.justification.trim().length > 0 ? { justification: existing.justification } : {}),
      ...(existing.redditCommentId ? { redditCommentId: existing.redditCommentId as `t1_${string}` | `t3_${string}` } : {}),
    };

    const response = guessResponseSchema.parse({ guess: already, median: snapshot }) as GuessResponse;
    return response;
  }

  const guess: Guess = {
    guessId: `guess_${randomUUID()}`,
    gameId,
    userId,
    username,
    value: parsed.value,
    createdAt: timestampNow(),
    source: GuessSource.InApp,
    ...(parsed.justification && parsed.justification.trim().length > 0 ? { justification: parsed.justification } : {}),
  };

  // First, persist the guess and compute median
  await saveGuessRecord(guess);
  // Refresh median cache after new guess
  await computeAndCacheMedian(gameId);

  // Now post comment to Reddit if game has a post (only after successful persistence)
  console.log(`[DEBUG] Game metadata redditPost:`, JSON.stringify(metadata.redditPost));
  console.log(`[DEBUG] Current user context:`, { userId, username });
  
  if (metadata.redditPost?.postId) {
    try {
      const commentText = parsed.justification 
        ? `${username} guessed: ${parsed.value}\n\n${parsed.justification}`
        : `${username} guessed: ${parsed.value}`;
      
      console.log(`[DEBUG] Posting comment to Reddit post ${metadata.redditPost.postId} with text:`, commentText);
      console.log(`[DEBUG] Comment API call parameters:`, {
        id: metadata.redditPost.postId,
        text: commentText,
        runAs: 'USER'
      });
      
      // Post comment (try as USER first, fallback to APP)
      let comment;
      try {
        comment = await reddit.submitComment({
          id: metadata.redditPost.postId,
          text: commentText,
          runAs: 'USER'
        });
        console.log(`[DEBUG] Successfully posted comment as USER with ID:`, comment.id);
      } catch (userError) {
        console.warn(`[WARN] Failed to post as USER (${userError.message}), trying as APP`);
        try {
          comment = await reddit.submitComment({
            id: metadata.redditPost.postId,
            text: commentText,
            runAs: 'APP'
          });
          console.log(`[DEBUG] Successfully posted comment as APP with ID:`, comment.id);
        } catch (appError) {
          console.error(`[ERROR] Failed to post as both USER and APP:`, appError);
          throw appError; // Re-throw to be caught by outer try-catch
        }
      }
      
      // Update the saved guess record with the Reddit comment ID
      const commentId = comment.id as `t1_${string}` | `t3_${string}`;
      guess.redditCommentId = commentId;
      await saveGuessRecord(guess);
    } catch (error) {
      console.error(`[ERROR] Failed to post comment for guess ${guess.guessId}:`, error);
      console.error(`[ERROR] Error details:`, JSON.stringify(error, null, 2));
      // Don't fail the guess if comment posting fails - the guess is already persisted
    }
  } else {
    console.log(`[DEBUG] No Reddit post found for game ${gameId}, skipping comment posting`);
  }
  const median = await getMedianForGame(gameId);

  const snapshot: MedianSnapshot = {
    gameId,
    median: median.median ?? guess.value,
    calculatedAt: timestampNow(),
    sampleSize: median.sampleSize,
    freshness: MedianFreshness.Fresh,
  };

  return guessResponseSchema.parse({ guess, median: snapshot }) as GuessResponse;
};


