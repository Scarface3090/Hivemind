import { GamePhase } from '../../../shared/enums.js';

const ROOT_NAMESPACE = 'hivemind';

const buildKey = (...segments: string[]): string => [ROOT_NAMESPACE, ...segments].join(':');

const gameStateKey = (state: GamePhase): string => buildKey('games', 'by-state', state.toLowerCase());

export const redisKeys = {
  spectrumCache: buildKey('content', 'spectra'),
  draft: (draftId: string) => buildKey('drafts', draftId),
  gameMetadata: (gameId: string) => buildKey('games', 'metadata', gameId),
  gameState: (state: GamePhase) => gameStateKey(state),
  activeGameSchedule: buildKey('games', 'active-by-end'),
  revealQueue: buildKey('games', 'reveal-queue'),
  revealJobRegistry: buildKey('games', 'jobs', 'reveal'),
} as const;

export type RedisKey = (typeof redisKeys)[keyof typeof redisKeys];

