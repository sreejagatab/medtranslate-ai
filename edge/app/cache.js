/**
 * Cache manager for MedTranslate AI Edge Application
 *
 * This module provides functions for caching translations and audio locally
 * on the edge device to improve performance and enable offline operation.
 * Supports multiple cache types and prioritizes frequently used items for offline use.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const CACHE_DIR = process.env.CACHE_DIR || '../../cache';
const CACHE_SIZE_LIMIT = parseInt(process.env.CACHE_SIZE_LIMIT || '1000');
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '86400000'); // 24 hours in milliseconds
const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false';
const OFFLINE_PRIORITY_THRESHOLD = parseInt(process.env.OFFLINE_PRIORITY_THRESHOLD || '5'); // Hits required for offline priority

// Cache files
const CACHE_FILES = {
  translation: path.join(__dirname, '../../cache/translation_cache.json'),
  audio: path.join(__dirname, '../../cache/audio_cache.json'),
  stats: path.join(__dirname, '../../cache/cache_stats.json')
};

// Cache statistics
let cacheStats = {
  hits: {
    translation: 0,
    audio: 0,
    total: 0
  },
  misses: {
    translation: 0,
    audio: 0,
    total: 0
  },
  evictions: {
    translation: 0,
    audio: 0,
    total: 0
  },
  lastReset: Date.now(),
  hitRate: {
    translation: 0,
    audio: 0,
    total: 0
  },
  totalRequests: {
    translation: 0,
    audio: 0,
    total: 0
  },
  offlinePriorityItems: {
    translation: 0,
    audio: 0,
    total: 0
  }
};

// Initialize caches
let caches = {
  translation: {},
  audio: {}
};

let cacheSizes = {
  translation: 0,
  audio: 0,
  total: 0
};

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

    // Initialize each cache type
    for (const cacheType of Object.keys(caches)) {
      const cacheFile = CACHE_FILES[cacheType];

      // Load cache from disk if available
      if (fs.existsSync(cacheFile)) {
        const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        caches[cacheType] = cacheData.cache || {};
        cacheSizes[cacheType] = Object.keys(caches[cacheType]).length;
        console.log(`Loaded ${cacheSizes[cacheType]} cached ${cacheType} items from disk`);
      } else {
        console.log(`No ${cacheType} cache file found, starting with empty cache`);
        caches[cacheType] = {};
        cacheSizes[cacheType] = 0;
      }
    }

    // Calculate total cache size
    cacheSizes.total = Object.values(cacheSizes).reduce((sum, size) => sum + size, 0) - cacheSizes.total;

    // Load cache statistics if available
    if (fs.existsSync(CACHE_FILES.stats)) {
      try {
        const loadedStats = JSON.parse(fs.readFileSync(CACHE_FILES.stats, 'utf8'));
        cacheStats = loadedStats;
        console.log(`Loaded cache statistics: ${cacheStats.hits.total} hits, ${cacheStats.misses.total} misses`);
      } catch (error) {
        console.error('Error parsing cache statistics, using defaults:', error);
      }
    }

    // Clean up expired cache entries
    await cleanupExpiredEntries();

    // Set up periodic cache cleanup (every 6 hours)
    const cleanupInterval = Math.floor(CACHE_TTL / 4);
    setInterval(() => cleanupExpiredEntries(), cleanupInterval);

    // Set up periodic cache stats reset (weekly)
    const weeklyReset = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
    setInterval(() => resetCacheStats(), weeklyReset);

    // Set up periodic cache save (every hour)
    const hourlySave = 60 * 60 * 1000; // 1 hour in milliseconds
    setInterval(() => saveCacheToDisk(), hourlySave);

    cacheInitialized = true;
    console.log('Cache manager initialized successfully');

    return { success: true };
  } catch (error) {
    console.error('Error initializing cache manager:', error);

    // Reset caches
    caches = {
      translation: {},
      audio: {}
    };

    cacheSizes = {
      translation: 0,
      audio: 0,
      total: 0
    };

    // Reset stats
    cacheStats = {
      hits: { translation: 0, audio: 0, total: 0 },
      misses: { translation: 0, audio: 0, total: 0 },
      evictions: { translation: 0, audio: 0, total: 0 },
      lastReset: Date.now(),
      hitRate: { translation: 0, audio: 0, total: 0 },
      totalRequests: { translation: 0, audio: 0, total: 0 },
      offlinePriorityItems: { translation: 0, audio: 0, total: 0 }
    };

    return { success: false, error: error.message };
  }
}

/**
 * Gets a cached item if available
 *
 * @param {string} cacheType - The cache type ('translation' or 'audio')
 * @param {string} key - The cache key
 * @param {number} ttl - Optional TTL override in seconds
 * @returns {Promise<Object|null>} - Cached item or null if not found
 */
async function get(cacheType, key, ttl = null) {
  // Skip cache if disabled
  if (!CACHE_ENABLED) {
    cacheStats.misses[cacheType]++;
    cacheStats.misses.total++;
    cacheStats.totalRequests[cacheType]++;
    cacheStats.totalRequests.total++;
    updateHitRate();
    return null;
  }

  // Ensure cache is initialized
  if (!cacheInitialized) {
    console.warn('Cache not initialized, initializing now');
    await initialize();
  }

  // Validate cache type
  if (!caches[cacheType]) {
    console.error(`Invalid cache type: ${cacheType}`);
    return null;
  }

  const cachedItem = caches[cacheType][key];

  // Update cache statistics
  cacheStats.totalRequests[cacheType]++;
  cacheStats.totalRequests.total++;

  if (cachedItem) {
    // Use provided TTL or default
    const effectiveTtl = ttl ? ttl * 1000 : CACHE_TTL;

    // Check if entry has expired
    if (Date.now() - cachedItem.created > effectiveTtl) {
      // Entry has expired
      delete caches[cacheType][key];
      cacheSizes[cacheType]--;
      cacheSizes.total--;

      cacheStats.misses[cacheType]++;
      cacheStats.misses.total++;
      updateHitRate();
      return null;
    }

    // Update access timestamp and hit count
    cachedItem.lastAccessed = Date.now();
    cachedItem.hits = (cachedItem.hits || 0) + 1;

    // Check if this item should be marked for offline priority
    if (cachedItem.hits >= OFFLINE_PRIORITY_THRESHOLD && !cachedItem.offlinePriority) {
      cachedItem.offlinePriority = true;
      cacheStats.offlinePriorityItems[cacheType]++;
      cacheStats.offlinePriorityItems.total++;
    }

    // Update cache statistics
    cacheStats.hits[cacheType]++;
    cacheStats.hits.total++;
    updateHitRate();

    return cachedItem;
  }

  // Cache miss
  cacheStats.misses[cacheType]++;
  cacheStats.misses.total++;
  updateHitRate();
  return null;
}

/**
 * Sets a cache item
 *
 * @param {string} cacheType - The cache type ('translation' or 'audio')
 * @param {string} key - The cache key
 * @param {Object} value - The value to cache
 * @param {number} ttl - Optional TTL override in seconds
 * @returns {Promise<boolean>} - Success indicator
 */
async function set(cacheType, key, value, ttl = null) {
  // Skip cache if disabled
  if (!CACHE_ENABLED) {
    return false;
  }

  // Ensure cache is initialized
  if (!cacheInitialized) {
    console.warn('Cache not initialized, initializing now');
    await initialize();
  }

  // Validate cache type
  if (!caches[cacheType]) {
    console.error(`Invalid cache type: ${cacheType}`);
    return false;
  }

  // Check if we need to evict items from cache
  if (cacheSizes[cacheType] >= CACHE_SIZE_LIMIT && !caches[cacheType][key]) {
    await evictCacheItems(cacheType);
  }

  // Calculate item size
  let itemSize = 0;
  if (typeof value === 'object') {
    itemSize = JSON.stringify(value).length;
  } else if (typeof value === 'string') {
    itemSize = value.length;
  }

  // Add or update cache entry
  caches[cacheType][key] = {
    ...value,
    created: Date.now(),
    lastAccessed: Date.now(),
    hits: 0,
    size: itemSize,
    ttl: ttl ? ttl * 1000 : CACHE_TTL,
    offlinePriority: false
  };

  // Update cache size
  cacheSizes[cacheType] = Object.keys(caches[cacheType]).length;
  cacheSizes.total = Object.values(cacheSizes).reduce((sum, size) => sum + size, 0) - cacheSizes.total;

  // Periodically save cache to disk
  if (cacheSizes[cacheType] % 10 === 0) {
    await saveCacheToDisk();
    await saveStatsToFile();
  }

  return true;
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
async function getCachedTranslation(text, sourceLanguage, targetLanguage, context = 'general') {
  const cacheKey = generateCacheKey(text, sourceLanguage, targetLanguage, context);
  return get('translation', cacheKey);
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
async function cacheTranslation(text, sourceLanguage, targetLanguage, context = 'general', result) {
  const cacheKey = generateCacheKey(text, sourceLanguage, targetLanguage, context);

  const cacheItem = {
    originalText: text,
    translatedText: result.translatedText,
    confidence: result.confidence,
    sourceLanguage,
    targetLanguage,
    context
  };

  return set('translation', cacheKey, cacheItem);
}

/**
 * Clears the cache
 *
 * @param {string} cacheType - Optional cache type to clear (if not provided, clears all caches)
 * @returns {Promise<Object>} - Result of the operation
 */
async function clear(cacheType = null) {
  if (cacheType && caches[cacheType]) {
    // Clear specific cache
    caches[cacheType] = {};
    cacheSizes[cacheType] = 0;
    cacheSizes.total = Object.values(cacheSizes).reduce((sum, size) => sum + size, 0) - cacheSizes.total;

    await saveCacheToDisk(cacheType);
    console.log(`${cacheType} cache cleared`);

    return { success: true, message: `${cacheType} cache cleared successfully` };
  } else if (!cacheType) {
    // Clear all caches
    for (const type of Object.keys(caches)) {
      caches[type] = {};
      cacheSizes[type] = 0;
    }

    cacheSizes.total = 0;
    await saveCacheToDisk();

    // Reset cache statistics
    await resetCacheStats();

    console.log('All caches cleared');
    return { success: true, message: 'All caches cleared successfully' };
  } else {
    return { success: false, message: `Invalid cache type: ${cacheType}` };
  }
}

/**
 * Evicts least recently used items from the cache
 *
 * @param {string} cacheType - The cache type to evict items from
 * @returns {Promise<number>} - Number of items evicted
 */
async function evictCacheItems(cacheType) {
  // Get all cache entries with their keys
  const entries = Object.entries(caches[cacheType]).map(([key, value]) => ({
    key,
    lastAccessed: value.lastAccessed,
    hits: value.hits || 0,
    created: value.created,
    size: value.size || 0,
    offlinePriority: value.offlinePriority || false
  }));

  // Separate offline priority items
  const priorityEntries = entries.filter(entry => entry.offlinePriority);
  const normalEntries = entries.filter(entry => !entry.offlinePriority);

  // Calculate a score for each entry based on recency, frequency, and size
  // Lower score = more likely to be evicted
  normalEntries.forEach(entry => {
    const recency = (Date.now() - entry.lastAccessed) / CACHE_TTL; // 0-1 (newer = lower)
    const frequency = Math.min(1, entry.hits / 10); // 0-1 (more hits = higher)
    const age = (Date.now() - entry.created) / CACHE_TTL; // 0-1 (older = higher)

    // Score formula: recency is most important, then frequency, then age
    entry.score = (0.6 * (1 - recency)) + (0.3 * frequency) + (0.1 * (1 - age));
  });

  // Sort by score (lowest first)
  normalEntries.sort((a, b) => a.score - b.score);

  // Calculate how many items to remove
  const totalEntries = entries.length;
  const removeCount = Math.max(1, Math.floor(totalEntries * 0.1));

  // Only evict from normal entries, preserve offline priority items
  const actualRemoveCount = Math.min(removeCount, normalEntries.length);

  // Remove the lowest scoring entries
  for (let i = 0; i < actualRemoveCount; i++) {
    delete caches[cacheType][normalEntries[i].key];
  }

  // Update cache size
  cacheSizes[cacheType] = Object.keys(caches[cacheType]).length;
  cacheSizes.total = Object.values(cacheSizes).reduce((sum, size) => sum + size, 0) - cacheSizes.total;

  // Update cache statistics
  cacheStats.evictions[cacheType] += actualRemoveCount;
  cacheStats.evictions.total += actualRemoveCount;

  console.log(`Evicted ${actualRemoveCount} items from ${cacheType} cache (preserved ${priorityEntries.length} priority items)`);

  return actualRemoveCount;
}

/**
 * Clean up expired cache entries
 *
 * @param {string} cacheType - Optional cache type to clean up (if not provided, cleans all caches)
 * @returns {Promise<Object>} - Result with count of expired items removed
 */
async function cleanupExpiredEntries(cacheType = null) {
  const now = Date.now();
  const results = {};
  let totalExpired = 0;

  // Determine which caches to clean up
  const cacheTypes = cacheType ? [cacheType] : Object.keys(caches);

  for (const type of cacheTypes) {
    let expiredCount = 0;

    // Check each cache entry
    for (const [key, entry] of Object.entries(caches[type])) {
      const ttl = entry.ttl || CACHE_TTL;

      if (now - entry.created > ttl) {
        // Skip offline priority items if they're still useful
        if (entry.offlinePriority && entry.hits > OFFLINE_PRIORITY_THRESHOLD * 2) {
          // Extend TTL for high-priority items
          entry.created = now - (ttl / 2);
          continue;
        }

        delete caches[type][key];
        expiredCount++;

        // Update offline priority count if needed
        if (entry.offlinePriority) {
          cacheStats.offlinePriorityItems[type]--;
          cacheStats.offlinePriorityItems.total--;
        }
      }
    }

    if (expiredCount > 0) {
      // Update cache size
      cacheSizes[type] = Object.keys(caches[type]).length;
      console.log(`Cleaned up ${expiredCount} expired entries from ${type} cache`);

      results[type] = expiredCount;
      totalExpired += expiredCount;
    }
  }

  // Update total cache size
  cacheSizes.total = Object.values(cacheSizes).reduce((sum, size) => sum + size, 0) - cacheSizes.total;

  if (totalExpired > 0) {
    // Save cache to disk
    await saveCacheToDisk();
  }

  return {
    success: true,
    expiredCount: totalExpired,
    details: results
  };
}

/**
 * Reset cache statistics
 *
 * @returns {Promise<void>}
 */
async function resetCacheStats() {
  cacheStats = {
    hits: {
      translation: 0,
      audio: 0,
      total: 0
    },
    misses: {
      translation: 0,
      audio: 0,
      total: 0
    },
    evictions: {
      translation: 0,
      audio: 0,
      total: 0
    },
    lastReset: Date.now(),
    hitRate: {
      translation: 0,
      audio: 0,
      total: 0
    },
    totalRequests: {
      translation: 0,
      audio: 0,
      total: 0
    },
    offlinePriorityItems: {
      translation: 0,
      audio: 0,
      total: 0
    }
  };

  await saveStatsToFile();
  console.log('Cache statistics reset');
}

/**
 * Update cache hit rate
 */
function updateHitRate() {
  // Update hit rates for each cache type
  for (const type of Object.keys(caches)) {
    if (cacheStats.totalRequests[type] > 0) {
      cacheStats.hitRate[type] = cacheStats.hits[type] / cacheStats.totalRequests[type];
    }
  }

  // Update total hit rate
  if (cacheStats.totalRequests.total > 0) {
    cacheStats.hitRate.total = cacheStats.hits.total / cacheStats.totalRequests.total;
  }
}

/**
 * Save cache statistics to file
 *
 * @returns {Promise<void>}
 */
async function saveStatsToFile() {
  try {
    fs.writeFileSync(CACHE_FILES.stats, JSON.stringify(cacheStats), 'utf8');
  } catch (error) {
    console.error('Error saving cache statistics to file:', error);
  }
}

/**
 * Saves the cache to disk
 *
 * @param {string} cacheType - Optional cache type to save (if not provided, saves all caches)
 * @returns {Promise<Object>} - Result of the operation
 */
async function saveCacheToDisk(cacheType = null) {
  try {
    const results = {};

    // Determine which caches to save
    const cacheTypes = cacheType ? [cacheType] : Object.keys(caches);

    for (const type of cacheTypes) {
      const cacheFile = CACHE_FILES[type];

      if (!cacheFile) {
        console.error(`No cache file defined for type: ${type}`);
        results[type] = { success: false, error: 'No cache file defined' };
        continue;
      }

      const cacheData = {
        cache: caches[type],
        lastSaved: Date.now(),
        size: cacheSizes[type]
      };

      fs.writeFileSync(cacheFile, JSON.stringify(cacheData), 'utf8');
      console.log(`Saved ${cacheSizes[type]} cached ${type} items to disk`);

      results[type] = { success: true, size: cacheSizes[type] };
    }

    // Also save stats
    await saveStatsToFile();

    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Error saving cache to disk:', error);
    return {
      success: false,
      error: error.message
    };
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
    sizes: {
      ...cacheSizes
    },
    limit: CACHE_SIZE_LIMIT,
    ttl: CACHE_TTL / 1000, // Convert to seconds for readability
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    evictions: cacheStats.evictions,
    hitRate: cacheStats.hitRate,
    totalRequests: cacheStats.totalRequests,
    offlinePriorityItems: cacheStats.offlinePriorityItems,
    offlinePriorityThreshold: OFFLINE_PRIORITY_THRESHOLD,
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
  get,
  set,
  getCachedTranslation,
  cacheTranslation,
  clear,
  saveCacheToDisk,
  getCacheStats,
  cleanupExpiredEntries
};

// Save cache to disk on process exit
process.on('exit', () => {
  saveCacheToDisk();
  saveStatsToFile();
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM received, saving cache to disk');
  saveCacheToDisk();
  saveStatsToFile();
});

module.exports = { cacheManager };
