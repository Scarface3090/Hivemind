import { settings } from '@devvit/web/server';

import { spectrumSchema } from '../../../shared/schemas.js';
import type { Spectrum } from '../../../shared/types/Spectrum.js';
import { SpectrumDifficulty } from '../../../shared/enums.js';
import { timestampNow } from '../../../shared/utils/index.js';
import { 
  saveSpectrumCache, 
  getSpectrumCacheRecord, 
  getAvailableContextsFromCache,
  getSpectrumIdsForContext,
  getContextSummaryFromCache,
  isContextCachePopulated,
  type SpectrumCacheRecord 
} from './game.repository.js';

const SHEETS_REQUIRED_KEYS = [
  'GOOGLE_SHEETS_API_KEY',
  'GOOGLE_SHEETS_SPREADSHEET_ID',
  'GOOGLE_SHEETS_RANGE',
] as const;

// Comprehensive fallback spectra with multiple contexts and difficulties
// Ensures minimum of 3 spectra are always available as per requirements 4.1, 4.4, 4.5
const TEMP_FALLBACK_SPECTRA: Spectrum[] = [
  // Food context - Easy difficulty
  {
    id: 'coffee-vs-tea',
    leftLabel: 'Coffee',
    rightLabel: 'Tea',
    difficulty: SpectrumDifficulty.Easy,
    context: 'Food',
  },
  {
    id: 'sweet-vs-savory',
    leftLabel: 'Sweet',
    rightLabel: 'Savory',
    difficulty: SpectrumDifficulty.Easy,
    context: 'Food',
  },
  
  // Lifestyle context - Easy and Medium difficulty
  {
    id: 'cats-vs-dogs',
    leftLabel: 'Cats',
    rightLabel: 'Dogs',
    difficulty: SpectrumDifficulty.Easy,
    context: 'Lifestyle',
  },
  {
    id: 'summer-vs-winter',
    leftLabel: 'Summer',
    rightLabel: 'Winter',
    difficulty: SpectrumDifficulty.Medium,
    context: 'Lifestyle',
  },
  {
    id: 'morning-vs-night',
    leftLabel: 'Morning Person',
    rightLabel: 'Night Owl',
    difficulty: SpectrumDifficulty.Easy,
    context: 'Lifestyle',
  },
  
  // Entertainment context - Easy and Medium difficulty
  {
    id: 'books-vs-movies',
    leftLabel: 'Books',
    rightLabel: 'Movies',
    difficulty: SpectrumDifficulty.Easy,
    context: 'Entertainment',
  },
  {
    id: 'comedy-vs-drama',
    leftLabel: 'Comedy',
    rightLabel: 'Drama',
    difficulty: SpectrumDifficulty.Medium,
    context: 'Entertainment',
  },
  
  // Technology context - Easy and Hard difficulty
  {
    id: 'ios-vs-android',
    leftLabel: 'iOS',
    rightLabel: 'Android',
    difficulty: SpectrumDifficulty.Easy,
    context: 'Technology',
  },
  {
    id: 'privacy-vs-convenience',
    leftLabel: 'Privacy',
    rightLabel: 'Convenience',
    difficulty: SpectrumDifficulty.Hard,
    context: 'Technology',
  },
  
  // Gaming context - Easy and Medium difficulty
  {
    id: 'single-vs-multiplayer',
    leftLabel: 'Single Player',
    rightLabel: 'Multiplayer',
    difficulty: SpectrumDifficulty.Easy,
    context: 'Gaming',
  },
  {
    id: 'casual-vs-hardcore',
    leftLabel: 'Casual Gaming',
    rightLabel: 'Hardcore Gaming',
    difficulty: SpectrumDifficulty.Medium,
    context: 'Gaming',
  },
  
  // Social context - Medium and Hard difficulty
  {
    id: 'introvert-vs-extrovert',
    leftLabel: 'Introvert',
    rightLabel: 'Extrovert',
    difficulty: SpectrumDifficulty.Medium,
    context: 'Social',
  },
  {
    id: 'online-vs-offline',
    leftLabel: 'Online Social',
    rightLabel: 'Offline Social',
    difficulty: SpectrumDifficulty.Hard,
    context: 'Social',
  },
];

const DEFAULT_CACHE_TTL_MINUTES = 15;

const getEnv = async (key: string, options?: { required?: boolean }): Promise<string | undefined> => {
  const value = await settings.get(key);
  if (!value && options?.required) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return typeof value === 'string' ? value : undefined;
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

const parseCsvRow = (row: string[], headers: string[], rowIndex: number): Spectrum | null => {
  // Validate row structure
  if (row.length !== headers.length) {
    console.warn(`CSV row ${rowIndex + 2}: Column count mismatch. Expected ${headers.length}, got ${row.length}`);
    return null;
  }

  const rowData: Record<string, string> = {};
  headers.forEach((header, index) => {
    rowData[header] = row[index]?.trim() || '';
  });

  const { ID, Context, Left_Label, Right_Label, Difficulty } = rowData;

  // Validate required fields
  const missingFields: string[] = [];
  if (!ID) missingFields.push('ID');
  if (!Context) missingFields.push('Context');
  if (!Left_Label) missingFields.push('Left_Label');
  if (!Right_Label) missingFields.push('Right_Label');
  if (!Difficulty) missingFields.push('Difficulty');

  if (missingFields.length > 0) {
    console.warn(`CSV row ${rowIndex + 2}: Missing required fields: ${missingFields.join(', ')}`);
    return null;
  }

  // Validate label length (max 50 characters as per requirements)
  if (Left_Label && Left_Label.length > 50) {
    console.warn(`CSV row ${rowIndex + 2}: Left_Label exceeds 50 characters: "${Left_Label}"`);
    return null;
  }
  if (Right_Label && Right_Label.length > 50) {
    console.warn(`CSV row ${rowIndex + 2}: Right_Label exceeds 50 characters: "${Right_Label}"`);
    return null;
  }

  // Validate difficulty enum
  const difficulty = toEnumValue(SpectrumDifficulty, Difficulty);
  if (!difficulty) {
    console.warn(`CSV row ${rowIndex + 2}: Invalid difficulty value: "${Difficulty}". Must be one of: ${Object.values(SpectrumDifficulty).join(', ')}`);
    return null;
  }

  try {
    const spectrumCandidate: Spectrum = {
      id: ID!,
      leftLabel: Left_Label!,
      rightLabel: Right_Label!,
      difficulty,
      context: Context!,
    };

    // Validate using schema but return the object directly
    spectrumSchema.parse(spectrumCandidate);
    return spectrumCandidate;
  } catch (error) {
    console.warn(`CSV row ${rowIndex + 2}: Schema validation failed:`, error);
    return null;
  }
};

const parseSheetsRow = (row: unknown[]): Spectrum | null => {
  const [rawLeft, rawRight, rawDifficulty, rawContext] = row.map((cell) => String(cell ?? '').trim());

  if (!rawLeft || !rawRight || isHeaderRow(rawLeft, rawRight)) {
    return null;
  }

  const difficulty = toEnumValue(SpectrumDifficulty, rawDifficulty) || SpectrumDifficulty.Medium;

  const spectrumCandidate: Spectrum = {
    id: `${rawLeft}-${rawRight}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    leftLabel: rawLeft,
    rightLabel: rawRight,
    difficulty,
    context: rawContext || 'General',
  };

  // Validate using schema but return the object directly
  spectrumSchema.parse(spectrumCandidate);
  return spectrumCandidate;
};

// Validates that fallback spectra meet minimum requirements
const validateFallbackSpectra = (): void => {
  const minRequired = 3;
  
  if (TEMP_FALLBACK_SPECTRA.length < minRequired) {
    throw new Error(`Fallback spectra validation failed: Expected at least ${minRequired} spectra, got ${TEMP_FALLBACK_SPECTRA.length}`);
  }
  
  // Validate we have multiple contexts
  const contexts = new Set(TEMP_FALLBACK_SPECTRA.map(s => s.context));
  if (contexts.size < 2) {
    throw new Error(`Fallback spectra validation failed: Expected at least 2 contexts, got ${contexts.size}`);
  }
  
  // Validate we have multiple difficulties
  const difficulties = new Set(TEMP_FALLBACK_SPECTRA.map(s => s.difficulty));
  if (difficulties.size < 2) {
    throw new Error(`Fallback spectra validation failed: Expected at least 2 difficulty levels, got ${difficulties.size}`);
  }
  
  console.log(`✓ Fallback spectra validation passed: ${TEMP_FALLBACK_SPECTRA.length} spectra across ${contexts.size} contexts and ${difficulties.size} difficulty levels`);
};

// Gets validated fallback spectra, ensuring minimum requirements are met
export const getFallbackSpectra = (): Spectrum[] => {
  try {
    validateFallbackSpectra();
    return [...TEMP_FALLBACK_SPECTRA]; // Return a copy to prevent mutations
  } catch (error) {
    console.error('Fallback spectra validation failed:', error);
    // If even our fallback fails validation, return a minimal working set
    return [
      {
        id: 'emergency-fallback-1',
        leftLabel: 'Option A',
        rightLabel: 'Option B',
        difficulty: SpectrumDifficulty.Easy,
        context: 'General',
      },
      {
        id: 'emergency-fallback-2',
        leftLabel: 'Choice X',
        rightLabel: 'Choice Y',
        difficulty: SpectrumDifficulty.Medium,
        context: 'General',
      },
      {
        id: 'emergency-fallback-3',
        leftLabel: 'Left Side',
        rightLabel: 'Right Side',
        difficulty: SpectrumDifficulty.Easy,
        context: 'Basic',
      },
    ];
  }
};

// Embedded CSV data for Devvit serverless environment
// This ensures the data is always available without file system dependencies
const EMBEDDED_CSV_DATA = `ID,Context,Left_Label,Right_Label,Difficulty
1,Movies,Flop,Blockbuster,EASY
2,Movies,Overrated,Underrated,MEDIUM
3,Movies,Critics Hate,Critics Love,EASY
4,Movies,Guilty Pleasure,High Art,MEDIUM
5,Movies,Boring,Mind-Blowing,EASY
6,Movies,Too Short,Too Long,MEDIUM
7,Movies,Shallow,Deep,MEDIUM
8,Movies,Old School,Modern,EASY
9,Movies,Niche Appeal,Mass Appeal,MEDIUM
10,Movies,All Style,All Substance,MEDIUM
11,Food,Cursed Combination,Delicious Masterpiece,EASY
12,Food,Basic,Gourmet,EASY
13,Food,Overpriced,Steal,EASY
14,Food,Healthy,Indulgent,EASY
15,Food,Childhood Nostalgia,Adult Taste,MEDIUM
16,Food,Simple,Complex,EASY
17,Food,Trendy Fad,Timeless Classic,MEDIUM
18,Food,Gross,Divine,EASY
19,Food,Pretentious,Comfort Food,EASY
20,Food,Weird,Normal,EASY
21,Gaming,Easy Mode,Soulslike Difficulty,EASY
22,Gaming,Casual,Hardcore,EASY
23,Gaming,Overrated,Hidden Gem,MEDIUM
24,Gaming,Pay-to-Win,Skill-Based,EASY
25,Gaming,Dead Game,Living Legend,MEDIUM
26,Gaming,Broken Mess,Polished Gem,EASY
27,Gaming,Walking Simulator,Action Packed,EASY
28,Gaming,Nostalgia Bait,Objectively Great,MEDIUM
29,Gaming,Indie Charm,AAA Polish,EASY
30,Gaming,Niche,Mainstream,EASY
31,Technology,Overpriced,Worth Every Penny,EASY
32,Technology,Gimmick,Game Changer,MEDIUM
33,Technology,User-Friendly,Power User,EASY
34,Technology,Privacy Nightmare,Convenient,MEDIUM
35,Technology,Outdated,Cutting Edge,EASY
36,Technology,Overhyped,Underrated,MEDIUM
37,Technology,Simple,Complex,EASY
38,Technology,Niche Tool,Everyone Needs,EASY
39,Technology,Reliable,Experimental,EASY
40,Technology,Anti-Consumer,Pro-Consumer,MEDIUM
41,Social Media,Cringe,Iconic,EASY
42,Social Media,Dead Platform,Thriving,EASY
43,Social Media,For Kids,For Adults,EASY
44,Social Media,Toxic,Wholesome,EASY
45,Social Media,Time Waster,Actually Useful,EASY
46,Social Media,Attention Seeking,Genuine,MEDIUM
47,Social Media,Trend Follower,Trendsetter,MEDIUM
48,Social Media,Surface Level,Deep Connection,MEDIUM
49,Social Media,Algorithm Hell,User Control,MEDIUM
50,Social Media,Private,Public,EASY
51,Life Skills,Useless Talent,Essential Skill,EASY
52,Life Skills,Overrated,Undervalued,MEDIUM
53,Life Skills,Easy to Learn,Takes Forever,EASY
54,Life Skills,Practical,Impressive,MEDIUM
55,Life Skills,Basic Adult,Advanced Pro,EASY
56,Life Skills,Natural Gift,Learned Ability,MEDIUM
57,Life Skills,Old School,Modern Method,EASY
58,Life Skills,Solo Activity,Team Effort,EASY
59,Life Skills,Cheap to Start,Expensive Hobby,EASY
60,Life Skills,Daily Use,Special Occasion,EASY
61,Relationships,Red Flag,Green Flag,EASY
62,Relationships,Adorable Quirk,Deal Breaker,EASY
63,Relationships,Romantic,Practical,MEDIUM
64,Relationships,Too Clingy,Too Independent,EASY
65,Relationships,Cute,Annoying,EASY
66,Relationships,First Date,Marriage Material,MEDIUM
67,Relationships,Just Friends,Serious Romance,MEDIUM
68,Relationships,High Maintenance,Low Maintenance,EASY
69,Relationships,Relationship Goals,Unrealistic,MEDIUM
70,Relationships,Sweet,Cringe,EASY
71,Lifestyle,Productive,Lazy,EASY
72,Lifestyle,Minimalist,Maximalist,EASY
73,Lifestyle,Trendy,Classic,EASY
74,Lifestyle,Expensive Habit,Budget Friendly,EASY
75,Lifestyle,High Effort,Low Effort,EASY
76,Lifestyle,Morning Person,Night Owl,EASY
77,Lifestyle,Organized,Chaotic,EASY
78,Lifestyle,Introvert,Extrovert,EASY
79,Lifestyle,Healthy,Indulgent,EASY
80,Lifestyle,Practical,Aesthetic,EASY
81,Entertainment,Skip It,Binge Worthy,EASY
82,Entertainment,Overrated,Underrated,MEDIUM
83,Entertainment,Guilty Pleasure,High Quality,EASY
84,Entertainment,Mainstream,Niche,EASY
85,Entertainment,Classic,Modern,EASY
86,Entertainment,Mindless Fun,Thought Provoking,EASY
87,Entertainment,Solo Activity,Social Experience,EASY
88,Entertainment,Background Noise,Full Attention,EASY
89,Entertainment,Nostalgic,Fresh,EASY
90,Entertainment,For Everyone,Target Audience,MEDIUM
91,Internet Culture,Cringe,Based,EASY
92,Internet Culture,Normie,Chronically Online,EASY
93,Internet Culture,Dead Meme,Timeless,EASY
94,Internet Culture,Overused,Underrated,MEDIUM
95,Internet Culture,Wholesome,Toxic,EASY
96,Internet Culture,Try Hard,Effortless,EASY
97,Internet Culture,Mainstream,Underground,EASY
98,Internet Culture,Attention Seeking,Genuinely Funny,MEDIUM
99,Internet Culture,Forced,Organic,EASY
100,Internet Culture,Boomer Humor,Gen Z Humor,EASY
101,Movies,Pretentious,Accessible,HARD
102,Movies,Forgettable,Culturally Defining,HARD
103,Movies,Technically Flawed,Technical Masterpiece,HARD
104,Movies,Derivative,Groundbreaking,HARD
105,Movies,Emotionally Manipulative,Genuine Emotion,HARD
106,Food,Appropriation,Authentic,HARD
107,Food,Acquired Taste,Universally Loved,HARD
108,Food,Processed Garbage,Whole Food,HARD
109,Food,Regional Delicacy,Global Staple,HARD
110,Food,Molecular Gastronomy,Traditional Cooking,HARD
111,Gaming,Mechanical Perfection,Narrative Excellence,HARD
112,Gaming,Toxic Community,Wholesome Fanbase,HARD
113,Gaming,Asset Flip,Original IP,HARD
114,Gaming,Streamer Bait,Actually Fun,HARD
115,Gaming,Artistic Vision,Market Pandering,HARD
116,Technology,Vaporware,Delivered Product,HARD
117,Technology,Planned Obsolescence,Built to Last,HARD
118,Technology,Open Source,Walled Garden,HARD
119,Technology,Disruptive Innovation,Incremental Update,HARD
120,Technology,Techbro Solution,Actual Problem Solving,HARD
121,Social Media,Echo Chamber,Diverse Perspectives,HARD
122,Social Media,Astroturfed,Grassroots,HARD
123,Social Media,Rage Bait,Thoughtful Discourse,HARD
124,Social Media,Performative Activism,Real Impact,HARD
125,Social Media,Parasocial Nightmare,Healthy Boundaries,HARD
126,Life Skills,Privilege,Necessity,HARD
127,Life Skills,Soft Skill,Hard Skill,HARD
128,Life Skills,Book Smart,Street Smart,HARD
129,Life Skills,Performative,Substantive,HARD
130,Life Skills,Theory,Practice,HARD
131,Relationships,Love Language Mismatch,Perfect Compatibility,HARD
132,Relationships,Codependent,Interdependent,HARD
133,Relationships,Trauma Bonding,Genuine Connection,HARD
134,Relationships,Settling,Choosing,HARD
135,Relationships,Passion,Stability,HARD
136,Lifestyle,Consumption,Creation,HARD
137,Lifestyle,Performative Wellness,Actual Health,HARD
138,Lifestyle,Survivorship Bias,Legitimate Advice,HARD
139,Lifestyle,FOMO,JOMO,HARD
140,Lifestyle,Grindset,Work-Life Balance,HARD
141,Entertainment,Fanservice,Artist's Vision,HARD
142,Entertainment,Derivative,Homage,HARD
143,Entertainment,Problematic,Progressive,HARD
144,Entertainment,Lowest Common Denominator,Niche Excellence,HARD
145,Entertainment,Formulaic,Experimental,HARD
146,Internet Culture,Irony Poisoned,Sincere,HARD
147,Internet Culture,Chronically Online Take,Grass-Touching Opinion,HARD
148,Internet Culture,Context Collapse,Niche Reference,HARD
149,Internet Culture,Cancel Worthy,Forgivable,HARD
150,Internet Culture,Terminally Online,Normcore,HARD`;

export const loadSpectraFromAssets = async (): Promise<Spectrum[]> => {
  try {
    console.log('Loading spectra from embedded CSV data...');
    
    const csvContent = EMBEDDED_CSV_DATA.trim();
    const lines = csvContent.split('\n');
    
    if (lines.length < 2) {
      throw new Error('Embedded CSV data is empty or has no data rows');
    }

    const headers = lines[0]?.split(',').map(h => h.trim()) || [];
    console.log(`CSV headers found: ${headers.join(', ')}`);
    
    // Validate required headers
    const requiredHeaders = ['ID', 'Context', 'Left_Label', 'Right_Label', 'Difficulty'];
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
      throw new Error(`CSV data missing required headers: ${missingHeaders.join(', ')}`);
    }

    const dataRows = lines.slice(1);
    console.log(`Processing ${dataRows.length} data rows...`);

    let validCount = 0;
    let invalidCount = 0;
    const duplicateIds = new Set<string>();
    const seenIds = new Set<string>();

    const spectra = dataRows
      .map((line, index) => {
        try {
          const row = line.split(',').map(cell => cell.trim());
          const spectrum = parseCsvRow(row, headers, index);
          
          if (spectrum) {
            // Check for duplicate IDs
            if (seenIds.has(spectrum.id)) {
              console.warn(`CSV row ${index + 2}: Duplicate ID found: "${spectrum.id}"`);
              duplicateIds.add(spectrum.id);
              invalidCount++;
              return null;
            }
            seenIds.add(spectrum.id);
            validCount++;
            return spectrum;
          } else {
            invalidCount++;
            return null;
          }
        } catch (error) {
          console.warn(`CSV row ${index + 2}: Unexpected parsing error:`, { line, error });
          invalidCount++;
          return null;
        }
      })
      .filter((spectrum): spectrum is Spectrum => Boolean(spectrum));

    console.log(`CSV parsing complete: ${validCount} valid, ${invalidCount} invalid rows`);
    if (duplicateIds.size > 0) {
      console.warn(`Found ${duplicateIds.size} duplicate IDs: ${Array.from(duplicateIds).join(', ')}`);
    }

    if (spectra.length === 0) {
      throw new Error('No valid spectra found in embedded CSV data');
    }

    console.log(`Successfully loaded ${spectra.length} spectra from embedded CSV data`);
    return spectra;
  } catch (error) {
    console.error('Failed to load spectra from embedded CSV data:', error);
    console.log('Automatically falling back to hardcoded spectra');
    return getFallbackSpectra();
  }
};

export const fetchSpectraFromSheets = async (): Promise<Spectrum[]> => {
  const apiKey = await getEnv('GOOGLE_SHEETS_API_KEY', { required: true });
  const spreadsheetId = await getEnv('GOOGLE_SHEETS_SPREADSHEET_ID', { required: true });
  const range = await getEnv('GOOGLE_SHEETS_RANGE', { required: true });

  if (!apiKey || !spreadsheetId || !range) {
    throw new Error('Missing required Google Sheets configuration');
  }

  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`);
  url.searchParams.set('key', apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch spectra: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { values?: unknown[][] };
  const rows = Array.isArray(data.values) ? data.values : [];

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

  try {
    console.log('Refreshing spectrum cache...');
    
    // Primary: Load from embedded CSV data
    const spectra = await loadSpectraFromAssets();
    await saveSpectrumCache({ spectra, fetchedAt });
    console.log(`Spectrum cache refreshed with ${spectra.length} entries from embedded CSV data`);
  } catch (error) {
    console.error('Failed to refresh spectrum cache from embedded CSV data:', error);
    
    // Fallback: Try Google Sheets if configured
    try {
      if (await hasSheetsConfiguration()) {
        console.log('Attempting fallback to Google Sheets...');
        const spectra = await fetchSpectraFromSheets();
        await saveSpectrumCache({ spectra, fetchedAt });
        console.log(`Spectrum cache refreshed with ${spectra.length} entries from Google Sheets fallback`);
        return;
      }
    } catch (sheetsError) {
      console.error('Google Sheets fallback also failed:', sheetsError);
    }
    
    // Final fallback: Use validated hardcoded spectra
    console.log('Using validated hardcoded fallback spectra');
    try {
      const fallbackSpectra = getFallbackSpectra();
      await saveSpectrumCache({ spectra: fallbackSpectra, fetchedAt });
      console.log(`Spectrum cache initialized with ${fallbackSpectra.length} validated fallback entries`);
    } catch (saveError) {
      console.error('Failed to save fallback spectra to cache:', saveError);
      // This is the final fallback - if we can't even save to cache, 
      // the functions that call this will handle using getFallbackSpectra() directly
    }
  }
};

export const getSpectrumCache = async (): Promise<SpectrumCacheRecord | null> => {
  return getSpectrumCacheRecord();
};

export const isCacheStale = async (): Promise<boolean> => {
  try {
    const cache = await getSpectrumCache();
    if (!cache || !cache.fetchedAt) {
      return true;
    }

    const ttlMinutes = Number((await getEnv('GOOGLE_SHEETS_CACHE_TTL_MINUTES')) ?? DEFAULT_CACHE_TTL_MINUTES);
    const expiresAt = new Date(new Date(cache.fetchedAt).getTime() + ttlMinutes * 60 * 1000);

    return Date.now() >= expiresAt.getTime();
  } catch (error) {
    console.warn('Error checking cache staleness, assuming stale:', error);
    return true;
  }
};

export const ensureSpectrumCache = async (): Promise<Spectrum[]> => {
  try {
    if (await isCacheStale()) {
      await refreshSpectrumCache();
    }

    const cached = await getSpectrumCache();
    if (!cached || cached.spectra.length === 0) {
      console.warn('Spectrum cache is empty, initializing with fallback data');
      await refreshSpectrumCache();
      const retryCache = await getSpectrumCache();
      if (!retryCache || retryCache.spectra.length === 0) {
        console.error('Failed to initialize spectrum cache, using validated fallback spectra');
        return getFallbackSpectra();
      }
      return retryCache.spectra;
    }

    return cached.spectra;
  } catch (error) {
    console.error('Error ensuring spectrum cache, using validated fallback spectra:', error);
    return getFallbackSpectra();
  }
};

// New functions for dynamic content system

export const getAvailableContexts = async (): Promise<string[]> => {
  try {
    // Try to use Redis context index first for better performance
    try {
      if (await isContextCachePopulated()) {
        const contexts = await getAvailableContextsFromCache();
        console.log(`Found ${contexts.length} unique contexts from cache: ${contexts.join(', ')}`);
        return contexts;
      }
    } catch (cacheError) {
      console.warn('Failed to check context cache, falling back to spectrum cache:', cacheError);
    }
    
    // Fallback to loading from spectrum cache
    const spectra = await ensureSpectrumCache();
    const contexts = new Set(spectra.map(spectrum => spectrum.context));
    const sortedContexts = Array.from(contexts).sort();
    console.log(`Found ${sortedContexts.length} unique contexts from spectra: ${sortedContexts.join(', ')}`);
    return sortedContexts;
  } catch (error) {
    console.error('Failed to get available contexts, using fallback:', error);
    // Return contexts from validated fallback spectra
    const fallbackSpectra = getFallbackSpectra();
    const contexts = new Set(fallbackSpectra.map(spectrum => spectrum.context));
    return Array.from(contexts).sort();
  }
};

export const getFilteredSpectrum = async (context?: string, difficulty?: SpectrumDifficulty): Promise<Spectrum> => {
  try {
    const spectra = await ensureSpectrumCache();
    console.log(`Filtering spectra - Total available: ${spectra.length}`);
    
    // Try to use Redis indexes for better performance when filtering
    if (context && await isContextCachePopulated()) {
      const spectrumIds = await getSpectrumIdsForContext(context, difficulty);
      console.log(`Found ${spectrumIds.length} spectrum IDs from context index`);
      
      if (spectrumIds.length === 0) {
        const errorMsg = `No spectra found for filters - context: ${context}, difficulty: ${difficulty || 'any'}`;
        console.warn(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Get random spectrum ID from filtered results
      const randomIndex = Math.floor(Math.random() * spectrumIds.length);
      const selectedId = spectrumIds[randomIndex];
      
      if (!selectedId) {
        throw new Error('Failed to select spectrum ID from filtered results');
      }
      
      // Find the spectrum object by ID
      const selectedSpectrum = spectra.find(spectrum => spectrum.id === selectedId);
      if (!selectedSpectrum) {
        console.warn(`Spectrum with ID ${selectedId} not found in cache, falling back to array filtering`);
      } else {
        console.log(`Selected spectrum from index: ${selectedSpectrum.id} (${selectedSpectrum.context}, ${selectedSpectrum.difficulty})`);
        return selectedSpectrum;
      }
    }
    
    // Fallback to array filtering
    let filteredSpectra = spectra;
    
    if (context) {
      filteredSpectra = filteredSpectra.filter(spectrum => spectrum.context === context);
      console.log(`After context filter (${context}): ${filteredSpectra.length} spectra`);
    }
    
    if (difficulty) {
      filteredSpectra = filteredSpectra.filter(spectrum => spectrum.difficulty === difficulty);
      console.log(`After difficulty filter (${difficulty}): ${filteredSpectra.length} spectra`);
    }
    
    if (filteredSpectra.length === 0) {
      const errorMsg = `No spectra found for filters - context: ${context || 'any'}, difficulty: ${difficulty || 'any'}`;
      console.warn(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Return random spectrum from filtered results
    const randomIndex = Math.floor(Math.random() * filteredSpectra.length);
    const selectedSpectrum = filteredSpectra[randomIndex];
    
    if (!selectedSpectrum) {
      throw new Error('Failed to select spectrum from filtered results');
    }
    
    console.log(`Selected spectrum: ${selectedSpectrum.id} (${selectedSpectrum.context}, ${selectedSpectrum.difficulty})`);
    return selectedSpectrum;
  } catch (error) {
    console.error('Failed to get filtered spectrum:', error);
    throw error;
  }
};

/**
 * Private helper function to calculate context summaries from spectra array
 */
const calculateContextSummaries = (spectra: Spectrum[]): import('../../../shared/types/Spectrum.js').ContextSummary[] => {
  const contextMap = new Map<string, { total: number; difficulties: Record<SpectrumDifficulty, number> }>();
  
  // Initialize difficulty counts
  const initDifficulties = (): Record<SpectrumDifficulty, number> => ({
    [SpectrumDifficulty.Easy]: 0,
    [SpectrumDifficulty.Medium]: 0,
    [SpectrumDifficulty.Hard]: 0,
  });
  
  // Count spectra by context and difficulty
  spectra.forEach(spectrum => {
    if (!contextMap.has(spectrum.context)) {
      contextMap.set(spectrum.context, {
        total: 0,
        difficulties: initDifficulties(),
      });
    }
    
    const contextData = contextMap.get(spectrum.context)!;
    contextData.total++;
    contextData.difficulties[spectrum.difficulty]++;
  });
  
  // Convert to ContextSummary array
  return Array.from(contextMap.entries())
    .map(([context, data]) => ({
      context,
      totalCount: data.total,
      difficultyBreakdown: data.difficulties,
    }))
    .sort((a, b) => a.context.localeCompare(b.context));
};

export const getContextsWithCounts = async (): Promise<import('../../../shared/types/Spectrum.js').ContextSummary[]> => {
  try {
    console.log('Getting contexts with counts...');
    
    // Always calculate from spectra array for now to avoid Redis context issues
    // TODO: Re-enable context cache once Redis context issues are resolved
    const spectra = await ensureSpectrumCache();
    
    console.log(`Calculating context statistics for ${spectra.length} spectra`);
    
    const contextSummaries = calculateContextSummaries(spectra);
    
    console.log(`Generated context summaries for ${contextSummaries.length} contexts`);
    contextSummaries.forEach(summary => {
      console.log(`  ${summary.context}: ${summary.totalCount} total (Easy: ${summary.difficultyBreakdown.EASY}, Medium: ${summary.difficultyBreakdown.MEDIUM}, Hard: ${summary.difficultyBreakdown.HARD})`);
    });
    
    return contextSummaries;
  } catch (error) {
    console.error('Failed to get contexts with counts, using fallback:', error);
    // Calculate from validated fallback spectra
    const fallbackSpectra = getFallbackSpectra();
    return calculateContextSummaries(fallbackSpectra);
  }
};

