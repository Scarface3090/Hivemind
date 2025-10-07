import express from 'express';

import { ensureSpectrumCache, refreshSpectrumCache } from '../services/content.service.js';
import { processLifecycleTick, processRevealJob } from '../services/game.scheduler.js';

export const contentRefreshRouter = express.Router();

contentRefreshRouter.post('/internal/scheduler/content-refresh', async (_req, res) => {
  try {
    await refreshSpectrumCache();
    const spectra = await ensureSpectrumCache();
    res.json({ status: 'ok', spectraCount: spectra.length });
  } catch (error) {
    console.error('Content refresh job failed', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

contentRefreshRouter.post('/internal/scheduler/game-lifecycle-tick', async (_req, res) => {
  try {
    const result = await processLifecycleTick();
    res.json({ status: 'ok', ...result });
  } catch (error) {
    console.error('Lifecycle tick failed', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Lifecycle tick failed',
    });
  }
});

contentRefreshRouter.post('/internal/scheduler/game-reveal', async (req, res) => {
  try {
    const { payload } = req.body as { payload?: unknown };
    const result = await processRevealJob(payload);
    res.json({ status: 'ok', ...result });
  } catch (error) {
    console.error('Reveal job failed', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Reveal job failed',
    });
  }
});

