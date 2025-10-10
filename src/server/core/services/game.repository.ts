import { redis } from '@devvit/web/server';
import { GamePhase } from '../../../shared/enums.js';
import type { DraftRecord } from './game.lifecycle.js';
import type { GameMetadata, GameResults } from '../../../shared/types/Game.js';
import type { Guess } from '../../../shared/types/Guess.js';
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
  redditPost: metadata.redditPost ? JSON.stringify(metadata.redditPost) : '',
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

export const deleteGameMetadata = async (gameId: string): Promise<void> => {
  await redis.del(redisKeys.gameMetadata(gameId));
};

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

export const removeFromActiveGameSchedule = async (gameId: string): Promise<void> => {
  await redis.zRem(redisKeys.activeGameSchedule, [gameId]);
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

// -----------------------
// Guess persistence layer
// -----------------------

const serializeGuess = (guess: Guess): Record<string, string> => ({
  guessId: guess.guessId,
  gameId: guess.gameId,
  userId: guess.userId,
  username: guess.username,
  value: String(guess.value),
  justification: guess.justification ?? '',
  createdAt: guess.createdAt,
  source: guess.source,
  redditCommentId: guess.redditCommentId ?? '',
});

export const saveGuessRecord = async (guess: Guess): Promise<void> => {
  const key = redisKeys.guessRecord(guess.guessId);
  await redis.hSet(key, serializeGuess(guess));
  // Index by game for median queries (sorted by guess value)
  await redis.zAdd(redisKeys.guessesByGame(guess.gameId), {
    member: guess.guessId,
    score: guess.value,
  });
  // Index by user to enforce one guess per user per game
  await redis.hSet(redisKeys.userGuessIndex(guess.gameId), { [guess.userId]: guess.guessId });
};

export const getGuessById = async (guessId: string): Promise<Record<string, string>> =>
  redis.hGetAll(redisKeys.guessRecord(guessId));

export const getUserGuessIdForGame = async (gameId: string, userId: string): Promise<string | null> => {
  const id = await redis.hGet(redisKeys.userGuessIndex(gameId), userId);
  return id ?? null;
};

export const getGuessCountForGame = async (gameId: string): Promise<number> =>
  redis.zCard(redisKeys.guessesByGame(gameId));

export const getMedianForGame = async (
  gameId: string
): Promise<{ median: number | null; sampleSize: number }> => {
  const total = await getGuessCountForGame(gameId);
  if (total === 0) return { median: null, sampleSize: 0 };

  const midIndexLeft = Math.floor((total - 1) / 2);
  const midIndexRight = Math.floor(total / 2);

  const range = await redis.zRange(redisKeys.guessesByGame(gameId), midIndexLeft, midIndexRight, {
    by: 'rank',
  });

  if (range.length === 1) {
    const first = range[0];
    return { median: first ? first.score : null, sampleSize: total };
  }

  if (range.length === 2) {
    const first = range[0];
    const second = range[1];
    if (!first || !second) {
      return { median: null, sampleSize: total };
    }
    return { median: Math.round((first.score + second.score) / 2), sampleSize: total };
  }

  // Fallback (should not happen)
  return { median: null, sampleSize: total };
};

export const getGuessIdsForGame = async (gameId: string): Promise<string[]> => {
  const entries = await redis.zRange(redisKeys.guessesByGame(gameId), 0, -1, { by: 'rank' });
  return entries.map((entry) => entry.member);
};

export const getGuessUpvoteScore = async (_guess: Guess): Promise<number> => {
  // TODO: integrate Reddit API for actual upvote counts. Stub returns zero for now.
  return 0;
};

export const saveGameResults = async (results: GameResults): Promise<void> => {
  await redis.set(redisKeys.gameResults(results.gameId), JSON.stringify(results));
};

export const getStoredGameResults = async (gameId: string): Promise<GameResults | null> => {
  const value = await redis.get(redisKeys.gameResults(gameId));
  return value ? (JSON.parse(value) as GameResults) : null;
};
