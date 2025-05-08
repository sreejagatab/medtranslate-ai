/**
 * Auto Sync Manager for MedTranslate AI Edge Application
 *
 * This module provides enhanced synchronization capabilities with:
 * - Intelligent scheduling based on network patterns and usage patterns
 * - Advanced conflict resolution strategies
 * - Network-aware sync strategies (bandwidth optimization, prioritization)
 * - Integration with storage-optimizer for efficient storage management
 * - ML-based prediction for optimal sync timing
 * - Adaptive retry mechanisms
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const { cacheManager } = require('./cache');
const networkMonitor = require('./network-monitor');

// Import storage manager if available
let storageManager;
try {
  storageManager = require('./utils/storage-manager');
  console.log('Storage manager loaded successfully for auto-sync');
} catch (error) {
  console.warn('Storage manager not available for auto-sync:', error.message);
  storageManager = null;
}

// Import storage optimizer if available
let storageOptimizer;
try {
  storageOptimizer = require('./utils/storage-optimizer');
  console.log('Storage optimizer loaded successfully for auto-sync');
} catch (error) {
  console.warn('Storage optimizer not available for auto-sync:', error.message);
  storageOptimizer = null;
}

// We'll load predictiveCache later to avoid circular dependencies
let predictiveCache = null;

// Configuration
const CONFIG_DIR = process.env.CONFIG_DIR || '../../config';
const SYNC_DIR = process.env.SYNC_DIR || '../../sync';
const CONFLICT_DIR = process.env.CONFLICT_DIR || '../../conflicts';
const AUTO_SYNC_CONFIG_FILE = process.env.AUTO_SYNC_CONFIG_FILE || path.join(CONFIG_DIR, 'auto-sync-config.json');
const SYNC_METRICS_FILE = process.env.SYNC_METRICS_FILE || path.join(CONFIG_DIR, 'sync-metrics.json');
const SYNC_HISTORY_FILE = process.env.SYNC_HISTORY_FILE || path.join(CONFIG_DIR, 'sync-history.json');
const QUALITY_METRICS_FILE = process.env.QUALITY_METRICS_FILE || path.join(CONFIG_DIR, 'quality-metrics.json');
const ANALYTICS_DIR = process.env.ANALYTICS_DIR || path.join(CONFIG_DIR, 'analytics');
const TRENDS_FILE = process.env.TRENDS_FILE || path.join(ANALYTICS_DIR, 'trends.json');
const ANOMALIES_FILE = process.env.ANOMALIES_FILE || path.join(ANALYTICS_DIR, 'anomalies.json');
const FEEDBACK_DIR = process.env.FEEDBACK_DIR || '../../feedback';
const DEVICE_ID = process.env.DEVICE_ID || 'dev-edge-device';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4001';

// Advanced analytics configuration
const TREND_ANALYSIS_INTERVAL = parseInt(process.env.TREND_ANALYSIS_INTERVAL || '86400000'); // 24 hours
const MAX_TREND_DATA_POINTS = parseInt(process.env.MAX_TREND_DATA_POINTS || '90'); // 90 days of data
const ANOMALY_DETECTION_INTERVAL = parseInt(process.env.ANOMALY_DETECTION_INTERVAL || '43200000'); // 12 hours
const CONFIDENCE_ANOMALY_THRESHOLD = parseFloat(process.env.CONFIDENCE_ANOMALY_THRESHOLD || '0.2'); // 20% deviation
const FEEDBACK_ANOMALY_THRESHOLD = parseFloat(process.env.FEEDBACK_ANOMALY_THRESHOLD || '0.3'); // 30% deviation
const MIN_DATA_POINTS_FOR_ANALYSIS = parseInt(process.env.MIN_DATA_POINTS_FOR_ANALYSIS || '10'); // Minimum data points needed

// Battery level (will be updated if available)
let batteryLevel = 100;

// Default sync intervals
const DEFAULT_SYNC_INTERVAL = parseInt(process.env.DEFAULT_SYNC_INTERVAL || '300000', 10); // 5 minutes
const MIN_SYNC_INTERVAL = parseInt(process.env.MIN_SYNC_INTERVAL || '60000', 10); // 1 minute
const MAX_SYNC_INTERVAL = parseInt(process.env.MAX_SYNC_INTERVAL || '3600000', 10); // 1 hour

// Retry configuration
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '5');
const RETRY_DELAY_BASE = parseInt(process.env.RETRY_DELAY_BASE || '5000'); // 5 seconds

// Priority levels for sync items
const SYNC_PRIORITY_LEVELS = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
};

// Sync state
let isInitialized = false;
let syncInProgress = false;
let lastSyncTime = 0;
let lastSyncStatus = 'never';
let syncQueue = [];
let syncEnabled = true;
let syncInterval = null;
let currentSyncInterval = DEFAULT_SYNC_INTERVAL;
let retryCount = 0;
let syncHistory = [];
let preSyncHooks = [];
let postSyncHooks = [];
let syncMetrics = {
  totalSyncs: 0,
  successfulSyncs: 0,
  failedSyncs: 0,
  itemsSynced: 0,
  bytesUploaded: 0,
  bytesDownloaded: 0,
  conflicts: 0,
  conflictsResolved: 0,
  lastSync: null,
  averageSyncTime: 0,
  syncTimes: []
};

// Translation quality metrics
let qualityMetrics = {
  modelPerformance: {}, // Performance by model
  contextPerformance: {}, // Performance by medical context
  languagePairPerformance: {}, // Performance by language pair
  feedbackStats: {
    positive: 0,
    negative: 0,
    byContext: {},
    byModel: {}
  },
  culturalAdaptation: {
    regionSpecificTerms: {},
    adaptationSuccessRate: 0,
    regionMismatches: 0
  },
  // Advanced analytics
  trends: {
    confidenceOverTime: [], // Confidence scores over time
    feedbackOverTime: [], // Feedback trends over time
    qualityByHour: Array(24).fill(0), // Quality by hour of day
    qualityByDay: Array(7).fill(0), // Quality by day of week
    anomalies: [], // Detected anomalies
    modelPerformanceTrend: {}, // Model performance trends
    contextPerformanceTrend: {}, // Context performance trends
    languagePairPerformanceTrend: {} // Language pair performance trends
  },
  // Anomaly detection
  anomalyDetection: {
    confidenceThreshold: 0.2, // Threshold for confidence score anomalies
    feedbackThreshold: 0.3, // Threshold for feedback anomalies
    lastAnalysisTime: 0,
    baselineConfidence: 0, // Baseline confidence score
    baselineFeedback: 0, // Baseline positive feedback rate
    anomalyHistory: [] // History of detected anomalies
  },
  lastUpdated: 0
};

// Create event emitter
const syncEvents = new EventEmitter();

/**
 * Get the current status of the auto-sync manager
 *
 * @returns {Object} - Current status
 */
function getStatus() {
  try {
    // Get current offline periods
    const currentOfflinePeriod = syncMetrics.offlinePeriods && syncMetrics.offlinePeriods.length > 0
      ? syncMetrics.offlinePeriods[syncMetrics.offlinePeriods.length - 1]
      : null;

    // Calculate offline risk
    let offlineRisk = 0;
    if (predictiveCache && typeof predictiveCache.getOfflineRisk === 'function') {
      try {
        offlineRisk = predictiveCache.getOfflineRisk();
      } catch (error) {
        console.warn('Error getting offline risk from predictive cache:', error.message);
      }
    }

    // Get storage optimizer status if available
    let storageStatus = {};
    if (storageOptimizer && typeof storageOptimizer.getStorageInfo === 'function') {
      try {
        storageStatus = storageOptimizer.getStorageInfo();
      } catch (error) {
        console.warn('Error getting storage info from storage optimizer:', error.message);
      }
    }

    return {
      initialized: isInitialized,
      syncEnabled,
      syncInProgress,
      lastSyncTime: lastSyncTime ? new Date(lastSyncTime).toISOString() : null,
      lastSyncStatus,
      currentSyncInterval,
      retryCount,
      metrics: {
        totalSyncs: syncMetrics.totalSyncs,
        successfulSyncs: syncMetrics.successfulSyncs,
        failedSyncs: syncMetrics.failedSyncs,
        itemsSynced: syncMetrics.itemsSynced,
        conflicts: syncMetrics.conflicts,
        conflictsResolved: syncMetrics.conflictsResolved,
        averageSyncTime: syncMetrics.averageSyncTime
      },
      offlineStatus: {
        currentlyOffline: currentOfflinePeriod && !currentOfflinePeriod.endTime,
        offlineRisk,
        offlinePeriodStarted: currentOfflinePeriod ? new Date(currentOfflinePeriod.startTime).toISOString() : null,
        offlineDuration: currentOfflinePeriod ? (Date.now() - currentOfflinePeriod.startTime) : 0,
        reconnectionAttempts: currentOfflinePeriod ? currentOfflinePeriod.reconnectionAttempts : 0
      },
      storage: storageStatus,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting auto-sync manager status:', error);
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Initialize the auto sync manager
 *
 * @param {Object} options - Initialization options
 * @returns {Promise<Object>} - Initialization result
 */
async function initialize(options = {}) {
  try {
    console.log('Initializing auto sync manager...');

    // Create required directories
    for (const dir of [CONFIG_DIR, SYNC_DIR, CONFLICT_DIR, FEEDBACK_DIR, ANALYTICS_DIR]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    }

    // Load configuration
    await loadConfig();

    // Load sync history
    await loadSyncHistory();

    // Load sync metrics
    await loadSyncMetrics();

    // Load quality metrics
    await loadQualityMetrics();

    // Load trend data
    await loadTrendData();

    // Load anomaly data
    await loadAnomalyData();

    // Start sync interval with intelligent scheduling
    if (syncEnabled) {
      startSyncInterval();
    }

    // Start trend analysis interval
    startTrendAnalysisInterval();

    // Start anomaly detection interval
    startAnomalyDetectionInterval();

    // Initialize and integrate with storage optimizer if available
    if (storageOptimizer) {
      try {
        console.log('Initializing storage optimizer for auto-sync-manager integration...');

        // Initialize with timeout to prevent hanging
        const initPromise = storageOptimizer.initialize();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Storage optimizer initialization timed out after 30 seconds')), 30000)
        );

        // Race the initialization against the timeout
        await Promise.race([initPromise, timeoutPromise]);

        // Integrate with auto-sync-manager
        const integrationResult = await storageOptimizer.integrateWithAutoSyncManager(module.exports);

        if (integrationResult && integrationResult.success) {
          console.log('Storage optimizer integrated successfully with auto-sync-manager');

          // Register additional event handlers for better integration
          if (typeof syncEvents.on === 'function') {
            // Register storage optimization events
            syncEvents.on('storage_critical', async (data) => {
              console.log('Critical storage event detected, optimizing storage before sync');
              try {
                await storageOptimizer.optimizeStorage({ force: true });
              } catch (error) {
                console.error('Error optimizing storage during critical event:', error);
              }
            });

            // Register pre-sync storage check
            syncEvents.on('pre_sync', async (data) => {
              console.log('Pre-sync event: checking storage status');
              try {
                const storageInfo = storageOptimizer.getStorageInfo();
                if (storageInfo.usagePercentage > 90) {
                  console.log('Storage usage high (>90%), optimizing before sync');
                  await storageOptimizer.optimizeStorage({ force: true });
                }
              } catch (error) {
                console.error('Error checking storage during pre-sync event:', error);
              }
            });
          }
        } else {
          console.warn('Storage optimizer integration returned unsuccessful result:', integrationResult);
        }
      } catch (error) {
        console.error('Error integrating with storage optimizer:', error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
    } else {
      console.warn('Storage optimizer not available for auto-sync-manager integration');
    }

    // Load predictive cache after initialization to avoid circular dependencies
    try {
      console.log('Loading predictive cache for auto-sync-manager integration...');
      predictiveCache = require('./predictive-cache');

      // Check if predictive cache is properly loaded
      if (!predictiveCache) {
        throw new Error('Predictive cache module loaded but returned null or undefined');
      }

      // Check if required methods exist
      if (typeof predictiveCache.initialize !== 'function') {
        throw new Error('Predictive cache missing initialize method');
      }

      console.log('Predictive cache loaded successfully for auto-sync after initialization');

      // Register additional event handlers for better integration
      if (typeof syncEvents.on === 'function' && predictiveCache) {
        // Register offline prediction events from predictive cache
        if (typeof predictiveCache.on === 'function') {
          predictiveCache.on('offline_predicted', async (data) => {
            console.log('Offline period predicted by predictive cache, preparing...');
            syncEvents.emit('offline_predicted', data);
            await prepareForOfflineOperation();
          });
        }

        // Register sync completion events to update predictive cache
        syncEvents.on('sync_complete', async (data) => {
          if (predictiveCache && typeof predictiveCache.updatePredictionModel === 'function') {
            console.log('Sync completed, updating prediction model...');
            try {
              await predictiveCache.updatePredictionModel();
            } catch (error) {
              console.error('Error updating prediction model after sync:', error);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error loading predictive cache for auto-sync:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      predictiveCache = null;
    }

    isInitialized = true;
    console.log('Auto sync manager initialized successfully with advanced analytics');
    return { success: true };
  } catch (error) {
    console.error('Error initializing auto sync manager:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load quality metrics
 *
 * @returns {Promise<void>}
 */
async function loadQualityMetrics() {
  try {
    if (fs.existsSync(QUALITY_METRICS_FILE)) {
      qualityMetrics = JSON.parse(fs.readFileSync(QUALITY_METRICS_FILE, 'utf8'));
      console.log('Loaded translation quality metrics');

      // Ensure advanced analytics structures exist
      if (!qualityMetrics.trends) {
        qualityMetrics.trends = {
          confidenceOverTime: [],
          feedbackOverTime: [],
          qualityByHour: Array(24).fill(0),
          qualityByDay: Array(7).fill(0),
          anomalies: [],
          modelPerformanceTrend: {},
          contextPerformanceTrend: {},
          languagePairPerformanceTrend: {}
        };
      }

      if (!qualityMetrics.anomalyDetection) {
        qualityMetrics.anomalyDetection = {
          confidenceThreshold: CONFIDENCE_ANOMALY_THRESHOLD,
          feedbackThreshold: FEEDBACK_ANOMALY_THRESHOLD,
          lastAnalysisTime: 0,
          baselineConfidence: 0,
          baselineFeedback: 0,
          anomalyHistory: []
        };
      }
    } else {
      // Initialize with default values if file doesn't exist
      qualityMetrics = {
        modelPerformance: {},
        contextPerformance: {},
        languagePairPerformance: {},
        feedbackStats: {
          positive: 0,
          negative: 0,
          byContext: {},
          byModel: {}
        },
        culturalAdaptation: {
          regionSpecificTerms: {},
          adaptationSuccessRate: 0,
          regionMismatches: 0
        },
        trends: {
          confidenceOverTime: [],
          feedbackOverTime: [],
          qualityByHour: Array(24).fill(0),
          qualityByDay: Array(7).fill(0),
          anomalies: [],
          modelPerformanceTrend: {},
          contextPerformanceTrend: {},
          languagePairPerformanceTrend: {}
        },
        anomalyDetection: {
          confidenceThreshold: CONFIDENCE_ANOMALY_THRESHOLD,
          feedbackThreshold: FEEDBACK_ANOMALY_THRESHOLD,
          lastAnalysisTime: 0,
          baselineConfidence: 0,
          baselineFeedback: 0,
          anomalyHistory: []
        },
        lastUpdated: Date.now()
      };

      // Save default metrics
      await saveQualityMetrics();
    }
  } catch (error) {
    console.error('Error loading quality metrics:', error);
  }
}

/**
 * Load trend data
 *
 * @returns {Promise<void>}
 */
async function loadTrendData() {
  try {
    if (fs.existsSync(TRENDS_FILE)) {
      const trendData = JSON.parse(fs.readFileSync(TRENDS_FILE, 'utf8'));

      // Update quality metrics with trend data
      qualityMetrics.trends = {
        ...qualityMetrics.trends,
        ...trendData
      };

      console.log(`Loaded trend data with ${trendData.confidenceOverTime?.length || 0} confidence data points`);
    } else {
      // If no trend file exists, initialize with empty data
      // (trends structure is already initialized in qualityMetrics)

      // Save empty trend data
      await saveTrendData();
    }
  } catch (error) {
    console.error('Error loading trend data:', error);
  }
}

/**
 * Save trend data
 *
 * @returns {Promise<void>}
 */
async function saveTrendData() {
  try {
    // Ensure analytics directory exists
    if (!fs.existsSync(ANALYTICS_DIR)) {
      fs.mkdirSync(ANALYTICS_DIR, { recursive: true });
    }

    // Save trend data to file
    fs.writeFileSync(TRENDS_FILE, JSON.stringify(qualityMetrics.trends, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving trend data:', error);
  }
}

/**
 * Load anomaly data
 *
 * @returns {Promise<void>}
 */
async function loadAnomalyData() {
  try {
    if (fs.existsSync(ANOMALIES_FILE)) {
      const anomalyData = JSON.parse(fs.readFileSync(ANOMALIES_FILE, 'utf8'));

      // Update quality metrics with anomaly data
      qualityMetrics.anomalyDetection = {
        ...qualityMetrics.anomalyDetection,
        ...anomalyData
      };

      console.log(`Loaded anomaly data with ${anomalyData.anomalyHistory?.length || 0} anomaly records`);
    } else {
      // If no anomaly file exists, initialize with empty data
      // (anomalyDetection structure is already initialized in qualityMetrics)

      // Save empty anomaly data
      await saveAnomalyData();
    }
  } catch (error) {
    console.error('Error loading anomaly data:', error);
  }
}

/**
 * Save anomaly data
 *
 * @returns {Promise<void>}
 */
async function saveAnomalyData() {
  try {
    // Ensure analytics directory exists
    if (!fs.existsSync(ANALYTICS_DIR)) {
      fs.mkdirSync(ANALYTICS_DIR, { recursive: true });
    }

    // Save anomaly data to file
    fs.writeFileSync(ANOMALIES_FILE, JSON.stringify(qualityMetrics.anomalyDetection, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving anomaly data:', error);
  }
}

/**
 * Save quality metrics with optimized storage
 *
 * @returns {Promise<void>}
 */
async function saveQualityMetrics() {
  try {
    // Update timestamp
    qualityMetrics.lastUpdated = Date.now();

    // Implement incremental updates to avoid writing the entire file each time
    const shouldDoFullSave = qualityMetrics.fullSaveNeeded || !fs.existsSync(QUALITY_METRICS_FILE);

    if (shouldDoFullSave) {
      // Full save - compress before writing to reduce file size
      const compressedMetrics = compressMetrics(qualityMetrics);
      fs.writeFileSync(QUALITY_METRICS_FILE, JSON.stringify(compressedMetrics, null, 2), 'utf8');
      console.log('Performed full save of quality metrics');

      // Reset full save flag
      qualityMetrics.fullSaveNeeded = false;

      // Create a backup every 10 full saves
      if (qualityMetrics.saveCount % 10 === 0) {
        const backupPath = path.join(CONFIG_DIR, `quality-metrics-backup-${Date.now()}.json`);
        fs.writeFileSync(backupPath, JSON.stringify(compressedMetrics, null, 2), 'utf8');
        console.log(`Created quality metrics backup: ${backupPath}`);

        // Clean up old backups (keep only the last 5)
        cleanupOldBackups();
      }
    } else {
      // Incremental save - only update the delta metrics file
      const deltaPath = path.join(CONFIG_DIR, 'quality-metrics-delta.json');

      // Load existing delta if available
      let delta = {};
      if (fs.existsSync(deltaPath)) {
        try {
          delta = JSON.parse(fs.readFileSync(deltaPath, 'utf8'));
        } catch (error) {
          console.warn('Error reading delta metrics, creating new delta file:', error);
        }
      }

      // Update delta with new metrics
      delta.lastUpdated = qualityMetrics.lastUpdated;
      delta.updates = (delta.updates || 0) + 1;

      // Add recent changes to delta
      if (qualityMetrics.recentChanges) {
        delta.changes = delta.changes || [];
        delta.changes.push(...qualityMetrics.recentChanges);

        // Limit the number of changes stored
        if (delta.changes.length > 1000) {
          delta.changes = delta.changes.slice(-1000);
        }

        // Clear recent changes
        qualityMetrics.recentChanges = [];
      }

      // Write delta file
      fs.writeFileSync(deltaPath, JSON.stringify(delta, null, 2), 'utf8');

      // If delta gets too large, trigger a full save next time
      if (delta.updates > 50 || (delta.changes && delta.changes.length > 500)) {
        qualityMetrics.fullSaveNeeded = true;
        console.log('Delta file getting large, scheduling full metrics save');
      }
    }

    // Increment save counter
    qualityMetrics.saveCount = (qualityMetrics.saveCount || 0) + 1;
  } catch (error) {
    console.error('Error saving quality metrics:', error);
  }
}

/**
 * Compress metrics to reduce storage size
 *
 * @param {Object} metrics - Quality metrics to compress
 * @returns {Object} - Compressed metrics
 */
function compressMetrics(metrics) {
  try {
    // Create a deep copy to avoid modifying the original
    const compressed = JSON.parse(JSON.stringify(metrics));

    // Compress model performance data
    if (compressed.modelPerformance) {
      for (const [modelId, modelData] of Object.entries(compressed.modelPerformance)) {
        // Round floating point values to 3 decimal places
        if (typeof modelData.averageConfidence === 'number') {
          modelData.averageConfidence = parseFloat(modelData.averageConfidence.toFixed(3));
        }

        // Compress context data
        if (modelData.byContext) {
          for (const contextData of Object.values(modelData.byContext)) {
            if (typeof contextData.averageConfidence === 'number') {
              contextData.averageConfidence = parseFloat(contextData.averageConfidence.toFixed(3));
            }
          }
        }

        // Compress language pair data
        if (modelData.byLanguagePair) {
          for (const langPairData of Object.values(modelData.byLanguagePair)) {
            if (typeof langPairData.averageConfidence === 'number') {
              langPairData.averageConfidence = parseFloat(langPairData.averageConfidence.toFixed(3));
            }
          }
        }
      }
    }

    // Compress context performance data
    if (compressed.contextPerformance) {
      for (const [context, contextData] of Object.entries(compressed.contextPerformance)) {
        // Round floating point values
        if (typeof contextData.averageConfidence === 'number') {
          contextData.averageConfidence = parseFloat(contextData.averageConfidence.toFixed(3));
        }

        // Compress model data
        if (contextData.byModel) {
          for (const modelData of Object.values(contextData.byModel)) {
            if (typeof modelData.averageConfidence === 'number') {
              modelData.averageConfidence = parseFloat(modelData.averageConfidence.toFixed(3));
            }
          }
        }
      }
    }

    // Compress language pair performance data
    if (compressed.languagePairPerformance) {
      for (const [langPair, langPairData] of Object.entries(compressed.languagePairPerformance)) {
        // Round floating point values
        if (typeof langPairData.averageConfidence === 'number') {
          langPairData.averageConfidence = parseFloat(langPairData.averageConfidence.toFixed(3));
        }

        // Compress context data
        if (langPairData.byContext) {
          for (const contextData of Object.values(langPairData.byContext)) {
            if (typeof contextData.averageConfidence === 'number') {
              contextData.averageConfidence = parseFloat(contextData.averageConfidence.toFixed(3));
            }
          }
        }

        // Compress model data
        if (langPairData.byModel) {
          for (const modelData of Object.values(langPairData.byModel)) {
            if (typeof modelData.averageConfidence === 'number') {
              modelData.averageConfidence = parseFloat(modelData.averageConfidence.toFixed(3));
            }
          }
        }
      }
    }

    // Compress cultural adaptation data
    if (compressed.culturalAdaptation) {
      if (typeof compressed.culturalAdaptation.adaptationSuccessRate === 'number') {
        compressed.culturalAdaptation.adaptationSuccessRate =
          parseFloat(compressed.culturalAdaptation.adaptationSuccessRate.toFixed(3));
      }
    }

    // Remove temporary fields used for tracking
    delete compressed.recentChanges;
    delete compressed.fullSaveNeeded;
    delete compressed.saveCount;

    return compressed;
  } catch (error) {
    console.error('Error compressing metrics:', error);
    return metrics; // Return original on error
  }
}

/**
 * Clean up old quality metrics backups
 */
function cleanupOldBackups() {
  try {
    const backupPattern = /quality-metrics-backup-\d+\.json/;
    const files = fs.readdirSync(CONFIG_DIR)
      .filter(file => backupPattern.test(file))
      .map(file => ({
        name: file,
        path: path.join(CONFIG_DIR, file),
        time: parseInt(file.match(/\d+/)[0], 10)
      }))
      .sort((a, b) => b.time - a.time); // Sort newest first

    // Keep only the 5 newest backups
    if (files.length > 5) {
      for (let i = 5; i < files.length; i++) {
        fs.unlinkSync(files[i].path);
        console.log(`Removed old metrics backup: ${files[i].name}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
  }
}

/**
 * Load auto sync configuration
 *
 * @returns {Promise<void>}
 */
async function loadConfig() {
  try {
    if (fs.existsSync(AUTO_SYNC_CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(AUTO_SYNC_CONFIG_FILE, 'utf8'));

      syncEnabled = config.enabled !== false;
      lastSyncTime = config.lastSyncTime || 0;
      lastSyncStatus = config.lastSyncStatus || 'never';
      currentSyncInterval = config.syncInterval || DEFAULT_SYNC_INTERVAL;

      console.log(`Loaded auto sync configuration: enabled=${syncEnabled}, lastSync=${new Date(lastSyncTime).toISOString()}, interval=${currentSyncInterval}ms`);
    } else {
      // Create default configuration
      const defaultConfig = {
        enabled: true,
        lastSyncTime: 0,
        lastSyncStatus: 'never',
        syncInterval: DEFAULT_SYNC_INTERVAL,
        deviceId: DEVICE_ID,
        adaptiveScheduling: true,
        conflictResolution: {
          strategy: 'smart', // 'local', 'remote', 'merge', 'smart'
          prioritizeContext: true
        },
        networkAware: true,
        storageOptimization: true
      };

      fs.writeFileSync(AUTO_SYNC_CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf8');
      console.log('Created default auto sync configuration');
    }
  } catch (error) {
    console.error('Error loading auto sync configuration:', error);
  }
}

/**
 * Save auto sync configuration
 *
 * @returns {Promise<void>}
 */
async function saveConfig() {
  try {
    const config = {
      enabled: syncEnabled,
      lastSyncTime,
      lastSyncStatus,
      syncInterval: currentSyncInterval,
      deviceId: DEVICE_ID,
      adaptiveScheduling: true,
      conflictResolution: {
        strategy: 'smart',
        prioritizeContext: true
      },
      networkAware: true,
      storageOptimization: true
    };

    fs.writeFileSync(AUTO_SYNC_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving auto sync configuration:', error);
  }
}

/**
 * Load sync history
 *
 * @returns {Promise<void>}
 */
async function loadSyncHistory() {
  try {
    if (fs.existsSync(SYNC_HISTORY_FILE)) {
      syncHistory = JSON.parse(fs.readFileSync(SYNC_HISTORY_FILE, 'utf8'));
      console.log(`Loaded ${syncHistory.length} sync history entries`);
    }
  } catch (error) {
    console.error('Error loading sync history:', error);
    syncHistory = [];
  }
}

/**
 * Save sync history
 *
 * @returns {Promise<void>}
 */
async function saveSyncHistory() {
  try {
    // Limit history size to 1000 entries
    if (syncHistory.length > 1000) {
      syncHistory = syncHistory.slice(-1000);
    }

    fs.writeFileSync(SYNC_HISTORY_FILE, JSON.stringify(syncHistory, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving sync history:', error);
  }
}

/**
 * Load sync metrics
 *
 * @returns {Promise<void>}
 */
async function loadSyncMetrics() {
  try {
    if (fs.existsSync(SYNC_METRICS_FILE)) {
      syncMetrics = JSON.parse(fs.readFileSync(SYNC_METRICS_FILE, 'utf8'));
      console.log('Loaded sync metrics');
    }
  } catch (error) {
    console.error('Error loading sync metrics:', error);
  }
}

/**
 * Save sync metrics
 *
 * @returns {Promise<void>}
 */
async function saveSyncMetrics() {
  try {
    fs.writeFileSync(SYNC_METRICS_FILE, JSON.stringify(syncMetrics, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving sync metrics:', error);
  }
}

/**
 * Start the sync interval with intelligent scheduling
 */
function startSyncInterval() {
  console.log(`Starting auto sync interval (initial: ${currentSyncInterval}ms)`);

  // Clear existing interval if any
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  // Perform initial sync after a short delay
  setTimeout(() => {
    syncWithCloud();
  }, 5000);

  // Use a function for scheduling to allow adaptive timing
  const scheduleNextSync = (delay) => {
    return setTimeout(async () => {
      try {
        // Check if sync is enabled and not in progress
        if (syncEnabled && !syncInProgress) {
          // Check if we're in offline mode
          const networkStatus = networkMonitor.getNetworkStatus();
          if (!networkStatus.online) {
            console.log('Device is offline, entering enhanced offline mode');
            await handleEnhancedOfflineMode();
          } else {
            // Check connection to cloud
            const connectionStatus = await testConnection();
            if (!connectionStatus.connected) {
              console.log(`Connection issue detected: ${connectionStatus.reason}`);

              // Check if we should enter offline mode
              const shouldEnterOfflineMode = await shouldTransitionToOfflineMode(connectionStatus);
              if (shouldEnterOfflineMode) {
                console.log('Entering enhanced offline mode due to persistent connection issues');
                await handleEnhancedOfflineMode();
              } else {
                // Just adjust the sync interval based on network conditions
                await adjustSyncInterval();
              }
            } else {
              // Check if we should adjust the sync interval based on network conditions and predictions
              await adjustSyncIntervalWithPredictions(connectionStatus);

              // Perform sync
              await syncWithCloud();
            }
          }
        }

        // Schedule next sync
        syncInterval = scheduleNextSync(currentSyncInterval);
      } catch (error) {
        console.error('Error in scheduled sync:', error);
        // Schedule next sync even if there was an error
        syncInterval = scheduleNextSync(currentSyncInterval);
      }
    }, delay);
  };

  // Start the scheduling
  syncInterval = scheduleNextSync(currentSyncInterval);
}

/**
 * Determine if we should transition to offline mode based on connection issues
 *
 * @param {Object} connectionStatus - Current connection status
 * @returns {Promise<boolean>} - Whether to enter offline mode
 */
async function shouldTransitionToOfflineMode(connectionStatus) {
  try {
    // Check if we have persistent connection issues
    const now = Date.now();

    // Add current connection issue to history
    if (!syncMetrics.connectionIssues) {
      syncMetrics.connectionIssues = [];
    }

    syncMetrics.connectionIssues.push({
      timestamp: now,
      reason: connectionStatus.reason,
      details: connectionStatus.details
    });

    // Keep only the last 20 connection issues
    if (syncMetrics.connectionIssues.length > 20) {
      syncMetrics.connectionIssues.shift();
    }

    // Check for persistent issues in the last 15 minutes
    const recentIssues = syncMetrics.connectionIssues.filter(
      issue => now - issue.timestamp < 15 * 60 * 1000
    );

    // If we have 3 or more recent issues, consider entering offline mode
    if (recentIssues.length >= 3) {
      console.log(`Detected ${recentIssues.length} connection issues in the last 15 minutes`);

      // Check with predictive cache for offline risk assessment
      if (predictiveCache) {
        try {
          const predictions = await predictiveCache.getPredictions();
          if (predictions.offlinePredicted) {
            console.log(`Predictive cache confirms high offline risk: ${(predictions.offlineRisk * 100).toFixed(1)}%`);
            return true;
          }
        } catch (error) {
          console.warn('Error getting predictions for offline mode decision:', error);
        }
      }

      // If we have 5 or more recent issues, enter offline mode regardless of predictions
      if (recentIssues.length >= 5) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error determining offline mode transition:', error);
    return false;
  }
}

/**
 * Handle enhanced offline mode
 *
 * @returns {Promise<void>}
 */
async function handleEnhancedOfflineMode() {
  try {
    // Update offline status
    if (!syncMetrics.offlinePeriods) {
      syncMetrics.offlinePeriods = [];
    }

    // Check if we're already tracking an offline period
    const currentOfflinePeriod = syncMetrics.offlinePeriods.find(period => !period.endTime);

    if (!currentOfflinePeriod) {
      // Start a new offline period
      syncMetrics.offlinePeriods.push({
        startTime: Date.now(),
        detectionMethod: 'auto',
        syncAttempts: 0,
        reconnectionAttempts: 0
      });

      console.log('Started tracking new offline period');

      // Emit offline event
      syncEvents.emit('offline_started', {
        timestamp: Date.now(),
        predicted: false
      });

      // Prepare for offline operation
      await prepareForOfflineOperation();
    } else {
      // Update existing offline period
      currentOfflinePeriod.lastChecked = Date.now();
      currentOfflinePeriod.duration = currentOfflinePeriod.lastChecked - currentOfflinePeriod.startTime;

      // Attempt reconnection periodically
      if (!currentOfflinePeriod.lastReconnectionAttempt ||
          Date.now() - currentOfflinePeriod.lastReconnectionAttempt > 5 * 60 * 1000) { // Every 5 minutes

        currentOfflinePeriod.reconnectionAttempts++;
        currentOfflinePeriod.lastReconnectionAttempt = Date.now();

        console.log(`Attempting reconnection (attempt ${currentOfflinePeriod.reconnectionAttempts})`);

        // Test connection
        const connectionStatus = await testConnection();
        if (connectionStatus.connected) {
          console.log('Reconnection successful, exiting offline mode');

          // End offline period
          currentOfflinePeriod.endTime = Date.now();
          currentOfflinePeriod.totalDuration = currentOfflinePeriod.endTime - currentOfflinePeriod.startTime;

          // Emit online event
          syncEvents.emit('offline_ended', {
            timestamp: Date.now(),
            duration: currentOfflinePeriod.totalDuration,
            reconnectionAttempts: currentOfflinePeriod.reconnectionAttempts
          });

          // Trigger immediate sync
          setTimeout(() => syncWithCloud(), 1000);
        } else {
          console.log(`Reconnection failed: ${connectionStatus.reason}`);
        }
      }
    }

    // Save metrics
    await saveSyncMetrics();
  } catch (error) {
    console.error('Error handling offline mode:', error);
  }
}

/**
 * Prepare for offline operation with enhanced error handling and integration
 *
 * @param {Object} options - Options for offline preparation
 * @param {number} options.offlineDurationHours - Predicted offline duration in hours
 * @param {boolean} options.forcePrepare - Force preparation even if not needed
 * @param {boolean} options.highPriority - High priority preparation (more aggressive)
 * @returns {Promise<Object>} - Preparation result
 */
async function prepareForOfflineOperation(options = {}) {
  try {
    console.log('Preparing for offline operation with enhanced capabilities...');

    // Start timing for performance metrics
    const startTime = Date.now();

    // Track preparation steps for detailed reporting
    const preparationSteps = [];
    const errors = [];

    // Notify components about offline mode
    syncEvents.emit('offline_preparation', {
      timestamp: Date.now(),
      options
    });

    preparationSteps.push({ step: 'notification', success: true, timestamp: Date.now() });

    // Get predicted offline duration
    let offlineDurationHours = options.offlineDurationHours || 24; // Default to 24 hours
    let offlineRisk = 0.5; // Default risk

    // Use predictive cache to prepare for offline if available
    if (predictiveCache) {
      try {
        console.log('Getting predictions from predictive cache...');

        // Set timeout for predictions to prevent hanging
        const predictionPromise = predictiveCache.getPredictions({
          offlineRiskOnly: true,
          prioritizeOfflineRisk: true
        });
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            console.warn('Prediction timed out after 5 seconds');
            resolve({ offlinePredicted: false });
          }, 5000);
        });

        // Race the prediction against the timeout
        const predictions = await Promise.race([predictionPromise, timeoutPromise]);

        if (predictions) {
          if (predictions.offlinePredicted && predictions.predictedOfflineDuration) {
            offlineDurationHours = predictions.predictedOfflineDuration / (60 * 60 * 1000);
            console.log(`Using predicted offline duration: ${offlineDurationHours.toFixed(1)} hours`);
          }

          // Get offline risk if available
          if (predictions.offlineRisk !== undefined) {
            offlineRisk = predictions.offlineRisk;
            console.log(`Using predicted offline risk: ${(offlineRisk * 100).toFixed(1)}%`);
          }

          preparationSteps.push({
            step: 'predictions',
            success: true,
            offlineDurationHours,
            offlineRisk,
            timestamp: Date.now()
          });
        }

        // Prepare predictive cache for offline mode
        console.log('Preparing predictive cache for offline mode...');
        const prepareOptions = {
          offlineRisk,
          forcePrepare: options.forcePrepare || false,
          aggressivenessOverride: options.highPriority ? 0.8 : undefined
        };

        // Set timeout for preparation to prevent hanging
        const preparePromise = predictiveCache.prepareForOfflineMode(prepareOptions);
        const prepareTimeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            console.warn('Predictive cache preparation timed out after 10 seconds');
            resolve({ success: false, reason: 'timeout' });
          }, 10000);
        });

        // Race the preparation against the timeout
        const prepareResult = await Promise.race([preparePromise, prepareTimeoutPromise]);

        if (prepareResult && prepareResult.success) {
          console.log('Predictive cache prepared for offline mode successfully');
          preparationSteps.push({
            step: 'predictive_cache_preparation',
            success: true,
            details: prepareResult,
            timestamp: Date.now()
          });
        } else {
          console.warn('Predictive cache preparation failed or timed out:', prepareResult?.reason || 'unknown reason');
          preparationSteps.push({
            step: 'predictive_cache_preparation',
            success: false,
            reason: prepareResult?.reason || 'unknown',
            timestamp: Date.now()
          });
          errors.push('Predictive cache preparation failed');
        }
      } catch (error) {
        console.error('Error preparing predictive cache for offline mode:', error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });

        preparationSteps.push({
          step: 'predictive_cache_preparation',
          success: false,
          error: error.message,
          timestamp: Date.now()
        });

        errors.push(`Predictive cache error: ${error.message}`);
      }
    } else {
      console.warn('Predictive cache not available for offline preparation');
      preparationSteps.push({
        step: 'predictive_cache_check',
        success: false,
        reason: 'not_available',
        timestamp: Date.now()
      });
    }

    // Use storage optimizer to prepare for offline if available
    if (storageOptimizer) {
      try {
        console.log(`Preparing storage for offline operation (${offlineDurationHours.toFixed(1)} hours)...`);

        // Prepare storage with timeout
        const storagePromise = storageOptimizer.prepareForOfflineOperation({
          offlineDurationHours,
          highPriority: options.highPriority || false,
          force: options.forcePrepare || (offlineRisk > 0.7) // Force if high risk
        });

        const storageTimeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            console.warn('Storage optimization timed out after 15 seconds');
            resolve({ success: false, reason: 'timeout' });
          }, 15000);
        });

        // Race the storage preparation against the timeout
        const result = await Promise.race([storagePromise, storageTimeoutPromise]);

        if (result && result.success) {
          console.log(`Storage optimizer prepared for offline mode: reserved ${result.reservedSpaceMB?.toFixed(2) || 'unknown'}MB`);
          preparationSteps.push({
            step: 'storage_preparation',
            success: true,
            reservedSpaceMB: result.reservedSpaceMB,
            timestamp: Date.now()
          });
        } else {
          console.warn('Storage optimizer failed to prepare for offline mode:', result?.error || result?.reason || 'unknown reason');
          preparationSteps.push({
            step: 'storage_preparation',
            success: false,
            reason: result?.error || result?.reason || 'unknown',
            timestamp: Date.now()
          });
          errors.push('Storage optimization failed');
        }
      } catch (error) {
        console.error('Error preparing storage for offline mode:', error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });

        preparationSteps.push({
          step: 'storage_preparation',
          success: false,
          error: error.message,
          timestamp: Date.now()
        });

        errors.push(`Storage optimization error: ${error.message}`);
      }
    } else {
      console.warn('Storage optimizer not available for offline preparation');
      preparationSteps.push({
        step: 'storage_optimizer_check',
        success: false,
        reason: 'not_available',
        timestamp: Date.now()
      });
    }

    // Calculate preparation time
    const preparationTime = Date.now() - startTime;
    console.log(`Offline preparation completed in ${preparationTime}ms with ${errors.length} errors`);

    // Return detailed preparation result
    return {
      success: errors.length === 0,
      preparationTime,
      steps: preparationSteps,
      errors: errors.length > 0 ? errors : undefined,
      offlineDurationHours,
      offlineRisk,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error preparing for offline operation:', error);
    return {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * Adjust sync interval based on network conditions, battery level, and usage patterns
 *
 * @returns {Promise<void>}
 */
async function adjustSyncInterval() {
  try {
    // Get current network status
    const networkStatus = networkMonitor.getNetworkStatus();

    // Get battery level if available
    const currentBatteryLevel = batteryLevel || 100;

    // Get sync queue size
    const queueSize = syncQueue.length;

    // Base interval adjustment on network quality
    if (!networkStatus.online) {
      // If offline, increase interval to save battery
      currentSyncInterval = MAX_SYNC_INTERVAL;
      console.log('Adjusted sync interval: Maximum (offline mode)');
      return;
    }

    // Start with default interval
    let newInterval = DEFAULT_SYNC_INTERVAL;

    // Adjust based on network quality
    if (networkStatus.quality < 0.3) {
      // Poor network quality, increase interval
      newInterval = Math.min(MAX_SYNC_INTERVAL, DEFAULT_SYNC_INTERVAL * 1.5);
    } else if (networkStatus.quality > 0.8) {
      // Excellent network quality, decrease interval
      newInterval = Math.max(MIN_SYNC_INTERVAL, DEFAULT_SYNC_INTERVAL * 0.8);
    }

    // Adjust based on battery level
    if (currentBatteryLevel < 20) {
      // Low battery, increase interval to save power
      newInterval = Math.min(MAX_SYNC_INTERVAL, newInterval * 1.5);
    } else if (currentBatteryLevel > 80) {
      // High battery, can sync more frequently
      newInterval = Math.max(MIN_SYNC_INTERVAL, newInterval * 0.9);
    }

    // Adjust based on queue size
    if (queueSize > 50) {
      // Large queue, sync more frequently
      newInterval = Math.max(MIN_SYNC_INTERVAL, newInterval * 0.7);
    } else if (queueSize < 5) {
      // Small queue, can sync less frequently
      newInterval = Math.min(MAX_SYNC_INTERVAL, newInterval * 1.2);
    }

    // Use predictive cache if available to adjust based on predicted offline periods
    if (predictiveCache) {
      try {
        const predictions = await predictiveCache.getPredictions();

        // If offline period predicted soon, sync more frequently
        if (predictions.offlinePredicted && predictions.timeToOffline < 300000) { // 5 minutes
          newInterval = Math.max(MIN_SYNC_INTERVAL, newInterval * 0.5);
          console.log('Sync interval reduced due to predicted offline period');
        }
      } catch (error) {
        console.warn('Error getting predictions for sync interval adjustment:', error);
      }
    }

    // Ensure interval is within bounds
    newInterval = Math.max(MIN_SYNC_INTERVAL, Math.min(MAX_SYNC_INTERVAL, newInterval));

    // Only log if interval changed significantly
    if (Math.abs(newInterval - currentSyncInterval) > 30000) { // 30 seconds
      console.log(`Adjusted sync interval: ${currentSyncInterval}ms -> ${newInterval}ms`);
      currentSyncInterval = newInterval;

      // Save updated configuration
      await saveConfig();
    }
  } catch (error) {
    console.error('Error adjusting sync interval:', error);
  }
}

/**
 * Adjust sync interval with enhanced prediction-based optimization
 *
 * @param {Object} connectionStatus - Current connection status
 * @returns {Promise<void>}
 */
async function adjustSyncIntervalWithPredictions(connectionStatus) {
  try {
    // Start with basic adjustment
    await adjustSyncInterval();

    // If predictive cache is not available, we're done
    if (!predictiveCache) {
      return;
    }

    // Get advanced predictions
    const predictions = await predictiveCache.getPredictions();

    // If no predictions available, we're done
    if (!predictions) {
      return;
    }

    let newInterval = currentSyncInterval;
    let adjustmentReason = '';

    // Check for predicted offline periods
    if (predictions.offlinePredicted) {
      const timeToOffline = predictions.timeToOffline || Infinity;

      if (timeToOffline < 300000) { // Less than 5 minutes
        // Imminent offline period, sync very frequently
        newInterval = MIN_SYNC_INTERVAL;
        adjustmentReason = 'imminent offline period';
      } else if (timeToOffline < 1800000) { // Less than 30 minutes
        // Upcoming offline period, sync more frequently
        newInterval = Math.max(MIN_SYNC_INTERVAL, currentSyncInterval * 0.6);
        adjustmentReason = 'upcoming offline period';
      }

      // If we have a predicted duration, adjust based on that
      if (predictions.predictedOfflineDuration) {
        const durationHours = predictions.predictedOfflineDuration / (60 * 60 * 1000);

        // For longer predicted offline periods, sync even more aggressively
        if (durationHours > 12) {
          newInterval = Math.max(MIN_SYNC_INTERVAL, newInterval * 0.8);
          adjustmentReason += ', long offline duration predicted';
        }
      }
    }

    // Check for predicted high usage periods
    if (predictions.highUsagePredicted) {
      // If high usage is predicted, sync more frequently to ensure data is fresh
      newInterval = Math.max(MIN_SYNC_INTERVAL, newInterval * 0.8);
      adjustmentReason += ', high usage predicted';
    }

    // Check for predicted network quality changes
    if (predictions.networkQualityPredictions && predictions.networkQualityPredictions.length > 0) {
      // Get the nearest prediction
      const nextPrediction = predictions.networkQualityPredictions[0];

      if (nextPrediction.quality < 0.3 && nextPrediction.timeToChange < 900000) { // 15 minutes
        // Poor network quality predicted soon, sync more frequently now
        newInterval = Math.max(MIN_SYNC_INTERVAL, newInterval * 0.7);
        adjustmentReason += ', poor network quality predicted soon';
      } else if (nextPrediction.quality > 0.8 && nextPrediction.timeToChange < 300000) { // 5 minutes
        // Good network quality predicted soon, wait for it
        newInterval = Math.min(MAX_SYNC_INTERVAL, newInterval * 1.2);
        adjustmentReason += ', good network quality predicted soon';
      }
    }

    // Check for critical items in sync queue
    const criticalItems = syncQueue.filter(item =>
      item.priority === SYNC_PRIORITY_LEVELS.CRITICAL ||
      (item.data && item.data.context && ['emergency', 'critical_care'].includes(item.data.context))
    );

    if (criticalItems.length > 0) {
      // Critical items present, sync more frequently
      newInterval = Math.max(MIN_SYNC_INTERVAL, newInterval * 0.5);
      adjustmentReason += `, ${criticalItems.length} critical items in queue`;
    }

    // Ensure interval is within bounds
    newInterval = Math.max(MIN_SYNC_INTERVAL, Math.min(MAX_SYNC_INTERVAL, newInterval));

    // Only update if there's a significant change
    if (Math.abs(newInterval - currentSyncInterval) > 30000) { // 30 seconds
      console.log(`Enhanced sync interval adjustment: ${currentSyncInterval}ms -> ${newInterval}ms (${adjustmentReason})`);
      currentSyncInterval = newInterval;

      // Save updated configuration
      await saveConfig();
    }
  } catch (error) {
    console.error('Error adjusting sync interval with predictions:', error);
  }
}

/**
 * Sync with cloud using intelligent strategies
 *
 * @returns {Promise<Object>} - Sync result
 */
/**
 * Register a pre-sync hook
 *
 * @param {Function} hook - Hook function to execute before sync
 */
function registerPreSyncHook(hook) {
  if (typeof hook === 'function') {
    preSyncHooks.push(hook);
    console.log(`Pre-sync hook registered (${preSyncHooks.length} total)`);
  }
}

/**
 * Register a post-sync hook
 *
 * @param {Function} hook - Hook function to execute after sync
 */
function registerPostSyncHook(hook) {
  if (typeof hook === 'function') {
    postSyncHooks.push(hook);
    console.log(`Post-sync hook registered (${postSyncHooks.length} total)`);
  }
}

/**
 * Execute pre-sync hooks
 *
 * @returns {Promise<void>}
 */
async function executePreSyncHooks() {
  if (preSyncHooks.length === 0) {
    return;
  }

  console.log(`Executing ${preSyncHooks.length} pre-sync hooks...`);

  for (const hook of preSyncHooks) {
    try {
      await hook();
    } catch (error) {
      console.error('Error executing pre-sync hook:', error);
    }
  }
}

/**
 * Execute post-sync hooks
 *
 * @param {Object} syncResult - Sync result
 * @returns {Promise<void>}
 */
async function executePostSyncHooks(syncResult) {
  if (postSyncHooks.length === 0) {
    return;
  }

  console.log(`Executing ${postSyncHooks.length} post-sync hooks...`);

  for (const hook of postSyncHooks) {
    try {
      await hook(syncResult);
    } catch (error) {
      console.error('Error executing post-sync hook:', error);
    }
  }
}

async function syncWithCloud() {
  if (syncInProgress) {
    console.log('Sync already in progress, skipping');
    return { success: false, reason: 'already_in_progress' };
  }

  syncInProgress = true;
  const syncStartTime = Date.now();
  console.log('Starting intelligent sync with cloud...');

  try {
    // Execute pre-sync hooks
    await executePreSyncHooks();

    // Optimize storage before sync if needed
    if (storageManager && syncQueue.length > 20) {
      const storageInfo = storageManager.getStorageInfo();
      if (storageInfo.usagePercentage > 70) {
        console.log('Storage usage high, optimizing before sync...');
        await storageManager.optimizeStorage();
      }
    }

    // Load sync queue from files
    await loadSyncQueue();

    // Test connection to cloud with enhanced error handling
    const connectionStatus = await testConnection();
    if (!connectionStatus.connected) {
      console.log(`Cannot connect to cloud: ${connectionStatus.reason}, skipping sync`);
      syncInProgress = false;
      lastSyncStatus = 'failed';

      // Record sync attempt in history
      recordSyncAttempt({
        success: false,
        reason: connectionStatus.reason,
        timestamp: Date.now(),
        duration: Date.now() - syncStartTime
      });

      await saveConfig();
      return { success: false, reason: connectionStatus.reason };
    }

    // Prioritize queue based on item importance and network conditions
    prioritizeSyncQueue(connectionStatus);

    // Sync cached translations with intelligent batching
    const translationResult = await syncCachedTranslations(connectionStatus);

    // Sync model updates with bandwidth awareness
    const modelResult = await syncModelUpdates(connectionStatus);

    // Update sync status
    lastSyncTime = Date.now();
    lastSyncStatus = 'success';

    // Update metrics
    syncMetrics.totalSyncs++;
    syncMetrics.successfulSyncs++;
    syncMetrics.itemsSynced += translationResult.syncedCount || 0;
    syncMetrics.lastSync = lastSyncTime;

    // Calculate average sync time
    const syncDuration = Date.now() - syncStartTime;
    syncMetrics.syncTimes.push(syncDuration);
    if (syncMetrics.syncTimes.length > 50) {
      syncMetrics.syncTimes.shift(); // Keep only the last 50 sync times
    }
    syncMetrics.averageSyncTime = syncMetrics.syncTimes.reduce((sum, time) => sum + time, 0) / syncMetrics.syncTimes.length;

    // Record sync in history
    recordSyncAttempt({
      success: true,
      timestamp: lastSyncTime,
      duration: syncDuration,
      itemsSynced: translationResult.syncedCount || 0,
      modelsUpdated: modelResult.updatesDownloaded || 0
    });

    // Save updated configuration and metrics
    await saveConfig();
    await saveSyncMetrics();
    await saveSyncHistory();

    syncInProgress = false;
    console.log(`Sync completed successfully in ${syncDuration}ms`);

    const syncResult = {
      success: true,
      translations: translationResult,
      models: modelResult,
      duration: syncDuration
    };

    // Execute post-sync hooks
    await executePostSyncHooks(syncResult);

    return syncResult;
  } catch (error) {
    console.error('Error syncing with cloud:', error);

    syncInProgress = false;
    lastSyncStatus = 'failed';

    // Update metrics
    syncMetrics.totalSyncs++;
    syncMetrics.failedSyncs++;

    // Record sync attempt in history
    recordSyncAttempt({
      success: false,
      reason: error.message,
      timestamp: Date.now(),
      duration: Date.now() - syncStartTime
    });

    await saveConfig();
    await saveSyncMetrics();
    await saveSyncHistory();

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Record sync attempt in history
 *
 * @param {Object} attempt - Sync attempt details
 */
function recordSyncAttempt(attempt) {
  syncHistory.push(attempt);

  // Emit sync event
  syncEvents.emit('sync', attempt);
}

/**
 * Load sync queue from files with enhanced error handling
 *
 * @returns {Promise<void>}
 */
async function loadSyncQueue() {
  try {
    // Clear queue
    syncQueue = [];

    // Read sync directory
    const files = fs.readdirSync(SYNC_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => path.join(SYNC_DIR, file));

    // Load sync items
    for (const file of files) {
      try {
        const syncItem = JSON.parse(fs.readFileSync(file, 'utf8'));
        syncQueue.push(syncItem);
      } catch (error) {
        console.error(`Error loading sync item from ${file}:`, error);
      }
    }

    console.log(`Loaded ${syncQueue.length} items from sync queue`);
  } catch (error) {
    console.error('Error loading sync queue:', error);
  }
}

/**
 * Prioritize sync queue based on item importance and network conditions
 *
 * @param {Object} connectionStatus - Current connection status
 */
function prioritizeSyncQueue(connectionStatus) {
  try {
    if (syncQueue.length === 0) return;

    console.log('Prioritizing sync queue based on importance and network conditions...');

    // Assign priority scores to each item
    syncQueue.forEach(item => {
      // Start with base priority (if already set)
      let priorityScore = item.priority || SYNC_PRIORITY_LEVELS.LOW;

      // Adjust based on context
      if (item.data && item.data.context) {
        if (item.data.context === 'emergency' || item.data.context === 'critical_care') {
          priorityScore = Math.max(priorityScore, SYNC_PRIORITY_LEVELS.CRITICAL);
        } else if (item.data.context === 'diagnosis' || item.data.context === 'medication') {
          priorityScore = Math.max(priorityScore, SYNC_PRIORITY_LEVELS.HIGH);
        }
      }

      // Adjust based on age (older items get higher priority)
      const ageInMinutes = (Date.now() - (item.timestamp || Date.now())) / 60000;
      if (ageInMinutes > 60) { // Older than 1 hour
        priorityScore += 0.5;
      }

      // Adjust based on size and network quality
      if (connectionStatus.quality < 0.5 && item.size && item.size > 100000) {
        // Large items get lower priority on poor connections
        priorityScore -= 0.5;
      }

      // Store the calculated priority
      item.calculatedPriority = priorityScore;
    });

    // Sort queue by calculated priority (higher first)
    syncQueue.sort((a, b) => (b.calculatedPriority || 0) - (a.calculatedPriority || 0));

    console.log('Sync queue prioritized successfully');
  } catch (error) {
    console.error('Error prioritizing sync queue:', error);
  }
}

/**
 * Test connection to cloud with enhanced error handling
 *
 * @returns {Promise<Object>} - Connection status
 */
async function testConnection() {
  try {
    console.log('Testing connection to cloud...');

    // Get network status first
    const networkStatus = networkMonitor.getNetworkStatus();
    if (!networkStatus.online) {
      return {
        connected: false,
        reason: 'network_offline',
        details: 'Device is offline'
      };
    }

    // Test API connection
    const response = await axios.get(`${API_BASE_URL}/health`, {
      timeout: 5000,
      headers: {
        'X-Device-ID': DEVICE_ID
      }
    });

    if (response.status === 200 && response.data.status === 'ok') {
      console.log('Connection to cloud successful');
      return {
        connected: true,
        quality: networkStatus.quality,
        latency: response.data.latency || 0
      };
    } else {
      console.log('Connection to cloud failed: API returned error status');
      return {
        connected: false,
        reason: 'api_error',
        details: response.data
      };
    }
  } catch (error) {
    console.error('Error testing connection to cloud:', error);

    // Provide more detailed error information
    let reason = 'unknown_error';
    let details = error.message;

    if (error.code === 'ECONNABORTED') {
      reason = 'timeout';
      details = 'Connection timed out';
    } else if (error.code === 'ENOTFOUND') {
      reason = 'dns_error';
      details = 'DNS resolution failed';
    } else if (error.response) {
      reason = 'http_error';
      details = `HTTP ${error.response.status}: ${error.response.statusText}`;
    } else if (error.request) {
      reason = 'no_response';
      details = 'No response received';
    }

    return {
      connected: false,
      reason,
      details
    };
  }
}

/**
 * Sync cached translations with intelligent batching, delta sync, and conflict resolution
 *
 * @param {Object} connectionStatus - Current connection status
 * @returns {Promise<Object>} - Sync result
 */
async function syncCachedTranslations(connectionStatus) {
  try {
    console.log(`Syncing ${syncQueue.length} cached translations with intelligent batching and delta sync...`);

    if (syncQueue.length === 0) {
      return {
        success: true,
        syncedCount: 0,
        failedCount: 0,
        remainingCount: 0
      };
    }

    // Determine optimal batch size based on network quality
    let batchSize = 10; // Default

    if (connectionStatus.quality < 0.3) {
      // Poor connection, use smaller batches
      batchSize = 3;
    } else if (connectionStatus.quality > 0.8) {
      // Excellent connection, use larger batches
      batchSize = 20;
    }

    // Adjust batch size based on latency
    if (connectionStatus.latency > 500) {
      // High latency, reduce batch size
      batchSize = Math.max(2, batchSize - 5);
    }

    console.log(`Using batch size of ${batchSize} based on network conditions`);

    // Prepare items for delta sync
    const preparedItems = await prepareItemsForDeltaSync(syncQueue);

    // Group translations by batch
    const batches = [];
    for (let i = 0; i < preparedItems.length; i += batchSize) {
      batches.push(preparedItems.slice(i, i + batchSize));
    }

    // Process batches with intelligent retry and conflict resolution
    let successCount = 0;
    let failureCount = 0;
    let conflictCount = 0;
    let resolvedConflictCount = 0;
    let bytesUploaded = 0;
    let bytesSaved = 0;

    for (const batch of batches) {
      try {
        // Calculate original batch size for metrics
        const originalBatchSizeBytes = batch.reduce((total, item) => {
          return total + (item.originalSize || 0);
        }, 0);

        // Calculate actual batch size for metrics
        const actualBatchSizeBytes = batch.reduce((total, item) => {
          return total + (Buffer.from(JSON.stringify(item)).length || 0);
        }, 0);

        // Calculate bytes saved through delta sync
        const batchBytesSaved = originalBatchSizeBytes - actualBatchSizeBytes;
        if (batchBytesSaved > 0) {
          bytesSaved += batchBytesSaved;
          console.log(`Delta sync saved ${(batchBytesSaved / 1024).toFixed(2)}KB in this batch`);
        }

        // Send batch to cloud with retry logic
        const result = await sendBatchWithRetry(batch);

        if (result.success) {
          // Process successful items
          for (const item of result.successfulItems) {
            const syncFilePath = path.join(SYNC_DIR, `${item.id}.json`);
            if (fs.existsSync(syncFilePath)) {
              fs.unlinkSync(syncFilePath);
            }
            successCount++;
          }

          // Handle conflicts if any
          if (result.conflicts && result.conflicts.length > 0) {
            conflictCount += result.conflicts.length;
            console.log(`Handling ${result.conflicts.length} conflicts...`);

            // Resolve conflicts
            const resolutionResult = await resolveConflicts(result.conflicts);
            resolvedConflictCount += resolutionResult.resolved;
          }

          // Update metrics
          bytesUploaded += actualBatchSizeBytes;

          // Update failure count
          failureCount += result.failedItems.length;

          // Update delta sync metrics
          if (!syncMetrics.deltaSyncMetrics) {
            syncMetrics.deltaSyncMetrics = {
              totalBytesSaved: 0,
              totalItemsOptimized: 0,
              compressionRatio: 1,
              byContentType: {}
            };
          }

          // Update delta sync metrics
          if (batchBytesSaved > 0) {
            syncMetrics.deltaSyncMetrics.totalBytesSaved += batchBytesSaved;
            syncMetrics.deltaSyncMetrics.totalItemsOptimized += batch.filter(item => item.deltaSync).length;

            if (originalBatchSizeBytes > 0) {
              const batchCompressionRatio = actualBatchSizeBytes / originalBatchSizeBytes;

              // Update overall compression ratio with weighted average
              const totalBytes = syncMetrics.bytesUploaded + actualBatchSizeBytes;
              const currentRatio = syncMetrics.deltaSyncMetrics.compressionRatio || 1;

              syncMetrics.deltaSyncMetrics.compressionRatio =
                ((currentRatio * syncMetrics.bytesUploaded) + (batchCompressionRatio * actualBatchSizeBytes)) / totalBytes;
            }

            // Update by content type
            for (const item of batch) {
              if (item.deltaSync) {
                const contentType = item.data?.context || 'unknown';
                if (!syncMetrics.deltaSyncMetrics.byContentType[contentType]) {
                  syncMetrics.deltaSyncMetrics.byContentType[contentType] = {
                    count: 0,
                    bytesSaved: 0
                };
                }

                syncMetrics.deltaSyncMetrics.byContentType[contentType].count++;
                syncMetrics.deltaSyncMetrics.byContentType[contentType].bytesSaved +=
                  (item.originalSize || 0) - (Buffer.from(JSON.stringify(item)).length || 0);
              }
            }
          }
        } else {
          console.error('Error syncing batch:', result.error);
          failureCount += batch.length;
        }
      } catch (error) {
        console.error('Error processing batch:', error);
        failureCount += batch.length;
      }

      // Add a small delay between batches to avoid overwhelming the server
      if (connectionStatus.quality < 0.5) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Update sync queue
    await loadSyncQueue();

    // Update metrics
    syncMetrics.bytesUploaded += bytesUploaded;
    syncMetrics.conflicts += conflictCount;
    syncMetrics.conflictsResolved += resolvedConflictCount;

    // Log delta sync efficiency
    if (bytesSaved > 0) {
      const savingsPercent = (bytesSaved / (bytesUploaded + bytesSaved) * 100).toFixed(2);
      console.log(`Delta sync saved ${(bytesSaved / 1024).toFixed(2)}KB (${savingsPercent}%)`);
    }

    return {
      success: true,
      syncedCount: successCount,
      failedCount: failureCount,
      conflictCount,
      resolvedConflictCount,
      remainingCount: syncQueue.length,
      bytesUploaded,
      bytesSaved,
      deltaSyncEnabled: true
    };
  } catch (error) {
    console.error('Error syncing cached translations:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Prepare items for delta sync by optimizing payload size
 *
 * @param {Array<Object>} items - Items to prepare
 * @returns {Promise<Array<Object>>} - Prepared items
 */
async function prepareItemsForDeltaSync(items) {
  try {
    console.log(`Preparing ${items.length} items for delta sync...`);

    // Get last sync state if available
    const lastSyncStatePath = path.join(CONFIG_DIR, 'last-sync-state.json');
    let lastSyncState = {};

    if (fs.existsSync(lastSyncStatePath)) {
      try {
        lastSyncState = JSON.parse(fs.readFileSync(lastSyncStatePath, 'utf8'));
      } catch (error) {
        console.warn('Error reading last sync state:', error);
      }
    }

    // Prepare items
    const preparedItems = [];

    for (const item of items) {
      // Store original size for metrics
      const originalSize = Buffer.from(JSON.stringify(item)).length;

      // Create a copy of the item
      const preparedItem = { ...item, originalSize };

      // Check if we have a previous version of this item
      const previousItem = lastSyncState[item.id];

      if (previousItem && item.type === 'translation') {
        // Calculate delta for translation items
        const delta = calculateDelta(previousItem, item);

        // If delta is smaller than the full item, use it
        const deltaSize = Buffer.from(JSON.stringify(delta)).length;

        if (deltaSize < originalSize * 0.8) { // Only use delta if it saves at least 20%
          preparedItem.deltaSync = true;
          preparedItem.delta = delta;
          preparedItem.baseVersion = previousItem.version || 1;
          preparedItem.version = (previousItem.version || 1) + 1;

          // Remove full data that's already on the server
          delete preparedItem.data;

          console.log(`Using delta sync for item ${item.id}, saved ${((originalSize - deltaSize) / 1024).toFixed(2)}KB`);
        }
      }

      preparedItems.push(preparedItem);

      // Update last sync state
      lastSyncState[item.id] = {
        ...item,
        version: (lastSyncState[item.id]?.version || 0) + 1,
        lastSynced: Date.now()
      };
    }

    // Save updated sync state
    fs.writeFileSync(lastSyncStatePath, JSON.stringify(lastSyncState, null, 2), 'utf8');

    return preparedItems;
  } catch (error) {
    console.error('Error preparing items for delta sync:', error);
    // Return original items if preparation fails
    return items;
  }
}

/**
 * Calculate delta between two versions of an item
 *
 * @param {Object} oldItem - Previous version of the item
 * @param {Object} newItem - New version of the item
 * @returns {Object} - Delta object
 */
function calculateDelta(oldItem, newItem) {
  const delta = {
    id: newItem.id,
    type: 'delta',
    baseId: oldItem.id,
    baseVersion: oldItem.version || 1,
    timestamp: newItem.timestamp,
    changes: []
  };

  // For translation items, calculate changes
  if (newItem.type === 'translation' && oldItem.type === 'translation') {
    // Check for changes in metadata
    if (newItem.priority !== oldItem.priority) {
      delta.changes.push({
        path: 'priority',
        oldValue: oldItem.priority,
        newValue: newItem.priority
      });
    }

    // Check for changes in data
    if (newItem.data && oldItem.data) {
      // Check source/target language
      if (newItem.data.sourceLanguage !== oldItem.data.sourceLanguage) {
        delta.changes.push({
          path: 'data.sourceLanguage',
          oldValue: oldItem.data.sourceLanguage,
          newValue: newItem.data.sourceLanguage
        });
      }

      if (newItem.data.targetLanguage !== oldItem.data.targetLanguage) {
        delta.changes.push({
          path: 'data.targetLanguage',
          oldValue: oldItem.data.targetLanguage,
          newValue: newItem.data.targetLanguage
        });
      }

      // Check context
      if (newItem.data.context !== oldItem.data.context) {
        delta.changes.push({
          path: 'data.context',
          oldValue: oldItem.data.context,
          newValue: newItem.data.context
        });
      }

      // Check result
      if (newItem.data.result && oldItem.data.result) {
        // Check text
        if (newItem.data.result.text !== oldItem.data.result.text) {
          delta.changes.push({
            path: 'data.result.text',
            oldValue: oldItem.data.result.text,
            newValue: newItem.data.result.text
          });
        }

        // Check confidence
        if (newItem.data.result.confidence !== oldItem.data.result.confidence) {
          delta.changes.push({
            path: 'data.result.confidence',
            oldValue: oldItem.data.result.confidence,
            newValue: newItem.data.result.confidence
          });
        }

        // For alternatives, just replace the whole array if different
        if (JSON.stringify(newItem.data.result.alternatives) !== JSON.stringify(oldItem.data.result.alternatives)) {
          delta.changes.push({
            path: 'data.result.alternatives',
            newValue: newItem.data.result.alternatives
          });
        }

        // For medical terms, just replace the whole object if different
        if (JSON.stringify(newItem.data.result.medicalTerms) !== JSON.stringify(oldItem.data.result.medicalTerms)) {
          delta.changes.push({
            path: 'data.result.medicalTerms',
            newValue: newItem.data.result.medicalTerms
          });
        }
      } else if (newItem.data.result) {
        // New result added
        delta.changes.push({
          path: 'data.result',
          newValue: newItem.data.result
        });
      }
    }
  }

  return delta;
}

/**
 * Send batch with intelligent retry logic
 *
 * @param {Array} batch - Batch of items to send
 * @returns {Promise<Object>} - Send result
 */
async function sendBatchWithRetry(batch) {
  let attempts = 0;
  let lastError = null;

  while (attempts < MAX_RETRIES) {
    try {
      // Exponential backoff
      if (attempts > 0) {
        const backoffTime = RETRY_DELAY_BASE * Math.pow(2, attempts - 1);
        console.log(`Retry attempt ${attempts}/${MAX_RETRIES}, waiting ${backoffTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }

      // Send batch to cloud
      const response = await axios.post(`${API_BASE_URL}/edge/sync`, {
        deviceId: DEVICE_ID,
        items: batch,
        version: '2.0', // API version
        timestamp: Date.now(),
        capabilities: {
          conflictResolution: true,
          deltaSync: true,
          compression: true
        }
      }, {
        timeout: 15000, // Longer timeout for larger batches
        headers: {
          'X-Device-ID': DEVICE_ID,
          'Content-Type': 'application/json'
        }
      });

      // Process response
      if (response.data.success) {
        // Enhanced response handling
        return {
          success: true,
          successfulItems: response.data.successfulItems || [],
          failedItems: response.data.failedItems || [],
          conflicts: response.data.conflicts || []
        };
      } else {
        lastError = response.data.error || 'Unknown error';
        attempts++;
      }
    } catch (error) {
      lastError = error.message;
      attempts++;

      // Check if we should retry based on error type
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        // Client errors (4xx) generally shouldn't be retried
        if (error.response.status !== 429) { // Except rate limiting (429)
          break;
        }
      }
    }
  }

  // All retries failed
  return {
    success: false,
    error: lastError,
    failedItems: batch
  };
}

/**
 * Resolve conflicts with intelligent strategies
 *
 * @param {Array} conflicts - Conflicts to resolve
 * @returns {Promise<Object>} - Resolution result
 */
async function resolveConflicts(conflicts) {
  try {
    console.log(`Resolving ${conflicts.length} conflicts...`);

    // Load conflict resolution strategy from config
    const config = JSON.parse(fs.readFileSync(AUTO_SYNC_CONFIG_FILE, 'utf8'));
    const strategy = config.conflictResolution?.strategy || 'smart';

    let resolved = 0;
    let strategies = {
      local: 0,
      remote: 0,
      merge: 0,
      smart: 0
    };

    for (const conflict of conflicts) {
      try {
        // Determine the best resolution strategy for this conflict
        let resolutionStrategy = strategy;

        if (strategy === 'smart') {
          resolutionStrategy = determineSmartResolutionStrategy(conflict);
        }

        // Apply the resolution strategy
        const result = await applyResolutionStrategy(conflict, resolutionStrategy);

        if (result.success) {
          resolved++;
          strategies[resolutionStrategy]++;

          // Save conflict resolution for analysis
          saveConflictResolution(conflict, resolutionStrategy, result);
        }
      } catch (error) {
        console.error(`Error resolving conflict ${conflict.id}:`, error);
      }
    }

    console.log(`Resolved ${resolved}/${conflicts.length} conflicts (local: ${strategies.local}, remote: ${strategies.remote}, merge: ${strategies.merge}, smart: ${strategies.smart})`);

    return {
      success: true,
      resolved,
      strategies
    };
  } catch (error) {
    console.error('Error resolving conflicts:', error);
    return {
      success: false,
      error: error.message,
      resolved: 0
    };
  }
}

/**
 * Determine the best resolution strategy for a conflict using ML-enhanced approach
 *
 * @param {Object} conflict - Conflict to resolve
 * @returns {string} - Resolution strategy
 */
function determineSmartResolutionStrategy(conflict) {
  // Default to merge
  let strategy = 'merge';

  try {
    const { localItem, serverItem } = conflict;

    // Check if this is a medical context
    const isMedicalContext = localItem.data?.context &&
      ['emergency', 'critical_care', 'diagnosis', 'medication'].includes(localItem.data.context);

    // Check timestamps
    const localTime = localItem.timestamp || 0;
    const serverTime = serverItem.timestamp || 0;
    const timeDiff = Math.abs(localTime - serverTime);

    // Calculate confidence scores for each strategy
    const strategyScores = {
      local: 0,
      remote: 0,
      merge: 0
    };

    // Factor 1: Timestamp difference
    if (serverTime > localTime) {
      // Server is newer
      const ageFactorRemote = Math.min(1, timeDiff / 3600000); // Scale up to 1 hour
      strategyScores.remote += 0.3 * ageFactorRemote;
    } else if (localTime > serverTime) {
      // Local is newer
      const ageFactorLocal = Math.min(1, timeDiff / 3600000); // Scale up to 1 hour
      strategyScores.local += 0.3 * ageFactorLocal;
    }

    // Factor 2: Translation confidence
    const localConfidence = localItem.data?.result?.confidence || 0;
    const serverConfidence = serverItem.data?.result?.confidence || 0;
    const confidenceDiff = Math.abs(localConfidence - serverConfidence);

    if (localConfidence > serverConfidence) {
      strategyScores.local += 0.2 * Math.min(1, confidenceDiff * 5); // Scale up to 0.2 difference
    } else if (serverConfidence > localConfidence) {
      strategyScores.remote += 0.2 * Math.min(1, confidenceDiff * 5); // Scale up to 0.2 difference
    }

    // Factor 3: Medical context importance
    if (isMedicalContext) {
      // For medical contexts, we're more careful about merging
      strategyScores.merge -= 0.1;

      // For critical contexts, prefer the higher confidence version more strongly
      if (['emergency', 'critical_care'].includes(localItem.data?.context)) {
        if (localConfidence > serverConfidence) {
          strategyScores.local += 0.2;
        } else if (serverConfidence > localConfidence) {
          strategyScores.remote += 0.2;
        }
      }
    } else {
      // For non-medical contexts, merging is often safer
      strategyScores.merge += 0.1;
    }

    // Factor 4: Content similarity
    let contentSimilarity = 0;

    if (localItem.data?.result?.text && serverItem.data?.result?.text) {
      const localText = localItem.data.result.text;
      const serverText = serverItem.data.result.text;

      // Simple similarity measure (can be enhanced with more sophisticated algorithms)
      if (localText === serverText) {
        contentSimilarity = 1;
      } else {
        // Calculate Levenshtein distance-based similarity
        const maxLength = Math.max(localText.length, serverText.length);
        if (maxLength > 0) {
          const distance = calculateLevenshteinDistance(localText, serverText);
          contentSimilarity = 1 - (distance / maxLength);
        }
      }
    }

    // If content is very similar, merging is a good option
    if (contentSimilarity > 0.9) {
      strategyScores.merge += 0.3;
    } else if (contentSimilarity < 0.5) {
      // If content is very different, merging might be risky
      strategyScores.merge -= 0.2;
    }

    // Factor 5: Historical success with strategies
    if (syncMetrics.conflictResolutionSuccess) {
      const successRates = syncMetrics.conflictResolutionSuccess;

      if (successRates.local > 0.8) strategyScores.local += 0.1;
      if (successRates.remote > 0.8) strategyScores.remote += 0.1;
      if (successRates.merge > 0.8) strategyScores.merge += 0.1;
    }

    // Factor 6: Use ML model predictions if available
    if (predictiveCache && predictiveCache.modelAdapter) {
      try {
        const modelAdapter = predictiveCache.modelAdapter;

        // If we have a connection prediction model, use it
        if (modelAdapter.predictConnectionIssues) {
          const connectionPrediction = modelAdapter.predictConnectionIssues();

          // If high risk of connection issues, prefer local version
          if (connectionPrediction.risk > 0.7) {
            strategyScores.local += 0.15;
            strategyScores.remote -= 0.1;
          }
        }
      } catch (error) {
        console.warn('Error using ML predictions for conflict resolution:', error);
      }
    }

    // Choose the strategy with the highest score
    let highestScore = 0;

    for (const [strategyName, score] of Object.entries(strategyScores)) {
      if (score > highestScore) {
        highestScore = score;
        strategy = strategyName;
      }
    }

    // Log the decision factors
    console.log(`Conflict resolution for ${conflict.id}: ${strategy} (scores: local=${strategyScores.local.toFixed(2)}, remote=${strategyScores.remote.toFixed(2)}, merge=${strategyScores.merge.toFixed(2)})`);

    // Record the strategy decision for learning
    recordConflictResolutionDecision(conflict, strategy, strategyScores);
  } catch (error) {
    console.warn('Error determining smart resolution strategy:', error);
    // Fall back to merge on error
    strategy = 'merge';
  }

  return strategy;
}

/**
 * Calculate Levenshtein distance between two strings
 *
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Levenshtein distance
 */
function calculateLevenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Record conflict resolution decision for learning
 *
 * @param {Object} conflict - Conflict that was resolved
 * @param {string} strategy - Resolution strategy used
 * @param {Object} scores - Strategy scores
 */
function recordConflictResolutionDecision(conflict, strategy, scores) {
  try {
    // Initialize conflict resolution metrics if not exists
    if (!syncMetrics.conflictResolutionDecisions) {
      syncMetrics.conflictResolutionDecisions = [];
    }

    // Add decision to history
    syncMetrics.conflictResolutionDecisions.push({
      timestamp: Date.now(),
      conflictId: conflict.id,
      strategy,
      scores,
      context: conflict.localItem?.data?.context || 'unknown',
      timeDiff: Math.abs((conflict.localItem?.timestamp || 0) - (conflict.serverItem?.timestamp || 0)),
      confidenceDiff: Math.abs(
        (conflict.localItem?.data?.result?.confidence || 0) -
        (conflict.serverItem?.data?.result?.confidence || 0)
      )
    });

    // Keep only the last 100 decisions
    if (syncMetrics.conflictResolutionDecisions.length > 100) {
      syncMetrics.conflictResolutionDecisions.shift();
    }

    // Save metrics
    saveSyncMetrics();
  } catch (error) {
    console.warn('Error recording conflict resolution decision:', error);
  }
}

/**
 * Apply resolution strategy to a conflict
 *
 * @param {Object} conflict - Conflict to resolve
 * @param {string} strategy - Resolution strategy
 * @returns {Promise<Object>} - Resolution result
 */
async function applyResolutionStrategy(conflict, strategy) {
  try {
    const { id, localItem, serverItem } = conflict;

    switch (strategy) {
      case 'local':
        // Keep local version
        return {
          success: true,
          strategy: 'local',
          result: localItem
        };

      case 'remote':
        // Use server version
        // Remove local file
        const localPath = path.join(SYNC_DIR, `${id}.json`);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }

        // If needed, update local cache with server version
        if (serverItem.data && cacheManager) {
          await cacheManager.set(
            `translation:${serverItem.data.text}:${serverItem.data.sourceLanguage}:${serverItem.data.targetLanguage}`,
            serverItem.data.result,
            { context: serverItem.data.context }
          );
        }

        return {
          success: true,
          strategy: 'remote',
          result: serverItem
        };

      case 'merge':
        // Attempt to merge the two versions
        const mergedItem = await mergeConflictingItems(localItem, serverItem);

        // Update local file with merged version
        const mergedPath = path.join(SYNC_DIR, `${id}.json`);
        fs.writeFileSync(mergedPath, JSON.stringify(mergedItem, null, 2), 'utf8');

        // Update cache with merged version
        if (mergedItem.data && cacheManager) {
          await cacheManager.set(
            `translation:${mergedItem.data.text}:${mergedItem.data.sourceLanguage}:${mergedItem.data.targetLanguage}`,
            mergedItem.data.result,
            { context: mergedItem.data.context }
          );
        }

        return {
          success: true,
          strategy: 'merge',
          result: mergedItem
        };

      default:
        throw new Error(`Unknown resolution strategy: ${strategy}`);
    }
  } catch (error) {
    console.error(`Error applying resolution strategy ${strategy}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Merge conflicting items with enhanced strategies
 *
 * @param {Object} localItem - Local item
 * @param {Object} serverItem - Server item
 * @returns {Promise<Object>} - Merged item
 */
async function mergeConflictingItems(localItem, serverItem) {
  try {
    console.log(`Merging conflicting items: ${localItem.id}`);

    // Start with the newer item as the base
    const baseItem = (localItem.timestamp || 0) >= (serverItem.timestamp || 0) ?
      { ...localItem } : { ...serverItem };

    // For translation items, use intelligent merging
    if (localItem.type === 'translation' && serverItem.type === 'translation') {
      // Get confidence scores
      const localConfidence = localItem.data?.result?.confidence || 0;
      const serverConfidence = serverItem.data?.result?.confidence || 0;

      // Get translation texts
      const localText = localItem.data?.result?.text || '';
      const serverText = serverItem.data?.result?.text || '';

      // Check if this is a medical context
      const isMedicalContext = localItem.data?.context &&
        ['emergency', 'critical_care', 'diagnosis', 'medication'].includes(localItem.data.context);

      // Determine merge strategy based on content type and similarity
      let mergeStrategy = 'select_higher_confidence';

      // Calculate text similarity
      let textSimilarity = 0;
      if (localText && serverText) {
        if (localText === serverText) {
          textSimilarity = 1;
        } else {
          // Use Levenshtein distance for similarity
          const maxLength = Math.max(localText.length, serverText.length);
          if (maxLength > 0) {
            const distance = calculateLevenshteinDistance(localText, serverText);
            textSimilarity = 1 - (distance / maxLength);
          }
        }
      }

      console.log(`Text similarity: ${textSimilarity.toFixed(2)}`);

      // For very similar texts, we can use either one
      if (textSimilarity > 0.95) {
        mergeStrategy = 'select_higher_confidence';
      }
      // For somewhat similar texts, we might want to combine them
      else if (textSimilarity > 0.7) {
        mergeStrategy = 'intelligent_combine';
      }
      // For very different texts, we need to be careful
      else {
        // For medical contexts, prefer higher confidence
        if (isMedicalContext) {
          mergeStrategy = 'select_higher_confidence';
        } else {
          // For non-medical contexts, try to combine or select newer
          mergeStrategy = Math.abs(localConfidence - serverConfidence) > 0.2 ?
            'select_higher_confidence' : 'intelligent_combine';
        }
      }

      console.log(`Using merge strategy: ${mergeStrategy}`);

      // Apply the selected merge strategy
      switch (mergeStrategy) {
        case 'select_higher_confidence':
          if (localConfidence > serverConfidence) {
            baseItem.data.result = localItem.data.result;
          } else {
            baseItem.data.result = serverItem.data.result;
          }
          break;

        case 'intelligent_combine':
          // Create a combined result
          baseItem.data.result = await intelligentCombineResults(
            localItem.data.result,
            serverItem.data.result,
            {
              isMedicalContext,
              localConfidence,
              serverConfidence
            }
          );
          break;
      }

      // Add metadata about the merge
      baseItem.merged = true;
      baseItem.mergeTimestamp = Date.now();
      baseItem.mergeStrategy = mergeStrategy;
      baseItem.mergeSource = {
        local: {
          timestamp: localItem.timestamp,
          confidence: localConfidence,
          textLength: localText.length
        },
        server: {
          timestamp: serverItem.timestamp,
          confidence: serverConfidence,
          textLength: serverText.length
        },
        similarity: textSimilarity
      };

      // Add merge quality metrics for learning
      if (!syncMetrics.mergeQualityMetrics) {
        syncMetrics.mergeQualityMetrics = {
          totalMerges: 0,
          byStrategy: {},
          byContext: {},
          similarityDistribution: {
            veryHigh: 0,  // 0.9-1.0
            high: 0,      // 0.7-0.9
            medium: 0,    // 0.5-0.7
            low: 0,       // 0.3-0.5
            veryLow: 0    // 0.0-0.3
          }
        };
      }

      // Update merge metrics
      syncMetrics.mergeQualityMetrics.totalMerges++;

      // Update by strategy
      if (!syncMetrics.mergeQualityMetrics.byStrategy[mergeStrategy]) {
        syncMetrics.mergeQualityMetrics.byStrategy[mergeStrategy] = 0;
      }
      syncMetrics.mergeQualityMetrics.byStrategy[mergeStrategy]++;

      // Update by context
      const context = localItem.data?.context || 'unknown';
      if (!syncMetrics.mergeQualityMetrics.byContext[context]) {
        syncMetrics.mergeQualityMetrics.byContext[context] = 0;
      }
      syncMetrics.mergeQualityMetrics.byContext[context]++;

      // Update similarity distribution
      if (textSimilarity >= 0.9) {
        syncMetrics.mergeQualityMetrics.similarityDistribution.veryHigh++;
      } else if (textSimilarity >= 0.7) {
        syncMetrics.mergeQualityMetrics.similarityDistribution.high++;
      } else if (textSimilarity >= 0.5) {
        syncMetrics.mergeQualityMetrics.similarityDistribution.medium++;
      } else if (textSimilarity >= 0.3) {
        syncMetrics.mergeQualityMetrics.similarityDistribution.low++;
      } else {
        syncMetrics.mergeQualityMetrics.similarityDistribution.veryLow++;
      }
    }

    return baseItem;
  } catch (error) {
    console.error('Error merging conflicting items:', error);
    // Fall back to simpler merge strategy
    const baseItem = (localItem.timestamp || 0) >= (serverItem.timestamp || 0) ?
      { ...localItem } : { ...serverItem };

    baseItem.merged = true;
    baseItem.mergeTimestamp = Date.now();
    baseItem.mergeFallback = true;

    return baseItem;
  }
}

/**
 * Intelligently combine results from two versions
 *
 * @param {Object} localResult - Local result
 * @param {Object} serverResult - Server result
 * @param {Object} options - Merge options
 * @returns {Promise<Object>} - Combined result
 */
async function intelligentCombineResults(localResult, serverResult, options) {
  try {
    const { isMedicalContext, localConfidence, serverConfidence } = options;

    // Create a new result object
    const combinedResult = { ...localResult };

    // For text, use the higher confidence version as the base
    if (localConfidence > serverConfidence) {
      combinedResult.text = localResult.text;
    } else {
      combinedResult.text = serverResult.text;
    }

    // For confidence, use a weighted average
    const totalConfidence = localConfidence + serverConfidence;
    if (totalConfidence > 0) {
      combinedResult.confidence = (
        (localConfidence * localResult.confidence) +
        (serverConfidence * serverResult.confidence)
      ) / totalConfidence;
    } else {
      combinedResult.confidence = Math.max(localResult.confidence, serverResult.confidence);
    }

    // For alternatives, combine unique alternatives from both
    if (localResult.alternatives || serverResult.alternatives) {
      const allAlternatives = [
        ...(localResult.alternatives || []),
        ...(serverResult.alternatives || [])
      ];

      // Remove duplicates and sort by confidence
      const uniqueAlternatives = [];
      const seenTexts = new Set();

      for (const alt of allAlternatives) {
        if (!seenTexts.has(alt.text)) {
          uniqueAlternatives.push(alt);
          seenTexts.add(alt.text);
        }
      }

      // Sort by confidence (descending)
      combinedResult.alternatives = uniqueAlternatives.sort((a, b) => b.confidence - a.confidence);

      // Limit to top 5 alternatives
      if (combinedResult.alternatives.length > 5) {
        combinedResult.alternatives = combinedResult.alternatives.slice(0, 5);
      }
    }

    // For medical terms, combine unique terms from both
    if (localResult.medicalTerms || serverResult.medicalTerms) {
      const allTerms = {
        ...(localResult.medicalTerms || {}),
        ...(serverResult.medicalTerms || {})
      };

      combinedResult.medicalTerms = allTerms;
    }

    // Add metadata about the combination
    combinedResult.combined = true;
    combinedResult.combinationMethod = 'intelligent_combine';
    combinedResult.combinationTimestamp = Date.now();

    return combinedResult;
  } catch (error) {
    console.error('Error combining results:', error);
    // Fall back to higher confidence result
    return localConfidence > serverConfidence ? localResult : serverResult;
  }
}

/**
 * Save conflict resolution for analysis
 *
 * @param {Object} conflict - Conflict that was resolved
 * @param {string} strategy - Resolution strategy used
 * @param {Object} result - Resolution result
 */
function saveConflictResolution(conflict, strategy, result) {
  try {
    // Create conflicts directory if it doesn't exist
    if (!fs.existsSync(CONFLICT_DIR)) {
      fs.mkdirSync(CONFLICT_DIR, { recursive: true });
    }

    // Save conflict resolution
    const resolutionPath = path.join(CONFLICT_DIR, `resolution_${conflict.id}_${Date.now()}.json`);
    fs.writeFileSync(resolutionPath, JSON.stringify({
      conflict,
      strategy,
      result,
      timestamp: Date.now()
    }, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving conflict resolution:', error);
  }
}

/**
 * Sync model updates with bandwidth awareness
 *
 * @param {Object} connectionStatus - Current connection status
 * @returns {Promise<Object>} - Sync result
 */
async function syncModelUpdates(connectionStatus) {
  try {
    console.log('Checking for model updates with bandwidth awareness...');

    // Skip large downloads on poor connections unless critical
    if (connectionStatus.quality < 0.3) {
      console.log('Network quality is poor, only checking for critical model updates');
    }

    // Get current model manifest
    const MODEL_DIR = process.env.MODEL_DIR || '../../models';
    const manifestPath = path.join(MODEL_DIR, 'model_manifest.json');

    let currentManifest = { models: {}, lastSync: 0 };
    if (fs.existsSync(manifestPath)) {
      try {
        currentManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch (error) {
        console.error('Error parsing model manifest:', error);
      }
    }

    // Get model manifest from server with bandwidth awareness
    const response = await axios.get(`${API_BASE_URL}/edge/models/manifest`, {
      params: {
        deviceId: DEVICE_ID,
        lastSync: currentManifest.lastSync || 0,
        networkQuality: connectionStatus.quality,
        availableBandwidth: connectionStatus.bandwidth || 'unknown'
      }
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get model manifest');
    }

    const manifest = response.data.manifest;
    const modelUpdates = [];

    // Check for model updates with intelligent filtering
    for (const [modelKey, modelInfo] of Object.entries(manifest.models)) {
      // Skip non-critical updates on poor connections
      if (connectionStatus.quality < 0.3 && !modelInfo.critical) {
        continue;
      }

      const modelPath = path.join(MODEL_DIR, modelInfo.filename);

      // Check if model exists and has correct size/hash
      const needsUpdate = !fs.existsSync(modelPath) ||
                          fs.statSync(modelPath).size !== modelInfo.size ||
                          (modelInfo.hash && getFileHash(modelPath) !== modelInfo.hash);

      if (needsUpdate) {
        modelUpdates.push({
          key: modelKey,
          filename: modelInfo.filename,
          size: modelInfo.size,
          priority: modelInfo.priority || 'normal',
          critical: modelInfo.critical || false
        });
      }
    }

    // Sort updates by priority
    modelUpdates.sort((a, b) => {
      if (a.critical && !b.critical) return -1;
      if (!a.critical && b.critical) return 1;

      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    console.log(`Found ${modelUpdates.length} model updates (${modelUpdates.filter(m => m.critical).length} critical)`);

    // Download model updates with bandwidth awareness
    let downloadedCount = 0;
    let skippedCount = 0;
    let bytesDownloaded = 0;

    for (const model of modelUpdates) {
      try {
        // Skip large non-critical models on poor connections
        if (connectionStatus.quality < 0.5 && !model.critical && model.size > 10000000) { // 10MB
          console.log(`Skipping large non-critical model: ${model.filename} (${(model.size / 1024 / 1024).toFixed(2)}MB)`);
          skippedCount++;
          continue;
        }

        console.log(`Downloading model: ${model.filename} (${(model.size / 1024 / 1024).toFixed(2)}MB)`);

        // Download model with progress tracking
        const modelResponse = await axios.get(`${API_BASE_URL}/edge/models/${model.filename}`, {
          responseType: 'arraybuffer',
          onDownloadProgress: progressEvent => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Download progress: ${percentCompleted}%`);
          }
        });

        // Save model
        const modelPath = path.join(MODEL_DIR, model.filename);
        fs.writeFileSync(modelPath, Buffer.from(modelResponse.data));

        downloadedCount++;
        bytesDownloaded += model.size;

        // Update metrics
        syncMetrics.bytesDownloaded += model.size;
      } catch (error) {
        console.error(`Error downloading model ${model.filename}:`, error);
      }
    }

    // Save model manifest
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    // Sync medical terminology with bandwidth awareness
    const terminologyResult = await syncMedicalTerminology(connectionStatus);

    return {
      success: true,
      updatesAvailable: modelUpdates.length,
      updatesDownloaded: downloadedCount,
      updatesSkipped: skippedCount,
      bytesDownloaded,
      terminology: terminologyResult
    };
  } catch (error) {
    console.error('Error syncing model updates:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Sync medical terminology with bandwidth awareness
 *
 * @param {Object} connectionStatus - Current connection status
 * @returns {Promise<Object>} - Sync result
 */
async function syncMedicalTerminology(connectionStatus) {
  try {
    console.log('Syncing medical terminology with bandwidth awareness...');

    // Get current terminology manifest
    const MODEL_DIR = process.env.MODEL_DIR || '../../models';
    const manifestPath = path.join(MODEL_DIR, 'terminology_manifest.json');

    let currentManifest = { terminology: [], lastSync: 0 };
    if (fs.existsSync(manifestPath)) {
      try {
        currentManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch (error) {
        console.error('Error parsing terminology manifest:', error);
      }
    }

    // Prepare request data with network awareness
    const requestData = {
      deviceId: DEVICE_ID,
      lastSync: currentManifest.lastSync || 0,
      networkQuality: connectionStatus.quality,
      currentTerminology: currentManifest.terminology ? currentManifest.terminology.map(term => ({
        id: term.id,
        version: term.version,
        termCount: term.term_count || 0
      })) : [],
      capabilities: {
        deltaSync: true,
        compression: true
      }
    };

    // Get terminology updates
    let response;
    try {
      if (process.env.NODE_ENV === 'development') {
        // Mock response for development
        console.log('[DEV] Using mock terminology response');
        response = {
          data: {
            success: true,
            updates: [
              {
                id: 'en-es',
                source_language: 'en',
                target_language: 'es',
                version: '1.0.0',
                terms: {
                  'heart attack': 'ataque cardíaco',
                  'blood pressure': 'presión arterial',
                  'diabetes': 'diabetes'
                }
              }
            ],
            removals: []
          }
        };
      } else {
        response = await axios.post(`${API_BASE_URL}/edge/terminology/sync`, requestData);
      }
    } catch (error) {
      console.error('Error getting terminology updates:', error);
      return { success: false, error: error.message };
    }

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get terminology updates');
    }

    const { updates, removals } = response.data;

    // Process updates
    let updatedCount = 0;
    let termCount = 0;

    for (const update of updates) {
      const { id, source_language, target_language, version, terms } = update;

      // Create directory for language pair if it doesn't exist
      const langDir = path.join(MODEL_DIR, 'terminology', `${source_language}-${target_language}`);
      if (!fs.existsSync(langDir)) {
        fs.mkdirSync(langDir, { recursive: true });
      }

      // Save terminology
      const termsPath = path.join(langDir, 'terms.json');
      fs.writeFileSync(termsPath, JSON.stringify(terms, null, 2), 'utf8');

      updatedCount++;
      termCount += Object.keys(terms).length;
    }

    // Process removals
    let removedCount = 0;

    for (const removal of removals) {
      const { id, source_language, target_language } = removal;

      // Remove terminology file
      const langDir = path.join(MODEL_DIR, 'terminology', `${source_language}-${target_language}`);
      const termsPath = path.join(langDir, 'terms.json');

      if (fs.existsSync(termsPath)) {
        fs.unlinkSync(termsPath);
        removedCount++;
      }
    }

    // Update manifest
    currentManifest.lastSync = Date.now();
    currentManifest.terminology = updates.map(update => ({
      id: update.id,
      source_language: update.source_language,
      target_language: update.target_language,
      version: update.version,
      term_count: Object.keys(update.terms).length
    }));

    // Save manifest
    fs.writeFileSync(manifestPath, JSON.stringify(currentManifest, null, 2), 'utf8');

    return {
      success: true,
      updatedCount,
      removedCount,
      termCount
    };
  } catch (error) {
    console.error('Error syncing medical terminology:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get file hash for integrity verification
 *
 * @param {string} filePath - Path to file
 * @returns {string} - File hash
 */
function getFileHash(filePath) {
  try {
    const fileData = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(fileData).digest('hex');
  } catch (error) {
    console.error(`Error calculating hash for ${filePath}:`, error);
    return '';
  }
}

/**
 * Queue a translation for sync with enhanced metadata and quality tracking
 *
 * @param {string} text - Original text
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @param {Object} result - Translation result
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Queue result
 */
async function queueTranslation(text, sourceLanguage, targetLanguage, context, result, options = {}) {
  try {
    // Generate a unique ID with better uniqueness
    const id = crypto.createHash('md5')
      .update(`${text}:${sourceLanguage}:${targetLanguage}:${context}:${Date.now()}:${Math.random()}`)
      .digest('hex');

    // Determine priority based on context and options
    let priority = options.priority || SYNC_PRIORITY_LEVELS.LOW;

    // Medical contexts are more important
    if (context === 'emergency' || context === 'critical_care') {
      priority = SYNC_PRIORITY_LEVELS.CRITICAL;
    } else if (context === 'diagnosis' || context === 'medication') {
      priority = SYNC_PRIORITY_LEVELS.HIGH;
    } else if (context !== 'general' && context !== 'conversation') {
      priority = SYNC_PRIORITY_LEVELS.MEDIUM;
    }

    // Track quality metrics for this translation
    const qualityData = await trackTranslationQuality(text, sourceLanguage, targetLanguage, context, result, options);

    // Apply cultural context adaptation if region is specified
    let adaptedResult = result;
    if (options.region) {
      adaptedResult = await applyCulturalContextAdaptation(result, sourceLanguage, targetLanguage, context, options.region);
    }

    // Create enhanced sync item with more metadata
    const syncItem = {
      id,
      timestamp: Date.now(),
      type: 'translation',
      priority,
      version: options.version || '1.0',
      deviceId: DEVICE_ID,
      networkInfo: networkMonitor.getNetworkStatus(),
      data: {
        text,
        sourceLanguage,
        targetLanguage,
        context,
        result: adaptedResult,
        qualityMetrics: qualityData,
        metadata: {
          deviceId: DEVICE_ID,
          timestamp: Date.now(),
          sessionId: options.sessionId,
          userId: options.userId,
          location: options.location,
          region: options.region,
          specialty: options.specialty,
          modelId: result.modelId || options.modelId,
          confidence: result.confidence,
          offline: !networkMonitor.getNetworkStatus().online,
          culturallyAdapted: !!options.region
        }
      }
    };

    // Calculate size for metrics
    syncItem.size = Buffer.from(JSON.stringify(syncItem)).length;

    // Add to queue
    syncQueue.push(syncItem);

    // Save to file
    const syncFilePath = path.join(SYNC_DIR, `${syncItem.id}.json`);
    fs.writeFileSync(syncFilePath, JSON.stringify(syncItem, null, 2), 'utf8');

    console.log(`Queued translation for sync: ${syncItem.id} (priority: ${priority}, size: ${syncItem.size} bytes)`);

    // If we're online and this is a high priority item, trigger immediate sync
    if (networkMonitor.getNetworkStatus().online &&
        (priority === SYNC_PRIORITY_LEVELS.CRITICAL || priority === SYNC_PRIORITY_LEVELS.HIGH) &&
        !syncInProgress) {
      console.log('High priority item queued, triggering immediate sync');
      setTimeout(() => syncWithCloud(), 100);
    }

    return {
      success: true,
      id: syncItem.id,
      queued: true,
      priority,
      size: syncItem.size,
      qualityTracked: qualityData.tracked,
      culturallyAdapted: !!options.region
    };
  } catch (error) {
    console.error('Error queuing translation for sync:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Track translation quality metrics
 *
 * @param {string} text - Original text
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @param {Object} result - Translation result
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Quality tracking result
 */
async function trackTranslationQuality(text, sourceLanguage, targetLanguage, context, result, options = {}) {
  try {
    // Create language pair key
    const langPairKey = `${sourceLanguage}-${targetLanguage}`;

    // Get model ID
    const modelId = result.modelId || options.modelId || 'unknown';

    // Initialize quality data
    const qualityData = {
      tracked: true,
      timestamp: Date.now(),
      confidence: result.confidence || 0,
      modelId,
      context,
      languagePair: langPairKey,
      metrics: {}
    };

    // Track metrics by model
    if (!qualityMetrics.modelPerformance[modelId]) {
      qualityMetrics.modelPerformance[modelId] = {
        totalTranslations: 0,
        averageConfidence: 0,
        byContext: {},
        byLanguagePair: {}
      };
    }

    // Update model metrics
    const modelMetrics = qualityMetrics.modelPerformance[modelId];
    modelMetrics.totalTranslations++;

    // Update average confidence
    const totalConfidence = modelMetrics.averageConfidence * (modelMetrics.totalTranslations - 1) + (result.confidence || 0);
    modelMetrics.averageConfidence = totalConfidence / modelMetrics.totalTranslations;

    // Update context metrics for this model
    if (!modelMetrics.byContext[context]) {
      modelMetrics.byContext[context] = {
        count: 0,
        averageConfidence: 0
      };
    }
    modelMetrics.byContext[context].count++;

    const contextConfidence = modelMetrics.byContext[context].averageConfidence *
                             (modelMetrics.byContext[context].count - 1) +
                             (result.confidence || 0);
    modelMetrics.byContext[context].averageConfidence = contextConfidence / modelMetrics.byContext[context].count;

    // Update language pair metrics for this model
    if (!modelMetrics.byLanguagePair[langPairKey]) {
      modelMetrics.byLanguagePair[langPairKey] = {
        count: 0,
        averageConfidence: 0
      };
    }
    modelMetrics.byLanguagePair[langPairKey].count++;

    const langPairConfidence = modelMetrics.byLanguagePair[langPairKey].averageConfidence *
                              (modelMetrics.byLanguagePair[langPairKey].count - 1) +
                              (result.confidence || 0);
    modelMetrics.byLanguagePair[langPairKey].averageConfidence = langPairConfidence / modelMetrics.byLanguagePair[langPairKey].count;

    // Track metrics by context
    if (!qualityMetrics.contextPerformance[context]) {
      qualityMetrics.contextPerformance[context] = {
        totalTranslations: 0,
        averageConfidence: 0,
        byModel: {}
      };
    }

    // Update context metrics
    const contextMetrics = qualityMetrics.contextPerformance[context];
    contextMetrics.totalTranslations++;

    // Update average confidence for context
    const contextTotalConfidence = contextMetrics.averageConfidence * (contextMetrics.totalTranslations - 1) + (result.confidence || 0);
    contextMetrics.averageConfidence = contextTotalConfidence / contextMetrics.totalTranslations;

    // Update model metrics for this context
    if (!contextMetrics.byModel[modelId]) {
      contextMetrics.byModel[modelId] = {
        count: 0,
        averageConfidence: 0
      };
    }
    contextMetrics.byModel[modelId].count++;

    const modelInContextConfidence = contextMetrics.byModel[modelId].averageConfidence *
                                   (contextMetrics.byModel[modelId].count - 1) +
                                   (result.confidence || 0);
    contextMetrics.byModel[modelId].averageConfidence = modelInContextConfidence / contextMetrics.byModel[modelId].count;

    // Track metrics by language pair
    if (!qualityMetrics.languagePairPerformance[langPairKey]) {
      qualityMetrics.languagePairPerformance[langPairKey] = {
        totalTranslations: 0,
        averageConfidence: 0,
        byContext: {},
        byModel: {}
      };
    }

    // Update language pair metrics
    const langPairMetrics = qualityMetrics.languagePairPerformance[langPairKey];
    langPairMetrics.totalTranslations++;

    // Update average confidence for language pair
    const langPairTotalConfidence = langPairMetrics.averageConfidence * (langPairMetrics.totalTranslations - 1) + (result.confidence || 0);
    langPairMetrics.averageConfidence = langPairTotalConfidence / langPairMetrics.totalTranslations;

    // Update context metrics for this language pair
    if (!langPairMetrics.byContext[context]) {
      langPairMetrics.byContext[context] = {
        count: 0,
        averageConfidence: 0
      };
    }
    langPairMetrics.byContext[context].count++;

    const contextInLangPairConfidence = langPairMetrics.byContext[context].averageConfidence *
                                      (langPairMetrics.byContext[context].count - 1) +
                                      (result.confidence || 0);
    langPairMetrics.byContext[context].averageConfidence = contextInLangPairConfidence / langPairMetrics.byContext[context].count;

    // Update model metrics for this language pair
    if (!langPairMetrics.byModel[modelId]) {
      langPairMetrics.byModel[modelId] = {
        count: 0,
        averageConfidence: 0
      };
    }
    langPairMetrics.byModel[modelId].count++;

    const modelInLangPairConfidence = langPairMetrics.byModel[modelId].averageConfidence *
                                    (langPairMetrics.byModel[modelId].count - 1) +
                                    (result.confidence || 0);
    langPairMetrics.byModel[modelId].averageConfidence = modelInLangPairConfidence / langPairMetrics.byModel[modelId].count;

    // Save updated metrics
    await saveQualityMetrics();

    // Add metrics to quality data
    qualityData.metrics = {
      modelConfidence: modelMetrics.averageConfidence,
      contextConfidence: contextMetrics.averageConfidence,
      languagePairConfidence: langPairMetrics.averageConfidence
    };

    return qualityData;
  } catch (error) {
    console.error('Error tracking translation quality:', error);
    return {
      tracked: false,
      error: error.message
    };
  }
}

// Cache for region-specific terms
const regionTermsCache = new Map();
const regionTermsRegexCache = new Map();
const REGION_TERMS_CACHE_MAX_SIZE = 50;

/**
 * Apply cultural context adaptation to translation result with optimized performance
 *
 * @param {Object} result - Translation result
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @param {string} region - Target region code
 * @returns {Promise<Object>} - Adapted translation result
 */
async function applyCulturalContextAdaptation(result, sourceLanguage, targetLanguage, context, region) {
  try {
    // Skip adaptation if no translated text
    if (!result.translatedText) {
      return result;
    }

    // Create shallow clone of the result to avoid modifying the original
    const adaptedResult = { ...result };

    // Create language pair key
    const langPairKey = `${sourceLanguage}-${targetLanguage}`;

    // Create region key
    const regionKey = `${langPairKey}-${region}`;

    // Get region-specific terms from cache or load them
    let regionTerms;
    if (regionTermsCache.has(regionKey)) {
      regionTerms = regionTermsCache.get(regionKey);
    } else {
      // Check if we have region-specific terms in metrics
      if (!qualityMetrics.culturalAdaptation.regionSpecificTerms[regionKey]) {
        // Initialize region-specific terms if not exists
        qualityMetrics.culturalAdaptation.regionSpecificTerms[regionKey] = {};

        // Try to load region-specific terms from file
        const regionTermsPath = path.join(CONFIG_DIR, 'region-terms', `${regionKey}.json`);
        if (fs.existsSync(regionTermsPath)) {
          try {
            const loadedTerms = JSON.parse(fs.readFileSync(regionTermsPath, 'utf8'));
            qualityMetrics.culturalAdaptation.regionSpecificTerms[regionKey] = loadedTerms;
          } catch (error) {
            console.error(`Error loading region-specific terms for ${regionKey}:`, error);
          }
        }
      }

      regionTerms = qualityMetrics.culturalAdaptation.regionSpecificTerms[regionKey] || {};

      // Add to cache
      regionTermsCache.set(regionKey, regionTerms);

      // Manage cache size
      if (regionTermsCache.size > REGION_TERMS_CACHE_MAX_SIZE) {
        // Remove oldest entry (first key in the map)
        const firstKey = regionTermsCache.keys().next().value;
        regionTermsCache.delete(firstKey);
        regionTermsRegexCache.delete(firstKey);
      }
    }

    // Skip if no terms to apply
    if (Object.keys(regionTerms).length === 0) {
      return result;
    }

    // Apply region-specific adaptations
    let adaptationsMade = 0;
    let translatedText = adaptedResult.translatedText;

    // Get or create regex patterns for this region
    let regexPatterns;
    if (regionTermsRegexCache.has(regionKey)) {
      regexPatterns = regionTermsRegexCache.get(regionKey);
    } else {
      // Create regex patterns for all terms at once (more efficient)
      regexPatterns = Object.entries(regionTerms).map(([standardTerm, regionalTerm]) => ({
        regex: new RegExp(`\\b${standardTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi'),
        replacement: regionalTerm
      }));

      // Cache the patterns
      regionTermsRegexCache.set(regionKey, regexPatterns);
    }

    // Apply all patterns in a single pass
    for (const { regex, replacement } of regexPatterns) {
      // Reset regex lastIndex
      regex.lastIndex = 0;

      // Check if the term exists in the text before replacing
      if (regex.test(translatedText)) {
        // Reset regex lastIndex after test
        regex.lastIndex = 0;

        // Count occurrences for metrics
        const originalText = translatedText;
        translatedText = translatedText.replace(regex, replacement);

        // Count how many replacements were made
        const occurrences = (originalText.match(regex) || []).length;
        adaptationsMade += occurrences;
      }
    }

    // Update translated text if changes were made
    if (adaptationsMade > 0) {
      adaptedResult.translatedText = translatedText;
      adaptedResult.culturallyAdapted = true;
      adaptedResult.adaptationsMade = adaptationsMade;

      // Update cultural adaptation metrics (using a more efficient approach)
      const currentRate = qualityMetrics.culturalAdaptation.adaptationSuccessRate || 0;
      const currentCount = qualityMetrics.culturalAdaptation.regionMismatches || 0;

      // Update metrics with batch tracking
      qualityMetrics.recentChanges = qualityMetrics.recentChanges || [];
      qualityMetrics.recentChanges.push({
        type: 'cultural_adaptation',
        timestamp: Date.now(),
        regionKey,
        adaptationsMade
      });

      // Update success rate and count
      qualityMetrics.culturalAdaptation.adaptationSuccessRate =
        (currentRate * currentCount + 1) / (currentCount + 1);
      qualityMetrics.culturalAdaptation.regionMismatches = currentCount + 1;

      // Schedule metrics save instead of immediate save for better performance
      if (!qualityMetrics.saveScheduled) {
        qualityMetrics.saveScheduled = true;
        setTimeout(async () => {
          qualityMetrics.saveScheduled = false;
          await saveQualityMetrics();
        }, 5000); // Delay save to batch multiple adaptations
      }
    }

    return adaptedResult;
  } catch (error) {
    console.error('Error applying cultural context adaptation:', error);
    return result; // Return original result on error
  }
}

/**
 * Queue audio translation for sync with enhanced metadata, quality tracking, and cultural adaptation
 *
 * @param {string} audioPath - Path to audio file
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @param {Object} result - Translation result
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Queue result
 */
async function queueAudioTranslation(audioPath, sourceLanguage, targetLanguage, context, result, options = {}) {
  try {
    // Generate a unique ID
    const id = crypto.createHash('md5')
      .update(`${audioPath}:${sourceLanguage}:${targetLanguage}:${context}:${Date.now()}:${Math.random()}`)
      .digest('hex');

    // Determine priority based on context and options
    let priority = options.priority || SYNC_PRIORITY_LEVELS.LOW;

    // Medical contexts are more important
    if (context === 'emergency' || context === 'critical_care') {
      priority = SYNC_PRIORITY_LEVELS.CRITICAL;
    } else if (context === 'diagnosis' || context === 'medication') {
      priority = SYNC_PRIORITY_LEVELS.HIGH;
    } else if (context !== 'general' && context !== 'conversation') {
      priority = SYNC_PRIORITY_LEVELS.MEDIUM;
    }

    // Extract text from result for quality tracking
    const text = result.transcription || result.originalText || '';

    // Track quality metrics for this translation
    const qualityData = await trackTranslationQuality(text, sourceLanguage, targetLanguage, context, result, {
      ...options,
      isAudio: true
    });

    // Apply cultural context adaptation if region is specified
    let adaptedResult = result;
    if (options.region) {
      adaptedResult = await applyCulturalContextAdaptation(result, sourceLanguage, targetLanguage, context, options.region);
    }

    // Create enhanced sync item with more metadata
    const syncItem = {
      id,
      timestamp: Date.now(),
      type: 'audio_translation',
      priority,
      version: options.version || '1.0',
      deviceId: DEVICE_ID,
      networkInfo: networkMonitor.getNetworkStatus(),
      data: {
        audioPath,
        sourceLanguage,
        targetLanguage,
        context,
        result: adaptedResult,
        qualityMetrics: qualityData,
        metadata: {
          deviceId: DEVICE_ID,
          timestamp: Date.now(),
          sessionId: options.sessionId,
          userId: options.userId,
          location: options.location,
          region: options.region,
          specialty: options.specialty,
          modelId: result.modelId || options.modelId,
          confidence: result.confidence,
          offline: !networkMonitor.getNetworkStatus().online,
          duration: options.duration,
          fileSize: options.fileSize,
          audioQuality: options.audioQuality,
          culturallyAdapted: !!options.region
        }
      }
    };

    // Calculate size for metrics
    syncItem.size = Buffer.from(JSON.stringify(syncItem)).length;

    // Add to queue
    syncQueue.push(syncItem);

    // Save to file
    const syncFilePath = path.join(SYNC_DIR, `${syncItem.id}.json`);
    fs.writeFileSync(syncFilePath, JSON.stringify(syncItem, null, 2), 'utf8');

    console.log(`Queued audio translation for sync: ${syncItem.id} (priority: ${priority}, size: ${syncItem.size} bytes)`);

    // If we're online and this is a high priority item, trigger immediate sync
    if (networkMonitor.getNetworkStatus().online &&
        (priority === SYNC_PRIORITY_LEVELS.CRITICAL || priority === SYNC_PRIORITY_LEVELS.HIGH) &&
        !syncInProgress) {
      console.log('High priority item queued, triggering immediate sync');
      setTimeout(() => syncWithCloud(), 100);
    }

    return {
      success: true,
      id: syncItem.id,
      queued: true,
      priority,
      size: syncItem.size,
      qualityTracked: qualityData.tracked,
      culturallyAdapted: !!options.region
    };
  } catch (error) {
    console.error('Error queuing audio translation for sync:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Manually trigger a sync with cloud
 *
 * @returns {Promise<Object>} - Sync result
 */
async function manualSync() {
  console.log('Manual sync triggered');

  // If sync is already in progress, wait for it to complete
  if (syncInProgress) {
    console.log('Sync already in progress, waiting...');

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!syncInProgress) {
          clearInterval(checkInterval);
          syncWithCloud().then(resolve);
        }
      }, 500);
    });
  }

  // Otherwise, start a new sync
  return syncWithCloud();
}

// Feedback batch processing
const feedbackBatchQueue = [];
let feedbackBatchProcessing = false;
let feedbackBatchTimer = null;
const FEEDBACK_BATCH_SIZE = 20;
const FEEDBACK_BATCH_INTERVAL = 5000; // 5 seconds

/**
 * Record user feedback for a translation with batch processing
 *
 * @param {string} translationId - ID of the translation
 * @param {boolean} isPositive - Whether the feedback is positive
 * @param {Object} details - Additional feedback details
 * @returns {Promise<Object>} - Feedback result
 */
async function recordTranslationFeedback(translationId, isPositive, details = {}) {
  try {
    console.log(`Recording ${isPositive ? 'positive' : 'negative'} feedback for translation ${translationId}`);

    // Create feedback directory if it doesn't exist
    if (!fs.existsSync(FEEDBACK_DIR)) {
      fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
    }

    // Generate a unique ID for the feedback
    const feedbackId = crypto.createHash('md5')
      .update(`${translationId}:${Date.now()}:${Math.random()}`)
      .digest('hex');

    // Create feedback item
    const feedbackItem = {
      id: feedbackId,
      translationId,
      timestamp: Date.now(),
      isPositive,
      details: {
        ...details,
        deviceId: DEVICE_ID,
        networkStatus: networkMonitor.getNetworkStatus()
      }
    };

    // Add to batch queue for processing
    feedbackBatchQueue.push(feedbackItem);

    // Schedule batch processing if not already scheduled
    if (!feedbackBatchTimer) {
      feedbackBatchTimer = setTimeout(() => processFeedbackBatch(), FEEDBACK_BATCH_INTERVAL);
    }

    // Process immediately if batch size threshold reached
    if (feedbackBatchQueue.length >= FEEDBACK_BATCH_SIZE && !feedbackBatchProcessing) {
      clearTimeout(feedbackBatchTimer);
      feedbackBatchTimer = null;
      processFeedbackBatch();
    }

    return {
      success: true,
      id: feedbackId,
      recorded: true,
      queued: true,
      batchProcessing: true
    };
  } catch (error) {
    console.error('Error recording translation feedback:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process feedback batch
 *
 * @returns {Promise<void>}
 */
async function processFeedbackBatch() {
  if (feedbackBatchProcessing || feedbackBatchQueue.length === 0) {
    return;
  }

  feedbackBatchProcessing = true;
  console.log(`Processing feedback batch of ${feedbackBatchQueue.length} items`);

  try {
    // Take items from the queue (up to batch size)
    const batchItems = feedbackBatchQueue.splice(0, FEEDBACK_BATCH_SIZE);

    // Track metrics updates for batch
    const metricsUpdates = {
      positive: 0,
      negative: 0,
      byContext: {},
      byModel: {}
    };

    // Process each feedback item
    for (const feedbackItem of batchItems) {
      try {
        // Save feedback to file
        const feedbackPath = path.join(FEEDBACK_DIR, `${feedbackItem.id}.json`);
        fs.writeFileSync(feedbackPath, JSON.stringify(feedbackItem, null, 2), 'utf8');

        // Update metrics tracking
        if (feedbackItem.isPositive) {
          metricsUpdates.positive++;
        } else {
          metricsUpdates.negative++;
        }

        // Track context-specific updates
        const context = feedbackItem.details.context;
        if (context) {
          if (!metricsUpdates.byContext[context]) {
            metricsUpdates.byContext[context] = { positive: 0, negative: 0 };
          }

          if (feedbackItem.isPositive) {
            metricsUpdates.byContext[context].positive++;
          } else {
            metricsUpdates.byContext[context].negative++;
          }
        }

        // Track model-specific updates
        const modelId = feedbackItem.details.modelId;
        if (modelId) {
          if (!metricsUpdates.byModel[modelId]) {
            metricsUpdates.byModel[modelId] = { positive: 0, negative: 0 };
          }

          if (feedbackItem.isPositive) {
            metricsUpdates.byModel[modelId].positive++;
          } else {
            metricsUpdates.byModel[modelId].negative++;
          }
        }

        // Queue feedback for sync
        const syncItem = {
          id: feedbackItem.id,
          timestamp: feedbackItem.timestamp,
          type: 'feedback',
          priority: SYNC_PRIORITY_LEVELS.MEDIUM,
          version: '1.0',
          deviceId: DEVICE_ID,
          data: feedbackItem
        };

        // Calculate size for metrics
        syncItem.size = Buffer.from(JSON.stringify(syncItem)).length;

        // Add to sync queue
        syncQueue.push(syncItem);

        // Save to sync file
        const syncFilePath = path.join(SYNC_DIR, `feedback_${feedbackItem.id}.json`);
        fs.writeFileSync(syncFilePath, JSON.stringify(syncItem, null, 2), 'utf8');
      } catch (itemError) {
        console.error(`Error processing feedback item ${feedbackItem.id}:`, itemError);
      }
    }

    // Bulk update quality metrics
    qualityMetrics.feedbackStats.positive += metricsUpdates.positive;
    qualityMetrics.feedbackStats.negative += metricsUpdates.negative;

    // Update context-specific metrics
    for (const [context, counts] of Object.entries(metricsUpdates.byContext)) {
      if (!qualityMetrics.feedbackStats.byContext[context]) {
        qualityMetrics.feedbackStats.byContext[context] = {
          positive: 0,
          negative: 0,
          total: 0
        };
      }

      qualityMetrics.feedbackStats.byContext[context].positive += counts.positive;
      qualityMetrics.feedbackStats.byContext[context].negative += counts.negative;
      qualityMetrics.feedbackStats.byContext[context].total += counts.positive + counts.negative;
    }

    // Update model-specific metrics
    for (const [modelId, counts] of Object.entries(metricsUpdates.byModel)) {
      if (!qualityMetrics.feedbackStats.byModel[modelId]) {
        qualityMetrics.feedbackStats.byModel[modelId] = {
          positive: 0,
          negative: 0,
          total: 0
        };
      }

      qualityMetrics.feedbackStats.byModel[modelId].positive += counts.positive;
      qualityMetrics.feedbackStats.byModel[modelId].negative += counts.negative;
      qualityMetrics.feedbackStats.byModel[modelId].total += counts.positive + counts.negative;
    }

    // Track recent changes for incremental updates
    qualityMetrics.recentChanges = qualityMetrics.recentChanges || [];
    qualityMetrics.recentChanges.push({
      type: 'feedback_batch',
      timestamp: Date.now(),
      count: batchItems.length,
      updates: metricsUpdates
    });

    // Save updated metrics
    await saveQualityMetrics();

    console.log(`Processed feedback batch of ${batchItems.length} items successfully`);
  } catch (error) {
    console.error('Error processing feedback batch:', error);
  } finally {
    feedbackBatchProcessing = false;

    // If there are more items in the queue, schedule another batch
    if (feedbackBatchQueue.length > 0) {
      feedbackBatchTimer = setTimeout(() => processFeedbackBatch(), FEEDBACK_BATCH_INTERVAL);
    } else {
      feedbackBatchTimer = null;
    }
  }
}

/**
 * Record multiple feedback items at once (bulk operation)
 *
 * @param {Array} feedbackItems - Array of feedback items to record
 * @returns {Promise<Object>} - Bulk feedback result
 */
async function recordBulkFeedback(feedbackItems) {
  try {
    if (!Array.isArray(feedbackItems) || feedbackItems.length === 0) {
      return {
        success: false,
        error: 'No feedback items provided or invalid format'
      };
    }

    console.log(`Recording bulk feedback with ${feedbackItems.length} items`);

    // Add all items to the batch queue
    for (const item of feedbackItems) {
      if (!item.translationId) {
        console.warn('Skipping feedback item without translationId');
        continue;
      }

      // Generate a unique ID for the feedback
      const feedbackId = crypto.createHash('md5')
        .update(`${item.translationId}:${Date.now()}:${Math.random()}`)
        .digest('hex');

      // Create feedback item
      const feedbackItem = {
        id: feedbackId,
        translationId: item.translationId,
        timestamp: Date.now(),
        isPositive: item.isPositive === true,
        details: {
          ...(item.details || {}),
          deviceId: DEVICE_ID,
          networkStatus: networkMonitor.getNetworkStatus()
        }
      };

      // Add to batch queue
      feedbackBatchQueue.push(feedbackItem);
    }

    // Process immediately
    clearTimeout(feedbackBatchTimer);
    feedbackBatchTimer = null;
    processFeedbackBatch();

    return {
      success: true,
      count: feedbackItems.length,
      queued: true,
      batchProcessing: true
    };
  } catch (error) {
    console.error('Error recording bulk feedback:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Start trend analysis interval
 */
function startTrendAnalysisInterval() {
  console.log(`Starting trend analysis interval (${TREND_ANALYSIS_INTERVAL}ms)`);

  // Perform initial analysis
  setTimeout(() => analyzeTrends(), 10000); // 10 seconds after startup

  // Set up interval for regular analysis
  setInterval(() => analyzeTrends(), TREND_ANALYSIS_INTERVAL);
}

/**
 * Start anomaly detection interval
 */
function startAnomalyDetectionInterval() {
  console.log(`Starting anomaly detection interval (${ANOMALY_DETECTION_INTERVAL}ms)`);

  // Perform initial detection after trend analysis
  setTimeout(() => detectAnomalies(), 20000); // 20 seconds after startup

  // Set up interval for regular detection
  setInterval(() => detectAnomalies(), ANOMALY_DETECTION_INTERVAL);
}

/**
 * Analyze trends in quality metrics
 *
 * @returns {Promise<Object>} - Analysis result
 */
async function analyzeTrends() {
  try {
    console.log('Analyzing translation quality trends...');

    // Calculate overall confidence trend
    const overallConfidence = calculateOverallConfidence();

    // Add to confidence over time trend
    const confidenceDataPoint = {
      timestamp: Date.now(),
      confidence: overallConfidence,
      models: Object.keys(qualityMetrics.modelPerformance).length,
      contexts: Object.keys(qualityMetrics.contextPerformance).length,
      languagePairs: Object.keys(qualityMetrics.languagePairPerformance).length
    };

    qualityMetrics.trends.confidenceOverTime.push(confidenceDataPoint);

    // Limit the number of data points
    if (qualityMetrics.trends.confidenceOverTime.length > MAX_TREND_DATA_POINTS) {
      qualityMetrics.trends.confidenceOverTime = qualityMetrics.trends.confidenceOverTime.slice(-MAX_TREND_DATA_POINTS);
    }

    // Calculate feedback trend
    const feedbackStats = calculateFeedbackStats();

    // Add to feedback over time trend
    const feedbackDataPoint = {
      timestamp: Date.now(),
      positive: feedbackStats.positive,
      negative: feedbackStats.negative,
      positiveRate: feedbackStats.positiveRate,
      total: feedbackStats.total
    };

    qualityMetrics.trends.feedbackOverTime.push(feedbackDataPoint);

    // Limit the number of data points
    if (qualityMetrics.trends.feedbackOverTime.length > MAX_TREND_DATA_POINTS) {
      qualityMetrics.trends.feedbackOverTime = qualityMetrics.trends.feedbackOverTime.slice(-MAX_TREND_DATA_POINTS);
    }

    // Update quality by hour of day
    const hour = new Date().getHours();
    qualityMetrics.trends.qualityByHour[hour] =
      (qualityMetrics.trends.qualityByHour[hour] * 0.8) + (overallConfidence * 0.2);

    // Update quality by day of week
    const day = new Date().getDay();
    qualityMetrics.trends.qualityByDay[day] =
      (qualityMetrics.trends.qualityByDay[day] * 0.8) + (overallConfidence * 0.2);

    // Analyze model performance trends
    analyzeModelPerformanceTrends();

    // Analyze context performance trends
    analyzeContextPerformanceTrends();

    // Analyze language pair performance trends
    analyzeLanguagePairPerformanceTrends();

    // Save trend data
    await saveTrendData();

    console.log('Translation quality trend analysis completed');

    return {
      success: true,
      confidence: overallConfidence,
      feedback: feedbackStats
    };
  } catch (error) {
    console.error('Error analyzing trends:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calculate overall confidence across all models and contexts
 *
 * @returns {number} - Overall confidence score
 */
function calculateOverallConfidence() {
  try {
    let totalConfidence = 0;
    let totalModels = 0;

    // Calculate average confidence across all models
    for (const modelData of Object.values(qualityMetrics.modelPerformance)) {
      if (typeof modelData.averageConfidence === 'number') {
        totalConfidence += modelData.averageConfidence;
        totalModels++;
      }
    }

    // If no models, try contexts
    if (totalModels === 0) {
      for (const contextData of Object.values(qualityMetrics.contextPerformance)) {
        if (typeof contextData.averageConfidence === 'number') {
          totalConfidence += contextData.averageConfidence;
          totalModels++;
        }
      }
    }

    // If still no data, try language pairs
    if (totalModels === 0) {
      for (const langPairData of Object.values(qualityMetrics.languagePairPerformance)) {
        if (typeof langPairData.averageConfidence === 'number') {
          totalConfidence += langPairData.averageConfidence;
          totalModels++;
        }
      }
    }

    return totalModels > 0 ? totalConfidence / totalModels : 0;
  } catch (error) {
    console.error('Error calculating overall confidence:', error);
    return 0;
  }
}

/**
 * Calculate feedback statistics
 *
 * @returns {Object} - Feedback statistics
 */
function calculateFeedbackStats() {
  try {
    const positive = qualityMetrics.feedbackStats.positive || 0;
    const negative = qualityMetrics.feedbackStats.negative || 0;
    const total = positive + negative;

    return {
      positive,
      negative,
      total,
      positiveRate: total > 0 ? positive / total : 0
    };
  } catch (error) {
    console.error('Error calculating feedback stats:', error);
    return {
      positive: 0,
      negative: 0,
      total: 0,
      positiveRate: 0
    };
  }
}

/**
 * Analyze model performance trends
 */
function analyzeModelPerformanceTrends() {
  try {
    for (const [modelId, modelData] of Object.entries(qualityMetrics.modelPerformance)) {
      if (!qualityMetrics.trends.modelPerformanceTrend[modelId]) {
        qualityMetrics.trends.modelPerformanceTrend[modelId] = {
          confidenceHistory: [],
          contextPerformance: {},
          languagePairPerformance: {}
        };
      }

      // Add confidence data point
      qualityMetrics.trends.modelPerformanceTrend[modelId].confidenceHistory.push({
        timestamp: Date.now(),
        confidence: modelData.averageConfidence || 0,
        totalTranslations: modelData.totalTranslations || 0
      });

      // Limit history size
      if (qualityMetrics.trends.modelPerformanceTrend[modelId].confidenceHistory.length > MAX_TREND_DATA_POINTS) {
        qualityMetrics.trends.modelPerformanceTrend[modelId].confidenceHistory =
          qualityMetrics.trends.modelPerformanceTrend[modelId].confidenceHistory.slice(-MAX_TREND_DATA_POINTS);
      }

      // Track context performance for this model
      if (modelData.byContext) {
        for (const [context, contextData] of Object.entries(modelData.byContext)) {
          if (!qualityMetrics.trends.modelPerformanceTrend[modelId].contextPerformance[context]) {
            qualityMetrics.trends.modelPerformanceTrend[modelId].contextPerformance[context] = {
              confidenceHistory: []
            };
          }

          // Add context confidence data point
          qualityMetrics.trends.modelPerformanceTrend[modelId].contextPerformance[context].confidenceHistory.push({
            timestamp: Date.now(),
            confidence: contextData.averageConfidence || 0,
            count: contextData.count || 0
          });

          // Limit history size
          if (qualityMetrics.trends.modelPerformanceTrend[modelId].contextPerformance[context].confidenceHistory.length > 30) {
            qualityMetrics.trends.modelPerformanceTrend[modelId].contextPerformance[context].confidenceHistory =
              qualityMetrics.trends.modelPerformanceTrend[modelId].contextPerformance[context].confidenceHistory.slice(-30);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error analyzing model performance trends:', error);
  }
}

/**
 * Analyze context performance trends
 */
function analyzeContextPerformanceTrends() {
  try {
    for (const [context, contextData] of Object.entries(qualityMetrics.contextPerformance)) {
      if (!qualityMetrics.trends.contextPerformanceTrend[context]) {
        qualityMetrics.trends.contextPerformanceTrend[context] = {
          confidenceHistory: [],
          modelPerformance: {}
        };
      }

      // Add confidence data point
      qualityMetrics.trends.contextPerformanceTrend[context].confidenceHistory.push({
        timestamp: Date.now(),
        confidence: contextData.averageConfidence || 0,
        totalTranslations: contextData.totalTranslations || 0
      });

      // Limit history size
      if (qualityMetrics.trends.contextPerformanceTrend[context].confidenceHistory.length > MAX_TREND_DATA_POINTS) {
        qualityMetrics.trends.contextPerformanceTrend[context].confidenceHistory =
          qualityMetrics.trends.contextPerformanceTrend[context].confidenceHistory.slice(-MAX_TREND_DATA_POINTS);
      }
    }
  } catch (error) {
    console.error('Error analyzing context performance trends:', error);
  }
}

/**
 * Analyze language pair performance trends
 */
function analyzeLanguagePairPerformanceTrends() {
  try {
    for (const [langPair, langPairData] of Object.entries(qualityMetrics.languagePairPerformance)) {
      if (!qualityMetrics.trends.languagePairPerformanceTrend[langPair]) {
        qualityMetrics.trends.languagePairPerformanceTrend[langPair] = {
          confidenceHistory: [],
          contextPerformance: {},
          modelPerformance: {}
        };
      }

      // Add confidence data point
      qualityMetrics.trends.languagePairPerformanceTrend[langPair].confidenceHistory.push({
        timestamp: Date.now(),
        confidence: langPairData.averageConfidence || 0,
        totalTranslations: langPairData.totalTranslations || 0
      });

      // Limit history size
      if (qualityMetrics.trends.languagePairPerformanceTrend[langPair].confidenceHistory.length > MAX_TREND_DATA_POINTS) {
        qualityMetrics.trends.languagePairPerformanceTrend[langPair].confidenceHistory =
          qualityMetrics.trends.languagePairPerformanceTrend[langPair].confidenceHistory.slice(-MAX_TREND_DATA_POINTS);
      }
    }
  } catch (error) {
    console.error('Error analyzing language pair performance trends:', error);
  }
}

/**
 * Detect anomalies in translation quality
 *
 * @returns {Promise<Object>} - Detection result
 */
async function detectAnomalies() {
  try {
    console.log('Detecting anomalies in translation quality...');

    // Skip if we don't have enough data
    if (qualityMetrics.trends.confidenceOverTime.length < MIN_DATA_POINTS_FOR_ANALYSIS) {
      console.log(`Not enough data for anomaly detection (${qualityMetrics.trends.confidenceOverTime.length}/${MIN_DATA_POINTS_FOR_ANALYSIS} data points)`);
      return {
        success: true,
        anomaliesDetected: 0,
        reason: 'insufficient_data'
      };
    }

    // Calculate baseline confidence if not set
    if (qualityMetrics.anomalyDetection.baselineConfidence === 0) {
      calculateBaselineMetrics();
    }

    const anomaliesDetected = [];

    // Check for confidence anomalies
    const confidenceAnomalies = detectConfidenceAnomalies();
    if (confidenceAnomalies.length > 0) {
      anomaliesDetected.push(...confidenceAnomalies);
    }

    // Check for feedback anomalies
    const feedbackAnomalies = detectFeedbackAnomalies();
    if (feedbackAnomalies.length > 0) {
      anomaliesDetected.push(...feedbackAnomalies);
    }

    // Check for model-specific anomalies
    const modelAnomalies = detectModelAnomalies();
    if (modelAnomalies.length > 0) {
      anomaliesDetected.push(...modelAnomalies);
    }

    // Check for context-specific anomalies
    const contextAnomalies = detectContextAnomalies();
    if (contextAnomalies.length > 0) {
      anomaliesDetected.push(...contextAnomalies);
    }

    // Add detected anomalies to history
    if (anomaliesDetected.length > 0) {
      qualityMetrics.anomalyDetection.anomalyHistory.push(...anomaliesDetected);

      // Limit history size
      if (qualityMetrics.anomalyDetection.anomalyHistory.length > 100) {
        qualityMetrics.anomalyDetection.anomalyHistory =
          qualityMetrics.anomalyDetection.anomalyHistory.slice(-100);
      }

      // Add to trends
      qualityMetrics.trends.anomalies.push(...anomaliesDetected);

      // Limit trends size
      if (qualityMetrics.trends.anomalies.length > 50) {
        qualityMetrics.trends.anomalies = qualityMetrics.trends.anomalies.slice(-50);
      }

      // Save anomaly data
      await saveAnomalyData();

      // Save trend data
      await saveTrendData();

      console.log(`Detected ${anomaliesDetected.length} anomalies in translation quality`);

      // Emit anomaly event
      syncEvents.emit('quality_anomaly', {
        timestamp: Date.now(),
        anomalies: anomaliesDetected
      });
    } else {
      console.log('No anomalies detected in translation quality');
    }

    // Update last analysis time
    qualityMetrics.anomalyDetection.lastAnalysisTime = Date.now();

    return {
      success: true,
      anomaliesDetected: anomaliesDetected.length,
      anomalies: anomaliesDetected
    };
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calculate baseline metrics for anomaly detection
 */
function calculateBaselineMetrics() {
  try {
    // Calculate baseline confidence
    const confidenceValues = qualityMetrics.trends.confidenceOverTime
      .map(point => point.confidence)
      .filter(confidence => typeof confidence === 'number');

    if (confidenceValues.length > 0) {
      qualityMetrics.anomalyDetection.baselineConfidence =
        confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length;
    }

    // Calculate baseline feedback
    const feedbackValues = qualityMetrics.trends.feedbackOverTime
      .map(point => point.positiveRate)
      .filter(rate => typeof rate === 'number');

    if (feedbackValues.length > 0) {
      qualityMetrics.anomalyDetection.baselineFeedback =
        feedbackValues.reduce((sum, value) => sum + value, 0) / feedbackValues.length;
    }

    console.log(`Calculated baseline metrics: confidence=${qualityMetrics.anomalyDetection.baselineConfidence.toFixed(3)}, feedback=${qualityMetrics.anomalyDetection.baselineFeedback.toFixed(3)}`);
  } catch (error) {
    console.error('Error calculating baseline metrics:', error);
  }
}

/**
 * Detect confidence anomalies
 *
 * @returns {Array} - Detected anomalies
 */
function detectConfidenceAnomalies() {
  try {
    const anomalies = [];
    const threshold = qualityMetrics.anomalyDetection.confidenceThreshold;
    const baseline = qualityMetrics.anomalyDetection.baselineConfidence;

    // Get recent confidence data points
    const recentPoints = qualityMetrics.trends.confidenceOverTime.slice(-10);

    // Check for sudden drops in confidence
    for (const point of recentPoints) {
      const deviation = Math.abs(point.confidence - baseline) / baseline;

      if (deviation > threshold && point.confidence < baseline) {
        anomalies.push({
          type: 'confidence_drop',
          timestamp: point.timestamp,
          confidence: point.confidence,
          baseline,
          deviation: deviation.toFixed(3),
          severity: calculateSeverity(deviation, threshold)
        });
      }
    }

    return anomalies;
  } catch (error) {
    console.error('Error detecting confidence anomalies:', error);
    return [];
  }
}

/**
 * Detect feedback anomalies
 *
 * @returns {Array} - Detected anomalies
 */
function detectFeedbackAnomalies() {
  try {
    const anomalies = [];
    const threshold = qualityMetrics.anomalyDetection.feedbackThreshold;
    const baseline = qualityMetrics.anomalyDetection.baselineFeedback;

    // Get recent feedback data points
    const recentPoints = qualityMetrics.trends.feedbackOverTime.slice(-10);

    // Check for sudden drops in positive feedback rate
    for (const point of recentPoints) {
      if (point.total < 5) continue; // Skip points with too few feedback items

      const deviation = Math.abs(point.positiveRate - baseline) / baseline;

      if (deviation > threshold && point.positiveRate < baseline) {
        anomalies.push({
          type: 'feedback_drop',
          timestamp: point.timestamp,
          positiveRate: point.positiveRate,
          baseline,
          total: point.total,
          deviation: deviation.toFixed(3),
          severity: calculateSeverity(deviation, threshold)
        });
      }
    }

    return anomalies;
  } catch (error) {
    console.error('Error detecting feedback anomalies:', error);
    return [];
  }
}

/**
 * Detect model-specific anomalies
 *
 * @returns {Array} - Detected anomalies
 */
function detectModelAnomalies() {
  try {
    const anomalies = [];
    const threshold = qualityMetrics.anomalyDetection.confidenceThreshold;

    // Check each model's performance trend
    for (const [modelId, modelTrend] of Object.entries(qualityMetrics.trends.modelPerformanceTrend)) {
      if (!modelTrend.confidenceHistory || modelTrend.confidenceHistory.length < 5) continue;

      // Calculate baseline for this model
      const baselinePoints = modelTrend.confidenceHistory.slice(0, -3); // Exclude the most recent points
      if (baselinePoints.length < 3) continue;

      const baseline = baselinePoints
        .map(point => point.confidence)
        .reduce((sum, value) => sum + value, 0) / baselinePoints.length;

      // Check recent points for anomalies
      const recentPoints = modelTrend.confidenceHistory.slice(-3);

      for (const point of recentPoints) {
        const deviation = Math.abs(point.confidence - baseline) / baseline;

        if (deviation > threshold && point.confidence < baseline) {
          anomalies.push({
            type: 'model_confidence_drop',
            modelId,
            timestamp: point.timestamp,
            confidence: point.confidence,
            baseline,
            deviation: deviation.toFixed(3),
            severity: calculateSeverity(deviation, threshold)
          });
        }
      }
    }

    return anomalies;
  } catch (error) {
    console.error('Error detecting model anomalies:', error);
    return [];
  }
}

/**
 * Detect context-specific anomalies
 *
 * @returns {Array} - Detected anomalies
 */
function detectContextAnomalies() {
  try {
    const anomalies = [];
    const threshold = qualityMetrics.anomalyDetection.confidenceThreshold;

    // Check each context's performance trend
    for (const [context, contextTrend] of Object.entries(qualityMetrics.trends.contextPerformanceTrend)) {
      if (!contextTrend.confidenceHistory || contextTrend.confidenceHistory.length < 5) continue;

      // Calculate baseline for this context
      const baselinePoints = contextTrend.confidenceHistory.slice(0, -3); // Exclude the most recent points
      if (baselinePoints.length < 3) continue;

      const baseline = baselinePoints
        .map(point => point.confidence)
        .reduce((sum, value) => sum + value, 0) / baselinePoints.length;

      // Check recent points for anomalies
      const recentPoints = contextTrend.confidenceHistory.slice(-3);

      for (const point of recentPoints) {
        const deviation = Math.abs(point.confidence - baseline) / baseline;

        if (deviation > threshold && point.confidence < baseline) {
          anomalies.push({
            type: 'context_confidence_drop',
            context,
            timestamp: point.timestamp,
            confidence: point.confidence,
            baseline,
            deviation: deviation.toFixed(3),
            severity: calculateSeverity(deviation, threshold)
          });
        }
      }
    }

    return anomalies;
  } catch (error) {
    console.error('Error detecting context anomalies:', error);
    return [];
  }
}

/**
 * Calculate severity level based on deviation
 *
 * @param {number} deviation - Deviation from baseline
 * @param {number} threshold - Anomaly threshold
 * @returns {string} - Severity level
 */
function calculateSeverity(deviation, threshold) {
  if (deviation > threshold * 3) {
    return 'critical';
  } else if (deviation > threshold * 2) {
    return 'high';
  } else if (deviation > threshold * 1.5) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Get translation quality metrics with advanced analytics
 *
 * @param {Object} options - Filter options
 * @returns {Object} - Quality metrics
 */
function getQualityMetrics(options = {}) {
  try {
    // Create a copy of the metrics to avoid exposing internal state
    const metrics = JSON.parse(JSON.stringify(qualityMetrics));

    // Filter by model if specified
    if (options.modelId && metrics.modelPerformance) {
      metrics.modelPerformance = {
        [options.modelId]: metrics.modelPerformance[options.modelId] || {}
      };

      // Also filter model trends
      if (metrics.trends && metrics.trends.modelPerformanceTrend) {
        metrics.trends.modelPerformanceTrend = {
          [options.modelId]: metrics.trends.modelPerformanceTrend[options.modelId] || {}
        };
      }
    }

    // Filter by context if specified
    if (options.context && metrics.contextPerformance) {
      metrics.contextPerformance = {
        [options.context]: metrics.contextPerformance[options.context] || {}
      };

      // Also filter context trends
      if (metrics.trends && metrics.trends.contextPerformanceTrend) {
        metrics.trends.contextPerformanceTrend = {
          [options.context]: metrics.trends.contextPerformanceTrend[options.context] || {}
        };
      }
    }

    // Filter by language pair if specified
    if (options.languagePair && metrics.languagePairPerformance) {
      metrics.languagePairPerformance = {
        [options.languagePair]: metrics.languagePairPerformance[options.languagePair] || {}
      };

      // Also filter language pair trends
      if (metrics.trends && metrics.trends.languagePairPerformanceTrend) {
        metrics.trends.languagePairPerformanceTrend = {
          [options.languagePair]: metrics.trends.languagePairPerformanceTrend[options.languagePair] || {}
        };
      }
    }

    // Filter by region if specified
    if (options.region && metrics.culturalAdaptation && metrics.culturalAdaptation.regionSpecificTerms) {
      const filteredTerms = {};

      for (const [key, terms] of Object.entries(metrics.culturalAdaptation.regionSpecificTerms)) {
        if (key.endsWith(`-${options.region}`)) {
          filteredTerms[key] = terms;
        }
      }

      metrics.culturalAdaptation.regionSpecificTerms = filteredTerms;
    }

    // Filter by time range if specified
    if (options.timeRange && metrics.trends) {
      const [startTime, endTime] = options.timeRange;

      if (metrics.trends.confidenceOverTime) {
        metrics.trends.confidenceOverTime = metrics.trends.confidenceOverTime.filter(
          point => point.timestamp >= startTime && point.timestamp <= endTime
        );
      }

      if (metrics.trends.feedbackOverTime) {
        metrics.trends.feedbackOverTime = metrics.trends.feedbackOverTime.filter(
          point => point.timestamp >= startTime && point.timestamp <= endTime
        );
      }

      if (metrics.trends.anomalies) {
        metrics.trends.anomalies = metrics.trends.anomalies.filter(
          anomaly => anomaly.timestamp >= startTime && anomaly.timestamp <= endTime
        );
      }
    }

    // Include anomaly detection results if requested
    if (options.includeAnomalies === false) {
      delete metrics.anomalyDetection;
    }

    // Include trend data if requested
    if (options.includeTrends === false) {
      delete metrics.trends;
    }

    return {
      success: true,
      metrics
    };
  } catch (error) {
    console.error('Error getting quality metrics:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export the module
module.exports = {
  initialize,
  syncWithCloud,
  queueTranslation,
  queueAudioTranslation,
  manualSync,
  recordTranslationFeedback,
  recordBulkFeedback,
  getQualityMetrics,
  // Advanced analytics functions
  analyzeTrends,
  detectAnomalies,
  // Hook registration
  registerPreSyncHook,
  registerPostSyncHook,
  // Status functions
  getStatus,
  getSyncStatus: () => ({
    enabled: syncEnabled,
    inProgress: syncInProgress,
    lastSyncTime,
    lastSyncStatus,
    queueSize: syncQueue.length,
    interval: currentSyncInterval,
    metrics: syncMetrics
  }),
  getAnalyticsStatus: () => ({
    trends: {
      dataPoints: qualityMetrics.trends.confidenceOverTime.length,
      lastAnalysis: qualityMetrics.trends.confidenceOverTime.length > 0 ?
        qualityMetrics.trends.confidenceOverTime[qualityMetrics.trends.confidenceOverTime.length - 1].timestamp : 0,
      modelsTracked: Object.keys(qualityMetrics.trends.modelPerformanceTrend).length,
      contextsTracked: Object.keys(qualityMetrics.trends.contextPerformanceTrend).length,
      languagePairsTracked: Object.keys(qualityMetrics.trends.languagePairPerformanceTrend).length
    },
    anomalies: {
      detected: qualityMetrics.trends.anomalies.length,
      lastDetection: qualityMetrics.anomalyDetection.lastAnalysisTime,
      baselineConfidence: qualityMetrics.anomalyDetection.baselineConfidence,
      baselineFeedback: qualityMetrics.anomalyDetection.baselineFeedback
    }
  }),
  // Configuration functions
  setSyncEnabled: (enabled) => {
    syncEnabled = enabled;
    saveConfig();
    return { success: true, enabled };
  },
  setAnomalyThresholds: (thresholds) => {
    if (typeof thresholds.confidence === 'number') {
      qualityMetrics.anomalyDetection.confidenceThreshold = thresholds.confidence;
    }
    if (typeof thresholds.feedback === 'number') {
      qualityMetrics.anomalyDetection.feedbackThreshold = thresholds.feedback;
    }
    saveAnomalyData();
    return {
      success: true,
      thresholds: {
        confidence: qualityMetrics.anomalyDetection.confidenceThreshold,
        feedback: qualityMetrics.anomalyDetection.feedbackThreshold
      }
    };
  },
  // Event handling
  on: (event, listener) => {
    syncEvents.on(event, listener);
  },
  off: (event, listener) => {
    syncEvents.off(event, listener);
  }
};
