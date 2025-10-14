import { randomUUID } from 'node:crypto';
import { GamePhase } from '../../../shared/enums.js';
import type { PublishGameRequest, RevealJobPayload } from '../../../shared/api.js';
import type { GameMetadata, GameTiming } from '../../../shared/types/Game.js';
import { MIN_GUESS_VALUE, MAX_GUESS_VALUE } from '../../../shared/constants.js';
import { timestampNow } from '../../../shared/utils/index.js';
import { ensureSpectrumCache } from './content.service.js';
import { createGamePost } from '../post.js';
import {
  saveDraft,
  getDraft,
  deleteDraft,
  saveGameMetadata,
  getGameMetadata,
  addGameToStateIndex,
  removeGameFromStateIndex,
  enqueueActiveGame,
  removeFromActiveGameSchedule,
  dequeueActiveGames,
  updateGameState,
  deleteGameMetadata,
} from './game.repository.js';
import type { Spectrum } from '../../../shared/types/Spectrum.js';

const DRAFT_TTL_SECONDS = 15 * 60;

export interface DraftRecord {
  draftId: string;
  hostUserId: string;
  spectrumId: string;
  secretTarget: number;
  createdAt: string;
  expiresAt: string;
}

export interface EnrichedDraftRecord extends Omit<DraftRecord, 'spectrumId'> {
  spectrum: Spectrum;
}

const pickRandomSpectrumId = async (): Promise<string> => {
  const spectra = await ensureSpectrumCache();
  if (!spectra.length) {
    throw new Error('No spectra available to create a draft.');
  }

  const index = Math.floor(Math.random() * spectra.length);
  const chosen = spectra[index];
  if (!chosen) {
    throw new Error('Failed to select a spectrum.');
  }
  return chosen.id;
};

const randomTargetValue = (): number =>
  Math.floor(Math.random() * (MAX_GUESS_VALUE - MIN_GUESS_VALUE + 1)) + MIN_GUESS_VALUE;

const buildDraft = async (hostUserId: string): Promise<DraftRecord> => {
  const draftId = randomUUID();
  const now = Date.now();
  const createdAt = new Date(now).toISOString();
  const spectrumId = await pickRandomSpectrumId();

  const expiresAt = new Date(now + DRAFT_TTL_SECONDS * 1000).toISOString();

  return {
    draftId,
    hostUserId,
    spectrumId,
    secretTarget: randomTargetValue(),
    createdAt,
    expiresAt,
  };
};

export const createDraft = async (hostUserId: string): Promise<EnrichedDraftRecord> => {
  const draft = await buildDraft(hostUserId);
  await saveDraft(draft, DRAFT_TTL_SECONDS);

  const spectra = await ensureSpectrumCache();
  const spectrum = spectra.find((s) => s.id === draft.spectrumId);
  if (!spectrum) {
    throw new Error('Failed to find spectrum for draft.');
  }

  return {
    draftId: draft.draftId,
    hostUserId: draft.hostUserId,
    spectrum,
    secretTarget: draft.secretTarget,
    createdAt: draft.createdAt,
    expiresAt: draft.expiresAt,
  };
};

const requireDraft = async (draftId: string): Promise<DraftRecord> => {
  const record = await getDraft(draftId);

  const {
    draftId: id,
    hostUserId,
    spectrumId,
    secretTarget,
    createdAt,
    expiresAt,
  } = (record ?? {}) as Record<string, string | undefined>;

  if (!id || !hostUserId || !spectrumId || !secretTarget || !createdAt || !expiresAt) {
    throw new Error('Draft not found or expired.');
  }

  const parsedSecretTarget = Number(secretTarget);
  if (!Number.isFinite(parsedSecretTarget)) {
    throw new Error('Draft malformed: secretTarget missing or invalid.');
  }

  return {
    draftId: id,
    hostUserId,
    spectrumId,
    secretTarget: parsedSecretTarget,
    createdAt,
    expiresAt,
  };
};

const hydrateMetadata = async (gameId: string, record: Record<string, string>): Promise<GameMetadata> => {
  const spectra = await ensureSpectrumCache();
  const spectrum = spectra.find((entry) => entry.id === record.spectrumId);
  if (!spectrum) {
    throw new Error('Stored spectrum is no longer available.');
  }

  let parsedTiming: GameTiming | undefined;
  if (record.timing) {
    try {
      parsedTiming = JSON.parse(record.timing) as GameTiming;
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error(`Game ${gameId} timing JSON is invalid.`);
      }
      throw err;
    }
  }

  if (!parsedTiming) {
    throw new Error('Game timing metadata missing or invalid.');
  }

  const parsedSecretTarget = Number(record.secretTarget);
  if (!Number.isFinite(parsedSecretTarget)) {
    throw new Error('Game metadata malformed: secretTarget missing or invalid.');
  }

  const {
    hostUserId,
    hostUsername,
    clue,
    state,
    totalParticipants,
    medianGuess,
    publishedAt,
    redditPost,
  } = record;

  if (!hostUserId || !hostUsername || !clue || !state) {
    throw new Error('Game metadata missing required fields.');
  }

  const medianGuessValue = medianGuess === 'null' || medianGuess === undefined ? null : Number(medianGuess);

  let parsedRedditPost: GameMetadata['redditPost'];
  if (redditPost) {
    try {
      parsedRedditPost = JSON.parse(redditPost) as GameMetadata['redditPost'];
    } catch (err) {
      console.warn(`Game ${gameId} has invalid redditPost metadata`, err);
    }
  }

  return {
    gameId,
    hostUserId,
    hostUsername,
    clue,
    state: state as GamePhase,
    spectrum,
    secretTarget: parsedSecretTarget,
    timing: {
      ...parsedTiming,
      revealAt: parsedTiming.revealAt ?? parsedTiming.endTime,
    },
    totalParticipants: Number(totalParticipants ?? '0'),
    medianGuess: medianGuessValue,
    ...(publishedAt && publishedAt !== '' ? { publishedAt } : {}),
    ...(parsedRedditPost ? { redditPost: parsedRedditPost } : {}),
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

  const publishedAt = timestampNow();
  const timing: GameTiming = {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    revealAt: end.toISOString(),
    createdAt: draft.createdAt,
    updatedAt: timestampNow(),
  };

  const metadata: GameMetadata = {
    gameId,
    hostUserId,
    hostUsername,
    clue: request.clue,
    state: GamePhase.Active,
    spectrum,
    secretTarget: draft.secretTarget,
    timing,
    totalParticipants: 0,
    medianGuess: null,
    publishedAt,
  };

  try {
    const redditPost = await createGamePost({ metadata });
    metadata.redditPost = redditPost;

    await saveGameMetadata(metadata);
    await addGameToStateIndex(gameId, GamePhase.Active, end.getTime());
    await enqueueActiveGame(gameId, end.getTime());
    await deleteDraft(request.draftId);
    return metadata;
  } catch (error) {
    // Best-effort rollback to keep system consistent
    try {
      await deleteGameMetadata(gameId);
    } catch {
      // Ignore rollback errors
    }
    try {
      await removeGameFromStateIndex(gameId, GamePhase.Active);
    } catch {
      // Ignore rollback errors
    }
    try {
      await removeFromActiveGameSchedule(gameId);
    } catch {
      // Ignore rollback errors
    }
    // Do not attempt to restore the draft here; if deleteDraft already happened, it's fine.
    throw error;
  }
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
  // Validate state transition
  if (metadata.state === nextState) {
    throw new Error(`Game is already in ${nextState} state`);
  }

  await updateGameState(metadata.gameId, metadata.state, nextState, nextScore);

  // Re-fetch metadata to ensure we have the latest state
  const updatedMetadata = await getGameById(metadata.gameId);
  if (!updatedMetadata) {
    throw new Error('Game not found after state transition');
  }

  // Update the passed-in object so caller sees the changes
  Object.assign(metadata, updatedMetadata);
};

export const buildRevealJobPayload = (metadata: GameMetadata): RevealJobPayload => ({
  gameId: metadata.gameId,
  scheduledAt: metadata.timing.endTime,
});
