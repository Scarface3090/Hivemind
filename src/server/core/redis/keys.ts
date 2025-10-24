import { GamePhase } from '../../../shared/enums.js';

const ROOT_NAMESPACE = 'hivemind';

const buildKey = (...segments: string[]): string => [ROOT_NAMESPACE, ...segments].join(':');

const gameStateKey = (state: GamePhase): string => buildKey('games', 'by-state', state.toLowerCase());

export const redisKeys = {
  spectrumCache: buildKey('content', 'spectra'),
  // Context-based caching for dynamic content system
  contextIndex: buildKey('content', 'contexts'), // set: available context names
  contextSpectra: (context: string) => buildKey('content', 'context', context), // set: spectrum IDs for context
  contextDifficultySpectra: (context: string, difficulty: string) => buildKey('content', 'context', context, 'difficulty', difficulty.toLowerCase()), // set: spectrum IDs for context+difficulty
  contextSummary: buildKey('content', 'context-summary'), // hash: context statistics
  draft: (draftId: string) => buildKey('drafts', draftId),
  gameMetadata: (gameId: string) => buildKey('games', 'metadata', gameId),
  gameState: (state: GamePhase) => gameStateKey(state),
  activeGameSchedule: buildKey('games', 'active-by-end'),
  revealQueue: buildKey('games', 'reveal-queue'),
  revealJobRegistry: buildKey('games', 'jobs', 'reveal'),
  // Guesses
  guessRecord: (guessId: string) => buildKey('games', 'guesses', 'record', guessId),
  guessesByGame: (gameId: string) => buildKey('games', 'guesses', 'by-game', gameId), // zset: score = guess value
  userGuessIndex: (gameId: string) => buildKey('games', 'guesses', 'by-user', gameId), // hash: userId -> guessId
  // Median cache
  medianCache: (gameId: string) => buildKey('games', 'median', 'cache', gameId),
  // Results
  gameResults: (gameId: string) => buildKey('games', 'results', gameId),
  // Consensus calibration
  consensusStdDevLog: buildKey('consensus', 'stddev-log'), // zset: score = std dev, member = gameId:timestamp
  consensusThresholds: buildKey('consensus', 'thresholds'), // hash: threshold config
} as const;

export type RedisKey = (typeof redisKeys)[keyof typeof redisKeys];

