/**
 * System Status Routes for MedTranslate AI
 *
 * This file defines the API routes for system status information,
 * including cache stats, ML performance, storage info, sync status,
 * and device performance.
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Import controllers
const cacheController = require('../controllers/cache-controller');
const mlController = require('../controllers/ml-controller');
const storageController = require('../controllers/storage-controller');
const syncController = require('../controllers/sync-controller');
const deviceController = require('../controllers/device-controller');

// Cache routes
router.get('/cache/stats', authenticate, cacheController.getCacheStats);
router.post('/cache/clear', authenticate, cacheController.clearCache);
router.post('/cache/refresh', authenticate, cacheController.refreshCache);

// ML routes
router.get('/ml/performance', authenticate, mlController.getMLPerformance);
router.get('/ml/performance/history', authenticate, mlController.getMLPerformanceHistory);
router.post('/ml/train', authenticate, mlController.trainModels);
router.post('/ml/configure', authenticate, mlController.configureModels);

// Storage routes
router.get('/storage/info', authenticate, storageController.getStorageInfo);
router.post('/storage/optimize', authenticate, storageController.optimizeStorage);

// Sync routes
router.get('/sync/status', authenticate, syncController.getSyncStatus);
router.get('/sync/history', authenticate, syncController.getSyncHistory);
router.post('/sync/manual', authenticate, syncController.manualSync);
router.post('/sync/toggle', authenticate, syncController.toggleAutoSync);

// Device routes
router.get('/device/performance', authenticate, deviceController.getDevicePerformance);

// Offline preparation route
router.post('/offline/prepare', authenticate, syncController.prepareForOffline);

module.exports = router;
