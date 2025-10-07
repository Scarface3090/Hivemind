import { randomUUID } from 'node:crypto';
import { GamePhase } from '../../../shared/enums.js';
import type { PublishGameRequest, RevealJobPayload } from '../../../shared/api.js';
import type { GameMetadata } from '../../../shared/types/Game.js';
import { MIN_GUESS_VALUE, MAX_GUESS_VALUE } from '../../../shared/constants.js';
import { timestampNow } from '../../../shared/utils/index.js';
import { ensureSpectrumCache } from './content.service.js';
import {
  saveDraft,
  getDraft,
  deleteDraft,
  saveGameMetadata,
  getGameMetadata,
  addGameToStateIndex,
  enqueueActiveGame,
  dequeueActiveGames,
  updateGameState,
} from './game.repository.js';

const DRAFT_TTL_SECONDS = 15 * 60;

export interface DraftRecord {
  draftId: string;
  hostUserId: string;
  spectrumId: string;
  secretTarget: number;
  createdAt: string;
  expiresAt: string;
}

const pickRandomSpectrumId = async (): Promise<string> => {
  const spectra = await ensureSpectrumCache();
  if (!spectra.length) {
    throw new Error('No spectra available to create a draft.');
  }

  const index = Math.floor(Math.random() * spectra.length);
  return spectra[index].id;
};

const randomTargetValue = (): number =>
  Math.floor(Math.random() * (MAX_GUESS_VALUE - MIN_GUESS_VALUE + 1)) + MIN_GUESS_VALUE;

const buildDraft = async (hostUserId: string): Promise<DraftRecord> => {
  const draftId = randomUUID();
  const createdAt = timestampNow();
  const spectrumId = await pickRandomSpectrumId();

  const expiresAt = new Date(Date.now() + DRAFT_TTL_SECONDS * 1000).toISOString();

  return {
    draftId,
    hostUserId,
    spectrumId,
    secretTarget: randomTargetValue(),
    createdAt,
    expiresAt,
  };
};

export const createDraft = async (hostUserId: string): Promise<DraftRecord> => {
  const draft = await buildDraft(hostUserId);
  await saveDraft(draft, DRAFT_TTL_SECONDS);
  return draft;
};

const requireDraft = async (draftId: string): Promise<DraftRecord> => {
  const record = await getDraft(draftId);

  if (!record || !record.draftId) {
    throw new Error('Draft not found or expired.');
  }

  return {
    draftId: record.draftId,
    hostUserId: record.hostUserId,
    spectrumId: record.spectrumId,
    secretTarget: Number(record.secretTarget),
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
  };
};

const hydrateMetadata = async (gameId: string, record: Record<string, string>): Promise<GameMetadata> => {
  const spectra = await ensureSpectrumCache();
  const spectrum = spectra.find((entry) => entry.id === record.spectrumId);
  if (!spectrum) {
    throw new Error('Stored spectrum is no longer available.');
  }

  const parsedTiming = record.timing ? JSON.parse(record.timing) : undefined;

  if (!parsedTiming) {
    throw new Error('Game timing metadata missing or invalid.');
  }

  return {
    gameId,
    hostUserId: record.hostUserId,
    hostUsername: record.hostUsername,
    clue: record.clue,
    state: record.state as GamePhase,
    spectrum,
    secretTarget: Number(record.secretTarget),
    timing: {
      ...parsedTiming,
      revealAt: parsedTiming.revealAt ?? parsedTiming.endTime,
    },
    totalParticipants: Number(record.totalParticipants ?? '0'),
    medianGuess: record.medianGuess === 'null' ? null : Number(record.medianGuess),
    publishedAt: record.publishedAt || parsedTiming.publishedAt || undefined,
  };
};

export const publishGame = async (
  request: PublishGameRequest,
  hostUserId: string,
  hostUsername: string
): Promise<GameMetadata> => {
  const draft = await requireDraft(request.draftId);

  if (draft.hostUserId !== hostUserId) {
    throw new Error('Draft does not belong to requesting user.');
  }

  const spectra = await ensureSpectrumCache();
  const spectrum = spectra.find((entry) => entry.id === draft.spectrumId);
  if (!spectrum) {
    throw new Error('Draft spectrum is no longer available.');
  }

  const now = Date.now();
  const gameId = `game_${now}_${randomUUID().slice(0, 8)}`;
  const start = new Date(now);
  const end = new Date(start.getTime() + request.durationMinutes * 60_000);

  const timestamps = {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    createdAt: draft.createdAt,
    updatedAt: timestampNow(),
    publishedAt: timestampNow(),
  };

  const metadata: GameMetadata = {
    gameId,
    hostUserId,
    hostUsername,
    clue: request.clue,
    state: GamePhase.Active,
    spectrum,
    secretTarget: draft.secretTarget,
    timing: {
      ...timestamps,
      revealAt: end.toISOString(),
    },
    totalParticipants: 0,
    medianGuess: null,
    publishedAt: timestamps.publishedAt,
  };

  await deleteDraft(request.draftId);
  await saveGameMetadata(metadata);
  await addGameToStateIndex(gameId, GamePhase.Active, end.getTime());
  await enqueueActiveGame(gameId, end.getTime());

  return metadata;
};

export const getGameById = async (gameId: string): Promise<GameMetadata | null> => {
  const record = await getGameMetadata(gameId);
  if (!record || !record.gameId) {
    return null;
  }

  return hydrateMetadata(gameId, record);
};

export const pullActiveGamesForReveal = async (currentTimeMs: number): Promise<GameMetadata[]> => {
  const ids = await dequeueActiveGames(currentTimeMs);
  const games: GameMetadata[] = [];

  for (const gameId of ids) {
    const metadata = await getGameById(gameId);
    if (metadata) {
      games.push(metadata);
    }
  }

  return games;
};

export const transitionGameState = async (
  metadata: GameMetadata,
  nextState: GamePhase,
  nextScore: number
): Promise<void> => {
  await updateGameState(metadata.gameId, metadata.state, nextState, nextScore);
  metadata.state = nextState;
  metadata.timing.updatedAt = timestampNow();
  await saveGameMetadata(metadata);
};

export const buildRevealJobPayload = (metadata: GameMetadata): RevealJobPayload => ({
  gameId: metadata.gameId,
  scheduledAt: metadata.timing.endTime,
});
