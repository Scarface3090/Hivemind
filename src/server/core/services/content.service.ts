import { settings } from '@devvit/web/server';

import { spectrumSchema } from '../../../shared/schemas.js';
import type { Spectrum } from '../../../shared/types/Spectrum.js';
import { SpectrumCategory, SpectrumDifficulty } from '../../../shared/enums.js';
import { timestampNow } from '../../../shared/utils/index.js';
import { saveSpectrumCache, getSpectrumCacheRecord, type SpectrumCacheRecord } from './game.repository.js';

const SHEETS_REQUIRED_KEYS = [
  'GOOGLE_SHEETS_API_KEY',
  'GOOGLE_SHEETS_SPREADSHEET_ID',
  'GOOGLE_SHEETS_RANGE',
] as const;

const TEMP_FALLBACK_SPECTRA: Spectrum[] = [
  spectrumSchema.parse({
    id: 'coffee-vs-tea',
    leftLabel: 'Coffee',
    rightLabel: 'Tea',
    difficulty: SpectrumDifficulty.Low,
    category: SpectrumCategory.General,
  }),
  spectrumSchema.parse({
    id: 'cats-vs-dogs',
    leftLabel: 'Cats',
    rightLabel: 'Dogs',
    difficulty: SpectrumDifficulty.Low,
    category: SpectrumCategory.General,
  }),
  spectrumSchema.parse({
    id: 'summer-vs-winter',
    leftLabel: 'Summer',
    rightLabel: 'Winter',
    difficulty: SpectrumDifficulty.Moderate,
    category: SpectrumCategory.General,
  }),
];

const DEFAULT_CACHE_TTL_MINUTES = 15;

const getEnv = async (key: string, options?: { required?: boolean }): Promise<string | undefined> => {
  const value = await settings.get(key);
  if (!value && options?.required) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value ?? undefined;
};

const isHeaderRow = (left: string, right: string): boolean => {
  const normalized = `${left}|${right}`.toLowerCase();
  return normalized.includes('left') && normalized.includes('right');
};

const toEnumValue = <T extends Record<string, string>>(enumObj: T, value: string | undefined): T[keyof T] | undefined => {
  if (!value) {
    return undefined;
  }

  const upper = value.toUpperCase();
  return (Object.values(enumObj) as string[]).find((enumValue) => enumValue === upper) as
    | T[keyof T]
    | undefined;
};

const parseSheetsRow = (row: unknown[]): Spectrum | null => {
  const [rawLeft, rawRight, rawDifficulty, rawCategory] = row.map((cell) => String(cell ?? '').trim());

  if (!rawLeft || !rawRight || isHeaderRow(rawLeft, rawRight)) {
    return null;
  }

  const spectrumCandidate = {
    id: `${rawLeft}-${rawRight}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    leftLabel: rawLeft,
    rightLabel: rawRight,
    difficulty: toEnumValue(SpectrumDifficulty, rawDifficulty),
    category: toEnumValue(SpectrumCategory, rawCategory),
  } satisfies Partial<Spectrum>;

  return spectrumSchema.parse(spectrumCandidate);
};

export const fetchSpectraFromSheets = async (): Promise<Spectrum[]> => {
  const apiKey = await getEnv('GOOGLE_SHEETS_API_KEY', { required: true });
  const spreadsheetId = await getEnv('GOOGLE_SHEETS_SPREADSHEET_ID', { required: true });
  const range = await getEnv('GOOGLE_SHEETS_RANGE', { required: true });

  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`);
  url.searchParams.set('key', apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch spectra: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const rows = Array.isArray(data.values) ? (data.values as unknown[][]) : [];

  return rows
    .map((row) => {
      try {
        return parseSheetsRow(row);
      } catch (error) {
        console.warn('Skipping malformed spectrum row', { row, error });
        return null;
      }
    })
    .filter((spectrum): spectrum is Spectrum => Boolean(spectrum));
};

const hasSheetsConfiguration = async (): Promise<boolean> => {
  const values = await Promise.all(SHEETS_REQUIRED_KEYS.map((key) => getEnv(key)));
  return values.every((value) => Boolean(value && value.trim().length > 0));
};

export const refreshSpectrumCache = async (): Promise<void> => {
  const fetchedAt = timestampNow();

  if (!(await hasSheetsConfiguration())) {
    console.warn(
      'Skipping Google Sheets cache refresh: required env vars missing. Using temporary fallback spectra cache. TODO: Restore sheets integration when credentials are available.'
    );
    await saveSpectrumCache({ spectra: TEMP_FALLBACK_SPECTRA, fetchedAt });
    return;
  }

  const spectra = await fetchSpectraFromSheets();
  await saveSpectrumCache({ spectra, fetchedAt });
};

export const getSpectrumCache = async (): Promise<SpectrumCacheRecord | null> => {
  return getSpectrumCacheRecord();
};

export const isCacheStale = async (): Promise<boolean> => {
  const cache = await getSpectrumCache();
  if (!cache || !cache.fetchedAt) {
    return true;
  }

  const ttlMinutes = Number((await getEnv('GOOGLE_SHEETS_CACHE_TTL_MINUTES')) ?? DEFAULT_CACHE_TTL_MINUTES);
  const expiresAt = new Date(new Date(cache.fetchedAt).getTime() + ttlMinutes * 60 * 1000);

  return Date.now() >= expiresAt.getTime();
};

export const ensureSpectrumCache = async (): Promise<Spectrum[]> => {
  if (await isCacheStale()) {
    await refreshSpectrumCache();
  }

  const cached = await getSpectrumCache();
  if (!cached || cached.spectra.length === 0) {
    throw new Error('Spectrum cache is empty after refresh');
  }

  return cached.spectra;
};

