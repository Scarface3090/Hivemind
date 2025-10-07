import { redis } from '@devvit/web/server';
import { GamePhase } from '../../../shared/enums.js';
import type { DraftRecord } from './game.lifecycle.js';
import type { GameMetadata } from '../../../shared/types/Game.js';
import type { Spectrum } from '../../../shared/types/Spectrum.js';
import { redisKeys } from '../redis/keys.js';

export interface SpectrumCacheRecord {
  spectra: Spectrum[];
  fetchedAt: string;
}

const serializeDraft = (draft: DraftRecord): Record<string, string> => ({
  draftId: draft.draftId,
  hostUserId: draft.hostUserId,
  spectrumId: draft.spectrumId,
  secretTarget: String(draft.secretTarget),
  createdAt: draft.createdAt,
  expiresAt: draft.expiresAt,
});

const serializeMetadata = (metadata: GameMetadata): Record<string, string> => ({
  gameId: metadata.gameId,
  hostUserId: metadata.hostUserId,
  hostUsername: metadata.hostUsername,
  clue: metadata.clue,
  state: metadata.state,
  spectrumId: metadata.spectrum.id,
  spectrum: JSON.stringify(metadata.spectrum),
  secretTarget: String(metadata.secretTarget),
  timing: JSON.stringify(metadata.timing),
  totalParticipants: String(metadata.totalParticipants),
  medianGuess: metadata.medianGuess === null ? 'null' : String(metadata.medianGuess),
  publishedAt: metadata.publishedAt ?? '',
});

export const saveSpectrumCache = async (record: SpectrumCacheRecord): Promise<void> => {
  await redis.set(redisKeys.spectrumCache, JSON.stringify(record));
};

export const getSpectrumCacheRecord = async (): Promise<SpectrumCacheRecord | null> => {
  const value = await redis.get(redisKeys.spectrumCache);
  return value ? (JSON.parse(value) as SpectrumCacheRecord) : null;
};

export const saveDraft = async (draft: DraftRecord, ttlSeconds: number): Promise<void> => {
  const key = redisKeys.draft(draft.draftId);
  await redis.hSet(key, serializeDraft(draft));
  await redis.expire(key, ttlSeconds);
};

export const getDraft = async (draftId: string): Promise<Record<string, string>> =>
  redis.hGetAll(redisKeys.draft(draftId));

export const deleteDraft = async (draftId: string): Promise<void> => {
  await redis.del(redisKeys.draft(draftId));
};

export const saveGameMetadata = async (metadata: GameMetadata): Promise<void> => {
  await redis.hSet(redisKeys.gameMetadata(metadata.gameId), serializeMetadata(metadata));
};

export const getGameMetadata = async (gameId: string): Promise<Record<string, string>> =>
  redis.hGetAll(redisKeys.gameMetadata(gameId));

export const addGameToStateIndex = async (
  gameId: string,
  state: GamePhase,
  score: number
): Promise<void> => {
  await redis.zAdd(redisKeys.gameState(state), { member: gameId, score });
};

export const removeGameFromStateIndex = async (gameId: string, state: GamePhase): Promise<void> => {
  await redis.zRem(redisKeys.gameState(state), [gameId]);
};

export const enqueueActiveGame = async (gameId: string, score: number): Promise<void> => {
  await redis.zAdd(redisKeys.activeGameSchedule, { member: gameId, score });
};

export const dequeueActiveGames = async (maxScore: number): Promise<string[]> => {
  const members = await redis.zRange(redisKeys.activeGameSchedule, 0, maxScore, {
    by: 'score',
  });

  if (members.length === 0) {
    return [];
  }

  const ids = members.map((entry) => entry.member);
  await redis.zRem(redisKeys.activeGameSchedule, ids);
  return ids;
};

export const updateGameState = async (
  gameId: string,
  from: GamePhase,
  to: GamePhase,
  score: number
): Promise<void> => {
  await removeGameFromStateIndex(gameId, from);
  await addGameToStateIndex(gameId, to, score);
};
