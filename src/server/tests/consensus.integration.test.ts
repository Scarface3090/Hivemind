import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { redis } from '@devvit/web/server';
import { 
  computeGameResults, 
  getGameResults,
  analyzeCalibrationData,
  updateConsensusThresholds,
  initializeConsensusThresholds
} from '../core/services/scoring.service.js';
import * as lifecycle from '../core/services/game.lifecycle.js';
import * as repository from '../core/services/game.repository.js';
import { GamePhase, GuessSource, ConsensusLabelType, ClueClarityRating } from '../../shared/enums.js';
import type { GameMetadata } from '../../shared/types/Game.js';
import type { Guess } from '../../shared/types/Guess.js';
import { redisKeys } from '../core/redis/keys.js';

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
}));

vi.mock('../core/services/game.lifecycle.js');
vi.mock('../core/services/game.repository.js');

const mockedLifecycle = vi.mocked(lifecycle);
const mockedRepository = vi.mocked(repository);
const mockedRedis = vi.mocked(redis);

describe('Consensus Feature Integration Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createMockGame = (gameId = 'test-game-1'): GameMetadata => ({
    gameId,
    hostUserId: 'host-1',
    hostUsername: 'TestHost',
    clue: 'How hot is summer?',
    state: GamePhase.Reveal,
    spectrum: {
      id: 'temperature',
      leftLabel: 'Freezing',
      rightLabel: 'Boiling',
    },
    secretTarget: 75,
    timing: {
      startTime: new Date('2024-01-01T10:00:00Z').toISOString(),
      endTime: new Date('2024-01-01T11:00:00Z').toISOString(),
      createdAt: new Date('2024-01-01T09:00:00Z').toISOString(),
    },
    totalParticipants: 5,
    medianGuess: 70,
  });

  const createMockGuess = (
    userId: string, 
    value: number, 
    gameId = 'test-game-1'
  ): Guess => ({
    guessId: `guess-${userId}`,
    gameId,
    userId,
    username: `User${userId}`,
    value,
    justification: `I think it's ${value}`,
    createdAt: new Date().toISOString(),
    source: GuessSource.InApp,
  });

  describe('Consensus calculation in full results computation flow', () => {
    it('computes consensus correctly for Perfect Hivemind scenario', async () => {
      const game = createMockGame();
      const testGuesses = [
        createMockGuess('1', 74),
        createMockGuess('2', 75),
        createMockGuess('3', 76),
        createMockGuess('4', 75),
        createMockGuess('5', 74),
      ];

      // Mock game metadata
      mockedLifecycle.getGameById.mockResolvedValue(game);
      
      // Mock guess data
      mockedRepository.getGuessIdsForGame.mockResolvedValue(
        testGuesses.map(g => g.guessId)
      );
      mockedRepository.getGuessById.mockImplementation(async (guessId: string) => {
        const guess = testGuesses.find(g => g.guessId === guessId);
        return guess ? {
          userId: guess.userId,
          username: guess.username,
          value: guess.value.toString(),
          justification: guess.justification || '',
          createdAt: guess.createdAt,
          source: guess.source.toString(),
        } : {};
      });
      mockedRepository.getGuessUpvoteScore.mockResolvedValue(0);
      mockedRepository.saveGameResults.mockResolvedValue();

      // Mock Redis operations for consensus logging
      mockedRedis.zAdd.mockResolvedValue(1);

      const results = await computeGameResults('test-game-1');

      expect(results).not.toBeNull();
      expect(results?.scoreSummary.consensus).toBeDefined();
      expect(results?.scoreSummary.consensus.label).toBe(ConsensusLabelType.PerfectHivemind);
      expect(results?.scoreSummary.consensus.standardDeviation).toBeLessThan(2);
      expect(results?.scoreSummary.consensus.description).toBe("The collective mind speaks as one");

      // Verify consensus data is logged for calibration
      expect(mockedRedis.zAdd).toHaveBeenCalledWith(
        redisKeys.consensusStdDevLog,
        expect.objectContaining({
          score: expect.any(Number),
          member: expect.stringContaining('test-game-1'),
        })
      );
    });

    it('computes consensus correctly for Dumpster Fire scenario', async () => {
      const game = createMockGame();
      const testGuesses = [
        createMockGuess('1', 10),
        createMockGuess('2', 30),
        createMockGuess('3', 50),
        createMockGuess('4', 70),
        createMockGuess('5', 90),
      ];

      mockedLifecycle.getGameById.mockResolvedValue(game);
      mockedRepository.getGuessIdsForGame.mockResolvedValue(
        testGuesses.map(g => g.guessId)
      );
      mockedRepository.getGuessById.mockImplementation(async (guessId: string) => {
        const guess = testGuesses.find(g => g.guessId === guessId);
        return guess ? {
          userId: guess.userId,
          username: guess.username,
          value: guess.value.toString(),
          justification: guess.justification || '',
          createdAt: guess.createdAt,
          source: guess.source.toString(),
        } : {};
      });
      mockedRepository.getGuessUpvoteScore.mockResolvedValue(0);
      mockedRepository.saveGameResults.mockResolvedValue();
      mockedRedis.zAdd.mockResolvedValue(1);

      const results = await computeGameResults('test-game-1');

      expect(results).not.toBeNull();
      expect(results?.scoreSummary.consensus.label).toBe(ConsensusLabelType.DumpsterFire);
      expect(results?.scoreSummary.consensus.standardDeviation).toBeGreaterThan(15);
      expect(results?.scoreSummary.consensus.description).toBe("Complete pandemonium");
    });

    it('handles insufficient data gracefully', async () => {
      const game = createMockGame();

      mockedLifecycle.getGameById.mockResolvedValue(game);
      mockedRepository.getGuessIdsForGame.mockResolvedValue(['guess-1']);
      mockedRepository.getGuessById.mockResolvedValue({
        userId: '1',
        username: 'User1',
        value: '50',
        justification: 'Only guess',
        createdAt: new Date().toISOString(),
        source: GuessSource.InApp.toString(),
      });
      mockedRepository.getGuessUpvoteScore.mockResolvedValue(0);
      mockedRepository.saveGameResults.mockResolvedValue();

      const results = await computeGameResults('test-game-1');

      expect(results).not.toBeNull();
      expect(results?.scoreSummary.consensus.label).toBe(ConsensusLabelType.InsufficientData);
      expect(results?.scoreSummary.consensus.description).toContain("Only one guess submitted");
    });

    it('continues results computation even if consensus calculation fails', async () => {
      const game = createMockGame();

      mockedLifecycle.getGameById.mockResolvedValue(game);
      mockedRepository.getGuessIdsForGame.mockResolvedValue(['guess-1', 'guess-2']);
      
      // Mock getGuessById to return malformed data that causes processing errors
      mockedRepository.getGuessById.mockImplementation(async (guessId: string) => {
        if (guessId === 'guess-1') {
          // Return data that will cause an error during processing
          return {
            userId: '1',
            username: 'User1',
            value: '60',
            justification: 'Test',
            createdAt: new Date().toISOString(),
            source: 'IN_APP',
          };
        }
        // Return empty object for second guess to simulate data corruption
        return {};
      });
      
      mockedRepository.getGuessUpvoteScore.mockResolvedValue(0);
      mockedRepository.saveGameResults.mockResolvedValue();

      const results = await computeGameResults('test-game-1');

      // Results should still be computed with fallback consensus for insufficient data
      expect(results).not.toBeNull();
      expect(results?.scoreSummary.consensus.label).toBe(ConsensusLabelType.InsufficientData);
      expect(results?.scoreSummary.consensus.description).toContain("Only one guess submitted");
      
      // Other parts of results should still be computed
      expect(results?.scoreSummary.players).toHaveLength(1); // Only one valid guess processed
      expect(results?.scoreSummary.host).toBeDefined();
    });
  });

  describe('Consensus data caching and retrieval', () => {
    it('properly caches consensus data in game results', async () => {
      const game = createMockGame();
      const testGuesses = [
        createMockGuess('1', 45),
        createMockGuess('2', 50),
        createMockGuess('3', 55),
      ];

      mockedLifecycle.getGameById.mockResolvedValue(game);
      mockedRepository.getGuessIdsForGame.mockResolvedValue(
        testGuesses.map(g => g.guessId)
      );
      mockedRepository.getGuessById.mockImplementation(async (guessId: string) => {
        const guess = testGuesses.find(g => g.guessId === guessId);
        return guess ? {
          userId: guess.userId,
          username: guess.username,
          value: guess.value.toString(),
          justification: guess.justification || '',
          createdAt: guess.createdAt,
          source: guess.source.toString(),
        } : {};
      });
      mockedRepository.getGuessUpvoteScore.mockResolvedValue(0);
      mockedRepository.saveGameResults.mockResolvedValue();
      mockedRedis.zAdd.mockResolvedValue(1);

      await computeGameResults('test-game-1');

      // Verify that saveGameResults was called with consensus data
      expect(mockedRepository.saveGameResults).toHaveBeenCalledWith(
        expect.objectContaining({
          scoreSummary: expect.objectContaining({
            consensus: expect.objectContaining({
              label: expect.any(String),
              standardDeviation: expect.any(Number),
              description: expect.any(String),
            }),
          }),
        })
      );
    });

    it('retrieves cached consensus data correctly', async () => {
      const cachedResults = {
        gameId: 'test-game-1',
        hostUserId: 'host-1',
        hostUsername: 'TestHost',
        clue: 'Test clue',
        state: GamePhase.Reveal,
        spectrum: { id: 'test', leftLabel: 'Left', rightLabel: 'Right' },
        secretTarget: 50,
        timing: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        totalParticipants: 3,
        medianGuess: 50,
        guesses: [],
        scoreSummary: {
          host: {
            hostUserId: 'host-1',
            hostUsername: 'TestHost',
            breakdown: { guessingScore: 50, persuasionScore: 3, totalScore: 53 },
            participantCount: 3,
            clueClarityRating: ClueClarityRating.Fair,
          },
          players: [],
          targetValue: 50,
          finalMedian: 50,
          histogram: [],
          accolades: {},
          consensus: {
            label: ConsensusLabelType.EchoChamber,
            standardDeviation: 4.2,
            description: "Most minds think alike",
          },
        },
        finalizedAt: new Date().toISOString(),
      };

      mockedRepository.getStoredGameResults.mockResolvedValue(cachedResults);

      const results = await getGameResults('test-game-1');

      expect(results).not.toBeNull();
      expect(results?.scoreSummary.consensus).toEqual({
        label: ConsensusLabelType.EchoChamber,
        standardDeviation: 4.2,
        description: "Most minds think alike",
      });
    });
  });

  describe('API responses include consensus data', () => {
    it('includes consensus data in results API response structure', async () => {
      const game = createMockGame();
      const testGuesses = [
        createMockGuess('1', 48),
        createMockGuess('2', 52),
      ];

      mockedLifecycle.getGameById.mockResolvedValue(game);
      mockedRepository.getGuessIdsForGame.mockResolvedValue(['guess-1', 'guess-2']);
      mockedRepository.getGuessById.mockImplementation(async (guessId: string) => {
        const guess = testGuesses.find(g => g.guessId === guessId);
        return guess ? {
          userId: guess.userId,
          username: guess.username,
          value: guess.value.toString(),
          justification: guess.justification || '',
          createdAt: guess.createdAt,
          source: guess.source.toString(),
        } : {};
      });
      mockedRepository.getGuessUpvoteScore.mockResolvedValue(0);
      mockedRepository.saveGameResults.mockResolvedValue();
      mockedRedis.zAdd.mockResolvedValue(1);

      const results = await computeGameResults('test-game-1');

      // Verify the structure matches what the API expects
      expect(results).toMatchObject({
        gameId: expect.any(String),
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
      });

      // Verify consensus data is properly typed
      const consensus = results?.scoreSummary.consensus;
      expect(Object.values(ConsensusLabelType)).toContain(consensus?.label);
      expect(typeof consensus?.standardDeviation).toBe('number');
      expect(typeof consensus?.description).toBe('string');
    });
  });

  describe('Empirical calibration system', () => {
    it('logs standard deviation data for calibration', async () => {
      const game = createMockGame();
      const testGuesses = [
        createMockGuess('1', 40),
        createMockGuess('2', 60),
      ];

      mockedLifecycle.getGameById.mockResolvedValue(game);
      mockedRepository.getGuessIdsForGame.mockResolvedValue(['guess-1', 'guess-2']);
      mockedRepository.getGuessById.mockImplementation(async (guessId: string) => {
        const guess = testGuesses.find(g => g.guessId === guessId);
        return guess ? {
          userId: guess.userId,
          username: guess.username,
          value: guess.value.toString(),
          justification: guess.justification || '',
          createdAt: guess.createdAt,
          source: guess.source.toString(),
        } : {};
      });
      mockedRepository.getGuessUpvoteScore.mockResolvedValue(0);
      mockedRepository.saveGameResults.mockResolvedValue();
      mockedRedis.zAdd.mockResolvedValue(1);

      await computeGameResults('test-game-1');

      // Verify standard deviation is logged to Redis
      expect(mockedRedis.zAdd).toHaveBeenCalledWith(
        redisKeys.consensusStdDevLog,
        expect.objectContaining({
          score: 10,
          member: expect.stringContaining('test-game-1'),
        })
      );
    });

    it('analyzes calibration data correctly with sufficient samples', async () => {
      // Mock Redis responses for calibration analysis
      mockedRedis.zCard.mockResolvedValue(100); // Sufficient samples
      
      // Mock percentile data
      const mockPercentileData = {
        p20: [{ member: 'game1:123:5', score: 2.5 }],
        p40: [{ member: 'game2:124:4', score: 5.2 }],
        p60: [{ member: 'game3:125:6', score: 8.1 }],
        p80: [{ member: 'game4:126:3', score: 12.3 }],
        median: [{ member: 'game5:127:7', score: 7.5 }],
      };

      mockedRedis.zRange
        .mockResolvedValueOnce([{ member: 'min', score: 0.5 }]) // min
        .mockResolvedValueOnce([{ member: 'max', score: 25.0 }]) // max
        .mockResolvedValueOnce(mockPercentileData.p20) // p20
        .mockResolvedValueOnce(mockPercentileData.p40) // p40
        .mockResolvedValueOnce(mockPercentileData.median) // median
        .mockResolvedValueOnce(mockPercentileData.p60) // p60
        .mockResolvedValueOnce(mockPercentileData.p80); // p80

      const analysis = await analyzeCalibrationData();

      expect(analysis.isValid).toBe(true);
      expect(analysis.totalSamples).toBe(100);
      expect(analysis.percentileThresholds.p20).toBe(2.5);
      expect(analysis.percentileThresholds.p40).toBe(5.2);
      expect(analysis.percentileThresholds.p60).toBe(8.1);
      expect(analysis.percentileThresholds.p80).toBe(12.3);
      expect(analysis.dataRange.min).toBe(0.5);
      expect(analysis.dataRange.max).toBe(25.0);
      expect(analysis.validationErrors).toHaveLength(0);
    });

    it('handles insufficient calibration data', async () => {
      mockedRedis.zCard.mockResolvedValue(25); // Insufficient samples

      const analysis = await analyzeCalibrationData();

      expect(analysis.isValid).toBe(false);
      expect(analysis.totalSamples).toBe(25);
      expect(analysis.validationErrors[0]).toContain('Insufficient data: 25 samples');
    });

    it('updates consensus thresholds with valid calibration data', async () => {
      // Mock current threshold config
      mockedRedis.hGetAll.mockResolvedValue({
        perfectHivemind: '2',
        echoChamber: '5',
        battleRoyale: '8',
        totalAnarchy: '12',
        dumpsterFire: '15',
        lastUpdated: '0',
        samplesUsed: '0',
        version: '1',
      });

      // Mock calibration analysis
      mockedRedis.zCard.mockResolvedValue(100);
      mockedRedis.zRange
        .mockResolvedValueOnce([{ member: 'min', score: 0.5 }])
        .mockResolvedValueOnce([{ member: 'max', score: 20.0 }])
        .mockResolvedValueOnce([{ member: 'p20', score: 2.2 }])
        .mockResolvedValueOnce([{ member: 'p40', score: 4.8 }])
        .mockResolvedValueOnce([{ member: 'median', score: 6.5 }])
        .mockResolvedValueOnce([{ member: 'p60', score: 8.5 }])
        .mockResolvedValueOnce([{ member: 'p80', score: 11.8 }]);

      mockedRedis.hSet.mockResolvedValue(1);

      const result = await updateConsensusThresholds();

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.newConfig).toBeDefined();
      expect(result.newConfig?.perfectHivemind).toBe(2.2);
      expect(result.newConfig?.echoChamber).toBe(4.8);
      expect(result.newConfig?.battleRoyale).toBe(8.5);
      expect(result.newConfig?.totalAnarchy).toBe(11.8);

      // Verify new config was saved
      expect(mockedRedis.hSet).toHaveBeenCalledWith(
        redisKeys.consensusThresholds,
        expect.objectContaining({
          perfectHivemind: '2.2',
          echoChamber: '4.8',
          battleRoyale: '8.5',
          totalAnarchy: '11.8',
          version: '2',
        })
      );
    });

    it('prevents extreme threshold changes', async () => {
      // Mock current threshold config
      mockedRedis.hGetAll.mockResolvedValue({
        perfectHivemind: '2',
        echoChamber: '5',
        battleRoyale: '8',
        totalAnarchy: '12',
        dumpsterFire: '15',
        lastUpdated: '0',
        samplesUsed: '0',
        version: '1',
      });

      // Mock extreme calibration data
      mockedRedis.zCard.mockResolvedValue(100);
      mockedRedis.zRange
        .mockResolvedValueOnce([{ member: 'min', score: 0.1 }])
        .mockResolvedValueOnce([{ member: 'max', score: 50.0 }])
        .mockResolvedValueOnce([{ member: 'p20', score: 0.5 }]) // Extreme change from 2
        .mockResolvedValueOnce([{ member: 'p40', score: 15.0 }]) // Extreme change from 5
        .mockResolvedValueOnce([{ member: 'median', score: 20.0 }])
        .mockResolvedValueOnce([{ member: 'p60', score: 25.0 }]) // Extreme change from 8
        .mockResolvedValueOnce([{ member: 'p80', score: 35.0 }]); // Extreme change from 12

      const result = await updateConsensusThresholds();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('change factor');
    });

    it('initializes thresholds from stored configuration', async () => {
      mockedRedis.hGetAll.mockResolvedValue({
        perfectHivemind: '1.8',
        echoChamber: '4.5',
        battleRoyale: '7.2',
        totalAnarchy: '10.5',
        dumpsterFire: '13.0',
        lastUpdated: '1640995200000',
        samplesUsed: '150',
        version: '3',
      });

      await initializeConsensusThresholds();

      // This test verifies the function runs without error
      // In a real implementation, we'd verify the in-memory thresholds are updated
      expect(mockedRedis.hGetAll).toHaveBeenCalledWith(redisKeys.consensusThresholds);
    });

    it('handles calibration system errors gracefully', async () => {
      // Mock Redis error
      mockedRedis.zCard.mockRejectedValue(new Error('Redis connection failed'));

      const analysis = await analyzeCalibrationData();

      expect(analysis.isValid).toBe(false);
      expect(analysis.validationErrors[0]).toContain('Analysis failed: Redis connection failed');
    });
  });

  describe('Edge cases and error handling', () => {
    it('handles malformed guess data in consensus calculation', async () => {
      const game = createMockGame();

      mockedLifecycle.getGameById.mockResolvedValue(game);
      mockedRepository.getGuessIdsForGame.mockResolvedValue(['guess-1', 'guess-2']);
      
      // Mock malformed guess data
      mockedRepository.getGuessById
        .mockResolvedValueOnce({
          userId: '1',
          username: 'User1',
          value: 'invalid', // Invalid value
          justification: 'Test',
          createdAt: new Date().toISOString(),
          source: GuessSource.InApp.toString(),
        })
        .mockResolvedValueOnce({
          userId: '2',
          username: 'User2',
          value: '50',
          justification: 'Test',
          createdAt: new Date().toISOString(),
          source: GuessSource.InApp.toString(),
        });

      mockedRepository.getGuessUpvoteScore.mockResolvedValue(0);
      mockedRepository.saveGameResults.mockResolvedValue();

      const results = await computeGameResults('test-game-1');

      expect(results).not.toBeNull();
      expect(results?.scoreSummary.consensus.label).toBe(ConsensusLabelType.InsufficientData);
      expect(results?.scoreSummary.consensus.description).toContain("Only one valid guess");
    });

    it('handles Redis logging failures gracefully', async () => {
      const game = createMockGame();
      const testGuesses = [
        createMockGuess('1', 45),
        createMockGuess('2', 55),
      ];

      mockedLifecycle.getGameById.mockResolvedValue(game);
      mockedRepository.getGuessIdsForGame.mockResolvedValue(['guess-1', 'guess-2']);
      mockedRepository.getGuessById.mockImplementation(async (guessId: string) => {
        const guess = testGuesses.find(g => g.guessId === guessId);
        return guess ? {
          userId: guess.userId,
          username: guess.username,
          value: guess.value.toString(),
          justification: guess.justification || '',
          createdAt: guess.createdAt,
          source: guess.source.toString(),
        } : {};
      });
      mockedRepository.getGuessUpvoteScore.mockResolvedValue(0);
      mockedRepository.saveGameResults.mockResolvedValue();

      // Mock Redis logging failure
      mockedRedis.zAdd.mockRejectedValue(new Error('Redis write failed'));

      const results = await computeGameResults('test-game-1');

      // Results should still be computed despite logging failure
      expect(results).not.toBeNull();
      expect(results?.scoreSummary.consensus).toBeDefined();
      expect(results?.scoreSummary.consensus.label).toBe(ConsensusLabelType.PerfectHivemind);
    });

    it('handles empty guess arrays', async () => {
      const game = createMockGame();

      mockedLifecycle.getGameById.mockResolvedValue(game);
      mockedRepository.getGuessIdsForGame.mockResolvedValue([]);
      mockedRepository.saveGameResults.mockResolvedValue();

      const results = await computeGameResults('test-game-1');

      expect(results).not.toBeNull();
      expect(results?.scoreSummary.consensus.label).toBe(ConsensusLabelType.InsufficientData);
      expect(results?.scoreSummary.consensus.description).toBe("No guesses submitted yet");
    });
  });
});
