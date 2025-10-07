import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDraft } from '../core/services/game.service.js';
import * as redis from '@devvit/web/server';
import * as content from '../core/services/content.service.js';
import { Spectrum } from '../../shared/types/Spectrum.js';
import { SpectrumDifficulty, SpectrumCategory } from '../../shared/enums.js';

vi.mock('@devvit/web/server', () => ({
  redis: {
    set: vi.fn(),
    expire: vi.fn(),
  },
}));

vi.mock('../core/services/content.service.js');

const mockedContent = vi.mocked(content);
const mockedRedis = vi.mocked(redis.redis);

describe('Game Service', () => {
  describe('createDraft', () => {
    beforeEach(() => {
      const mockSpectrum: Spectrum = {
        id: '1',
        leftLabel: 'Bad',
        rightLabel: 'Good',
        difficulty: SpectrumDifficulty.EASY,
        category: SpectrumCategory.MISC,
      };
      mockedContent.ensureSpectrumCache.mockResolvedValue([mockSpectrum]);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should create a draft and save it to Redis', async () => {
      const hostUserId = 'user-123';
      const draft = await createDraft(hostUserId);

      expect(draft).toBeDefined();
      expect(draft.spectrum).toBeDefined();
      expect(draft.secretTarget).toBeGreaterThanOrEqual(0);
      expect(draft.secretTarget).toBeLessThanOrEqual(100);
      expect(mockedRedis.set).toHaveBeenCalledTimes(1);
      expect(mockedRedis.expire).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if no spectra are available', async () => {
      mockedContent.ensureSpectrumCache.mockResolvedValue([]);
      await expect(createDraft('user-123')).rejects.toThrow(
        'No spectra available to create a draft.'
      );
    });
  });
});
