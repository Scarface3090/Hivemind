import { redis } from '@devvit/web/server';
import { MedianFreshness } from '../../../shared/enums.js';
import type { MedianSnapshot } from '../../../shared/types/Guess.js';
import { timestampNow } from '../../../shared/utils/index.js';
import { redisKeys } from '../redis/keys.js';
import { getMedianForGame } from './game.repository.js';

const THIRTY_SECONDS = 30;

export interface MedianCacheRecord {
  gameId: string;
  median: number | null;
  calculatedAt: string;
  sampleSize: number;
}

export const computeAndCacheMedian = async (gameId: string): Promise<MedianCacheRecord> => {
  const stats = await getMedianForGame(gameId);
  const record: MedianCacheRecord = {
    gameId,
    median: stats.median,
    calculatedAt: timestampNow(),
    sampleSize: stats.sampleSize,
  };

  await redis.hSet(redisKeys.medianCache(gameId), {
    gameId: record.gameId,
    median: record.median === null ? 'null' : String(record.median),
    calculatedAt: record.calculatedAt,
    sampleSize: String(record.sampleSize),
  });
  await redis.expire(redisKeys.medianCache(gameId), THIRTY_SECONDS);
  return record;
};

export const getCachedMedian = async (gameId: string): Promise<MedianCacheRecord | null> => {
  const value = await redis.hGetAll(redisKeys.medianCache(gameId));
  if (!value || Object.keys(value).length === 0) return null;
  const medianStr = value.median;
  const median = medianStr === 'null' || medianStr === undefined ? null : Number(medianStr);
  return {
    gameId: value.gameId ?? gameId,
    median,
    calculatedAt: value.calculatedAt ?? timestampNow(),
    sampleSize: Number(value.sampleSize ?? '0'),
  };
};

export const getMedianSnapshotFresh = async (gameId: string): Promise<MedianSnapshot> => {
  const rec = await computeAndCacheMedian(gameId);
  return {
    gameId,
    median: rec.median ?? 0,
    calculatedAt: rec.calculatedAt,
    sampleSize: rec.sampleSize,
    freshness: MedianFreshness.Fresh,
  };
};

export const getMedianSnapshotCached = async (gameId: string): Promise<MedianSnapshot> => {
  const cached = await getCachedMedian(gameId);
  if (cached) {
    return {
      gameId,
      median: cached.median ?? 0,
      calculatedAt: cached.calculatedAt,
      sampleSize: cached.sampleSize,
      freshness: MedianFreshness.Fresh,
    };
  }
  const rec = await computeAndCacheMedian(gameId);
  return {
    gameId,
    median: rec.median ?? 0,
    calculatedAt: rec.calculatedAt,
    sampleSize: rec.sampleSize,
    freshness: MedianFreshness.Fresh,
  };
};

export const processMedianTick = async (limit = 100): Promise<{ computed: number }> => {
  const members = await redis.zRange(redisKeys.activeGameSchedule, 0, limit - 1, { by: 'rank' });
  let computed = 0;
  for (const entry of members) {
    await computeAndCacheMedian(entry.member);
    computed++;
  }
  return { computed };
};


