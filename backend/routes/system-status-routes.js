/**
 * System Status Routes for MedTranslate AI
 * 
 * This file defines the API routes for system status information,
 * including cache stats, ML performance, storage info, sync status,
 * and device performance.
 */

const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');

// Import controllers
const cacheController = require('../controllers/cache-controller');
const mlController = require('../controllers/ml-controller');
const storageController = require('../controllers/storage-controller');
const syncController = require('../controllers/sync-controller');
const deviceController = require('../controllers/device-controller');

// Cache routes
router.get('/cache/stats', authenticateJWT, cacheController.getCacheStats);
router.post('/cache/clear', authenticateJWT, cacheController.clearCache);
router.post('/cache/refresh', authenticateJWT, cacheController.refreshCache);

// ML routes
router.get('/ml/performance', authenticateJWT, mlController.getMLPerformance);
router.get('/ml/performance/history', authenticateJWT, mlController.getMLPerformanceHistory);
router.post('/ml/train', authenticateJWT, mlController.trainModels);
router.post('/ml/configure', authenticateJWT, mlController.configureModels);

// Storage routes
router.get('/storage/info', authenticateJWT, storageController.getStorageInfo);
router.post('/storage/optimize', authenticateJWT, storageController.optimizeStorage);

// Sync routes
router.get('/sync/status', authenticateJWT, syncController.getSyncStatus);
router.get('/sync/history', authenticateJWT, syncController.getSyncHistory);
router.post('/sync/manual', authenticateJWT, syncController.manualSync);
router.post('/sync/toggle', authenticateJWT, syncController.toggleAutoSync);

// Device routes
router.get('/device/performance', authenticateJWT, deviceController.getDevicePerformance);

// Offline preparation route
router.post('/offline/prepare', authenticateJWT, syncController.prepareForOffline);

module.exports = router;
