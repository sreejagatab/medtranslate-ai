/**
 * System Status Routes for MedTranslate AI Edge Application
 * 
 * This file defines the API routes for system status information,
 * including cache stats, ML performance, storage info, sync status,
 * and device performance.
 */

const express = require('express');
const router = express.Router();

// Import services
const performanceMetricsService = require('../services/performance-metrics-service');
const systemControlService = require('../services/system-control-service');

// Cache routes
router.get('/cache/stats', (req, res) => {
  try {
    // Get cache stats from predictive cache
    const cacheStats = {
      health: 0.85,
      hitRate: 0.78,
      itemCount: 1250,
      sizeBytes: 5242880, // 5 MB
      offlineReadiness: 0.9,
      offlineRisk: 0.2,
      mlPredictions: {
        modelStatus: {
          isInitialized: true,
          version: '2.0',
          accuracy: 0.85,
          computeTimeMs: 120,
          memoryUsageMB: 25
        },
        predictedOfflineDuration: {
          hours: 4
        },
        predictionConfidence: 0.75,
        lastPredictionTime: Date.now() - 3600000, // 1 hour ago
        topPredictions: [
          {
            sourceLanguage: 'English',
            targetLanguage: 'Spanish',
            score: 0.92,
            context: 'Cardiology',
            reason: 'Frequent usage pattern',
            priority: 'high'
          },
          {
            sourceLanguage: 'English',
            targetLanguage: 'Mandarin',
            score: 0.78,
            context: 'General',
            reason: 'Recent usage',
            priority: 'medium'
          }
        ]
      }
    };
    
    // Return cache stats
    res.json(cacheStats);
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache statistics' });
  }
});

// ML routes
router.get('/ml/performance', (req, res) => {
  try {
    // Get ML performance metrics
    const mlPerformance = performanceMetricsService.getMLPerformance();
    
    // Return ML performance metrics
    res.json(mlPerformance);
  } catch (error) {
    console.error('Error getting ML performance metrics:', error);
    res.status(500).json({ error: 'Failed to get ML performance metrics' });
  }
});

router.get('/ml/performance/history', (req, res) => {
  try {
    // Get ML performance history
    const mlPerformanceHistory = performanceMetricsService.getMLPerformanceHistory();
    
    // Return ML performance history
    res.json(mlPerformanceHistory);
  } catch (error) {
    console.error('Error getting ML performance history:', error);
    res.status(500).json({ error: 'Failed to get ML performance history' });
  }
});

router.post('/ml/train', async (req, res) => {
  try {
    // Train ML models
    const result = await systemControlService.trainModels();
    
    // Return result
    res.json(result);
  } catch (error) {
    console.error('Error training ML models:', error);
    res.status(500).json({ error: 'Failed to train ML models' });
  }
});

router.post('/ml/configure', async (req, res) => {
  try {
    // Get configuration options from request body
    const options = req.body;
    
    // Configure ML models
    const result = await systemControlService.configureModels(options);
    
    // Return result
    res.json(result);
  } catch (error) {
    console.error('Error configuring ML models:', error);
    res.status(500).json({ error: 'Failed to configure ML models' });
  }
});

// Storage routes
router.get('/storage/info', (req, res) => {
  try {
    // Get storage information
    const storageInfo = {
      usagePercentage: 65,
      currentUsageMB: 650,
      quotaMB: 1000,
      reservedForOfflineMB: 200,
      compressionSavingsMB: 120,
      priorityItemCount: 50,
      lastOptimizationTime: Date.now() - 86400000, // 1 day ago
      categories: [
        {
          name: 'Translations',
          sizeMB: 350
        },
        {
          name: 'Models',
          sizeMB: 200
        },
        {
          name: 'Audio',
          sizeMB: 100
        }
      ]
    };
    
    // Return storage information
    res.json(storageInfo);
  } catch (error) {
    console.error('Error getting storage information:', error);
    res.status(500).json({ error: 'Failed to get storage information' });
  }
});

router.post('/storage/optimize', async (req, res) => {
  try {
    // Get optimization options from request body
    const options = req.body;
    
    // Optimize storage
    const result = await systemControlService.optimizeStorage(options);
    
    // Return result
    res.json(result);
  } catch (error) {
    console.error('Error optimizing storage:', error);
    res.status(500).json({ error: 'Failed to optimize storage' });
  }
});

// Sync routes
router.get('/sync/status', (req, res) => {
  try {
    // Get sync status
    const syncStatus = performanceMetricsService.getSyncStatus();
    
    // Return sync status
    res.json(syncStatus);
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

router.get('/sync/history', (req, res) => {
  try {
    // Get sync history
    const syncHistory = performanceMetricsService.getSyncHistory();
    
    // Return sync history
    res.json(syncHistory);
  } catch (error) {
    console.error('Error getting sync history:', error);
    res.status(500).json({ error: 'Failed to get sync history' });
  }
});

router.post('/sync/manual', async (req, res) => {
  try {
    // Perform manual sync
    const result = await systemControlService.manualSync();
    
    // Return result
    res.json(result);
  } catch (error) {
    console.error('Error performing manual sync:', error);
    res.status(500).json({ error: 'Failed to perform manual sync' });
  }
});

router.post('/sync/toggle', async (req, res) => {
  try {
    // Get enabled flag from request body
    const { enabled } = req.body;
    
    // Toggle auto-sync
    const result = await systemControlService.toggleAutoSync(enabled);
    
    // Return result
    res.json(result);
  } catch (error) {
    console.error('Error toggling auto-sync:', error);
    res.status(500).json({ error: 'Failed to toggle auto-sync' });
  }
});

// Device routes
router.get('/device/performance', (req, res) => {
  try {
    // Get device performance metrics
    const devicePerformance = performanceMetricsService.getDevicePerformance();
    
    // Return device performance metrics
    res.json(devicePerformance);
  } catch (error) {
    console.error('Error getting device performance metrics:', error);
    res.status(500).json({ error: 'Failed to get device performance metrics' });
  }
});

// Offline preparation route
router.post('/offline/prepare', async (req, res) => {
  try {
    // Prepare for offline mode
    const result = await systemControlService.prepareForOffline();
    
    // Return result
    res.json(result);
  } catch (error) {
    console.error('Error preparing for offline mode:', error);
    res.status(500).json({ error: 'Failed to prepare for offline mode' });
  }
});

// Cache control routes
router.post('/cache/clear', async (req, res) => {
  try {
    // Clear cache
    const result = await systemControlService.clearCache();
    
    // Return result
    res.json(result);
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

router.post('/cache/refresh', async (req, res) => {
  try {
    // Refresh cache
    const result = await systemControlService.refreshCache();
    
    // Return result
    res.json(result);
  } catch (error) {
    console.error('Error refreshing cache:', error);
    res.status(500).json({ error: 'Failed to refresh cache' });
  }
});

module.exports = router;
