import { loadSpectraFromAssets, refreshSpectrumCache, getSpectrumCache } from './core/services/content.service.js';

export const bootstrapServer = async (): Promise<void> => {
  console.log('=== Server Startup Initialization ===');
  
  try {
    // Step 1: Load CSV content from embedded data
    console.log('Loading content from embedded CSV data...');
    const spectraFromAssets = await loadSpectraFromAssets();
    
    if (spectraFromAssets.length === 0) {
      throw new Error('No valid spectra loaded from embedded CSV data');
    }
    
    console.log(`✓ Successfully loaded ${spectraFromAssets.length} spectra from embedded CSV data`);
    
    // Step 2: Refresh cache with loaded content
    console.log('Initializing spectrum cache...');
    await refreshSpectrumCache();
    
    // Step 3: Validate cache was populated successfully
    const cacheRecord = await getSpectrumCache();
    if (!cacheRecord || cacheRecord.spectra.length === 0) {
      throw new Error('Spectrum cache validation failed - cache is empty after initialization');
    }
    
    console.log(`✓ Spectrum cache initialized with ${cacheRecord.spectra.length} entries`);
    
    // Step 4: Log content statistics
    const contextCounts = new Map<string, number>();
    const difficultyCounts = new Map<string, number>();
    
    cacheRecord.spectra.forEach(spectrum => {
      // Count by context
      contextCounts.set(spectrum.context, (contextCounts.get(spectrum.context) || 0) + 1);
      
      // Count by difficulty
      difficultyCounts.set(spectrum.difficulty, (difficultyCounts.get(spectrum.difficulty) || 0) + 1);
    });
    
    console.log('Content Statistics:');
    console.log(`  Total Spectra: ${cacheRecord.spectra.length}`);
    console.log(`  Unique Contexts: ${contextCounts.size}`);
    
    // Log context breakdown
    const sortedContexts = Array.from(contextCounts.entries()).sort((a, b) => b[1] - a[1]);
    sortedContexts.forEach(([context, count]) => {
      console.log(`    ${context}: ${count} spectra`);
    });
    
    // Log difficulty breakdown
    console.log('  Difficulty Distribution:');
    const sortedDifficulties = Array.from(difficultyCounts.entries()).sort((a, b) => b[1] - a[1]);
    sortedDifficulties.forEach(([difficulty, count]) => {
      console.log(`    ${difficulty}: ${count} spectra`);
    });
    
    console.log(`✓ Server initialization completed successfully at ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    
    // Log fallback information
    console.log('Attempting to use fallback content...');
    
    try {
      // Ensure we have some content available even if initialization failed
      await refreshSpectrumCache(); // This will use fallback if CSV loading fails
      
      const fallbackCache = await getSpectrumCache();
      if (fallbackCache && fallbackCache.spectra.length > 0) {
        console.log(`⚠️  Server will continue with ${fallbackCache.spectra.length} fallback spectra`);
      } else {
        console.error('❌ Even fallback content initialization failed');
      }
    } catch (fallbackError) {
      console.error('❌ Fallback content initialization also failed:', fallbackError);
    }
    
    // Re-throw the error to let the caller decide how to handle it
    throw error;
  }
};
