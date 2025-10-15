import {
  AccoladeType,
  ClueClarityRating,
  ConsensusLabelType,
} from '../../../shared/enums.js';
import {
  DEFAULT_PERSUASION_MULTIPLIER,
  DEFAULT_RESULTS_HISTOGRAM_BUCKET_SIZE,
  MAX_GUESS_VALUE,
  MIN_GUESS_VALUE,
} from '../../../shared/constants.js';
import type { GameMetadata, GameResults } from '../../../shared/types/Game.js';

import type { Guess } from '../../../shared/types/Guess.js';
import type {
  AccoladeSummary,
  ConsensusLabel,
  PlayerScoreSummary,
  ScoreHistogramBucket,
  ScoreSummary,
} from '../../../shared/types/ScoreSummary.js';
import {
  getGuessById,
  getGuessIdsForGame,
  getGuessUpvoteScore,
  saveGameResults,
  getStoredGameResults,
} from './game.repository.js';
import { getGameById } from './game.lifecycle.js';
import { timestampNow } from '../../../shared/utils/index.js';
import { redis } from '@devvit/web/server';
import { redisKeys } from '../redis/keys.js';

const clampScore = (value: number, min = 0, max = 100): number => Math.min(Math.max(value, min), max);

/**
 * Calculates the population standard deviation of an array of numbers.
 * Handles edge cases like empty arrays and single values.
 * 
 * @param values Array of numeric values
 * @returns Standard deviation (0 for edge cases)
 */
const calculateStandardDeviation = (values: number[]): number => {
  try {
    // Handle null/undefined input
    if (!values || !Array.isArray(values)) {
      console.warn('[Consensus] calculateStandardDeviation: Invalid input - not an array');
      return 0;
    }

    // Handle edge cases
    if (values.length === 0) return 0;
    if (values.length === 1) return 0;
    
    // Filter out invalid values (NaN, Infinity, null, undefined)
    const validValues = values.filter(val => 
      val !== null && 
      val !== undefined && 
      typeof val === 'number' && 
      Number.isFinite(val)
    );
    
    if (validValues.length === 0) return 0;
    if (validValues.length === 1) return 0;
    
    // Calculate mean
    const sum = validValues.reduce((acc, val) => acc + val, 0);
    const mean = sum / validValues.length;
    
    // Handle edge case where mean is not finite
    if (!Number.isFinite(mean)) {
      console.warn('[Consensus] calculateStandardDeviation: Mean calculation resulted in non-finite value');
      return 0;
    }
    
    // Calculate squared differences from mean
    const squaredDifferences = validValues.map(val => {
      const diff = val - mean;
      return diff * diff; // Use multiplication instead of Math.pow for better performance
    });
    
    // Calculate variance (population variance, not sample)
    const varianceSum = squaredDifferences.reduce((acc, val) => acc + val, 0);
    const variance = varianceSum / validValues.length;
    
    // Handle edge case where variance is not finite
    if (!Number.isFinite(variance) || variance < 0) {
      console.warn('[Consensus] calculateStandardDeviation: Variance calculation resulted in invalid value:', variance);
      return 0;
    }
    
    // Return standard deviation
    const result = Math.sqrt(variance);
    
    // Handle case where result is NaN or Infinity
    if (!Number.isFinite(result)) {
      console.warn('[Consensus] calculateStandardDeviation: Square root resulted in non-finite value:', result);
      return 0;
    }
    
    return result;
    
  } catch (error) {
    console.error('[Consensus] calculateStandardDeviation: Unexpected error:', error);
    return 0;
  }
};

/**
 * Default consensus label thresholds.
 * These are initial placeholder values that will be calibrated based on empirical data.
 */
const DEFAULT_CONSENSUS_THRESHOLDS = {
  perfectHivemind: 2,    // 0-2: Perfect Hivemind
  echoChamber: 5,        // 2-5: Echo Chamber  
  battleRoyale: 8,       // 5-8: Battle Royale
  totalAnarchy: 12,      // 8-12: Total Anarchy
  dumpsterFire: 15,      // 12+: Dumpster Fire
};

/**
 * Current consensus thresholds (may be updated via calibration)
 */
let CONSENSUS_THRESHOLDS = { ...DEFAULT_CONSENSUS_THRESHOLDS };

/**
 * Logs standard deviation values to Redis for empirical calibration analysis.
 * Uses a sorted set with standard deviation as score for efficient percentile queries.
 * 
 * @param gameId The game ID for tracking
 * @param standardDeviation The calculated standard deviation value
 * @param guessCount Number of guesses used in calculation
 */
const logStandardDeviation = async (
  gameId: string, 
  standardDeviation: number, 
  guessCount: number
): Promise<void> => {
  try {
    // Only log valid standard deviation values
    if (!Number.isFinite(standardDeviation) || standardDeviation < 0) {
      console.warn('[Consensus] Skipping invalid standard deviation log:', standardDeviation);
      return;
    }

    // Only log if we have sufficient data (at least 2 guesses)
    if (guessCount < 2) {
      console.debug('[Consensus] Skipping std dev log for insufficient data:', guessCount);
      return;
    }

    const timestamp = timestampNow();
    const member = `${gameId}:${timestamp}:${guessCount}`;
    
    // Store in sorted set with std dev as score for efficient percentile queries
    await redis.zAdd(redisKeys.consensusStdDevLog, { score: standardDeviation, member });
    
    console.log(`[Consensus] Logged std dev: ${standardDeviation.toFixed(3)} for game ${gameId} (${guessCount} guesses)`);
    
  } catch (error) {
    // Don't let logging errors break the consensus calculation
    console.error('[Consensus] Error logging standard deviation:', error);
  }
};

/**
 * Interface for calibration analysis results
 */
interface CalibrationAnalysis {
  totalSamples: number;
  percentileThresholds: {
    p20: number;  // 20th percentile - Perfect Hivemind threshold
    p40: number;  // 40th percentile - Echo Chamber threshold  
    p60: number;  // 60th percentile - Battle Royale threshold
    p80: number;  // 80th percentile - Total Anarchy threshold
    // Values above p80 are Dumpster Fire
  };
  dataRange: {
    min: number;
    max: number;
    median: number;
  };
  isValid: boolean;
  validationErrors: string[];
}

/**
 * Minimum number of samples required for reliable calibration
 */
const MIN_CALIBRATION_SAMPLES = 50;

/**
 * Analyzes collected standard deviation data to calculate percentile-based thresholds.
 * Uses Redis sorted set operations for efficient percentile calculations.
 * 
 * @returns CalibrationAnalysis with percentile thresholds or validation errors
 */
const analyzeCalibrationData = async (): Promise<CalibrationAnalysis> => {
  try {
    // Get total count of logged standard deviations
    const totalSamples = await redis.zCard(redisKeys.consensusStdDevLog);
    
    const analysis: CalibrationAnalysis = {
      totalSamples,
      percentileThresholds: {
        p20: 0,
        p40: 0,
        p60: 0,
        p80: 0,
      },
      dataRange: {
        min: 0,
        max: 0,
        median: 0,
      },
      isValid: false,
      validationErrors: [],
    };

    // Validate sufficient data
    if (totalSamples < MIN_CALIBRATION_SAMPLES) {
      analysis.validationErrors.push(
        `Insufficient data: ${totalSamples} samples (minimum ${MIN_CALIBRATION_SAMPLES} required)`
      );
      return analysis;
    }

    // Calculate percentile indices (0-based)
    const p20Index = Math.floor(totalSamples * 0.2);
    const p40Index = Math.floor(totalSamples * 0.4);
    const p60Index = Math.floor(totalSamples * 0.6);
    const p80Index = Math.floor(totalSamples * 0.8);
    const medianIndex = Math.floor(totalSamples * 0.5);

    // Get values at percentile positions using ZRANGE by rank
    // Redis sorted sets are ordered by score (std dev value)
    const [
      minResult,
      maxResult,
      p20Result,
      p40Result,
      medianResult,
      p60Result,
      p80Result,
    ] = await Promise.all([
      redis.zRange(redisKeys.consensusStdDevLog, 0, 0, { by: 'rank' }), // min
      redis.zRange(redisKeys.consensusStdDevLog, -1, -1, { by: 'rank' }), // max
      redis.zRange(redisKeys.consensusStdDevLog, p20Index, p20Index, { by: 'rank' }),
      redis.zRange(redisKeys.consensusStdDevLog, p40Index, p40Index, { by: 'rank' }),
      redis.zRange(redisKeys.consensusStdDevLog, medianIndex, medianIndex, { by: 'rank' }),
      redis.zRange(redisKeys.consensusStdDevLog, p60Index, p60Index, { by: 'rank' }),
      redis.zRange(redisKeys.consensusStdDevLog, p80Index, p80Index, { by: 'rank' }),
    ]);

    // Extract scores from Redis results (results are { member, score } objects)
    const extractScore = (result: Array<{ member: string; score: number }>): number => {
      if (result.length === 0) return 0;
      const score = result[0]?.score ?? 0;
      return Number.isFinite(score) ? score : 0;
    };

    analysis.dataRange.min = extractScore(minResult ?? []);
    analysis.dataRange.max = extractScore(maxResult ?? []);
    analysis.dataRange.median = extractScore(medianResult ?? []);
    
    analysis.percentileThresholds.p20 = extractScore(p20Result ?? []);
    analysis.percentileThresholds.p40 = extractScore(p40Result ?? []);
    analysis.percentileThresholds.p60 = extractScore(p60Result ?? []);
    analysis.percentileThresholds.p80 = extractScore(p80Result ?? []);

    // Validate thresholds are in ascending order
    const thresholds = [
      analysis.percentileThresholds.p20,
      analysis.percentileThresholds.p40,
      analysis.percentileThresholds.p60,
      analysis.percentileThresholds.p80,
    ];

    for (let i = 1; i < thresholds.length; i++) {
      const current = thresholds[i];
      const previous = thresholds[i - 1];
      if (current !== undefined && previous !== undefined && current <= previous) {
        analysis.validationErrors.push(
          `Invalid threshold order: p${20 + i * 20} (${current}) <= p${20 + (i - 1) * 20} (${previous})`
        );
      }
    }

    // Validate reasonable ranges
    if (analysis.dataRange.min < 0) {
      analysis.validationErrors.push(`Invalid minimum value: ${analysis.dataRange.min}`);
    }

    if (analysis.dataRange.max > 100) {
      analysis.validationErrors.push(`Suspicious maximum value: ${analysis.dataRange.max}`);
    }

    // Mark as valid if no errors
    analysis.isValid = analysis.validationErrors.length === 0;

    console.log(`[Consensus] Calibration analysis: ${totalSamples} samples, valid: ${analysis.isValid}`);
    console.log(`[Consensus] Thresholds: p20=${analysis.percentileThresholds.p20.toFixed(2)}, p40=${analysis.percentileThresholds.p40.toFixed(2)}, p60=${analysis.percentileThresholds.p60.toFixed(2)}, p80=${analysis.percentileThresholds.p80.toFixed(2)}`);

    return analysis;

  } catch (error) {
    console.error('[Consensus] Error analyzing calibration data:', error);
    return {
      totalSamples: 0,
      percentileThresholds: { p20: 0, p40: 0, p60: 0, p80: 0 },
      dataRange: { min: 0, max: 0, median: 0 },
      isValid: false,
      validationErrors: [`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
};

/**
 * Interface for threshold configuration
 */
interface ThresholdConfig {
  perfectHivemind: number;
  echoChamber: number;
  battleRoyale: number;
  totalAnarchy: number;
  dumpsterFire: number;
  lastUpdated: number;
  samplesUsed: number;
  version: number;
}

/**
 * Maximum allowed change per calibration to prevent extreme threshold shifts
 */
const MAX_THRESHOLD_CHANGE_FACTOR = 2.0;

/**
 * Loads current threshold configuration from Redis.
 * Falls back to default values if no configuration exists.
 * 
 * @returns Current threshold configuration
 */
const loadThresholdConfig = async (): Promise<ThresholdConfig> => {
  try {
    const stored = await redis.hGetAll(redisKeys.consensusThresholds);
    
    if (!stored || Object.keys(stored).length === 0) {
      // No stored config, return defaults
      return {
        ...DEFAULT_CONSENSUS_THRESHOLDS,
        lastUpdated: 0,
        samplesUsed: 0,
        version: 1,
      };
    }

    // Parse stored values
    const config: ThresholdConfig = {
      perfectHivemind: parseFloat(stored.perfectHivemind ?? '') || DEFAULT_CONSENSUS_THRESHOLDS.perfectHivemind,
      echoChamber: parseFloat(stored.echoChamber ?? '') || DEFAULT_CONSENSUS_THRESHOLDS.echoChamber,
      battleRoyale: parseFloat(stored.battleRoyale ?? '') || DEFAULT_CONSENSUS_THRESHOLDS.battleRoyale,
      totalAnarchy: parseFloat(stored.totalAnarchy ?? '') || DEFAULT_CONSENSUS_THRESHOLDS.totalAnarchy,
      dumpsterFire: parseFloat(stored.dumpsterFire ?? '') || DEFAULT_CONSENSUS_THRESHOLDS.dumpsterFire,
      lastUpdated: parseInt(stored.lastUpdated ?? '') || 0,
      samplesUsed: parseInt(stored.samplesUsed ?? '') || 0,
      version: parseInt(stored.version ?? '') || 1,
    };

    return config;

  } catch (error) {
    console.error('[Consensus] Error loading threshold config, using defaults:', error);
    return {
      ...DEFAULT_CONSENSUS_THRESHOLDS,
      lastUpdated: 0,
      samplesUsed: 0,
      version: 1,
    };
  }
};

/**
 * Saves threshold configuration to Redis.
 * 
 * @param config The threshold configuration to save
 */
const saveThresholdConfig = async (config: ThresholdConfig): Promise<void> => {
  try {
    const data = {
      perfectHivemind: config.perfectHivemind.toString(),
      echoChamber: config.echoChamber.toString(),
      battleRoyale: config.battleRoyale.toString(),
      totalAnarchy: config.totalAnarchy.toString(),
      dumpsterFire: config.dumpsterFire.toString(),
      lastUpdated: config.lastUpdated.toString(),
      samplesUsed: config.samplesUsed.toString(),
      version: config.version.toString(),
    };

    await redis.hSet(redisKeys.consensusThresholds, data);
    console.log(`[Consensus] Saved threshold config version ${config.version}`);

  } catch (error) {
    console.error('[Consensus] Error saving threshold config:', error);
    throw error;
  }
};

/**
 * Validates that new thresholds are reasonable compared to current ones.
 * Prevents extreme changes that could destabilize the labeling system.
 * 
 * @param current Current threshold configuration
 * @param proposed Proposed new thresholds from calibration
 * @returns Validation result with any errors
 */
const validateThresholdChanges = (
  current: ThresholdConfig,
  proposed: CalibrationAnalysis['percentileThresholds']
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check each threshold for extreme changes
  const thresholdChecks = [
    { name: 'perfectHivemind', current: current.perfectHivemind, proposed: proposed.p20 },
    { name: 'echoChamber', current: current.echoChamber, proposed: proposed.p40 },
    { name: 'battleRoyale', current: current.battleRoyale, proposed: proposed.p60 },
    { name: 'totalAnarchy', current: current.totalAnarchy, proposed: proposed.p80 },
  ];

  for (const check of thresholdChecks) {
    if (check.proposed <= 0) {
      errors.push(`${check.name}: proposed value ${check.proposed} is not positive`);
      continue;
    }

    const changeFactor = check.proposed / check.current;
    if (changeFactor > MAX_THRESHOLD_CHANGE_FACTOR || changeFactor < (1 / MAX_THRESHOLD_CHANGE_FACTOR)) {
      errors.push(
        `${check.name}: change factor ${changeFactor.toFixed(2)} exceeds limit ${MAX_THRESHOLD_CHANGE_FACTOR} ` +
        `(${check.current} -> ${check.proposed})`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Updates consensus label thresholds based on empirical calibration data.
 * Includes safeguards to prevent extreme changes and validates the update.
 * 
 * @param forceUpdate If true, bypasses some safety checks (use with caution)
 * @returns Update result with success status and any errors
 */
const updateConsensusThresholds = async (forceUpdate = false): Promise<{
  success: boolean;
  errors: string[];
  oldConfig?: ThresholdConfig;
  newConfig?: ThresholdConfig;
  analysis?: CalibrationAnalysis;
}> => {
  try {
    // Load current configuration
    const currentConfig = await loadThresholdConfig();
    
    // Analyze calibration data
    const analysis = await analyzeCalibrationData();
    
    if (!analysis.isValid) {
      return {
        success: false,
        errors: [`Calibration analysis failed: ${analysis.validationErrors.join(', ')}`],
        analysis,
      };
    }

    // Validate threshold changes unless forced
    if (!forceUpdate) {
      const validation = validateThresholdChanges(currentConfig, analysis.percentileThresholds);
      if (!validation.isValid) {
        return {
          success: false,
          errors: [`Threshold validation failed: ${validation.errors.join(', ')}`],
          oldConfig: currentConfig,
          analysis,
        };
      }
    }

    // Create new configuration
    const newConfig: ThresholdConfig = {
      perfectHivemind: analysis.percentileThresholds.p20,
      echoChamber: analysis.percentileThresholds.p40,
      battleRoyale: analysis.percentileThresholds.p60,
      totalAnarchy: analysis.percentileThresholds.p80,
      dumpsterFire: Math.max(analysis.percentileThresholds.p80, analysis.percentileThresholds.p80 + 1), // Anything above p80
      lastUpdated: Date.now(),
      samplesUsed: analysis.totalSamples,
      version: currentConfig.version + 1,
    };

    // Save new configuration
    await saveThresholdConfig(newConfig);

    // Update in-memory thresholds
    CONSENSUS_THRESHOLDS = {
      perfectHivemind: newConfig.perfectHivemind,
      echoChamber: newConfig.echoChamber,
      battleRoyale: newConfig.battleRoyale,
      totalAnarchy: newConfig.totalAnarchy,
      dumpsterFire: newConfig.dumpsterFire,
    };

    console.log(`[Consensus] Successfully updated thresholds from ${analysis.totalSamples} samples`);
    console.log(`[Consensus] New thresholds: ${JSON.stringify(CONSENSUS_THRESHOLDS)}`);

    return {
      success: true,
      errors: [],
      oldConfig: currentConfig,
      newConfig,
      analysis,
    };

  } catch (error) {
    console.error('[Consensus] Error updating thresholds:', error);
    return {
      success: false,
      errors: [`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
};

/**
 * Initializes consensus thresholds from stored configuration on service startup.
 * Should be called when the service starts to load any previously calibrated thresholds.
 */
const initializeConsensusThresholds = async (): Promise<void> => {
  try {
    const config = await loadThresholdConfig();
    
    // Update in-memory thresholds
    CONSENSUS_THRESHOLDS = {
      perfectHivemind: config.perfectHivemind,
      echoChamber: config.echoChamber,
      battleRoyale: config.battleRoyale,
      totalAnarchy: config.totalAnarchy,
      dumpsterFire: config.dumpsterFire,
    };

    console.log(`[Consensus] Initialized thresholds version ${config.version} (${config.samplesUsed} samples)`);
    
  } catch (error) {
    console.error('[Consensus] Error initializing thresholds, using defaults:', error);
    CONSENSUS_THRESHOLDS = { ...DEFAULT_CONSENSUS_THRESHOLDS };
  }
};

/**
 * Maps standard deviation to consensus label with descriptive text.
 * Uses initial placeholder thresholds that will be calibrated with real data.
 * 
 * @param standardDeviation The calculated standard deviation of guesses
 * @returns ConsensusLabel with type, std dev, and description
 */
const calculateConsensusLabel = (standardDeviation: number): ConsensusLabel => {
  if (standardDeviation <= CONSENSUS_THRESHOLDS.perfectHivemind) {
    return {
      label: ConsensusLabelType.PerfectHivemind,
      standardDeviation,
      description: "The collective mind speaks as one"
    };
  }
  
  if (standardDeviation <= CONSENSUS_THRESHOLDS.echoChamber) {
    return {
      label: ConsensusLabelType.EchoChamber,
      standardDeviation,
      description: "Most minds think alike"
    };
  }
  
  if (standardDeviation <= CONSENSUS_THRESHOLDS.battleRoyale) {
    return {
      label: ConsensusLabelType.BattleRoyale,
      standardDeviation,
      description: "The community is at war"
    };
  }
  
  if (standardDeviation <= CONSENSUS_THRESHOLDS.totalAnarchy) {
    return {
      label: ConsensusLabelType.TotalAnarchy,
      standardDeviation,
      description: "Chaos reigns supreme"
    };
  }
  
  // standardDeviation > CONSENSUS_THRESHOLDS.totalAnarchy
  return {
    label: ConsensusLabelType.DumpsterFire,
    standardDeviation,
    description: "Complete pandemonium"
  };
};

/**
 * Calculates consensus label from an array of guesses.
 * Handles edge cases and provides fallback for insufficient data.
 * 
 * @param guesses Array of guess objects
 * @returns ConsensusLabel with appropriate label and description
 */
const calculateConsensusFromGuesses = (guesses: Guess[]): ConsensusLabel => {
  try {
    // Handle null/undefined input
    if (!guesses || !Array.isArray(guesses)) {
      console.warn('[Consensus] Invalid guesses input - not an array');
      return {
        label: ConsensusLabelType.InsufficientData,
        standardDeviation: 0,
        description: "Unable to process guess data"
      };
    }

    // Handle insufficient data case - need at least 2 guesses
    if (guesses.length === 0) {
      return {
        label: ConsensusLabelType.InsufficientData,
        standardDeviation: 0,
        description: "No guesses submitted yet"
      };
    }
    
    if (guesses.length === 1) {
      return {
        label: ConsensusLabelType.InsufficientData,
        standardDeviation: 0,
        description: "Only one guess submitted - need more data"
      };
    }
    
    // Extract guess values and filter out invalid ones
    const guessValues = guesses
      .map(guess => {
        // Handle malformed guess objects
        if (!guess || typeof guess.value !== 'number') {
          console.warn('[Consensus] Skipping malformed guess:', guess);
          return NaN;
        }
        if (!Number.isFinite(guess.value)) {
          console.warn('[Consensus] Skipping non-finite guess value:', guess.value, 'from guess:', guess.guessId);
          return NaN;
        }
        return guess.value;
      })
      .filter(val => Number.isFinite(val));
    
    console.log(`[Consensus] Processing ${guesses.length} total guesses, ${guessValues.length} valid values`);
    if (guessValues.length > 0) {
      console.log(`[Consensus] Sample values: ${guessValues.slice(0, 10).join(', ')}`);
    }
    
    // Check if we have enough valid values after filtering
    if (guessValues.length === 0) {
      return {
        label: ConsensusLabelType.InsufficientData,
        standardDeviation: 0,
        description: "No valid guess values found"
      };
    }
    
    if (guessValues.length === 1) {
      return {
        label: ConsensusLabelType.InsufficientData,
        standardDeviation: 0,
        description: "Only one valid guess - need more data"
      };
    }
    
    // Calculate standard deviation
    const standardDeviation = calculateStandardDeviation(guessValues);
    
    // Handle edge case where standard deviation calculation fails
    if (!Number.isFinite(standardDeviation)) {
      console.warn('[Consensus] Standard deviation calculation returned invalid result:', standardDeviation);
      return {
        label: ConsensusLabelType.InsufficientData,
        standardDeviation: 0,
        description: "Unable to calculate consensus"
      };
    }
    
    // Log standard deviation for empirical calibration
    console.log(`[Consensus] Game standard deviation: ${standardDeviation.toFixed(2)} (${guesses.length} total guesses, ${guessValues.length} valid)`);
    
    // Log to Redis for empirical calibration (async, don't wait)
    logStandardDeviation(guesses[0]?.gameId || 'unknown', standardDeviation, guessValues.length)
      .catch(error => console.error('[Consensus] Failed to log std dev:', error));
    
    // Map to consensus label
    return calculateConsensusLabel(standardDeviation);
    
  } catch (error) {
    // Handle calculation errors gracefully
    console.error('[Consensus] Error calculating consensus:', error);
    return {
      label: ConsensusLabelType.InsufficientData,
      standardDeviation: 0,
      description: "Unable to calculate consensus due to error"
    };
  }
};

const computeGuessingScore = (target: number, guess: number): number => {
  const distance = Math.abs(target - guess);
  return clampScore(100 - distance, 0, 100);
};

const computePersuasionScore = (upvotes: number, multiplier = DEFAULT_PERSUASION_MULTIPLIER): number =>
  upvotes * multiplier;

const aggregateHistogram = (guesses: Guess[], bucketSize = DEFAULT_RESULTS_HISTOGRAM_BUCKET_SIZE): ScoreHistogramBucket[] => {
  const buckets: ScoreHistogramBucket[] = [];
  const totalBuckets = Math.ceil((MAX_GUESS_VALUE - MIN_GUESS_VALUE + 1) / bucketSize);

  for (let i = 0; i < totalBuckets; i++) {
    const rangeStart = MIN_GUESS_VALUE + i * bucketSize;
    const rangeEnd = Math.min(rangeStart + bucketSize - 1, MAX_GUESS_VALUE);
    const count = guesses.filter((guess) => guess.value >= rangeStart && guess.value <= rangeEnd).length;
    buckets.push({ rangeStart, rangeEnd, count });
  }
  return buckets;
};

const deriveClueClarity = (score: number): ClueClarityRating => {
  if (score >= 90) return ClueClarityRating.Excellent;
  if (score >= 70) return ClueClarityRating.Strong;
  if (score >= 50) return ClueClarityRating.Fair;
  return ClueClarityRating.NeedsWork;
};

const assignAccolades = (players: PlayerScoreSummary[]): AccoladeSummary => {
  if (players.length === 0) return {};

  const sortedByAccuracy = [...players].sort((a, b) => b.breakdown.guessingScore - a.breakdown.guessingScore);
  const sortedByPersuasion = [...players].sort((a, b) => b.breakdown.persuasionScore - a.breakdown.persuasionScore);
  const sortedByContrarian = [...players].sort((a, b) => b.breakdown.guessingScore - a.breakdown.guessingScore);

  const summary: AccoladeSummary = {};
  const accuracyLeader = sortedByAccuracy[0];
  const persuasionLeader = sortedByPersuasion[0];
  const contrarianLeader = sortedByContrarian[0];

  if (accuracyLeader) {
    summary.bestAccuracy = accuracyLeader.userId;
    accuracyLeader.accolades.push(AccoladeType.Psychic);
  }
  if (persuasionLeader && persuasionLeader.breakdown.persuasionScore > 0) {
    summary.topPersuasion = persuasionLeader.userId;
    persuasionLeader.accolades.push(AccoladeType.TopComment);
  }
  if (contrarianLeader) {
    summary.mostContrarian = contrarianLeader.userId;
    contrarianLeader.accolades.push(AccoladeType.UnpopularOpinion);
  }

  return summary;
};

const buildPlayerSummaries = async (
  game: GameMetadata,
  guesses: Guess[]
): Promise<PlayerScoreSummary[]> => {
  const summaries: PlayerScoreSummary[] = [];
  const sortedGuesses = [...guesses].sort((a, b) => a.value - b.value);

  let rank = 0;
  for (const guess of sortedGuesses) {
    const guessingScore = computeGuessingScore(game.secretTarget, guess.value);
    const upvotes = await getGuessUpvoteScore(guess);
    const persuasionScore = computePersuasionScore(upvotes);
    const totalScore = guessingScore + persuasionScore;
    const summary: PlayerScoreSummary = {
      userId: guess.userId,
      username: guess.username,
      guessValue: guess.value,
      guessRank: rank,
      breakdown: {
        guessingScore,
        persuasionScore,
        totalScore,
      },
      accolades: [],
    };

    summaries.push(summary);
    rank += 1;
  }

  return summaries;
};

const computeHostScore = (game: GameMetadata, finalMedian: number, participants: number): ScoreSummary['host'] => {
  const guessingScore = computeGuessingScore(game.secretTarget, finalMedian);
  return {
    hostUserId: game.hostUserId,
    hostUsername: game.hostUsername,
    breakdown: {
      guessingScore,
      persuasionScore: participants,
      totalScore: guessingScore + participants,
    },
    participantCount: participants,
    clueClarityRating: deriveClueClarity(guessingScore),
  };
};

const computeFinalMedian = (guesses: Guess[]): number => {
  if (guesses.length === 0) return 0;
  const sorted = [...guesses].sort((a, b) => a.value - b.value);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]?.value ?? 0;
  return Math.round(((sorted[mid - 1]?.value ?? 0) + (sorted[mid]?.value ?? 0)) / 2);
};

const finalizeScoreSummary = (
  game: GameMetadata,
  guesses: Guess[],
  playerSummaries: PlayerScoreSummary[]
): ScoreSummary => {
  const finalMedian = computeFinalMedian(guesses);
  const histogram = aggregateHistogram(guesses);
  const host = computeHostScore(game, finalMedian, guesses.length);
  const accolades = assignAccolades(playerSummaries);
  
  // Calculate consensus with additional error handling to prevent breaking results
  let consensus: ConsensusLabel;
  try {
    console.log(`[Scoring] About to calculate consensus with ${guesses.length} guesses`);
    console.log(`[Scoring] First 10 guess values for consensus: ${guesses.slice(0, 10).map(g => g.value).join(', ')}`);
    consensus = calculateConsensusFromGuesses(guesses);
    console.log(`[Scoring] Consensus calculation result: ${consensus.label} (${consensus.description}) - std dev: ${consensus.standardDeviation}`);
  } catch (error) {
    console.error('[Scoring] Critical error in consensus calculation, using fallback:', error);
    consensus = {
      label: ConsensusLabelType.InsufficientData,
      standardDeviation: 0,
      description: "Consensus calculation failed"
    };
  }

  return {
    host,
    players: playerSummaries,
    targetValue: game.secretTarget,
    finalMedian,
    histogram,
    accolades,
    consensus,
  };
};

export const computeGameResults = async (gameId: string): Promise<GameResults | null> => {
  const metadata = await getGameById(gameId);
  if (!metadata) return null;

  const guessIds = await getGuessIdsForGame(gameId);
  const guesses: Guess[] = [];
  for (const guessId of guessIds) {
    const raw = await getGuessById(guessId);
    if (!raw || Object.keys(raw).length === 0) continue;
    
    // Debug: Log raw data from Redis
    console.log(`[Scoring] Raw data for ${guessId}:`, JSON.stringify(raw));
    
    // Ensure required fields are present and valid
    if (!raw.userId || !raw.username || !raw.createdAt) {
      console.warn(`[Scoring] Skipping guess ${guessId} due to missing required fields`);
      continue;
    }
    
    const parsedValue = Number(raw.value ?? 0);
    if (!Number.isFinite(parsedValue)) {
      console.warn(`[Scoring] Invalid guess value for ${guessId}: raw.value="${raw.value}", parsed=${parsedValue}`);
    }
    console.log(`[Scoring] Guess ${guessId}: raw.value="${raw.value}" -> parsed=${parsedValue}`);
    
    const guess: Guess = {
      guessId,
      gameId,
      userId: raw.userId,
      username: raw.username,
      value: parsedValue,
      createdAt: raw.createdAt,
      source: raw.source as Guess['source'],
      ...(raw.justification && { justification: raw.justification }),
      ...(raw.redditCommentId && { redditCommentId: raw.redditCommentId }),
    };
    guesses.push(guess);
    console.log(`[Scoring] Added guess to array. Array now has ${guesses.length} items. Last item value: ${guess.value}`);
  }

  const playerSummaries = await buildPlayerSummaries(metadata, guesses);
  const scoreSummary = finalizeScoreSummary(metadata, guesses, playerSummaries);

  const results: GameResults = {
    ...metadata,
    guesses,
    scoreSummary,
    finalizedAt: timestampNow(),
  };

  await saveGameResults(results);
  return results;
};

export const getGameResults = async (gameId: string): Promise<GameResults | null> => {
  const cached = await getStoredGameResults(gameId);
  if (cached) {
    console.log(`[Results] Returning cached results for ${gameId}. Has consensus:`, !!cached.scoreSummary.consensus);
    return cached;
  }
  console.log(`[Results] No cached results for ${gameId}, computing fresh results`);
  return computeGameResults(gameId);
};

// Export consensus calculation functions for testing
export { 
  calculateStandardDeviation, 
  calculateConsensusLabel, 
  calculateConsensusFromGuesses,
  analyzeCalibrationData,
  updateConsensusThresholds,
  initializeConsensusThresholds
};

