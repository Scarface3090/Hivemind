import type { SpectrumDifficulty } from '../enums.js';

export interface Spectrum {
  id: string;
  leftLabel: string;
  rightLabel: string;
  difficulty: SpectrumDifficulty;
  context: string; // Dynamic context from CSV instead of fixed category enum
}

// Interface for context summary used in UI selection
export interface ContextSummary {
  context: string;
  totalCount: number;
  difficultyBreakdown: Record<SpectrumDifficulty, number>;
}
