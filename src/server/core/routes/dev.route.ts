import express from 'express';
import { randomUUID } from 'node:crypto';
import { GamePhase, GuessSource } from '../../../shared/enums.js';
import type { SimulateGuessesRequest, SimulateGuessesResponse } from '../../../shared/api.js';
import { simulateGuessesRequestSchema, simulateGuessesResponseSchema, gameResultsSchema } from '../../../shared/schemas.js';
import { getGameById, transitionGameState } from '../services/game.lifecycle.js';
import { computeAndCacheMedian } from '../services/median.service.js';
import { computeGameResults } from '../services/scoring.service.js';
import { saveGuessRecord } from '../services/game.repository.js';
import { timestampNow } from '../../../shared/utils/index.js';

const router = express.Router();

// Public status endpoint (always available)
router.get('/status', (_req, res) => {
  const enabled = process.env.DEVTOOLS_ENABLED === undefined ? true : process.env.DEVTOOLS_ENABLED === 'true';
  const secretRequired = Boolean(process.env.DEVTOOLS_SECRET);
  res.json({ enabled, secretRequired });
});

// Runtime guard: controlled purely by env vars
router.use((req, res, next) => {
  const enabled = process.env.DEVTOOLS_ENABLED === undefined ? true : process.env.DEVTOOLS_ENABLED === 'true';
  if (!enabled) {
    res.status(403).json({ status: 'error', message: 'Dev tools disabled' });
    return;
  }
  const required = process.env.DEVTOOLS_SECRET;
  if (!required) return next();
  const provided = (req.header('x-dev-secret') as string | undefined) || (req.query['x-dev-secret'] as string | undefined) || '';
  if (required && provided === required) return next();
  res.status(403).json({ status: 'error', message: 'Invalid or missing dev secret' });
});

// Truncated normal sampler around a target with stdDev, clamped to [0,100]
const sampleGuessValue = (target: number, stdDev: number): number => {
  // Box-Muller transform
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  const value = Math.round(target + z * stdDev);
  return Math.max(0, Math.min(100, value));
};

router.post('/games/:gameId/simulate', async (req, res) => {
  try {
    const { gameId } = req.params as { gameId: string };
    const game = await getGameById(gameId);
    if (!game) {
      res.status(404).json({ status: 'error', message: 'Game not found' });
      return;
    }
    if (game.state !== GamePhase.Active) {
      res.status(400).json({ status: 'error', message: 'Game not accepting guesses' });
      return;
    }

    const parsed = simulateGuessesRequestSchema.parse(req.body as SimulateGuessesRequest | undefined);
    const count = parsed.count ?? 100;
    const stdDev = parsed.stdDev ?? 15;

    const sample: number[] = [];
    for (let i = 0; i < count; i++) {
      const value = sampleGuessValue(game.secretTarget, stdDev);
      if (sample.length < 10) sample.push(value);
      await saveGuessRecord({
        guessId: `dev_${randomUUID()}`,
        gameId: game.gameId,
        userId: `dev_user_${i}_${randomUUID().slice(0, 8)}`,
        username: `dev${i}`,
        value,
        createdAt: timestampNow(),
        source: GuessSource.InApp,
      } as any);
    }

    await computeAndCacheMedian(game.gameId);

    const payload: SimulateGuessesResponse = { inserted: count, sample };
    res.json(simulateGuessesResponseSchema.parse(payload));
  } catch (error) {
    res.status(400).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to simulate guesses' });
  }
});

router.post('/games/:gameId/force-reveal', async (req, res) => {
  try {
    const { gameId } = req.params as { gameId: string };
    const game = await getGameById(gameId);
    if (!game) {
      res.status(404).json({ status: 'error', message: 'Game not found' });
      return;
    }

    if (game.state !== GamePhase.Reveal) {
      await transitionGameState(game, GamePhase.Reveal, Date.now());
    }

    const results = await computeGameResults(gameId);
    if (!results) {
      res.status(500).json({ status: 'error', message: 'Failed to compute results' });
      return;
    }
    res.json(gameResultsSchema.parse(results));
  } catch (error) {
    res.status(400).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to force reveal' });
  }
});

export default router;


