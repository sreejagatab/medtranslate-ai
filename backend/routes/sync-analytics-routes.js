/**
 * Sync Analytics Routes for MedTranslate AI
 *
 * This module provides API routes for retrieving analytics data from the auto-sync-manager
 * to be displayed in the UI.
 */

const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const syncAnalyticsController = require('../controllers/sync-analytics-controller');

/**
 * @route GET /api/sync-analytics/status
 * @desc Get sync status from all connected edge devices
 * @access Private
 */
router.get('/status', authenticateJWT, syncAnalyticsController.getSyncStatus);

/**
 * @route GET /api/sync-analytics/metrics
 * @desc Get detailed sync metrics from all connected edge devices
 * @access Private
 */
router.get('/metrics', authenticateJWT, syncAnalyticsController.getSyncMetrics);

/**
 * @route GET /api/sync-analytics/quality
 * @desc Get quality metrics from all connected edge devices
 * @access Private
 */
router.get('/quality', authenticateJWT, syncAnalyticsController.getQualityMetrics);

/**
 * @route GET /api/sync-analytics/trends
 * @desc Get trend analysis from all connected edge devices
 * @access Private
 */
router.get('/trends', authenticateJWT, syncAnalyticsController.getTrendAnalysis);

/**
 * @route GET /api/sync-analytics/anomalies
 * @desc Get anomaly detection from all connected edge devices
 * @access Private
 */
router.get('/anomalies', authenticateJWT, syncAnalyticsController.getAnomalyDetection);

/**
 * @route POST /api/sync-analytics/manual-sync/:deviceId
 * @desc Trigger a manual sync on a specific edge device
 * @access Private
 */
router.post('/manual-sync/:deviceId', authenticateJWT, syncAnalyticsController.triggerManualSync);

module.exports = router;
