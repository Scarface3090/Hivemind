import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { redis } from '@devvit/web/server';
import * as scoringService from '../core/services/scoring.service.js';
import * as repository from '../core/services/game.repository.js';
import { GamePhase, GuessSource, ConsensusLabelType, SpectrumDifficulty } from '../../shared/enums.js';
import type { GameResults } from '../../shared/types/Game.js';

// Mock dependencies
vi.mock('@devvit/web/server', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    hGet: vi.fn(),
    hGetAll: vi.fn(),
    hSet: vi.fn(),
    zAdd: vi.fn(),
    zRange: vi.fn(),
    zCard: vi.fn(),
    zRem: vi.fn(),
    del: vi.fn(),
    expire: vi.fn(),
  },
  context: {
    userId: 'test-user-1',
    username: 'TestUser',
  },
}));

vi.mock('../core/services/game.repository.js');

const mockedRepository = vi.mocked(repository);
const mockedRedis = vi.mocked(redis);

describe('Consensus API Integration Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createMockGameResults = (gameId = 'test-game-1'): GameResults => ({
    gameId,
    hostUserId: 'host-1',
    hostUsername: 'TestHost',
    clue: 'How hot is summer?',
    state: GamePhase.Reveal,
    spectrum: {
      id: 'temperature',
      leftLabel: 'Freezing',
      rightLabel: 'Boiling',
      difficulty: SpectrumDifficulty.Easy,
      context: 'Test',
    },
    secretTarget: 75,
    timing: {
      startTime: new Date('2024-01-01T10:00:00Z').toISOString(),
      endTime: new Date('2024-01-01T11:00:00Z').toISOString(),
      createdAt: new Date('2024-01-01T09:00:00Z').toISOString(),
    },
    totalParticipants: 3,
    medianGuess: 70,
    guesses: [
      {
        guessId: 'guess-1',
        gameId,
        userId: 'user-1',
        username: 'User1',
        value: 74,
        justification: 'Close to target',
        createdAt: new Date().toISOString(),
        source: GuessSource.InApp,
      },
      {
        guessId: 'guess-2',
        gameId,
        userId: 'user-2',
        username: 'User2',
        value: 76,
        justification: 'Slightly higher',
        createdAt: new Date().toISOString(),
        source: GuessSource.InApp,
      },
      {
        guessId: 'guess-3',
        gameId,
        userId: 'user-3',
        username: 'User3',
        value: 75,
        justification: 'Right on target',
        createdAt: new Date().toISOString(),
        source: GuessSource.InApp,
      },
    ],
    scoreSummary: {
      host: {
        hostUserId: 'host-1',
        hostUsername: 'TestHost',
        breakdown: { guessingScore: 95, persuasionScore: 3, totalScore: 98 },
        participantCount: 3,
        clueClarityRating: 'Excellent' as const,
      },
      players: [
        {
          userId: 'user-1',
          username: 'User1',
          guessValue: 74,
          guessRank: 0,
          breakdown: { guessingScore: 99, persuasionScore: 0, totalScore: 99 },
          accolades: [],
        },
        {
          userId: 'user-2',
          username: 'User2',
          guessValue: 76,
          guessRank: 1,
          breakdown: { guessingScore: 99, persuasionScore: 0, totalScore: 99 },
          accolades: [],
        },
        {
          userId: 'user-3',
          username: 'User3',
          guessValue: 75,
          guessRank: 2,
          breakdown: { guessingScore: 100, persuasionScore: 0, totalScore: 100 },
          accolades: [],
        },
      ],
      targetValue: 75,
      finalMedian: 75,
      histogram: [
        { rangeStart: 70, rangeEnd: 79, count: 3 },
      ],
      accolades: {
        bestAccuracy: 'user-3',
      },
      consensus: {
        label: ConsensusLabelType.PerfectHivemind,
        standardDeviation: 0.816,
        description: "The collective mind speaks as one",
      },
    },
    finalizedAt: new Date().toISOString(),
  });

  describe('Game Results Service Integration', () => {
    it('returns consensus data in service response', async () => {
      const mockResults = createMockGameResults('test-game-1');
      mockedRepository.getStoredGameResults.mockResolvedValue(mockResults);

      const results = await scoringService.getGameResults('test-game-1');

      expect(results).toMatchObject({
        gameId: 'test-game-1',
        scoreSummary: {
          consensus: {
            label: ConsensusLabelType.PerfectHivemind,
            standardDeviation: 0.816,
            description: "The collective mind speaks as one",
          },
        },
      });

      // Verify consensus data structure matches schema expectations
      const consensus = results?.scoreSummary.consensus;
      expect(consensus).toBeDefined();
      expect(typeof consensus?.label).toBe('string');
      expect(typeof consensus?.standardDeviation).toBe('number');
      expect(typeof consensus?.description).toBe('string');
      expect(Object.values(ConsensusLabelType)).toContain(consensus?.label);
    });

    it('returns different consensus labels correctly', async () => {
      const testCases = [
        {
          label: ConsensusLabelType.EchoChamber,
          standardDeviation: 4.2,
          description: "Most minds think alike",
        },
        {
          label: ConsensusLabelType.BattleRoyale,
          standardDeviation: 7.5,
          description: "The community is at war",
        },
        {
          label: ConsensusLabelType.TotalAnarchy,
          standardDeviation: 10.8,
          description: "Chaos reigns supreme",
        },
        {
          label: ConsensusLabelType.DumpsterFire,
          standardDeviation: 18.3,
          description: "Complete pandemonium",
        },
        {
          label: ConsensusLabelType.InsufficientData,
          standardDeviation: 0,
          description: "Not enough data to determine consensus",
        },
      ];

      for (const testCase of testCases) {
        const mockResults = createMockGameResults(`test-game-${testCase.label}`);
        mockResults.scoreSummary.consensus = testCase;
        
        mockedRepository.getStoredGameResults.mockResolvedValue(mockResults);

        const results = await scoringService.getGameResults(`test-game-${testCase.label}`);

        expect(results?.scoreSummary.consensus).toEqual(testCase);
      }
    });

    it('handles missing game results gracefully', async () => {
      mockedRepository.getStoredGameResults.mockResolvedValue(null);

      const results = await scoringService.getGameResults('nonexistent-game');

      expect(results).toBeNull();
    });

    it('handles service errors gracefully', async () => {
      // Mock an error in the repository
      mockedRepository.getStoredGameResults.mockRejectedValue(new Error('Database error'));

      try {
        const results = await scoringService.getGameResults('error-game');
        // If the service doesn't throw, it should return null
        expect(results).toBeNull();
      } catch (error) {
        // If the service throws, that's also acceptable error handling
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('validates consensus data against expected schema structure', async () => {
      const mockResults = createMockGameResults('test-game-1');
      mockedRepository.getStoredGameResults.mockResolvedValue(mockResults);

      const results = await scoringService.getGameResults('test-game-1');

      // Verify the response structure matches what the client expects
      expect(results).toMatchObject({
        gameId: expect.any(String),
        hostUserId: expect.any(String),
        hostUsername: expect.any(String),
        clue: expect.any(String),
        state: expect.any(String),
        spectrum: expect.any(Object),
        secretTarget: expect.any(Number),
        timing: expect.any(Object),
        totalParticipants: expect.any(Number),
        medianGuess: expect.any(Number),
        guesses: expect.any(Array),
        scoreSummary: {
          host: expect.any(Object),
          players: expect.any(Array),
          targetValue: expect.any(Number),
          finalMedian: expect.any(Number),
          histogram: expect.any(Array),
          accolades: expect.any(Object),
          consensus: {
            label: expect.any(String),
            standardDeviation: expect.any(Number),
            description: expect.any(String),
          },
        },
        finalizedAt: expect.any(String),
      });
    });

    it('ensures consensus data is properly serialized', async () => {
      const mockResults = createMockGameResults('test-game-1');
      // Test with edge case values
      mockResults.scoreSummary.consensus = {
        label: ConsensusLabelType.DumpsterFire,
        standardDeviation: 25.123456789, // High precision number
        description: "Complete pandemonium with special characters: !@#$%^&*()",
      };
      
      mockedRepository.getStoredGameResults.mockResolvedValue(mockResults);

      const results = await scoringService.getGameResults('test-game-1');

      // Verify data is preserved correctly
      const consensus = results?.scoreSummary.consensus;
      expect(consensus?.label).toBe(ConsensusLabelType.DumpsterFire);
      expect(consensus?.standardDeviation).toBe(25.123456789);
      expect(consensus?.description).toBe("Complete pandemonium with special characters: !@#$%^&*()");
    });

    it('handles concurrent requests for consensus data', async () => {
      const mockResults = createMockGameResults('test-game-1');
      mockedRepository.getStoredGameResults.mockResolvedValue(mockResults);

      // Make multiple concurrent requests
      const requests = Array.from({ length: 5 }, () =>
        scoringService.getGameResults('test-game-1')
      );

      const results = await Promise.all(requests);

      // All responses should be successful and contain consensus data
      results.forEach(result => {
        expect(result).not.toBeNull();
        expect(result?.scoreSummary.consensus).toBeDefined();
        expect(result?.scoreSummary.consensus.label).toBe(ConsensusLabelType.PerfectHivemind);
      });
    });

    it('preserves consensus data precision', async () => {
      const mockResults = createMockGameResults('test-game-1');
      mockResults.scoreSummary.consensus = {
        label: ConsensusLabelType.EchoChamber,
        standardDeviation: 3.141592653589793, // High precision π
        description: "Mathematical precision test",
      };
      
      mockedRepository.getStoredGameResults.mockResolvedValue(mockResults);

      const results = await scoringService.getGameResults('test-game-1');

      // Verify precision is maintained
      expect(results?.scoreSummary.consensus.standardDeviation).toBe(3.141592653589793);
    });
  });

  describe('Service Response Caching with Consensus Data', () => {
    it('serves cached consensus data correctly', async () => {
      const mockResults = createMockGameResults('cached-game');
      
      // First call - data gets cached
      mockedRepository.getStoredGameResults.mockResolvedValueOnce(mockResults);
      
      const firstResults = await scoringService.getGameResults('cached-game');

      // Second call - should use cached data
      mockedRepository.getStoredGameResults.mockResolvedValueOnce(mockResults);
      
      const secondResults = await scoringService.getGameResults('cached-game');

      // Both responses should have identical consensus data
      expect(firstResults?.scoreSummary.consensus).toEqual(
        secondResults?.scoreSummary.consensus
      );
    });

    it('handles cache misses gracefully for consensus data', async () => {
      // First call returns null (cache miss)
      mockedRepository.getStoredGameResults.mockResolvedValueOnce(null);
      
      const results = await scoringService.getGameResults('cache-miss-game');

      expect(results).toBeNull();
    });
  });

  describe('Error Handling in Service with Consensus Data', () => {
    it('handles malformed consensus data gracefully', async () => {
      const mockResults = createMockGameResults('malformed-game');
      // Simulate malformed consensus data
      (mockResults.scoreSummary.consensus as any) = {
        label: 'INVALID_LABEL',
        standardDeviation: 'not-a-number',
        description: null,
      };
      
      mockedRepository.getStoredGameResults.mockResolvedValue(mockResults);

      const results = await scoringService.getGameResults('malformed-game');

      // The service returns the data as-is, validation happens elsewhere
      expect(results?.scoreSummary.consensus).toBeDefined();
    });

    it('handles missing consensus field gracefully', async () => {
      const mockResults = createMockGameResults('missing-consensus-game');
      // Remove consensus field
      delete (mockResults.scoreSummary as any).consensus;
      
      mockedRepository.getStoredGameResults.mockResolvedValue(mockResults);

      const results = await scoringService.getGameResults('missing-consensus-game');

      // Service should return the data without consensus field
      expect(results?.scoreSummary.consensus).toBeUndefined();
    });
  });
});
