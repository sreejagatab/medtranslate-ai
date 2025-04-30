/**
 * Cache Manager for MedTranslate AI
 * 
 * This module provides caching functionality for API responses and other data.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory cache
const memoryCache = new Map();

// Cache configuration
const config = {
  maxMemoryCacheSize: 100, // Maximum number of items in memory cache
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  persistentCachePrefix: 'medtranslate_cache_',
  persistentCacheEnabled: true,
  persistentCacheTTL: 24 * 60 * 60 * 1000 // 24 hours
};

/**
 * Set a value in the cache
 * 
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Promise<void>}
 */
export const set = async (key, value, ttl = config.defaultTTL) => {
  try {
    // Set in memory cache
    const cacheItem = {
      value,
      expires: Date.now() + ttl
    };
    
    memoryCache.set(key, cacheItem);
    
    // Trim memory cache if it exceeds max size
    if (memoryCache.size > config.maxMemoryCacheSize) {
      // Remove oldest items
      const keysToDelete = [...memoryCache.keys()].slice(0, memoryCache.size - config.maxMemoryCacheSize);
      keysToDelete.forEach(k => memoryCache.delete(k));
    }
    
    // Set in persistent cache if enabled
    if (config.persistentCacheEnabled) {
      const persistentCacheItem = {
        value,
        expires: Date.now() + config.persistentCacheTTL
      };
      
      await AsyncStorage.setItem(
        `${config.persistentCachePrefix}${key}`,
        JSON.stringify(persistentCacheItem)
      );
    }
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

/**
 * Get a value from the cache
 * 
 * @param {string} key - Cache key
 * @returns {any} - Cached value or undefined if not found or expired
 */
export const get = async (key) => {
  try {
    // Check memory cache first
    if (memoryCache.has(key)) {
      const cacheItem = memoryCache.get(key);
      
      // Check if expired
      if (cacheItem.expires > Date.now()) {
        return cacheItem.value;
      }
      
      // Remove expired item
      memoryCache.delete(key);
    }
    
    // Check persistent cache if enabled
    if (config.persistentCacheEnabled) {
      const persistentCacheKey = `${config.persistentCachePrefix}${key}`;
      const persistentCacheItemJson = await AsyncStorage.getItem(persistentCacheKey);
      
      if (persistentCacheItemJson) {
        const persistentCacheItem = JSON.parse(persistentCacheItemJson);
        
        // Check if expired
        if (persistentCacheItem.expires > Date.now()) {
          // Add to memory cache
          memoryCache.set(key, {
            value: persistentCacheItem.value,
            expires: persistentCacheItem.expires
          });
          
          return persistentCacheItem.value;
        }
        
        // Remove expired item
        await AsyncStorage.removeItem(persistentCacheKey);
      }
    }
    
    return undefined;
  } catch (error) {
    console.error('Error getting from cache:', error);
    return undefined;
  }
};

/**
 * Remove a value from the cache
 * 
 * @param {string} key - Cache key
 * @returns {Promise<void>}
 */
export const remove = async (key) => {
  try {
    // Remove from memory cache
    memoryCache.delete(key);
    
    // Remove from persistent cache if enabled
    if (config.persistentCacheEnabled) {
      await AsyncStorage.removeItem(`${config.persistentCachePrefix}${key}`);
    }
  } catch (error) {
    console.error('Error removing from cache:', error);
  }
};

/**
 * Clear the entire cache
 * 
 * @returns {Promise<void>}
 */
export const clear = async () => {
  try {
    // Clear memory cache
    memoryCache.clear();
    
    // Clear persistent cache if enabled
    if (config.persistentCacheEnabled) {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(config.persistentCachePrefix));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

/**
 * Get cache statistics
 * 
 * @returns {Promise<Object>} - Cache statistics
 */
export const getStats = async () => {
  try {
    // Count expired items in memory cache
    let expiredCount = 0;
    const now = Date.now();
    
    memoryCache.forEach(item => {
      if (item.expires <= now) {
        expiredCount++;
      }
    });
    
    // Get persistent cache stats if enabled
    let persistentCacheSize = 0;
    let persistentCacheExpiredCount = 0;
    
    if (config.persistentCacheEnabled) {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(config.persistentCachePrefix));
      
      persistentCacheSize = cacheKeys.length;
      
      // Check for expired items
      for (const key of cacheKeys) {
        const itemJson = await AsyncStorage.getItem(key);
        
        if (itemJson) {
          const item = JSON.parse(itemJson);
          
          if (item.expires <= now) {
            persistentCacheExpiredCount++;
          }
        }
      }
    }
    
    return {
      memoryCache: {
        size: memoryCache.size,
        expired: expiredCount
      },
      persistentCache: {
        size: persistentCacheSize,
        expired: persistentCacheExpiredCount
      }
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      memoryCache: {
        size: 0,
        expired: 0
      },
      persistentCache: {
        size: 0,
        expired: 0
      }
    };
  }
};

/**
 * Configure the cache
 * 
 * @param {Object} options - Configuration options
 * @returns {void}
 */
export const configure = (options) => {
  Object.assign(config, options);
};

export default {
  set,
  get,
  remove,
  clear,
  getStats,
  configure
};
