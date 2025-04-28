/**
 * Cache manager for MedTranslate AI Edge Application
 *
 * This module provides functions for caching translations locally
 * on the edge device to improve performance and enable offline operation.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const CACHE_DIR = process.env.CACHE_DIR || '../../cache';
const CACHE_SIZE_LIMIT = parseInt(process.env.CACHE_SIZE_LIMIT || '1000');
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '86400000'); // 24 hours in milliseconds
const CACHE_FILE = path.join(__dirname, '../../cache/translation_cache.json');
const CACHE_STATS_FILE = path.join(__dirname, '../../cache/cache_stats.json');
const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false';

// Cache statistics
let cacheStats = {
  hits: 0,
  misses: 0,
  evictions: 0,
  lastReset: Date.now(),
  hitRate: 0,
  totalRequests: 0
};

// Initialize cache
let translationCache = {};
let cacheSize = 0;
let cacheInitialized = false;

/**
 * Initialize the cache
 *
 * @returns {Promise<Object>} - Initialization result
 */
async function initialize() {
  try {
    console.log('Initializing cache manager...');

    // Ensure cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    // Load cache from disk if available
    if (fs.existsSync(CACHE_FILE)) {
      const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      translationCache = cacheData.cache || {};
      cacheSize = Object.keys(translationCache).length;
      console.log(`Loaded ${cacheSize} cached translations from disk`);

      // Clean up expired cache entries
      cleanupExpiredEntries();
    } else {
      console.log('No cache file found, starting with empty cache');
      translationCache = {};
      cacheSize = 0;
    }

    // Load cache statistics if available
    if (fs.existsSync(CACHE_STATS_FILE)) {
      cacheStats = JSON.parse(fs.readFileSync(CACHE_STATS_FILE, 'utf8'));
      console.log(`Loaded cache statistics: ${cacheStats.hits} hits, ${cacheStats.misses} misses`);
    }

    // Set up periodic cache cleanup
    setInterval(cleanupExpiredEntries, CACHE_TTL / 2);

    // Set up periodic cache stats reset (weekly)
    const weeklyReset = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
    setInterval(resetCacheStats, weeklyReset);

    cacheInitialized = true;
    console.log('Cache manager initialized successfully');

    return { success: true };
  } catch (error) {
    console.error('Error initializing cache manager:', error);
    translationCache = {};
    cacheSize = 0;
    cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      lastReset: Date.now(),
      hitRate: 0,
      totalRequests: 0
    };

    return { success: false, error: error.message };
  }
}

/**
 * Gets a cached translation if available
 *
 * @param {string} text - The text to translate
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} context - The medical context
 * @returns {Object|null} - Cached translation or null if not found
 */
function getCachedTranslation(text, sourceLanguage, targetLanguage, context = 'general') {
  // Skip cache if disabled
  if (!CACHE_ENABLED) {
    cacheStats.misses++;
    cacheStats.totalRequests++;
    updateHitRate();
    return null;
  }

  // Ensure cache is initialized
  if (!cacheInitialized) {
    console.warn('Cache not initialized, initializing now');
    initialize();
  }

  const cacheKey = generateCacheKey(text, sourceLanguage, targetLanguage, context);
  const cachedItem = translationCache[cacheKey];

  // Update cache statistics
  cacheStats.totalRequests++;

  if (cachedItem) {
    // Check if entry has expired
    if (Date.now() - cachedItem.created > CACHE_TTL) {
      // Entry has expired
      delete translationCache[cacheKey];
      cacheSize = Object.keys(translationCache).length;
      cacheStats.misses++;
      updateHitRate();
      return null;
    }

    // Update access timestamp and hit count
    cachedItem.lastAccessed = Date.now();
    cachedItem.hits = (cachedItem.hits || 0) + 1;

    // Update cache statistics
    cacheStats.hits++;
    updateHitRate();

    return cachedItem;
  }

  // Cache miss
  cacheStats.misses++;
  updateHitRate();
  return null;
}

/**
 * Caches a translation result
 *
 * @param {string} text - The original text
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} context - The medical context
 * @param {Object} result - The translation result
 */
function cacheTranslation(text, sourceLanguage, targetLanguage, context = 'general', result) {
  // Skip cache if disabled
  if (!CACHE_ENABLED) {
    return;
  }

  // Ensure cache is initialized
  if (!cacheInitialized) {
    console.warn('Cache not initialized, initializing now');
    initialize();
  }

  const cacheKey = generateCacheKey(text, sourceLanguage, targetLanguage, context);

  // Check if we need to evict items from cache
  if (cacheSize >= CACHE_SIZE_LIMIT && !translationCache[cacheKey]) {
    evictCacheItems();
  }

  // Add or update cache entry
  translationCache[cacheKey] = {
    originalText: text,
    translatedText: result.translatedText,
    confidence: result.confidence,
    sourceLanguage,
    targetLanguage,
    context,
    created: Date.now(),
    lastAccessed: Date.now(),
    hits: 0,
    size: text.length + (result.translatedText ? result.translatedText.length : 0)
  };

  // Update cache size
  cacheSize = Object.keys(translationCache).length;

  // Periodically save cache to disk
  if (cacheSize % 10 === 0) {
    saveCacheToDisk();
    saveStatsToFile();
  }
}

/**
 * Clears the entire translation cache
 */
function clearCache() {
  translationCache = {};
  cacheSize = 0;
  saveCacheToDisk();

  // Reset cache statistics
  resetCacheStats();

  console.log('Translation cache cleared');
  return { success: true, message: 'Cache cleared successfully' };
}

/**
 * Evicts least recently used items from the cache
 */
function evictCacheItems() {
  // Get all cache entries with their keys
  const entries = Object.entries(translationCache).map(([key, value]) => ({
    key,
    lastAccessed: value.lastAccessed,
    hits: value.hits || 0,
    created: value.created,
    size: value.size || 0
  }));

  // Calculate a score for each entry based on recency, frequency, and size
  // Lower score = more likely to be evicted
  entries.forEach(entry => {
    const recency = (Date.now() - entry.lastAccessed) / CACHE_TTL; // 0-1 (newer = lower)
    const frequency = Math.min(1, entry.hits / 10); // 0-1 (more hits = higher)
    const age = (Date.now() - entry.created) / CACHE_TTL; // 0-1 (older = higher)

    // Score formula: recency is most important, then frequency, then age
    entry.score = (0.6 * (1 - recency)) + (0.3 * frequency) + (0.1 * (1 - age));
  });

  // Sort by score (lowest first)
  entries.sort((a, b) => a.score - b.score);

  // Remove the lowest scoring 10% of entries
  const removeCount = Math.max(1, Math.floor(cacheSize * 0.1));
  for (let i = 0; i < removeCount && i < entries.length; i++) {
    delete translationCache[entries[i].key];
  }

  // Update cache size
  cacheSize = Object.keys(translationCache).length;

  // Update cache statistics
  cacheStats.evictions += removeCount;

  console.log(`Evicted ${removeCount} items from cache`);
}

/**
 * Clean up expired cache entries
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  let expiredCount = 0;

  // Check each cache entry
  for (const [key, entry] of Object.entries(translationCache)) {
    if (now - entry.created > CACHE_TTL) {
      delete translationCache[key];
      expiredCount++;
    }
  }

  if (expiredCount > 0) {
    // Update cache size
    cacheSize = Object.keys(translationCache).length;
    console.log(`Cleaned up ${expiredCount} expired cache entries`);

    // Save cache to disk
    saveCacheToDisk();
  }
}

/**
 * Reset cache statistics
 */
function resetCacheStats() {
  cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    lastReset: Date.now(),
    hitRate: 0,
    totalRequests: 0
  };

  saveStatsToFile();
  console.log('Cache statistics reset');
}

/**
 * Update cache hit rate
 */
function updateHitRate() {
  if (cacheStats.totalRequests > 0) {
    cacheStats.hitRate = cacheStats.hits / cacheStats.totalRequests;
  }
}

/**
 * Save cache statistics to file
 */
function saveStatsToFile() {
  try {
    fs.writeFileSync(CACHE_STATS_FILE, JSON.stringify(cacheStats), 'utf8');
  } catch (error) {
    console.error('Error saving cache statistics to file:', error);
  }
}

/**
 * Saves the cache to disk
 */
function saveCacheToDisk() {
  try {
    const cacheData = {
      cache: translationCache,
      lastSaved: Date.now(),
      size: cacheSize
    };

    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData), 'utf8');
    console.log(`Saved ${cacheSize} cached translations to disk`);
  } catch (error) {
    console.error('Error saving cache to disk:', error);
  }
}

/**
 * Get cache statistics
 *
 * @returns {Object} - Cache statistics
 */
function getCacheStats() {
  return {
    enabled: CACHE_ENABLED,
    size: cacheSize,
    limit: CACHE_SIZE_LIMIT,
    ttl: CACHE_TTL,
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    evictions: cacheStats.evictions,
    hitRate: cacheStats.hitRate,
    totalRequests: cacheStats.totalRequests,
    lastReset: new Date(cacheStats.lastReset).toISOString()
  };
}

/**
 * Generates a cache key for a translation request
 *
 * @param {string} text - The text to translate
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} context - The medical context
 * @returns {string} - Cache key
 */
function generateCacheKey(text, sourceLanguage, targetLanguage, context) {
  // Use a hash of the text to avoid excessively long keys
  const textHash = crypto
    .createHash('md5')
    .update(text)
    .digest('hex');

  return `${sourceLanguage}:${targetLanguage}:${context}:${textHash}`;
}

// Export cache manager
const cacheManager = {
  initialize,
  getCachedTranslation,
  cacheTranslation,
  clearCache,
  saveCacheToDisk,
  getCacheStats
};

// Save cache to disk on process exit
process.on('exit', () => {
  saveCacheToDisk();
  saveStatsToFile();
});

module.exports = { cacheManager };
