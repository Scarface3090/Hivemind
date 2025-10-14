import { scheduler } from '@devvit/web/server';
import { GamePhase } from '../../../shared/enums.js';
import type { RevealJobPayload } from '../../../shared/api.js';
import { revealJobPayloadSchema } from '../../../shared/schemas.js';
import { timestampNow } from '../../../shared/utils/index.js';
import {
  pullActiveGamesForReveal,
  transitionGameState,
  buildRevealJobPayload,
  getGameById,
} from './game.lifecycle.js';

interface LifecycleTickResult {
  transitioned: number;
  scheduled: RevealJobPayload[];
}

export const processLifecycleTick = async (): Promise<LifecycleTickResult> => {
  const now = Date.now();
  const games = await pullActiveGamesForReveal(now);

  const scheduled: RevealJobPayload[] = [];

  for (const metadata of games) {
    const endTimeMs = new Date(metadata.timing.endTime).getTime();
    await transitionGameState(metadata, GamePhase.Reveal, endTimeMs);

    const payload = buildRevealJobPayload(metadata);
    scheduled.push(payload);

    await scheduler.runJob({
      name: 'game-reveal',
      data: payload as unknown as Record<string, string>,
      runAt: new Date(payload.scheduledAt),
    });
  }

  return { transitioned: games.length, scheduled };
};

interface RevealJobResult {
  processed: boolean;
}

export const processRevealJob = async (rawPayload: unknown): Promise<RevealJobResult> => {
  // Validate the payload structure using Zod schema
  const parseResult = revealJobPayloadSchema.safeParse(rawPayload);
  
  if (!parseResult.success) {
    console.error('[game-scheduler] Invalid reveal job payload:', {
      errors: parseResult.error.errors,
      receivedPayload: rawPayload,
    });
    return { processed: false };
  }

  const payload: RevealJobPayload = parseResult.data;

  const metadata = await getGameById(payload.gameId);
  if (!metadata || metadata.state !== GamePhase.Reveal) {
    console.warn('[game-scheduler] Game not in Reveal state or not found:', {
      gameId: payload.gameId,
      currentState: metadata?.state,
    });
    return { processed: false };
  }

  await transitionGameState(metadata, GamePhase.Archived, Date.parse(timestampNow()));
  return { processed: true };
};
