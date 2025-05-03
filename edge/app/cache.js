/**
 * Enhanced Cache Manager for MedTranslate AI Edge Application
 *
 * This module provides advanced functions for caching translations and audio locally
 * on the edge device to improve performance and enable robust offline operation.
 * Features:
 * - Multiple cache types with prioritization
 * - Version tracking for conflict resolution
 * - Compression for efficient storage
 * - Metadata for synchronization
 * - Criticality-based retention
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

// Configuration
const CACHE_DIR = process.env.CACHE_DIR || '../../cache';
const CACHE_SIZE_LIMIT = parseInt(process.env.CACHE_SIZE_LIMIT || '1000');
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '86400000'); // 24 hours in milliseconds
const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false';
const OFFLINE_PRIORITY_THRESHOLD = parseInt(process.env.OFFLINE_PRIORITY_THRESHOLD || '5'); // Hits required for offline priority
const COMPRESSION_ENABLED = process.env.COMPRESSION_ENABLED !== 'false'; // Enable compression by default
const COMPRESSION_THRESHOLD = parseInt(process.env.COMPRESSION_THRESHOLD || '1024'); // Compress items larger than 1KB
const COMPRESSION_LEVEL = parseInt(process.env.COMPRESSION_LEVEL || '6'); // zlib compression level (0-9)
const CRITICALITY_LEVELS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

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
  },
  // New statistics for enhanced features
  compression: {
    compressedItems: 0,
    originalSize: 0,
    compressedSize: 0,
    savingsPercent: 0
  },
  versioning: {
    conflicts: 0,
    resolved: 0,
    versions: {
      translation: 0,
      audio: 0,
      total: 0
    }
  },
  criticality: {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  },
  syncStatus: {
    pendingSync: 0,
    lastSyncTime: 0,
    syncErrors: 0
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
 * Gets a cached item if available with support for compression and versioning
 *
 * @param {string} cacheType - The cache type ('translation' or 'audio')
 * @param {string} key - The cache key
 * @param {Object} options - Additional options
 * @param {number} options.ttl - Optional TTL override in seconds
 * @param {string} options.version - Specific version to retrieve (default: latest)
 * @param {boolean} options.includeMetadata - Whether to include full metadata in the result
 * @param {boolean} options.includeVersionHistory - Whether to include version history
 * @returns {Promise<Object|null>} - Cached item or null if not found
 */
async function get(cacheType, key, options = {}) {
  // Extract options with defaults
  const ttl = options.ttl ? options.ttl * 1000 : null;
  const specificVersion = options.version || null;
  const includeMetadata = options.includeMetadata || false;
  const includeVersionHistory = options.includeVersionHistory || false;

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
    const effectiveTtl = ttl || cachedItem.ttl || CACHE_TTL;

    // Check if entry has expired
    if (Date.now() - cachedItem.created > effectiveTtl) {
      // Don't immediately delete high criticality items
      if (cachedItem.criticality >= CRITICALITY_LEVELS.HIGH) {
        // Extend TTL for critical items, but mark them as needing refresh
        cachedItem.needsRefresh = true;
        console.log(`Critical cache item ${key} has expired but is being retained`);
      } else {
        // Entry has expired
        delete caches[cacheType][key];
        cacheSizes[cacheType]--;
        cacheSizes.total--;

        cacheStats.misses[cacheType]++;
        cacheStats.misses.total++;
        updateHitRate();
        return null;
      }
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

    // Handle specific version request
    let resultData;
    let resultVersion = cachedItem.version;

    if (specificVersion && specificVersion !== cachedItem.version) {
      // Look for the requested version in version history
      const versionEntry = (cachedItem.versions || []).find(v => v.version === specificVersion);

      if (versionEntry) {
        // We found the version, but we only have metadata for it
        // Return what we have with a flag indicating it's limited data
        resultData = {
          ...versionEntry.metadata,
          isLimitedVersionData: true,
          requestedVersion: specificVersion
        };
        resultVersion = specificVersion;

        console.log(`Returning limited metadata for specific version ${specificVersion} of ${key}`);
      } else {
        // Requested version not found
        console.log(`Requested version ${specificVersion} of ${key} not found`);
        return null;
      }
    } else {
      // Use the current version's data
      resultData = cachedItem.data;

      // Decompress if needed
      if (cachedItem.isCompressed) {
        try {
          const compressedData = Buffer.from(cachedItem.data, 'base64');
          const decompressedData = zlib.inflateSync(compressedData).toString();
          resultData = JSON.parse(decompressedData);
        } catch (error) {
          console.error(`Error decompressing cache item ${key}:`, error);
          // Return the raw data if decompression fails
        }
      }
    }

    // Prepare the result
    let result;

    if (includeMetadata) {
      // Return full item with metadata
      result = {
        ...cachedItem,
        data: resultData,
        version: resultVersion
      };

      // Optionally exclude version history to reduce size
      if (!includeVersionHistory) {
        delete result.versions;
      }
    } else {
      // Return just the data with minimal metadata
      result = {
        ...resultData,
        _metadata: {
          version: resultVersion,
          lastModified: cachedItem.lastModified,
          criticality: cachedItem.criticality,
          needsRefresh: cachedItem.needsRefresh || false
        }
      };
    }

    return result;
  }

  // Cache miss
  cacheStats.misses[cacheType]++;
  cacheStats.misses.total++;
  updateHitRate();
  return null;
}

/**
 * Sets a cache item with enhanced versioning and compression
 *
 * @param {string} cacheType - The cache type ('translation' or 'audio')
 * @param {string} key - The cache key
 * @param {Object} value - The value to cache
 * @param {Object} options - Additional options
 * @param {number} options.ttl - Optional TTL override in seconds
 * @param {boolean} options.compress - Whether to compress the item (default: auto-detect based on size)
 * @param {number} options.criticality - Importance level (1-4, higher = more important)
 * @param {boolean} options.needsSync - Whether this item needs to be synced to cloud
 * @param {string} options.version - Version identifier (default: timestamp-based)
 * @returns {Promise<boolean>} - Success indicator
 */
async function set(cacheType, key, value, options = {}) {
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

  // Extract options with defaults
  const ttl = options.ttl ? options.ttl * 1000 : CACHE_TTL;
  const criticality = options.criticality || CRITICALITY_LEVELS.LOW;
  const needsSync = options.needsSync !== undefined ? options.needsSync : true;
  const version = options.version || `v-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

  // Prepare the value for storage
  let valueToStore = { ...value };
  let serializedValue = JSON.stringify(valueToStore);
  let originalSize = serializedValue.length;
  let compressedSize = originalSize;
  let isCompressed = false;

  // Determine if we should compress this item
  const shouldCompress = options.compress !== undefined
    ? options.compress
    : (COMPRESSION_ENABLED && originalSize > COMPRESSION_THRESHOLD);

  // Compress if needed
  if (shouldCompress) {
    try {
      const compressed = zlib.deflateSync(serializedValue, { level: COMPRESSION_LEVEL });
      compressedSize = compressed.length;

      // Only use compression if it actually saves space
      if (compressedSize < originalSize) {
        valueToStore = compressed.toString('base64');
        isCompressed = true;

        // Update compression stats
        cacheStats.compression.compressedItems++;
        cacheStats.compression.originalSize += originalSize;
        cacheStats.compression.compressedSize += compressedSize;
        cacheStats.compression.savingsPercent =
          (1 - (cacheStats.compression.compressedSize / cacheStats.compression.originalSize)) * 100;

        console.log(`Compressed cache item ${key} from ${originalSize} to ${compressedSize} bytes (${Math.round((1 - (compressedSize / originalSize)) * 100)}% saving)`);
      }
    } catch (error) {
      console.error(`Error compressing cache item ${key}:`, error);
      // Continue with uncompressed value
    }
  }

  // Check if this is an update to an existing item
  const existingItem = caches[cacheType][key];
  let previousVersions = [];

  if (existingItem) {
    // Keep version history
    previousVersions = existingItem.versions || [];

    // If the existing item has a version, add it to version history
    if (existingItem.version && existingItem.version !== version) {
      previousVersions.push({
        version: existingItem.version,
        timestamp: existingItem.lastModified || existingItem.created,
        // Store minimal metadata about the previous version
        metadata: {
          confidence: existingItem.confidence,
          size: existingItem.size
        }
      });

      // Limit version history to 5 most recent versions
      if (previousVersions.length > 5) {
        previousVersions = previousVersions.slice(-5);
      }

      // Update versioning stats
      cacheStats.versioning.versions[cacheType]++;
      cacheStats.versioning.versions.total++;
    }
  }

  // Update criticality stats
  if (criticality === CRITICALITY_LEVELS.LOW) cacheStats.criticality.low++;
  else if (criticality === CRITICALITY_LEVELS.MEDIUM) cacheStats.criticality.medium++;
  else if (criticality === CRITICALITY_LEVELS.HIGH) cacheStats.criticality.high++;
  else if (criticality === CRITICALITY_LEVELS.CRITICAL) cacheStats.criticality.critical++;

  // If this item needs to be synced, update sync stats
  if (needsSync) {
    cacheStats.syncStatus.pendingSync++;
  }

  // Add or update cache entry with enhanced metadata
  caches[cacheType][key] = {
    data: valueToStore,
    created: existingItem ? existingItem.created : Date.now(),
    lastModified: Date.now(),
    lastAccessed: Date.now(),
    hits: existingItem ? existingItem.hits || 0 : 0,
    size: isCompressed ? compressedSize : originalSize,
    originalSize: originalSize,
    ttl: ttl,
    offlinePriority: existingItem ? existingItem.offlinePriority || false : false,
    // Enhanced metadata
    isCompressed,
    version,
    versions: previousVersions,
    criticality,
    needsSync,
    syncedAt: needsSync ? null : Date.now()
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
 * Gets a cached translation if available with enhanced options
 *
 * @param {string} text - The text to translate
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} context - The medical context
 * @param {Object} options - Additional options
 * @param {string} options.version - Specific version to retrieve
 * @param {boolean} options.includeMetadata - Whether to include full metadata
 * @param {boolean} options.includeVersionHistory - Whether to include version history
 * @returns {Object|null} - Cached translation or null if not found
 */
async function getCachedTranslation(text, sourceLanguage, targetLanguage, context = 'general', options = {}) {
  const cacheKey = generateCacheKey(text, sourceLanguage, targetLanguage, context);
  return get('translation', cacheKey, options);
}

/**
 * Caches a translation result with enhanced metadata
 *
 * @param {string} text - The original text
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} context - The medical context
 * @param {Object} result - The translation result
 * @param {Object} options - Additional options
 * @param {boolean} options.compress - Whether to compress (default: auto)
 * @param {number} options.criticality - Importance level (1-4)
 * @param {boolean} options.needsSync - Whether this needs cloud sync
 * @param {string} options.version - Version identifier
 * @returns {Promise<boolean>} - Success indicator
 */
async function cacheTranslation(text, sourceLanguage, targetLanguage, context = 'general', result, options = {}) {
  const cacheKey = generateCacheKey(text, sourceLanguage, targetLanguage, context);

  // Determine criticality based on context and confidence
  let criticality = options.criticality || CRITICALITY_LEVELS.LOW;

  // Medical contexts are more important
  if (context === 'emergency' || context === 'critical_care') {
    criticality = CRITICALITY_LEVELS.CRITICAL;
  } else if (context === 'diagnosis' || context === 'medication') {
    criticality = CRITICALITY_LEVELS.HIGH;
  } else if (context !== 'general' && context !== 'conversation') {
    criticality = CRITICALITY_LEVELS.MEDIUM;
  }

  // High confidence translations are more valuable
  if (result.confidence === 'high' && criticality < CRITICALITY_LEVELS.HIGH) {
    criticality = Math.min(criticality + 1, CRITICALITY_LEVELS.HIGH);
  }

  const cacheItem = {
    originalText: text,
    translatedText: result.translatedText,
    confidence: result.confidence,
    sourceLanguage,
    targetLanguage,
    context,
    processingTime: result.processingTime,
    model: result.model || 'unknown',
    timestamp: Date.now()
  };

  return set('translation', cacheKey, cacheItem, {
    criticality,
    compress: options.compress,
    needsSync: options.needsSync !== undefined ? options.needsSync : true,
    version: options.version
  });
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
 * Evicts least valuable items from the cache with enhanced prioritization
 *
 * @param {string} cacheType - The cache type to evict items from
 * @param {Object} options - Eviction options
 * @param {number} options.targetCount - Target number of items to evict (default: 10% of cache)
 * @param {boolean} options.respectCriticality - Whether to respect criticality levels (default: true)
 * @param {boolean} options.emergencyMode - Whether to evict even high-priority items (default: false)
 * @returns {Promise<number>} - Number of items evicted
 */
async function evictCacheItems(cacheType, options = {}) {
  // Get all cache entries with their keys
  const entries = Object.entries(caches[cacheType]).map(([key, value]) => ({
    key,
    lastAccessed: value.lastAccessed,
    hits: value.hits || 0,
    created: value.created,
    size: value.size || 0,
    offlinePriority: value.offlinePriority || false,
    criticality: value.criticality || CRITICALITY_LEVELS.LOW,
    isCompressed: value.isCompressed || false,
    originalSize: value.originalSize || value.size || 0,
    needsSync: value.needsSync || false
  }));

  // Default options
  const respectCriticality = options.respectCriticality !== false;
  const emergencyMode = options.emergencyMode || false;

  // Separate items by priority
  const criticalEntries = respectCriticality ?
    entries.filter(entry => entry.criticality === CRITICALITY_LEVELS.CRITICAL) : [];

  const highPriorityEntries = respectCriticality ?
    entries.filter(entry =>
      entry.criticality === CRITICALITY_LEVELS.HIGH ||
      (entry.offlinePriority && entry.criticality >= CRITICALITY_LEVELS.MEDIUM)
    ) : [];

  const normalEntries = entries.filter(entry =>
    !criticalEntries.some(e => e.key === entry.key) &&
    !highPriorityEntries.some(e => e.key === entry.key)
  );

  console.log(`Cache eviction analysis: ${normalEntries.length} normal, ${highPriorityEntries.length} high priority, ${criticalEntries.length} critical items`);

  // Calculate a score for each entry based on multiple factors
  // Lower score = more likely to be evicted
  normalEntries.forEach(entry => {
    const recency = (Date.now() - entry.lastAccessed) / CACHE_TTL; // 0-1 (newer = lower)
    const frequency = Math.min(1, entry.hits / 10); // 0-1 (more hits = higher)
    const age = (Date.now() - entry.created) / CACHE_TTL; // 0-1 (older = higher)
    const criticality = (entry.criticality - 1) / 3; // 0-1 (more critical = higher)
    const needsSync = entry.needsSync ? 0.3 : 0; // Penalty for items that need sync

    // Size efficiency bonus for compressed items
    const sizeEfficiency = entry.isCompressed ?
      0.2 * (1 - (entry.size / entry.originalSize)) : 0;

    // Enhanced score formula with more factors
    entry.score = (0.4 * (1 - recency)) + // Recency is most important
                 (0.2 * frequency) +      // Frequency of use
                 (0.1 * (1 - age)) +      // Age of item
                 (0.2 * criticality) +    // Criticality level
                 sizeEfficiency -         // Compression efficiency bonus
                 needsSync;               // Sync penalty
  });

  // Sort by score (lowest first)
  normalEntries.sort((a, b) => a.score - b.score);

  // Calculate how many items to remove
  const totalEntries = entries.length;
  const defaultRemoveCount = Math.max(1, Math.floor(totalEntries * 0.1));
  const removeCount = options.targetCount || defaultRemoveCount;

  // Determine which collections to evict from based on mode
  let evictionCandidates = normalEntries;
  let preservedCategories = ['critical and high priority'];

  if (emergencyMode) {
    // In emergency mode, also consider high priority items but still preserve critical
    evictionCandidates = [...normalEntries, ...highPriorityEntries];
    preservedCategories = ['critical'];

    // Re-sort the combined list
    evictionCandidates.sort((a, b) => a.score - b.score);
  }

  // Only evict up to the available number of candidates
  const actualRemoveCount = Math.min(removeCount, evictionCandidates.length);

  // Remove the lowest scoring entries
  let removedSize = 0;
  for (let i = 0; i < actualRemoveCount; i++) {
    const entry = evictionCandidates[i];
    removedSize += entry.size;
    delete caches[cacheType][entry.key];

    // If this was a high priority item, log it
    if (entry.criticality >= CRITICALITY_LEVELS.MEDIUM || entry.offlinePriority) {
      console.log(`Emergency eviction of higher priority item: ${entry.key} (criticality: ${entry.criticality}, offline priority: ${entry.offlinePriority})`);
    }
  }

  // Update cache size
  cacheSizes[cacheType] = Object.keys(caches[cacheType]).length;
  cacheSizes.total = Object.values(cacheSizes).reduce((sum, size) => sum + size, 0) - cacheSizes.total;

  // Update cache statistics
  cacheStats.evictions[cacheType] += actualRemoveCount;
  cacheStats.evictions.total += actualRemoveCount;

  console.log(`Evicted ${actualRemoveCount} items (${removedSize} bytes) from ${cacheType} cache (preserved ${entries.length - evictionCandidates.length} ${preservedCategories.join(' and ')} items)`);

  return actualRemoveCount;
}

/**
 * Clean up expired cache entries with enhanced criticality awareness
 *
 * @param {string} cacheType - Optional cache type to clean up (if not provided, cleans all caches)
 * @param {Object} options - Cleanup options
 * @param {boolean} options.respectCriticality - Whether to respect criticality levels (default: true)
 * @param {boolean} options.forceCleanup - Force cleanup even for critical items (default: false)
 * @returns {Promise<Object>} - Result with count of expired items removed
 */
async function cleanupExpiredEntries(cacheType = null, options = {}) {
  const now = Date.now();
  const results = {};
  let totalExpired = 0;
  let totalExtended = 0;
  let totalMarkedForRefresh = 0;

  // Default options
  const respectCriticality = options.respectCriticality !== false;
  const forceCleanup = options.forceCleanup || false;

  // Determine which caches to clean up
  const cacheTypes = cacheType ? [cacheType] : Object.keys(caches);

  for (const type of cacheTypes) {
    let expiredCount = 0;
    let extendedCount = 0;
    let markedForRefreshCount = 0;

    // Check each cache entry
    for (const [key, entry] of Object.entries(caches[type])) {
      const ttl = entry.ttl || CACHE_TTL;

      if (now - entry.created > ttl) {
        // Handle based on priority and criticality
        const isCritical = entry.criticality === CRITICALITY_LEVELS.CRITICAL;
        const isHighPriority = entry.criticality === CRITICALITY_LEVELS.HIGH ||
                              (entry.offlinePriority && entry.hits > OFFLINE_PRIORITY_THRESHOLD * 2);

        if (respectCriticality && isCritical && !forceCleanup) {
          // Critical items: mark for refresh but keep indefinitely unless forced
          entry.needsRefresh = true;
          markedForRefreshCount++;
          continue;
        } else if (respectCriticality && isHighPriority && !forceCleanup) {
          // High priority items: extend TTL but mark for refresh
          entry.created = now - (ttl / 2);
          entry.needsRefresh = true;
          extendedCount++;
          continue;
        }

        // Remove expired item
        delete caches[type][key];
        expiredCount++;

        // Update statistics
        if (entry.offlinePriority) {
          cacheStats.offlinePriorityItems[type]--;
          cacheStats.offlinePriorityItems.total--;
        }

        // Update criticality stats
        if (entry.criticality === CRITICALITY_LEVELS.LOW) cacheStats.criticality.low--;
        else if (entry.criticality === CRITICALITY_LEVELS.MEDIUM) cacheStats.criticality.medium--;
        else if (entry.criticality === CRITICALITY_LEVELS.HIGH) cacheStats.criticality.high--;
        else if (entry.criticality === CRITICALITY_LEVELS.CRITICAL) cacheStats.criticality.critical--;
      }
    }

    // Update results
    if (expiredCount > 0 || extendedCount > 0 || markedForRefreshCount > 0) {
      // Update cache size
      cacheSizes[type] = Object.keys(caches[type]).length;

      console.log(`Cache cleanup for ${type}: ${expiredCount} expired, ${extendedCount} extended, ${markedForRefreshCount} marked for refresh`);

      results[type] = {
        expired: expiredCount,
        extended: extendedCount,
        markedForRefresh: markedForRefreshCount
      };

      totalExpired += expiredCount;
      totalExtended += extendedCount;
      totalMarkedForRefresh += markedForRefreshCount;
    }
  }

  // Update total cache size
  cacheSizes.total = Object.values(cacheSizes).reduce((sum, size) => sum + size, 0) - cacheSizes.total;

  if (totalExpired > 0 || totalExtended > 0 || totalMarkedForRefresh > 0) {
    // Save cache to disk
    await saveCacheToDisk();
  }

  return {
    success: true,
    expiredCount: totalExpired,
    extendedCount: totalExtended,
    markedForRefreshCount: totalMarkedForRefresh,
    details: results
  };
}

/**
 * Reset cache statistics
 *
 * @param {boolean} preserveMetrics - Whether to preserve certain metrics (default: false)
 * @returns {Promise<void>}
 */
async function resetCacheStats(preserveMetrics = false) {
  // Save some metrics if requested
  const oldCompression = preserveMetrics ? { ...cacheStats.compression } : null;
  const oldVersioning = preserveMetrics ? { ...cacheStats.versioning } : null;
  const oldCriticality = preserveMetrics ? { ...cacheStats.criticality } : null;
  const oldSyncStatus = preserveMetrics ? { ...cacheStats.syncStatus } : null;

  // Reset all stats
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
    },
    // New statistics for enhanced features
    compression: {
      compressedItems: 0,
      originalSize: 0,
      compressedSize: 0,
      savingsPercent: 0
    },
    versioning: {
      conflicts: 0,
      resolved: 0,
      versions: {
        translation: 0,
        audio: 0,
        total: 0
      }
    },
    criticality: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    },
    syncStatus: {
      pendingSync: 0,
      lastSyncTime: 0,
      syncErrors: 0
    }
  };

  // Restore preserved metrics if requested
  if (preserveMetrics) {
    if (oldCompression) {
      cacheStats.compression = oldCompression;
    }

    if (oldVersioning) {
      cacheStats.versioning = oldVersioning;
    }

    if (oldCriticality) {
      cacheStats.criticality = oldCriticality;
    }

    if (oldSyncStatus) {
      cacheStats.syncStatus = oldSyncStatus;
    }

    console.log('Cache statistics reset (preserved metrics)');
  } else {
    console.log('Cache statistics completely reset');
  }

  // Recalculate offline priority items
  for (const type of Object.keys(caches)) {
    let count = 0;
    for (const entry of Object.values(caches[type])) {
      if (entry.offlinePriority) {
        count++;
      }

      // Recalculate criticality counts
      if (entry.criticality === CRITICALITY_LEVELS.LOW) cacheStats.criticality.low++;
      else if (entry.criticality === CRITICALITY_LEVELS.MEDIUM) cacheStats.criticality.medium++;
      else if (entry.criticality === CRITICALITY_LEVELS.HIGH) cacheStats.criticality.high++;
      else if (entry.criticality === CRITICALITY_LEVELS.CRITICAL) cacheStats.criticality.critical++;

      // Recalculate compression stats
      if (entry.isCompressed) {
        cacheStats.compression.compressedItems++;
        cacheStats.compression.originalSize += entry.originalSize || 0;
        cacheStats.compression.compressedSize += entry.size || 0;
      }

      // Recalculate sync stats
      if (entry.needsSync) {
        cacheStats.syncStatus.pendingSync++;
      }
    }

    cacheStats.offlinePriorityItems[type] = count;
  }

  // Update totals
  cacheStats.offlinePriorityItems.total = Object.values(cacheStats.offlinePriorityItems)
    .reduce((sum, count) => sum + count, 0) - cacheStats.offlinePriorityItems.total;

  // Update compression savings percent
  if (cacheStats.compression.originalSize > 0) {
    cacheStats.compression.savingsPercent =
      (1 - (cacheStats.compression.compressedSize / cacheStats.compression.originalSize)) * 100;
  }

  await saveStatsToFile();
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
 * Get enhanced cache statistics
 *
 * @param {boolean} detailed - Whether to include detailed statistics
 * @returns {Object} - Cache statistics
 */
function getCacheStats(detailed = false) {
  const baseStats = {
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

  // Enhanced statistics
  const enhancedStats = {
    compression: {
      enabled: COMPRESSION_ENABLED,
      threshold: COMPRESSION_THRESHOLD,
      level: COMPRESSION_LEVEL,
      compressedItems: cacheStats.compression.compressedItems,
      savingsPercent: Math.round(cacheStats.compression.savingsPercent * 100) / 100,
      totalSavingsBytes: cacheStats.compression.originalSize - cacheStats.compression.compressedSize
    },
    versioning: {
      conflicts: cacheStats.versioning.conflicts,
      resolved: cacheStats.versioning.resolved,
      versions: cacheStats.versioning.versions
    },
    criticality: {
      low: cacheStats.criticality.low,
      medium: cacheStats.criticality.medium,
      high: cacheStats.criticality.high,
      critical: cacheStats.criticality.critical,
      total: cacheStats.criticality.low + cacheStats.criticality.medium +
             cacheStats.criticality.high + cacheStats.criticality.critical
    },
    syncStatus: {
      pendingSync: cacheStats.syncStatus.pendingSync,
      lastSyncTime: cacheStats.syncStatus.lastSyncTime ?
                    new Date(cacheStats.syncStatus.lastSyncTime).toISOString() : null,
      syncErrors: cacheStats.syncStatus.syncErrors
    }
  };

  // Calculate additional metrics
  const metrics = {
    averageItemSize: cacheSizes.total > 0 ?
      Math.round((cacheStats.compression.originalSize / cacheSizes.total)) : 0,
    compressionRatio: cacheStats.compression.compressedItems > 0 ?
      Math.round((cacheStats.compression.compressedSize / cacheStats.compression.originalSize) * 100) / 100 : 1,
    criticalityDistribution: cacheSizes.total > 0 ? {
      low: Math.round((cacheStats.criticality.low / cacheSizes.total) * 100),
      medium: Math.round((cacheStats.criticality.medium / cacheSizes.total) * 100),
      high: Math.round((cacheStats.criticality.high / cacheSizes.total) * 100),
      critical: Math.round((cacheStats.criticality.critical / cacheSizes.total) * 100)
    } : { low: 0, medium: 0, high: 0, critical: 0 }
  };

  // Return appropriate level of detail
  if (detailed) {
    return {
      ...baseStats,
      enhanced: enhancedStats,
      metrics
    };
  } else {
    return {
      ...baseStats,
      compression: {
        enabled: COMPRESSION_ENABLED,
        compressedItems: cacheStats.compression.compressedItems,
        savingsPercent: Math.round(cacheStats.compression.savingsPercent * 100) / 100
      },
      versioning: {
        conflicts: cacheStats.versioning.conflicts,
        versions: cacheStats.versioning.versions.total
      },
      criticalItems: cacheStats.criticality.high + cacheStats.criticality.critical,
      pendingSync: cacheStats.syncStatus.pendingSync
    };
  }
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

/**
 * Resolves a version conflict between local and remote data
 *
 * @param {string} cacheType - The cache type ('translation' or 'audio')
 * @param {string} key - The cache key
 * @param {Object} localData - Local version of the data
 * @param {Object} remoteData - Remote version of the data
 * @param {Object} options - Resolution options
 * @param {string} options.strategy - Resolution strategy ('local', 'remote', 'merge', 'both')
 * @param {string} options.localVersion - Local version identifier
 * @param {string} options.remoteVersion - Remote version identifier
 * @returns {Promise<Object>} - Resolution result
 */
async function resolveVersionConflict(cacheType, key, localData, remoteData, options = {}) {
  // Default to merge strategy
  const strategy = options.strategy || 'merge';
  const localVersion = options.localVersion || `local-${Date.now()}`;
  const remoteVersion = options.remoteVersion || `remote-${Date.now()}`;

  console.log(`Resolving version conflict for ${cacheType}:${key} using strategy: ${strategy}`);

  // Update conflict statistics
  cacheStats.versioning.conflicts++;

  let result;

  switch (strategy) {
    case 'local':
      // Keep local version only
      result = {
        data: localData,
        version: localVersion,
        resolution: 'local_preferred'
      };
      break;

    case 'remote':
      // Use remote version only
      result = {
        data: remoteData,
        version: remoteVersion,
        resolution: 'remote_preferred'
      };

      // Update cache with remote version
      await set(cacheType, key, remoteData, {
        version: remoteVersion,
        needsSync: false // Already synced
      });
      break;

    case 'both':
      // Keep both versions
      // Store remote version in cache
      await set(cacheType, key, remoteData, {
        version: remoteVersion,
        needsSync: false
      });

      // Return local version but with metadata about the conflict
      result = {
        data: localData,
        version: localVersion,
        resolution: 'both_retained',
        alternateVersion: remoteVersion
      };
      break;

    case 'merge':
    default:
      // For translations, merge based on confidence
      if (cacheType === 'translation') {
        // Determine which translation to use based on confidence
        const localConfidence = getConfidenceScore(localData.confidence);
        const remoteConfidence = getConfidenceScore(remoteData.confidence);

        let mergedData;
        let winningVersion;

        if (localConfidence >= remoteConfidence) {
          // Local version has higher or equal confidence
          mergedData = { ...localData };
          winningVersion = localVersion;
        } else {
          // Remote version has higher confidence
          mergedData = { ...remoteData };
          winningVersion = remoteVersion;
        }

        // Add metadata about the merge
        mergedData.mergeSource = localConfidence >= remoteConfidence ? 'local' : 'remote';
        mergedData.mergeTimestamp = Date.now();

        // Generate a new merged version identifier
        const mergedVersion = `merged-${winningVersion}-${Date.now()}`;

        // Store the merged version
        await set(cacheType, key, mergedData, {
          version: mergedVersion,
          needsSync: true // Merged version needs to be synced back
        });

        result = {
          data: mergedData,
          version: mergedVersion,
          resolution: 'merged',
          winningSource: localConfidence >= remoteConfidence ? 'local' : 'remote'
        };
      } else {
        // For other types, prefer the newer version
        const localTimestamp = localData.timestamp || 0;
        const remoteTimestamp = remoteData.timestamp || 0;

        if (localTimestamp >= remoteTimestamp) {
          result = {
            data: localData,
            version: localVersion,
            resolution: 'local_newer'
          };
        } else {
          // Update cache with remote version
          await set(cacheType, key, remoteData, {
            version: remoteVersion,
            needsSync: false
          });

          result = {
            data: remoteData,
            version: remoteVersion,
            resolution: 'remote_newer'
          };
        }
      }
      break;
  }

  // Update resolution statistics
  cacheStats.versioning.resolved++;

  return result;
}

/**
 * Convert confidence string to numeric score
 *
 * @param {string} confidence - Confidence level ('high', 'medium', 'low')
 * @returns {number} - Numeric score (0-1)
 */
function getConfidenceScore(confidence) {
  switch (String(confidence).toLowerCase()) {
    case 'high':
      return 0.9;
    case 'medium':
      return 0.6;
    case 'low':
      return 0.3;
    default:
      return parseFloat(confidence) || 0.5; // Handle numeric values or default to medium
  }
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
  cleanupExpiredEntries,
  resolveVersionConflict
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
