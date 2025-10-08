import { context, reddit } from '@devvit/web/server';
import type { GameMetadata } from '../../../shared/types/Game.js';

export interface CreateGamePostPayload {
  metadata: GameMetadata;
}

export interface CreateGamePostResult {
  postId: string;
  permalink: string;
  url: string;
}

const ONE_MINUTE_MS = 60_000;

const computeDurationMinutes = (metadata: GameMetadata): number => {
  const start = new Date(metadata.timing.startTime).getTime();
  const end = new Date(metadata.timing.endTime).getTime();
  const diff = Math.max(end - start, ONE_MINUTE_MS);
  return Math.round(diff / ONE_MINUTE_MS);
};

const buildPostTitle = (metadata: GameMetadata): string => {
  const durationHours = Math.max(1, Math.round(computeDurationMinutes(metadata) / 60));
  return `Hivemind: ${metadata.clue} • ${durationHours}h`;
};

const buildPostBody = (metadata: GameMetadata): string => {
  const durationMinutes = computeDurationMinutes(metadata);
  return [
    `**Spectrum:** ${metadata.spectrum.leftLabel} ↔ ${metadata.spectrum.rightLabel}`,
    `**Clue:** ${metadata.clue}`,
    `**Duration:** ${durationMinutes} minute${durationMinutes === 1 ? '' : 's'}`,
    '',
    'Open this post to play the interactive Hivemind round.',
  ].join('\n');
};

export const createGamePost = async ({ metadata }: CreateGamePostPayload): Promise<CreateGamePostResult> => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('Missing subreddit context for post creation.');
  }

  const post = await reddit.submitCustomPost({
    subredditName,
    title: buildPostTitle(metadata),
    userGeneratedContent: {
      text: buildPostBody(metadata),
    },
    postData: {
      gameId: metadata.gameId,
      host: metadata.hostUsername,
      startTime: metadata.timing.startTime,
      endTime: metadata.timing.endTime,
      spectrum: {
        leftLabel: metadata.spectrum.leftLabel,
        rightLabel: metadata.spectrum.rightLabel,
      },
    },
    splash: {
      appDisplayName: 'Hivemind',
      description: metadata.clue,
      buttonLabel: 'Play round',
    },
  });

  return {
    postId: post.id,
    permalink: post.permalink,
    url: post.permalink ? `https://reddit.com${post.permalink}` : post.url ?? '',
  };
};

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    splash: {
      appDisplayName: 'hvmtestapp',
    },
    subredditName,
    title: 'hvmtestapp',
  });
};
