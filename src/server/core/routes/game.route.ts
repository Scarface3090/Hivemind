import express from 'express';
import { context } from '@devvit/web/server';
import {
  draftRequestSchema,
  publishGameRequestSchema,
  publishGameResponseSchema,
  activeGamesResponseSchema,
} from '../../../shared/schemas.js';
import type { PublishGameRequest } from '../../../shared/api.js';
import { validate } from '../../core/validation/index.js';
import { createDraft, publishGame } from '../services/game.lifecycle.js';
import { getActiveGamesFeed } from '../services/game.feed.js';

const router = express.Router();

router.post('/api/games/draft', validate(draftRequestSchema), async (req, res) => {
  const { hostUserId } = req.body as { hostUserId: string };

  try {
    const draft = await createDraft(hostUserId);
    res.status(201).json(draft);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to create draft' });
  }
});

router.post('/api/games', validate(publishGameRequestSchema), async (req, res) => {
  const { userId, username } = context;
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
    const result = await getActiveGamesFeed({ cursor, limit: limit ? Number(limit) : undefined });
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

export default router;
