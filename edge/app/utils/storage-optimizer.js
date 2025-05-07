/**
 * Storage Optimizer for MedTranslate AI Edge Application
 *
 * This module provides advanced storage optimization capabilities:
 * - Intelligent data prioritization based on usage patterns
 * - Adaptive compression strategies for different data types
 * - Proactive cleanup based on predictive analytics
 * - Integration with auto-sync-manager for efficient synchronization
 * - Smart caching strategies for offline operation
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const crypto = require('crypto');

// Import required modules
let storageManager;
let compressionUtil;
let predictiveCache;

// Try to import modules with error handling
try {
  storageManager = require('./storage-manager');
  console.log('Storage manager loaded successfully for optimization');
} catch (error) {
  console.warn('Storage manager not available for optimization:', error.message);
  storageManager = null;
}

try {
  compressionUtil = require('./compression-util');
  console.log('Compression utility loaded successfully for optimization');
} catch (error) {
  console.warn('Compression utility not available for optimization:', error.message);
  compressionUtil = null;
}

// We'll load predictiveCache later to avoid circular dependencies
predictiveCache = null;

// Configuration
const DEFAULT_STORAGE_DIR = path.join(__dirname, '../../../storage');
const DEFAULT_CACHE_DIR = path.join(__dirname, '../../../cache');
const DEFAULT_OPTIMIZATION_INTERVAL = 3600000; // 1 hour
const DEFAULT_PRIORITY_LEVELS = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  ARCHIVE: 1
};

// State
let isInitialized = false;
let optimizationInterval = null;
let storageDir = DEFAULT_STORAGE_DIR;
let cacheDir = DEFAULT_CACHE_DIR;
let optimizationIntervalMs = DEFAULT_OPTIMIZATION_INTERVAL;
let usageStats = {
  accessFrequency: {},
  lastAccess: {},
  dataImportance: {},
  dataSize: {},
  compressionRatio: {}
};

/**
 * Initialize the storage optimizer
 *
 * @param {Object} options - Initialization options
 * @returns {Promise<Object>} - Initialization result
 */
async function initialize(options = {}) {
  try {
    console.log('Initializing storage optimizer...');

    // Set configuration from options
    storageDir = options.storageDir || DEFAULT_STORAGE_DIR;
    cacheDir = options.cacheDir || DEFAULT_CACHE_DIR;
    optimizationIntervalMs = options.optimizationInterval || DEFAULT_OPTIMIZATION_INTERVAL;

    // Create directories if they don't exist
    for (const dir of [storageDir, cacheDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    }

    // Load usage statistics if available
    await loadUsageStats();

    // Start optimization interval
    startOptimizationInterval();

    // Load predictive cache after initialization to avoid circular dependencies
    try {
      predictiveCache = require('../predictive-cache');
      console.log('Predictive cache loaded successfully for optimization after initialization');
    } catch (error) {
      console.warn('Predictive cache not available for optimization after initialization:', error.message);
      predictiveCache = null;
    }

    isInitialized = true;
    console.log('Storage optimizer initialized successfully');

    return { success: true };
  } catch (error) {
    console.error('Error initializing storage optimizer:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load usage statistics from file
 *
 * @returns {Promise<void>}
 */
async function loadUsageStats() {
  try {
    const statsPath = path.join(cacheDir, 'storage_usage_stats.json');

    if (fs.existsSync(statsPath)) {
      const statsData = fs.readFileSync(statsPath, 'utf8');
      usageStats = JSON.parse(statsData);
      console.log('Loaded storage usage statistics');
    } else {
      console.log('No existing storage usage statistics found');
    }
  } catch (error) {
    console.error('Error loading usage statistics:', error);
    // Initialize with empty stats
    usageStats = {
      accessFrequency: {},
      lastAccess: {},
      dataImportance: {},
      dataSize: {},
      compressionRatio: {}
    };
  }
}

/**
 * Save usage statistics to file
 *
 * @returns {Promise<void>}
 */
async function saveUsageStats() {
  try {
    const statsPath = path.join(cacheDir, 'storage_usage_stats.json');

    // Ensure cache directory exists
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    fs.writeFileSync(statsPath, JSON.stringify(usageStats, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving usage statistics:', error);
  }
}

/**
 * Start the optimization interval
 */
function startOptimizationInterval() {
  // Clear existing interval if any
  if (optimizationInterval) {
    clearInterval(optimizationInterval);
  }

  console.log(`Starting storage optimization interval (${optimizationIntervalMs}ms)`);

  // Set up interval
  optimizationInterval = setInterval(async () => {
    try {
      await optimizeStorage();
    } catch (error) {
      console.error('Error in scheduled storage optimization:', error);
    }
  }, optimizationIntervalMs);
}

/**
 * Record data access for usage statistics
 *
 * @param {string} key - Data key
 * @param {Object} metadata - Access metadata
 */
function recordAccess(key, metadata = {}) {
  try {
    if (!isInitialized) {
      initialize();
    }

    // Update access frequency
    usageStats.accessFrequency[key] = (usageStats.accessFrequency[key] || 0) + 1;

    // Update last access time
    usageStats.lastAccess[key] = Date.now();

    // Update data importance if provided
    if (metadata.importance) {
      usageStats.dataImportance[key] = metadata.importance;
    }

    // Update data size if provided
    if (metadata.size) {
      usageStats.dataSize[key] = metadata.size;
    }

    // Update compression ratio if provided
    if (metadata.compressionRatio) {
      usageStats.compressionRatio[key] = metadata.compressionRatio;
    }

    // Save usage stats periodically (every 10 accesses)
    if (Math.random() < 0.1) {
      saveUsageStats();
    }
  } catch (error) {
    console.error('Error recording data access:', error);
  }
}

/**
 * Get priority score for a data item
 *
 * @param {string} key - Data key
 * @returns {number} - Priority score
 */
function getPriorityScore(key) {
  try {
    // Default priority is LOW
    let priorityScore = DEFAULT_PRIORITY_LEVELS.LOW;

    // Adjust based on access frequency
    const accessFrequency = usageStats.accessFrequency[key] || 0;
    if (accessFrequency > 20) {
      priorityScore += 2;
    } else if (accessFrequency > 10) {
      priorityScore += 1;
    }

    // Adjust based on recency of access
    const lastAccess = usageStats.lastAccess[key] || 0;
    const daysSinceLastAccess = (Date.now() - lastAccess) / (24 * 60 * 60 * 1000);

    if (daysSinceLastAccess < 1) {
      priorityScore += 2; // Accessed in the last day
    } else if (daysSinceLastAccess < 7) {
      priorityScore += 1; // Accessed in the last week
    } else if (daysSinceLastAccess > 30) {
      priorityScore -= 1; // Not accessed in the last month
    }

    // Adjust based on importance
    const importance = usageStats.dataImportance[key] || DEFAULT_PRIORITY_LEVELS.MEDIUM;
    priorityScore += importance;

    // Adjust based on predictive cache if available
    if (predictiveCache) {
      try {
        const predictions = predictiveCache.getPredictionsSync();
        if (predictions.predictedKeys && predictions.predictedKeys.includes(key)) {
          priorityScore += 2; // Predicted to be needed soon
        }
      } catch (error) {
        console.warn('Error getting predictions for priority calculation:', error);
      }
    }

    return priorityScore;
  } catch (error) {
    console.error('Error calculating priority score:', error);
    return DEFAULT_PRIORITY_LEVELS.MEDIUM; // Default to MEDIUM on error
  }
}

/**
 * Optimize storage based on usage patterns and priorities
 *
 * @param {Object} options - Optimization options
 * @returns {Promise<Object>} - Optimization result
 */
async function optimizeStorage(options = {}) {
  try {
    console.log('Starting intelligent storage optimization...');

    if (!isInitialized) {
      await initialize();
    }

    // Check if storage manager is available
    if (!storageManager) {
      return {
        success: false,
        error: 'Storage manager not available'
      };
    }

    // Get storage information
    const storageInfo = storageManager.getStorageInfo();

    // If storage usage is below threshold and not forced, no need to optimize
    if (storageInfo.usagePercentage < 70 && !options.force) {
      console.log(`Storage usage (${storageInfo.usagePercentage.toFixed(2)}%) below optimization threshold`);
      return {
        success: true,
        optimized: false,
        message: 'Storage optimization not needed'
      };
    }

    console.log(`Storage usage at ${storageInfo.usagePercentage.toFixed(2)}%, starting optimization`);

    // Get all files in storage directory
    const files = await promisify(fs.readdir)(storageDir);

    // Get file stats with priority scores
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(storageDir, file);
        const stats = await promisify(fs.stat)(filePath);

        // Extract key from filename
        const key = file.replace('.json', '');

        return {
          name: file,
          path: filePath,
          key,
          size: stats.size,
          sizeMB: stats.size / (1024 * 1024),
          lastModified: stats.mtime.getTime(),
          priorityScore: getPriorityScore(key)
        };
      })
    );

    // Sort by priority score (lowest first - these will be removed first)
    fileStats.sort((a, b) => a.priorityScore - b.priorityScore);

    // Calculate target usage
    const targetUsageMB = storageInfo.quotaMB * 0.7; // Target 70% usage
    const spaceToFreeMB = Math.max(0, storageInfo.currentUsageMB - targetUsageMB);

    if (spaceToFreeMB <= 0 && !options.force) {
      return {
        success: true,
        optimized: false,
        message: 'Storage optimization not needed'
      };
    }

    // Determine which files to remove and which to compress
    const filesToRemove = [];
    const filesToCompress = [];
    let potentialSpaceFreed = 0;

    // First pass: identify low-priority files for removal
    for (const file of fileStats) {
      // If we've identified enough files to free up space, stop
      if (potentialSpaceFreed >= spaceToFreeMB && !options.force) {
        break;
      }

      // Very low priority files are removed
      if (file.priorityScore < 3) {
        filesToRemove.push(file);
        potentialSpaceFreed += file.sizeMB;
      }
      // Medium priority files are considered for compression
      else if (file.priorityScore < 7 && file.sizeMB > 0.1 && compressionUtil) {
        filesToCompress.push(file);
      }
    }

    // If we still need to free up space, compress files
    let compressionResults = [];
    if (compressionUtil && filesToCompress.length > 0) {
      compressionResults = await compressFiles(filesToCompress);

      // Update potential space freed
      const spaceFreedByCompression = compressionResults.reduce(
        (total, result) => total + (result.success ? result.spaceSavedMB : 0),
        0
      );

      potentialSpaceFreed += spaceFreedByCompression;
    }

    // If we still need to free up more space, remove more files
    if (potentialSpaceFreed < spaceToFreeMB || options.force) {
      // Find medium priority files that weren't compressed
      const mediumPriorityFiles = fileStats.filter(
        file => file.priorityScore >= 3 && file.priorityScore < 7 &&
        !filesToRemove.includes(file) && !filesToCompress.includes(file)
      );

      // Sort by last modified (oldest first)
      mediumPriorityFiles.sort((a, b) => a.lastModified - b.lastModified);

      // Add oldest medium priority files to removal list
      for (const file of mediumPriorityFiles) {
        if (potentialSpaceFreed >= spaceToFreeMB && !options.force) {
          break;
        }

        filesToRemove.push(file);
        potentialSpaceFreed += file.sizeMB;
      }
    }

    // Remove files
    let removedCount = 0;
    let freedSpaceMB = 0;

    for (const file of filesToRemove) {
      try {
        await promisify(fs.unlink)(file.path);
        freedSpaceMB += file.sizeMB;
        removedCount++;

        // Update usage stats
        delete usageStats.accessFrequency[file.key];
        delete usageStats.lastAccess[file.key];
        delete usageStats.dataImportance[file.key];
        delete usageStats.dataSize[file.key];
        delete usageStats.compressionRatio[file.key];
      } catch (error) {
        console.error(`Error removing file ${file.path}:`, error);
      }
    }

    // Save updated usage stats
    await saveUsageStats();

    console.log(`Storage optimized: freed ${freedSpaceMB.toFixed(2)}MB by removing ${removedCount} files and compressing ${compressionResults.length} files`);

    return {
      success: true,
      optimized: true,
      freedSpaceMB,
      removedCount,
      compressedCount: compressionResults.length,
      spaceSavedByCompressionMB: compressionResults.reduce(
        (total, result) => total + (result.success ? result.spaceSavedMB : 0),
        0
      )
    };
  } catch (error) {
    console.error('Error optimizing storage:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Compress files to save space
 *
 * @param {Array} files - Files to compress
 * @returns {Promise<Array>} - Compression results
 */
async function compressFiles(files) {
  const results = [];

  if (!compressionUtil) {
    return results;
  }

  for (const file of files) {
    try {
      // Read file
      const data = await promisify(fs.readFile)(file.path, 'utf8');

      // Parse data
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        // Skip if not valid JSON
        continue;
      }

      // Skip if already compressed
      if (parsedData.compressed) {
        continue;
      }

      // Compress data
      const compressedData = await compressionUtil.compressCacheItem(parsedData, {
        algorithm: compressionUtil.COMPRESSION_ALGORITHMS.BROTLI,
        level: compressionUtil.COMPRESSION_LEVELS.MAX
      });

      // Skip if compression failed or didn't save space
      if (!compressedData.compressed || compressedData.compressionRatio <= 1.1) {
        continue;
      }

      // Write compressed data back to file
      const compressedString = JSON.stringify(compressedData);
      await promisify(fs.writeFile)(file.path, compressedString, 'utf8');

      // Calculate space saved
      const originalSizeMB = file.sizeMB;
      const newSizeMB = Buffer.from(compressedString).length / (1024 * 1024);
      const spaceSavedMB = originalSizeMB - newSizeMB;

      // Update compression ratio in usage stats
      usageStats.compressionRatio[file.key] = compressedData.compressionRatio;

      results.push({
        success: true,
        key: file.key,
        originalSizeMB,
        newSizeMB,
        spaceSavedMB,
        compressionRatio: compressedData.compressionRatio
      });
    } catch (error) {
      console.error(`Error compressing file ${file.path}:`, error);
      results.push({
        success: false,
        key: file.key,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Analyze storage usage patterns
 *
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeStoragePatterns() {
  try {
    if (!isInitialized) {
      await initialize();
    }

    console.log('Analyzing storage usage patterns...');

    // Get all keys from usage stats
    const allKeys = new Set([
      ...Object.keys(usageStats.accessFrequency),
      ...Object.keys(usageStats.lastAccess),
      ...Object.keys(usageStats.dataImportance)
    ]);

    // Calculate statistics
    const stats = {
      totalItems: allKeys.size,
      accessFrequencyStats: {
        min: Infinity,
        max: -Infinity,
        avg: 0,
        median: 0
      },
      lastAccessStats: {
        oldest: Infinity,
        newest: -Infinity,
        avgAgeDays: 0
      },
      importanceDistribution: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        archive: 0
      },
      sizeStats: {
        totalMB: 0,
        avgItemSizeMB: 0,
        maxItemSizeMB: 0
      },
      compressionStats: {
        avgRatio: 0,
        maxRatio: 0,
        totalSavingsMB: 0
      }
    };

    // Collect frequency values for median calculation
    const frequencies = [];
    const now = Date.now();

    // Process each key
    for (const key of allKeys) {
      // Access frequency stats
      const frequency = usageStats.accessFrequency[key] || 0;
      frequencies.push(frequency);
      stats.accessFrequencyStats.min = Math.min(stats.accessFrequencyStats.min, frequency);
      stats.accessFrequencyStats.max = Math.max(stats.accessFrequencyStats.max, frequency);
      stats.accessFrequencyStats.avg += frequency;

      // Last access stats
      const lastAccess = usageStats.lastAccess[key] || 0;
      const ageMs = now - lastAccess;
      const ageDays = ageMs / (24 * 60 * 60 * 1000);

      if (lastAccess > 0) {
        stats.lastAccessStats.oldest = Math.min(stats.lastAccessStats.oldest, lastAccess);
        stats.lastAccessStats.newest = Math.max(stats.lastAccessStats.newest, lastAccess);
        stats.lastAccessStats.avgAgeDays += ageDays;
      }

      // Importance distribution
      const importance = usageStats.dataImportance[key] || DEFAULT_PRIORITY_LEVELS.MEDIUM;
      if (importance >= DEFAULT_PRIORITY_LEVELS.CRITICAL) {
        stats.importanceDistribution.critical++;
      } else if (importance >= DEFAULT_PRIORITY_LEVELS.HIGH) {
        stats.importanceDistribution.high++;
      } else if (importance >= DEFAULT_PRIORITY_LEVELS.MEDIUM) {
        stats.importanceDistribution.medium++;
      } else if (importance >= DEFAULT_PRIORITY_LEVELS.LOW) {
        stats.importanceDistribution.low++;
      } else {
        stats.importanceDistribution.archive++;
      }

      // Size stats
      const sizeMB = usageStats.dataSize[key] || 0;
      stats.sizeStats.totalMB += sizeMB;
      stats.sizeStats.maxItemSizeMB = Math.max(stats.sizeStats.maxItemSizeMB, sizeMB);

      // Compression stats
      const compressionRatio = usageStats.compressionRatio[key] || 1;
      if (compressionRatio > 1) {
        stats.compressionStats.avgRatio += compressionRatio;
        stats.compressionStats.maxRatio = Math.max(stats.compressionStats.maxRatio, compressionRatio);

        // Calculate savings
        if (sizeMB > 0) {
          const originalSize = sizeMB;
          const compressedSize = originalSize / compressionRatio;
          const savings = originalSize - compressedSize;
          stats.compressionStats.totalSavingsMB += savings;
        }
      }
    }

    // Calculate averages
    if (allKeys.size > 0) {
      stats.accessFrequencyStats.avg /= allKeys.size;
      stats.lastAccessStats.avgAgeDays /= allKeys.size;
      stats.sizeStats.avgItemSizeMB = stats.sizeStats.totalMB / allKeys.size;
    }

    // Calculate median frequency
    if (frequencies.length > 0) {
      frequencies.sort((a, b) => a - b);
      const mid = Math.floor(frequencies.length / 2);
      stats.accessFrequencyStats.median = frequencies.length % 2 === 0
        ? (frequencies[mid - 1] + frequencies[mid]) / 2
        : frequencies[mid];
    }

    // Calculate compression ratio average
    const compressedItems = Object.values(usageStats.compressionRatio).filter(ratio => ratio > 1).length;
    if (compressedItems > 0) {
      stats.compressionStats.avgRatio /= compressedItems;
    }

    // Fix infinity values
    if (stats.accessFrequencyStats.min === Infinity) stats.accessFrequencyStats.min = 0;
    if (stats.lastAccessStats.oldest === Infinity) stats.lastAccessStats.oldest = 0;

    console.log('Storage pattern analysis complete');
    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Error analyzing storage patterns:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Prepare storage for offline operation
 *
 * @param {Object} options - Preparation options
 * @returns {Promise<Object>} - Preparation result
 */
async function prepareForOfflineOperation(options = {}) {
  try {
    console.log('Preparing storage for offline operation...');

    if (!isInitialized) {
      await initialize();
    }

    // Check if predictive cache is available
    if (!predictiveCache) {
      console.warn('Predictive cache not available, using basic offline preparation');
    }

    // Get storage information
    if (!storageManager) {
      return {
        success: false,
        error: 'Storage manager not available'
      };
    }

    const storageInfo = storageManager.getStorageInfo();

    // Optimize storage first if needed
    if (storageInfo.usagePercentage > 85) {
      console.log('Storage usage high, optimizing before offline preparation');
      await optimizeStorage();
    }

    // Get predicted offline duration if available
    let predictedOfflineDurationHours = options.offlineDurationHours || 24; // Default to 24 hours
    let predictedKeys = [];

    if (predictiveCache) {
      try {
        const predictions = await predictiveCache.getPredictions();

        if (predictions.offlinePredicted) {
          predictedOfflineDurationHours = predictions.predictedOfflineDuration / (60 * 60 * 1000);
          console.log(`Using predicted offline duration: ${predictedOfflineDurationHours.toFixed(1)} hours`);

          if (predictions.predictedKeys) {
            predictedKeys = predictions.predictedKeys;
            console.log(`Found ${predictedKeys.length} predicted keys for offline use`);
          }
        }
      } catch (error) {
        console.warn('Error getting predictions for offline preparation:', error);
      }
    }

    // Calculate how much space to reserve for offline operation
    const reserveSpaceMB = Math.min(
      storageInfo.quotaMB * 0.3, // Max 30% of quota
      predictedOfflineDurationHours * 2 // 2MB per hour of offline operation
    );

    console.log(`Reserving ${reserveSpaceMB.toFixed(2)}MB for offline operation`);

    // Ensure we have enough free space
    const freeSpaceMB = storageInfo.quotaMB - storageInfo.currentUsageMB;

    if (freeSpaceMB < reserveSpaceMB) {
      console.log(`Need to free up ${(reserveSpaceMB - freeSpaceMB).toFixed(2)}MB for offline operation`);

      // Optimize storage more aggressively
      await optimizeStorage({
        force: true,
        targetFreeMB: reserveSpaceMB
      });
    }

    // Mark high-priority items for offline retention
    const offlineRetentionResults = await markItemsForOfflineRetention(predictedKeys);

    return {
      success: true,
      prepared: true,
      reservedSpaceMB: reserveSpaceMB,
      predictedOfflineDurationHours,
      retentionResults: offlineRetentionResults
    };
  } catch (error) {
    console.error('Error preparing for offline operation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Mark items for offline retention
 *
 * @param {Array} predictedKeys - Keys predicted to be needed offline
 * @returns {Promise<Object>} - Retention results
 */
async function markItemsForOfflineRetention(predictedKeys = []) {
  try {
    // Get all files in storage directory
    const files = await promisify(fs.readdir)(storageDir);

    // Track results
    const results = {
      markedCount: 0,
      predictedCount: 0,
      highPriorityCount: 0,
      totalSizeMB: 0
    };

    // Process each file
    for (const file of files) {
      try {
        const filePath = path.join(storageDir, file);
        const stats = await promisify(fs.stat)(filePath);

        // Skip directories
        if (!stats.isFile()) {
          continue;
        }

        // Extract key from filename
        const key = file.replace('.json', '');

        // Check if this is a predicted key
        const isPredicted = predictedKeys.includes(key);

        // Calculate priority score
        const priorityScore = getPriorityScore(key);
        const isHighPriority = priorityScore >= DEFAULT_PRIORITY_LEVELS.HIGH;

        // Mark for retention if predicted or high priority
        if (isPredicted || isHighPriority) {
          // Read file
          const data = await promisify(fs.readFile)(filePath, 'utf8');

          // Parse data
          let parsedData;
          try {
            parsedData = JSON.parse(data);
          } catch (e) {
            // Skip if not valid JSON
            continue;
          }

          // Add or update offline retention metadata
          parsedData.offlineRetention = {
            marked: true,
            timestamp: Date.now(),
            isPredicted,
            priorityScore,
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
          };

          // Write updated data back to file
          await promisify(fs.writeFile)(filePath, JSON.stringify(parsedData), 'utf8');

          // Update results
          results.markedCount++;
          results.totalSizeMB += stats.size / (1024 * 1024);

          if (isPredicted) {
            results.predictedCount++;
          }

          if (isHighPriority) {
            results.highPriorityCount++;
          }

          // Update importance in usage stats
          if (isPredicted && !isHighPriority) {
            // Increase importance for predicted items
            usageStats.dataImportance[key] = Math.max(
              usageStats.dataImportance[key] || DEFAULT_PRIORITY_LEVELS.MEDIUM,
              DEFAULT_PRIORITY_LEVELS.HIGH
            );
          }
        }
      } catch (error) {
        console.error(`Error processing file ${file} for offline retention:`, error);
      }
    }

    // Save updated usage stats
    await saveUsageStats();

    console.log(`Marked ${results.markedCount} items for offline retention (${results.predictedCount} predicted, ${results.highPriorityCount} high priority)`);

    return results;
  } catch (error) {
    console.error('Error marking items for offline retention:', error);
    throw error;
  }
}

/**
 * Integrate with auto-sync-manager with enhanced capabilities
 *
 * @param {Object} autoSyncManager - Auto sync manager instance
 * @returns {Promise<Object>} - Integration result with detailed status
 */
async function integrateWithAutoSyncManager(autoSyncManager) {
  try {
    if (!autoSyncManager) {
      return {
        success: false,
        error: 'Auto sync manager not provided'
      };
    }

    console.log('Integrating storage optimizer with auto-sync-manager (enhanced)...');

    // Track integration steps for detailed reporting
    const integrationSteps = [];
    const errors = [];

    // Validate auto-sync-manager
    const validationResult = validateAutoSyncManager(autoSyncManager);
    integrationSteps.push({
      step: 'validation',
      success: validationResult.valid,
      details: validationResult.details
    });

    if (!validationResult.valid) {
      console.warn('Auto sync manager validation failed:', validationResult.details);
      errors.push(`Validation failed: ${validationResult.details}`);
    }

    // Create compatibility layer if methods are missing
    if (typeof autoSyncManager.registerPreSyncHook !== 'function') {
      console.warn('Auto sync manager missing registerPreSyncHook method, creating compatibility layer');

      autoSyncManager.registerPreSyncHook = async (hookFn) => {
        // Store the hook function in the autoSyncManager object
        if (!autoSyncManager.preSyncHooks) {
          autoSyncManager.preSyncHooks = [];
        }
        autoSyncManager.preSyncHooks.push(hookFn);
        return true;
      };

      integrationSteps.push({
        step: 'compatibility_layer',
        success: true,
        details: 'Created registerPreSyncHook compatibility method'
      });
    }

    // Register storage optimization before sync with enhanced error handling
    try {
      await autoSyncManager.registerPreSyncHook(async (syncData) => {
        console.log('Pre-sync hook: Optimizing storage...');
        try {
          // Check storage status before optimization
          const storageInfo = storageManager ? storageManager.getStorageInfo() : { usagePercentage: 0, currentUsageMB: 0, quotaMB: 0 };
          console.log(`Current storage usage: ${storageInfo.usagePercentage.toFixed(2)}%`);

          // Only optimize if usage is above threshold or if high priority sync
          const isHighPriority = syncData && syncData.priority === 'high';
          const needsOptimization = storageInfo.usagePercentage > 70 || isHighPriority;

          if (needsOptimization) {
            const result = await optimizeStorage({
              force: isHighPriority,
              highPriority: isHighPriority
            });

            console.log(`Storage optimization ${result.success ? 'succeeded' : 'failed'}: ${
              result.success
                ? `freed ${result.freedSpaceMB?.toFixed(2) || 0}MB`
                : result.error
            }`);
          } else {
            console.log('Storage optimization skipped: usage below threshold and not high priority');
          }
        } catch (error) {
          console.error('Error in pre-sync storage optimization:', error);
          // Don't throw - we want the sync to continue even if optimization fails
        }
      });

      integrationSteps.push({
        step: 'pre_sync_hook',
        success: true
      });
    } catch (hookError) {
      console.error('Error registering pre-sync hook:', hookError);
      integrationSteps.push({
        step: 'pre_sync_hook',
        success: false,
        error: hookError.message
      });
      errors.push(`Pre-sync hook registration failed: ${hookError.message}`);
    }

    // Register post-sync cleanup
    try {
      if (typeof autoSyncManager.registerPostSyncHook === 'function') {
        await autoSyncManager.registerPostSyncHook(async (syncResult) => {
          console.log('Post-sync hook: Performing storage cleanup...');
          try {
            // If sync was successful, we can clean up temporary files
            if (syncResult && syncResult.success) {
              // Clean up any temporary files created during sync
              const tempDir = path.join(cacheDir, 'temp');
              if (fs.existsSync(tempDir)) {
                const tempFiles = await promisify(fs.readdir)(tempDir);
                for (const file of tempFiles) {
                  try {
                    await promisify(fs.unlink)(path.join(tempDir, file));
                  } catch (unlinkError) {
                    console.warn(`Error removing temp file ${file}:`, unlinkError);
                  }
                }
                console.log(`Cleaned up ${tempFiles.length} temporary files`);
              }
            }
          } catch (error) {
            console.error('Error in post-sync cleanup:', error);
          }
        });

        integrationSteps.push({
          step: 'post_sync_hook',
          success: true
        });
      }
    } catch (postHookError) {
      console.error('Error registering post-sync hook:', postHookError);
      integrationSteps.push({
        step: 'post_sync_hook',
        success: false,
        error: postHookError.message
      });
      // Not critical, so don't add to errors array
    }

    // Register event handlers for offline preparation with enhanced capabilities
    let eventHandlerRegistered = false;

    // Try direct 'on' method first
    if (typeof autoSyncManager.on === 'function') {
      try {
        autoSyncManager.on('offline_predicted', async (data) => {
          console.log('Offline mode predicted, preparing storage with enhanced capabilities...');
          try {
            const result = await prepareForOfflineOperation({
              offlineDurationHours: data.predictedDurationHours || 24,
              offlineRisk: data.offlineRisk || 0.5,
              highPriority: data.offlineRisk > 0.7,
              forcePrepare: data.forcePrepare || false
            });

            console.log(`Storage preparation for offline mode ${result.success ? 'succeeded' : 'failed'}: ${
              result.success
                ? `prepared for ${result.offlineDurationHours.toFixed(1)} hours with risk ${(result.offlineRisk * 100).toFixed(1)}%`
                : result.error
            }`);

            // Notify auto-sync-manager about preparation result
            if (typeof autoSyncManager.emit === 'function') {
              autoSyncManager.emit('storage_prepared', result);
            }
          } catch (error) {
            console.error('Error preparing storage for offline mode:', error);
          }
        });

        // Also register for storage critical events
        autoSyncManager.on('storage_critical', async (data) => {
          console.log('Storage critical event received, performing emergency optimization...');
          try {
            const result = await optimizeStorage({
              force: true,
              highPriority: true,
              emergency: true
            });

            console.log(`Emergency storage optimization ${result.success ? 'succeeded' : 'failed'}: ${
              result.success
                ? `freed ${result.freedSpaceMB?.toFixed(2) || 0}MB`
                : result.error
            }`);
          } catch (error) {
            console.error('Error in emergency storage optimization:', error);
          }
        });

        eventHandlerRegistered = true;
        integrationSteps.push({
          step: 'event_handlers',
          success: true,
          method: 'direct'
        });
      } catch (eventError) {
        console.error('Error registering direct event handlers:', eventError);
        integrationSteps.push({
          step: 'event_handlers_direct',
          success: false,
          error: eventError.message
        });
        errors.push(`Direct event handler registration failed: ${eventError.message}`);
      }
    }

    // Try syncEvents if direct method failed
    if (!eventHandlerRegistered && autoSyncManager.syncEvents && typeof autoSyncManager.syncEvents.on === 'function') {
      try {
        autoSyncManager.syncEvents.on('offline_predicted', async (data) => {
          console.log('Offline mode predicted (via syncEvents), preparing storage with enhanced capabilities...');
          try {
            const result = await prepareForOfflineOperation({
              offlineDurationHours: data.predictedDurationHours || 24,
              offlineRisk: data.offlineRisk || 0.5,
              highPriority: data.offlineRisk > 0.7,
              forcePrepare: data.forcePrepare || false
            });

            console.log(`Storage preparation for offline mode ${result.success ? 'succeeded' : 'failed'}: ${
              result.success
                ? `prepared for ${result.offlineDurationHours.toFixed(1)} hours with risk ${(result.offlineRisk * 100).toFixed(1)}%`
                : result.error
            }`);

            // Notify auto-sync-manager about preparation result
            if (typeof autoSyncManager.syncEvents.emit === 'function') {
              autoSyncManager.syncEvents.emit('storage_prepared', result);
            }
          } catch (error) {
            console.error('Error preparing storage for offline mode:', error);
          }
        });

        // Also register for storage critical events
        autoSyncManager.syncEvents.on('storage_critical', async (data) => {
          console.log('Storage critical event received (via syncEvents), performing emergency optimization...');
          try {
            const result = await optimizeStorage({
              force: true,
              highPriority: true,
              emergency: true
            });

            console.log(`Emergency storage optimization ${result.success ? 'succeeded' : 'failed'}: ${
              result.success
                ? `freed ${result.freedSpaceMB?.toFixed(2) || 0}MB`
                : result.error
            }`);
          } catch (error) {
            console.error('Error in emergency storage optimization:', error);
          }
        });

        eventHandlerRegistered = true;
        integrationSteps.push({
          step: 'event_handlers',
          success: true,
          method: 'syncEvents'
        });
      } catch (syncEventsError) {
        console.error('Error registering syncEvents event handlers:', syncEventsError);
        integrationSteps.push({
          step: 'event_handlers_syncEvents',
          success: false,
          error: syncEventsError.message
        });
        errors.push(`SyncEvents handler registration failed: ${syncEventsError.message}`);
      }
    }

    if (!eventHandlerRegistered) {
      console.warn('Auto sync manager missing event subscription method, offline prediction events will not be handled');
      integrationSteps.push({
        step: 'event_handlers',
        success: false,
        reason: 'no_subscription_method'
      });
      errors.push('No event subscription method available');
    }

    // Return detailed integration result
    return {
      success: errors.length === 0,
      integrated: true,
      steps: integrationSteps,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error integrating with auto-sync-manager:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * Validate auto-sync-manager for integration
 *
 * @param {Object} autoSyncManager - Auto sync manager instance to validate
 * @returns {Object} - Validation result
 */
function validateAutoSyncManager(autoSyncManager) {
  const result = {
    valid: true,
    details: {}
  };

  // Check for required methods
  const requiredMethods = ['registerPreSyncHook', 'on', 'emit'];
  const missingMethods = [];

  for (const method of requiredMethods) {
    if (typeof autoSyncManager[method] !== 'function') {
      missingMethods.push(method);
    }
  }

  // Check for syncEvents as fallback
  let hasSyncEvents = false;
  if (autoSyncManager.syncEvents) {
    hasSyncEvents = true;

    // Check syncEvents methods
    const syncEventsMethods = ['on', 'emit'];
    const missingSyncEventsMethods = [];

    for (const method of syncEventsMethods) {
      if (typeof autoSyncManager.syncEvents[method] !== 'function') {
        missingSyncEventsMethods.push(method);
      }
    }

    if (missingSyncEventsMethods.length > 0) {
      result.details.missingSyncEventsMethods = missingSyncEventsMethods;
    }
  }

  // Set validation result
  if (missingMethods.length > 0) {
    result.details.missingMethods = missingMethods;

    // Only invalid if both direct methods and syncEvents are missing
    if (!hasSyncEvents || (hasSyncEvents && result.details.missingSyncEventsMethods &&
        result.details.missingSyncEventsMethods.length > 0)) {
      result.valid = false;
    }
  }

  return result;
}

// Export the module
module.exports = {
  initialize,
  optimizeStorage,
  recordAccess,
  getPriorityScore,
  analyzeStoragePatterns,
  prepareForOfflineOperation,
  integrateWithAutoSyncManager,
  compressFiles
};
