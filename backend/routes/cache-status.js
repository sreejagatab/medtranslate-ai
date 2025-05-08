/**
 * Cache Status API Routes for MedTranslate AI
 *
 * This module provides API endpoints for retrieving cache status information
 * from the edge application's predictive caching system.
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { logger } = require('../utils/logger');

// Import edge application modules if available
let edgeApp;
try {
  edgeApp = require('../../edge/app');
  logger.info('Edge application loaded successfully for cache status API');
} catch (error) {
  logger.warn('Edge application not available for cache status API:', error.message);
  edgeApp = null;
}

/**
 * @route GET /api/cache/status
 * @desc Get cache status information
 * @access Private
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    logger.debug('Cache status request received');

    // Check if edge application is available
    if (!edgeApp || !edgeApp.predictiveCache) {
      return res.status(503).json({
        success: false,
        message: 'Predictive cache service unavailable'
      });
    }

    // Get cache status from predictive cache using the new getCacheStatus function
    let cacheStatus;

    // Use getCacheStatus if available, otherwise fall back to getStatus
    if (edgeApp.predictiveCache.getCacheStatus) {
      cacheStatus = await edgeApp.predictiveCache.getCacheStatus();
      logger.debug('Using enhanced getCacheStatus function');
    } else {
      // Fall back to old method
      cacheStatus = await edgeApp.predictiveCache.getStatus();

      // Get storage information if available
      let storageInfo = { usagePercentage: 0 };
      if (edgeApp.storageManager) {
        storageInfo = edgeApp.storageManager.getStorageInfo();
      }

      // Get predictions if available
      let predictions = { offlinePredicted: false, predictedOfflineDuration: 0 };
      try {
        predictions = await edgeApp.predictiveCache.getPredictions();
      } catch (error) {
        logger.warn('Error getting predictions for cache status:', error);
      }

      // Combine information manually
      cacheStatus = {
        success: true,
        cacheSize: cacheStatus.totalSizeBytes || 0,
        itemCount: cacheStatus.itemCount || 0,
        hitRate: cacheStatus.hitRate || 0,
        offlineReadiness: cacheStatus.offlineReadiness || 0,
        lastUpdated: cacheStatus.lastUpdated || null,
        predictedOffline: predictions.offlinePredicted || false,
        predictedDuration: predictions.predictedOfflineDuration || 0,
        storageUsage: storageInfo.usagePercentage / 100 || 0,
        compressionRatio: cacheStatus.compressionRatio || 0,
        // Additional metrics
        prioritizedItems: cacheStatus.prioritizedItemCount || 0,
        lowPriorityItems: cacheStatus.lowPriorityItemCount || 0,
        averageCacheAge: cacheStatus.averageCacheAgeMs || 0,
        cacheEfficiency: cacheStatus.cacheEfficiency || 0,
      };
    }

    // Add ML model information if not already included
    if (!cacheStatus.mlModelsEnabled && edgeApp.modelAdapter) {
      try {
        const modelStatus = edgeApp.modelAdapter.getStatus();
        cacheStatus.mlModelsEnabled = modelStatus.isInitialized;
        cacheStatus.mlModelTypes = modelStatus.isInitialized ?
          Object.keys(modelStatus.models).filter(model =>
            modelStatus.models[model].isInitialized || modelStatus.models[model].enabled
          ) : [];
      } catch (error) {
        logger.warn('Error getting ML model status:', error);
      }
    }

    // Use cacheStatus as response
    const response = cacheStatus;

    logger.debug('Cache status response:', response);
    return res.json(response);
  } catch (error) {
    logger.error('Error getting cache status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving cache status',
      error: error.message
    });
  }
});

/**
 * @route GET /api/cache/metrics
 * @desc Get detailed cache metrics
 * @access Private
 */
router.get('/metrics', authenticate, async (req, res) => {
  try {
    logger.debug('Cache metrics request received');

    // Check if edge application is available
    if (!edgeApp || !edgeApp.predictiveCache) {
      return res.status(503).json({
        success: false,
        message: 'Predictive cache service unavailable'
      });
    }

    // Get cache metrics from predictive cache
    const metrics = await edgeApp.predictiveCache.getMetrics();

    logger.debug('Cache metrics response generated');
    return res.json({
      success: true,
      metrics
    });
  } catch (error) {
    logger.error('Error getting cache metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving cache metrics',
      error: error.message
    });
  }
});

/**
 * @route POST /api/cache/optimize
 * @desc Trigger cache optimization
 * @access Private
 */
router.post('/optimize', authenticate, async (req, res) => {
  try {
    logger.info('Cache optimization request received');

    // Check if edge application is available
    if (!edgeApp || !edgeApp.predictiveCache) {
      return res.status(503).json({
        success: false,
        message: 'Predictive cache service unavailable'
      });
    }

    // Get optimization options from request body
    const options = req.body || {};

    // Trigger cache optimization using the enhanced optimizeCache function
    let result;

    // Check if the enhanced optimizeCache function is available
    if (edgeApp.predictiveCache.optimizeCache) {
      // Use the enhanced function that handles both cache and storage optimization
      result = await edgeApp.predictiveCache.optimizeCache({
        ...options,
        aggressive: options.force || false,
        preserveOfflineContent: options.preserveOfflineContent !== false
      });

      logger.info('Enhanced cache optimization completed:', result);
      return res.json(result);
    } else {
      // Fall back to the old method
      result = await edgeApp.predictiveCache.optimizeCache(options);

      // Get storage optimization result if available
      let storageResult = { success: false };
      if (edgeApp.storageOptimizer) {
        storageResult = await edgeApp.storageOptimizer.optimizeStorage({
          force: options.force || false
        });
      }

      logger.info('Legacy cache optimization completed:', result);
      return res.json({
        success: true,
        cacheOptimization: result,
        storageOptimization: storageResult
      });
    }
  } catch (error) {
    logger.error('Error optimizing cache:', error);
    return res.status(500).json({
      success: false,
      message: 'Error optimizing cache',
      error: error.message
    });
  }
});

module.exports = router;
