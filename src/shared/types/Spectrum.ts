import type { SpectrumCategory, SpectrumDifficulty } from '../enums.js';

export interface Spectrum {
  id: string;
  leftLabel: string;
  rightLabel: string;
  difficulty?: SpectrumDifficulty;
  category?: SpectrumCategory;
}
