export enum GamePhase {
  Draft = 'DRAFT',
  Active = 'ACTIVE',
  Reveal = 'REVEAL',
  Archived = 'ARCHIVED',
}

export enum SpectrumDifficulty {
  Low = 'LOW',
  Moderate = 'MODERATE',
  Hard = 'HARD',
}

export enum SpectrumCategory {
  Movies = 'MOVIES',
  Gaming = 'GAMING',
  Science = 'SCIENCE',
  General = 'GENERAL',
}

export enum AccoladeType {
  Psychic = 'PSYCHIC',
  TopComment = 'TOP_COMMENT',
  UnpopularOpinion = 'UNPOPULAR_OPINION',
}

export enum GuessSource {
  RedditComment = 'REDDIT_COMMENT',
  InApp = 'IN_APP',
  Unknown = 'UNKNOWN',
}

export enum GuessLockState {
  Pending = 'PENDING',
  Locked = 'LOCKED',
  Invalid = 'INVALID',
}

export enum MedianFreshness {
  Stale = 'STALE',
  Fresh = 'FRESH',
}

export enum ClueClarityRating {
  Excellent = 'EXCELLENT',
  Strong = 'STRONG',
  Fair = 'FAIR',
  NeedsWork = 'NEEDS_WORK',
}

export enum ConsensusLabelType {
  PerfectHivemind = 'PERFECT_HIVEMIND',
  EchoChamber = 'ECHO_CHAMBER',
  BattleRoyale = 'BATTLE_ROYALE',
  TotalAnarchy = 'TOTAL_ANARCHY',
  DumpsterFire = 'DUMPSTER_FIRE',
  InsufficientData = 'INSUFFICIENT_DATA',
}

