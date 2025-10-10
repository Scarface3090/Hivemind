import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as redis from '@devvit/web/server';
import { computeGameResults, getGameResults } from '../core/services/scoring.service.js';
import * as lifecycle from '../core/services/game.lifecycle.js';
import * as repository from '../core/services/game.repository.js';
import { GamePhase } from '../../shared/enums.js';

vi.mock('@devvit/web/server', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    hGet: vi.fn(),
    hGetAll: vi.fn(),
    zRange: vi.fn(),
    zCard: vi.fn(),
  },
}));

vi.mock('../core/services/game.lifecycle.js');
vi.mock('../core/services/game.repository.js');

const mockedLifecycle = vi.mocked(lifecycle);
const mockedRepository = vi.mocked(repository);
const mockedRedis = vi.mocked(redis.redis);

describe('Scoring Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('computes player scores and persists results', async () => {
    mockedLifecycle.getGameById.mockResolvedValue({
      gameId: 'game-1',
      hostUserId: 'host-1',
      hostUsername: 'hostName',
      clue: 'clue',
      state: GamePhase.Reveal,
      spectrum: {
        id: 'spec-1',
        leftLabel: 'Cold',
        rightLabel: 'Hot',
      },
      secretTarget: 70,
      timing: {
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      totalParticipants: 2,
      medianGuess: 60,
    } as any);

    mockedRepository.getGuessIdsForGame.mockResolvedValue(['guess-1', 'guess-2']);
    mockedRepository.getGuessById.mockImplementation(async (id: string) => {
      if (id === 'guess-1') {
        return {
          guessId: 'guess-1',
          gameId: 'game-1',
          userId: 'user-1',
          username: 'User One',
          value: '65',
          justification: 'Close call',
          createdAt: new Date().toISOString(),
          source: 'IN_APP',
        };
      }
      return {
        guessId: 'guess-2',
        gameId: 'game-1',
        userId: 'user-2',
        username: 'User Two',
        value: '20',
        justification: 'Wild guess',
        createdAt: new Date().toISOString(),
        source: 'IN_APP',
      };
    });
    mockedRepository.getGuessUpvoteScore.mockResolvedValue(0);
    mockedRepository.saveGameResults.mockResolvedValue();

    const results = await computeGameResults('game-1');

    expect(results).not.toBeNull();
    expect(results?.scoreSummary.players).toHaveLength(2);
    expect(mockedRepository.saveGameResults).toHaveBeenCalledTimes(1);
    expect(mockedRepository.saveGameResults).toHaveBeenCalledWith(expect.objectContaining({
      gameId: 'game-1',
      scoreSummary: expect.objectContaining({
        host: expect.objectContaining({ hostUserId: 'host-1' }),
      }),
    }));
  });

  it('returns null when game metadata missing', async () => {
    mockedLifecycle.getGameById.mockResolvedValue(null);
    const results = await computeGameResults('game-404');
    expect(results).toBeNull();
    expect(mockedRepository.saveGameResults).not.toHaveBeenCalled();
  });

  it('getGameResults returns cached results if present', async () => {
    mockedRepository.getStoredGameResults.mockResolvedValueOnce({
      gameId: 'game-2',
      hostUserId: 'host-1',
      hostUsername: 'host',
      clue: 'clue',
      state: GamePhase.Reveal,
      spectrum: { id: 's', leftLabel: 'L', rightLabel: 'R' },
      secretTarget: 50,
      timing: { startTime: new Date().toISOString(), endTime: new Date().toISOString(), createdAt: new Date().toISOString() },
      totalParticipants: 0,
      medianGuess: 50,
      guesses: [],
      scoreSummary: {
        host: {
          hostUserId: 'host-1',
          hostUsername: 'host',
          breakdown: { guessingScore: 50, persuasionScore: 0, totalScore: 50 },
          participantCount: 0,
          clueClarityRating:  'EXCELLENT' as any,
        },
        players: [],
        targetValue: 50,
        finalMedian: 50,
        histogram: [],
        accolades: {},
      },
      finalizedAt: new Date().toISOString(),
    } as any);

    const res = await getGameResults('game-2');
    expect(res).not.toBeNull();
    expect(mockedRepository.getStoredGameResults).toHaveBeenCalledWith('game-2');
  });
});
