import express from 'express';
import { context } from '@devvit/web/server';
import {
  draftRequestSchema,
  publishGameRequestSchema,
  publishGameResponseSchema,
  activeGamesResponseSchema,
  draftResponseSchema,
} from '../../../shared/schemas.js';
import type { PublishGameRequest } from '../../../shared/api.js';
import { validate } from '../../core/validation/index.js';
import { createDraft, publishGame } from '../services/game.lifecycle.js';
import { getActiveGamesFeed } from '../services/game.feed.js';
import { submitGuess } from '../services/game.guess.js';
import { guessRequestSchema, guessResponseSchema, gamePollingResponseSchema, gameResultsSchema } from '../../../shared/schemas.js';
import { getGameById } from '../services/game.lifecycle.js';
import { getMedianSnapshotCached } from '../services/median.service.js';
import { getGameResults } from '../services/scoring.service.js';

const router = express.Router();

// In local development, Devvit user context may be absent. Provide safe fallbacks
// so the host flow can be exercised end-to-end. In production, we require context.
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

router.post('/api/games/draft', validate(draftRequestSchema), async (_req, res) => {
  const { userId } = getEffectiveUser();
  if (!userId) {
    res.status(401).json({ status: 'error', message: 'User context missing' });
    return;
  }

  try {
    const draft = await createDraft(userId);
    const response = draftResponseSchema.parse(draft);
    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to create draft' });
  }
});

router.post('/api/games', validate(publishGameRequestSchema), async (req, res) => {
  const { userId, username } = getEffectiveUser();
  if (!userId || !username) {
    res.status(401).json({ status: 'error', message: 'User context missing' });
    return;
  }

  try {
    const payload = req.body as PublishGameRequest;
    const metadata = await publishGame(payload, userId, username);
    const response = publishGameResponseSchema.parse(metadata);
    res.status(201).json(response);
  } catch (error) {
    res.status(400).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to publish game' });
  }
});

router.get('/api/games/active', async (req, res) => {
  try {
    const { cursor, limit } = req.query as { cursor?: string; limit?: string };
    const options: { cursor?: string; limit?: number } = {};
    if (cursor !== undefined) options.cursor = cursor;
    if (limit !== undefined) options.limit = Number(limit);
    const result = await getActiveGamesFeed(options);
    const payload = activeGamesResponseSchema.parse({
      games: result.games,
      pagination: {
        cursor: result.cursor,
        hasMore: result.hasMore,
        limit: result.limit,
      },
    });
    res.json(payload);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to load active games' });
  }
});

router.post('/api/games/:gameId/guess', validate(guessRequestSchema), async (req, res) => {
  try {
    const { gameId } = req.params as { gameId: string };
    console.log(`[DEBUG] API route received guess submission for gameId=${gameId}, body=`, JSON.stringify(req.body));
    const payload = await submitGuess(gameId, req.body);
    const response = guessResponseSchema.parse(payload);
    console.log(`[DEBUG] API route returning response:`, JSON.stringify(response));
    res.status(201).json(response);
  } catch (error) {
    console.error(`[DEBUG] API route error:`, error);
    res
      .status(400)
      .json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to submit guess' });
  }
});

router.get('/api/games/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params as { gameId: string };
    const metadata = await getGameById(gameId);
    if (!metadata) {
      res.status(404).json({ status: 'error', message: 'Game not found' });
      return;
    }

    const median = await getMedianSnapshotCached(gameId);
    const payload = gamePollingResponseSchema.parse({ game: metadata, median });
    res.json(payload);
  } catch (error) {
    res
      .status(500)
      .json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to load game' });
  }
});

router.get('/api/games/:gameId/results', async (req, res) => {
  try {
    const { gameId } = req.params as { gameId: string };
    const results = await getGameResults(gameId);
    if (!results) {
      res.status(404).json({ status: 'error', message: 'Results not found' });
      return;
    }
    // Attach viewer context
    const { userId } = getEffectiveUser();
    let viewer: { isHost: boolean; score?: number; rank?: number } | undefined;
    if (userId) {
      const isHost = results.hostUserId === userId;
      if (isHost) {
        viewer = {
          isHost: true,
          score: results.scoreSummary.host,
        };
      } else {
        const player = results.scoreSummary.players.find((p) => p.userId === userId);
        const guess = results.guesses.find((g) => g.userId === userId);
        viewer = {
          isHost: false,
          guessValue: guess?.value,
          score: player,
        };
      }
    }

    const payload = gameResultsSchema.parse({ ...results, viewer });
    res.json(payload);
  } catch (error) {
    res
      .status(500)
      .json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to load results' });
  }
});

export default router;
