import {
  AccoladeType,
  ClueClarityRating,
} from '../../../shared/enums.js';
import {
  DEFAULT_PERSUASION_MULTIPLIER,
  DEFAULT_RESULTS_HISTOGRAM_BUCKET_SIZE,
  MAX_GUESS_VALUE,
  MIN_GUESS_VALUE,
} from '../../../shared/constants.js';
import type { GameMetadata, GameResults } from '../../../shared/types/Game.js';
import type { GameResultsViewer } from '../../../shared/types/ScoreSummary.js';
import type { Guess } from '../../../shared/types/Guess.js';
import type {
  AccoladeSummary,
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

const clampScore = (value: number, min = 0, max = 100): number => Math.min(Math.max(value, min), max);

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

  return {
    host,
    players: playerSummaries,
    targetValue: game.secretTarget,
    finalMedian,
    histogram,
    accolades,
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
    const guess: Guess = {
      guessId,
      gameId,
      userId: raw.userId,
      username: raw.username,
      value: Number(raw.value ?? 0),
      justification: raw.justification || undefined,
      createdAt: raw.createdAt,
      source: raw.source as Guess['source'],
      redditCommentId: raw.redditCommentId || undefined,
    };
    guesses.push(guess);
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
  if (cached) return cached;
  return computeGameResults(gameId);
};

