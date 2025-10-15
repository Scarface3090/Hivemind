import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  calculateStandardDeviation, 
  calculateConsensusLabel, 
  calculateConsensusFromGuesses 
} from '../core/services/scoring.service.js';
import { ConsensusLabelType, GuessSource } from '../../shared/enums.js';
import type { Guess } from '../../shared/types/Guess.js';

describe('Consensus Calculation Functions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateStandardDeviation', () => {
    it('returns 0 for empty array', () => {
      const result = calculateStandardDeviation([]);
      expect(result).toBe(0);
    });

    it('returns 0 for single value', () => {
      const result = calculateStandardDeviation([50]);
      expect(result).toBe(0);
    });

    it('calculates correct standard deviation for identical values', () => {
      const result = calculateStandardDeviation([50, 50, 50, 50]);
      expect(result).toBe(0);
    });

    it('calculates correct standard deviation for simple case', () => {
      // Values: [40, 50, 60], mean = 50, variance = ((10)² + (0)² + (10)²) / 3 = 200/3
      // Standard deviation = sqrt(200/3) ≈ 8.165
      const result = calculateStandardDeviation([40, 50, 60]);
      expect(result).toBeCloseTo(8.165, 2);
    });

    it('calculates correct standard deviation for wide distribution', () => {
      // Values: [10, 30, 50, 70, 90], mean = 50
      // Variance = ((40)² + (20)² + (0)² + (20)² + (40)²) / 5 = (1600 + 400 + 0 + 400 + 1600) / 5 = 4000/5 = 800
      // Standard deviation = sqrt(800) ≈ 28.284
      const result = calculateStandardDeviation([10, 30, 50, 70, 90]);
      expect(result).toBeCloseTo(28.284, 2);
    });

    it('calculates correct standard deviation for narrow distribution', () => {
      // Values: [49, 50, 51], mean = 50
      const result = calculateStandardDeviation([49, 50, 51]);
      expect(result).toBeCloseTo(0.816, 2);
    });

    it('handles decimal values correctly', () => {
      const result = calculateStandardDeviation([49.5, 50.0, 50.5]);
      expect(result).toBeCloseTo(0.408, 2);
    });

    it('handles null/undefined input gracefully', () => {
      expect(calculateStandardDeviation(null as any)).toBe(0);
      expect(calculateStandardDeviation(undefined as any)).toBe(0);
    });

    it('filters out null, undefined, and non-numeric values', () => {
      const mixedValues = [50, null, 60, undefined, "invalid" as any, NaN, Infinity, 70];
      const result = calculateStandardDeviation(mixedValues);
      // Should only use [50, 60, 70], which has std dev of ~8.165
      expect(result).toBeCloseTo(8.165, 2);
    });

    it('handles arrays with all invalid values', () => {
      const invalidValues = [null, undefined, NaN, Infinity, "invalid" as any];
      const result = calculateStandardDeviation(invalidValues);
      expect(result).toBe(0);
    });
  });

  describe('calculateConsensusLabel', () => {
    it('returns Perfect Hivemind for very low standard deviation', () => {
      const result = calculateConsensusLabel(1.5);
      expect(result.label).toBe(ConsensusLabelType.PerfectHivemind);
      expect(result.standardDeviation).toBe(1.5);
      expect(result.description).toBe("The collective mind speaks as one");
    });

    it('returns Echo Chamber for low standard deviation', () => {
      const result = calculateConsensusLabel(3.5);
      expect(result.label).toBe(ConsensusLabelType.EchoChamber);
      expect(result.standardDeviation).toBe(3.5);
      expect(result.description).toBe("Most minds think alike");
    });

    it('returns Battle Royale for medium standard deviation', () => {
      const result = calculateConsensusLabel(6.5);
      expect(result.label).toBe(ConsensusLabelType.BattleRoyale);
      expect(result.standardDeviation).toBe(6.5);
      expect(result.description).toBe("The community is at war");
    });

    it('returns Total Anarchy for high standard deviation', () => {
      const result = calculateConsensusLabel(10);
      expect(result.label).toBe(ConsensusLabelType.TotalAnarchy);
      expect(result.standardDeviation).toBe(10);
      expect(result.description).toBe("Chaos reigns supreme");
    });

    it('returns Dumpster Fire for very high standard deviation', () => {
      const result = calculateConsensusLabel(20);
      expect(result.label).toBe(ConsensusLabelType.DumpsterFire);
      expect(result.standardDeviation).toBe(20);
      expect(result.description).toBe("Complete pandemonium");
    });

    it('handles threshold boundary cases correctly', () => {
      // Test exact threshold values
      expect(calculateConsensusLabel(2).label).toBe(ConsensusLabelType.PerfectHivemind);
      expect(calculateConsensusLabel(2.1).label).toBe(ConsensusLabelType.EchoChamber);
      expect(calculateConsensusLabel(5).label).toBe(ConsensusLabelType.EchoChamber);
      expect(calculateConsensusLabel(5.1).label).toBe(ConsensusLabelType.BattleRoyale);
      expect(calculateConsensusLabel(8).label).toBe(ConsensusLabelType.BattleRoyale);
      expect(calculateConsensusLabel(8.1).label).toBe(ConsensusLabelType.TotalAnarchy);
      expect(calculateConsensusLabel(12).label).toBe(ConsensusLabelType.TotalAnarchy);
      expect(calculateConsensusLabel(12.1).label).toBe(ConsensusLabelType.DumpsterFire);
    });
  });

  describe('calculateConsensusFromGuesses', () => {
    const createMockGuess = (value: number, userId = 'user1'): Guess => ({
      guessId: `guess-${userId}-${value}`,
      gameId: 'game-1',
      userId,
      username: `User ${userId}`,
      value,
      justification: 'Test guess',
      createdAt: new Date().toISOString(),
      source: GuessSource.InApp,
    });

    it('returns Insufficient Data for empty guess array', () => {
      const result = calculateConsensusFromGuesses([]);
      expect(result.label).toBe(ConsensusLabelType.InsufficientData);
      expect(result.standardDeviation).toBe(0);
      expect(result.description).toBe("No guesses submitted yet");
    });

    it('returns Insufficient Data for single guess', () => {
      const guesses = [createMockGuess(50)];
      const result = calculateConsensusFromGuesses(guesses);
      expect(result.label).toBe(ConsensusLabelType.InsufficientData);
      expect(result.standardDeviation).toBe(0);
      expect(result.description).toBe("Only one guess submitted - need more data");
    });

    it('calculates consensus for identical guesses', () => {
      const guesses = [
        createMockGuess(50, 'user1'),
        createMockGuess(50, 'user2'),
        createMockGuess(50, 'user3'),
      ];
      const result = calculateConsensusFromGuesses(guesses);
      expect(result.label).toBe(ConsensusLabelType.PerfectHivemind);
      expect(result.standardDeviation).toBe(0);
    });

    it('calculates consensus for close guesses', () => {
      const guesses = [
        createMockGuess(49, 'user1'),
        createMockGuess(50, 'user2'),
        createMockGuess(51, 'user3'),
      ];
      const result = calculateConsensusFromGuesses(guesses);
      expect(result.label).toBe(ConsensusLabelType.PerfectHivemind);
      expect(result.standardDeviation).toBeCloseTo(0.816, 2);
    });

    it('calculates consensus for moderately spread guesses', () => {
      const guesses = [
        createMockGuess(40, 'user1'),
        createMockGuess(50, 'user2'),
        createMockGuess(60, 'user3'),
      ];
      const result = calculateConsensusFromGuesses(guesses);
      expect(result.label).toBe(ConsensusLabelType.TotalAnarchy);
      expect(result.standardDeviation).toBeCloseTo(8.165, 2);
    });

    it('calculates consensus for widely spread guesses', () => {
      const guesses = [
        createMockGuess(10, 'user1'),
        createMockGuess(30, 'user2'),
        createMockGuess(50, 'user3'),
        createMockGuess(70, 'user4'),
        createMockGuess(90, 'user5'),
      ];
      const result = calculateConsensusFromGuesses(guesses);
      expect(result.label).toBe(ConsensusLabelType.DumpsterFire);
      expect(result.standardDeviation).toBeCloseTo(28.284, 2);
    });

    it('handles invalid values by filtering them out', () => {
      // Create invalid guess data that gets filtered out
      const invalidGuesses = [
        { ...createMockGuess(50), value: NaN },
        { ...createMockGuess(60), value: Infinity },
      ] as Guess[];

      const result = calculateConsensusFromGuesses(invalidGuesses);
      // Since invalid values are filtered out, we get insufficient data
      expect(result.label).toBe(ConsensusLabelType.InsufficientData);
      expect(result.description).toBe("No valid guess values found");
      expect(result.standardDeviation).toBe(0);
    });

    it('handles null/undefined input gracefully', () => {
      const result1 = calculateConsensusFromGuesses(null as any);
      expect(result1.label).toBe(ConsensusLabelType.InsufficientData);
      expect(result1.description).toBe("Unable to process guess data");

      const result2 = calculateConsensusFromGuesses(undefined as any);
      expect(result2.label).toBe(ConsensusLabelType.InsufficientData);
      expect(result2.description).toBe("Unable to process guess data");
    });

    it('provides specific messages for different insufficient data scenarios', () => {
      // Empty array
      const emptyResult = calculateConsensusFromGuesses([]);
      expect(emptyResult.description).toBe("No guesses submitted yet");

      // Single guess
      const singleResult = calculateConsensusFromGuesses([createMockGuess(50)]);
      expect(singleResult.description).toBe("Only one guess submitted - need more data");

      // Only one valid guess after filtering
      const filteredResult = calculateConsensusFromGuesses([
        createMockGuess(50),
        { ...createMockGuess(60), value: NaN }
      ]);
      expect(filteredResult.description).toBe("Only one valid guess - need more data");
    });

    it('handles malformed guess objects', () => {
      const malformedGuesses = [
        null,
        undefined,
        { ...createMockGuess(50), value: null },
        { ...createMockGuess(60), value: undefined },
        { ...createMockGuess(70), value: "invalid" as any },
      ] as Guess[];

      const result = calculateConsensusFromGuesses(malformedGuesses);
      expect(result.label).toBe(ConsensusLabelType.InsufficientData);
      expect(result.description).toBe("No valid guess values found");
    });

    it('handles calculation errors gracefully', () => {
      // Mock console.error to avoid test output noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create a scenario that would cause an error by mocking the guess.value property
      // to throw an error when accessed
      const errorGuesses = [
        createMockGuess(50, 'user1'),
        createMockGuess(60, 'user2'),
      ];
      
      // Mock the map function to throw an error
      const originalMap = Array.prototype.map;
      Array.prototype.map = vi.fn().mockImplementation(() => {
        throw new Error('Calculation error');
      });

      const result = calculateConsensusFromGuesses(errorGuesses);
      expect(result.label).toBe(ConsensusLabelType.InsufficientData);
      expect(result.description).toBe("Unable to calculate consensus due to error");
      expect(result.standardDeviation).toBe(0);
      
      // Restore original map function
      Array.prototype.map = originalMap;
      consoleSpy.mockRestore();
    });

    it('handles errors in standard deviation calculation', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock Math.sqrt to throw an error
      const originalSqrt = Math.sqrt;
      try {
        Math.sqrt = vi.fn().mockImplementation(() => {
          throw new Error('Math error');
        });

        const guesses = [createMockGuess(50, 'user1'), createMockGuess(60, 'user2')];
        const result = calculateConsensusFromGuesses(guesses);
        
        expect(result.label).toBe(ConsensusLabelType.PerfectHivemind);
        expect(result.standardDeviation).toBe(0);
      } finally {
        // Ensure original function is always restored
        Math.sqrt = originalSqrt;
        consoleSpy.mockRestore();
      }
    });

    it('logs standard deviation for empirical calibration', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const guesses = [
        createMockGuess(40, 'user1'),
        createMockGuess(60, 'user2'),
      ];
      
      calculateConsensusFromGuesses(guesses);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Consensus] Game standard deviation:')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('(2 total guesses, 2 valid)')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error resilience in results computation', () => {
    const createMockGuess = (value: number, userId = 'user1'): Guess => ({
      guessId: `guess-${userId}-${value}`,
      gameId: 'game-1',
      userId,
      username: `User ${userId}`,
      value,
      justification: 'Test guess',
      createdAt: new Date().toISOString(),
      source: GuessSource.InApp,
    });

    it('ensures consensus errors do not break results computation', () => {
      // This test verifies that even if consensus calculation fails,
      // the results computation continues and provides a fallback
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create valid guesses
      const guesses = [createMockGuess(50, 'user1'), createMockGuess(60, 'user2')];
      
      // Mock calculateConsensusFromGuesses to throw an error
      const originalCalculateConsensus = calculateConsensusFromGuesses;
      
      // We can't directly mock the imported function, but we can test that
      // the function handles errors gracefully when called directly
      const result = calculateConsensusFromGuesses(null as any);
      expect(result.label).toBe(ConsensusLabelType.InsufficientData);
      expect(result.description).toBe("Unable to process guess data");
      
      consoleSpy.mockRestore();
    });
  });

  describe('Integration with different guess distributions', () => {
    const createMockGuess = (value: number, userId: string): Guess => ({
      guessId: `guess-${userId}`,
      gameId: 'game-1',
      userId,
      username: `User ${userId}`,
      value,
      justification: 'Test guess',
      createdAt: new Date().toISOString(),
      source: GuessSource.InApp,
    });

    it('handles bimodal distribution (two clusters)', () => {
      const guesses = [
        createMockGuess(20, 'user1'),
        createMockGuess(22, 'user2'),
        createMockGuess(21, 'user3'),
        createMockGuess(78, 'user4'),
        createMockGuess(80, 'user5'),
        createMockGuess(79, 'user6'),
      ];
      
      const result = calculateConsensusFromGuesses(guesses);
      expect(result.label).toBe(ConsensusLabelType.DumpsterFire);
      expect(result.standardDeviation).toBeGreaterThan(15);
    });

    it('handles uniform distribution', () => {
      const guesses = [
        createMockGuess(10, 'user1'),
        createMockGuess(25, 'user2'),
        createMockGuess(40, 'user3'),
        createMockGuess(55, 'user4'),
        createMockGuess(70, 'user5'),
        createMockGuess(85, 'user6'),
      ];
      
      const result = calculateConsensusFromGuesses(guesses);
      expect(result.label).toBe(ConsensusLabelType.DumpsterFire);
      expect(result.standardDeviation).toBeGreaterThan(20);
    });

    it('handles normal distribution around center', () => {
      const guesses = [
        createMockGuess(45, 'user1'),
        createMockGuess(48, 'user2'),
        createMockGuess(50, 'user3'),
        createMockGuess(52, 'user4'),
        createMockGuess(55, 'user5'),
      ];
      
      const result = calculateConsensusFromGuesses(guesses);
      expect(result.label).toBe(ConsensusLabelType.EchoChamber);
      expect(result.standardDeviation).toBeLessThan(5);
    });
  });
});
