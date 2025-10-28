import { redis } from '@devvit/web/server';
import { GamePhase } from '../../../shared/enums.js';
import type { GameMetadata } from '../../../shared/types/Game.js';
import { DEFAULT_PAGINATION_LIMIT } from '../../../shared/constants.js';
import { redisKeys } from '../redis/keys.js';
import { getGameById } from './game.lifecycle.js';
import { gameMetadataSchema } from '../../../shared/schemas.js';

interface FeedOptions {
  cursor?: string;
  limit?: number;
}

interface FeedResult {
  games: GameMetadata[];
  cursor?: string;
  hasMore: boolean;
  limit: number;
}

export const getActiveGamesFeed = async ({
  cursor,
  limit = DEFAULT_PAGINATION_LIMIT,
}: FeedOptions): Promise<FeedResult> => {
  const start = cursor ? Number(cursor) : 0;
  const stop = start + limit - 1;

  const members = await redis.zRange(redisKeys.activeGameSchedule, start, stop, {
    by: 'rank',
  });

  const games: GameMetadata[] = [];
  for (const entry of members) {
    try {
      const metadata = await getGameById(entry.member);
      if (metadata && metadata.state === GamePhase.Active) {
        // Validate the game metadata matches current schema
        const validatedMetadata = gameMetadataSchema.parse(metadata);
        games.push(validatedMetadata);
      }
    } catch (error) {
      console.warn(`Skipping invalid game ${entry.member} in active feed:`, error instanceof Error ? error.message : error);
      // Skip invalid games rather than failing the entire feed
      continue;
    }
  }

  const nextCursor = members.length === limit ? String(stop + 1) : undefined;
  const total = await redis.zCard(redisKeys.activeGameSchedule);
  const hasMore = stop + 1 < total;

  return {
    games,
    cursor: nextCursor,
    hasMore,
    limit,
  };
};
