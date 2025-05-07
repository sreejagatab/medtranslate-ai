/**
 * System Control Service for MedTranslate AI
 * 
 * This service provides control functions for the ML models,
 * predictive caching system, auto-sync-manager, and storage-optimizer.
 * It integrates with various components to provide a unified interface
 * for controlling them.
 */

// Import required modules
const fs = require('fs');
const path = require('path');

// Import internal modules if available
let modelAdapter;
let predictiveCache;
let autoSyncManager;
let storageOptimizer;
let performanceMetricsService;

try {
  modelAdapter = require('../ml-models/model-adapter');
} catch (error) {
  console.warn('ML model adapter not available for system control:', error.message);
}

try {
  predictiveCache = require('../predictive-cache');
} catch (error) {
  console.warn('Predictive cache not available for system control:', error.message);
}

try {
  autoSyncManager = require('../auto-sync-manager');
} catch (error) {
  console.warn('Auto-sync manager not available for system control:', error.message);
}

try {
  storageOptimizer = require('../utils/storage-optimizer');
} catch (error) {
  console.warn('Storage optimizer not available for system control:', error.message);
}

try {
  performanceMetricsService = require('./performance-metrics-service');
} catch (error) {
  console.warn('Performance metrics service not available for system control:', error.message);
}

/**
 * Train ML models
 * 
 * @returns {Promise<Object>} Training result
 */
async function trainModels() {
  try {
    if (!modelAdapter) {
      return {
        success: false,
        error: 'ML model adapter not available'
      };
    }
    
    console.log('Training ML models...');
    
    // Get usage stats from predictive cache if available
    let usageStats = {};
    if (predictiveCache) {
      usageStats = predictiveCache.getUsageStats();
    }
    
    // Train models
    const trainingResult = await modelAdapter.trainModels(usageStats);
    
    console.log('ML model training result:', trainingResult);
    
    return {
      success: trainingResult,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error training ML models:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Configure ML models
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.modelId - Model ID
 * @param {boolean} options.enabled - Whether the model is enabled
 * @returns {Promise<Object>} Configuration result
 */
async function configureModels(options) {
  try {
    if (!modelAdapter) {
      return {
        success: false,
        error: 'ML model adapter not available'
      };
    }
    
    console.log('Configuring ML models with options:', options);
    
    // Configure models
    const configResult = await modelAdapter.configureModel(options);
    
    console.log('ML model configuration result:', configResult);
    
    return {
      success: configResult,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error configuring ML models:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Perform manual sync
 * 
 * @returns {Promise<Object>} Sync result
 */
async function manualSync() {
  try {
    if (!autoSyncManager) {
      return {
        success: false,
        error: 'Auto-sync manager not available'
      };
    }
    
    console.log('Performing manual sync...');
    
    // Perform sync
    const syncResult = await autoSyncManager.syncWithCloud();
    
    console.log('Manual sync result:', syncResult);
    
    // Record sync event if performance metrics service is available
    if (performanceMetricsService) {
      performanceMetricsService.recordSyncEvent({
        timestamp: Date.now(),
        status: syncResult.success ? 'success' : syncResult.partial ? 'partial' : 'failed',
        type: 'manual',
        itemCount: syncResult.syncedCount || 0,
        durationMs: syncResult.duration || 0,
        label: new Date().getHours().toString()
      });
    }
    
    return syncResult;
  } catch (error) {
    console.error('Error performing manual sync:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Toggle auto-sync
 * 
 * @param {boolean} enabled - Whether auto-sync is enabled
 * @returns {Promise<Object>} Toggle result
 */
async function toggleAutoSync(enabled) {
  try {
    if (!autoSyncManager) {
      return {
        success: false,
        error: 'Auto-sync manager not available'
      };
    }
    
    console.log(`${enabled ? 'Enabling' : 'Disabling'} auto-sync...`);
    
    // Toggle auto-sync
    const toggleResult = await autoSyncManager.setAutoSync(enabled);
    
    console.log('Auto-sync toggle result:', toggleResult);
    
    return {
      success: toggleResult,
      enabled
    };
  } catch (error) {
    console.error('Error toggling auto-sync:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Prepare for offline mode
 * 
 * @returns {Promise<Object>} Preparation result
 */
async function prepareForOffline() {
  try {
    if (!autoSyncManager) {
      return {
        success: false,
        error: 'Auto-sync manager not available'
      };
    }
    
    console.log('Preparing for offline mode...');
    
    // Prepare for offline
    const prepResult = await autoSyncManager.prepareForOfflineMode({
      highPriority: true,
      forcePrepare: true
    });
    
    console.log('Offline preparation result:', prepResult);
    
    return prepResult;
  } catch (error) {
    console.error('Error preparing for offline mode:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Optimize storage
 * 
 * @returns {Promise<Object>} Optimization result
 */
async function optimizeStorage() {
  try {
    if (!storageOptimizer) {
      return {
        success: false,
        error: 'Storage optimizer not available'
      };
    }
    
    console.log('Optimizing storage...');
    
    // Optimize storage
    const optimizeResult = await storageOptimizer.optimizeStorage({
      force: true
    });
    
    console.log('Storage optimization result:', optimizeResult);
    
    return optimizeResult;
  } catch (error) {
    console.error('Error optimizing storage:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clear cache
 * 
 * @returns {Promise<Object>} Clear result
 */
async function clearCache() {
  try {
    if (!predictiveCache) {
      return {
        success: false,
        error: 'Predictive cache not available'
      };
    }
    
    console.log('Clearing cache...');
    
    // Clear cache
    const clearResult = await predictiveCache.clearCache();
    
    console.log('Cache clear result:', clearResult);
    
    return clearResult;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Refresh cache
 * 
 * @returns {Promise<Object>} Refresh result
 */
async function refreshCache() {
  try {
    if (!predictiveCache) {
      return {
        success: false,
        error: 'Predictive cache not available'
      };
    }
    
    console.log('Refreshing cache...');
    
    // Refresh cache
    const refreshResult = await predictiveCache.refreshCache();
    
    console.log('Cache refresh result:', refreshResult);
    
    return refreshResult;
  } catch (error) {
    console.error('Error refreshing cache:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export the module
module.exports = {
  trainModels,
  configureModels,
  manualSync,
  toggleAutoSync,
  prepareForOffline,
  optimizeStorage,
  clearCache,
  refreshCache
};
