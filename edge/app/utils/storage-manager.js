/**
 * Storage Manager for MedTranslate AI Edge Application
 *
 * This module provides functions for managing storage efficiently,
 * including quota management, storage optimization, and persistence.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const { compressCacheItem, decompressCacheItem } = require('./compression-util');

// Promisify fs functions
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const mkdirAsync = promisify(fs.mkdir);
const statAsync = promisify(fs.stat);
const readdirAsync = promisify(fs.readdir);
const unlinkAsync = promisify(fs.unlink);

// Configuration
const DEFAULT_STORAGE_DIR = path.join(__dirname, '../../../storage');
const DEFAULT_QUOTA_MB = 100; // 100MB default storage quota
const STORAGE_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
const LOW_STORAGE_THRESHOLD = 0.1; // 10% of quota remaining
const CRITICAL_STORAGE_THRESHOLD = 0.05; // 5% of quota remaining

// Storage state
let storageDir = DEFAULT_STORAGE_DIR;
let quotaMB = DEFAULT_QUOTA_MB;
let currentUsageMB = 0;
let isInitialized = false;
let checkInterval = null;
let storageListeners = [];

/**
 * Initialize the storage manager
 *
 * @param {Object} options - Initialization options
 * @returns {Promise<Object>} - Initialization result
 */
async function initialize(options = {}) {
  try {
    console.log('Initializing storage manager...');
    
    // Set configuration from options
    storageDir = options.storageDir || DEFAULT_STORAGE_DIR;
    quotaMB = options.quotaMB || DEFAULT_QUOTA_MB;
    
    // Create storage directory if it doesn't exist
    if (!fs.existsSync(storageDir)) {
      await mkdirAsync(storageDir, { recursive: true });
      console.log(`Created storage directory: ${storageDir}`);
    }
    
    // Calculate current storage usage
    currentUsageMB = await calculateStorageUsage();
    console.log(`Current storage usage: ${currentUsageMB.toFixed(2)}MB / ${quotaMB}MB (${((currentUsageMB / quotaMB) * 100).toFixed(2)}%)`);
    
    // Check if we're approaching quota
    checkStorageQuota();
    
    // Start periodic storage check
    if (checkInterval) {
      clearInterval(checkInterval);
    }
    
    checkInterval = setInterval(async () => {
      currentUsageMB = await calculateStorageUsage();
      checkStorageQuota();
    }, STORAGE_CHECK_INTERVAL);
    
    isInitialized = true;
    console.log('Storage manager initialized successfully');
    
    return {
      success: true,
      storageDir,
      quotaMB,
      currentUsageMB
    };
  } catch (error) {
    console.error('Error initializing storage manager:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calculate current storage usage
 *
 * @returns {Promise<number>} - Current storage usage in MB
 */
async function calculateStorageUsage() {
  try {
    // Get all files in storage directory
    const files = await readdirAsync(storageDir);
    
    // Calculate total size
    let totalSize = 0;
    
    for (const file of files) {
      const filePath = path.join(storageDir, file);
      const stats = await statAsync(filePath);
      
      if (stats.isFile()) {
        totalSize += stats.size;
      }
    }
    
    // Convert to MB
    return totalSize / (1024 * 1024);
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    return 0;
  }
}

/**
 * Check if we're approaching storage quota
 */
function checkStorageQuota() {
  const usageRatio = currentUsageMB / quotaMB;
  
  if (usageRatio >= (1 - CRITICAL_STORAGE_THRESHOLD)) {
    console.warn(`CRITICAL: Storage usage at ${(usageRatio * 100).toFixed(2)}% of quota!`);
    notifyStorageListeners('critical', {
      currentUsageMB,
      quotaMB,
      usageRatio
    });
  } else if (usageRatio >= (1 - LOW_STORAGE_THRESHOLD)) {
    console.warn(`WARNING: Storage usage at ${(usageRatio * 100).toFixed(2)}% of quota`);
    notifyStorageListeners('low', {
      currentUsageMB,
      quotaMB,
      usageRatio
    });
  }
}

/**
 * Save data to storage
 *
 * @param {string} key - Storage key
 * @param {Object|string} data - Data to store
 * @param {Object} options - Storage options
 * @returns {Promise<Object>} - Storage result
 */
async function saveData(key, data, options = {}) {
  try {
    if (!isInitialized) {
      await initialize();
    }
    
    // Check if we have enough storage
    if (currentUsageMB >= quotaMB && !options.force) {
      throw new Error('Storage quota exceeded');
    }
    
    // Compress data if it's an object
    let storageData;
    
    if (typeof data === 'object') {
      storageData = await compressCacheItem(data, options);
    } else {
      storageData = data;
    }
    
    // Calculate file size
    const dataString = typeof storageData === 'object' ? JSON.stringify(storageData) : storageData;
    const dataSize = Buffer.from(dataString).length;
    const dataSizeMB = dataSize / (1024 * 1024);
    
    // Check if this would exceed quota
    if (currentUsageMB + dataSizeMB > quotaMB && !options.force) {
      throw new Error(`Saving this data would exceed storage quota (${dataSizeMB.toFixed(2)}MB needed, ${(quotaMB - currentUsageMB).toFixed(2)}MB available)`);
    }
    
    // Save to file
    const filePath = path.join(storageDir, `${key}.json`);
    await writeFileAsync(filePath, dataString, 'utf8');
    
    // Update usage
    currentUsageMB += dataSizeMB;
    
    // Check quota after update
    checkStorageQuota();
    
    return {
      success: true,
      key,
      size: dataSize,
      sizeMB: dataSizeMB,
      compressed: storageData.compressed || false
    };
  } catch (error) {
    console.error(`Error saving data for key ${key}:`, error);
    return {
      success: false,
      key,
      error: error.message
    };
  }
}

/**
 * Load data from storage
 *
 * @param {string} key - Storage key
 * @param {Object} options - Load options
 * @returns {Promise<Object>} - Load result
 */
async function loadData(key, options = {}) {
  try {
    if (!isInitialized) {
      await initialize();
    }
    
    const filePath = path.join(storageDir, `${key}.json`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        key,
        error: 'Data not found'
      };
    }
    
    // Read file
    const dataString = await readFileAsync(filePath, 'utf8');
    
    // Parse data
    let data;
    try {
      data = JSON.parse(dataString);
      
      // Decompress if needed
      if (data.compressed) {
        data = await decompressCacheItem(data);
      }
    } catch (e) {
      // Return as string if not valid JSON
      data = dataString;
    }
    
    return {
      success: true,
      key,
      data
    };
  } catch (error) {
    console.error(`Error loading data for key ${key}:`, error);
    return {
      success: false,
      key,
      error: error.message
    };
  }
}

/**
 * Remove data from storage
 *
 * @param {string} key - Storage key
 * @returns {Promise<Object>} - Remove result
 */
async function removeData(key) {
  try {
    if (!isInitialized) {
      await initialize();
    }
    
    const filePath = path.join(storageDir, `${key}.json`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        key,
        error: 'Data not found'
      };
    }
    
    // Get file size before deleting
    const stats = await statAsync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    // Delete file
    await unlinkAsync(filePath);
    
    // Update usage
    currentUsageMB -= fileSizeMB;
    if (currentUsageMB < 0) currentUsageMB = 0;
    
    return {
      success: true,
      key,
      sizeMB: fileSizeMB
    };
  } catch (error) {
    console.error(`Error removing data for key ${key}:`, error);
    return {
      success: false,
      key,
      error: error.message
    };
  }
}

/**
 * Clear all data from storage
 *
 * @returns {Promise<Object>} - Clear result
 */
async function clearStorage() {
  try {
    if (!isInitialized) {
      await initialize();
    }
    
    // Get all files in storage directory
    const files = await readdirAsync(storageDir);
    
    // Delete each file
    let deletedCount = 0;
    for (const file of files) {
      const filePath = path.join(storageDir, file);
      const stats = await statAsync(filePath);
      
      if (stats.isFile()) {
        await unlinkAsync(filePath);
        deletedCount++;
      }
    }
    
    // Reset usage
    currentUsageMB = 0;
    
    return {
      success: true,
      deletedCount
    };
  } catch (error) {
    console.error('Error clearing storage:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get storage information
 *
 * @returns {Object} - Storage information
 */
function getStorageInfo() {
  return {
    initialized: isInitialized,
    storageDir,
    quotaMB,
    currentUsageMB,
    availableMB: quotaMB - currentUsageMB,
    usagePercentage: (currentUsageMB / quotaMB) * 100,
    lowStorageThreshold: LOW_STORAGE_THRESHOLD * 100,
    criticalStorageThreshold: CRITICAL_STORAGE_THRESHOLD * 100
  };
}

/**
 * Add storage event listener
 *
 * @param {Function} listener - Event listener function
 */
function addStorageListener(listener) {
  if (typeof listener === 'function') {
    storageListeners.push(listener);
  }
}

/**
 * Remove storage event listener
 *
 * @param {Function} listener - Event listener function to remove
 */
function removeStorageListener(listener) {
  const index = storageListeners.indexOf(listener);
  if (index !== -1) {
    storageListeners.splice(index, 1);
  }
}

/**
 * Notify all storage listeners of an event
 *
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
function notifyStorageListeners(event, data) {
  for (const listener of storageListeners) {
    try {
      listener(event, data);
    } catch (error) {
      console.error('Error in storage listener:', error);
    }
  }
}

/**
 * Optimize storage by cleaning up unnecessary files
 *
 * @returns {Promise<Object>} - Optimization result
 */
async function optimizeStorage() {
  try {
    if (!isInitialized) {
      await initialize();
    }
    
    // Get all files in storage directory
    const files = await readdirAsync(storageDir);
    
    // Get file stats
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(storageDir, file);
        const stats = await statAsync(filePath);
        
        return {
          name: file,
          path: filePath,
          size: stats.size,
          sizeMB: stats.size / (1024 * 1024),
          lastModified: stats.mtime.getTime()
        };
      })
    );
    
    // Sort by last modified (oldest first)
    fileStats.sort((a, b) => a.lastModified - b.lastModified);
    
    // If we're below the low storage threshold, we don't need to optimize
    if (currentUsageMB < quotaMB * (1 - LOW_STORAGE_THRESHOLD)) {
      return {
        success: true,
        optimized: false,
        message: 'Storage optimization not needed'
      };
    }
    
    // Calculate how much space we need to free up
    const targetUsageMB = quotaMB * 0.8; // Target 80% usage
    const spaceToFreeMB = currentUsageMB - targetUsageMB;
    
    if (spaceToFreeMB <= 0) {
      return {
        success: true,
        optimized: false,
        message: 'Storage optimization not needed'
      };
    }
    
    // Delete oldest files until we free up enough space
    let freedSpaceMB = 0;
    let deletedCount = 0;
    
    for (const file of fileStats) {
      if (freedSpaceMB >= spaceToFreeMB) {
        break;
      }
      
      await unlinkAsync(file.path);
      freedSpaceMB += file.sizeMB;
      deletedCount++;
    }
    
    // Update usage
    currentUsageMB -= freedSpaceMB;
    if (currentUsageMB < 0) currentUsageMB = 0;
    
    console.log(`Storage optimized: freed ${freedSpaceMB.toFixed(2)}MB by deleting ${deletedCount} files`);
    
    return {
      success: true,
      optimized: true,
      freedSpaceMB,
      deletedCount,
      currentUsageMB
    };
  } catch (error) {
    console.error('Error optimizing storage:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  initialize,
  saveData,
  loadData,
  removeData,
  clearStorage,
  getStorageInfo,
  addStorageListener,
  removeStorageListener,
  optimizeStorage,
  calculateStorageUsage
};
