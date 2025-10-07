import { ensureSpectrumCache } from './core/services/content.service.js';

export const bootstrapServer = async (): Promise<void> => {
  try {
    await ensureSpectrumCache();
  } catch (error) {
    console.error('Failed to ensure initial spectrum cache', error);
  }
};
