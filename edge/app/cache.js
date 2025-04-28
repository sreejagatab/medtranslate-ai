/**
 * Cache manager for MedTranslate AI Edge Application
 *
 * This module provides functions for caching translations locally
 * on the edge device to improve performance and enable offline operation.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CACHE_DIR = process.env.CACHE_DIR || '../../cache';
const CACHE_SIZE_LIMIT = parseInt(process.env.CACHE_SIZE_LIMIT || '1000');
const CACHE_FILE = path.join(__dirname, '../../cache/translation_cache.json');

// Initialize cache
let translationCache = {};
let cacheSize = 0;

// Load cache from disk if available
try {
  if (fs.existsSync(CACHE_FILE)) {
    const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    translationCache = cacheData.cache || {};
    cacheSize = Object.keys(translationCache).length;
    console.log(`Loaded ${cacheSize} cached translations from disk`);
  } else {
    console.log('No cache file found, starting with empty cache');
    // Ensure cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  }
} catch (error) {
  console.error('Error loading cache from disk:', error);
  translationCache = {};
  cacheSize = 0;
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
  const cacheKey = generateCacheKey(text, sourceLanguage, targetLanguage, context);

  const cachedItem = translationCache[cacheKey];
  if (cachedItem) {
    // Update access timestamp
    cachedItem.lastAccessed = Date.now();
    return cachedItem;
  }

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
function cacheTranslation(text, sourceLanguage, targetLanguage, context, result) {
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
    lastAccessed: Date.now()
  };

  // Update cache size
  cacheSize = Object.keys(translationCache).length;

  // Periodically save cache to disk
  if (cacheSize % 10 === 0) {
    saveCacheToDisk();
  }
}

/**
 * Clears the entire translation cache
 */
function clearCache() {
  translationCache = {};
  cacheSize = 0;
  saveCacheToDisk();
  console.log('Translation cache cleared');
}

/**
 * Evicts least recently used items from the cache
 */
function evictCacheItems() {
  // Get all cache entries with their keys
  const entries = Object.entries(translationCache).map(([key, value]) => ({
    key,
    lastAccessed: value.lastAccessed
  }));

  // Sort by last accessed time (oldest first)
  entries.sort((a, b) => a.lastAccessed - b.lastAccessed);

  // Remove the oldest 10% of entries
  const removeCount = Math.max(1, Math.floor(cacheSize * 0.1));
  for (let i = 0; i < removeCount && i < entries.length; i++) {
    delete translationCache[entries[i].key];
  }

  console.log(`Evicted ${removeCount} items from cache`);
}

/**
 * Saves the cache to disk
 */
function saveCacheToDisk() {
  try {
    const cacheData = {
      cache: translationCache,
      lastSaved: Date.now()
    };

    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData), 'utf8');
    console.log(`Saved ${cacheSize} cached translations to disk`);
  } catch (error) {
    console.error('Error saving cache to disk:', error);
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
  const textHash = require('crypto')
    .createHash('md5')
    .update(text)
    .digest('hex');

  return `${sourceLanguage}:${targetLanguage}:${context}:${textHash}`;
}

// Export cache manager
const cacheManager = {
  getCachedTranslation,
  cacheTranslation,
  clearCache,
  saveCacheToDisk
};

// Save cache to disk on process exit
process.on('exit', () => {
  saveCacheToDisk();
});

module.exports = { cacheManager };
